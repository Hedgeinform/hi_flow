import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import type { RawFinding } from '../core/types.ts'

interface DetectBarrelsArgs {
  projectPath: string
  modulesList: string[]
  barrelImports: { from: string; to: string; targetFile: string }[]
  threshold?: number
}

const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx']

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

function classifyStatements(src: string): { reexports: number; valueDecls: number; otherStatements: number } {
  const stripped = stripComments(src)
  const rawStatements = stripped
    .split(/[\n;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  let reexports = 0
  let valueDecls = 0
  let otherStatements = 0

  for (const s of rawStatements) {
    if (/^import\s/.test(s)) continue
    if (/^export\s+(\*|\{[^}]*\}|type\s+\{?[^}]*\}?)\s+from\s+['"]/.test(s)) {
      reexports++
      continue
    }
    if (/^export\s+(function|class|const|let|var)\s/.test(s) || /^(function|class|const|let|var)\s/.test(s)) {
      valueDecls++
      continue
    }
    if (/^export\s+(type|interface|enum)\s/.test(s) || /^(type|interface|enum)\s/.test(s)) {
      reexports++
      continue
    }
    otherStatements++
  }

  return { reexports, valueDecls, otherStatements }
}

function isBarrelContent(src: string, threshold: number): boolean {
  const { reexports, valueDecls, otherStatements } = classifyStatements(src)
  if (valueDecls > 0) return false
  const total = reexports + otherStatements
  if (total === 0) return false
  return reexports / total >= threshold
}

async function findIndexFile(modulePath: string): Promise<string | null> {
  for (const filename of INDEX_FILES) {
    const candidate = join(modulePath, filename)
    try {
      await access(candidate)
      return candidate
    } catch {}
  }
  return null
}

export async function detectBarrels(args: DetectBarrelsArgs): Promise<RawFinding[]> {
  const threshold = args.threshold ?? 0.8
  const findings: RawFinding[] = []

  for (const moduleName of args.modulesList) {
    const modulePath = join(args.projectPath, 'src', moduleName)
    const indexPath = await findIndexFile(modulePath)
    if (!indexPath) continue

    const content = await readFile(indexPath, 'utf-8')
    if (!isBarrelContent(content, threshold)) continue

    const importers = args.barrelImports
      .filter(e => e.to === moduleName && e.from !== moduleName)
      .map(e => e.from)

    if (importers.length === 0) continue

    const indexRelative = indexPath
      .replace(args.projectPath + '/', '')
      .replace(args.projectPath + '\\', '')
      .replace(/\\/g, '/')

    for (const importer of importers) {
      findings.push({
        rule_id: 'barrel-file',
        raw_severity: 'warn',
        type: 'boundary',
        source: { module: importer, file: '' },
        target: { module: moduleName, file: indexRelative },
        extras: {
          barrel_file: indexRelative,
          importing_modules: importers,
        },
      })
    }
  }

  return findings
}
