# Frontend Coverage Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the React front-end stack `covered` in the hi_flow coverage-manifest by adding horizontal layered audit rules + a glob widening + a React scaffold-template.

**Architecture:** Two new conditional rules (`frontend-layered-respect` MEDIUM, `frontend-layer-cycle` CRITICAL) implemented as an imperative block in the depcruise adapter's `detectStructural()`, mirroring the existing backend layered block but with a frontend layer vocabulary + a run-level frontend/backend profile switch. A one-line scan-glob widening makes `.tsx` visible. A new `scaffold-templates/react/` convention pattern. Manifest flips both `absent-pending` fields to `present`.

**Tech Stack:** TypeScript (Node, vitest), dependency-cruiser, markdown.

**Spec:** `docs/superpowers/specs/2026-06-05-hi_flow-frontend-coverage-completion-design.md` (rev. 2).

**Working dir:** `hi_flow/skills/arch-audit/` for Tasks 1-5, 7; `hi_flow/skills/bootstrap/` for Tasks 6-7.

**Autonomous-mode note:** detectStructural unit tests (Tasks 1-2) run via `npx vitest run` with NO depcruise binary. The glob change (Task 3) and the integration suite are binary-gated — verify in an environment with `dependency-cruiser` present; do not block on it (spec §4.7 caveat). Do not run `npm install` (ask-listed) — use the existing toolchain.

---

## Task 1: Registry — types + 2 baseline rules

**Files:**
- Modify: `hi_flow/skills/arch-audit/core/types.ts:82-86` (ConditionalTrigger union)
- Modify: `hi_flow/skills/arch-audit/core/baseline-rules.ts:81-121` (Layer C section: comment + 2 entries)
- Test: `hi_flow/skills/arch-audit/tests/core/baseline-rules.test.ts:5-7`

- [ ] **Step 1: Update the existing length guard to fail**

In `tests/core/baseline-rules.test.ts`, change the count assertion and title:

```ts
  it('returns 17 baseline rules', () => {
    expect(rules).toHaveLength(17)
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/core/baseline-rules.test.ts`
Expected: FAIL — received length 15, expected 17.

- [ ] **Step 3: Extend the ConditionalTrigger union**

In `core/types.ts`, add the frontend variant:

```ts
export type ConditionalTrigger =
  | { kind: 'layered_detected'; layers_min: number }
  | { kind: 'frontend_layered_detected'; layers_min: number }
  | { kind: 'feature_folders_detected' }
  | { kind: 'domain_detected' }
  | { kind: 'always' }
```

- [ ] **Step 4: Add the 2 baseline rules + bump the inline count comment**

In `core/baseline-rules.ts`, change the Layer C comment and append two entries inside the `RULES` array (after `vertical-slice-respect`, before the closing `]`):

```ts
  // === Layer C — conditional structural (7) ===
```

```ts
  {
    id: 'baseline:frontend-layered-respect',
    name: 'frontend-layered-respect',
    principle: 'layered-architecture-respect',
    severity: 'MEDIUM',
    conditional: { kind: 'frontend_layered_detected', layers_min: 2 },
    explanation: 'Frontend import violates layer direction ({source_layer} → {target_layer}) — imports must go downward (pages → features → components → hooks → data-access → lib).',
  },
  {
    id: 'baseline:frontend-layer-cycle',
    name: 'frontend-layer-cycle',
    principle: 'layered-architecture-respect',
    severity: 'CRITICAL',
    conditional: { kind: 'frontend_layered_detected', layers_min: 2 },
    explanation: 'Cycle between frontend layers ({layers}) — fundamental layered violation.',
  },
```

- [ ] **Step 5: Run to verify the length test passes**

Run: `npx vitest run tests/core/baseline-rules.test.ts`
Expected: PASS (17 rules).

- [ ] **Step 6: Commit**

```bash
git add hi_flow/skills/arch-audit/core/types.ts hi_flow/skills/arch-audit/core/baseline-rules.ts hi_flow/skills/arch-audit/tests/core/baseline-rules.test.ts
git commit -m "feat(arch-audit): register frontend layered baseline rules"
```

---

## Task 2: Frontend detection block in detectStructural

**Files:**
- Modify: `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts:205-265` (insert frontend profile + block; wrap backend layered + port-adapter in `!isFrontendProfile`)
- Test: `hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts` (append a `describe`)

