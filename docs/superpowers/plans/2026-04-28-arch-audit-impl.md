# arch-audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the runtime of `hi_flow:arch-audit` skill — TypeScript/Node helpers, core modules, and `typescript-depcruise` adapter that together produce `audit-report.{json,md}` from a TypeScript project's dependency graph.

**Architecture:** Stack-agnostic core (6 modules, in `core/`) + stack-specific adapter (1 file, in `adapters/`) + 8 helper utilities (in `helpers/`). Single TypeScript codebase, run via `npx tsx` at runtime (no separate build step). All testable with Vitest. Project rules live per-project in `<project>/.audit-rules.yaml`; baseline rules ship as TS constants. Outputs validated against D8 schema before write. See `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-impl-spec.md` for contracts and decisions.

**Tech Stack:** TypeScript 5.x, Node 20+, Vitest (testing), Ajv (JSON Schema), js-yaml (YAML parsing), tsx (TypeScript runtime), dependency-cruiser ≥16.0 <17.0 (external tool, not a dep — invoked via npx).

**Working directory for ALL commands below:** `hi_flow/skills/arch-audit/` (relative to project root). Bash example to start each session: `cd hi_flow/skills/arch-audit && pwd` should print absolute path ending with `arch-audit`.

**Important consolidation note vs spec:** design spec listed both `helpers/apply-suppression.js` (helper #5) and `core/suppression.ts` (core 3.5). Plan consolidates these into a single module `core/suppression.ts` to avoid logic duplication. Helper #5 is dropped; the 9-helper count becomes 8. This is the only structural deviation from spec; everything else matches.

---

## Task 0: Project scaffolding

**Files:**
- Create: `hi_flow/skills/arch-audit/package.json`
- Create: `hi_flow/skills/arch-audit/tsconfig.json`
- Create: `hi_flow/skills/arch-audit/vitest.config.ts`
- Create directory tree: `core/`, `adapters/`, `helpers/`, `tests/{core,helpers,adapters,integration,fixtures}/`

- [ ] **Step 0.1: Create package.json**

```json
{
  "name": "@hi_flow/arch-audit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

- [ ] **Step 0.2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["core/**/*.ts", "adapters/**/*.ts", "helpers/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 0.3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
})
```

- [ ] **Step 0.4: Create directory tree + .gitkeep stubs**

```bash
mkdir -p core adapters helpers tests/core tests/helpers tests/adapters tests/integration tests/fixtures
touch core/.gitkeep adapters/.gitkeep helpers/.gitkeep tests/core/.gitkeep tests/helpers/.gitkeep tests/adapters/.gitkeep tests/integration/.gitkeep tests/fixtures/.gitkeep
```

- [ ] **Step 0.5: Install dependencies + verify**

```bash
npm install
npm run typecheck
```

Expected: install succeeds, typecheck exits 0 (no source files yet).

- [ ] **Step 0.6: Commit**

```bash
git add hi_flow/skills/arch-audit/
git commit -m "feat(arch-audit): project scaffolding"
```

---

## Task 1: D8 schema bump (cascade pre-action)

**Files:**
- Modify: `hi_flow/skills/arch-audit/references/d8-schema.json`
- Modify: `hi_flow/skills/arch-audit/references/d8-schema.md`

- [ ] **Step 1.1: Add `parsing_errors` to d8-schema.json metadata**

Open `references/d8-schema.json`. Locate the `metadata` properties block. Add:

```json
"parsing_errors": {
  "type": "array",
  "items": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "file": { "type": "string" },
      "error": { "type": "string" }
    },
    "required": ["file", "error"]
  }
}
```

Update `metadata.properties.schema_version.const` (or default value description) from `"1.0"` to `"1.1"`. Keep `additionalProperties: false` — the new field is now in the closed list.

- [ ] **Step 1.2: Update d8-schema.md**

Open `references/d8-schema.md`. Find the `metadata` field documentation. Add a row/paragraph documenting `parsing_errors` (optional array of `{file, error}` describing files depcruise could not parse). Bump `schema_version` mention from `1.0` to `1.1`. Add a one-line changelog entry at the bottom: `- 1.1 (2026-04-28): added optional metadata.parsing_errors for partial-parse audits.`

- [ ] **Step 1.3: Commit**

```bash
git add hi_flow/skills/arch-audit/references/d8-schema.json hi_flow/skills/arch-audit/references/d8-schema.md
git commit -m "feat(arch-audit): bump D8 schema to 1.1 with metadata.parsing_errors"
```

---

## Task 2: Shared type definitions

**Files:**
- Create: `hi_flow/skills/arch-audit/core/types.ts`

- [ ] **Step 2.1: Write types.ts**

```typescript
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
  to?: { path: string }                // regex
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
```

- [ ] **Step 2.2: Verify typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2.3: Commit**

```bash
git add hi_flow/skills/arch-audit/core/types.ts
git commit -m "feat(arch-audit): shared type definitions"
```

---

## Task 3: `core/baseline-rules.ts` — 14 baseline rules as TS constants

**Files:**
- Create: `hi_flow/skills/arch-audit/core/baseline-rules.ts`
- Create: `hi_flow/skills/arch-audit/tests/core/baseline-rules.test.ts`

Rule definitions are the canonical mapping from baseline rule names to severity/principle/explanation. Source: `references/baseline-rules.md`.

- [ ] **Step 3.1: Write the failing test**

`tests/core/baseline-rules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getBaselineRules } from '../../core/baseline-rules.ts'

describe('baseline-rules', () => {
  it('returns 14 baseline rules', () => {
    const rules = getBaselineRules()
    expect(rules).toHaveLength(14)
  })

  it('every rule has namespaced id with baseline: prefix', () => {
    const rules = getBaselineRules()
    for (const r of rules) {
      expect(r.id.startsWith('baseline:')).toBe(true)
    }
  })

  it('contains the three Layer A built-ins', () => {
    const ids = getBaselineRules().map(r => r.id)
    expect(ids).toContain('baseline:no-circular')
    expect(ids).toContain('baseline:no-orphans')
    expect(ids).toContain('baseline:not-to-test-from-prod')
  })

  it('architectural-layer-cycle is CRITICAL', () => {
    const rule = getBaselineRules().find(r => r.id === 'baseline:architectural-layer-cycle')
    expect(rule?.severity).toBe('CRITICAL')
  })

  it('cross-module-import-info is LOW', () => {
    const rule = getBaselineRules().find(r => r.id === 'baseline:cross-module-import-info')
    expect(rule?.severity).toBe('LOW')
  })

  it('every rule references a non-empty principle id', () => {
    for (const r of getBaselineRules()) {
      expect(r.principle.length).toBeGreaterThan(0)
    }
  })

  it('rule ids are unique', () => {
    const ids = getBaselineRules().map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
npx vitest run tests/core/baseline-rules.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3.3: Implement core/baseline-rules.ts**

Source mapping derived from `references/baseline-rules.md`. 14 rules across 3 layers (A=3, B=6, C=5).

```typescript
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
    threshold_default: 1, // module passes ALL: Ca>10, Ce>10, LOC>300
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
    conditional: { kind: 'always' }, // but only fires when N > 15 AND nccd > threshold
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
```

- [ ] **Step 3.4: Run test to verify pass**

```bash
npx vitest run tests/core/baseline-rules.test.ts
```

Expected: PASS, 7 tests green.

- [ ] **Step 3.5: Commit**

```bash
git add hi_flow/skills/arch-audit/core/baseline-rules.ts hi_flow/skills/arch-audit/tests/core/baseline-rules.test.ts
git commit -m "feat(arch-audit): core/baseline-rules with 14 canonical rules"
```

---

## Task 4: `helpers/compute-nccd.ts` — pure NCCD computation

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/compute-nccd.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/compute-nccd.test.ts`

NCCD (Normalized Cumulative Component Dependency) = sum of CD per module / count of modules. CD per module = number of modules reachable from it (including self) following depgraph edges. Reference: Lakos's metric.

- [ ] **Step 4.1: Write failing tests**

`tests/helpers/compute-nccd.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeNCCD } from '../../helpers/compute-nccd.ts'

describe('compute-nccd', () => {
  it('empty graph returns 0', () => {
    expect(computeNCCD({})).toBe(0)
  })

  it('single isolated module: NCCD = 1.0 (CD=1, N=1)', () => {
    expect(computeNCCD({ a: [] })).toBe(1.0)
  })

  it('linear chain a->b->c: NCCD = (3+2+1)/3 = 2.0', () => {
    const graph = { a: ['b'], b: ['c'], c: [] }
    expect(computeNCCD(graph)).toBeCloseTo(2.0, 5)
  })

  it('star a->[b,c]: a reaches 3, b and c reach 1; NCCD = (3+1+1)/3', () => {
    const graph = { a: ['b', 'c'], b: [], c: [] }
    expect(computeNCCD(graph)).toBeCloseTo(5 / 3, 5)
  })

  it('cycle a->b->a: each reaches 2; NCCD = (2+2)/2 = 2.0', () => {
    const graph = { a: ['b'], b: ['a'] }
    expect(computeNCCD(graph)).toBeCloseTo(2.0, 5)
  })
})
```

- [ ] **Step 4.2: Run test, expect FAIL** (`npx vitest run tests/helpers/compute-nccd.test.ts`)

- [ ] **Step 4.3: Implement helpers/compute-nccd.ts**

```typescript
import type { DepGraph } from '../core/types.ts'

function reachableCount(start: string, graph: DepGraph): number {
  const seen = new Set<string>()
  const stack = [start]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (seen.has(node)) continue
    seen.add(node)
    const edges = graph[node] ?? []
    for (const next of edges) {
      if (!seen.has(next)) stack.push(next)
    }
  }
  return seen.size
}

export function computeNCCD(graph: DepGraph): number {
  const modules = Object.keys(graph)
  if (modules.length === 0) return 0
  let cdSum = 0
  for (const m of modules) {
    cdSum += reachableCount(m, graph)
  }
  return cdSum / modules.length
}
```

- [ ] **Step 4.4: Run tests, expect PASS** (`npx vitest run tests/helpers/compute-nccd.test.ts`)

- [ ] **Step 4.5: Commit**

```bash
git add hi_flow/skills/arch-audit/helpers/compute-nccd.ts hi_flow/skills/arch-audit/tests/helpers/compute-nccd.test.ts
git commit -m "feat(arch-audit): compute-nccd helper"
```

---

## Task 5: `helpers/parse-depcruise-output.ts` — parse depcruise JSON

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/parse-depcruise-output.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/parse-depcruise-output.test.ts`
- Create: `hi_flow/skills/arch-audit/tests/fixtures/depcruise-sample.json`

depcruise emits JSON with a `modules[]` array; each module has `source`, `dependencies[]`, and (if rules fired) `dependencies[].rules[]` listing rule violations. We extract: RawFindings + DepGraph + per_module raw metrics.

- [ ] **Step 5.1: Create fixture file**

`tests/fixtures/depcruise-sample.json`:

```json
{
  "summary": {
    "violations": [
      {
        "type": "cycle",
        "from": "src/a/index.ts",
        "to": "src/b/index.ts",
        "rule": { "name": "no-circular", "severity": "warn" },
        "cycle": ["src/a/index.ts", "src/b/index.ts", "src/a/index.ts"]
      }
    ]
  },
  "modules": [
    {
      "source": "src/a/index.ts",
      "dependencies": [
        { "resolved": "src/b/index.ts", "module": "../b" }
      ]
    },
    {
      "source": "src/b/index.ts",
      "dependencies": [
        { "resolved": "src/a/index.ts", "module": "../a" }
      ]
    },
    {
      "source": "src/c/index.ts",
      "dependencies": []
    }
  ]
}
```

- [ ] **Step 5.2: Write failing tests**

`tests/helpers/parse-depcruise-output.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { parseDepcruiseOutput } from '../../helpers/parse-depcruise-output.ts'

describe('parse-depcruise-output', () => {
  it('parses sample fixture', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].rule_id).toBe('no-circular')
    expect(result.findings[0].raw_severity).toBe('warn')
    expect(result.findings[0].source.module).toBe('a')
    expect(result.findings[0].target.module).toBe('b')
    expect(result.findings[0].type).toBe('cycle')
  })

  it('builds dep_graph at module level (top-level src/<dir>)', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.dep_graph).toEqual({ a: ['b'], b: ['a'], c: [] })
  })

  it('aggregates per_module_raw with counts', async () => {
    const raw = await readFile('tests/fixtures/depcruise-sample.json', 'utf-8')
    const result = parseDepcruiseOutput(raw)
    expect(result.per_module_raw['a'].ce).toBe(1) // a→b
    expect(result.per_module_raw['a'].ca).toBe(1) // b→a
    expect(result.per_module_raw['c'].ce).toBe(0)
    expect(result.per_module_raw['c'].ca).toBe(0)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseDepcruiseOutput('not json')).toThrow(/JSON/)
  })
})
```

- [ ] **Step 5.3: Run, FAIL** (`npx vitest run tests/helpers/parse-depcruise-output.test.ts`)

- [ ] **Step 5.4: Implement helpers/parse-depcruise-output.ts**

```typescript
import type { RawFinding, DepGraph, DepcruiseSeverity } from '../core/types.ts'

