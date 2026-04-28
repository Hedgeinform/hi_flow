import { describe, it, expect } from 'vitest'
import { generateMermaid, MERMAID_OVERALL_CAP } from '../../helpers/generate-mermaid.ts'
import type { D8AuditReport } from '../../core/types.ts'

const minimalReport = (overrides: Partial<D8AuditReport> = {}): D8AuditReport => ({
  metadata: {
    audit_sha: 'uuid:test',
    audit_timestamp: '2026-04-28T00:00:00Z',
    audit_tooling_version: 'test (16.0.0)',
    schema_version: '1.1',
  },
  findings: [],
  metrics: {
    per_module: {},
    nccd: 0,
    nccd_threshold: 1.0,
    severity_counts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    dep_graph: {},
  },
  ...overrides,
})

describe('generate-mermaid', () => {
  it('returns null overall when modules > cap', () => {
    const big: Record<string, string[]> = {}
    for (let i = 0; i < MERMAID_OVERALL_CAP + 1; i++) big[`m${i}`] = []
    const report = minimalReport({ metrics: { ...minimalReport().metrics, dep_graph: big } })
    const result = generateMermaid(report)
    expect(result.overall).toBeNull()
  })

  it('emits flowchart TD for overall when small', () => {
    const report = minimalReport({ metrics: { ...minimalReport().metrics, dep_graph: { a: ['b'], b: [] } } })
    const result = generateMermaid(report)
    expect(result.overall).toMatch(/flowchart TD/)
    expect(result.overall).toMatch(/a --> b/)
  })

  it('layered is null when no architectural-layer-cycle hint', () => {
    const report = minimalReport()
    expect(generateMermaid(report).layered).toBeNull()
  })

  it('clusters is keyed by cluster id when findings exist', () => {
    const report = minimalReport({
      findings: [
        {
          id: 'f-001',
          rule_id: 'baseline:no-circular',
          type: 'cycle',
          severity: 'HIGH',
          source: { module: 'a', file: '' },
          target: { module: 'b', file: '' },
          reason: { principle: 'acyclic-dependencies', explanation: '' },
        },
      ],
      metrics: { ...minimalReport().metrics, dep_graph: { a: ['b'], b: ['a'] } },
    })
    const result = generateMermaid(report)
    expect(Object.keys(result.clusters).length).toBeGreaterThan(0)
  })
})
