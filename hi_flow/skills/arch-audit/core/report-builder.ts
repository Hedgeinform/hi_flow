import { writeFile, mkdir, readFile, rename } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { TypescriptDepcruiseAdapter } from '../adapters/typescript-depcruise.ts'
import type { D8AuditReport, Finding, SeverityCounts, ModuleMetrics, RawFinding, D9Index, ProjectRules } from './types.ts'
import { getBaselineRules } from './baseline-rules.ts'
import { loadProjectRules } from './project-rules.ts'
import { loadD9, resolveBundledD9Path } from './d9-loader.ts'
import { validateD8Report } from './d8-schema-validator.ts'
import { applySuppression } from './suppression.ts'
import { generateDepcruiseConfig } from '../helpers/generate-depcruise-config.ts'
import { parseDepcruiseOutput } from '../helpers/parse-depcruise-output.ts'
import { computeNCCD, instability } from './graph-core.ts'
import { enrichFindings } from '../helpers/enrich-findings.ts'
import { generateMermaid } from '../helpers/generate-mermaid.ts'
import { checkDepcruiseVersion } from './preflight.ts'
import { resolveAuditSha } from './audit-sha.ts'
import { resolveRuntimeRoot, runBundledDepcruise } from './depcruise-runtime.ts'
import { buildSourceScanGlob, normalizeModuleRoot } from './source-scope.ts'
import { countSourceLoc } from './source-metrics.ts'

export interface BuildOpts {
  auditSha?: string
  depcruiseVersion: string
  d9MdPath?: string
  clusterProsefn?: ClusterProseFn
  runDepcruise?: (configPath: string, srcPath: string) => string
  outDir?: string
}

export type ClusterProseFn = (clusterId: string, findings: Finding[]) => { name: string; root_cause: string }

function incompleteMarkdown(auditSha?: string): string {
  return [
    '# Audit Report — INCOMPLETE',
    '',
    auditSha
      ? `Phase 1 data was generated for audit SHA \`${auditSha}\`.`
      : 'A new Phase 1 run started but has not completed.',
    'This is not a completed architecture gate. Complete Phase 1, generate cluster prose, and run `npm run render-md`.',
    '',
  ].join('\n')
}

async function publishMarkdown(path: string, content: string): Promise<void> {
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporaryPath, content, 'utf-8')
  await rename(temporaryPath, path)
}

function buildOperatorNotes(
  projectRules: ProjectRules,
  parsingErrorCount: number,
  suppressedFindingCount: number,
): string[] {
  const notes: string[] = []
  const overrides = projectRules.overrides
  if (overrides?.module_pattern) notes.push(`Explicit override: module_pattern=${overrides.module_pattern}.`)
  if (overrides?.nccd_threshold !== undefined) notes.push(`Explicit override: nccd_threshold=${overrides.nccd_threshold}.`)
  if (overrides?.profile) notes.push(`Explicit override: profile=${overrides.profile}.`)
  if (overrides?.layer_aliases && Object.keys(overrides.layer_aliases).length > 0) {
    const aliases = Object.entries(overrides.layer_aliases).sort(([a], [b]) => a.localeCompare(b))
    notes.push(`Explicit override: layer_aliases=${aliases.map(([from, to]) => `${from}->${to}`).join(', ')}.`)
  }
  if (overrides?.baseline_disables?.length) {
    notes.push(`Disabled baseline rules: ${overrides.baseline_disables.map(item => item.rule_id).join(', ')}.`)
  }
  if (overrides?.severity_overrides?.length) {
    notes.push(`Severity overrides: ${overrides.severity_overrides.map(item => `${item.rule_id}->${item.severity}`).join(', ')}.`)
  }
  if (overrides?.channel_sdk_extras?.length) {
    notes.push(`Additional channel SDKs: ${overrides.channel_sdk_extras.join(', ')}.`)
  }
  if (parsingErrorCount > 0) {
    notes.push(`${parsingErrorCount} source file(s) could not be parsed; the report is based on a partial graph.`)
  }
  if (suppressedFindingCount > 0) {
    notes.push(`Suppression precedence removed ${suppressedFindingCount} lower-priority or unreliable finding(s).`)
  }
  return notes
}