interface PerModuleRaw {
  ca: number
  ce: number
  loc: number
}

interface ParseResult {
  findings: RawFinding[]
  dep_graph: DepGraph
  per_module_raw: Record<string, PerModuleRaw>
}

// Default module pattern: top-level subdir of src/
function fileToModule(filePath: string, modulePattern = 'src'): string {
  const parts = filePath.split('/')
  const srcIdx = parts.indexOf(modulePattern)
  if (srcIdx === -1 || srcIdx + 1 >= parts.length) return parts[0] ?? '<root>'
  return parts[srcIdx + 1]!
}

export function parseDepcruiseOutput(jsonString: string, modulePattern = 'src'): ParseResult {
  let data: any
  try {
    data = JSON.parse(jsonString)
  } catch (e) {
    throw new Error(`depcruise output is not valid JSON: ${(e as Error).message}`)
  }

  const findings: RawFinding[] = []
  const violations = data?.summary?.violations ?? []
  for (const v of violations) {
    const sourceFile = v.from ?? ''
    const targetFile = v.to ?? v.from ?? ''
    findings.push({
      rule_id: v.rule?.name ?? 'unknown',
      raw_severity: (v.rule?.severity ?? 'warn') as DepcruiseSeverity,
      type: v.type ?? 'rule-violation',
      source: { module: fileToModule(sourceFile, modulePattern), file: sourceFile },
      target: { module: fileToModule(targetFile, modulePattern), file: targetFile },
      extras: v.cycle ? { cycle: v.cycle } : undefined,
    })
  }

  const dep_graph: DepGraph = {}
  const per_module_raw: Record<string, PerModuleRaw> = {}
  const modules = data?.modules ?? []

  for (const m of modules) {
    const srcMod = fileToModule(m.source, modulePattern)
    if (!dep_graph[srcMod]) dep_graph[srcMod] = []
    if (!per_module_raw[srcMod]) per_module_raw[srcMod] = { ca: 0, ce: 0, loc: 0 }
    for (const dep of m.dependencies ?? []) {
      const tgtMod = fileToModule(dep.resolved, modulePattern)
      if (tgtMod === srcMod) continue
      if (!dep_graph[srcMod].includes(tgtMod)) dep_graph[srcMod].push(tgtMod)
      per_module_raw[srcMod].ce++
      if (!per_module_raw[tgtMod]) per_module_raw[tgtMod] = { ca: 0, ce: 0, loc: 0 }
      per_module_raw[tgtMod].ca++
    }
  }

  return { findings, dep_graph, per_module_raw }
}
```

- [ ] **Step 5.5: Run, PASS, commit**

```bash
npx vitest run tests/helpers/parse-depcruise-output.test.ts
git add hi_flow/skills/arch-audit/helpers/parse-depcruise-output.ts hi_flow/skills/arch-audit/tests/helpers/parse-depcruise-output.test.ts hi_flow/skills/arch-audit/tests/fixtures/depcruise-sample.json
git commit -m "feat(arch-audit): parse-depcruise-output helper"
```

---

## Task 6: `core/d9-loader.ts` — read D9 markdown library

**Files:**
- Create: `hi_flow/skills/arch-audit/core/d9-loader.ts`
- Create: `hi_flow/skills/arch-audit/tests/core/d9-loader.test.ts`
- Create: `hi_flow/skills/arch-audit/tests/fixtures/d9-sample.md`

D9 markdown structure (per `hi_flow/references/architectural-principles.md`): each principle entry starts with `### <id>` heading; under it sections like `**Description:**`, `**Fix alternatives:**`. Loader extracts id → metadata.

- [ ] **Step 6.1: Create fixture**

`tests/fixtures/d9-sample.md`:

```markdown
# Architectural Principles (D9)

## Layer A — built-ins

### acyclic-dependencies

**Description:** No cycles in the dependency graph.

**Fix alternatives:**
- Extract shared logic into a third module.
- Invert dependency direction via interface.
- Merge tightly-coupled modules.

### god-object-prohibition

**Description:** A single module must not have multiple unrelated responsibilities.

**Fix alternatives:**
- Split by responsibility.
- Extract collaborator modules.
```

- [ ] **Step 6.2: Write failing tests**

`tests/core/d9-loader.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { loadD9 } from '../../core/d9-loader.ts'

describe('d9-loader', () => {
  it('loads two principles from sample fixture', async () => {
    const d9 = await loadD9('tests/fixtures/d9-sample.md')
    expect(Object.keys(d9.principles)).toHaveLength(2)
    expect(d9.principles['acyclic-dependencies']).toBeDefined()
    expect(d9.principles['god-object-prohibition']).toBeDefined()
  })

  it('extracts description and fix_alternatives', async () => {
    const d9 = await loadD9('tests/fixtures/d9-sample.md')
    const p = d9.principles['acyclic-dependencies']
    expect(p.description).toMatch(/No cycles/)
    expect(p.fix_alternatives).toHaveLength(3)
    expect(p.fix_alternatives[0]).toMatch(/Extract shared logic/)
  })

  it('throws on missing file', async () => {
    await expect(loadD9('tests/fixtures/missing.md')).rejects.toThrow()
  })
})
```

- [ ] **Step 6.3: Run, FAIL**

- [ ] **Step 6.4: Implement core/d9-loader.ts**

```typescript
import { readFile } from 'node:fs/promises'
import type { D9Index, PrincipleMetadata } from './types.ts'

export async function loadD9(mdPath: string): Promise<D9Index> {
  const content = await readFile(mdPath, 'utf-8')
  const principles: Record<string, PrincipleMetadata> = {}
  const fix_alternatives: Record<string, string[]> = {}

  // Split by ### headings (level-3 — principle entries)
  const sections = content.split(/^### /m).slice(1)
  for (const section of sections) {
    const lines = section.split('\n')
    const id = lines[0]?.trim() ?? ''
    if (!id || id.startsWith('#')) continue

    const descMatch = section.match(/\*\*Description:\*\*\s*([\s\S]*?)(?=\n\n|\*\*|$)/)
    const description = descMatch?.[1]?.trim() ?? ''

    const fixMatch = section.match(/\*\*Fix alternatives:\*\*\s*([\s\S]*?)(?=\n\n###|\n\n##|$)/)
    const alternatives: string[] = []
    if (fixMatch) {
      const block = fixMatch[1] ?? ''
      for (const line of block.split('\n')) {
        const m = line.match(/^-\s+(.+)$/)
        if (m && m[1]) alternatives.push(m[1].trim())
      }
    }

    principles[id] = { id, name: id, description, fix_alternatives: alternatives }
    fix_alternatives[id] = alternatives
  }

  return { principles, fix_alternatives }
}
```

- [ ] **Step 6.5: Run, PASS, commit**

```bash
npx vitest run tests/core/d9-loader.test.ts
git add hi_flow/skills/arch-audit/core/d9-loader.ts hi_flow/skills/arch-audit/tests/core/d9-loader.test.ts hi_flow/skills/arch-audit/tests/fixtures/d9-sample.md
git commit -m "feat(arch-audit): core/d9-loader"
```

---

## Task 7: `core/project-rules.ts` — read/write `.audit-rules.yaml`

**Files:**
- Create: `hi_flow/skills/arch-audit/core/project-rules.ts`
- Create: `hi_flow/skills/arch-audit/tests/core/project-rules.test.ts`
- Create: `hi_flow/skills/arch-audit/tests/fixtures/sample-rules.yaml`

Canonical path per `<project>/.audit-rules.yaml`. Empty result if file absent (greenfield case, not an error).

- [ ] **Step 7.1: Create fixture**

`tests/fixtures/sample-rules.yaml`:

```yaml
forbidden:
  - name: project:dispatcher-no-pipeline
    severity: HIGH
    principle: layered-architecture-respect
    from: { path: "^src/dispatcher" }
    to: { path: "^src/pipeline" }
    comment: "Dispatcher must not bypass routing"

required: []

overrides:
  nccd_threshold: 1.5
  baseline_disables:
    - rule_id: baseline:no-orphans
      comment: "We use barrel exports — orphans are common false positives"
  channel_sdk_extras:
    - "@my/custom-bot-lib"
```

- [ ] **Step 7.2: Write failing tests**

`tests/core/project-rules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  loadProjectRules,
  writeProjectRules,
  findRuleByName,
  addRules,
} from '../../core/project-rules.ts'
import { copyFile } from 'node:fs/promises'

describe('project-rules', () => {
  it('returns empty rules when file absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    const rules = await loadProjectRules(dir)
    expect(rules.forbidden).toEqual([])
    expect(rules.required).toEqual([])
    await rm(dir, { recursive: true })
  })

  it('loads forbidden rules and overrides from fixture', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    await copyFile('tests/fixtures/sample-rules.yaml', join(dir, '.audit-rules.yaml'))
    const rules = await loadProjectRules(dir)
    expect(rules.forbidden).toHaveLength(1)
    expect(rules.forbidden[0].name).toBe('project:dispatcher-no-pipeline')
    expect(rules.overrides?.nccd_threshold).toBe(1.5)
    expect(rules.overrides?.baseline_disables?.[0].rule_id).toBe('baseline:no-orphans')
    await rm(dir, { recursive: true })
  })

  it('findRuleByName searches forbidden + required', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    await copyFile('tests/fixtures/sample-rules.yaml', join(dir, '.audit-rules.yaml'))
    const rules = await loadProjectRules(dir)
    const found = findRuleByName(rules, 'project:dispatcher-no-pipeline')
    expect(found?.severity).toBe('HIGH')
    expect(findRuleByName(rules, 'nonexistent')).toBeNull()
    await rm(dir, { recursive: true })
  })

  it('addRules + writeProjectRules round-trip', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-test-'))
    const initial = { forbidden: [], required: [] }
    const updated = addRules(initial, [
      { name: 'project:test', severity: 'LOW', principle: 'test-principle' },
    ])
    await writeProjectRules(dir, updated)
    const reloaded = await loadProjectRules(dir)
    expect(reloaded.forbidden).toHaveLength(1)
    expect(reloaded.forbidden[0].name).toBe('project:test')
    await rm(dir, { recursive: true })
  })
})
```

