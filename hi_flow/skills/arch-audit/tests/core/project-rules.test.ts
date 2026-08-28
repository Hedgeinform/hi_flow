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
import { fixturePath } from '../test-paths.ts'
import type { D9Index } from '../../core/types.ts'
// readFile import already via destructuring above

const d9: D9Index = {
  principles: {
    'acyclic-dependencies': {
      id: 'acyclic-dependencies',
      name: 'acyclic-dependencies',
      description: 'No module cycles.',
      fix_alternatives: [],
    },
  },
  fix_alternatives: { 'acyclic-dependencies': [] },
}

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
    await copyFile(fixturePath('sample-rules.yaml'), join(dir, '.audit-rules.yaml'))
    const rules = await loadProjectRules(dir)
    expect(rules.forbidden).toHaveLength(1)
    expect(rules.forbidden[0]!.name).toBe('project:dispatcher-no-pipeline')
    expect(rules.overrides?.nccd_threshold).toBe(1.5)
    expect(rules.overrides?.baseline_disables?.[0]!.rule_id).toBe('baseline:no-orphans')
    await rm(dir, { recursive: true })
  })

  it('findRuleByName searches forbidden + required', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    await copyFile(fixturePath('sample-rules.yaml'), join(dir, '.audit-rules.yaml'))
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

  it('carries overrides.profile through load (frontend-slice-governance)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-'))
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      `forbidden: []\nrequired: []\noverrides:\n  profile: frontend\n  layer_aliases:\n    comm: data-access\n`,
      'utf-8',
    )
    const rules = await loadProjectRules(dir)
    expect(rules.overrides?.profile).toBe('frontend')
    expect(rules.overrides?.layer_aliases?.['comm']).toBe('data-access')
    await rm(dir, { recursive: true })
  })

  it('rejects a project rule whose principle is not a canonical D9 id', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-invalid-principle-'))
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      [
        'forbidden:',
        '  - name: project:bad-cycle',
        '    severity: HIGH',
        '    principle: acyclic-dependencies (ADP)',
        '    comment: No cycles.',
        'required: []',
        '',
      ].join('\n'),
      'utf-8',
    )

    await expect(loadProjectRules(dir, { d9 })).rejects.toThrow(/acyclic-dependencies \(ADP\).*canonical D9/i)
    await rm(dir, { recursive: true })
  })

  it('rejects a project rule with a blank explanation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-blank-comment-'))
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      [
        'forbidden:',
        '  - name: project:bad-cycle',
        '    severity: HIGH',
        '    principle: acyclic-dependencies',
        "    comment: ''",
        'required: []',
        '',
      ].join('\n'),
      'utf-8',
    )

    await expect(loadProjectRules(dir, { d9 })).rejects.toThrow(/comment.*non-empty/i)
    await rm(dir, { recursive: true })
  })

  it('normalizes the D11 description field into the finding explanation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-description-'))
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      [
        'forbidden: []',
        'required:',
        '  - name: required-domain',
        '    severity: HIGH',
        '    principle: acyclic-dependencies',
        '    description: Domain module must exist.',
        '',
      ].join('\n'),
      'utf-8',
    )

    const rules = await loadProjectRules(dir, { d9 })
    expect(rules.required[0]).toEqual(expect.objectContaining({
      name: 'project:required-domain',
      comment: 'Domain module must exist.',
    }))
    await rm(dir, { recursive: true })
  })

  it('synthesizes a non-blank explanation for a valid D11 forbidden rule without prose', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-fallback-comment-'))
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      [
        'forbidden:',
        '  - name: no-domain-to-api',
        '    severity: HIGH',
        '    principle: acyclic-dependencies',
        '    from: { path: "^src/domain/" }',
        '    to: { path: "^src/api/" }',
        'required: []',
        '',
      ].join('\n'),
      'utf-8',
    )

    const rules = await loadProjectRules(dir, { d9 })
    expect(rules.forbidden[0]!.comment).toMatch(/project:no-domain-to-api/)
    await rm(dir, { recursive: true })
  })
})
