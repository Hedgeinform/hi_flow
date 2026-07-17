import { join } from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))
export const packagePath = (...segments: string[]): string => join(PACKAGE_ROOT, ...segments)
export const fixturePath = (...segments: string[]): string => packagePath('tests', 'fixtures', ...segments)

export async function withTempDir<T>(prefix: string, fn: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  try {
    return await fn(directory)
  } finally {
    await rm(directory, { recursive: true })
  }
}
