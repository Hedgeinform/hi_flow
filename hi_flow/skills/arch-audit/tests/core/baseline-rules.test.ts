import { describe, it, expect } from 'vitest'
import { getBaselineRules } from '../../core/baseline-rules.ts'

describe('baseline-rules', () => {
  it('returns 14 baseline rules', () => {
    const rules = getBaselineRules()
    expect(rules).toHaveLength(14)
  })

  it('every rule has namespaced id with baseline: prefix', () => {
    const rules = getBaselineRules()
    for (const r of rules) {
      expect(r.id.startsWith('baseline:')).toBe(true)
    }
  })

  it('contains the three Layer A built-ins', () => {
    const ids = getBaselineRules().map(r => r.id)
    expect(ids).toContain('baseline:no-circular')
    expect(ids).toContain('baseline:no-orphans')
    expect(ids).toContain('baseline:not-to-test-from-prod')
  })

  it('architectural-layer-cycle is CRITICAL', () => {
    const rule = getBaselineRules().find(r => r.id === 'baseline:architectural-layer-cycle')
    expect(rule?.severity).toBe('CRITICAL')
  })

  it('cross-module-import-info is LOW', () => {
    const rule = getBaselineRules().find(r => r.id === 'baseline:cross-module-import-info')
    expect(rule?.severity).toBe('LOW')
  })

  it('every rule references a non-empty principle id', () => {
    for (const r of getBaselineRules()) {
      expect(r.principle.length).toBeGreaterThan(0)
    }
  })

  it('rule ids are unique', () => {
    const ids = getBaselineRules().map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
