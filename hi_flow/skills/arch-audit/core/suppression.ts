import type { Finding } from './types.ts'

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

// Extract top-level module name from a file path under <pattern>/<module>/...
// Mirrors fileToModule in parse-depcruise-output.ts but tolerant: returns null if not resolvable.
function fileToModuleSafe(filePath: string, modulePattern: string): string | null {
  if (!filePath) return null
  const parts = filePath.split('/')
  const idx = parts.indexOf(modulePattern)
  if (idx === -1 || idx + 2 >= parts.length) return null
  return parts[idx + 1]!
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
    const m = fileToModuleSafe(e.file, modulePattern)
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