// Phase 1 result: deterministic data ready for prose generation by the LLM agent,
// then for phase-2 markdown rendering. JSON is written eagerly so the agent can read it.
export interface ReportData {
  report: D8AuditReport
  clusters: Map<string, Finding[]>
  mermaid: ReturnType<typeof generateMermaid>
  d9: D9Index
  json_path: string
  outDir: string
}

/**
 * Phase 1 — deterministic data assembly. Runs depcruise, parses, enriches, suppresses,
 * computes metrics, builds clusters and Mermaid, validates, writes audit-report.json.
 *
 * Does NOT render markdown. The skill agent reads the JSON, generates LLM prose for each
 * cluster, then calls renderReport() for phase 2.
 */
export async function buildReportData(
  adapter: TypescriptDepcruiseAdapter,
  projectRoot: string,
  opts: BuildOpts,
): Promise<ReportData> {
  const outDir = opts.outDir ?? join(projectRoot, 'audit-report')
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'audit-report.md'), incompleteMarkdown(), 'utf-8')

  const auditSha = opts.auditSha ?? resolveAuditSha(projectRoot)
  const baselineRules = getBaselineRules()
  const runtimeRoot = resolveRuntimeRoot(import.meta.url)
  const d9 = await loadD9(opts.d9MdPath ?? resolveBundledD9Path(runtimeRoot))
  const projectRules = await loadProjectRules(projectRoot, { d9 })
  const moduleRoot = normalizeModuleRoot(projectRules.overrides?.module_pattern ?? 'src')
  const modulesList = (await adapter.identifyModules(projectRoot, moduleRoot)).map(module => module.name)

  checkDepcruiseVersion(opts.depcruiseVersion, adapter.requiredTooling[0]!)

  const configPath = await generateDepcruiseConfig({ baselineRules, projectRules, projectRoot })

  const runner = opts.runDepcruise ?? ((cfg: string, src: string) =>
    runBundledDepcruise(runtimeRoot, projectRoot, cfg, src))
  const depcruiseOut = runner(configPath, buildSourceScanGlob(moduleRoot))

  const parsed = parseDepcruiseOutput(depcruiseOut, moduleRoot)
  if (Object.keys(parsed.per_module_raw).length === 0) {
    throw new Error(
      `Dependency-cruiser returned no production modules for '${moduleRoot}/'. ` +
      'Audit aborted to prevent an empty successful D8 snapshot.',
    )
  }
  const locByModule = await countSourceLoc(projectRoot, parsed.source_files_by_module)
  for (const [module, raw] of Object.entries(parsed.per_module_raw)) {
    raw.loc = locByModule[module] ?? 0
  }

  const structural = await adapter.detectStructural({
    projectPath: projectRoot,
    depGraph: parsed.dep_graph,
    perModuleRaw: parsed.per_module_raw,
    projectRules,
    sdkEdges: parsed.sdk_edges,
    barrelImports: parsed.barrel_imports,
    modulesList,
    moduleRoot,
  })

  const nccd = computeNCCD(parsed.dep_graph)
  const nccd_threshold = projectRules.overrides?.nccd_threshold ?? 1.0

  const moduleCount = Object.keys(parsed.dep_graph).length
  const nccdRaw: RawFinding[] = []
  if (moduleCount > 15 && nccd > nccd_threshold) {
    nccdRaw.push({
      rule_id: 'nccd-breach',
      raw_severity: 'error',
      type: 'nccd',
      source: { module: '<project>', file: '' },
      extras: { nccd, threshold: nccd_threshold, module_count: moduleCount },
    })
  }

  const enrichedFindings = enrichFindings({
    rawFindings: [...parsed.findings, ...structural, ...nccdRaw],
    baselineRules,
    projectRules,
  })

  const findings = applySuppression(enrichedFindings, {
    parsing_errors: parsed.parsing_errors,
    modulePattern: moduleRoot,
  })
  const operatorNotes = buildOperatorNotes(
    projectRules,
    parsed.parsing_errors?.length ?? 0,
    enrichedFindings.length - findings.length,
  )

  const clusters = new Map<string, Finding[]>()
  for (const f of findings) {
    const key = f.reason.principle
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(f)
  }

  const per_module: Record<string, ModuleMetrics> = {}
  for (const [m, raw] of Object.entries(parsed.per_module_raw)) {
    per_module[m] = { Ca: raw.ca, Ce: raw.ce, I: instability(raw.ca, raw.ce), LOC: raw.loc }
  }

  const severity_counts: SeverityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const f of findings) severity_counts[f.severity]++

  adapter.setDetectedDepcruiseVersion(opts.depcruiseVersion)
  const knownRuleIds = [
    ...baselineRules.map(rule => rule.id),
    ...projectRules.forbidden.map(rule => rule.name),
    ...projectRules.required.map(rule => rule.name),
  ]

  const report: D8AuditReport = {
    metadata: {
      audit_sha: auditSha,
      audit_timestamp: new Date().toISOString(),
      audit_tooling_version: adapter.getToolingVersionString(),
      schema_version: '1.2',
      project_name: basename(projectRoot),
      module_root: moduleRoot,
      ...(parsed.parsing_errors ? { parsing_errors: parsed.parsing_errors } : {}),
      ...(operatorNotes.length > 0 ? { operator_notes: operatorNotes } : {}),
      known_rule_ids: knownRuleIds,
    },
    findings,
    metrics: {
      per_module,
      nccd,
      nccd_threshold,
      severity_counts,
      dep_graph: parsed.dep_graph,
    },
  }

  const validation = validateD8Report(report, {
    canonicalPrincipleIds: new Set(Object.keys(d9.principles)),
    knownRuleIds: new Set(knownRuleIds),
  })
  if (!validation.valid) {
    throw new Error(`D8 schema validation failed:\n${validation.errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`)
  }

  const mermaid = generateMermaid(report)

  const json_path = join(outDir, 'audit-report.json')
  await writeFile(json_path, JSON.stringify(report, null, 2), 'utf-8')
  await writeFile(join(outDir, 'audit-report.md'), incompleteMarkdown(auditSha), 'utf-8')

  // Side artifact: clusters-input.json — the prose-generation contract for the skill agent.
  // Lists each cluster with its principle id, finding ids, and affected modules so the agent
  // can produce { name, root_cause } per cluster without re-deriving the grouping.
  const clustersInput: Record<string, { finding_ids: string[]; modules: string[] }> = {}
  for (const [principleId, fs] of clusters) {
    const modules = new Set<string>()
    for (const f of fs) {
      modules.add(f.source.module)
      if (f.target) modules.add(f.target.module)
    }
    clustersInput[principleId] = {
      finding_ids: fs.map(f => f.id),
      modules: [...modules],
    }
  }
  await writeFile(join(outDir, 'clusters-input.json'), JSON.stringify(clustersInput, null, 2), 'utf-8')

  return { report, clusters, mermaid, d9, json_path, outDir }
}

