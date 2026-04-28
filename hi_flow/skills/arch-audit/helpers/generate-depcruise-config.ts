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
      enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
      reporterOptions: { json: { showTitle: false } },
    },
  }

  const out = `module.exports = ${JSON.stringify(config, null, 2)}\n`
  const path = join(tmpdir(), `dependency-cruiser-${Date.now()}-${Math.random().toString(36).slice(2)}.cjs`)
  await writeFile(path, out, 'utf-8')
  return path
}
