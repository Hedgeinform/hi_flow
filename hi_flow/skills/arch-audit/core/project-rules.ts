import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import yaml from 'js-yaml'
import type { ProjectRules, Rule } from './types.ts'

export const PROJECT_RULES_FILENAME = '.audit-rules.yaml'

function emptyRules(): ProjectRules {
  return { forbidden: [], required: [] }
}

function normalizeName(r: Rule): Rule {
  if (r.name.startsWith('project:') || r.name.startsWith('baseline:')) return r
  return { ...r, name: `project:${r.name}` }
}

export async function loadProjectRules(projectRoot: string): Promise<ProjectRules> {
  const path = join(projectRoot, PROJECT_RULES_FILENAME)
  try {
    await access(path)
  } catch {
    return emptyRules()
  }
  const raw = await readFile(path, 'utf-8')
  const parsed = yaml.load(raw) as Partial<ProjectRules> | null | undefined
  if (!parsed || typeof parsed !== 'object') return emptyRules()
  return {
    forbidden: (parsed.forbidden ?? []).map(normalizeName),
    required: (parsed.required ?? []).map(normalizeName),
    overrides: parsed.overrides,
  }
}

export async function writeProjectRules(projectRoot: string, rules: ProjectRules): Promise<void> {
  const path = join(projectRoot, PROJECT_RULES_FILENAME)
  const yamlString = yaml.dump(rules, { lineWidth: 120, noRefs: true })
  await writeFile(path, yamlString, 'utf-8')
}

export function findRuleByName(rules: ProjectRules, name: string): Rule | null {
  return [...rules.forbidden, ...rules.required].find(r => r.name === name) ?? null
}

export function addRules(rules: ProjectRules, newRules: Rule[]): ProjectRules {
  return {
    ...rules,
    forbidden: [...rules.forbidden, ...newRules],
    required: [...rules.required],
  }
}
