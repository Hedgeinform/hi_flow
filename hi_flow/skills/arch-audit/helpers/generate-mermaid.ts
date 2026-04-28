import type { D8AuditReport, Finding, DepGraph } from '../core/types.ts'

export const MERMAID_OVERALL_CAP = 25

// Conventions per references/self-review-checklist.md (Group 3) and audit-report-template.md.
const STYLE_CYCLE = 'stroke:#d32f2f,stroke-width:3px'
const STYLE_CRITICAL = 'stroke:#d32f2f,stroke-width:3px,stroke-dasharray:6 4'
const STYLE_HIGH_MED_BOUNDARY = 'stroke:#f57c00,stroke-width:2px'
const STYLE_DEFAULT = 'stroke:#bdbdbd,stroke-width:1px,opacity:0.5'
const STYLE_HUB = 'fill:#fce5f3,stroke:#c2185b'

interface MermaidResult {
  overall: string | null
  foundation: string | null
  layered: string | null
  layeredDetected: boolean
  foundationModules: string[]
  hubModules: string[]
  clusters: Record<string, string>
}

function escId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

type EdgeKind = 'cycle' | 'critical' | 'highMedBoundary' | 'default'

function classifyEdges(findings: Finding[]): {
  cycleEdges: Set<string>
  criticalEdges: Set<string>
  highMedBoundaryEdges: Set<string>
} {
  const cycleEdges = new Set<string>()
  const criticalEdges = new Set<string>()
  const highMedBoundaryEdges = new Set<string>()
  for (const f of findings) {
    if (!f.target) continue
    const src = escId(f.source.module)
    const tgt = escId(f.target.module)
    const edge = `${src}-${tgt}`
    const reverseEdge = `${tgt}-${src}`
    if (
      f.type === 'cycle' ||
      f.rule_id === 'baseline:no-circular' ||
      f.rule_id === 'baseline:inappropriate-intimacy' ||
      f.rule_id === 'baseline:architectural-layer-cycle'
    ) {
      // Cycles are inherently bidirectional. The adapter emits one finding per
      // cycle pair (with src < tgt to dedupe), but the dep_graph contains both
      // directions and both must be styled as cycle edges — otherwise one side
      // renders red and the other default gray, masking the cycle visually.
      cycleEdges.add(edge)
      cycleEdges.add(reverseEdge)
    } else if (f.severity === 'CRITICAL') {
      criticalEdges.add(edge)
    } else if (f.type === 'boundary' && (f.severity === 'HIGH' || f.severity === 'MEDIUM')) {
      highMedBoundaryEdges.add(edge)
    }
  }
  return { cycleEdges, criticalEdges, highMedBoundaryEdges }
}

function findHubModules(findings: Finding[]): string[] {
  const hubs = new Set<string>()
  for (const f of findings) {
    if (f.rule_id === 'baseline:dependency-hub' || f.rule_id === 'baseline:god-object') {
      hubs.add(f.source.module)
    }
  }
  return [...hubs]
}

function findFoundationModules(report: D8AuditReport): string[] {
  const findingsByModule = new Set<string>()
  for (const f of report.findings) {
    findingsByModule.add(f.source.module)
    if (f.target) findingsByModule.add(f.target.module)
  }
  const foundation: string[] = []
  for (const [m, metrics] of Object.entries(report.metrics.per_module)) {
    if (metrics.Ca > 5 && metrics.Ce <= 3 && !findingsByModule.has(m)) {
      foundation.push(m)
    }
  }
  return foundation
}

