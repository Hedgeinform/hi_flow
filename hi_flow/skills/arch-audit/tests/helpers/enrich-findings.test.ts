import { describe, it, expect } from 'vitest'
import { enrichFindings } from '../../helpers/enrich-findings.ts'
import { getBaselineRules } from '../../core/baseline-rules.ts'
import type { RawFinding, ProjectRules } from '../../core/types.ts'

const baseline = getBaselineRules()
const emptyProjectRules: ProjectRules = { forbidden: [], required: [] }

const mkRaw = (rule_id: string, raw_severity: 'error' | 'warn' | 'info' = 'warn'): RawFinding => ({
  rule_id,
  raw_severity,
  type: 'test',
  source: { module: 'a', file: 'src/a/x.ts' },
  target: { module: 'b', file: 'src/b/y.ts' },
})

describe('enrich-findings', () => {
  it('namespaces baseline rule_id with baseline: prefix', () => {
    const result = enrichFindings({ rawFindings: [mkRaw('no-circular')], baselineRules: baseline, projectRules: emptyProjectRules })
    expect(result[0]!.rule_id).toBe('baseline:no-circular')
  })

  it('assigns severity from baseline definition (not from raw)', () => {
    const result = enrichFindings({ rawFindings: [mkRaw('no-circular', 'warn')], baselineRules: baseline, projectRules: emptyProjectRules })
    // baseline:no-circular is HIGH per Layer A definition, regardless of raw 'warn'
    expect(result[0]!.severity).toBe('HIGH')
  })

  it('populates reason.principle from baseline rule', () => {
    const result = enrichFindings({ rawFindings: [mkRaw('no-circular')], baselineRules: baseline, projectRules: emptyProjectRules })
    expect(result[0]!.reason.principle).toBe('acyclic-dependencies')
  })

  it('applies project severity_overrides', () => {
    const projectRules: ProjectRules = {
      forbidden: [],
      required: [],
      overrides: { severity_overrides: [{ rule_id: 'baseline:no-orphans', severity: 'CRITICAL' }] },
    }
    const result = enrichFindings({ rawFindings: [mkRaw('no-orphans')], baselineRules: baseline, projectRules })
    expect(result[0]!.severity).toBe('CRITICAL')
  })

  it('drops findings disabled via baseline_disables', () => {
    const projectRules: ProjectRules = {
      forbidden: [],
      required: [],
      overrides: { baseline_disables: [{ rule_id: 'baseline:no-orphans', comment: 'noisy' }] },
    }
    const result = enrichFindings({ rawFindings: [mkRaw('no-orphans')], baselineRules: baseline, projectRules })
    expect(result).toHaveLength(0)
  })

  it('throws on unknown rule_id (upstream bug indicator)', () => {
    expect(() =>
      enrichFindings({ rawFindings: [mkRaw('totally-unknown-rule')], baselineRules: baseline, projectRules: emptyProjectRules }),
    ).toThrow(/totally-unknown-rule/)
  })
})
