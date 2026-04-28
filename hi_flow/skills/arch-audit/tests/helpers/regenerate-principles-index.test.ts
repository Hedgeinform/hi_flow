import { describe, it, expect } from 'vitest'
import { mkdtemp, copyFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { regeneratePrinciplesIndex } from '../../helpers/regenerate-principles-index.ts'

describe('regenerate-principles-index', () => {
  it('writes JSON index next to source markdown', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rpi-'))
    const mdPath = join(dir, 'd9.md')
    await copyFile('tests/fixtures/d9-sample.md', mdPath)

    const result = await regeneratePrinciplesIndex({ principlesMdPath: mdPath })
    expect(result.regenerated_count).toBe(2)

    const jsonContent = JSON.parse(await readFile(join(dir, 'd9-index.json'), 'utf-8'))
    expect(jsonContent.principles['acyclic-dependencies']).toBeDefined()

    await rm(dir, { recursive: true })
  })
})
