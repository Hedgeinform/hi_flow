import { describe, it, expect } from 'vitest'
import { mkdtemp, copyFile, mkdir, access, readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { mergeRulesPatch } from '../../helpers/merge-rules-patch.ts'

describe('merge-rules-patch', () => {
  it('merges patch into project rules and archives the patch', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mp-'))
    const patchPath = join(dir, 'patch.yaml')
    await copyFile('tests/fixtures/sample-patch.yaml', patchPath)
    const archiveDir = join(dir, 'archive')
    const projectRulesPath = join(dir, '.audit-rules.yaml')

    const r = await mergeRulesPatch({ patchPath, projectRulesPath, archiveDir })

    expect(r.success).toBe(true)
    expect(r.rules_added).toBeGreaterThan(0)
    expect(r.archive_path).toContain('archive')

    // Patch is now at archive_path, original location no longer exists
    await expect(access(patchPath)).rejects.toThrow()
    await access(r.archive_path)

    // Project rules file contains the merged rule
    const merged = await readFile(projectRulesPath, 'utf-8')
    expect(merged).toMatch(/dispatcher-no-pipeline/)
  })

  it('returns success: false on write failure (patch stays in place)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mp-'))
    const patchPath = join(dir, 'patch.yaml')
    await copyFile('tests/fixtures/sample-patch.yaml', patchPath)
    // Use a path that cannot be written: point at an existing directory as the rules file
    const projectRulesPath = join(dir, 'subdir-that-is-a-dir', '.audit-rules.yaml')
    // Create the parent as a file (not dir) so mkdir recursive fails or writeFile fails
    const { writeFile: wf } = await import('node:fs/promises')
    await wf(join(dir, 'subdir-that-is-a-dir'), 'I am a file, not a dir')
    const archiveDir = join(dir, 'archive')

    const r = await mergeRulesPatch({ patchPath, projectRulesPath, archiveDir })
    expect(r.success).toBe(false)
    // Patch remains at original location
    await access(patchPath)
  })
})
