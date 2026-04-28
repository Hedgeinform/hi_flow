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
    expect(result[0].id).toBe('f-1')
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
})
