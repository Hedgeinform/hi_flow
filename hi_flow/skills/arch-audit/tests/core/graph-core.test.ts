import { describe, it, expect } from 'vitest'
import {
  computeNCCD,
  reachableFrom,
  computeCoupling,
  instability,
  findCycles,
} from '../../core/graph-core.ts'

describe('graph-core: computeNCCD', () => {
  it('empty graph returns 0', () => {
    expect(computeNCCD({})).toBe(0)
  })

  it('single isolated module: NCCD = 1.0 (CD=1, N=1)', () => {
    expect(computeNCCD({ a: [] })).toBe(1.0)
  })

  it('linear chain a->b->c: NCCD = (3+2+1)/3 = 2.0', () => {
    const graph = { a: ['b'], b: ['c'], c: [] }
    expect(computeNCCD(graph)).toBeCloseTo(2.0, 5)
  })

  it('star a->[b,c]: a reaches 3, b and c reach 1; NCCD = (3+1+1)/3', () => {
    const graph = { a: ['b', 'c'], b: [], c: [] }
    expect(computeNCCD(graph)).toBeCloseTo(5 / 3, 5)
  })

  it('cycle a->b->a: each reaches 2; NCCD = (2+2)/2 = 2.0', () => {
    const graph = { a: ['b'], b: ['a'] }
    expect(computeNCCD(graph)).toBeCloseTo(2.0, 5)
  })
})

describe('graph-core: reachableFrom', () => {
  it('includes the start node itself', () => {
    expect([...reachableFrom({ a: [] }, 'a')].sort()).toEqual(['a'])
  })

  it('follows a linear chain transitively', () => {
    const graph = { a: ['b'], b: ['c'], c: [] }
    expect([...reachableFrom(graph, 'a')].sort()).toEqual(['a', 'b', 'c'])
    expect([...reachableFrom(graph, 'b')].sort()).toEqual(['b', 'c'])
    expect([...reachableFrom(graph, 'c')].sort()).toEqual(['c'])
  })

  it('terminates on a cycle and returns the whole cyclic set', () => {
    const graph = { a: ['b'], b: ['a'] }
    expect([...reachableFrom(graph, 'a')].sort()).toEqual(['a', 'b'])
  })

  it('handles a self-loop without looping forever', () => {
    expect([...reachableFrom({ a: ['a'] }, 'a')].sort()).toEqual(['a'])
  })

  it('returns just the start node when it is absent from the graph keys', () => {
    expect([...reachableFrom({ a: ['b'] }, 'z')].sort()).toEqual(['z'])
  })

  it('reaches a node that only appears as an edge target', () => {
    expect([...reachableFrom({ a: ['b'] }, 'a')].sort()).toEqual(['a', 'b'])
  })
})

describe('graph-core: computeCoupling (Ca/Ce as in/out-degree)', () => {
  it('empty graph yields no entries', () => {
    expect(computeCoupling({})).toEqual({})
  })

  it('two-cycle a<->b plus isolated c', () => {
    const graph = { a: ['b'], b: ['a'], c: [] }
    expect(computeCoupling(graph)).toEqual({
      a: { ca: 1, ce: 1 },
      b: { ca: 1, ce: 1 },
      c: { ca: 0, ce: 0 },
    })
  })

  it('star a->[b,c]: a has Ce=2, leaves have Ca=1', () => {
    const graph = { a: ['b', 'c'], b: [], c: [] }
    expect(computeCoupling(graph)).toEqual({
      a: { ca: 0, ce: 2 },
      b: { ca: 1, ce: 0 },
      c: { ca: 1, ce: 0 },
    })
  })

  it('includes a node that only appears as an edge target (no own key)', () => {
    const graph = { a: ['b'] }
    expect(computeCoupling(graph)).toEqual({
      a: { ca: 0, ce: 1 },
      b: { ca: 1, ce: 0 },
    })
  })

  it('excludes self-loops from coupling (matches depcruise parse semantics)', () => {
    const graph = { a: ['a', 'b'], b: [] }
    expect(computeCoupling(graph)).toEqual({
      a: { ca: 0, ce: 1 },
      b: { ca: 1, ce: 0 },
    })
  })

  it('does not double-count duplicate edges between the same module pair', () => {
    const graph = { a: ['b', 'b'], b: [] }
    expect(computeCoupling(graph)).toEqual({
      a: { ca: 0, ce: 1 },
      b: { ca: 1, ce: 0 },
    })
  })
})

describe('graph-core: instability', () => {
  it('returns 0 when both Ca and Ce are 0 (no division by zero)', () => {
    expect(instability(0, 0)).toBe(0)
  })

  it('maximally stable (Ce=0) -> I=0', () => {
    expect(instability(3, 0)).toBe(0)
  })

  it('maximally unstable (Ca=0) -> I=1', () => {
    expect(instability(0, 2)).toBe(1)
  })

  it('balanced coupling -> I=0.5', () => {
    expect(instability(1, 1)).toBeCloseTo(0.5, 5)
  })
})

describe('graph-core: findCycles', () => {
  it('empty graph has no cycles', () => {
    expect(findCycles({})).toEqual([])
  })

  it('a DAG has no cycles', () => {
    const graph = { a: ['b'], b: ['c'], c: [] }
    expect(findCycles(graph)).toEqual([])
  })

  it('detects a two-module cycle', () => {
    const graph = { a: ['b'], b: ['a'] }
    expect(findCycles(graph)).toEqual([['a', 'b']])
  })

  it('detects a three-module cycle', () => {
    const graph = { a: ['b'], b: ['c'], c: ['a'] }
    expect(findCycles(graph)).toEqual([['a', 'b', 'c']])
  })

  it('detects a self-loop as a cycle', () => {
    expect(findCycles({ a: ['a'] })).toEqual([['a']])
  })

  it('reports two disjoint cycles, each sorted, groups in deterministic order', () => {
    const graph = { a: ['b'], b: ['a'], c: ['d'], d: ['c'] }
    expect(findCycles(graph)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('excludes acyclic tail nodes feeding into a cycle', () => {
    // a<->b is a cycle; c->a is just a feeder, not part of the cycle
    const graph = { a: ['b'], b: ['a'], c: ['a'] }
    expect(findCycles(graph)).toEqual([['a', 'b']])
  })

  it('excludes nodes a cycle points out to', () => {
    // a<->b is a cycle; b->c->(nothing): c is a downstream leaf, not in the cycle
    const graph = { a: ['b'], b: ['a', 'c'], c: [] }
    expect(findCycles(graph)).toEqual([['a', 'b']])
  })

  it('detects a single SCC that contains nested cycles as one cyclic group', () => {
    // a->b->c->a and b->a: all three are mutually reachable -> one SCC
    const graph = { a: ['b'], b: ['c', 'a'], c: ['a'] }
    expect(findCycles(graph)).toEqual([['a', 'b', 'c']])
  })

  it('detects a cycle reachable only through an acyclic prefix', () => {
    // entry -> a -> b -> a; entry is acyclic, a<->b is the cycle
    const graph = { entry: ['a'], a: ['b'], b: ['a'] }
    expect(findCycles(graph)).toEqual([['a', 'b']])
  })
})
