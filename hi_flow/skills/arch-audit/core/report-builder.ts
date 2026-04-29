import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import type { TypescriptDepcruiseAdapter } from '../adapters/typescript-depcruise.ts'
import type { D8AuditReport, Finding, SeverityCounts, ModuleMetrics, RawFinding, D9Index } from './types.ts'
import { getBaselineRules } from './baseline-rules.ts'
import { loadProjectRules } from './project-rules.ts'
import { loadD9 } from './d9-loader.ts'
import { validateD8Report } from './d8-schema-validator.ts'
import { applySuppression } from './suppression.ts'
import { generateDepcruiseConfig } from '../helpers/generate-depcruise-config.ts'
import { parseDepcruiseOutput } from '../helpers/parse-depcruise-output.ts'
import { computeNCCD } from '../helpers/compute-nccd.ts'
import { enrichFindings } from '../helpers/enrich-findings.ts'
import { generateMermaid } from '../helpers/generate-mermaid.ts'
import { checkDepcruiseVersion } from './preflight.ts'
import { resolveAuditSha } from './audit-sha.ts'

export interface BuildOpts {
  auditSha?: string
  depcruiseVersion: string
  d9MdPath?: string
  clusterProsefn?: ClusterProseFn
  runDepcruise?: (configPath: string, srcPath: string) => string
  outDir?: string
}

