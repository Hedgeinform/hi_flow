// Severity — D8 enum
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

// Raw severity from depcruise
export type DepcruiseSeverity = 'error' | 'warn' | 'info'

// Pre-enrichment finding (from helper #2 parse or adapter structural detection)
export interface RawFinding {
  rule_id: string                      // depcruise/baseline rule name, no namespace prefix
  raw_severity: DepcruiseSeverity      // depcruise raw severity
  type: string                         // 'cycle' | 'orphan' | 'cross-module' | 'metric' | etc
  source: { module: string; file: string }
  target: { module: string; file: string }
  extras?: Record<string, unknown>
}

// Final D8 finding (post-enrichment via helper enrich-findings)
export interface Finding {
  id: string                           // assigned by report-builder, e.g. "f-001"
  rule_id: string                      // namespaced: "baseline:no-circular" or "project:..."
  type: string
  severity: Severity                   // D8 enum
  source: { module: string; file: string }
  target: { module: string; file: string }
  reason: { principle: string; explanation: string }
  extras?: Record<string, unknown>
}

// Per-module metrics
export interface ModuleMetrics {
  Ca: number                           // afferent coupling
  Ce: number                           // efferent coupling
  I: number                            // instability = Ce / (Ca + Ce)
  A?: number                           // abstractness, optional
  D?: number                           // distance from main sequence, optional
  LOC: number
}

// Dependency graph: module name → list of imported module names
export type DepGraph = Record<string, string[]>

// Severity counts
export interface SeverityCounts {
  CRITICAL: number
  HIGH: number
  MEDIUM: number
  LOW: number
}

// D8 audit-report.json shape (top-level)
export interface D8AuditReport {
  metadata: {
    audit_sha: string
    audit_timestamp: string
    audit_tooling_version: string
    schema_version: '1.1'
    parsing_errors?: { file: string; error: string }[]
  }
  findings: Finding[]
  metrics: {
    per_module: Record<string, ModuleMetrics>
    nccd: number
    nccd_threshold: number
    severity_counts: SeverityCounts
    dep_graph: DepGraph
  }
}

// Baseline rule shape (in core/baseline-rules.ts)
export interface BaselineRule {
  id: string                           // namespaced, e.g. "baseline:no-circular"
  name: string                         // short name without prefix
  principle: string                    // canonical D9 principle id
  severity: Severity                   // default severity (project may override)
  threshold_default?: number           // for nccd-breach, etc.
  conditional?: ConditionalTrigger     // for layer-C rules
  explanation: string                  // template, may contain {placeholders}
}

export type ConditionalTrigger =
  | { kind: 'layered_detected'; layers_min: number }
  | { kind: 'feature_folders_detected' }
  | { kind: 'domain_detected' }
  | { kind: 'always' }

// Project rules — wraps .audit-rules.yaml shape
export interface ProjectRules {
  forbidden: Rule[]
  required: Rule[]
  overrides?: ProjectRulesOverrides
}

export interface ProjectRulesOverrides {
  nccd_threshold?: number
  layer_aliases?: Record<string, string>
  baseline_disables?: { rule_id: string; comment: string }[]
  severity_overrides?: { rule_id: string; severity: Severity }[]
  channel_sdk_extras?: string[]
  module_pattern?: string
}

// Rule = single project rule entry
export interface Rule {
  name: string                         // namespaced, "project:..."
  severity: Severity
  principle: string                    // must reference D9 principle id
  from?: { path: string }              // regex
  to?: { path: string }               // regex
  comment?: string
}

// D9 index (from helper regenerate-principles-index)
export interface D9Index {
  principles: Record<string, PrincipleMetadata>
  fix_alternatives: Record<string, string[]>
}

export interface PrincipleMetadata {
  id: string
  name: string
  description: string
  fix_alternatives: string[]
}

// Validation result for patches
export interface ValidationError {
  rule_name?: string
  field?: string
  message: string
  suggestion?: string
}

// Tooling requirement (adapter)
export interface ToolingRequirement {
  name: string
  min: string
  max?: string
}
