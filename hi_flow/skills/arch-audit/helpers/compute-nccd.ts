import type { DepGraph } from '../core/types.ts'

function reachableCount(start: string, graph: DepGraph): number {
  const seen = new Set<string>()
  const stack = [start]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (seen.has(node)) continue
    seen.add(node)
    const edges = graph[node] ?? []
    for (const next of edges) {
      if (!seen.has(next)) stack.push(next)
    }
  }
  return seen.size
}

export function computeNCCD(graph: DepGraph): number {
  const modules = Object.keys(graph)
  if (modules.length === 0) return 0
  let cdSum = 0
  for (const m of modules) {
    cdSum += reachableCount(m, graph)
  }
  return cdSum / modules.length
}