export type ClusterProseFn = (clusterId: string, findings: Finding[]) => { name: string; root_cause: string }

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
  const auditSha = opts.auditSha ?? resolveAuditSha(projectRoot)
  const baselineRules = getBaselineRules()
  const projectRules = await loadProjectRules(projectRoot)
  const d9 = opts.d9MdPath ? await loadD9(opts.d9MdPath) : { principles: {}, fix_alternatives: {} }

  checkDepcruiseVersion(opts.depcruiseVersion, adapter.requiredTooling[0]!)

  const configPath = await generateDepcruiseConfig({ baselineRules, projectRules, projectRoot })

  const runner = opts.runDepcruise ?? ((cfg: string, src: string) => {
    try {
      return execSync(
        `npx --no-install dependency-cruiser --output-type json --config ${cfg} ${src}`,
        { cwd: projectRoot, encoding: 'utf-8' },
      )
    } catch (e: any) {
      // depcruise exits non-zero when violations found; stdout still contains JSON
      return (e.stdout as string) || ''
    }
  })
  const depcruiseOut = runner(configPath, 'src/**/*.ts')

  const parsed = parseDepcruiseOutput(depcruiseOut)

  let modulesList: string[]
  try {
    modulesList = (await adapter.identifyModules(projectRoot)).map(m => m.name)
  } catch {
    modulesList = []
  }
  const structural = await adapter.detectStructural({
    projectPath: projectRoot,
    depGraph: parsed.dep_graph,
    perModuleRaw: parsed.per_module_raw,
    projectRules,
    sdkEdges: parsed.sdk_edges,
    barrelImports: parsed.barrel_imports,
    modulesList,
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

  let findings = enrichFindings({
    rawFindings: [...parsed.findings, ...structural, ...nccdRaw],
    baselineRules,
    projectRules,
  })

  findings = applySuppression(findings, {
    parsing_errors: parsed.parsing_errors,
    modulePattern: projectRules.overrides?.module_pattern ?? 'src',
  })

  const clusters = new Map<string, Finding[]>()
  for (const f of findings) {
    const key = f.reason.principle
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(f)
  }

  const per_module: Record<string, ModuleMetrics> = {}
  for (const [m, raw] of Object.entries(parsed.per_module_raw)) {
    const I = raw.ca + raw.ce === 0 ? 0 : raw.ce / (raw.ca + raw.ce)
    per_module[m] = { Ca: raw.ca, Ce: raw.ce, I, LOC: raw.loc }
  }

  const severity_counts: SeverityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const f of findings) severity_counts[f.severity]++

  adapter.setDetectedDepcruiseVersion(opts.depcruiseVersion)

  const report: D8AuditReport = {
    metadata: {
      audit_sha: auditSha,
      audit_timestamp: new Date().toISOString(),
      audit_tooling_version: adapter.getToolingVersionString(),
      schema_version: '1.1',
      ...(parsed.parsing_errors ? { parsing_errors: parsed.parsing_errors } : {}),
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

  const validation = validateD8Report(report)
  if (!validation.valid) {
    throw new Error(`D8 schema validation failed:\n${validation.errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`)
  }

  const mermaid = generateMermaid(report)

  const outDir = opts.outDir ?? join(projectRoot, 'audit-report')
  await mkdir(outDir, { recursive: true })
  const json_path = join(outDir, 'audit-report.json')
  await writeFile(json_path, JSON.stringify(report, null, 2), 'utf-8')

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
  const md = renderMarkdownReport(data.report, data.mermaid, data.clusters, clusterProse, data.d9)
  const md_path = join(data.outDir, 'audit-report.md')
  await writeFile(md_path, md, 'utf-8')
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
    name: id,
    root_cause: '_(cluster prose not generated — clusterProsefn not provided to buildReport)_',
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
  const report: D8AuditReport = JSON.parse(await readFile(jsonPath, 'utf-8'))
  const prose: Record<string, { name: string; root_cause: string }> = JSON.parse(await readFile(prosePath, 'utf-8'))
  const d9 = d9MdPath ? await loadD9(d9MdPath) : { principles: {}, fix_alternatives: {} }

  const clusters = new Map<string, Finding[]>()
  for (const f of report.findings) {
    const key = f.reason.principle
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(f)
  }
  const mermaid = generateMermaid(report)

  const proseFn: ClusterProseFn = (id) => prose[id] ?? {
    name: id,
    root_cause: `_(prose missing for cluster '${id}')_`,
  }

  const md = renderMarkdownReport(report, mermaid, clusters, proseFn, d9)
  const md_path = join(jsonPath, '..', 'audit-report.md')
  await writeFile(md_path, md, 'utf-8')
  return { md_path }
}

function renderMarkdownReport(
  report: D8AuditReport,
  mermaid: ReturnType<typeof generateMermaid>,
  clusters: Map<string, Finding[]>,
  clusterProse: ClusterProseFn,
  d9: { fix_alternatives: Record<string, string[]> },
): string {
  const lines: string[] = []
  lines.push(`# Audit Report`)
  lines.push('')
  lines.push(`**Date:** ${report.metadata.audit_timestamp}`)
  lines.push(`**Audit SHA:** \`${report.metadata.audit_sha}\``)
  lines.push(`**Stack:** ${report.metadata.audit_tooling_version}`)
  lines.push(`**Total modules:** ${Object.keys(report.metrics.per_module).length}`)
  lines.push('')
  if (report.metadata.parsing_errors?.length) {
    lines.push(`> **Warning: depcruise не смог распарсить ${report.metadata.parsing_errors.length} файлов.** Метрики и findings ниже считаны на partial графе — возможны пропуски. Findings типа \`baseline:no-orphans\` для нераспарсенных модулей подавлены.`)
    lines.push('')
  }

  // Severity roll-up
  lines.push(`## Severity roll-up`)
  lines.push('')
  lines.push(`| Severity | Count |`)
  lines.push(`|---|---:|`)
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    lines.push(`| ${sev} | ${report.metrics.severity_counts[sev]} |`)
  }
  lines.push('')
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
  lines.push(`| Module | Ca | Ce | I | LOC |`)
  lines.push(`|---|---:|---:|---:|---:|`)
  const sortedModules = Object.entries(report.metrics.per_module).sort(([a], [b]) => a.localeCompare(b))
  for (const [m, mt] of sortedModules) {
    lines.push(`| \`${m}\` | ${mt.Ca} | ${mt.Ce} | ${mt.I.toFixed(2)} | ${mt.LOC} |`)
  }
  lines.push('')

  // Findings
  lines.push(`## Findings (${report.findings.length})`)
  lines.push('')
  for (const f of report.findings) {
    lines.push(`### ${f.id} — ${f.rule_id} (${f.severity})`)
    if (f.target) {
      lines.push(`**Source → Target:** \`${f.source.module}\` → \`${f.target.module}\``)
    } else {
      lines.push(`**Module:** \`${f.source.module}\``)
    }
    lines.push(`**Reason:** ${f.reason.principle} — ${f.reason.explanation}`)
    lines.push('')
  }

  // Cluster suggestions
  lines.push(`## Cluster suggestions`)
  lines.push('')
  for (const [principleId, fs] of clusters) {
    const prose = clusterProse(principleId, fs)
    lines.push(`### ${prose.name} (${fs.length} findings)`)
    lines.push(`**Root cause:** ${prose.root_cause}`)
    const alts = d9.fix_alternatives[principleId] ?? []
    if (alts.length) {
      lines.push(`**Fix alternatives:**`)
      for (const a of alts) lines.push(`- ${a}`)
    }
    const cKey = `cluster-${principleId}`
    if (mermaid.clusters[cKey]) {
      lines.push('')
      lines.push('```mermaid')
      lines.push(mermaid.clusters[cKey])
      lines.push('```')
    }
    lines.push('')
  }
  return lines.join('\n')
}
