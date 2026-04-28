import { describe, it, expect } from 'vitest'
import { computeNCCD } from '../../helpers/compute-nccd.ts'

describe('compute-nccd', () => {
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