/**
 * Phase 2 — markdown rendering with LLM-supplied prose. Reads the report data produced
 * by buildReportData and emits audit-report.md.
 */
export async function renderReport(
  data: ReportData,
  clusterProse: ClusterProseFn,
): Promise<{ md_path: string }> {
  const validation = validateD8Report(data.report, {
    canonicalPrincipleIds: new Set(Object.keys(data.d9.principles)),
    ...(data.report.metadata.known_rule_ids
      ? { knownRuleIds: new Set(data.report.metadata.known_rule_ids) }
      : {}),
  })
  if (!validation.valid) {
    throw new Error(`D8 validation failed before Markdown render:\n${validation.errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`)
  }
  const md = renderMarkdownReport(data.report, data.mermaid, data.clusters, clusterProse, data.d9)
  const md_path = join(data.outDir, 'audit-report.md')
  await publishMarkdown(md_path, md)
  return { md_path }
}

/**
 * Legacy single-call wrapper: runs phase 1 + phase 2 with provided prose-fn or fallback.
 * Kept for tests and direct programmatic use. Production flow uses the two-phase split.
 */
export async function buildReport(
  adapter: TypescriptDepcruiseAdapter,
  projectRoot: string,
  opts: BuildOpts,
): Promise<{ json_path: string; md_path: string }> {
  const data = await buildReportData(adapter, projectRoot, opts)
  const fallbackProse: ClusterProseFn = (id) => ({
    name: `Cluster ${id}`,
    root_cause: `Findings share the canonical D9 principle ${id}.`,
  })
  const { md_path } = await renderReport(data, opts.clusterProsefn ?? fallbackProse)
  return { json_path: data.json_path, md_path }
}