- [ ] **Step 1: Write the failing tests**

Append to `tests/adapters/typescript-depcruise.test.ts`:

```ts
describe('typescript-depcruise adapter — frontend layered detection', () => {
  const fe = (depGraph: Record<string, string[]>, names: string[]) => {
    const perModuleRaw: Record<string, { ca: number; ce: number; loc: number }> = {}
    for (const n of names) perModuleRaw[n] = { ca: 1, ce: 1, loc: 50 }
    return createTypescriptDepcruiseAdapter().detectStructural({
      projectPath: '/tmp/x', depGraph, perModuleRaw, projectRules: { forbidden: [], required: [] },
    })
  }

  it('flags an upward import (component → page) as frontend-layered-respect', async () => {
    const findings = await fe(
      { components: ['pages'], pages: [], hooks: [], lib: [] },
      ['components', 'pages', 'hooks', 'lib'],
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect'
      && f.source.module === 'components' && f.target?.module === 'pages')).toBe(true)
    // backend layered rule must be skipped in a frontend profile
    expect(findings.some(f => f.rule_id === 'layered-respect')).toBe(false)
  })

  it('passes a clean downward chain (pages → components → hooks → lib)', async () => {
    const findings = await fe(
      { pages: ['components'], components: ['hooks'], hooks: ['lib'], lib: [] },
      ['pages', 'components', 'hooks', 'lib'],
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })

  it('flags a frontend layer cycle (components ↔ hooks) as CRITICAL frontend-layer-cycle', async () => {
    const findings = await fe(
      { components: ['hooks'], hooks: ['components'], pages: [], lib: [] },
      ['components', 'hooks', 'pages', 'lib'],
    )
    expect(findings.some(f => f.rule_id === 'frontend-layer-cycle')).toBe(true)
  })

  it('does NOT emit a false app → api violation in a frontend profile', async () => {
    // app/ and api/ are in the BACKEND map (application / presentation); under the
    // backend layered rule app→api would be order 2>1 = violation. In a frontend
    // profile app=pages(1), api=data-access(5): 1>5 false → no violation.
    const findings = await fe(
      { app: ['api'], api: [], components: [], hooks: [] },
      ['app', 'api', 'components', 'hooks'],
    )
    expect(findings.some(f => f.rule_id === 'layered-respect')).toBe(false)
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })

  it('leaves a backend project on the backend layered rule (no frontend signal dirs)', async () => {
    const findings = await fe(
      { infrastructure: ['domain'], domain: [] },
      ['infrastructure', 'domain'],
    )
    expect(findings.some(f => f.rule_id === 'layered-respect')).toBe(true)
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/adapters/typescript-depcruise.test.ts`
Expected: the 5 new tests FAIL (frontend rules not emitted; backend layered-respect still fires in frontend cases).

- [ ] **Step 3: Implement the profile + frontend block, gate the backend blocks**

In `adapters/typescript-depcruise.ts`, replace the existing layered + port-adapter region (lines 205-265, from `// Layered detection` through the end of the port-adapter loop) with:

