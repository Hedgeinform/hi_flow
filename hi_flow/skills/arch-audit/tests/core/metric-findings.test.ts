import { describe, it, expect } from 'vitest'
import { detectMetricFindings } from '../../core/metric-findings.ts'

describe('shared metric findings', () => {
  it('keeps god-object, dependency-hub and high-fanout thresholds', () => {
    const graph = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`m${i}`, []]))
    const raw = Object.fromEntries(Object.keys(graph).map(name => [name, { ca: 0, ce: 0, loc: 1 }]))
    raw.m0 = { ca: 11, ce: 16, loc: 301 }
    raw.m1 = { ca: 10, ce: 15, loc: 300 }
    const findings = detectMetricFindings(graph, raw)
    expect(findings.map(finding => finding.rule_id)).toEqual(['god-object', 'dependency-hub', 'high-fanout'])
    expect(findings.every(finding => finding.source.module === 'm0')).toBe(true)
  })
})
