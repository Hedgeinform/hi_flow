import { describe, it, expect } from 'vitest'
import { applySuppression } from '../../core/suppression.ts'
import type { Finding } from '../../core/types.ts'

const mkFinding = (overrides: Partial<Finding>): Finding => ({
  id: 'f-test',
  rule_id: 'baseline:cross-module-import-info',
  type: 'cross-module',
  severity: 'LOW',
  source: { module: 'a', file: 'src/a/x.ts' },
  target: { module: 'b', file: 'src/b/y.ts' },
  reason: { principle: 'module-boundary-awareness', explanation: '' },
  ...overrides,
})

describe('suppression', () => {
  it('passes through when no LOW findings', () => {
    const findings = [mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular' })]
    expect(applySuppression(findings)).toEqual(findings)
  })

  it('suppresses LOW info on same edge as HIGH finding', () => {
    const findings: Finding[] = [
      mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular', id: 'f-1' }),
      mkFinding({ severity: 'LOW', rule_id: 'baseline:cross-module-import-info', id: 'f-2' }),
    ]
    const result = applySuppression(findings)
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('f-1')
  })

  it('keeps LOW info on edge with no higher findings', () => {
    const findings: Finding[] = [
      mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular', id: 'f-1', source: { module: 'x', file: '' }, target: { module: 'y', file: '' } }),
      mkFinding({ severity: 'LOW', id: 'f-2', source: { module: 'a', file: '' }, target: { module: 'b', file: '' } }),
    ]
    const result = applySuppression(findings)
    expect(result).toHaveLength(2)
  })

  it('does NOT suppress non-cross-module-import-info LOW findings', () => {
    const findings: Finding[] = [
      mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular', id: 'f-1' }),
      mkFinding({ severity: 'LOW', rule_id: 'baseline:other-low-rule', id: 'f-2' }),
    ]
    const result = applySuppression(findings)
    expect(result).toHaveLength(2)
  })

  it('suppresses baseline:no-orphans for modules with parsing errors', () => {
    const orphan = (mod: string): Finding => ({
      id: `f-${mod}`,
      rule_id: 'baseline:no-orphans',
      type: 'coupling',
      severity: 'MEDIUM',
      source: { module: mod, file: `src/${mod}/index.ts` },
      reason: { principle: 'reachability', explanation: '' },
    })
    const findings: Finding[] = [orphan('a'), orphan('b'), orphan('c')]
    const ctx = {
      parsing_errors: [
        { file: 'src/a/index.ts', error: 'SyntaxError' },
        { file: 'src/c/broken.ts', error: 'SyntaxError' },
      ],
    }
    const result = applySuppression(findings, ctx)
    expect(result.map(f => f.source.module)).toEqual(['b'])
  })

  it('keeps no-orphans when no parsing_errors context provided', () => {
    const orphan: Finding = {
      id: 'f-1',
      rule_id: 'baseline:no-orphans',
      type: 'coupling',
      severity: 'MEDIUM',
      source: { module: 'a', file: 'src/a/index.ts' },
      reason: { principle: 'reachability', explanation: '' },
    }
    const result = applySuppression([orphan])
    expect(result).toHaveLength(1)
  })

  it('handles findings without target (module-property)', () => {
    const f: Finding = {
      id: 'f-1',
      rule_id: 'baseline:god-object',
      type: 'coupling',
      severity: 'HIGH',
      source: { module: 'god', file: '' },
      reason: { principle: 'god-object-prohibition', explanation: '' },
    }
    expect(applySuppression([f])).toEqual([f])
  })
})
