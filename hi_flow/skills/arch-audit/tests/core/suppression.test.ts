import { describe, it, expect } from 'vitest'
import { applySuppression } from '../../core/suppression.ts'
import type { Finding } from '../../core/types.ts'

const mkFinding = (overrides: Partial<Finding>): Finding => ({
  id: 'f-test',
  rule_id: 'baseline:god-object',
  type: 'coupling',
  severity: 'HIGH',
  source: { module: 'a', file: 'src/a/x.ts' },
  reason: { principle: 'god-object-prohibition', explanation: '' },
  ...overrides,
})

describe('suppression', () => {
  it('keeps only the most specific highest-severity owner for one module cycle', () => {
    const findings = [
      mkFinding({
        id: 'f-001',
        rule_id: 'baseline:inappropriate-intimacy',
        type: 'cycle',
        severity: 'HIGH',
        source: { module: 'domain', file: '' },
        target: { module: 'infrastructure', file: '' },
        extras: { members: ['domain', 'infrastructure'] },
      }),
      mkFinding({
        id: 'f-002',
        rule_id: 'baseline:architectural-layer-cycle',
        type: 'cycle',
        severity: 'CRITICAL',
        source: { module: 'infrastructure', file: '' },
        target: { module: 'domain', file: '' },
        extras: { members: ['infrastructure', 'domain'], layers: ['infrastructure', 'domain'] },
      }),
    ]

    const result = applySuppression(findings)
    expect(result).toHaveLength(1)
    expect(result[0]!.rule_id).toBe('baseline:architectural-layer-cycle')
  })

  it('passes through non-cycle findings unchanged', () => {
    const findings = [mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular' })]
    expect(applySuppression(findings)).toEqual(findings)
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

  it('maps parsing errors below a nested configured module root', () => {
    const finding = mkFinding({
      rule_id: 'baseline:no-orphans',
      severity: 'MEDIUM',
      source: { module: 'a', file: 'packages/runtime/a/index.mjs' },
      target: undefined,
    })
    const result = applySuppression([finding], {
      parsing_errors: [{ file: 'packages/runtime/a/index.mjs', error: 'SyntaxError' }],
      modulePattern: 'packages/runtime',
    })
    expect(result).toEqual([])
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
