import type { DepGraph } from './types.ts'

// Shared pure graph algorithms over a declarative dependency graph (DepGraph =
// module name -> list of imported module names). Single source of truth for the
// architectural metric formulas (Ca, Ce, instability, NCCD) and for graph
// traversal (reachability, cycle detection). Consumed by arch-audit's runtime
// (report-builder, parse-depcruise) and by arch-spec's block C, which builds a
// hypothetical graph (snapshot + the designed feature's nodes/edges) and runs
// these same functions on it — no file scanning, no external tooling.

// Afferent (Ca) and efferent (Ce) coupling of a single module.
export interface Coupling {
  ca: number
  ce: number
}

/**
 * Set of modules reachable from `start`, including `start` itself.
 * Iterative DFS; terminates on cycles and self-loops.
 */
export function reachableFrom(graph: DepGraph, start: string): Set<string> {
  const seen = new Set<string>()
  const stack = [start]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (seen.has(node)) continue
    seen.add(node)
    for (const next of graph[node] ?? []) {
      if (!seen.has(next)) stack.push(next)
    }
  }
  return seen
}

/**
 * Normalized Cumulative Component Dependency (Lakos NCCD): average over all
 * modules of the count of modules each can reach (including itself).
 */
export function computeNCCD(graph: DepGraph): number {
  const modules = Object.keys(graph)
  if (modules.length === 0) return 0
  let cdSum = 0
  for (const m of modules) {
    cdSum += reachableFrom(graph, m).size
  }
  return cdSum / modules.length
}

/**
 * Per-module afferent/efferent coupling derived purely from the declarative
 * graph: Ce(m) = out-degree (distinct imported modules), Ca(m) = in-degree
 * (distinct modules importing m). Self-loops and duplicate module-pair edges
 * are excluded, matching the dependency-cruiser parse semantics.
 */
export function computeCoupling(graph: DepGraph): Record<string, Coupling> {
  const result: Record<string, Coupling> = {}
  const ensure = (m: string): Coupling => (result[m] ??= { ca: 0, ce: 0 })

  for (const [source, targets] of Object.entries(graph)) {
    ensure(source)
    const distinct = new Set<string>()
    for (const target of targets) {
      if (target === source) continue
      if (distinct.has(target)) continue
      distinct.add(target)
      ensure(source).ce++
      ensure(target).ca++
    }
  }
  return result
}

/**
 * Instability metric I = Ce / (Ca + Ce). Returns 0 for an isolated module
 * (Ca = Ce = 0) rather than dividing by zero. 0 = maximally stable, 1 =
 * maximally unstable (Martin's SDP).
 */
export function instability(ca: number, ce: number): number {
  return ca + ce === 0 ? 0 : ce / (ca + ce)
}

interface TarjanFrame {
  node: string
  next: number
}

/**
 * Cyclic groups in the directed graph, found via Tarjan's strongly-connected
 * components (iterative — safe on large graphs). A group is returned when it
 * represents a real cycle: an SCC of size >= 2, or a single node with a
 * self-loop. Each group's nodes are sorted; groups are ordered by first node.
 * Acyclic nodes (DAG portions, feeders into and leaves out of a cycle) are
 * omitted. Works on any declarative graph, including a hypothetical one where
 * the code does not exist yet.
 */
export function findCycles(graph: DepGraph): string[][] {
  const nodes = new Set<string>(Object.keys(graph))
  for (const targets of Object.values(graph)) {
    for (const t of targets) nodes.add(t)
  }
  const successors = (n: string): string[] => graph[n] ?? []

  let counter = 0
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const sccStack: string[] = []
  const sccs: string[][] = []

  for (const root of nodes) {
    if (index.has(root)) continue
    const work: TarjanFrame[] = [{ node: root, next: 0 }]

    while (work.length > 0) {
      const frame = work[work.length - 1]!
      const v = frame.node

      if (frame.next === 0) {
        index.set(v, counter)
        low.set(v, counter)
        counter++
        sccStack.push(v)
        onStack.add(v)
      }

      const succs = successors(v)
      if (frame.next < succs.length) {
        const w = succs[frame.next]!
        frame.next++
        if (!index.has(w)) {
          work.push({ node: w, next: 0 })
        } else if (onStack.has(w)) {
          low.set(v, Math.min(low.get(v)!, index.get(w)!))
        }
        continue
      }

      // All successors of v processed: close v.
      if (low.get(v) === index.get(v)) {
        const component: string[] = []
        let w: string
        do {
          w = sccStack.pop()!
          onStack.delete(w)
          component.push(w)
        } while (w !== v)
        sccs.push(component)
      }
      work.pop()
      const parent = work[work.length - 1]
      if (parent) {
        low.set(parent.node, Math.min(low.get(parent.node)!, low.get(v)!))
      }
    }
  }

  const cyclic = sccs.filter(component => {
    if (component.length > 1) return true
    const only = component[0]!
    return successors(only).includes(only)
  })

  for (const component of cyclic) component.sort()
  cyclic.sort((a, b) => (a[0]! < b[0]! ? -1 : a[0]! > b[0]! ? 1 : 0))
  return cyclic
}
