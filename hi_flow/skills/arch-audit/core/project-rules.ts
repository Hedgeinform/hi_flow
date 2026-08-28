import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import yaml from 'js-yaml'
import type { D9Index, ProjectRules, Rule, Severity } from './types.ts'

export const PROJECT_RULES_FILENAME = '.audit-rules.yaml'

function emptyRules(): ProjectRules {
  return { forbidden: [], required: [] }
}

export function normalizeProjectRule(r: Rule): Rule {
  const rawName = typeof r.name === 'string' ? r.name : ''
  const name = rawName.startsWith('project:') || rawName.startsWith('baseline:')
    ? rawName
    : `project:${rawName}`
  if (r.comment !== undefined) return { ...r, name }
  const description = typeof r.description === 'string' ? r.description.trim() : ''
  const fallback = r.from || r.to
    ? `Project rule '${name}' matched ${r.from?.path ?? '<any source>'} -> ${r.to?.path ?? '<any target>'}.`
    : `Project rule '${name}' was triggered.`
  return {
    ...r,
    name,
    comment: description || fallback,
  }
}

interface LoadProjectRulesOptions {
  d9?: D9Index
}

const SEVERITIES = new Set<Severity>(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])

function validateRules(rules: ProjectRules, d9: D9Index): string[] {
  const errors: string[] = []
  for (const rule of [...rules.forbidden, ...rules.required]) {
    if (!/^project:[a-z0-9][a-z0-9-]*$/.test(rule.name)) {
      errors.push(`rule '${rule.name}': name must use project:<kebab-case-id>`)
    }
    if (!SEVERITIES.has(rule.severity)) {
      errors.push(`rule '${rule.name}': severity must be CRITICAL, HIGH, MEDIUM, or LOW`)
    }
    if (!d9.principles[rule.principle]) {
      errors.push(`rule '${rule.name}': principle '${rule.principle}' is not a canonical D9 id`)
    }
    if (typeof rule.comment !== 'string' || rule.comment.trim().length === 0) {
      errors.push(`rule '${rule.name}': comment must be non-empty because it becomes finding.reason.explanation`)
    }
  }
  return errors
}

export async function loadProjectRules(
  projectRoot: string,
  options: LoadProjectRulesOptions = {},
): Promise<ProjectRules> {
  const path = join(projectRoot, PROJECT_RULES_FILENAME)
  try {
    await access(path)
  } catch {
    return emptyRules()
  }
  const raw = await readFile(path, 'utf-8')
  const parsed = yaml.load(raw) as Partial<ProjectRules> | null | undefined
  if (!parsed || typeof parsed !== 'object') return emptyRules()
  const rules = {
    forbidden: (parsed.forbidden ?? []).map(normalizeProjectRule),
    required: (parsed.required ?? []).map(normalizeProjectRule),
    overrides: parsed.overrides,
  }
  if (options.d9) {
    const errors = validateRules(rules, options.d9)
    if (errors.length > 0) {
      throw new Error(`Invalid ${PROJECT_RULES_FILENAME}:\n${errors.map(error => `  - ${error}`).join('\n')}`)
    }
  }
  return rules
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
