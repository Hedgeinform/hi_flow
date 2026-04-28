import type { RawFinding, DepGraph, DepcruiseSeverity } from '../core/types.ts'

interface PerModuleRaw {
  ca: number
  ce: number
  loc: number
}

interface ParseResult {
  findings: RawFinding[]
  dep_graph: DepGraph
  per_module_raw: Record<string, PerModuleRaw>
}

// Map depcruise violation types to D8 schema enum values
function normalizeViolationType(raw: string | undefined | null): 'boundary' | 'cycle' | 'sdp' | 'coupling' | 'nccd' {
  switch (raw) {
    case 'cycle': return 'cycle'
    case 'dependency': return 'boundary'
    case 'reachability': return 'boundary'
    case 'module': return 'coupling'
    default: return 'coupling'
  }
}

// Default module pattern: top-level subdir of src/
function fileToModule(filePath: string, modulePattern = 'src'): string {
  const parts = filePath.split('/')
  const srcIdx = parts.indexOf(modulePattern)
  if (srcIdx === -1 || srcIdx + 1 >= parts.length) return parts[0] ?? '<root>'
  return parts[srcIdx + 1]!
}

export function parseDepcruiseOutput(jsonString: string, modulePattern = 'src'): ParseResult {
  let data: any
  try {
    data = JSON.parse(jsonString)
  } catch (e) {
    throw new Error(`depcruise output is not valid JSON: ${(e as Error).message}`)
  }

  const findings: RawFinding[] = []
  const violations = data?.summary?.violations ?? []
  for (const v of violations) {
    const sourceFile = v.from ?? ''
    const targetFile = v.to ?? v.from ?? ''
    findings.push({
      rule_id: v.rule?.name ?? 'unknown',
      raw_severity: (v.rule?.severity ?? 'warn') as DepcruiseSeverity,
      type: normalizeViolationType(v.type),
      source: { module: fileToModule(sourceFile, modulePattern), file: sourceFile },
      target: { module: fileToModule(targetFile, modulePattern), file: targetFile },
      extras: v.cycle ? { cycle: v.cycle } : undefined,
    })
  }

  const dep_graph: DepGraph = {}
  const per_module_raw: Record<string, PerModuleRaw> = {}
  const modules = data?.modules ?? []

  for (const m of modules) {
    const srcMod = fileToModule(m.source, modulePattern)
    if (!dep_graph[srcMod]) dep_graph[srcMod] = []
    if (!per_module_raw[srcMod]) per_module_raw[srcMod] = { ca: 0, ce: 0, loc: m.metrics?.loc ?? 0 }
    else if (m.metrics?.loc) per_module_raw[srcMod].loc = m.metrics.loc
    for (const dep of m.dependencies ?? []) {
      const tgtMod = fileToModule(dep.resolved, modulePattern)
      if (tgtMod === srcMod) continue
      if (!dep_graph[srcMod].includes(tgtMod)) dep_graph[srcMod].push(tgtMod)
      per_module_raw[srcMod].ce++
      if (!per_module_raw[tgtMod]) per_module_raw[tgtMod] = { ca: 0, ce: 0, loc: 0 }
      per_module_raw[tgtMod].ca++
    }
  }

  return { findings, dep_graph, per_module_raw }
}
