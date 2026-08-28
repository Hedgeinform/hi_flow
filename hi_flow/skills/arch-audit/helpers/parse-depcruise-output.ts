import type { RawFinding, DepGraph, DepcruiseSeverity } from '../core/types.ts'
import { computeCoupling } from '../core/graph-core.ts'
import { fileToModule } from '../core/source-scope.ts'

interface PerModuleRaw {
  ca: number
  ce: number
  loc: number
}

interface ParseResult {
  findings: RawFinding[]
  dep_graph: DepGraph
  per_module_raw: Record<string, PerModuleRaw>
  source_files_by_module: Record<string, string[]>
  sdk_edges: { from: string; sdk: string }[]
  parsing_errors?: { file: string; error: string }[]
  barrel_imports?: { from: string; to: string; targetFile: string }[]
}

function cycleEntryName(entry: unknown): string | null {
  if (typeof entry === 'string') return entry
  if (entry && typeof entry === 'object' && 'name' in entry && typeof entry.name === 'string') {
    return entry.name
  }
  return null
}

function normalizeCycleMembers(sourceFile: string, rawCycle: unknown, modulePattern: string): string[] {
  const cycleEntries = Array.isArray(rawCycle) ? rawCycle : []
  const files = [sourceFile, ...cycleEntries.map(cycleEntryName).filter((name): name is string => !!name)]
  const members: string[] = []
  for (const file of files) {
    const module = fileToModule(file, modulePattern)
    if (module && members.at(-1) !== module) members.push(module)
  }
  if (members.length > 1 && members[0] === members.at(-1)) members.pop()
  return members
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
    const isCycle = v.type === 'cycle'
    const cycleMembers = isCycle ? normalizeCycleMembers(sourceFile, v.cycle, modulePattern) : []
    // D8 is module-level. File cycles inside one module are not architecture findings,
    // and two-module cycles are owned by the adapter's inappropriate-intimacy rule.
    if (isCycle && cycleMembers.length < 3) continue
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
        extras: isCycle ? { members: cycleMembers } : undefined,
      })
    } else {
      findings.push({
        rule_id: ruleName,
        raw_severity: (v.rule?.severity ?? 'warn') as DepcruiseSeverity,
        type: normalizeViolationType(v.type),
        source: { module: srcMod, file: sourceFile },
        extras: isCycle ? { members: cycleMembers } : undefined,
      })
    }
  }

  const dep_graph: DepGraph = {}
  const per_module_raw: Record<string, PerModuleRaw> = {}
  const source_files_by_module: Record<string, string[]> = {}
  const sdk_edges: { from: string; sdk: string }[] = []
  const barrel_imports: { from: string; to: string; targetFile: string }[] = []
  const INDEX_FILENAME_RE = /\/index\.(ts|tsx|js|jsx|mjs|cjs)$/
  const modules = data?.modules ?? []

  for (const m of modules) {
    const srcMod = fileToModule(m.source, modulePattern)
    if (!srcMod) continue
    if (!dep_graph[srcMod]) dep_graph[srcMod] = []
    if (!per_module_raw[srcMod]) per_module_raw[srcMod] = { ca: 0, ce: 0, loc: 0 }
    if (!source_files_by_module[srcMod]) source_files_by_module[srcMod] = []
    if (!source_files_by_module[srcMod]!.includes(m.source)) source_files_by_module[srcMod]!.push(m.source)
    for (const dep of m.dependencies ?? []) {
      // Capture bare-name external imports as sdk_edges
      const bareName: string = dep.module ?? ''
      if (/^[a-z@]/.test(bareName) && !bareName.startsWith('.') && !bareName.startsWith('/')) {
        sdk_edges.push({ from: srcMod, sdk: bareName })
      }
      const tgtMod = fileToModule(dep.resolved, modulePattern)
      if (!tgtMod || tgtMod === srcMod) continue
      if (INDEX_FILENAME_RE.test(dep.resolved ?? '')) {
        barrel_imports.push({ from: srcMod, to: tgtMod, targetFile: dep.resolved })
      }
      if (!per_module_raw[tgtMod]) per_module_raw[tgtMod] = { ca: 0, ce: 0, loc: 0 }
      // Build the deduplicated module-pair graph here; Ca/Ce are derived from it
      // below via graph-core, not counted inline (single source for the formula).
      if (!dep_graph[srcMod]!.includes(tgtMod)) {
        dep_graph[srcMod]!.push(tgtMod)
      }
    }
  }

  // Ca/Ce = in/out-degree of the deduplicated module graph. The formula lives in
  // graph-core (computeCoupling) so arch-audit and arch-spec's hypothetical-graph
  // analysis share one definition (SSoT). LOC is initialized here and populated
  // later by source-metrics from the files dependency-cruiser actually audited.
  const coupling = computeCoupling(dep_graph)
  for (const m of Object.keys(per_module_raw)) {
    per_module_raw[m]!.ce = coupling[m]?.ce ?? 0
    per_module_raw[m]!.ca = coupling[m]?.ca ?? 0
  }

  const parsing_errors: { file: string; error: string }[] = []
  for (const m of modules) {
    // depcruise sets `m.error` only on real parse/resolution failures.
    // `m.valid === false` alone is NOT a parse error — it's a violation marker
    // (e.g., depcruise sets valid=false on modules that violated no-orphans).
    // Conflating the two causes legitimate orphans to be filed as parse errors,
    // which then get suppressed by D2 logic and never surface to the operator.
    if (m.error) {
      parsing_errors.push({ file: m.source ?? '<unknown>', error: m.error })
    }
  }

  return {
    findings,
    dep_graph,
    per_module_raw,
    source_files_by_module,
    sdk_edges,
    ...(parsing_errors.length > 0 ? { parsing_errors } : {}),
    ...(barrel_imports.length > 0 ? { barrel_imports } : {}),
  }
}
