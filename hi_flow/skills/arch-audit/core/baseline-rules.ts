import type { BaselineRule } from './types.ts'

const RULES: BaselineRule[] = [
  // === Layer A — depcruise built-ins (3) ===
  {
    id: 'baseline:no-circular',
    name: 'no-circular',
    principle: 'acyclic-dependencies',
    severity: 'HIGH',
    explanation: 'Circular dependency detected between modules.',
  },
  {
    id: 'baseline:no-orphans',
    name: 'no-orphans',
    principle: 'dead-code-elimination',
    severity: 'MEDIUM',
    explanation: 'Module is not imported by any entry point or other module — likely dead code.',
  },
  {
    id: 'baseline:not-to-test-from-prod',
    name: 'not-to-test-from-prod',
    principle: 'no-test-prod-coupling',
    severity: 'HIGH',
    explanation: 'Production code imports test files — inverted dependency direction.',
  },
  // === Layer B — universal custom (6) ===
  {
    id: 'baseline:god-object',
    name: 'god-object',
    principle: 'god-object-prohibition',
    severity: 'HIGH',
    threshold_default: 1,
    explanation: 'Module has high incoming AND outgoing coupling AND large LOC — multiple responsibilities.',
  },
  {
    id: 'baseline:dependency-hub',
    name: 'dependency-hub',
    principle: 'hub-like-dependency',
    severity: 'HIGH',
    explanation: 'Module is a dependency hub: Ca exceeds max(20% of total modules, 10).',
  },
  {
    id: 'baseline:inappropriate-intimacy',
    name: 'inappropriate-intimacy',
    principle: 'acyclic-dependencies',
    severity: 'HIGH',
    explanation: 'Two-module cycle — modules know each other intimately.',
  },
  {
    id: 'baseline:nccd-breach',
    name: 'nccd-breach',
    principle: 'acyclic-dependencies',
    severity: 'HIGH',
    threshold_default: 1.0,
    conditional: { kind: 'always' },
    explanation: 'Project NCCD ({nccd}) exceeds threshold ({threshold}) — graph has aggregate cyclic complexity.',
  },
  {
    id: 'baseline:high-fanout',
    name: 'high-fanout',
    principle: 'single-responsibility-module',
    severity: 'MEDIUM',
    threshold_default: 15,
    explanation: 'Module Ce ({ce}) > {threshold} — too many outgoing dependencies, likely doing too many things.',
  },
  {
    id: 'baseline:cross-module-import-info',
    name: 'cross-module-import-info',
    principle: 'module-boundary-awareness',
    severity: 'LOW',
    explanation: 'Cross-module import (informational): {source} → {target}.',
  },
  {
    id: 'baseline:barrel-file',
    name: 'barrel-file',
    principle: 'barrel-discipline',
    severity: 'MEDIUM',
    threshold_default: 0.8,
    explanation: 'Module {module} has a barrel index file ({barrel_file}) imported by sibling modules ({importing_modules}). Barrels obscure the real dependency graph; prefer explicit deep imports.',
  },
  // === Layer C — conditional structural (5) ===
  {
    id: 'baseline:layered-respect',
    name: 'layered-respect',
    principle: 'layered-architecture-respect',
    severity: 'MEDIUM',
    conditional: { kind: 'layered_detected', layers_min: 2 },
    explanation: 'Import violates layered architecture direction ({source_layer} → {target_layer}).',
  },
  {
    id: 'baseline:domain-no-channel-sdk',
    name: 'domain-no-channel-sdk',
    principle: 'channel-agnosticism',
    severity: 'MEDIUM',
    conditional: { kind: 'domain_detected' },
    explanation: 'Domain layer imports channel SDK ({sdk}) — violates channel agnosticism.',
  },
  {
    id: 'baseline:port-adapter-direction',
    name: 'port-adapter-direction',
    principle: 'port-adapter-separation',
    severity: 'MEDIUM',
    conditional: { kind: 'layered_detected', layers_min: 2 },
    explanation: 'Domain imports infrastructure directly — should go through ports/adapters.',
  },
  {
    id: 'baseline:architectural-layer-cycle',
    name: 'architectural-layer-cycle',
    principle: 'layered-architecture-respect',
    severity: 'CRITICAL',
    conditional: { kind: 'layered_detected', layers_min: 2 },
    explanation: 'Cycle between architectural layers ({layers}) — fundamental layered violation.',
  },
  {
    id: 'baseline:vertical-slice-respect',
    name: 'vertical-slice-respect',
    principle: 'vertical-slice-cohesion',
    severity: 'MEDIUM',
    conditional: { kind: 'feature_folders_detected' },
    explanation: 'Cross-feature import ({source_feature} → {target_feature}) — features should be isolated.',
  },
]

export function getBaselineRules(): BaselineRule[] {
  return RULES
}

export function getBaselineRuleByName(name: string): BaselineRule | undefined {
  return RULES.find(r => r.name === name)
}

export function getBaselineRuleById(id: string): BaselineRule | undefined {
  return RULES.find(r => r.id === id)
}
