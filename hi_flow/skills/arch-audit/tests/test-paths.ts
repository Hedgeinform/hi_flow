import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))
export const packagePath = (...segments: string[]): string => join(PACKAGE_ROOT, ...segments)
export const fixturePath = (...segments: string[]): string => packagePath('tests', 'fixtures', ...segments)
