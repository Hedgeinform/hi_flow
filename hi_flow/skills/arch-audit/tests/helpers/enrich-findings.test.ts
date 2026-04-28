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

  it('interpolates {key} placeholders in explanation from extras', () => {
    const raw: RawFinding = {
      rule_id: 'nccd-breach',
      raw_severity: 'error',
      type: 'nccd',
      source: { module: '<project>', file: '' },
      extras: { nccd: 7.06, threshold: 1, module_count: 18 },
    }
    const result = enrichFindings({ rawFindings: [raw], baselineRules: baseline, projectRules: emptyProjectRules })
    expect(result[0]!.reason.explanation).toBe(
      'Project NCCD (7.06) exceeds threshold (1) — graph has aggregate cyclic complexity.',
    )
  })

  it('interpolates {ce} and {threshold} for high-fanout', () => {
    const raw: RawFinding = {
      rule_id: 'high-fanout',
      raw_severity: 'warn',
      type: 'coupling',
      source: { module: 'tools', file: '' },
      extras: { ce: 25, threshold: 15 },
    }
    const result = enrichFindings({ rawFindings: [raw], baselineRules: baseline, projectRules: emptyProjectRules })
    expect(result[0]!.reason.explanation).toBe(
      'Module Ce (25) > 15 — too many outgoing dependencies, likely doing too many things.',
    )
  })

  it('interpolates {source} and {target} from finding source/target modules', () => {
    const result = enrichFindings({
      rawFindings: [mkRaw('cross-module-import-info', 'info')],
      baselineRules: baseline,
      projectRules: emptyProjectRules,
    })
    expect(result[0]!.reason.explanation).toBe('Cross-module import (informational): a → b.')
  })

  it('leaves unknown {key} placeholders unchanged (visible gap signal)', () => {
    const raw: RawFinding = {
      rule_id: 'high-fanout',
      raw_severity: 'warn',
      type: 'coupling',
      source: { module: 'x', file: '' },
      extras: { ce: 25 }, // threshold missing
    }
    const result = enrichFindings({ rawFindings: [raw], baselineRules: baseline, projectRules: emptyProjectRules })
    expect(result[0]!.reason.explanation).toMatch(/\{threshold\}/)
  })
})
