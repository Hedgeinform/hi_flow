import { describe, it, expect } from 'vitest'
import { validateRulesPatch } from '../../helpers/validate-rules-patch.ts'
import type { D9Index, ProjectRules } from '../../core/types.ts'
import { fixturePath } from '../test-paths.ts'

const d9: D9Index = {
  principles: { 'layered-architecture-respect': { id: 'layered-architecture-respect', name: 'l-a-r', description: '', fix_alternatives: [] } },
  fix_alternatives: { 'layered-architecture-respect': [] },
}
const emptyRules: ProjectRules = { forbidden: [], required: [] }

describe('validate-rules-patch', () => {
  it('passes valid patch', async () => {
    const r = await validateRulesPatch({ patchPath: fixturePath('sample-patch.yaml'), projectRules: emptyRules, d9Index: d9 })
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.parsed_rules).toHaveLength(1)
  })

  it('rejects unknown principle', async () => {
    const d9NoPrinciple: D9Index = { principles: {}, fix_alternatives: {} }
    const r = await validateRulesPatch({ patchPath: fixturePath('sample-patch.yaml'), projectRules: emptyRules, d9Index: d9NoPrinciple })
    expect(r.valid).toBe(false)
    expect(r.errors[0]!.message).toMatch(/principle/i)
  })

  it('rejects name collision with existing project rule', async () => {
    const collidingRules: ProjectRules = {
      forbidden: [{ name: 'project:dispatcher-no-pipeline', severity: 'LOW', principle: 'layered-architecture-respect' }],
      required: [],
    }
    const r = await validateRulesPatch({ patchPath: fixturePath('sample-patch.yaml'), projectRules: collidingRules, d9Index: d9 })
    expect(r.valid).toBe(false)
    expect(r.errors[0]!.message).toMatch(/uniqueness|collision|exists/i)
  })

  it('rejects a legacy unprefixed name that collides after namespace normalization', async () => {
    const collidingRules: ProjectRules = {
      forbidden: [{ name: 'project:dispatcher-no-pipeline', severity: 'LOW', principle: 'layered-architecture-respect' }],
      required: [],
    }
    const r = await validateRulesPatch({
      patchPath: fixturePath('sample-patch-legacy-name.yaml'),
      projectRules: collidingRules,
      d9Index: d9,
    })
    expect(r.valid).toBe(false)
    expect(r.errors[0]!.message).toMatch(/collision|exists/i)
  })

  it('rejects duplicate prefixed and legacy names inside one patch', async () => {
    const r = await validateRulesPatch({
      patchPath: fixturePath('sample-patch-duplicate-normalized.yaml'),
      projectRules: emptyRules,
      d9Index: d9,
    })
    expect(r.valid).toBe(false)
    expect(r.errors.some(error => /duplicate|collision/i.test(error.message))).toBe(true)
  })

  it('returns structured result on parse failure (does not throw)', async () => {
    const r = await validateRulesPatch({ patchPath: fixturePath('nonexistent.yaml'), projectRules: emptyRules, d9Index: d9 })
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })
})
