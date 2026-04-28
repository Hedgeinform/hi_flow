import type { Finding, RawFinding, BaselineRule, ProjectRules } from '../core/types.ts'

interface Args {
  rawFindings: RawFinding[]
  baselineRules: BaselineRule[]
  projectRules: ProjectRules
}

/**
 * Replace `{key}` placeholders in the explanation template using values from extras
 * + source/target module names. Unknown keys are left as-is so the gap is visible.
 *
 * Example: 'Project NCCD ({nccd}) exceeds threshold ({threshold}) — ...' with
 * extras { nccd: 7.06, threshold: 1, module_count: 18 } becomes
 * 'Project NCCD (7.06) exceeds threshold (1) — ...'
 */
function interpolateExplanation(template: string, raw: RawFinding): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key) => {
    if (key === 'source') return raw.source.module
    if (key === 'target') return raw.target?.module ?? match
    const v = raw.extras?.[key]
    if (v === undefined || v === null) return match
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2)
    if (Array.isArray(v)) return v.join(', ')
    return String(v)
  })
}

export function enrichFindings(args: Args): Finding[] {
  const { rawFindings, baselineRules, projectRules } = args
  const baselineByName = new Map([
    ...baselineRules.map(r => [r.name, r] as [string, BaselineRule]),
    ...baselineRules.map(r => [r.id, r] as [string, BaselineRule]),
  ])
  const projectByName = new Map(
    [...projectRules.forbidden, ...projectRules.required].map(r => [r.name.replace(/^project:/, ''), r]),
  )

  const disabled = new Set(projectRules.overrides?.baseline_disables?.map(d => d.rule_id) ?? [])
  const severityOverrides = new Map(
    projectRules.overrides?.severity_overrides?.map(o => [o.rule_id, o.severity]) ?? [],
  )

  const out: Finding[] = []
  let counter = 1
  for (const raw of rawFindings) {
    let baseline: BaselineRule | undefined
    let projectRule: typeof projectRules.forbidden[number] | undefined
    let namespacedId: string

    if (baselineByName.has(raw.rule_id)) {
      baseline = baselineByName.get(raw.rule_id)!
      namespacedId = baseline.id
    } else if (projectByName.has(raw.rule_id)) {
      projectRule = projectByName.get(raw.rule_id)!
      namespacedId = projectRule.name.startsWith('project:') ? projectRule.name : `project:${projectRule.name}`
    } else {
      throw new Error(`enrich-findings: unknown rule_id '${raw.rule_id}' — not in baseline or project rules. Upstream bug.`)
    }

    if (disabled.has(namespacedId)) continue

    const baseSeverity = baseline?.severity ?? projectRule?.severity ?? 'MEDIUM'
    const finalSeverity = severityOverrides.get(namespacedId) ?? baseSeverity

    out.push({
      id: `f-${String(counter++).padStart(3, '0')}`,
      rule_id: namespacedId,
      type: raw.type,
      severity: finalSeverity,
      source: raw.source,
      ...(raw.target ? { target: raw.target } : {}),
      reason: {
        principle: baseline?.principle ?? projectRule?.principle ?? 'unknown',
        explanation: interpolateExplanation(
          baseline?.explanation ?? projectRule?.comment ?? '',
          raw,
        ),
      },
      extras: raw.extras,
    })
  }
  return out
}
