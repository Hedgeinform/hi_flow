import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import type { D8AuditReport, Severity, SeverityCounts } from './types.ts'
import { canonicalCycleKey } from './cycle-key.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SCHEMA_PATH = join(__dirname, '..', 'references', 'd8-schema.json')
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'))

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validate = ajv.compile(schema)

export interface ValidationResult {
  valid: boolean
  errors: { path: string; message: string; keyword: string }[]
}

export interface D8ValidationContext {
  canonicalPrincipleIds?: ReadonlySet<string>
  knownRuleIds?: ReadonlySet<string>
}

function formatErrors(errors: ErrorObject[] | null | undefined): { path: string; message: string; keyword: string }[] {
  if (!errors) return []
  return errors.map(e => ({ path: e.instancePath || '/', message: e.message ?? 'unknown', keyword: e.keyword }))
}

function semanticError(path: string, message: string): ValidationResult['errors'][number] {
  return { path, message, keyword: 'semantic' }
}

function validateSemantics(report: D8AuditReport, context: D8ValidationContext): ValidationResult['errors'] {
  const errors: ValidationResult['errors'] = []
  const graphModules = Object.keys(report.metrics.dep_graph)
  const metricModules = Object.keys(report.metrics.per_module)
  const graphSet = new Set(graphModules)
  const metricSet = new Set(metricModules)

  if (graphModules.length > 0) {
    const totalLoc = Object.values(report.metrics.per_module).reduce((sum, metrics) => sum + metrics.LOC, 0)
    if (totalLoc === 0) {
      errors.push(semanticError('/metrics/per_module', 'non-empty dependency graph must have non-zero total LOC'))
    }
  }

  for (const module of graphModules) {
    if (!metricSet.has(module)) {
      errors.push(semanticError('/metrics/per_module', `module '${module}' is present in dep_graph but missing from per_module`))
    }
  }
  for (const module of metricModules) {
    if (!graphSet.has(module)) {
      errors.push(semanticError(`/metrics/per_module/${module}`, `module '${module}' is missing from dep_graph`))
    }
  }

  for (const module of graphModules) {
    const metrics = report.metrics.per_module[module]
    if (!metrics) continue
    const dependencies = report.metrics.dep_graph[module] ?? []
    const expectedCe = dependencies.length
    const expectedCa = graphModules.filter(source => report.metrics.dep_graph[source]?.includes(module)).length
    const expectedI = expectedCa + expectedCe === 0 ? 0 : expectedCe / (expectedCa + expectedCe)
    if (metrics.Ce !== expectedCe) {
      errors.push(semanticError(`/metrics/per_module/${module}/Ce`, `expected ${expectedCe} from dep_graph, got ${metrics.Ce}`))
    }
    if (metrics.Ca !== expectedCa) {
      errors.push(semanticError(`/metrics/per_module/${module}/Ca`, `expected ${expectedCa} from dep_graph, got ${metrics.Ca}`))
    }
    if (Math.abs(metrics.I - expectedI) > 0.001) {
      errors.push(semanticError(`/metrics/per_module/${module}/I`, `expected ${expectedI.toFixed(3)} from Ca/Ce, got ${metrics.I}`))
    }
  }

  const actualCounts: SeverityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  const cycleOwners = new Map<string, number>()
  for (const [index, finding] of report.findings.entries()) {
    const basePath = `/findings/${index}`
    const isExternalBoundary = finding.type === 'boundary' && finding.extras?.external_target === true
    const isProjectNccd = finding.type === 'nccd' && finding.rule_id === 'baseline:nccd-breach'
    actualCounts[finding.severity]++
    if (!/^(baseline|project):[a-z0-9][a-z0-9-]*$/.test(finding.rule_id)) {
      errors.push(semanticError(`${basePath}/rule_id`, `rule_id '${finding.rule_id}' must be namespaced and kebab-case`))
    } else if (context.knownRuleIds && !context.knownRuleIds.has(finding.rule_id)) {
      errors.push(semanticError(`${basePath}/rule_id`, `rule_id '${finding.rule_id}' is not present in baseline or project rules`))
    }
    if (!/^[a-z][a-z0-9-]*$/.test(finding.reason.principle)) {
      errors.push(semanticError(`${basePath}/reason/principle`, `principle '${finding.reason.principle}' is not a canonical D9 id`))
    } else if (context.canonicalPrincipleIds && !context.canonicalPrincipleIds.has(finding.reason.principle)) {
      errors.push(semanticError(`${basePath}/reason/principle`, `principle '${finding.reason.principle}' is absent from D9`))
    }
    if (finding.reason.explanation.trim().length === 0) {
      errors.push(semanticError(`${basePath}/reason/explanation`, 'explanation must be non-empty'))
    }
    if (finding.source.module === '<project>' && !isProjectNccd) {
      errors.push(semanticError(
        `${basePath}/source/module`,
        "source module '<project>' is reserved for baseline:nccd-breach",
      ))
    } else if (isProjectNccd && finding.source.module !== '<project>') {
      errors.push(semanticError(`${basePath}/source/module`, "baseline:nccd-breach must use source module '<project>'"))
    } else if (finding.source.module !== '<project>' && !graphSet.has(finding.source.module)) {
      errors.push(semanticError(`${basePath}/source/module`, `module '${finding.source.module}' is absent from dep_graph`))
    }
    if (finding.target && !graphSet.has(finding.target.module) && !isExternalBoundary) {
      errors.push(semanticError(`${basePath}/target/module`, `module '${finding.target.module}' is absent from dep_graph`))
    }
    if (finding.type === 'boundary') {
      if (!finding.target) {
        errors.push(semanticError(`${basePath}/target`, 'boundary finding must identify a target'))
      } else if (isExternalBoundary) {
        if (graphSet.has(finding.target.module)) {
          errors.push(semanticError(`${basePath}/extras/external_target`, 'external boundary target must not be an internal graph module'))
        }
        if (finding.extras?.sdk !== finding.target.module) {
          errors.push(semanticError(`${basePath}/extras/sdk`, 'external boundary sdk must match target.module'))
        }
      } else if (
        finding.source.module === finding.target.module &&
        finding.source.file.length > 0 &&
        finding.target.file.length > 0
      ) {
        // File-level project rules can describe an edge inside one architecture module.
        // The module graph intentionally omits self-edges, so file locators are the proof.
      } else if (!report.metrics.dep_graph[finding.source.module]?.includes(finding.target.module)) {
        errors.push(semanticError(basePath, `boundary ${finding.source.module} -> ${finding.target.module} is absent from dep_graph`))
      }
    }
    if (finding.type === 'cycle') {
      const members = finding.extras?.members
      if (!Array.isArray(members) || members.length < 2 || members.some(member => typeof member !== 'string')) {
        errors.push(semanticError(`${basePath}/extras/members`, 'cycle must contain at least two ordered module ids'))
      } else {
        const cycleMembers = members as string[]
        const cycleKey = canonicalCycleKey(cycleMembers)
        const previousOwner = cycleOwners.get(cycleKey)
        if (previousOwner !== undefined) {
          errors.push(semanticError(`${basePath}/extras/members`, `duplicate cycle ownership; same cycle already appears in finding ${previousOwner}`))
        } else {
          cycleOwners.set(cycleKey, index)
        }
        if (new Set(cycleMembers).size !== cycleMembers.length) {
          errors.push(semanticError(`${basePath}/extras/members`, 'cycle members must be unique; do not repeat the closing member'))
        }
        const twoModuleOwners = new Set([
          'baseline:inappropriate-intimacy',
          'baseline:architectural-layer-cycle',
          'baseline:frontend-layer-cycle',
        ])
        if (cycleMembers.length === 2 && !twoModuleOwners.has(finding.rule_id)) {
          errors.push(semanticError(
            `${basePath}/rule_id`,
            'two-module cycle must be owned by baseline:inappropriate-intimacy or an applicable specialized layer-cycle rule',
          ))
        }
        if (cycleMembers.length >= 3 && finding.rule_id !== 'baseline:no-circular') {
          errors.push(semanticError(`${basePath}/rule_id`, 'cycles with three or more modules must be owned by baseline:no-circular'))
        }
        for (const member of cycleMembers) {
          if (!graphSet.has(member)) {
            errors.push(semanticError(`${basePath}/extras/members`, `cycle member '${member}' is absent from dep_graph`))
          }
        }
        for (let memberIndex = 0; memberIndex < cycleMembers.length; memberIndex++) {
          const source = cycleMembers[memberIndex]!
          const target = cycleMembers[(memberIndex + 1) % cycleMembers.length]!
          if (!report.metrics.dep_graph[source]?.includes(target)) {
            errors.push(semanticError(`${basePath}/extras/members`, `cycle edge ${source} -> ${target} is absent from dep_graph`))
          }
        }
      }
    }
  }

  for (const severity of Object.keys(actualCounts) as Severity[]) {
    const expected = actualCounts[severity]
    const actual = report.metrics.severity_counts[severity]
    if (actual !== expected) {
      errors.push(semanticError(`/metrics/severity_counts/${severity}`, `expected ${expected} findings, got ${actual}`))
    }
  }

  return errors
}

export function validateD8Report(obj: unknown, context: D8ValidationContext = {}): ValidationResult {
  const ok = validate(obj)
  const schemaErrors = formatErrors(validate.errors)
  if (!ok) return { valid: false, errors: schemaErrors }
  const semanticErrors = validateSemantics(obj as D8AuditReport, context)
  return { valid: semanticErrors.length === 0, errors: semanticErrors }
}