/**
 * CLI helper for phase 2: load JSON + prose file, regenerate clusters/mermaid, render MD.
 * Used by helpers/cli-render-md.ts.
 */
export async function renderReportFromDisk(
  jsonPath: string,
  prosePath: string,
  d9MdPath?: string,
): Promise<{ md_path: string }> {
  const md_path = join(jsonPath, '..', 'audit-report.md')
  await writeFile(md_path, incompleteMarkdown(), 'utf-8')
  const report: D8AuditReport = JSON.parse(await readFile(jsonPath, 'utf-8'))
  const prose: Record<string, { name: string; root_cause: string }> = JSON.parse(await readFile(prosePath, 'utf-8'))
  const runtimeRoot = resolveRuntimeRoot(import.meta.url)
  const d9 = await loadD9(d9MdPath ?? resolveBundledD9Path(runtimeRoot))

  const validation = validateD8Report(report, {
    canonicalPrincipleIds: new Set(Object.keys(d9.principles)),
    ...(report.metadata.known_rule_ids
      ? { knownRuleIds: new Set(report.metadata.known_rule_ids) }
      : {}),
  })
  if (!validation.valid) {
    throw new Error(`D8 validation failed before Markdown render:\n${validation.errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`)
  }

  const clusters = new Map<string, Finding[]>()
  for (const f of report.findings) {
    const key = f.reason.principle
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(f)
  }
  const mermaid = generateMermaid(report)

  const proseFn: ClusterProseFn = (id) => {
    const value = prose[id]
    if (!value || value.name.trim().length === 0 || value.root_cause.trim().length === 0) {
      throw new Error(`cluster prose is missing or blank for '${id}'`)
    }
    return value
  }

  const md = renderMarkdownReport(report, mermaid, clusters, proseFn, d9)
  await publishMarkdown(md_path, md)
  return { md_path }
}