- [ ] **Step 7.3: Run, FAIL**

- [ ] **Step 7.4: Implement core/project-rules.ts**

```typescript
import { readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import yaml from 'js-yaml'
import type { ProjectRules, Rule } from './types.ts'

export const PROJECT_RULES_FILENAME = '.audit-rules.yaml'

function emptyRules(): ProjectRules {
  return { forbidden: [], required: [] }
}

export async function loadProjectRules(projectRoot: string): Promise<ProjectRules> {
  const path = join(projectRoot, PROJECT_RULES_FILENAME)
  try {
    await access(path)
  } catch {
    return emptyRules()
  }
  const raw = await readFile(path, 'utf-8')
  const parsed = yaml.load(raw) as Partial<ProjectRules> | null | undefined
  if (!parsed || typeof parsed !== 'object') return emptyRules()
  return {
    forbidden: parsed.forbidden ?? [],
    required: parsed.required ?? [],
    overrides: parsed.overrides,
  }
}

export async function writeProjectRules(projectRoot: string, rules: ProjectRules): Promise<void> {
  const path = join(projectRoot, PROJECT_RULES_FILENAME)
  const yamlString = yaml.dump(rules, { lineWidth: 120, noRefs: true })
  await writeFile(path, yamlString, 'utf-8')
}

export function findRuleByName(rules: ProjectRules, name: string): Rule | null {
  return [...rules.forbidden, ...rules.required].find(r => r.name === name) ?? null
}

export function addRules(rules: ProjectRules, newRules: Rule[]): ProjectRules {
  return {
    ...rules,
    forbidden: [...rules.forbidden, ...newRules.filter(r => !!r.from || !!r.to)],
    required: [...rules.required, ...newRules.filter(r => !r.from && !r.to)],
  }
}
```

- [ ] **Step 7.5: Run, PASS, commit**

```bash
npx vitest run tests/core/project-rules.test.ts
git add hi_flow/skills/arch-audit/core/project-rules.ts hi_flow/skills/arch-audit/tests/core/project-rules.test.ts hi_flow/skills/arch-audit/tests/fixtures/sample-rules.yaml
git commit -m "feat(arch-audit): core/project-rules with overrides support"
```

---

## Task 8: `core/d8-schema-validator.ts` — Ajv-based schema validation

**Files:**
- Create: `hi_flow/skills/arch-audit/core/d8-schema-validator.ts`
- Create: `hi_flow/skills/arch-audit/tests/core/d8-schema-validator.test.ts`

- [ ] **Step 8.1: Write failing tests**

`tests/core/d8-schema-validator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateD8Report } from '../../core/d8-schema-validator.ts'

const validReport = {
  metadata: {
    audit_sha: 'uuid:00000000-0000-0000-0000-000000000000',
    audit_timestamp: '2026-04-28T12:00:00Z',
    audit_tooling_version: 'typescript-depcruise (16.3.0)',
    schema_version: '1.1',
  },
  findings: [],
  metrics: {
    per_module: {},
    nccd: 0,
    nccd_threshold: 1.0,
    severity_counts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    dep_graph: {},
  },
}

describe('d8-schema-validator', () => {
  it('validates a minimal correct report', () => {
    const result = validateD8Report(validReport)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects missing required field', () => {
    const bad: any = { ...validReport }
    delete bad.findings
    const result = validateD8Report(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('accepts metadata.parsing_errors as optional', () => {
    const withErrors = {
      ...validReport,
      metadata: {
        ...validReport.metadata,
        parsing_errors: [{ file: 'src/broken.ts', error: 'SyntaxError' }],
      },
    }
    const result = validateD8Report(withErrors)
    expect(result.valid).toBe(true)
  })
})
```

- [ ] **Step 8.2: Run, FAIL**

- [ ] **Step 8.3: Implement core/d8-schema-validator.ts**

```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Ajv, { type ErrorObject } from 'ajv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SCHEMA_PATH = join(__dirname, '..', 'references', 'd8-schema.json')
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'))

const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

export interface ValidationResult {
  valid: boolean
  errors: { path: string; message: string }[]
}

function formatErrors(errors: ErrorObject[] | null | undefined): { path: string; message: string }[] {
  if (!errors) return []
  return errors.map(e => ({ path: e.instancePath || '/', message: e.message ?? 'unknown' }))
}

export function validateD8Report(obj: unknown): ValidationResult {
  const ok = validate(obj)
  return { valid: !!ok, errors: formatErrors(validate.errors) }
}
```

Note: if `references/d8-schema.json` doesn't have full top-level shape required for direct Ajv validation, Sonnet should adjust the schema file to declare `type: "object"` at the root with `properties: { metadata, findings, metrics }, required: ["metadata", "findings", "metrics"], additionalProperties: false`. Verify by running the test.

- [ ] **Step 8.4: Run, PASS, commit**

```bash
npx vitest run tests/core/d8-schema-validator.test.ts
git add hi_flow/skills/arch-audit/core/d8-schema-validator.ts hi_flow/skills/arch-audit/tests/core/d8-schema-validator.test.ts
git commit -m "feat(arch-audit): core/d8-schema-validator"
```

---

## Task 9: `core/suppression.ts` — binary suppression algorithm

**Files:**
- Create: `hi_flow/skills/arch-audit/core/suppression.ts`
- Create: `hi_flow/skills/arch-audit/tests/core/suppression.test.ts`

Binary algorithm: only `baseline:cross-module-import-info` (LOW informational) findings are suppressed when ANY higher-severity finding exists on the same `(source.module, target.module)` edge. Multi-level precedence is just documentation; runtime suppression is simple LOW vs higher.

- [ ] **Step 9.1: Write failing tests**

`tests/core/suppression.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applySuppression } from '../../core/suppression.ts'
import type { Finding } from '../../core/types.ts'

const mkFinding = (overrides: Partial<Finding>): Finding => ({
  id: 'f-test',
  rule_id: 'baseline:cross-module-import-info',
  type: 'cross-module',
  severity: 'LOW',
  source: { module: 'a', file: 'src/a/x.ts' },
  target: { module: 'b', file: 'src/b/y.ts' },
  reason: { principle: 'module-boundary-awareness', explanation: '' },
  ...overrides,
})

describe('suppression', () => {
  it('passes through when no LOW findings', () => {
    const findings = [mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular' })]
    expect(applySuppression(findings)).toEqual(findings)
  })

  it('suppresses LOW info on same edge as HIGH finding', () => {
    const findings: Finding[] = [
      mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular', id: 'f-1' }),
      mkFinding({ severity: 'LOW', rule_id: 'baseline:cross-module-import-info', id: 'f-2' }),
    ]
    const result = applySuppression(findings)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('f-1')
  })

  it('keeps LOW info on edge with no higher findings', () => {
    const findings: Finding[] = [
      mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular', id: 'f-1', source: { module: 'x', file: '' }, target: { module: 'y', file: '' } }),
      mkFinding({ severity: 'LOW', id: 'f-2', source: { module: 'a', file: '' }, target: { module: 'b', file: '' } }),
    ]
    const result = applySuppression(findings)
    expect(result).toHaveLength(2)
  })

  it('does NOT suppress non-cross-module-import-info LOW findings', () => {
    const findings: Finding[] = [
      mkFinding({ severity: 'HIGH', rule_id: 'baseline:no-circular', id: 'f-1' }),
      mkFinding({ severity: 'LOW', rule_id: 'baseline:other-low-rule', id: 'f-2' }),
    ]
    const result = applySuppression(findings)
    expect(result).toHaveLength(2) // f-2 stays — not the suppressible info rule
  })
})
```

- [ ] **Step 9.2: Run, FAIL**

- [ ] **Step 9.3: Implement core/suppression.ts**

```typescript
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
```

- [ ] **Step 9.4: Run, PASS, commit**

```bash
npx vitest run tests/core/suppression.test.ts
git add hi_flow/skills/arch-audit/core/suppression.ts hi_flow/skills/arch-audit/tests/core/suppression.test.ts
git commit -m "feat(arch-audit): core/suppression with binary LOW-vs-higher algorithm"
```

---

## Task 10: `helpers/enrich-findings.ts` — severity + principle enrichment

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/enrich-findings.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/enrich-findings.test.ts`

Takes RawFindings (from helper #2 OR from adapter structural detection) + baselineRules + projectRules.overrides → Finding[] with namespaced rule_id, finalized D8 severity, populated reason.principle/explanation.

- [ ] **Step 10.1: Write failing tests**

`tests/helpers/enrich-findings.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { enrichFindings } from '../../helpers/enrich-findings.ts'
import { getBaselineRules } from '../../core/baseline-rules.ts'
import type { RawFinding, ProjectRules } from '../../core/types.ts'

const baseline = getBaselineRules()
const emptyProjectRules: ProjectRules = { forbidden: [], required: [] }

const mkRaw = (rule_id: string, raw_severity: 'error' | 'warn' | 'info' = 'warn'): RawFinding => ({
  rule_id,
  raw_severity,
  type: 'test',
  source: { module: 'a', file: 'src/a/x.ts' },
  target: { module: 'b', file: 'src/b/y.ts' },
})

describe('enrich-findings', () => {
  it('namespaces baseline rule_id with baseline: prefix', () => {
    const result = enrichFindings({ rawFindings: [mkRaw('no-circular')], baselineRules: baseline, projectRules: emptyProjectRules })
    expect(result[0].rule_id).toBe('baseline:no-circular')
  })

  it('assigns severity from baseline definition (not from raw)', () => {
    const result = enrichFindings({ rawFindings: [mkRaw('no-circular', 'warn')], baselineRules: baseline, projectRules: emptyProjectRules })
    // baseline:no-circular is HIGH per Layer A definition, regardless of raw 'warn'
    expect(result[0].severity).toBe('HIGH')
  })

  it('populates reason.principle from baseline rule', () => {
    const result = enrichFindings({ rawFindings: [mkRaw('no-circular')], baselineRules: baseline, projectRules: emptyProjectRules })
    expect(result[0].reason.principle).toBe('acyclic-dependencies')
  })

  it('applies project severity_overrides', () => {
    const projectRules: ProjectRules = {
      forbidden: [],
      required: [],
      overrides: { severity_overrides: [{ rule_id: 'baseline:no-orphans', severity: 'CRITICAL' }] },
    }
    const result = enrichFindings({ rawFindings: [mkRaw('no-orphans')], baselineRules: baseline, projectRules })
    expect(result[0].severity).toBe('CRITICAL')
  })

  it('drops findings disabled via baseline_disables', () => {
    const projectRules: ProjectRules = {
      forbidden: [],
      required: [],
      overrides: { baseline_disables: [{ rule_id: 'baseline:no-orphans', comment: 'noisy' }] },
    }
    const result = enrichFindings({ rawFindings: [mkRaw('no-orphans')], baselineRules: baseline, projectRules })
    expect(result).toHaveLength(0)
  })

  it('throws on unknown rule_id (upstream bug indicator)', () => {
    expect(() =>
      enrichFindings({ rawFindings: [mkRaw('totally-unknown-rule')], baselineRules: baseline, projectRules: emptyProjectRules }),
    ).toThrow(/totally-unknown-rule/)
  })
})
```

- [ ] **Step 10.2: Run, FAIL**

- [ ] **Step 10.3: Implement helpers/enrich-findings.ts**

```typescript
import type { Finding, RawFinding, BaselineRule, ProjectRules } from '../core/types.ts'

interface Args {
  rawFindings: RawFinding[]
  baselineRules: BaselineRule[]
  projectRules: ProjectRules
}

