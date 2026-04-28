import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { dirname, join, basename } from 'node:path'
import yaml from 'js-yaml'
import type { ProjectRules } from '../core/types.ts'

interface Args {
  patchPath: string
  projectRulesPath: string
  archiveDir: string
}

interface Result {
  success: boolean
  rules_added: number
  rules_updated: number
  archive_path: string
  error?: string
}

export async function mergeRulesPatch(args: Args): Promise<Result> {
  let patchYaml: string
  try {
    patchYaml = await readFile(args.patchPath, 'utf-8')
  } catch (e) {
    return { success: false, rules_added: 0, rules_updated: 0, archive_path: '', error: `cannot read patch: ${(e as Error).message}` }
  }
  const patch = yaml.load(patchYaml) as Partial<ProjectRules> | undefined

  let current: ProjectRules
  try {
    const existing = await readFile(args.projectRulesPath, 'utf-8')
    current = (yaml.load(existing) as ProjectRules) ?? { forbidden: [], required: [] }
  } catch {
    current = { forbidden: [], required: [] }
  }

  const merged: ProjectRules = {
    forbidden: [...current.forbidden, ...(patch?.forbidden ?? [])],
    required: [...current.required, ...(patch?.required ?? [])],
    overrides: { ...current.overrides, ...(patch?.overrides ?? {}) },
  }
  const rulesAdded = (patch?.forbidden?.length ?? 0) + (patch?.required?.length ?? 0)

  // Step 1: merge — write project rules
  try {
    await mkdir(dirname(args.projectRulesPath), { recursive: true })
    await writeFile(args.projectRulesPath, yaml.dump(merged, { lineWidth: 120, noRefs: true }), 'utf-8')
  } catch (e) {
    return { success: false, rules_added: 0, rules_updated: 0, archive_path: '', error: `write failed: ${(e as Error).message}` }
  }

  // Step 2: archive — only on merge success
  await mkdir(args.archiveDir, { recursive: true })
  const date = new Date().toISOString().slice(0, 10)
  const archivePath = join(args.archiveDir, `${date}-${basename(args.patchPath)}`)
  await rename(args.patchPath, archivePath)

  return {
    success: true,
    rules_added: rulesAdded,
    rules_updated: 0,
    archive_path: archivePath,
  }
}
