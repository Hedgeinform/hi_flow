import { join } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))
export const packagePath = (...segments: string[]): string => join(PACKAGE_ROOT, ...segments)
export const fixturePath = (...segments: string[]): string => packagePath('tests', 'fixtures', ...segments)

type TempDirCleanup = (directory: string) => Promise<void>

const removeTempDir: TempDirCleanup = directory => rm(directory, { recursive: true })

export async function withTempDir<T>(
  prefix: string,
  fn: (directory: string) => Promise<T>,
  cleanup: TempDirCleanup = removeTempDir,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  let callbackFailed = false
  let callbackError: unknown
  let result: T

  try {
    result = await fn(directory)
  } catch (error) {
    callbackFailed = true
    callbackError = error
  }

  try {
    await cleanup(directory)
  } catch (cleanupError) {
    if (callbackFailed) {
      throw new AggregateError([callbackError, cleanupError], 'Temporary directory callback and cleanup failed')
    }
    throw cleanupError
  }

  if (callbackFailed) {
    throw callbackError
  }

  return result!
}