function renderMarkdownReport(
  report: D8AuditReport,
  mermaid: ReturnType<typeof generateMermaid>,
  clusters: Map<string, Finding[]>,
  clusterProse: ClusterProseFn,
  d9: D9Index,
): string {
  const lines: string[] = []
  const projectName = report.metadata.project_name ?? 'project'
  const moduleRoot = report.metadata.module_root ?? 'src'
  lines.push(`# Audit Report — ${projectName}`)
  lines.push('')
  lines.push(`**Date:** ${report.metadata.audit_timestamp ?? 'not recorded'}`)
  lines.push(`**Audit SHA:** \`${report.metadata.audit_sha}\``)
  lines.push(`**Stack:** ${report.metadata.audit_tooling_version ?? 'not recorded'}`)
  lines.push(`**Project:** ${projectName} (\`${moduleRoot}/\`, ${Object.keys(report.metrics.per_module).length} modules)`)
  lines.push('')
  if (report.metadata.parsing_errors?.length) {
    lines.push(`> **Warning: depcruise не смог распарсить ${report.metadata.parsing_errors.length} файлов.** Метрики и findings ниже считаны на partial графе — возможны пропуски. Findings типа \`baseline:no-orphans\` для нераспарсенных модулей подавлены.`)
    lines.push('')
  }

  lines.push('## Scope')
  lines.push('')
  lines.push('arch-audit covers architecture-level dependency boundaries, cycles, coupling metrics, and structural patterns. Run the project build/typecheck, `npx depcruise --validate`, eslint, tests, and `npm audit` as complementary code-quality gates.')
  lines.push('')

  // Severity roll-up
  lines.push(`## Severity roll-up`)
  lines.push('')
  lines.push(`| Severity | Count | Rules triggered |`)
  lines.push(`|---|---:|---|`)
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    const rules = [...new Set(report.findings.filter(finding => finding.severity === sev).map(finding => finding.rule_id))]
    lines.push(`| ${sev} | ${report.metrics.severity_counts[sev]} | ${rules.length ? rules.map(rule => `\`${rule}\``).join(', ') : '—'} |`)
  }
  lines.push('')
  const baselineFindingCount = report.findings.filter(finding => finding.rule_id.startsWith('baseline:')).length
  const projectFindingCount = report.findings.length - baselineFindingCount
  lines.push(`**Total findings:** ${report.findings.length} (${baselineFindingCount} baseline + ${projectFindingCount} project).`)
  lines.push(`**Total modules:** ${Object.keys(report.metrics.per_module).length}.`)
  lines.push(`**NCCD:** ${report.metrics.nccd.toFixed(2)} (threshold ${report.metrics.nccd_threshold})`)
  lines.push('')

  // Project Dependency Graph (focused view — foundation modules excluded)
  lines.push(`## Project Dependency Graph`)
  lines.push('')
  if (mermaid.overall) {
    if (mermaid.foundationModules.length) {
      lines.push(`Focused view: ${mermaid.foundationModules.length} pure-utility module(s) hidden in Foundation diagram below.`)
      lines.push('')
    }
    lines.push('```mermaid')
    lines.push(mermaid.overall)
    lines.push('```')
    lines.push('')
  } else {
    lines.push(`Module count exceeds 25 — overall diagram skipped. Per-cluster diagrams below.`)
    lines.push('')
  }

  // Foundation diagram (conditional)
  if (mermaid.foundation && mermaid.foundationModules.length) {
    lines.push(`## Foundation modules`)
    lines.push('')
    lines.push(`Pure utility modules (Ca > 5, Ce ≤ 3, no findings) hidden from focused view: ${mermaid.foundationModules.map(m => `\`${m}\``).join(', ')}.`)
    lines.push('')
    lines.push('```mermaid')
    lines.push(mermaid.foundation)
    lines.push('```')
    lines.push('')
  }

  // Layered architecture (conditional, with explicit "not detected" negative case)
  if (mermaid.layeredDetected && mermaid.layered) {
    lines.push(`## Layered architecture view`)
    lines.push('')
    lines.push(`Detected layered structure — diagram below shows inter-layer flows; direction violations are highlighted.`)
    lines.push('')
    lines.push('```mermaid')
    lines.push(mermaid.layered)
    lines.push('```')
    lines.push('')
  } else {
    lines.push(`## Layered architecture`)
    lines.push('')
    lines.push(`Layered structure не detected — closed list имён слоёв (domain / core / business / services / api / web / ui / infrastructure / ...) не совпал с module naming проекта. Conditional rules \`baseline:layered-respect\`, \`baseline:port-adapter-direction\`, \`baseline:architectural-layer-cycle\` не применялись.`)
    lines.push('')
  }

  // Module Metrics table
  lines.push(`## Module Metrics`)
  lines.push('')
  lines.push(`| Module | Ca | Ce | I | A | D | LOC |`)
  lines.push(`|---|---:|---:|---:|---:|---:|---:|`)
  const sortedModules = Object.entries(report.metrics.per_module).sort(([a], [b]) => a.localeCompare(b))
  for (const [m, mt] of sortedModules) {
    lines.push(`| \`${m}\` | ${mt.Ca} | ${mt.Ce} | ${mt.I.toFixed(2)} | ${mt.A ?? '—'} | ${mt.D ?? '—'} | ${mt.LOC} |`)
  }
  lines.push('')

  // Findings
  lines.push(`## Findings (${report.findings.length})`)
  lines.push('')
  for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    const severityFindings = report.findings.filter(finding => finding.severity === severity)
    lines.push(`### ${severity} (${severityFindings.length})`)
    lines.push('')
    if (severityFindings.length === 0) {
      lines.push('_None._')
      lines.push('')
      continue
    }
    for (const f of severityFindings) {
      lines.push(`#### ${f.id} — ${f.rule_id}`)
      if (f.target) {
        lines.push(`**Source → Target:** \`${f.source.module}\` → \`${f.target.module}\``)
        lines.push(`**Files:** \`${f.source.file || '—'}\` → \`${f.target.file || '—'}\``)
      } else {
        lines.push(`**Module:** \`${f.source.module}\``)
        lines.push(`**File:** \`${f.source.file || '—'}\``)
      }
      lines.push(`**Reason:** ${f.reason.principle} — ${f.reason.explanation}`)
      if (f.extras && Object.keys(f.extras).length > 0) {
        lines.push(`**Details:** \`${JSON.stringify(f.extras)}\``)
      }
      lines.push('')
    }
  }

  // Cluster suggestions
  lines.push(`## Cluster suggestions`)
  lines.push('')
  let clusterIndex = 1
  for (const [principleId, fs] of clusters) {
    const prose = clusterProse(principleId, fs)
    if (prose.name.trim().length === 0 || prose.root_cause.trim().length === 0) {
      throw new Error(`cluster prose is missing or blank for '${principleId}'`)
    }
    const affectedModules = [...new Set(fs.flatMap(finding => [
      finding.source.module,
      ...(finding.target ? [finding.target.module] : []),
    ]))].sort()
    lines.push(`### Cluster ${clusterIndex}: ${prose.name}`)
    lines.push(`**Root cause:** ${prose.root_cause}`)
    lines.push(`**Findings (${fs.length}):** ${fs.map(finding => `\`${finding.id}\``).join(', ')}`)
    lines.push(`**Affected modules (${affectedModules.length}):** ${affectedModules.map(module => `\`${module}\``).join(', ')}`)
    lines.push(`**Size:** ${fs.length} finding(s) across ${affectedModules.length} module(s).`)
    const alts = d9.fix_alternatives[principleId] ?? []
    if (alts.length) {
      lines.push(`**Suggested fix alternatives (D9):**`)
      for (const a of alts) lines.push(`- ${a}`)
    } else {
      lines.push('**Suggested fix alternatives (D9):** None listed.')
    }
    const cKey = `cluster-${principleId}`
    if (mermaid.clusters[cKey]) {
      lines.push('')
      lines.push('```mermaid')
      lines.push(mermaid.clusters[cKey])
      lines.push('```')
    }
    lines.push('')
    clusterIndex++
  }

  lines.push('## Notes for operator')
  lines.push('')
  const notes = [...(report.metadata.operator_notes ?? [])]
  if (report.metadata.parsing_errors?.length && !notes.some(note => note.includes('could not be parsed'))) {
    notes.push(`${report.metadata.parsing_errors.length} source file(s) could not be parsed; the report is based on a partial graph.`)
  }
  if (report.metrics.nccd_threshold !== 1.0 && !notes.some(note => note.includes('nccd_threshold'))) {
    notes.push(`Project NCCD threshold override applied: ${report.metrics.nccd_threshold}.`)
  }
  if (notes.length === 0) {
    lines.push('_No notes — audit ran with all defaults, no explicit overrides, and no suppressions beyond standard precedence._')
  } else {
    for (const note of notes) lines.push(`- ${note}`)
  }
  lines.push('')
  return lines.join('\n')
}