export function enrichFindings(args: Args): Finding[] {
  const { rawFindings, baselineRules, projectRules } = args
  const baselineByName = new Map(baselineRules.map(r => [r.name, r]))
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
      target: raw.target,
      reason: {
        principle: baseline?.principle ?? projectRule?.principle ?? 'unknown',
        explanation: baseline?.explanation ?? projectRule?.comment ?? '',
      },
      extras: raw.extras,
    })
  }
  return out
}
```

- [ ] **Step 10.4: Run, PASS, commit**

```bash
npx vitest run tests/helpers/enrich-findings.test.ts
git add hi_flow/skills/arch-audit/helpers/enrich-findings.ts hi_flow/skills/arch-audit/tests/helpers/enrich-findings.test.ts
git commit -m "feat(arch-audit): enrich-findings helper (severity + principle)"
```

---

## Task 11: `helpers/generate-depcruise-config.ts`

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/generate-depcruise-config.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/generate-depcruise-config.test.ts`

Generates a CJS file consumed by depcruise. Translates baseline + project forbidden/required rules into depcruise's native format. Writes to a temp path, returns the path.

- [ ] **Step 11.1: Write failing tests**

`tests/helpers/generate-depcruise-config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import { generateDepcruiseConfig } from '../../helpers/generate-depcruise-config.ts'
import { getBaselineRules } from '../../core/baseline-rules.ts'

describe('generate-depcruise-config', () => {
  it('writes a valid CJS file with module.exports', async () => {
    const path = await generateDepcruiseConfig({
      baselineRules: getBaselineRules(),
      projectRules: { forbidden: [], required: [] },
      projectRoot: process.cwd(),
    })
    const content = await readFile(path, 'utf-8')
    expect(content).toMatch(/module\.exports\s*=/)
    expect(content).toMatch(/forbidden/)
    await rm(path)
  })

  it('embeds project forbidden rules', async () => {
    const path = await generateDepcruiseConfig({
      baselineRules: [],
      projectRules: {
        forbidden: [
          {
            name: 'project:test-rule',
            severity: 'HIGH',
            principle: 'p1',
            from: { path: '^src/a' },
            to: { path: '^src/b' },
          },
        ],
        required: [],
      },
      projectRoot: process.cwd(),
    })
    const content = await readFile(path, 'utf-8')
    expect(content).toMatch(/project:test-rule/)
    expect(content).toMatch(/\^src\/a/)
    await rm(path)
  })
})
```

- [ ] **Step 11.2: Run, FAIL**

- [ ] **Step 11.3: Implement helpers/generate-depcruise-config.ts**

```typescript
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BaselineRule, ProjectRules, Severity } from '../core/types.ts'

interface Args {
  baselineRules: BaselineRule[]
  projectRules: ProjectRules
  projectRoot: string
}

const DEPCRUISE_SEV: Record<Severity, 'error' | 'warn' | 'info'> = {
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warn',
  LOW: 'info',
}

function baselineToDepcruise(rule: BaselineRule) {
  // Layer A built-ins map directly; B/C are computed structurally so they aren't depcruise rules
  if (rule.name === 'no-circular') {
    return { name: rule.id, severity: DEPCRUISE_SEV[rule.severity], comment: rule.explanation, from: {}, to: { circular: true } }
  }
  if (rule.name === 'no-orphans') {
    return { name: rule.id, severity: DEPCRUISE_SEV[rule.severity], comment: rule.explanation, from: { orphan: true, pathNot: ['(^|/)\\.[^/]+\\.(js|ts)$'] }, to: {} }
  }
  if (rule.name === 'not-to-test-from-prod') {
    return {
      name: rule.id,
      severity: DEPCRUISE_SEV[rule.severity],
      comment: rule.explanation,
      from: { pathNot: '\\.(spec|test)\\.(js|ts)x?$' },
      to: { path: '\\.(spec|test)\\.(js|ts)x?$' },
    }
  }
  return null // Layer B/C computed in core, not depcruise rules
}

export async function generateDepcruiseConfig(args: Args): Promise<string> {
  const { baselineRules, projectRules } = args

  const forbidden: any[] = []
  for (const r of baselineRules) {
    const d = baselineToDepcruise(r)
    if (d) forbidden.push(d)
  }
  for (const r of projectRules.forbidden) {
    forbidden.push({
      name: r.name,
      severity: DEPCRUISE_SEV[r.severity],
      comment: r.comment ?? '',
      from: r.from ?? {},
      to: r.to ?? {},
    })
  }

  const required: any[] = []
  for (const r of projectRules.required) {
    required.push({
      name: r.name,
      severity: DEPCRUISE_SEV[r.severity],
      comment: r.comment ?? '',
      module: r.from ?? {},
      to: r.to ?? {},
    })
  }

  const config = {
    forbidden,
    required,
    options: {
      doNotFollow: { path: 'node_modules' },
      tsConfig: { fileName: 'tsconfig.json' },
      enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
      reporterOptions: { json: { showTitle: false } },
    },
  }

  const out = `module.exports = ${JSON.stringify(config, null, 2)}\n`
  const path = join(tmpdir(), `dependency-cruiser-${Date.now()}-${Math.random().toString(36).slice(2)}.cjs`)
  await writeFile(path, out, 'utf-8')
  return path
}
```

- [ ] **Step 11.4: Run, PASS, commit**

```bash
npx vitest run tests/helpers/generate-depcruise-config.test.ts
git add hi_flow/skills/arch-audit/helpers/generate-depcruise-config.ts hi_flow/skills/arch-audit/tests/helpers/generate-depcruise-config.test.ts
git commit -m "feat(arch-audit): generate-depcruise-config helper"
```

---

## Task 12: `helpers/generate-mermaid.ts`

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/generate-mermaid.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/generate-mermaid.test.ts`

Generates 4 Mermaid blocks: `overall` (project graph), `foundation` (utility modules), `layered` (if detected), `clusters` (per-cluster). Edge styling per design spec section 8: cycles bold red solid, CRITICAL bold red dashed, HIGH/MEDIUM boundary orange, default light gray opacity 0.5; hub modules pink fill. `overall` is `null` if module count > 25 (cap = `MERMAID_OVERALL_CAP`).

- [ ] **Step 12.1: Write failing tests**

`tests/helpers/generate-mermaid.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateMermaid, MERMAID_OVERALL_CAP } from '../../helpers/generate-mermaid.ts'
import type { D8AuditReport } from '../../core/types.ts'

const minimalReport = (overrides: Partial<D8AuditReport> = {}): D8AuditReport => ({
  metadata: {
    audit_sha: 'uuid:test',
    audit_timestamp: '2026-04-28T00:00:00Z',
    audit_tooling_version: 'test (16.0.0)',
    schema_version: '1.1',
  },
  findings: [],
  metrics: {
    per_module: {},
    nccd: 0,
    nccd_threshold: 1.0,
    severity_counts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    dep_graph: {},
  },
  ...overrides,
})

