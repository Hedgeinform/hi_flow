import { describe, it, expect } from 'vitest'
import { validateD8Report } from '../../core/d8-schema-validator.ts'

const validReport = {
  metadata: {
    audit_sha: 'uuid:00000000-0000-0000-0000-000000000000',
    audit_timestamp: '2026-04-28T12:00:00Z',
    audit_tooling_version: 'typescript-depcruise (16.3.0)',
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
}

describe('d8-schema-validator', () => {
  it('validates a minimal correct report', () => {
    const result = validateD8Report(validReport)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects missing required field', () => {
    const bad: any = { ...validReport }
    delete bad.findings
    const result = validateD8Report(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('accepts metadata.parsing_errors as optional', () => {
    const withErrors = {
      ...validReport,
      metadata: {
        ...validReport.metadata,
        parsing_errors: [{ file: 'src/broken.ts', error: 'SyntaxError' }],
      },
    }
    const result = validateD8Report(withErrors)
    expect(result.valid).toBe(true)
  })
})