```ts
      // Frontend vs backend profile (run-level — no subtree model; module = flat top-level dir).
      const FRONTEND_SIGNAL_DIRS = ['components', 'hooks', 'pages', 'features']
      const isFrontendProfile = modules.filter(m => FRONTEND_SIGNAL_DIRS.includes(m)).length >= 2

      // Layered detection (backend) — skipped in a frontend profile (its layer map would
      // mis-classify api/app/services and emit false positives; see spec §4.5).
      const aliasMap = { ...layerNamingMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
      const detectedLayers = new Set<string>()
      for (const m of modules) {
        if (aliasMap[m]) detectedLayers.add(aliasMap[m])
      }
      if (!isFrontendProfile && detectedLayers.size >= 2) {
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
                type: 'boundary',
                source: { module: src, file: '' },
                target: { module: tgt, file: '' },
                extras: { source_layer: srcLayer, target_layer: tgtLayer },
              })
            }
          }
        }
        for (const f of findings.filter(f => f.rule_id === 'inappropriate-intimacy')) {
          if (!f.target) continue
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

      // Frontend layered detection — horizontal direction (pages→features→components→hooks→data-access→lib).
      if (isFrontendProfile) {
        const frontendLayerMap: Record<string, string> = {
          pages: 'pages', routes: 'pages', app: 'pages',
          features: 'features',
          components: 'components',
          hooks: 'hooks', store: 'hooks',
          api: 'data-access', services: 'data-access',
          lib: 'lib', shared: 'lib', utils: 'lib',
        }
        const frontendOrder: Record<string, number> = {
          pages: 1, features: 2, components: 3, hooks: 4, 'data-access': 5, lib: 6,
        }
        const feAlias = { ...frontendLayerMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
        for (const [src, tgts] of Object.entries(depGraph)) {
          const srcLayer = feAlias[src]
          if (!srcLayer) continue
          for (const tgt of tgts) {
            const tgtLayer = feAlias[tgt]
            if (!tgtLayer) continue
            if ((frontendOrder[srcLayer] ?? 99) > (frontendOrder[tgtLayer] ?? 99)) {
              findings.push({
                rule_id: 'frontend-layered-respect',
                raw_severity: 'warn',
                type: 'boundary',
                source: { module: src, file: '' },
                target: { module: tgt, file: '' },
                extras: { source_layer: srcLayer, target_layer: tgtLayer },
              })
            }
          }
        }
        for (const f of findings.filter(f => f.rule_id === 'inappropriate-intimacy')) {
          if (!f.target) continue
          const sLayer = feAlias[f.source.module]
          const tLayer = feAlias[f.target.module]
          if (sLayer && tLayer && sLayer !== tLayer) {
            findings.push({
              rule_id: 'frontend-layer-cycle',
              raw_severity: 'error',
              type: 'cycle',
              source: f.source,
              target: f.target,
              extras: { layers: [sLayer, tLayer] },
            })
          }
        }
      }

      // port-adapter-direction: domain imports infrastructure directly — backend only.
      const aliasMap2 = { ...layerNamingMap, ...(projectRules.overrides?.layer_aliases ?? {}) }
      if (!isFrontendProfile) {
        for (const [src, tgts] of Object.entries(depGraph)) {
          if (aliasMap2[src] !== 'domain') continue
          for (const tgt of tgts) {
            if (aliasMap2[tgt] === 'infrastructure') {
              findings.push({
                rule_id: 'port-adapter-direction',
                raw_severity: 'warn',
                type: 'boundary',
                source: { module: src, file: '' },
                target: { module: tgt, file: '' },
                extras: {},
              })
            }
          }
        }
      }
```

Note: `aliasMap2` is still declared (the `domain-no-channel-sdk` loop below it uses it) — leave that loop unchanged, it stays on in both profiles.

- [ ] **Step 4: Run to verify all adapter tests pass**

Run: `npx vitest run tests/adapters/typescript-depcruise.test.ts`
Expected: PASS (5 new + all existing, incl. the existing port-adapter/domain-sdk tests which use backend dirs → backend profile → unchanged).

- [ ] **Step 5: Run the full unit suite for regression**

Run: `npx vitest run` (integration tests needing the depcruise binary may be red environmentally — see autonomous note; unit/component must be green).
Expected: no NEW unit failures vs. the pre-change baseline.

- [ ] **Step 6: Commit**

```bash
git add hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts
git commit -m "feat(arch-audit): frontend horizontal layered rules + profile switch"
```

---

## Task 3: Glob widening (binary-gated)

**Files:**
- Modify: `hi_flow/skills/arch-audit/core/report-builder.ts:73`

- [ ] **Step 1: Widen the scan glob**

```ts
  const depcruiseOut = runner(configPath, 'src/**/*.{ts,tsx}')
```

(depcruise globs the arg internally with brace support, so this is cross-platform; the shell does not need to brace-expand.)

- [ ] **Step 2: Run the unit suite (no regression in non-integration tests)**

Run: `npx vitest run`
Expected: unit/component green; integration unchanged (binary-gated).

- [ ] **Step 3: Note binary-env verification**

Record in the implementation report: the glob's effect on `.tsx` scanning must be verified in an environment with `dependency-cruiser` present (run a React fixture / a real frontend project through `cli-run-audit`); this could not be exercised autonomously.

- [ ] **Step 4: Commit**

```bash
git add hi_flow/skills/arch-audit/core/report-builder.ts
git commit -m "feat(arch-audit): scan .tsx (frontend precondition)"
```

---

