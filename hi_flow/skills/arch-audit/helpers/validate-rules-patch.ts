import { readFile } from 'node:fs/promises'
import yaml from 'js-yaml'
import type { D9Index, ProjectRules, Rule, ValidationError } from '../core/types.ts'
import { normalizeProjectRule } from '../core/project-rules.ts'

interface Args {
  patchPath: string
  projectRules: ProjectRules
  d9Index: D9Index
}

interface Result {
  valid: boolean
  errors: ValidationError[]
  parsed_rules: Rule[]
}

const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])

export async function validateRulesPatch(args: Args): Promise<Result> {
  const errors: ValidationError[] = []
  let raw: string
  try {
    raw = await readFile(args.patchPath, 'utf-8')
  } catch (e) {
    errors.push({ message: `cannot read patch file: ${(e as Error).message}` })
    return { valid: false, errors, parsed_rules: [] }
  }

  let parsed: any
  try {
    parsed = yaml.load(raw)
  } catch (e) {
    errors.push({ message: `YAML parse error: ${(e as Error).message}` })
    return { valid: false, errors, parsed_rules: [] }
  }

  const rawForbidden = Array.isArray(parsed?.forbidden) ? parsed.forbidden : []
  const rawRequired = Array.isArray(parsed?.required) ? parsed.required : []
  if (parsed?.forbidden !== undefined && !Array.isArray(parsed.forbidden)) {
    errors.push({ field: 'forbidden', message: 'forbidden must be an array' })
  }
  if (parsed?.required !== undefined && !Array.isArray(parsed.required)) {
    errors.push({ field: 'required', message: 'required must be an array' })
  }
  const allRules: Rule[] = [...rawForbidden, ...rawRequired]
    .filter((rule): rule is Rule => Boolean(rule && typeof rule === 'object'))
    .map(normalizeProjectRule)
  const existingNames = new Set(
    [...args.projectRules.forbidden, ...args.projectRules.required]
      .map(normalizeProjectRule)
      .map(rule => rule.name),
  )
  const patchNames = new Set<string>()

  for (const rule of allRules) {
    if (!rule.name) errors.push({ rule_name: '?', field: 'name', message: 'rule.name is required' })
    if (!VALID_SEVERITIES.has(rule.severity)) {
      errors.push({ rule_name: rule.name, field: 'severity', message: `invalid severity '${rule.severity}'` })
    }
    if (!rule.principle) {
      errors.push({ rule_name: rule.name, field: 'principle', message: 'rule.principle is required (D9 reference)' })
    } else if (!args.d9Index.principles[rule.principle]) {
      const closest = Object.keys(args.d9Index.principles).slice(0, 3).join(', ')
      errors.push({
        rule_name: rule.name,
        field: 'principle',
        message: `principle '${rule.principle}' not found in D9 library`,
        suggestion: `Closest D9 ids: ${closest}`,
      })
    }
    if (existingNames.has(rule.name)) {
      errors.push({ rule_name: rule.name, field: 'name', message: `rule name '${rule.name}' already exists in project rules (collision)` })
    }
    if (patchNames.has(rule.name)) {
      errors.push({ rule_name: rule.name, field: 'name', message: `duplicate normalized rule name '${rule.name}' inside patch` })
    }
    patchNames.add(rule.name)
    for (const f of ['from', 'to'] as const) {
      const path = (rule as any)[f]?.path
      if (path) {
        try {
          new RegExp(path)
        } catch (e) {
          errors.push({ rule_name: rule.name, field: `${f}.path`, message: `invalid regex: ${(e as Error).message}` })
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, parsed_rules: allRules }
}
