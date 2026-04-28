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
  sdk_edges: { from: string; sdk: string }[]
  parsing_errors?: { file: string; error: string }[]
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
// Returns null for paths that are not real project modules (node_modules, builtins, top-level src/*.ts)
function fileToModule(filePath: string, modulePattern = 'src'): string | null {
  if (!filePath) return null
  if (filePath.startsWith('node_modules/') || filePath.includes('/node_modules/')) return null
  if (/^[a-z]+:/.test(filePath)) return null
  if (!filePath.includes('/') && !filePath.includes('.')) return null
  const parts = filePath.split('/')
  const srcIdx = parts.indexOf(modulePattern)
  if (srcIdx === -1) return null
  if (srcIdx + 1 >= parts.length) return null
  if (srcIdx + 2 >= parts.length) return null  // must have subdir level
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
  // Module-property rules describe a property of source itself, not an edge.
  // For these, target is omitted (depcruise emits to == from as a marker).
  const MODULE_PROPERTY_RULES = new Set(['no-orphans'])
  for (const v of violations) {
    const sourceFile = v.from ?? ''
    const targetFile = v.to ?? v.from ?? ''
    const srcMod = fileToModule(sourceFile, modulePattern)
    const ruleName = v.rule?.name ?? 'unknown'
    const isModuleProperty = MODULE_PROPERTY_RULES.has(ruleName) || sourceFile === targetFile
    if (!srcMod) continue
    if (!isModuleProperty) {
      const tgtMod = fileToModule(targetFile, modulePattern)
      if (!tgtMod) continue
      findings.push({
        rule_id: ruleName,
        raw_severity: (v.rule?.severity ?? 'warn') as DepcruiseSeverity,
        type: normalizeViolationType(v.type),
        source: { module: srcMod, file: sourceFile },
        target: { module: tgtMod, file: targetFile },
        extras: v.cycle ? { cycle: v.cycle } : undefined,
      })
    } else {
      findings.push({
        rule_id: ruleName,
        raw_severity: (v.rule?.severity ?? 'warn') as DepcruiseSeverity,
        type: normalizeViolationType(v.type),
        source: { module: srcMod, file: sourceFile },
        extras: v.cycle ? { cycle: v.cycle } : undefined,
      })
    }
  }

  const dep_graph: DepGraph = {}
  const per_module_raw: Record<string, PerModuleRaw> = {}
  const sdk_edges: { from: string; sdk: string }[] = []
  const modules = data?.modules ?? []

  for (const m of modules) {
    const srcMod = fileToModule(m.source, modulePattern)
    if (!srcMod) continue
    if (!dep_graph[srcMod]) dep_graph[srcMod] = []
    if (!per_module_raw[srcMod]) per_module_raw[srcMod] = { ca: 0, ce: 0, loc: m.metrics?.loc ?? 0 }
    else if (m.metrics?.loc) per_module_raw[srcMod]!.loc = m.metrics.loc
    for (const dep of m.dependencies ?? []) {
      // Capture bare-name external imports as sdk_edges
      const bareName: string = dep.module ?? ''
      if (/^[a-z@]/.test(bareName) && !bareName.startsWith('.') && !bareName.startsWith('/')) {
        sdk_edges.push({ from: srcMod, sdk: bareName })
      }
      const tgtMod = fileToModule(dep.resolved, modulePattern)
      if (!tgtMod || tgtMod === srcMod) continue
      if (!per_module_raw[tgtMod]) per_module_raw[tgtMod] = { ca: 0, ce: 0, loc: 0 }
      // Dedup at module-pair level: increment Ca/Ce only when a new module edge is added.
      // Without this, multiple file-level imports between the same module pair inflate metrics
      // while dep_graph remains correctly deduplicated, causing per_module ↔ dep_graph drift.
      if (!dep_graph[srcMod]!.includes(tgtMod)) {
        dep_graph[srcMod]!.push(tgtMod)
        per_module_raw[srcMod]!.ce++
        per_module_raw[tgtMod]!.ca++
      }
    }
  }

  const parsing_errors: { file: string; error: string }[] = []
  for (const m of modules) {
    if (m.valid === false || m.error) {
      parsing_errors.push({ file: m.source ?? '<unknown>', error: m.error ?? 'invalid module' })
    }
  }

  return {
    findings,
    dep_graph,
    per_module_raw,
    sdk_edges,
    ...(parsing_errors.length > 0 ? { parsing_errors } : {}),
  }
}
