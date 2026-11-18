import type { ProjectRules, RawFinding, Severity } from '../../core/types.ts'
export interface CppEdge {
  kind: 'include' | 'link'
  source: { module: string; file: string }
  target: { module: string; file: string }
  line?: number
  external?: boolean
  evidenceFile?: string
}
const rawSeverity: Record<Severity, 'error' | 'warn' | 'info'> = { CRITICAL: 'error', HIGH: 'error', MEDIUM: 'warn', LOW: 'info' }
function matches(value: string, pattern?: RegExp): boolean { return pattern === undefined || pattern.test(value) }
export function matchCppProjectRules(edges: CppEdge[], rules: ProjectRules, sources: {module: string; file: string}[] = []): RawFinding[] {
  const findings: RawFinding[] = []
  const patterns = new Map([...rules.forbidden, ...rules.required].map(rule => {
    try { return [rule, { from: rule.from?.path === undefined ? undefined : new RegExp(rule.from.path), to: rule.to?.path === undefined ? undefined : new RegExp(rule.to.path) }] as const }
    catch (error) { throw new Error(`Invalid regular expression in rule ${rule.name}: ${(error as Error).message}`, { cause: error }) }
  }))
  for (const rule of rules.forbidden) {
    for (const edge of edges) {
      if (!matches(edge.source.file, patterns.get(rule)?.from) || !matches(edge.target.file, patterns.get(rule)?.to)) continue
      findings.push({
        rule_id: rule.name, raw_severity: rawSeverity[rule.severity], type: 'boundary', source: edge.source, target: edge.target,
        extras: { kind: edge.kind, ...(edge.line === undefined ? {} : { line: edge.line }), ...(edge.evidenceFile ? { evidence_file: edge.evidenceFile } : {}), ...(edge.external ? { external_target: true, sdk: edge.target.module } : {}) },
      })
    }
  }
  const allSources = new Map([...sources, ...edges.map(edge => edge.source)].map(source => [`${source.module}\0${source.file}`, source]))
  for (const rule of rules.required) {
    for (const source of allSources.values()) {
      if (!matches(source.file, patterns.get(rule)?.from)) continue
      if (edges.some(edge => edge.source.file === source.file && edge.source.module === source.module && matches(edge.target.file, patterns.get(rule)?.to))) continue
      findings.push({ rule_id: rule.name, raw_severity: rawSeverity[rule.severity], type: 'coupling', source, extras: { required: rule.to?.path ?? '.*' } })
    }
  }
  return findings
}
