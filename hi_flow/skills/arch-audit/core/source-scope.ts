import { access, readdir } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

export interface SourceModuleInfo {
  name: string
  path: string
}

export const SUPPORTED_SOURCE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'] as const
const SUPPORTED_SOURCE_EXTENSION_SET = new Set<string>(SUPPORTED_SOURCE_EXTENSIONS)

export function normalizeModuleRoot(modulePattern: string): string {
  const raw = modulePattern.trim()
  if (!raw || isAbsolute(raw) || /^[A-Za-z]:[\\/]/.test(raw) || /^\\\\/.test(raw)) {
    throw new Error(`overrides.module_pattern must be a relative module root, got '${modulePattern}'.`)
  }

  let normalized = raw.replace(/\\/g, '/')
  while (normalized.startsWith('./')) normalized = normalized.slice(2)
  normalized = normalized.replace(/\/\*\/?$/, '').replace(/\/+$/, '')

  const segments = normalized.split('/')
  const hasUnsafeSegment = segments.some(segment => !segment || segment === '.' || segment === '..')
  if (!normalized || hasUnsafeSegment || /[*?\[\]{}()]/.test(normalized)) {
    throw new Error(
      `overrides.module_pattern must name one relative module root without traversal or globs, got '${modulePattern}'.`,
    )
  }
  return normalized
}

export function buildSourceScanGlob(moduleRoot: string): string {
  return `${normalizeModuleRoot(moduleRoot)}/**/*.{${SUPPORTED_SOURCE_EXTENSIONS.join(',')}}`
}

export function fileToModule(filePath: string, moduleRoot: string): string | null {
  if (!filePath) return null
  const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '')
  if (normalizedPath.startsWith('node_modules/') || normalizedPath.includes('/node_modules/')) return null
  if (/^[a-z]+:/.test(normalizedPath)) return null

  const normalizedRoot = normalizeModuleRoot(moduleRoot)
  const prefix = `${normalizedRoot}/`
  if (!normalizedPath.startsWith(prefix)) return null
  const relativeParts = normalizedPath.slice(prefix.length).split('/')
  if (relativeParts.length < 2 || !relativeParts[0]) return null
  return relativeParts[0]
}

async function containsProductionSource(directory: string): Promise<boolean> {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name.startsWith('.')) continue
      if (await containsProductionSource(join(directory, entry.name))) return true
      continue
    }
    if (!entry.isFile()) continue
    const extension = entry.name.split('.').pop()?.toLowerCase()
    if (!extension || !SUPPORTED_SOURCE_EXTENSION_SET.has(extension)) {
      continue
    }
    if (/\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(entry.name)) continue
    return true
  }
  return false
}

export async function discoverProductionModules(
  projectRoot: string,
  moduleRoot: string,
): Promise<SourceModuleInfo[]> {
  const normalizedRoot = normalizeModuleRoot(moduleRoot)
  const rootPath = join(projectRoot, ...normalizedRoot.split('/'))
  try {
    await access(rootPath)
  } catch {
    throw new Error(
      `Module root '${normalizedRoot}/' does not exist in '${projectRoot}'. ` +
      'Set overrides.module_pattern to an existing production module root.',
    )
  }

  const entries = await readdir(rootPath, { withFileTypes: true })
  const modules: SourceModuleInfo[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const modulePath = join(rootPath, entry.name)
    if (await containsProductionSource(modulePath)) {
      modules.push({ name: entry.name, path: modulePath })
    }
  }
  modules.sort((left, right) => left.name.localeCompare(right.name))

  if (modules.length === 0) {
    throw new Error(
      `Module root '${normalizedRoot}' contains no production modules with supported source files ` +
      `(.${SUPPORTED_SOURCE_EXTENSIONS.join(', .')}).`,
    )
  }
  return modules
}