function buildOverall(
  graph: DepGraph,
  findings: Finding[],
  allModules: Iterable<string>,
  hubModules: string[],
  excludeModules: Set<string> = new Set(),
): string {
  const lines: string[] = ['flowchart TD']
  const { cycleEdges, criticalEdges, highMedBoundaryEdges } = classifyEdges(findings)

  const nodes = [...allModules].filter(m => !excludeModules.has(m))
  for (const m of nodes) {
    lines.push(`    ${escId(m)}`)
  }

  const edgeKinds: EdgeKind[] = []
  for (const [src, targets] of Object.entries(graph)) {
    if (excludeModules.has(src)) continue
    for (const tgt of targets) {
      if (excludeModules.has(tgt)) continue
      const eid = `${escId(src)}-${escId(tgt)}`
      let arrow = '-->'
      let kind: EdgeKind = 'default'
      if (cycleEdges.has(eid)) { arrow = '==>|cycle|'; kind = 'cycle' }
      else if (criticalEdges.has(eid)) { arrow = '-.->|critical|'; kind = 'critical' }
      else if (highMedBoundaryEdges.has(eid)) { arrow = '-->|boundary|'; kind = 'highMedBoundary' }
      lines.push(`    ${escId(src)} ${arrow} ${escId(tgt)}`)
      edgeKinds.push(kind)
    }
  }

  // linkStyle directives — Mermaid indexes edges in declaration order.
  edgeKinds.forEach((kind, idx) => {
    const style =
      kind === 'cycle' ? STYLE_CYCLE :
      kind === 'critical' ? STYLE_CRITICAL :
      kind === 'highMedBoundary' ? STYLE_HIGH_MED_BOUNDARY :
      STYLE_DEFAULT
    lines.push(`    linkStyle ${idx} ${style}`)
  })

  // Hub-module classDef (only if any visible hub).
  const visibleHubs = hubModules.filter(m => !excludeModules.has(m))
  if (visibleHubs.length) {
    lines.push(`    classDef hubModule ${STYLE_HUB}`)
    for (const m of visibleHubs) {
      lines.push(`    class ${escId(m)} hubModule`)
    }
  }

  return lines.join('\n')
}

function buildClusters(findings: Finding[], _graph: DepGraph): Record<string, string> {
  const byPrinciple = new Map<string, Finding[]>()
  for (const f of findings) {
    const key = f.reason.principle
    if (!byPrinciple.has(key)) byPrinciple.set(key, [])
    byPrinciple.get(key)!.push(f)
  }
  const out: Record<string, string> = {}
  for (const [principle, group] of byPrinciple) {
    const lines = ['flowchart TD']
    const seenNode = new Set<string>()
    const seenEdge = new Set<string>()
    for (const f of group) {
      if (!f.target || f.source.module === f.target.module) {
        const node = escId(f.source.module)
        if (!seenNode.has(node)) {
          lines.push(`    ${node}`)
          seenNode.add(node)
        }
        continue
      }
      const e = `${escId(f.source.module)} --> ${escId(f.target.module)}`
      if (!seenEdge.has(e)) { lines.push(`    ${e}`); seenEdge.add(e) }
    }
    out[`cluster-${principle}`] = lines.join('\n')
  }
  return out
}

function detectLayeredArchitecture(report: D8AuditReport): boolean {
  // Layered structure detected if any layered finding fired (means adapter saw ≥2 named layers).
  return report.findings.some(f =>
    f.rule_id === 'baseline:layered-respect' ||
    f.rule_id === 'baseline:architectural-layer-cycle' ||
    f.rule_id === 'baseline:port-adapter-direction',
  )
}

export function generateMermaid(report: D8AuditReport): MermaidResult {
  const graph = report.metrics.dep_graph
  const allModules = new Set<string>([
    ...Object.keys(report.metrics.per_module),
    ...Object.keys(graph),
    ...Object.values(graph).flat(),
  ])
  const moduleCount = allModules.size

  const hubModules = findHubModules(report.findings)
  const foundationModules = findFoundationModules(report)
  const layeredDetected = detectLayeredArchitecture(report)

  // Overall (focused) diagram excludes pure-utility foundation modules to reduce noise.
  const focusedExclude = new Set(foundationModules)
  const overall = moduleCount > MERMAID_OVERALL_CAP
    ? null
    : buildOverall(graph, report.findings, allModules, hubModules, focusedExclude)

  // Foundation diagram — only the foundation modules + their direct neighbors.
  const foundation = foundationModules.length
    ? buildOverall(graph, report.findings, foundationModules, hubModules, new Set())
    : null

  // Layered diagram — same as overall but always rendered if layered detected.
  const layered = layeredDetected
    ? buildOverall(graph, report.findings, allModules, hubModules, new Set())
    : null

  const clusters = buildClusters(report.findings, graph)

  return { overall, foundation, layered, layeredDetected, foundationModules, hubModules, clusters }
}
