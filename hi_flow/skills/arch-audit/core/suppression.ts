import type { Finding } from './types.ts'
import { fileToModule } from './source-scope.ts'

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
