import type { Finding } from './types.ts'
import { fileToModule } from './source-scope.ts'
import { canonicalCycleKey } from './cycle-key.ts'

const SUPPRESSIBLE_RULE_ID = 'baseline:cross-module-import-info'
const NO_ORPHANS_RULE_ID = 'baseline:no-orphans'
const SEVERITY_RANK: Record<Finding['severity'], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

interface SuppressionContext {
  parsing_errors?: { file: string; error: string }[]
  modulePattern?: string
}

export function applySuppression(findings: Finding[], ctx: SuppressionContext = {}): Finding[] {
  const cycleOwners = new Map<string, Finding>()
  const cycleRuleSpecificity: Record<string, number> = {
    'baseline:architectural-layer-cycle': 3,
    'baseline:frontend-layer-cycle': 3,
    'baseline:no-circular': 2,
    'baseline:inappropriate-intimacy': 1,
  }
  for (const finding of findings) {
    if (finding.type !== 'cycle' || !Array.isArray(finding.extras?.members)) continue
    const members = finding.extras.members.filter((member): member is string => typeof member === 'string')
    if (members.length < 2) continue
    const key = canonicalCycleKey(members)
    const current = cycleOwners.get(key)
    if (!current) {
      cycleOwners.set(key, finding)
      continue
    }
    const currentRank = SEVERITY_RANK[current.severity]
    const candidateRank = SEVERITY_RANK[finding.severity]
    const currentSpecificity = cycleRuleSpecificity[current.rule_id] ?? 0
    const candidateSpecificity = cycleRuleSpecificity[finding.rule_id] ?? 0
    if (candidateRank > currentRank || (candidateRank === currentRank && candidateSpecificity > currentSpecificity)) {
      cycleOwners.set(key, finding)
    }
  }

  const higherEdges = new Set<string>()
  for (const f of findings) {
    if (!f.target) continue
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK.LOW) {
      higherEdges.add(`${f.source.module}->${f.target.module}`)
    }
  }

  // Build set of modules whose files failed to parse — depcruise emits no-orphans
  // for unparseable files (no imports visible), which is a parser failure, not a real orphan.
  const parseErrorModules = new Set<string>()
  const modulePattern = ctx.modulePattern ?? 'src'
  for (const e of ctx.parsing_errors ?? []) {
    const m = fileToModule(e.file, modulePattern)
    if (m) parseErrorModules.add(m)
  }

  return findings.filter(f => {
    if (f.type === 'cycle' && Array.isArray(f.extras?.members)) {
      const members = f.extras.members.filter((member): member is string => typeof member === 'string')
      if (members.length >= 2 && cycleOwners.get(canonicalCycleKey(members)) !== f) return false
    }
    if (f.rule_id === SUPPRESSIBLE_RULE_ID) {
      if (!f.target) return true
      return !higherEdges.has(`${f.source.module}->${f.target.module}`)
    }
    if (f.rule_id === NO_ORPHANS_RULE_ID && parseErrorModules.has(f.source.module)) {
      return false
    }
    return true
  })
}
