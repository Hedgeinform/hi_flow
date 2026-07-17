import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildSourceScanGlob,
  discoverProductionModules,
  fileToModule,
  normalizeModuleRoot,
} from '../../core/source-scope.ts'

describe('source scope', () => {
  it('normalizes a root and legacy trailing module wildcard', () => {
    expect(normalizeModuleRoot('pipeline-runtime')).toBe('pipeline-runtime')
    expect(normalizeModuleRoot('./packages/runtime/*/')).toBe('packages/runtime')
  })

  it.each(['', '../runtime', 'C:\\runtime', '/runtime', 'pipeline-*', '@(pipeline-runtime)', '!(tests)'])(
    'rejects unsafe or ambiguous module root %j',
    value => {
      expect(() => normalizeModuleRoot(value)).toThrow(/module_pattern/)
    },
  )

  it('derives one scan glob for all supported extensions', () => {
    expect(buildSourceScanGlob('pipeline-runtime'))
      .toBe('pipeline-runtime/**/*.{ts,tsx,js,jsx,mjs,cjs}')
  })

  it('maps a file only when the complete nested root prefix matches', () => {
    expect(fileToModule('packages/runtime/a/index.mjs', 'packages/runtime')).toBe('a')
    expect(fileToModule('other/packages/runtime/a/index.mjs', 'packages/runtime')).toBeNull()
    expect(fileToModule('packages/runtime/index.mjs', 'packages/runtime')).toBeNull()
  })

  it('discovers only top-level directories containing production source files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'source-scope-'))
    await mkdir(join(dir, 'pipeline-runtime/a'), { recursive: true })
    await mkdir(join(dir, 'pipeline-runtime/docs'), { recursive: true })
    await writeFile(join(dir, 'pipeline-runtime/a/index.mjs'), 'export const a = 1\n')
    await writeFile(join(dir, 'pipeline-runtime/docs/README.md'), 'docs\n')

    const modules = await discoverProductionModules(dir, 'pipeline-runtime')
    expect(modules.map(module => module.name)).toEqual(['a'])
    await rm(dir, { recursive: true })
  })

  it('fails closed when the root exists but has no production modules', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'source-scope-empty-'))
    await mkdir(join(dir, 'pipeline-runtime/a'), { recursive: true })
    await writeFile(join(dir, 'pipeline-runtime/a/README.md'), 'docs\n')

    await expect(discoverProductionModules(dir, 'pipeline-runtime'))
      .rejects.toThrow(/no production modules/i)
    await rm(dir, { recursive: true })
  })
})
