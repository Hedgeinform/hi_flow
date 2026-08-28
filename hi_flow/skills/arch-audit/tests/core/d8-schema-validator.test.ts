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

const semanticContext = {
  canonicalPrincipleIds: new Set(['acyclic-dependencies']),
  knownRuleIds: new Set(['baseline:no-circular']),
}

describe('d8-schema-validator', () => {
  it('validates a minimal correct report', () => {
    const result = validateD8Report(validReport)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects a non-date audit timestamp with a format error', () => {
    const report = {
      ...validReport,
      metadata: {
        ...validReport.metadata,
        audit_timestamp: 'not-a-date',
      },
    }

    const result = validateD8Report(report)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual({
      path: '/metadata/audit_timestamp',
      keyword: 'format',
      message: expect.stringContaining('date-time'),
    })
  })

  it('rejects missing required field', () => {
    const bad: any = { ...validReport }
    delete bad.findings
    const result = validateD8Report(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns structural errors instead of throwing for incomplete metrics', () => {
    const report = { ...validReport, metrics: {} }

    expect(() => validateD8Report(report)).not.toThrow()
    const result = validateD8Report(report)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/metrics', keyword: 'required' }),
    ]))
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

  it('rejects a non-empty graph whose total source LOC is zero', () => {
    const report = {
      ...validReport,
      metrics: {
        ...validReport.metrics,
        per_module: { a: { Ca: 0, Ce: 0, I: 0, LOC: 0 } },
        dep_graph: { a: [] },
      },
    }

    const result = validateD8Report(report, semanticContext)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/metrics/per_module',
      keyword: 'semantic',
      message: expect.stringContaining('LOC'),
    }))
  })

  it('rejects a cycle without graph-valid module members', () => {
    const report = {
      ...validReport,
      findings: [{
        id: 'f-001',
        rule_id: 'baseline:no-circular',
        type: 'cycle',
        severity: 'HIGH',
        source: { module: 'a', file: 'src/a/index.ts' },
        target: { module: 'b', file: 'src/b/index.ts' },
        reason: { principle: 'acyclic-dependencies', explanation: 'Cycle.' },
        extras: { cycle: ['src/a/index.ts', 'src/b/index.ts'] },
      }],
      metrics: {
        ...validReport.metrics,
        per_module: {
          a: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
          b: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
        },
        severity_counts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 },
        dep_graph: { a: ['b'], b: ['a'] },
      },
    }

    const result = validateD8Report(report, semanticContext)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/findings/0/extras/members',
      keyword: 'semantic',
    }))
  })

  it('rejects unknown rule and D9 principle references', () => {
    const report = {
      ...validReport,
      findings: [{
        id: 'f-001',
        rule_id: 'legacy-rule',
        type: 'boundary',
        severity: 'HIGH',
        source: { module: 'a', file: 'src/a/index.ts' },
        target: { module: 'b', file: 'src/b/index.ts' },
        reason: { principle: 'acyclic-dependencies (ADP)', explanation: 'Invalid refs.' },
      }],
      metrics: {
        ...validReport.metrics,
        per_module: {
          a: { Ca: 0, Ce: 1, I: 1, LOC: 1 },
          b: { Ca: 1, Ce: 0, I: 0, LOC: 1 },
        },
        severity_counts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 },
        dep_graph: { a: ['b'], b: [] },
      },
    }

    const result = validateD8Report(report, semanticContext)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/findings/0/rule_id' }),
      expect.objectContaining({ path: '/findings/0/reason/principle' }),
    ]))
  })

  it('rejects severity counts that do not match findings', () => {
    const report = {
      ...validReport,
      findings: [{
        id: 'f-001',
        rule_id: 'baseline:no-circular',
        type: 'cycle',
        severity: 'HIGH',
        source: { module: 'a', file: 'src/a/index.ts' },
        target: { module: 'b', file: 'src/b/index.ts' },
        reason: { principle: 'acyclic-dependencies', explanation: 'Cycle.' },
        extras: { members: ['a', 'b'] },
      }],
      metrics: {
        ...validReport.metrics,
        per_module: {
          a: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
          b: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
        },
        dep_graph: { a: ['b'], b: ['a'] },
      },
    }

    const result = validateD8Report(report, semanticContext)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/metrics/severity_counts/HIGH',
      keyword: 'semantic',
    }))
  })

  it('accepts an explicitly external channel-SDK boundary', () => {
    const report = {
      ...validReport,
      findings: [{
        id: 'f-001',
        rule_id: 'baseline:domain-no-channel-sdk',
        type: 'boundary',
        severity: 'MEDIUM',
        source: { module: 'domain', file: '' },
        target: { module: 'telegraf', file: '' },
        reason: { principle: 'channel-agnosticism', explanation: 'Domain imports a channel SDK.' },
        extras: { sdk: 'telegraf', external_target: true },
      }],
      metrics: {
        ...validReport.metrics,
        per_module: { domain: { Ca: 0, Ce: 0, I: 0, LOC: 1 } },
        severity_counts: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 0 },
        dep_graph: { domain: [] },
      },
    }

    const result = validateD8Report(report, {
      canonicalPrincipleIds: new Set(['channel-agnosticism']),
      knownRuleIds: new Set(['baseline:domain-no-channel-sdk']),
    })

    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('accepts a file-level boundary inside one architecture module', () => {
    const report = {
      ...validReport,
      findings: [{
        id: 'f-001',
        rule_id: 'project:no-internal-edge',
        type: 'boundary',
        severity: 'HIGH',
        source: { module: 'domain', file: 'src/domain/a.ts' },
        target: { module: 'domain', file: 'src/domain/b.ts' },
        reason: { principle: 'module-boundary-awareness', explanation: 'Forbidden internal edge.' },
      }],
      metrics: {
        ...validReport.metrics,
        per_module: { domain: { Ca: 0, Ce: 0, I: 0, LOC: 2 } },
        severity_counts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 },
        dep_graph: { domain: [] },
      },
    }

    const result = validateD8Report(report, {
      canonicalPrincipleIds: new Set(['module-boundary-awareness']),
      knownRuleIds: new Set(['project:no-internal-edge']),
    })

    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('rejects cycle ownership that disagrees with member count', () => {
    const report = {
      ...validReport,
      findings: [{
        id: 'f-001',
        rule_id: 'baseline:no-circular',
        type: 'cycle',
        severity: 'HIGH',
        source: { module: 'a', file: '' },
        target: { module: 'b', file: '' },
        reason: { principle: 'acyclic-dependencies', explanation: 'Cycle.' },
        extras: { members: ['a', 'b'] },
      }],
      metrics: {
        ...validReport.metrics,
        per_module: {
          a: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
          b: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
        },
        severity_counts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 },
        dep_graph: { a: ['b'], b: ['a'] },
      },
    }

    const result = validateD8Report(report, {
      canonicalPrincipleIds: new Set(['acyclic-dependencies']),
      knownRuleIds: new Set(['baseline:no-circular', 'baseline:inappropriate-intimacy']),
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/findings/0/rule_id',
      message: expect.stringContaining('two-module cycle'),
    }))
  })

  it('rejects a specialized two-module cycle owner on a three-module cycle', () => {
    const report = {
      ...validReport,
      findings: [{
        id: 'f-001',
        rule_id: 'baseline:architectural-layer-cycle',
        type: 'cycle',
        severity: 'CRITICAL',
        source: { module: 'a', file: '' },
        target: { module: 'b', file: '' },
        reason: { principle: 'acyclic-dependencies', explanation: 'Layer cycle.' },
        extras: { members: ['a', 'b', 'c'], layers: ['domain', 'application', 'infrastructure'] },
      }],
      metrics: {
        ...validReport.metrics,
        per_module: {
          a: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
          b: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
          c: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
        },
        severity_counts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
        dep_graph: { a: ['b'], b: ['c'], c: ['a'] },
      },
    }

    const result = validateD8Report(report, {
      canonicalPrincipleIds: new Set(['acyclic-dependencies']),
      knownRuleIds: new Set(['baseline:architectural-layer-cycle']),
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/findings/0/rule_id',
      message: expect.stringContaining('baseline:no-circular'),
    }))
  })

  it('rejects a non-cycle rule as the owner of a graph-valid cycle', () => {
    const report = {
      ...validReport,
      findings: [{
        id: 'f-001',
        rule_id: 'baseline:god-object',
        type: 'cycle',
        severity: 'HIGH',
        source: { module: 'a', file: '' },
        target: { module: 'b', file: '' },
        reason: { principle: 'acyclic-dependencies', explanation: 'Wrong owner.' },
        extras: { members: ['a', 'b'] },
      }],
      metrics: {
        ...validReport.metrics,
        per_module: {
          a: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
          b: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
        },
        severity_counts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 },
        dep_graph: { a: ['b'], b: ['a'] },
      },
    }

    const result = validateD8Report(report, {
      canonicalPrincipleIds: new Set(['acyclic-dependencies']),
      knownRuleIds: new Set(['baseline:god-object']),
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/findings/0/rule_id',
      message: expect.stringContaining('two-module cycle'),
    }))
  })

  it('rejects duplicate ownership of the same cycle regardless of direction', () => {
    const baseCycle = {
      type: 'cycle',
      severity: 'HIGH',
      source: { module: 'a', file: '' },
      target: { module: 'b', file: '' },
      reason: { principle: 'acyclic-dependencies', explanation: 'Cycle.' },
    }
    const report = {
      ...validReport,
      findings: [
        { ...baseCycle, id: 'f-001', rule_id: 'baseline:inappropriate-intimacy', extras: { members: ['a', 'b'] } },
        {
          ...baseCycle,
          id: 'f-002',
          rule_id: 'baseline:architectural-layer-cycle',
          severity: 'CRITICAL',
          source: { module: 'b', file: '' },
          target: { module: 'a', file: '' },
          extras: { members: ['b', 'a'], layers: ['infrastructure', 'domain'] },
        },
      ],
      metrics: {
        ...validReport.metrics,
        per_module: {
          a: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
          b: { Ca: 1, Ce: 1, I: 0.5, LOC: 1 },
        },
        severity_counts: { CRITICAL: 1, HIGH: 1, MEDIUM: 0, LOW: 0 },
        dep_graph: { a: ['b'], b: ['a'] },
      },
    }

    const result = validateD8Report(report, {
      canonicalPrincipleIds: new Set(['acyclic-dependencies']),
      knownRuleIds: new Set(['baseline:inappropriate-intimacy', 'baseline:architectural-layer-cycle']),
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: '/findings/1/extras/members',
      message: expect.stringContaining('duplicate'),
    }))
  })
})