describe('generate-mermaid', () => {
  it('returns null overall when modules > cap', () => {
    const big: Record<string, string[]> = {}
    for (let i = 0; i < MERMAID_OVERALL_CAP + 1; i++) big[`m${i}`] = []
    const report = minimalReport({ metrics: { ...minimalReport().metrics, dep_graph: big } })
    const result = generateMermaid(report)
    expect(result.overall).toBeNull()
  })

  it('emits flowchart TD for overall when small', () => {
    const report = minimalReport({ metrics: { ...minimalReport().metrics, dep_graph: { a: ['b'], b: [] } } })
    const result = generateMermaid(report)
    expect(result.overall).toMatch(/flowchart TD/)
    expect(result.overall).toMatch(/a --> b/)
  })

  it('layered is null when no architectural-layer-cycle hint', () => {
    const report = minimalReport()
    expect(generateMermaid(report).layered).toBeNull()
  })

  it('clusters is keyed by cluster id when findings exist', () => {
    const report = minimalReport({
      findings: [
        {
          id: 'f-001',
          rule_id: 'baseline:no-circular',
          type: 'cycle',
          severity: 'HIGH',
          source: { module: 'a', file: '' },
          target: { module: 'b', file: '' },
          reason: { principle: 'acyclic-dependencies', explanation: '' },
        },
      ],
      metrics: { ...minimalReport().metrics, dep_graph: { a: ['b'], b: ['a'] } },
    })
    const result = generateMermaid(report)
    expect(Object.keys(result.clusters).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 12.2: Run, FAIL**

- [ ] **Step 12.3: Implement helpers/generate-mermaid.ts**

```typescript
import type { D8AuditReport, Finding, DepGraph } from '../core/types.ts'

export const MERMAID_OVERALL_CAP = 25

interface MermaidResult {
  overall: string | null
  foundation: string | null
  layered: string | null
  clusters: Record<string, string>
}

function escId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

function buildOverall(graph: DepGraph, findings: Finding[]): string {
  const lines: string[] = ['flowchart TD']
  const cycleEdges = new Set<string>()
  const criticalEdges = new Set<string>()
  const highMediumEdges = new Set<string>()

  for (const f of findings) {
    const edge = `${escId(f.source.module)}-${escId(f.target.module)}`
    if (f.type === 'cycle' || f.rule_id === 'baseline:no-circular' || f.rule_id === 'baseline:inappropriate-intimacy') {
      cycleEdges.add(edge)
    } else if (f.severity === 'CRITICAL') {
      criticalEdges.add(edge)
    } else if (f.severity === 'HIGH' || f.severity === 'MEDIUM') {
      highMediumEdges.add(edge)
    }
  }

  for (const [src, targets] of Object.entries(graph)) {
    for (const tgt of targets) {
      const eid = `${escId(src)}-${escId(tgt)}`
      let arrow = '-->'
      if (cycleEdges.has(eid)) arrow = '==>|cycle|'
      else if (criticalEdges.has(eid)) arrow = '-.->|critical|'
      lines.push(`    ${escId(src)} ${arrow} ${escId(tgt)}`)
    }
  }

  // Edge styling for HIGH/MEDIUM (orange) — append linkStyle by ordinal index
  // (omitted here for brevity; Sonnet adds linkStyle blocks per edge index)

  return lines.join('\n')
}

function buildClusters(findings: Finding[], graph: DepGraph): Record<string, string> {
  const byPrinciple = new Map<string, Finding[]>()
  for (const f of findings) {
    const key = f.reason.principle
    if (!byPrinciple.has(key)) byPrinciple.set(key, [])
    byPrinciple.get(key)!.push(f)
  }
  const out: Record<string, string> = {}
  for (const [principle, group] of byPrinciple) {
    const lines = ['flowchart TD']
    const seen = new Set<string>()
    for (const f of group) {
      const e = `${escId(f.source.module)} --> ${escId(f.target.module)}`
      if (!seen.has(e)) {
        lines.push(`    ${e}`)
        seen.add(e)
      }
    }
    out[`cluster-${principle}`] = lines.join('\n')
  }
  return out
}

export function generateMermaid(report: D8AuditReport): MermaidResult {
  const graph = report.metrics.dep_graph
  const moduleCount = Object.keys(graph).length

  const overall = moduleCount > MERMAID_OVERALL_CAP ? null : buildOverall(graph, report.findings)
  const foundation = null // v1: foundation diagram deferred — adapter does not yet emit foundation marker; report-builder treats null as "no separate foundation diagram"
  const layered = report.findings.some(f => f.rule_id === 'baseline:architectural-layer-cycle' || f.rule_id === 'baseline:layered-respect')
    ? buildOverall(graph, report.findings) // simple fallback, layered-specific labels later
    : null
  const clusters = buildClusters(report.findings, graph)

  return { overall, foundation, layered, clusters }
}
```

- [ ] **Step 12.4: Run, PASS, commit**

```bash
npx vitest run tests/helpers/generate-mermaid.test.ts
git add hi_flow/skills/arch-audit/helpers/generate-mermaid.ts hi_flow/skills/arch-audit/tests/helpers/generate-mermaid.test.ts
git commit -m "feat(arch-audit): generate-mermaid helper"
```

---

## Task 13: `helpers/validate-rules-patch.ts`

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/validate-rules-patch.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/validate-rules-patch.test.ts`
- Create: `hi_flow/skills/arch-audit/tests/fixtures/sample-patch.yaml`

Validates a YAML patch from arch-redesign: syntax, principle id existence in D9, name uniqueness vs current project rules, severity enum, regex parseability, no circular suppression. Always returns structured result, never throws.

- [ ] **Step 13.1: Create fixture**

`tests/fixtures/sample-patch.yaml`:

```yaml
forbidden:
  - name: project:dispatcher-no-pipeline
    severity: HIGH
    principle: layered-architecture-respect
    from: { path: "^src/dispatcher" }
    to: { path: "^src/pipeline" }
required: []
```

- [ ] **Step 13.2: Write failing tests**

`tests/helpers/validate-rules-patch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateRulesPatch } from '../../helpers/validate-rules-patch.ts'
import type { D9Index, ProjectRules } from '../../core/types.ts'

const d9: D9Index = {
  principles: { 'layered-architecture-respect': { id: 'layered-architecture-respect', name: 'l-a-r', description: '', fix_alternatives: [] } },
  fix_alternatives: { 'layered-architecture-respect': [] },
}
const emptyRules: ProjectRules = { forbidden: [], required: [] }

describe('validate-rules-patch', () => {
  it('passes valid patch', async () => {
    const r = await validateRulesPatch({ patchPath: 'tests/fixtures/sample-patch.yaml', projectRules: emptyRules, d9Index: d9 })
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.parsed_rules).toHaveLength(1)
  })

  it('rejects unknown principle', async () => {
    const d9NoPrinciple: D9Index = { principles: {}, fix_alternatives: {} }
    const r = await validateRulesPatch({ patchPath: 'tests/fixtures/sample-patch.yaml', projectRules: emptyRules, d9Index: d9NoPrinciple })
    expect(r.valid).toBe(false)
    expect(r.errors[0].message).toMatch(/principle/i)
  })

  it('rejects name collision with existing project rule', async () => {
    const collidingRules: ProjectRules = {
      forbidden: [{ name: 'project:dispatcher-no-pipeline', severity: 'LOW', principle: 'layered-architecture-respect' }],
      required: [],
    }
    const r = await validateRulesPatch({ patchPath: 'tests/fixtures/sample-patch.yaml', projectRules: collidingRules, d9Index: d9 })
    expect(r.valid).toBe(false)
    expect(r.errors[0].message).toMatch(/uniqueness|collision|exists/i)
  })

  it('returns structured result on parse failure (does not throw)', async () => {
    const r = await validateRulesPatch({ patchPath: 'tests/fixtures/nonexistent.yaml', projectRules: emptyRules, d9Index: d9 })
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 13.3: Run, FAIL**

- [ ] **Step 13.4: Implement helpers/validate-rules-patch.ts**

```typescript
import { readFile } from 'node:fs/promises'
import yaml from 'js-yaml'
import type { D9Index, ProjectRules, Rule, ValidationError } from '../core/types.ts'

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

  const allRules: Rule[] = [...(parsed?.forbidden ?? []), ...(parsed?.required ?? [])]
  const existingNames = new Set([...args.projectRules.forbidden, ...args.projectRules.required].map(r => r.name))

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
    for (const f of ['from', 'to'] as const) {
      const path = rule[f]?.path
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
```

- [ ] **Step 13.5: Run, PASS, commit**

```bash
npx vitest run tests/helpers/validate-rules-patch.test.ts
git add hi_flow/skills/arch-audit/helpers/validate-rules-patch.ts hi_flow/skills/arch-audit/tests/helpers/validate-rules-patch.test.ts hi_flow/skills/arch-audit/tests/fixtures/sample-patch.yaml
git commit -m "feat(arch-audit): validate-rules-patch helper"
```

---

## Task 14: `helpers/merge-rules-patch.ts`

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/merge-rules-patch.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/merge-rules-patch.test.ts`

Atomic ordering: merge → on success → archive. If merge fails, patch is left in place.

- [ ] **Step 14.1: Write failing tests**

`tests/helpers/merge-rules-patch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mkdtemp, copyFile, mkdir, access, readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { mergeRulesPatch } from '../../helpers/merge-rules-patch.ts'

describe('merge-rules-patch', () => {
  it('merges patch into project rules and archives the patch', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mp-'))
    const patchPath = join(dir, 'patch.yaml')
    await copyFile('tests/fixtures/sample-patch.yaml', patchPath)
    const archiveDir = join(dir, 'archive')
    const projectRulesPath = join(dir, '.audit-rules.yaml')

    const r = await mergeRulesPatch({ patchPath, projectRulesPath, archiveDir })

    expect(r.success).toBe(true)
    expect(r.rules_added).toBeGreaterThan(0)
    expect(r.archive_path).toContain('archive')

    // Patch is now at archive_path, original location no longer exists
    await expect(access(patchPath)).rejects.toThrow()
    await access(r.archive_path)

    // Project rules file contains the merged rule
    const merged = await readFile(projectRulesPath, 'utf-8')
    expect(merged).toMatch(/dispatcher-no-pipeline/)
  })

  it('returns success: false on write failure (patch stays in place)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mp-'))
    const patchPath = join(dir, 'patch.yaml')
    await copyFile('tests/fixtures/sample-patch.yaml', patchPath)
    // Force write fail by pointing at a path whose parent doesn't exist and can't be created
    const projectRulesPath = '/this/path/cannot/exist/.audit-rules.yaml'
    const archiveDir = join(dir, 'archive')

    const r = await mergeRulesPatch({ patchPath, projectRulesPath, archiveDir })
    expect(r.success).toBe(false)
    // Patch remains at original location
    await access(patchPath)
  })
})
```

- [ ] **Step 14.2: Run, FAIL**

- [ ] **Step 14.3: Implement helpers/merge-rules-patch.ts**

```typescript
import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises'
import { dirname, join, basename } from 'node:path'
import yaml from 'js-yaml'
import type { ProjectRules } from '../core/types.ts'

interface Args {
  patchPath: string
  projectRulesPath: string
  archiveDir: string
}

interface Result {
  success: boolean
  rules_added: number
  rules_updated: number
  archive_path: string
  error?: string
}

export async function mergeRulesPatch(args: Args): Promise<Result> {
  let patchYaml: string
  try {
    patchYaml = await readFile(args.patchPath, 'utf-8')
  } catch (e) {
    return { success: false, rules_added: 0, rules_updated: 0, archive_path: '', error: `cannot read patch: ${(e as Error).message}` }
  }
  const patch = yaml.load(patchYaml) as Partial<ProjectRules> | undefined

  let current: ProjectRules
  try {
    const existing = await readFile(args.projectRulesPath, 'utf-8')
    current = (yaml.load(existing) as ProjectRules) ?? { forbidden: [], required: [] }
  } catch {
    current = { forbidden: [], required: [] }
  }

  const added: { forbidden: number; required: number } = { forbidden: 0, required: 0 }
  const merged: ProjectRules = {
    forbidden: [...current.forbidden, ...(patch?.forbidden ?? [])],
    required: [...current.required, ...(patch?.required ?? [])],
    overrides: { ...current.overrides, ...(patch?.overrides ?? {}) },
  }
  added.forbidden = patch?.forbidden?.length ?? 0
  added.required = patch?.required?.length ?? 0

  // Step 1: merge — write project rules
  try {
    await mkdir(dirname(args.projectRulesPath), { recursive: true })
    await writeFile(args.projectRulesPath, yaml.dump(merged, { lineWidth: 120, noRefs: true }), 'utf-8')
  } catch (e) {
    // Merge failed; patch stays in place
    return { success: false, rules_added: 0, rules_updated: 0, archive_path: '', error: `write failed: ${(e as Error).message}` }
  }

  // Step 2: archive — only on merge success
  await mkdir(args.archiveDir, { recursive: true })
  const date = new Date().toISOString().slice(0, 10)
  const archivePath = join(args.archiveDir, `${date}-${basename(args.patchPath)}`)
  await rename(args.patchPath, archivePath)

  return {
    success: true,
    rules_added: added.forbidden + added.required,
    rules_updated: 0,
    archive_path: archivePath,
  }
}
```

- [ ] **Step 14.4: Run, PASS, commit**

```bash
npx vitest run tests/helpers/merge-rules-patch.test.ts
git add hi_flow/skills/arch-audit/helpers/merge-rules-patch.ts hi_flow/skills/arch-audit/tests/helpers/merge-rules-patch.test.ts
git commit -m "feat(arch-audit): merge-rules-patch helper with atomic ordering"
```

---

## Task 15: `helpers/regenerate-principles-index.ts` — standalone CLI

**Files:**
- Create: `hi_flow/skills/arch-audit/helpers/regenerate-principles-index.ts`
- Create: `hi_flow/skills/arch-audit/tests/helpers/regenerate-principles-index.test.ts`

Standalone utility — operator runs it after editing D9 markdown. Reads D9 .md, writes JSON index next to it. NOT part of any runtime flow.

- [ ] **Step 15.1: Write failing tests**

`tests/helpers/regenerate-principles-index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mkdtemp, copyFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { regeneratePrinciplesIndex } from '../../helpers/regenerate-principles-index.ts'

describe('regenerate-principles-index', () => {
  it('writes JSON index next to source markdown', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rpi-'))
    const mdPath = join(dir, 'd9.md')
    await copyFile('tests/fixtures/d9-sample.md', mdPath)

    const result = await regeneratePrinciplesIndex({ principlesMdPath: mdPath })
    expect(result.regenerated_count).toBe(2)

    const jsonContent = JSON.parse(await readFile(join(dir, 'd9-index.json'), 'utf-8'))
    expect(jsonContent.principles['acyclic-dependencies']).toBeDefined()

    await rm(dir, { recursive: true })
  })
})
```

- [ ] **Step 15.2: Run, FAIL**

- [ ] **Step 15.3: Implement helpers/regenerate-principles-index.ts**

```typescript
import { writeFile } from 'node:fs/promises'
import { dirname, join, basename } from 'node:path'
import { loadD9 } from '../core/d9-loader.ts'

interface Args {
  principlesMdPath: string
}

interface Result {
  regenerated_count: number
  index_path: string
}

export async function regeneratePrinciplesIndex(args: Args): Promise<Result> {
  const d9 = await loadD9(args.principlesMdPath)
  const dir = dirname(args.principlesMdPath)
  const stem = basename(args.principlesMdPath, '.md')
  const indexPath = join(dir, `${stem === 'architectural-principles' ? 'architectural-principles-index' : 'd9-index'}.json`)
  await writeFile(indexPath, JSON.stringify(d9, null, 2), 'utf-8')
  return { regenerated_count: Object.keys(d9.principles).length, index_path: indexPath }
}

// CLI entry: invoked via `npx tsx hi_flow/skills/arch-audit/helpers/regenerate-principles-index.ts <md-path>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2]
  if (!path) {
    console.error('Usage: regenerate-principles-index <md-path>')
    process.exit(1)
  }
  regeneratePrinciplesIndex({ principlesMdPath: path }).then(r => {
    console.log(`Regenerated ${r.regenerated_count} principles → ${r.index_path}`)
  }).catch(e => {
    console.error(`ERROR: ${e.message}`)
    process.exit(1)
  })
}
```

- [ ] **Step 15.4: Run, PASS, commit**

```bash
npx vitest run tests/helpers/regenerate-principles-index.test.ts
git add hi_flow/skills/arch-audit/helpers/regenerate-principles-index.ts hi_flow/skills/arch-audit/tests/helpers/regenerate-principles-index.test.ts
git commit -m "feat(arch-audit): regenerate-principles-index CLI helper"
```

---

## Task 16: `adapters/typescript-depcruise.ts` — adapter scaffolding + identity

**Files:**
- Create: `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts`
- Create: `hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts`

Adapter implements StackAdapter interface. This task creates scaffold + identity constants + identifyModules + detect. Structural detection methods come in Task 17.

- [ ] **Step 16.1: Write failing tests for identity + identifyModules**

`tests/adapters/typescript-depcruise.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('typescript-depcruise adapter — identity', () => {
  it('exposes constants', () => {
    const a = createTypescriptDepcruiseAdapter()
    expect(a.name).toBe('typescript-depcruise')
    expect(a.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(a.requiredTooling[0].name).toBe('dependency-cruiser')
    expect(a.requiredTooling[0].min).toBe('16.0.0')
    expect(a.requiredTooling[0].max).toBe('17.0.0')
  })

  it('layerNamingMap covers canonical layer names from baseline-rules', () => {
    const a = createTypescriptDepcruiseAdapter()
    expect(a.layerNamingMap['domain']).toBeDefined()
    expect(a.layerNamingMap['core']).toBe('domain')
    expect(a.layerNamingMap['infrastructure']).toBeDefined()
    expect(a.layerNamingMap['ports']).toBeDefined()
  })

  it('channelSdkList has the canonical SDKs', () => {
    const a = createTypescriptDepcruiseAdapter()
    expect(a.channelSdkList).toContain('telegraf')
    expect(a.channelSdkList).toContain('express')
    expect(a.channelSdkList).toContain('@slack/web-api')
  })
})

describe('typescript-depcruise adapter — identifyModules', () => {
  it('lists top-level subdirs of src/', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-'))
    await mkdir(join(dir, 'src/a'), { recursive: true })
    await mkdir(join(dir, 'src/b'), { recursive: true })
    await writeFile(join(dir, 'src/a/index.ts'), '')
    await writeFile(join(dir, 'src/b/index.ts'), '')

    const a = createTypescriptDepcruiseAdapter()
    const modules = await a.identifyModules(dir)
    expect(modules.map(m => m.name).sort()).toEqual(['a', 'b'])
    await rm(dir, { recursive: true })
  })

  it('hard-fails when src/ does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-'))
    const a = createTypescriptDepcruiseAdapter()
    await expect(a.identifyModules(dir)).rejects.toThrow(/src\//)
    await rm(dir, { recursive: true })
  })
})

