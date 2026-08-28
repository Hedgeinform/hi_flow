import { readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

function physicalLoc(content: string): number {
  if (content.length === 0) return 0
  const normalized = content.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n').length
  return normalized.endsWith('\n') ? lines - 1 : lines
}

export async function countSourceLoc(
  projectRoot: string,
  sourceFilesByModule: Record<string, string[]>,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const [module, files] of Object.entries(sourceFilesByModule)) {
    let loc = 0
    for (const file of files) {
      const absolute = resolve(projectRoot, file)
      const projectRelative = relative(projectRoot, absolute)
      if (projectRelative.startsWith('..') || isAbsolute(projectRelative)) {
        throw new Error(`Audited source file resolves outside project root: '${file}'`)
      }
      try {
        loc += physicalLoc(await readFile(absolute, 'utf-8'))
      } catch (error) {
        throw new Error(
          `Cannot read audited source file '${file}' for LOC: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
    out[module] = loc
  }
  return out
}
