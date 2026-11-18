import type { ProjectRules, RawFinding, Severity } from '../../core/types.ts'
export interface CppEdge {
  kind: 'include' | 'link'
  source: { module: string; file: string }
  target: { module: string; file: string }
  line?: number
  external?: boolean
}
const rawSeverity: Record<Severity, 'error' | 'warn' | 'info'> = { CRITICAL: 'error', HIGH: 'error', MEDIUM: 'warn', LOW: 'info' }
function matches(value: string, pattern?: string): boolean { return pattern === undefined || new RegExp(pattern).test(value) }
export function matchCppProjectRules(edges: CppEdge[], rules: ProjectRules, sources: {module: string; file: string}[] = []): RawFinding[] {
  const findings: RawFinding[] = []
  for (const rule of rules.forbidden) {
    for (const edge of edges) {
      if (!matches(edge.source.file, rule.from?.path) || !matches(edge.target.file, rule.to?.path)) continue
      findings.push({
        rule_id: rule.name, raw_severity: rawSeverity[rule.severity], type: 'boundary', source: edge.source, target: edge.target,
        extras: { kind: edge.kind, ...(edge.line === undefined ? {} : { line: edge.line }), ...(edge.external ? { external_target: true, sdk: edge.target.module } : {}) },
      })
    }
  }
  const allSources = new Map([...sources, ...edges.map(edge => edge.source)].map(source => [`${source.module}\0${source.file}`, source]))
  for (const rule of rules.required) {
    for (const source of allSources.values()) {
      if (!matches(source.file, rule.from?.path)) continue
      if (edges.some(edge => edge.source.file === source.file && edge.source.module === source.module && matches(edge.target.file, rule.to?.path))) continue
      findings.push({ rule_id: rule.name, raw_severity: rawSeverity[rule.severity], type: 'coupling', source, extras: { required: rule.to?.path ?? '.*' } })
    }
  }
  return findings
}