## Task 4: Document the rules — baseline-rules.md

**Files:**
- Modify: `hi_flow/skills/arch-audit/references/baseline-rules.md`

- [ ] **Step 1: Bump every count restatement**

- `:13` "15 правил" → "17 правил"; "Слой C — conditional structural (5 правил)" → "(7 правил)".
- `:17` / `:107` Layer C header "(5)" → "(7)".
- `:191` "CRITICAL: 1" → "CRITICAL: 2 (architectural-layer-cycle, frontend-layer-cycle)".
- `:193` "MEDIUM: 7" → "MEDIUM: 8" (add frontend-layered-respect).
- Distribution prose totals consistent with 17.

- [ ] **Step 2: Add two rule sections in Слой C**

Add after `vertical-slice-respect`:

```markdown
### `frontend-layered-respect`
- **Principle:** `layered-architecture-respect`
- **Detection:** custom (adapter) — applies when the run is **frontend-profiled** (≥2 of `components/`, `hooks/`, `pages/`, `features/` present). Frontend layer order (top→bottom, imports allowed downward): `pages → features → components → hooks → (api/services = data-access) → lib`. Aliases: `routes→pages`, `app→pages` (frontend profile only), `store→hooks`, `shared`/`utils→lib`.
- **Profile mutual-exclusion:** in a frontend-profiled run the backend layered rules (`layered-respect`, `port-adapter-direction`, `architectural-layer-cycle`) are skipped — the backend map would mis-classify `api`/`app`/`services` and emit false positives.
- **What:** an upward / layer-skipping frontend import.
- **Severity:** MEDIUM.

### `frontend-layer-cycle`
- **Principle:** `layered-architecture-respect` (escalation)
- **Detection:** custom — frontend-profiled; derived by filtering `inappropriate-intimacy` 2-cycles whose modules fall in two different frontend layers (mirrors `architectural-layer-cycle`).
- **What:** a cycle between two frontend layers.
- **Severity:** CRITICAL.
```

- [ ] **Step 3: Add both rules to the Suppression precedence list**

In § Suppression precedence: add `frontend-layered-respect` to the MEDIUM tier and `frontend-layer-cycle` to the CRITICAL tier (descriptive only — `core/suppression.ts` is edge+severity-based and needs no code change).

- [ ] **Step 4: Commit**

```bash
git add hi_flow/skills/arch-audit/references/baseline-rules.md
git commit -m "docs(arch-audit): document frontend layered rules + counts"
```

---

## Task 5: Sync SKILL.md (count + detection narrative)

**Files:**
- Modify: `hi_flow/skills/arch-audit/SKILL.md`

- [ ] **Step 1: Bump the count at `:433`**

"3 built-in + 7 universal custom + 5 conditional structural = 15 rules" → "... + 7 conditional structural = 17 rules".

- [ ] **Step 2: Sync the detection narrative**

- `:154` (layer-name closed list) — note that a **second, frontend** layer vocabulary exists, applied when the run is frontend-profiled.
- `:164-165` (suppression precedence rule-list) — add the 2 new rules.
- `:151` (the "detection lives in core/, adapter supplies constants" line) — leave a one-line note that frontend layer logic, like the backend layered logic, currently lives in the adapter (pre-existing core/adapter divergence; not moved in this scope).

- [ ] **Step 3: Commit**

```bash
git add hi_flow/skills/arch-audit/SKILL.md
git commit -m "docs(arch-audit): SKILL.md sync for frontend rules"
```

---

## Task 6: React scaffold-template

**Files:**
- Create: `hi_flow/skills/bootstrap/references/scaffold-templates/react/README.md`
- Create: `hi_flow/skills/bootstrap/references/scaffold-templates/react/src/components/ExampleCard/ExampleCard.tsx`
- Create: `.../react/src/components/ExampleCard/ExampleCard.test.tsx`
- Create: `.../react/src/hooks/useExampleToggle.ts`
- Create: `.../react/src/hooks/useExampleToggle.test.ts`
- Create: `.../react/src/lib/clamp.ts`
- Create: `.../react/src/lib/clamp.test.ts`

- [ ] **Step 1: `lib/clamp.ts`** (kebab-case, named export, leaf — no internal imports)

