import { access } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('withTempDir', () => {
  it('removes its temporary directory when the callback throws', async () => {
    const { withTempDir } = await import('./test-paths.ts')
    const sentinel = new Error('callback sentinel')
    let directory: string | undefined

    await expect(withTempDir('arch-audit-test-paths-', async temporaryDirectory => {
      directory = temporaryDirectory
      throw sentinel
    })).rejects.toBe(sentinel)

    expect(directory).toBeDefined()
    await expect(access(directory!)).rejects.toThrow()
  })
})
