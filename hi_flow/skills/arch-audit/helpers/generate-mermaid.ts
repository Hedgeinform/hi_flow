import type { D8AuditReport, Finding, DepGraph } from '../core/types.ts'

export const MERMAID_OVERALL_CAP = 25

interface MermaidResult {
  overall: string | null
  foundation: string | null
  layered: string | null
  clusters: Record<string, string>
}

function escId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

function buildOverall(graph: DepGraph, findings: Finding[]): string {
  const lines: string[] = ['flowchart TD']
  const cycleEdges = new Set<string>()
  const criticalEdges = new Set<string>()

  for (const f of findings) {
    const edge = `${escId(f.source.module)}-${escId(f.target.module)}`
    if (f.type === 'cycle' || f.rule_id === 'baseline:no-circular' || f.rule_id === 'baseline:inappropriate-intimacy') {
      cycleEdges.add(edge)
    } else if (f.severity === 'CRITICAL') {
      criticalEdges.add(edge)
    }
  }

  for (const [src, targets] of Object.entries(graph)) {
    for (const tgt of targets) {
      const eid = `${escId(src)}-${escId(tgt)}`
      let arrow = '-->'
      if (cycleEdges.has(eid)) arrow = '==>|cycle|'
      else if (criticalEdges.has(eid)) arrow = '-.->|critical|'
      lines.push(`    ${escId(src)} ${arrow} ${escId(tgt)}`)
    }
  }

  return lines.join('\n')
}

function buildClusters(findings: Finding[], graph: DepGraph): Record<string, string> {
  const byPrinciple = new Map<string, Finding[]>()
  for (const f of findings) {
    const key = f.reason.principle
    if (!byPrinciple.has(key)) byPrinciple.set(key, [])
    byPrinciple.get(key)!.push(f)
  }
  const out: Record<string, string> = {}
  for (const [principle, group] of byPrinciple) {
    const lines = ['flowchart TD']
    const seen = new Set<string>()
    for (const f of group) {
      const e = `${escId(f.source.module)} --> ${escId(f.target.module)}`
      if (!seen.has(e)) {
        lines.push(`    ${e}`)
        seen.add(e)
      }
    }
    out[`cluster-${principle}`] = lines.join('\n')
  }
  return out
}

export function generateMermaid(report: D8AuditReport): MermaidResult {
  const graph = report.metrics.dep_graph
  const moduleCount = Object.keys(graph).length

  const overall = moduleCount > MERMAID_OVERALL_CAP ? null : buildOverall(graph, report.findings)
  const foundation = null
  const layered = report.findings.some(f => f.rule_id === 'baseline:architectural-layer-cycle' || f.rule_id === 'baseline:layered-respect')
    ? buildOverall(graph, report.findings)
    : null
  const clusters = buildClusters(report.findings, graph)

  return { overall, foundation, layered, clusters }
}
