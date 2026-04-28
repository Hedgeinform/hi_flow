import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BaselineRule, ProjectRules, Severity } from '../core/types.ts'

interface Args {
  baselineRules: BaselineRule[]
  projectRules: ProjectRules
  projectRoot: string
}

const DEPCRUISE_SEV: Record<Severity, 'error' | 'warn' | 'info'> = {
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warn',
  LOW: 'info',
}

function baselineToDepcruise(rule: BaselineRule) {
  if (rule.name === 'no-circular') {
    return { name: rule.id, severity: DEPCRUISE_SEV[rule.severity], comment: rule.explanation, from: {}, to: { circular: true } }
  }
  if (rule.name === 'no-orphans') {
    return { name: rule.id, severity: DEPCRUISE_SEV[rule.severity], comment: rule.explanation, from: { orphan: true, pathNot: ['(^|/)\\.[^/]+\\.(js|ts)$'] }, to: {} }
  }
  if (rule.name === 'not-to-test-from-prod') {
    return {
      name: rule.id,
      severity: DEPCRUISE_SEV[rule.severity],
      comment: rule.explanation,
      from: { pathNot: '\\.(spec|test)\\.(js|ts)x?$' },
      to: { path: '\\.(spec|test)\\.(js|ts)x?$' },
    }
  }
  return null
}

export async function generateDepcruiseConfig(args: Args): Promise<string> {
  const { baselineRules, projectRules } = args

  const forbidden: any[] = []
  for (const r of baselineRules) {
    const d = baselineToDepcruise(r)
    if (d) forbidden.push(d)
  }
  for (const r of projectRules.forbidden) {
    forbidden.push({
      name: r.name,
      severity: DEPCRUISE_SEV[r.severity],
      comment: r.comment ?? '',
      from: r.from ?? {},
      to: r.to ?? {},
    })
  }

  const required: any[] = []
  for (const r of projectRules.required) {
    required.push({
      name: r.name,
      severity: DEPCRUISE_SEV[r.severity],
      comment: r.comment ?? '',
      module: r.from ?? {},
      to: r.to ?? {},
    })
  }

  const config = {
    forbidden,
    required,
    options: {
      doNotFollow: { path: 'node_modules' },
      tsConfig: { fileName: 'tsconfig.json' },
      // Required for type-only files and `import type` resolution. Without this,
      // depcruise cannot follow the import graph through type-only barrels
      // (common pattern: `src/types/*.ts` re-exporting interfaces, or modules
      // importing only type aliases). Such files end up flagged as
      // `invalid module` in metadata.parsing_errors.
      tsPreCompilationDeps: true,
      enhancedResolveOptions: {
        exportsFields: ['exports'],
        conditionNames: ['import', 'require', 'node', 'default'],
        // Required for projects using `allowImportingTsExtensions: true` in
        // tsconfig — they import with explicit `.ts` extensions (e.g.
        // `import { x } from './foo.ts'`). Without `.ts` in extensions,
        // depcruise's resolver fails on these imports and marks the importing
        // module invalid.
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      },
    },
  }

  const out = `module.exports = ${JSON.stringify(config, null, 2)}\n`
  const path = join(tmpdir(), `dependency-cruiser-${Date.now()}-${Math.random().toString(36).slice(2)}.cjs`)
  await writeFile(path, out, 'utf-8')
  return path
}