describe('typescript-depcruise adapter — detect', () => {
  it('returns true for a TS project (has package.json + tsconfig.json)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-'))
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'tsconfig.json'), '{}')
    const a = createTypescriptDepcruiseAdapter()
    expect(await a.detect(dir)).toBe(true)
    await rm(dir, { recursive: true })
  })

  it('returns false when neither marker present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tda-'))
    const a = createTypescriptDepcruiseAdapter()
    expect(await a.detect(dir)).toBe(false)
    await rm(dir, { recursive: true })
  })
})
```

- [ ] **Step 16.2: Run, FAIL**

- [ ] **Step 16.3: Implement adapters/typescript-depcruise.ts (Part 1: identity + detect + identifyModules)**

```typescript
import { access, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolingRequirement } from '../core/types.ts'

export interface ModuleInfo {
  name: string
  path: string
}

export interface TypescriptDepcruiseAdapter {
  // Identity
  readonly name: string
  readonly version: string
  readonly requiredTooling: ToolingRequirement[]
  readonly testFilePatterns: string[]
  readonly channelSdkList: string[]
  readonly layerNamingMap: Record<string, string>
  readonly defaultModulePattern: string

  // Detection
  detect(projectPath: string): Promise<boolean>
  identifyModules(projectPath: string): Promise<ModuleInfo[]>
  identifyEntryPoints(projectPath: string): Promise<string[]>

  // Tooling reporting
  getToolingVersionString(): string
  setDetectedDepcruiseVersion(version: string): void
}

export function createTypescriptDepcruiseAdapter(): TypescriptDepcruiseAdapter {
  let detectedDepcruiseVersion = 'unknown'

  const layerNamingMap: Record<string, string> = {
    domain: 'domain',
    core: 'domain',
    business: 'domain',
    service: 'application',
    services: 'application',
    application: 'application',
    app: 'application',
    usecases: 'application',
    api: 'presentation',
    web: 'presentation',
    ui: 'presentation',
    presentation: 'presentation',
    interface: 'presentation',
    controllers: 'presentation',
    handlers: 'presentation',
    infra: 'infrastructure',
    infrastructure: 'infrastructure',
    gateway: 'infrastructure',
    gateways: 'infrastructure',
    persistence: 'infrastructure',
    repositories: 'infrastructure',
    repos: 'infrastructure',
    adapters: 'infrastructure',
    ports: 'domain',
  }

  const channelSdkList = [
    'node-telegram-bot-api', 'telegraf', 'grammy',
    'discord.js', 'eris',
    'express', 'fastify', 'koa', 'hapi', '@hapi/hapi', '@nestjs/core',
    '@slack/bolt', '@slack/web-api', 'whatsapp-web.js', '@adiwajshing/baileys', 'viber-bot', '@line/bot-sdk', 'twilio',
    'socket.io', 'ws',
    'nodemailer',
    'amqplib', 'kafkajs', '@aws-sdk/client-sqs', 'mqtt',
  ]

  return {
    name: 'typescript-depcruise',
    version: '1.0.0',
    requiredTooling: [{ name: 'dependency-cruiser', min: '16.0.0', max: '17.0.0' }],
    testFilePatterns: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx', '__tests__/**/*'],
    channelSdkList,
    layerNamingMap,
    defaultModulePattern: 'src/*/',

    async detect(projectPath: string): Promise<boolean> {
      try {
        await access(join(projectPath, 'package.json'))
        try {
          await access(join(projectPath, 'tsconfig.json'))
          return true
        } catch {
          return true // js-only also accepted
        }
      } catch {
        return false
      }
    },

    async identifyModules(projectPath: string): Promise<ModuleInfo[]> {
      const srcDir = join(projectPath, 'src')
      try {
        await access(srcDir)
      } catch {
        throw new Error(
          `'src/' не найдено в '${projectPath}'. Укажи корневую директорию модулей через overrides.module_pattern в .audit-rules.yaml (например, 'app/*/' или 'lib/*/').`,
        )
      }
      const entries = await readdir(srcDir)
      const modules: ModuleInfo[] = []
      for (const e of entries) {
        const fullPath = join(srcDir, e)
        const s = await stat(fullPath)
        if (s.isDirectory()) modules.push({ name: e, path: fullPath })
      }
      return modules
    },

    async identifyEntryPoints(projectPath: string): Promise<string[]> {
      // Default heuristic: src/index.ts, src/main.ts, src/cli.ts. Override via project rules later.
      const candidates = ['src/index.ts', 'src/main.ts', 'src/cli.ts']
      const found: string[] = []
      for (const c of candidates) {
        try {
          await access(join(projectPath, c))
          found.push(c)
        } catch {}
      }
      return found
    },

    getToolingVersionString(): string {
      return `${this.name} (${detectedDepcruiseVersion})`
    },

    setDetectedDepcruiseVersion(version: string): void {
      detectedDepcruiseVersion = version
    },
  }
}
```

- [ ] **Step 16.4: Run, PASS, commit**

```bash
npx vitest run tests/adapters/typescript-depcruise.test.ts
git add hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts
git commit -m "feat(arch-audit): typescript-depcruise adapter (identity + detect + identifyModules)"
```

---

## Task 17: Adapter — structural detection methods

**Files:**
- Modify: `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts`
- Modify: `hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts`

Add `detectStructural(projectPath, depGraph, perModuleRaw, projectRules)` method that produces RawFindings for: layered detection, hub/god-object, vertical-slice, channel-SDK. Algorithms per `references/baseline-rules.md`.

- [ ] **Step 17.1: Add structural detection tests**

Append to `tests/adapters/typescript-depcruise.test.ts`:

```typescript
describe('typescript-depcruise adapter — structural detection', () => {
  it('detects god-object when Ca>10 AND Ce>10 AND LOC>300', async () => {
    const a = createTypescriptDepcruiseAdapter()
    const findings = await a.detectStructural({
      projectPath: '/tmp/x',
      depGraph: {},
      perModuleRaw: { hub: { ca: 12, ce: 11, loc: 400 } },
      projectRules: { forbidden: [], required: [] },
    })
    expect(findings.some(f => f.rule_id === 'god-object')).toBe(true)
  })

  it('detects dependency-hub when Ca > max(20% N, 10)', async () => {
    const a = createTypescriptDepcruiseAdapter()
    const perModuleRaw: Record<string, { ca: number; ce: number; loc: number }> = {}
    for (let i = 0; i < 30; i++) perModuleRaw[`m${i}`] = { ca: 0, ce: 0, loc: 100 }
    perModuleRaw['hub'] = { ca: 12, ce: 5, loc: 100 }
    const findings = await a.detectStructural({
      projectPath: '/tmp/x',
      depGraph: {},
      perModuleRaw,
      projectRules: { forbidden: [], required: [] },
    })
    // 20% of 31 = 6.2, max(6.2, 10) = 10. hub.ca = 12 > 10 → fires
    expect(findings.some(f => f.rule_id === 'dependency-hub' && f.source.module === 'hub')).toBe(true)
  })

  it('detects high-fanout when Ce > 15', async () => {
    const a = createTypescriptDepcruiseAdapter()
    const findings = await a.detectStructural({
      projectPath: '/tmp/x',
      depGraph: {},
      perModuleRaw: { fanout: { ca: 0, ce: 16, loc: 100 } },
      projectRules: { forbidden: [], required: [] },
    })
    expect(findings.some(f => f.rule_id === 'high-fanout')).toBe(true)
  })
})
```

- [ ] **Step 17.2: Run new tests, FAIL**

- [ ] **Step 17.3: Extend adapter with detectStructural**

Add the following to the `TypescriptDepcruiseAdapter` interface (export):

```typescript
detectStructural(args: {
  projectPath: string
  depGraph: DepGraph
  perModuleRaw: Record<string, { ca: number; ce: number; loc: number }>
  projectRules: ProjectRules
}): Promise<RawFinding[]>
```

Add at top of file:

```typescript
import type { DepGraph, RawFinding, ProjectRules } from '../core/types.ts'
```

In the returned object, append method:

```typescript
async detectStructural(args): Promise<RawFinding[]> {
  const { projectPath, depGraph, perModuleRaw, projectRules } = args
  const findings: RawFinding[] = []
  const modules = Object.keys(perModuleRaw)
  const N = modules.length
  const hubThreshold = Math.max(0.2 * N, 10)

  for (const m of modules) {
    const { ca, ce, loc } = perModuleRaw[m]!

    // god-object
    if (ca > 10 && ce > 10 && loc > 300) {
      findings.push({
        rule_id: 'god-object',
        raw_severity: 'error',
        type: 'metric',
        source: { module: m, file: '' },
        target: { module: m, file: '' },
        extras: { ca, ce, loc },
      })
    }

    // dependency-hub
    if (ca > hubThreshold) {
      findings.push({
        rule_id: 'dependency-hub',
        raw_severity: 'error',
        type: 'metric',
        source: { module: m, file: '' },
        target: { module: m, file: '' },
        extras: { ca, threshold: hubThreshold },
      })
    }

    // high-fanout
    if (ce > 15) {
      findings.push({
        rule_id: 'high-fanout',
        raw_severity: 'warn',
        type: 'metric',
        source: { module: m, file: '' },
        target: { module: m, file: '' },
        extras: { ce },
      })
    }
  }

  // inappropriate-intimacy: 2-cycles in depGraph
  for (const [src, tgts] of Object.entries(depGraph)) {
    for (const tgt of tgts) {
      if (depGraph[tgt]?.includes(src) && src < tgt) {
        findings.push({
          rule_id: 'inappropriate-intimacy',
          raw_severity: 'error',
          type: 'cycle',
          source: { module: src, file: '' },
          target: { module: tgt, file: '' },
          extras: { cycle: [src, tgt] },
        })
      }
    }
  }

  // Layered detection
  const aliasMap = { ...this.layerNamingMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
  const detectedLayers = new Set<string>()
  for (const m of modules) {
    if (aliasMap[m]) detectedLayers.add(aliasMap[m])
  }
  if (detectedLayers.size >= 2) {
    // layer order: presentation → application → domain → infrastructure
    const order: Record<string, number> = { presentation: 1, application: 2, domain: 3, infrastructure: 4 }
    for (const [src, tgts] of Object.entries(depGraph)) {
      const srcLayer = aliasMap[src]
      if (!srcLayer) continue
      for (const tgt of tgts) {
        const tgtLayer = aliasMap[tgt]
        if (!tgtLayer) continue
        if ((order[srcLayer] ?? 99) > (order[tgtLayer] ?? 99)) {
          findings.push({
            rule_id: 'layered-respect',
            raw_severity: 'warn',
            type: 'layer-violation',
            source: { module: src, file: '' },
            target: { module: tgt, file: '' },
            extras: { source_layer: srcLayer, target_layer: tgtLayer },
          })
        }
      }
    }
    // architectural-layer-cycle: if cycle pair spans different layers
    for (const f of findings.filter(f => f.rule_id === 'inappropriate-intimacy')) {
      const sLayer = aliasMap[f.source.module]
      const tLayer = aliasMap[f.target.module]
      if (sLayer && tLayer && sLayer !== tLayer) {
        findings.push({
          rule_id: 'architectural-layer-cycle',
          raw_severity: 'error',
          type: 'cycle',
          source: f.source,
          target: f.target,
          extras: { layers: [sLayer, tLayer] },
        })
      }
    }
  }

  // channel-SDK: not implemented in v1 detectStructural — handled by depcruise rule directly
  // (resolves through dependency edges to known channel-SDK names; out of scope here).

  return findings
}
```

- [ ] **Step 17.4: Run, PASS, commit**

```bash
npx vitest run tests/adapters/typescript-depcruise.test.ts
git add hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts
git commit -m "feat(arch-audit): adapter detectStructural for god-object, hub, high-fanout, layered, layer-cycle"
```

---

## Task 18: `core/report-builder.ts` — orchestrator

**Files:**
- Create: `hi_flow/skills/arch-audit/core/report-builder.ts`
- Create: `hi_flow/skills/arch-audit/tests/core/report-builder.test.ts`

The orchestrator. Stitches everything together. LLM call for cluster prose is a hook the SKILL.md fills at runtime — in this pure code path, we accept a `clusterProsefn` injection (defaults to deterministic stub).

- [ ] **Step 18.1: Write failing test (smoke for orchestrator)**

`tests/core/report-builder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('report-builder', () => {
  it('produces audit-report.json + audit-report.md from a tiny synthetic project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rb-'))
    await mkdir(join(dir, 'src/a'), { recursive: true })
    await mkdir(join(dir, 'src/b'), { recursive: true })
    await writeFile(join(dir, 'package.json'), '{}')
    await writeFile(join(dir, 'tsconfig.json'), '{ "compilerOptions": {} }')
    await writeFile(join(dir, 'src/a/index.ts'), 'export const x = 1\n')
    await writeFile(join(dir, 'src/b/index.ts'), 'export const y = 2\n')

    const adapter = createTypescriptDepcruiseAdapter()
    const result = await buildReport(adapter, dir, {
      auditSha: 'uuid:test-sha',
      depcruiseVersion: '16.3.0',
      d9MdPath: 'tests/fixtures/d9-sample.md',
      clusterProsefn: () => ({ name: 'test cluster', root_cause: 'test cause' }),
    })

    await access(result.json_path)
    await access(result.md_path)
    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    expect(json.metadata.audit_sha).toBe('uuid:test-sha')
    expect(json.metadata.schema_version).toBe('1.1')
    expect(json.metrics.dep_graph).toBeDefined()
    expect(Array.isArray(json.findings)).toBe(true)

    await rm(dir, { recursive: true })
  })
})
```

Note: this test depends on `dependency-cruiser` actually executing on the synthetic project. Sonnet may need to either: (a) ensure dependency-cruiser is installed (`npm install -g dependency-cruiser`) and the test runs; (b) inject a mock depcruise runner via a `runDepcruise` injection point. **Recommended:** add `runDepcruise` as an injectable function in `BuildOpts`, defaulting to real `npx dependency-cruiser`. Test injects a mock that returns canned JSON.

- [ ] **Step 18.2: Run, FAIL**

- [ ] **Step 18.3: Implement core/report-builder.ts**

```typescript
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { execSync } from 'node:child_process'
import type { TypescriptDepcruiseAdapter } from '../adapters/typescript-depcruise.ts'
import type { D8AuditReport, Finding, SeverityCounts, ModuleMetrics } from './types.ts'
import { getBaselineRules } from './baseline-rules.ts'
import { loadProjectRules } from './project-rules.ts'
import { loadD9 } from './d9-loader.ts'
import { validateD8Report } from './d8-schema-validator.ts'
import { applySuppression } from './suppression.ts'
import { generateDepcruiseConfig } from '../helpers/generate-depcruise-config.ts'
import { parseDepcruiseOutput } from '../helpers/parse-depcruise-output.ts'
import { computeNCCD } from '../helpers/compute-nccd.ts'
import { enrichFindings } from '../helpers/enrich-findings.ts'
import { generateMermaid } from '../helpers/generate-mermaid.ts'

