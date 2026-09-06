import { describe, it, expect } from 'vitest'
import { getBaselineRules } from '../../core/baseline-rules.ts'

describe('baseline-rules', () => {
  it('returns 16 baseline rules', () => {
    const rules = getBaselineRules()
    expect(rules).toHaveLength(16)
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

  it('every rule references a non-empty principle id', () => {
    for (const r of getBaselineRules()) {
      expect(r.principle.length).toBeGreaterThan(0)
    }
  })

  it('rule ids are unique', () => {
    const ids = getBaselineRules().map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('contains baseline:barrel-file rule with MEDIUM severity and barrel-discipline principle', () => {
    const rule = getBaselineRules().find(r => r.id === 'baseline:barrel-file')
    expect(rule).toBeDefined()
    expect(rule?.severity).toBe('MEDIUM')
    expect(rule?.principle).toBe('barrel-discipline')
  })

  it('maps NCCD to module-boundary-awareness without describing it as a cycle', () => {
    const rule = getBaselineRules().find(candidate => candidate.id === 'baseline:nccd-breach')

    expect(rule?.severity).toBe('HIGH')
    expect(rule?.principle).toBe('module-boundary-awareness')
    expect(rule?.explanation).toBe(
      'Project NCCD ({nccd}) exceeds threshold ({threshold}) — aggregate transitive dependency complexity exceeds the configured limit.',
    )
    expect(rule?.explanation).not.toMatch(/cyclic|cycle/i)
  })

  it('emits deterministic explanations without prohibited hedging', () => {
    const explanations = getBaselineRules().map(rule => rule.explanation).join('\n')

    expect(explanations).not.toMatch(
      /\b(likely|possibly|probably|potentially|maybe|perhaps|might|sometimes)\b/i,
    )
  })
})
