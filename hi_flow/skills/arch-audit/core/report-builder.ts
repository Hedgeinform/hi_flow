import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import type { TypescriptDepcruiseAdapter } from '../adapters/typescript-depcruise.ts'
import type { D8AuditReport, Finding, SeverityCounts, ModuleMetrics } from './types.ts'
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

export interface BuildOpts {
  auditSha: string
  depcruiseVersion: string
  d9MdPath?: string
  clusterProsefn?: (clusterId: string, findings: Finding[]) => { name: string; root_cause: string }
  runDepcruise?: (configPath: string, srcPath: string) => string
  outDir?: string
}

export async function buildReport(
  adapter: TypescriptDepcruiseAdapter,
  projectRoot: string,
  opts: BuildOpts,
): Promise<{ json_path: string; md_path: string }> {
  const baselineRules = getBaselineRules()
  const projectRules = await loadProjectRules(projectRoot)
  const d9 = opts.d9MdPath ? await loadD9(opts.d9MdPath) : { principles: {}, fix_alternatives: {} }

  // Step 1: generate depcruise config
  const configPath = await generateDepcruiseConfig({ baselineRules, projectRules, projectRoot })

  // Step 2: run depcruise (real or injected mock)
  const runner = opts.runDepcruise ?? ((cfg: string, src: string) => {
    try {
      return execSync(`npx --yes dependency-cruiser --output-type json --config ${cfg} ${src}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })
    } catch (e: any) {
      // depcruise exits non-zero when violations found; stdout still contains JSON
      return (e.stdout as string) || ''
    }
  })
  const depcruiseOut = runner(configPath, 'src/**/*.ts')

  // Step 3: parse
  const parsed = parseDepcruiseOutput(depcruiseOut)

  // Step 4: structural detection
  const structural = await adapter.detectStructural({
    projectPath: projectRoot,
    depGraph: parsed.dep_graph,
    perModuleRaw: parsed.per_module_raw,
    projectRules,
  })

  // Step 5: NCCD
  const nccd = computeNCCD(parsed.dep_graph)
  const nccd_threshold = projectRules.overrides?.nccd_threshold ?? 1.0

  // Step 6: enrich
  const allRawFindings = [...parsed.findings, ...structural]
  let findings = enrichFindings({
    rawFindings: allRawFindings,
    baselineRules,
    projectRules,
  })

  // Step 7: suppression
  findings = applySuppression(findings)

  // Step 8: cluster grouping by reason.principle
  const clusters = new Map<string, Finding[]>()
  for (const f of findings) {
    const key = f.reason.principle
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(f)
  }

  const clusterProse = opts.clusterProsefn ?? ((id: string) => ({ name: id, root_cause: '' }))

  // Step 9: per-module metrics
  const per_module: Record<string, ModuleMetrics> = {}
  for (const [m, raw] of Object.entries(parsed.per_module_raw)) {
    const I = raw.ca + raw.ce === 0 ? 0 : raw.ce / (raw.ca + raw.ce)
    per_module[m] = { Ca: raw.ca, Ce: raw.ce, I, LOC: raw.loc }
  }

  // Step 10: severity counts
  const severity_counts: SeverityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const f of findings) severity_counts[f.severity]++

  // Step 11: set tooling version
  adapter.setDetectedDepcruiseVersion(opts.depcruiseVersion)

  // Step 12: assemble D8 report
  const report: D8AuditReport = {
    metadata: {
      audit_sha: opts.auditSha,
      audit_timestamp: new Date().toISOString(),
      audit_tooling_version: adapter.getToolingVersionString(),
      schema_version: '1.1',
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

  // Step 13: validate
  const validation = validateD8Report(report)
  if (!validation.valid) {
    throw new Error(`D8 schema validation failed:\n${validation.errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`)
  }

  // Step 14: Mermaid
  const mermaid = generateMermaid(report)

  // Step 15: write artifacts
  const outDir = opts.outDir ?? join(projectRoot, 'audit-report')
  await mkdir(outDir, { recursive: true })
  const json_path = join(outDir, 'audit-report.json')
  const md_path = join(outDir, 'audit-report.md')

  await writeFile(json_path, JSON.stringify(report, null, 2), 'utf-8')
  const md = renderMarkdownReport(report, mermaid, clusters, clusterProse, d9)
  await writeFile(md_path, md, 'utf-8')

  return { json_path, md_path }
}

function renderMarkdownReport(
  report: D8AuditReport,
  mermaid: ReturnType<typeof generateMermaid>,
  clusters: Map<string, Finding[]>,
  clusterProse: (id: string, fs: Finding[]) => { name: string; root_cause: string },
  d9: { fix_alternatives: Record<string, string[]> },
): string {
  const lines: string[] = []
  lines.push(`# Audit Report`)
  lines.push('')
  lines.push(`**Date:** ${report.metadata.audit_timestamp}`)
  lines.push(`**Audit SHA:** \`${report.metadata.audit_sha}\``)
  lines.push(`**Stack:** ${report.metadata.audit_tooling_version}`)
  lines.push(`**Total modules:** ${Object.keys(report.metrics.dep_graph).length}`)
  lines.push('')
  if (report.metadata.parsing_errors?.length) {
    lines.push(`> **Warning: depcruise не смог распарсить ${report.metadata.parsing_errors.length} файлов.** Метрики и findings ниже считаны на partial графе — возможны пропуски.`)
    lines.push('')
  }
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
  if (mermaid.overall) {
    lines.push(`## Project Dependency Graph`)
    lines.push('')
    lines.push('```mermaid')
    lines.push(mermaid.overall)
    lines.push('```')
    lines.push('')
  } else {
    lines.push(`## Project Dependency Graph`)
    lines.push('')
    lines.push(`Module count exceeds 25 — overall diagram skipped. Per-cluster diagrams below.`)
    lines.push('')
  }
  lines.push(`## Findings (${report.findings.length})`)
  lines.push('')
  for (const f of report.findings) {
    lines.push(`### ${f.id} — ${f.rule_id} (${f.severity})`)
    lines.push(`**Source → Target:** \`${f.source.module}\` → \`${f.target.module}\``)
    lines.push(`**Reason:** ${f.reason.principle} — ${f.reason.explanation}`)
    lines.push('')
  }
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
