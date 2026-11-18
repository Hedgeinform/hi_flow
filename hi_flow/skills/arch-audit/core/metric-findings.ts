import type { DepGraph, RawFinding } from './types.ts'

export function detectMetricFindings(_graph: DepGraph, perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>): RawFinding[] {
  const findings: RawFinding[] = []
  const modules = Object.keys(perModuleRaw)
  const N = modules.length
  const hubThreshold = Math.max(0.2 * N, 10)

  for (const m of modules) {
    const { ca, ce, loc } = perModuleRaw[m]!

    // god-object: Ca>10 AND Ce>10 AND LOC>300
    // Module-property finding — describes m itself, not an edge. target omitted.
    if (ca > 10 && ce > 10 && loc > 300) {
      findings.push({
        rule_id: 'god-object',
        raw_severity: 'error',
        type: 'coupling',
        source: { module: m, file: '' },
        extras: { ca, ce, loc },
      })
    }

    // dependency-hub: Ca > max(20% N, 10) — module-property
    if (ca > hubThreshold) {
      findings.push({
        rule_id: 'dependency-hub',
        raw_severity: 'error',
        type: 'coupling',
        source: { module: m, file: '' },
        extras: { ca, threshold: hubThreshold },
      })
    }

    // high-fanout: Ce > 15 — module-property
    const HIGH_FANOUT_THRESHOLD = 15
    if (ce > HIGH_FANOUT_THRESHOLD) {
      findings.push({
        rule_id: 'high-fanout',
        raw_severity: 'warn',
        type: 'coupling',
        source: { module: m, file: '' },
        extras: { ce, threshold: HIGH_FANOUT_THRESHOLD },
      })
    }
  }

  return findings
}