export interface BuildOpts {
  auditSha: string
  depcruiseVersion: string
  d9MdPath?: string
  clusterProsefn?: (clusterId: string, findings: Finding[]) => { name: string; root_cause: string }
  runDepcruise?: (configPath: string, srcPath: string) => string
  outDir?: string
}

export async function buildReport(
  adapter: TypescriptDepcruiseAdapter,
  projectRoot: string,
  opts: BuildOpts,
): Promise<{ json_path: string; md_path: string }> {
  const baselineRules = getBaselineRules()
  const projectRules = await loadProjectRules(projectRoot)
  const d9 = opts.d9MdPath ? await loadD9(opts.d9MdPath) : { principles: {}, fix_alternatives: {} }

  // Step 1-2: depcruise + parse + structural detection
  const configPath = await generateDepcruiseConfig({ baselineRules, projectRules, projectRoot })
  const runner = opts.runDepcruise ?? ((cfg: string, src: string) => {
    return execSync(`npx --yes dependency-cruiser --output-type json --config ${cfg} ${src}`, { cwd: projectRoot, encoding: 'utf-8' })
  })
  let depcruiseOut: string
  try {
    depcruiseOut = runner(configPath, 'src/')
  } catch (e: any) {
    depcruiseOut = e.stdout || ''
  }

  const parsed = parseDepcruiseOutput(depcruiseOut)
  const structural = await adapter.detectStructural({
    projectPath: projectRoot,
    depGraph: parsed.dep_graph,
    perModuleRaw: parsed.per_module_raw,
    projectRules,
  })

  // Step 3: NCCD
  const nccd = computeNCCD(parsed.dep_graph)
  const nccd_threshold = projectRules.overrides?.nccd_threshold ?? 1.0

  // Step 4: enrich
  let findings = enrichFindings({
    rawFindings: [...parsed.findings, ...structural],
    baselineRules,
    projectRules,
  })

  // Step 5: suppression
  findings = applySuppression(findings)

  // Step 7: cluster grouping by reason.principle (deterministic)
  const clusters = new Map<string, Finding[]>()
  for (const f of findings) {
    const key = f.reason.principle
    if (!clusters.has(key)) clusters.set(key, [])
    clusters.get(key)!.push(f)
  }

  // Cluster prose (LLM hook)
  const clusterProse = opts.clusterProsefn ?? ((id: string) => ({ name: id, root_cause: '' }))

  // Per-module metrics
  const per_module: Record<string, ModuleMetrics> = {}
  for (const [m, raw] of Object.entries(parsed.per_module_raw)) {
    const I = raw.ca + raw.ce === 0 ? 0 : raw.ce / (raw.ca + raw.ce)
    per_module[m] = { Ca: raw.ca, Ce: raw.ce, I, LOC: raw.loc }
  }

  // Severity counts
  const severity_counts: SeverityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const f of findings) severity_counts[f.severity]++

  // Step 8: tooling version
  adapter.setDetectedDepcruiseVersion(opts.depcruiseVersion)

  // Assemble D8 report
  const report: D8AuditReport = {
    metadata: {
      audit_sha: opts.auditSha,
      audit_timestamp: new Date().toISOString(),
      audit_tooling_version: adapter.getToolingVersionString(),
      schema_version: '1.1',
    },
    findings,
    metrics: {
      per_module,
      nccd,
      nccd_threshold,
      severity_counts,
      dep_graph: parsed.dep_graph,
    },
  }

  // Step 9: validate
  const validation = validateD8Report(report)
  if (!validation.valid) {
    throw new Error(`D8 schema validation failed:\n${validation.errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`)
  }

  // Step 10: Mermaid
  const mermaid = generateMermaid(report)

  // Step 11-12: write artifacts
  const outDir = opts.outDir ?? join(projectRoot, 'audit-report')
  await mkdir(outDir, { recursive: true })
  const json_path = join(outDir, 'audit-report.json')
  const md_path = join(outDir, 'audit-report.md')

  await writeFile(json_path, JSON.stringify(report, null, 2), 'utf-8')

  // Build markdown — minimal v1: assemble template inline. Sonnet replaces with template-driven later if needed.
  const md = renderMarkdownReport(report, mermaid, clusters, clusterProse, d9)
  await writeFile(md_path, md, 'utf-8')

  return { json_path, md_path }
}