```ts
// Convention reference pattern (generic, non-domain). Demonstrates the `lib/` leaf layer:
// pure utility, kebab-case file, NAMED export, explicit public-API types. Deletable without loss.
export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new Error('clamp: min must not be greater than max')
  if (value < min) return min
  if (value > max) return max
  return value
}
```

- [ ] **Step 2: `lib/clamp.test.ts`** (co-located — the React stack convention)

```ts
import { describe, it, expect } from 'vitest'
import { clamp } from './clamp'

describe('clamp', () => {
  it('returns the value inside the range', () => { expect(clamp(5, 0, 10)).toBe(5) })
  it('clamps to the bounds', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(42, 0, 10)).toBe(10)
  })
  it('throws when min > max', () => { expect(() => clamp(1, 10, 0)).toThrow() })
})
```

- [ ] **Step 3: `hooks/useExampleToggle.ts`** (camelCase hook file, named export, imports downward into `lib/`)

```ts
// Convention reference pattern. Demonstrates the `hooks/` layer: camelCase file, NAMED export,
// downward import into lib/. Generic, non-domain. Deletable without loss.
import { useState, useCallback } from 'react'
import { clamp } from '../../lib/clamp'

export function useExampleToggle(initial = false): { on: boolean; toggle: () => void; bump: (n: number) => number } {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn(prev => !prev), [])
  // trivial use of the lib/ leaf, only to demonstrate a downward (hooks → lib) import
  const bump = useCallback((n: number) => clamp(n, 0, 10), [])
  return { on, toggle, bump }
}
```

- [ ] **Step 4: `hooks/useExampleToggle.test.ts`** (co-located, jsdom + Testing Library renderHook)

```ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExampleToggle } from './useExampleToggle'

describe('useExampleToggle', () => {
  it('toggles on/off', () => {
    const { result } = renderHook(() => useExampleToggle())
    expect(result.current.on).toBe(false)
    act(() => result.current.toggle())
    expect(result.current.on).toBe(true)
  })
})
```

- [ ] **Step 5: `components/ExampleCard/ExampleCard.tsx`** (PascalCase, explicit props type, named export, downward import into `hooks/`)

```tsx
// Convention reference pattern. Demonstrates the `components/` layer: PascalCase file, explicit
// props type, NAMED export, downward import into hooks/. Generic, non-domain. Deletable without loss.
import { useExampleToggle } from '../../hooks/useExampleToggle'

export interface ExampleCardProps {
  title: string
}

export function ExampleCard({ title }: ExampleCardProps) {
  const { on, toggle } = useExampleToggle()
  return (
    <section>
      <h2>{title}</h2>
      <button type="button" onClick={toggle}>{on ? 'On' : 'Off'}</button>
    </section>
  )
}
```

- [ ] **Step 6: `components/ExampleCard/ExampleCard.test.tsx`** (co-located, query by role/text — behavior not internals)

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExampleCard } from './ExampleCard'

describe('ExampleCard', () => {
  it('renders the title and toggles the button label', async () => {
    render(<ExampleCard title="Demo" />)
    expect(screen.getByRole('heading', { name: 'Demo' })).toBeInTheDocument()
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('Off')
    await userEvent.click(btn)
    expect(btn).toHaveTextContent('On')
  })
})
```

- [ ] **Step 7: `README.md`** — parameterization + conventions + divergence

Write a README mirroring `scaffold-templates/typescript/`... covering: (a) `example`/`Example` placeholder substitution, keep generic, no domain logic; (b) conventions demonstrated — naming split (PascalCase component / camelCase hook / kebab-case lib), named exports, explicit props type, **co-located** tests; (c) the layer model `pages→features→components→hooks→(data-access)→lib` and that `pages/`/`features/` are NOT scaffolded (domain → arch-spec territory) but documented as the upper layers feature work fills; (d) the **divergence from the typescript template**: this template uses **co-located** tests (react.md § Overrides mandates it), not the `tests/` mirror; (e) the example imports go downward (component→hook→lib) so the scaffolded repo is green under `frontend-layered-respect`, and `components/`+`hooks/` (2 signal dirs) activate the frontend profile; (f) the harness (`package.json`/`tsconfig`/`vitest`/React deps) comes from `react-baseline.md` §1-8, not the template.

- [ ] **Step 8: Commit** (no test run — the fragment relies on a target project's React harness, per spec §5.5)

```bash
git add hi_flow/skills/bootstrap/references/scaffold-templates/react/
git commit -m "feat(bootstrap): react scaffold-template (convention reference pattern)"
```

---

## Task 7: Flip the coverage-manifest

**Files:**
- Modify: `hi_flow/skills/bootstrap/references/coverage-manifest.md` (`### interface / frontend (UI)` row + Summary + closing line)

