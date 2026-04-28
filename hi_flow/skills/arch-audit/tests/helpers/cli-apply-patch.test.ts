import { describe, it, expect } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, access, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import yaml from 'js-yaml'
import { applyPatch } from '../../helpers/cli-apply-patch.ts'

describe('cli-apply-patch', () => {
  it('validates + merges patch into .audit-rules.yaml + archives the patch', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'apply-'))
    const patchPath = join(dir, 'sample-patch.yaml')
    await writeFile(patchPath, yaml.dump({
      forbidden: [
        {
          name: 'project:no-cross-feature',
          severity: 'HIGH',
          principle: 'vertical-slice-cohesion',
          comment: 'features must not import each other',
          from: { path: '^src/features/(?!common)([^/]+)/' },
          to: { path: '^src/features/(?!common)(?!\\1)([^/]+)/' },
        },
      ],
    }), 'utf-8')

    const result = await applyPatch(patchPath, dir)

    expect(result.success).toBe(true)
    expect(result.rules_added).toBe(1)
    // Archive moved
    await expect(access(patchPath)).rejects.toBeTruthy()
    await expect(access(result.archive_path)).resolves.toBeUndefined()
    // Project rules created with the new rule
    const rules = yaml.load(await readFile(join(dir, '.audit-rules.yaml'), 'utf-8')) as any
    expect(rules.forbidden).toHaveLength(1)
    expect(rules.forbidden[0].name).toBe('project:no-cross-feature')

    await rm(dir, { recursive: true })
  })

  it('hard-fails on validation error (unknown D9 principle)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'apply-bad-'))
    const patchPath = join(dir, 'bad-patch.yaml')
    await writeFile(patchPath, yaml.dump({
      forbidden: [
        { name: 'project:bogus', severity: 'HIGH', principle: 'this-principle-does-not-exist' },
      ],
    }), 'utf-8')

    await expect(applyPatch(patchPath, dir)).rejects.toThrow(/this-principle-does-not-exist/)
    // On hard fail: patch NOT moved, rules file NOT created
    await access(patchPath) // still there
    await expect(access(join(dir, '.audit-rules.yaml'))).rejects.toBeTruthy()

    await rm(dir, { recursive: true })
  })
})