function renderMarkdownReport(
  report: D8AuditReport,
  mermaid: ReturnType<typeof generateMermaid>,
  clusters: Map<string, Finding[]>,
  clusterProse: (id: string, fs: Finding[]) => { name: string; root_cause: string },
  d9: { fix_alternatives: Record<string, string[]> },
): string {
  const lines: string[] = []
  lines.push(`# Audit Report`)
  lines.push('')
  lines.push(`**Date:** ${report.metadata.audit_timestamp}`)
  lines.push(`**Audit SHA:** \`${report.metadata.audit_sha}\``)
  lines.push(`**Stack:** ${report.metadata.audit_tooling_version}`)
  lines.push(`**Total modules:** ${Object.keys(report.metrics.dep_graph).length}`)
  lines.push('')
  if (report.metadata.parsing_errors?.length) {
    lines.push(`> **Warning: depcruise не смог распарсить ${report.metadata.parsing_errors.length} файлов.** Метрики и findings ниже считаны на partial графе — возможны пропуски.`)
    lines.push('')
  }
  lines.push(`## Severity roll-up`)
  lines.push('')
  lines.push(`| Severity | Count |`)
  lines.push(`|---|---:|`)
  for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const) {
    lines.push(`| ${sev} | ${report.metrics.severity_counts[sev]} |`)
  }
  lines.push('')
  lines.push(`**NCCD:** ${report.metrics.nccd.toFixed(2)} (threshold ${report.metrics.nccd_threshold})`)
  lines.push('')
  if (mermaid.overall) {
    lines.push(`## Project Dependency Graph`)
    lines.push('')
    lines.push('```mermaid')
    lines.push(mermaid.overall)
    lines.push('```')
    lines.push('')
  } else {
    lines.push(`## Project Dependency Graph`)
    lines.push('')
    lines.push(`Module count exceeds 25 — overall diagram skipped. Per-cluster diagrams below.`)
    lines.push('')
  }
  lines.push(`## Findings (${report.findings.length})`)
  lines.push('')
  for (const f of report.findings) {
    lines.push(`### ${f.id} — ${f.rule_id} (${f.severity})`)
    lines.push(`**Source → Target:** \`${f.source.module}\` → \`${f.target.module}\``)
    lines.push(`**Reason:** ${f.reason.principle} — ${f.reason.explanation}`)
    lines.push('')
  }
  lines.push(`## Cluster suggestions`)
  lines.push('')
  for (const [principleId, fs] of clusters) {
    const prose = clusterProse(principleId, fs)
    lines.push(`### ${prose.name} (${fs.length} findings)`)
    lines.push(`**Root cause:** ${prose.root_cause}`)
    const alts = d9.fix_alternatives[principleId] ?? []
    if (alts.length) {
      lines.push(`**Fix alternatives:**`)
      for (const a of alts) lines.push(`- ${a}`)
    }
    const cKey = `cluster-${principleId}`
    if (mermaid.clusters[cKey]) {
      lines.push('')
      lines.push('```mermaid')
      lines.push(mermaid.clusters[cKey])
      lines.push('```')
    }
    lines.push('')
  }
  return lines.join('\n')
}
```

- [ ] **Step 18.4: Run, PASS, commit**

```bash
npx vitest run tests/core/report-builder.test.ts
git add hi_flow/skills/arch-audit/core/report-builder.ts hi_flow/skills/arch-audit/tests/core/report-builder.test.ts
git commit -m "feat(arch-audit): core/report-builder orchestrator"
```

---

## Task 19: Integration test — cycle scenario

**Files:**
- Create: `hi_flow/skills/arch-audit/tests/integration/cycle-project.test.ts`
- Create fixture: `hi_flow/skills/arch-audit/tests/fixtures/cycle-project/{package.json,tsconfig.json,src/a/index.ts,src/b/index.ts}`

- [ ] **Step 19.1: Create cycle fixture project**

```bash
mkdir -p tests/fixtures/cycle-project/src/a tests/fixtures/cycle-project/src/b
```

`tests/fixtures/cycle-project/package.json`:
```json
{ "name": "cycle-fixture", "version": "0.0.0", "private": true }
```

`tests/fixtures/cycle-project/tsconfig.json`:
```json
{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "strict": true } }
```

`tests/fixtures/cycle-project/src/a/index.ts`:
```typescript
import { fromB } from '../b/index.ts'
export const fromA = () => fromB() + 1
```

`tests/fixtures/cycle-project/src/b/index.ts`:
```typescript
import { fromA } from '../a/index.ts'
export const fromB = () => fromA() + 1
```

- [ ] **Step 19.2: Write integration test**

`tests/integration/cycle-project.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir } from 'node:fs/promises'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('integration: cycle project', () => {
  it('produces audit-report.json with inappropriate-intimacy or no-circular finding', async () => {
    const projectRoot = join(process.cwd(), 'tests/fixtures/cycle-project')
    const outDir = join(projectRoot, 'audit-report')
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const adapter = createTypescriptDepcruiseAdapter()
    const result = await buildReport(adapter, projectRoot, {
      auditSha: 'uuid:cycle-test',
      depcruiseVersion: '16.3.0',
      outDir,
    })

    const json = JSON.parse(await import('node:fs/promises').then(fs => fs.readFile(result.json_path, 'utf-8')))
    const ruleIds = json.findings.map((f: any) => f.rule_id)
    const hasCycleFinding = ruleIds.includes('baseline:no-circular') || ruleIds.includes('baseline:inappropriate-intimacy')
    expect(hasCycleFinding).toBe(true)
  }, 60_000)
})
```

- [ ] **Step 19.3: Run integration test**

```bash
npx vitest run tests/integration/cycle-project.test.ts
```

Expected: PASS (requires depcruise installed; if missing, install via `npm install -g dependency-cruiser`).

- [ ] **Step 19.4: Commit**

```bash
git add hi_flow/skills/arch-audit/tests/integration/cycle-project.test.ts hi_flow/skills/arch-audit/tests/fixtures/cycle-project/
git commit -m "test(arch-audit): integration test for cycle scenario"
```

---

## Task 20: Integration test — god-object scenario

**Files:**
- Create: fixture project with one fat module
- Create: `tests/integration/god-object-project.test.ts`

- [ ] **Step 20.1: Create god-object fixture**

```bash
mkdir -p tests/fixtures/god-object-project/src/{god,a,b,c,d,e,f,g,h,i,j,k}
```

Create one file per module in `src/<name>/index.ts`. The `god` module imports from all others (`a` through `k`) AND has 350+ LOC; sibling modules each import from `god`. This produces Ca>10, Ce>10, LOC>300.

`tests/fixtures/god-object-project/src/god/index.ts`:
```typescript
import { a } from '../a/index.ts'
import { b } from '../b/index.ts'
import { c } from '../c/index.ts'
import { d } from '../d/index.ts'
import { e } from '../e/index.ts'
import { f } from '../f/index.ts'
import { g } from '../g/index.ts'
import { h } from '../h/index.ts'
import { i } from '../i/index.ts'
import { j } from '../j/index.ts'
import { k } from '../k/index.ts'

// 350+ LOC of intentionally bloated logic — generate via Node script, see Step 20.1.5 below
export const fatFunction = () => {
  return [a, b, c, d, e, f, g, h, i, j, k].length
}
```

- [ ] **Step 20.1.5: Generate the bloated `god/index.ts` body**

After creating the basic file, run this script from the skill dir to pad LOC > 300:

```bash
node -e "
const fs = require('fs');
const path = 'tests/fixtures/god-object-project/src/god/index.ts';
const orig = fs.readFileSync(path, 'utf-8');
const padding = Array.from({length: 320}, (_, i) => \`const _filler\${i} = \${i};\`).join('\n');
fs.writeFileSync(path, orig + '\n' + padding + '\n');
"
wc -l tests/fixtures/god-object-project/src/god/index.ts
```

Expected: file has 320+ lines, depcruise reports LOC > 300 for `god` module.

Each `src/<x>/index.ts` (where x is a-k):
```typescript
import { fatFunction } from '../god/index.ts'
export const a = () => fatFunction()  // adjust export name per module
```

- [ ] **Step 20.2: Write integration test**

`tests/integration/god-object-project.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { readFile, rm, mkdir } from 'node:fs/promises'
import { buildReport } from '../../core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from '../../adapters/typescript-depcruise.ts'

describe('integration: god-object project', () => {
  it('produces a god-object finding', async () => {
    const projectRoot = join(process.cwd(), 'tests/fixtures/god-object-project')
    const outDir = join(projectRoot, 'audit-report')
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })

    const adapter = createTypescriptDepcruiseAdapter()
    const result = await buildReport(adapter, projectRoot, {
      auditSha: 'uuid:god-test',
      depcruiseVersion: '16.3.0',
      outDir,
    })

    const json = JSON.parse(await readFile(result.json_path, 'utf-8'))
    const godFinding = json.findings.find((f: any) => f.rule_id === 'baseline:god-object')
    expect(godFinding).toBeDefined()
    expect(godFinding.source.module).toBe('god')
  }, 60_000)
})
```

- [ ] **Step 20.3: Run, PASS, commit**

```bash
npx vitest run tests/integration/god-object-project.test.ts
git add hi_flow/skills/arch-audit/tests/integration/god-object-project.test.ts hi_flow/skills/arch-audit/tests/fixtures/god-object-project/
git commit -m "test(arch-audit): integration test for god-object scenario"
```

---

## Task 21: Run all tests + manual smoke on Zhenka

- [ ] **Step 21.1: Run full test suite**

```bash
npm run typecheck
npm run test
```

Expected: typecheck PASS, all unit + integration tests PASS.

- [ ] **Step 21.2: Manual smoke prep**

Identify a real TypeScript project on operator's machine (Zhenka or equivalent). Confirm with operator the path. Ensure dependency-cruiser is installed (`npx --yes dependency-cruiser --version` should print 16.x.y).

- [ ] **Step 21.3: Run audit on real project**

Operator runs (or Sonnet runs with operator approval):

```bash
cd hi_flow/skills/arch-audit
npx tsx -e "
import { buildReport } from './core/report-builder.ts'
import { createTypescriptDepcruiseAdapter } from './adapters/typescript-depcruise.ts'
import { execSync } from 'node:child_process'

const projectRoot = '<ABSOLUTE-PATH-TO-ZHENKA>'
const sha = execSync('git -C ' + projectRoot + ' rev-parse HEAD').toString().trim()
const ver = execSync('npx --no-install dependency-cruiser --version').toString().match(/(\\d+\\.\\d+\\.\\d+)/)?.[1] ?? 'unknown'

buildReport(createTypescriptDepcruiseAdapter(), projectRoot, {
  auditSha: sha,
  depcruiseVersion: ver,
  d9MdPath: '../../references/architectural-principles.md',
}).then(r => console.log('Done:', r))
"
```

- [ ] **Step 21.4: Operator review**

Open generated `audit-report.md` in Cursor/VS Code with Mermaid extension. Compare against `examples/zhenka-audit-report-mock.md` for visual sanity. Verify:
- Severity counts plausible
- Cycles correctly flagged
- Mermaid diagrams render
- No emoji, no operator-local paths leaked, no placeholder text

If issues — file as bugs and iterate; don't close session until operator approves.

- [ ] **Step 21.5: Final commit**

```bash
git add hi_flow/skills/arch-audit/
git commit -m "feat(arch-audit): v1 implementation complete (boevoy run on Zhenka)"
```

- [ ] **Step 21.6: Implementation report**

Per global CLAUDE.md ("Отчёт о реализации спеки"), write `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-impl-spec-report.md`:

```markdown
# Implementation Report: arch-audit v1

**Spec:** docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-impl-spec.md
**Date:** YYYY-MM-DD
**Status:** completed | partial | blocked

## What was done
- [list of completed tasks 0-21]

## Deviations from spec
- helper #5 apply-suppression consolidated into core/suppression.ts (one fewer file).
- [other deviations or "None"]

## Issues discovered
- [problems found in spec during implementation, or "None"]

## Open items
- [unfinished tasks, or "None"]
```

Commit:
```bash
git add docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-impl-spec-report.md
git commit -m "docs(arch-audit): implementation report"
```

---

## Self-review (engineer's checklist before marking plan complete)

- [ ] All 14 baseline rules implemented in core/baseline-rules.ts and detected by adapter or depcruise.
- [ ] D8 schema 1.1 validates the produced audit-report.json.
- [ ] No emoji anywhere in code, tests, or generated output.
- [ ] No `<placeholder>` / TODO / TBD in generated audit-report.md.
- [ ] All commits authored with conventional commit prefix (`feat:`, `test:`, `docs:`).
- [ ] Manual smoke on real project passed operator review.
- [ ] Implementation report written and committed.