- [ ] **Step 1: Flip the two fields + status**

- audit-adapter → present: "typescript-depcruise (glob includes `.tsx`) + `frontend-layered-respect` / `frontend-layer-cycle` (horizontal layered governance). Feature isolation deferred — see active-issues."
- scaffold-template → present: `references/scaffold-templates/react/`.
- Status header → "**Status: covered**"; replace the loud-signal partial paragraph with a covered statement.

- [ ] **Step 2: Update the Summary table + closing line**

- Summary row `interface / frontend` → `covered`.
- Closing line "Only `language & runtime` (TypeScript/Node) is fully covered today" → include `interface / frontend (React)`.

- [ ] **Step 3: Commit**

```bash
git add hi_flow/skills/bootstrap/references/coverage-manifest.md
git commit -m "feat(bootstrap): frontend axis → covered"
```

---

## Task 8: ARCHITECTURE.md fixation

**Files:**
- Modify: `ARCHITECTURE.md` (Active Decisions + Known Drift + Module Map status notes)

- [ ] **Step 1: Add a D-entry (Active Decisions)** — pointer format (≤3 lines + spec ref)

```markdown
### D-NEW. Frontend coverage closed — React axis `covered` (horizontal layered governance)
`frontend-layered-respect` (MEDIUM) + `frontend-layer-cycle` (CRITICAL) in arch-audit adapter (run-level frontend profile); scan glob widened to `.tsx`; `scaffold-templates/react/` added; coverage-manifest interface/frontend → covered. Feature isolation (vertical-slice) deferred → active-issues.
**Spec:** `docs/superpowers/specs/2026-06-05-hi_flow-frontend-coverage-completion-design.md`
```

- [ ] **Step 2: Add a Known-Drift pointer** for the global `react.md` sync

```markdown
- **react.md § Cross-tool contracts stale (global file).** Clause "frontend outside arch-audit scope" is now false (frontend import-graph governed). Clause "no component-graph adapter" still true. `~/.claude/architecture/stacks/react.md` is `[pending-Ф3a]` — operator updates, or folds into Ф3a relocation.
```

- [ ] **Step 3: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs(arch): fixate frontend coverage closure (D-NEW)"
```

---

## Final: independent verification + report

- [ ] **Verification (independent subagent)** — against spec §8 done-criteria: registry counts, frontend emissions + the `app/`+`api/` no-false-positive case, backend regression, manifest flip, scaffold structure. Subagent must read the spec + the changed files and confirm each criterion or flag gaps.
- [ ] **Implementation report** — `docs/superpowers/specs/2026-06-05-hi_flow-frontend-coverage-completion-design-report.md` (CLAUDE.md format: What was done / Deviations / Issues discovered / Open items — incl. the binary-gated glob verification still pending).

---

## Self-review (plan vs spec)

- Spec §2 glob precondition → Task 3. ✓
- Spec §4.4 two rules → Task 1 (registry) + Task 2 (emission). ✓
- Spec §4.5 profile + backend skip + app/api correctness → Task 2 (Step 3 logic + Step 1 test 4). ✓
- Spec §4.6 suppression doc-only → Task 4 Step 3 (no code). ✓
- Spec §4.7 file list incl. counts in baseline-rules.md, baseline-rules.ts comment, SKILL.md, test length → Tasks 1, 4, 5. ✓
- Spec §5 scaffold → Task 6 (components/hooks/lib, co-located, downward, README divergence). ✓
- Spec §6 manifest → Task 7. ✓
- Spec §7/§8 ARCHITECTURE D-entry + react.md Known-Drift → Task 8. ✓
- Spec §8 verification + report → Final. ✓
- Descoped (feature isolation, Ф3a) → not in any task (correct). ✓
- Type consistency: `frontend_layered_detected` (types.ts ↔ baseline entries), `frontend-layered-respect`/`frontend-layer-cycle` (baseline names ↔ adapter rule_id ↔ tests ↔ docs) — consistent across Tasks 1, 2, 4, 5. ✓
