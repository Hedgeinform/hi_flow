import { describe, it, expect } from 'vitest'
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  loadProjectRules,
  writeProjectRules,
  findRuleByName,
  addRules,
} from '../../core/project-rules.ts'
import { copyFile } from 'node:fs/promises'
// readFile import already via destructuring above

describe('project-rules', () => {
  it('returns empty rules when file absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    const rules = await loadProjectRules(dir)
    expect(rules.forbidden).toEqual([])
    expect(rules.required).toEqual([])
    await rm(dir, { recursive: true })
  })

  it('loads forbidden rules and overrides from fixture', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    await copyFile('tests/fixtures/sample-rules.yaml', join(dir, '.audit-rules.yaml'))
    const rules = await loadProjectRules(dir)
    expect(rules.forbidden).toHaveLength(1)
    expect(rules.forbidden[0]!.name).toBe('project:dispatcher-no-pipeline')
    expect(rules.overrides?.nccd_threshold).toBe(1.5)
    expect(rules.overrides?.baseline_disables?.[0]!.rule_id).toBe('baseline:no-orphans')
    await rm(dir, { recursive: true })
  })

  it('findRuleByName searches forbidden + required', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    await copyFile('tests/fixtures/sample-rules.yaml', join(dir, '.audit-rules.yaml'))
    const rules = await loadProjectRules(dir)
    const found = findRuleByName(rules, 'project:dispatcher-no-pipeline')
    expect(found?.severity).toBe('HIGH')
    expect(findRuleByName(rules, 'nonexistent')).toBeNull()
    await rm(dir, { recursive: true })
  })

  it('addRules + writeProjectRules round-trip', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    const initial = { forbidden: [], required: [] }
    const updated = addRules(initial, [
      { name: 'project:test', severity: 'LOW', principle: 'test-principle' },
    ])
    await writeProjectRules(dir, updated)
    const reloaded = await loadProjectRules(dir)
    expect(reloaded.forbidden).toHaveLength(1)
    expect(reloaded.forbidden[0]!.name).toBe('project:test')
    await rm(dir, { recursive: true })
  })

  it('prepends project: prefix to rule names lacking it on load', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-'))
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      `forbidden:\n  - name: legacy-rule\n    severity: HIGH\n    principle: p1\nrequired: []\n`,
      'utf-8',
    )
    const rules = await loadProjectRules(dir)
    expect(rules.forbidden[0]!.name).toBe('project:legacy-rule')
    await rm(dir, { recursive: true })
  })

  it('preserves existing project: prefix', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-'))
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      `forbidden:\n  - name: project:already-prefixed\n    severity: HIGH\n    principle: p1\nrequired: []\n`,
      'utf-8',
    )
    const rules = await loadProjectRules(dir)
    expect(rules.forbidden[0]!.name).toBe('project:already-prefixed')
    await rm(dir, { recursive: true })
  })
})
