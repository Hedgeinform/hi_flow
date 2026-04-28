import type { Finding } from './types.ts'

const SUPPRESSIBLE_RULE_ID = 'baseline:cross-module-import-info'
const SEVERITY_RANK: Record<Finding['severity'], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export function applySuppression(findings: Finding[]): Finding[] {
  const higherEdges = new Set<string>()
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK.LOW) {
      higherEdges.add(`${f.source.module}->${f.target.module}`)
    }
  }
  return findings.filter(f => {
    if (f.rule_id !== SUPPRESSIBLE_RULE_ID) return true
    return !higherEdges.has(`${f.source.module}->${f.target.module}`)
  })
}
