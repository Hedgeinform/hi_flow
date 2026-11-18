import { describe, it, expect } from 'vitest'
import { createCppCmakeAdapter } from '../../adapters/cpp-cmake.ts'

describe('C++ module cycles', () => {
  it('reports distinct simple cycles once even within one strongly connected component', async () => {
    const depGraph = { a: ['b'], b: ['a', 'c'], c: ['b'] }
    const raw = { a: { ca: 1, ce: 1, loc: 1 }, b: { ca: 2, ce: 2, loc: 1 }, c: { ca: 1, ce: 1, loc: 1 } }
    const findings = await createCppCmakeAdapter().detectStructural({ projectPath: '/project', depGraph, perModuleRaw: raw, projectRules: { forbidden: [], required: [] } })
    expect(findings.filter(item => item.type === 'cycle').map(item => item.extras?.members)).toEqual([['a', 'b'], ['b', 'c']])
  })
})
