import { access, rm } from 'node:fs/promises'
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

  it('aggregates callback and cleanup errors in their original order', async () => {
    const { withTempDir } = await import('./test-paths.ts')
    const callbackError = new Error('callback error')
    const cleanupError = new Error('cleanup error')
    let failure: unknown

    try {
      await withTempDir('arch-audit-test-paths-', async () => {
        throw callbackError
      }, async directory => {
        await rm(directory, { recursive: true })
        throw cleanupError
      })
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(AggregateError)
    expect((failure as AggregateError).errors).toEqual([callbackError, cleanupError])
  })

  it('surfaces a cleanup error after a successful callback', async () => {
    const { withTempDir } = await import('./test-paths.ts')
    const cleanupError = new Error('cleanup error')

    await expect(withTempDir('arch-audit-test-paths-', async () => 'result', async directory => {
      await rm(directory, { recursive: true })
      throw cleanupError
    })).rejects.toBe(cleanupError)
  })
})
