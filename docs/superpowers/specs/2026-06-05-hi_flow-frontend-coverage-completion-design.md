# hi_flow — Frontend Coverage Completion (design)

**Date:** 2026-06-05 (rev. 2 — corrected after isolated review)
**Status:** design — pending operator review
**Scope owner:** `hi_flow:bootstrap` coverage + `hi_flow:arch-audit` baseline
**Downstream consumer:** `superpowers:writing-plans`

> **Rev. 2 note.** Rev. 1 rested on three false assumptions about arch-audit, caught by isolated review and verified by hand: (a) there is no declarative `conditional.kind` evaluator — detection is imperative in the depcruise adapter; (b) there is no "subtree" model — a module is a flat top-level dir under `src/`; (c) the production scan glob excludes `.tsx`, so nothing frontend is audited today. This revision corrects the design to the real codebase. Feature isolation (vertical-slice) is descoped to a logged issue (it needs a module-granularity change). See §10 for the changelog.

---

## 1. Context / problem

The `interface / frontend` axis (single covered front-end stack — **React**, Vite SPA / React 19 / TS) is **PARTIAL → not covered** in `references/coverage-manifest.md`. Per P7 (coverage-honesty), an axis is `covered` only when all 5 fields are *present* or *N/A*. React has exactly **two `absent-pending` fields**: **audit-adapter** and **scaffold-template** (verified: `coverage-manifest.md:65-66`). The other three (stack-file `react.md`, baseline `react-baseline.md`, probe-class) are present; the `[pending-Ф3a]` marker is a relocation/distribution concern, not coverage-completeness.

**Correction to the manifest's own premise.** The manifest claims the audit-adapter is "absent only of boundary-rules" because "typescript-depcruise *applies* to the frontend import-graph." That premise is **itself optimistic**: the production audit scans `src/**/*.ts` (`core/report-builder.ts:73`) — `.tsx` is **not** matched. A React SPA (components are `.tsx`, entry `main.tsx`) is therefore not scanned at all today. So closing the audit-adapter field is two things, not one: (1) make the adapter actually see `.tsx`; (2) add frontend boundary-rules.

Goal: flip both `absent-pending` fields to *present* so the axis becomes `covered` for **operator-personal use**, with the audit-adapter delivering **real horizontal layered governance** (the choice "B" from the brainstorm — governance, not a hollow checkbox).

## 2. Scope

**In scope:**
1. **Glob widening** (`report-builder.ts:73`: `src/**/*.ts` → `src/**/*.{ts,tsx}`) — the precondition that makes any frontend audit possible.
2. **Frontend horizontal layered rules** — `frontend-layered-respect` (MEDIUM) + `frontend-layer-cycle` (CRITICAL), an imperative detection block in the depcruise adapter.
3. **`references/scaffold-templates/react/`** scaffold-template.
4. **Coverage-manifest update** flipping the two fields and the axis status to `covered`.

**Out of scope:**
- **Ф3a relocation** — distributable (plugin-internal) coverage, cross-cutting across all stacks. Deferred by operator decision (2026-06-05): dogfood on ≥2 real projects first.
- **Frontend feature isolation (vertical slices)** — part of the B model conceptually, but it requires a module-granularity change the flat top-level model does not support (sibling features `features/A`, `features/B` both collapse to module `features`). This is the same root cause that makes the existing `vertical-slice-respect` rule a no-op on every tree. **Logged as a separate MEDIUM active-issue** (`docs/active-issues.md` → "vertical-slice-respect — правило-призрак"), not folded in. `covered` is honest without it: the audit-adapter field means "which layers may not import which", which the horizontal rule satisfies.

**On the glob touching the shared path.** Widening the scan glob affects every audit run, not just frontend — it is a shared-path change. It is nonetheless **in scope and unavoidable**: without it the frontend rule (and the reused generic rules) never fire. Risk is low (a pure-`.ts` project has no `.tsx` to newly match), but it requires a **regression run of the existing arch-audit test suite** and a check on a real `.ts` project.

**Why glob + rules + scaffold are one session:** the scaffold instantiates the layers the rules enforce; both are projections of the single frontend layer vocabulary (§3). Splitting risks scaffold structure and depcruise rules drifting apart (principle 4).

## 3. Frontend layer model (the shared spine)

Canonical model for a Vite React SPA — top → bottom, **imports allowed only downward**:

```
pages/        — route composition (top)          [also: app/ (app shell), routes/]
  ↓
features/     — feature modules                  [isolation = DEFERRED, see §2]
  ↓
components/   — shared presentational UI
  ↓
hooks/        — shared hooks (incl. data hooks)  [also: store/]
  ↓
(data-access) — api/ , services/                 [between hooks and lib]
  ↓
lib/          — pure utilities, types, clients (bottom leaf)  [also: shared/, utils/]
```

**What this spec enforces:** the **horizontal direction** — an upward / layer-skipping import (a component importing a page, a hook importing a component, `lib/` importing anything internal) is a violation. This is feasible under the flat module model because each layer is a top-level dir under `src/`, so a cross-layer edge (`components → hooks`) is a visible module edge.

**What is deferred (§2):** `features/A` ⊥ `features/B` isolation — needs sub-feature granularity the flat model lacks.

**Detection-signal set vs ordered-layer set.** The full ordered set has 6 ranks (pages, features, components, hooks, data-access, lib). The **detection signal** that activates the frontend profile is the React-distinctive subset `{components, hooks, pages, features}` (names that never appear in the backend layer map) — ≥2 present ⇒ frontend profile. `lib/`, `api/`, `services/`, `app/`, `store/` are classified by the profile once active but do not themselves trigger it (they collide with backend names or are too generic). This signal-set ⊂ ordered-set relationship is explicit so the implementer encodes both lists.

**Aliases:** `routes/`→pages; `app/`→pages-level (app shell) **in frontend profile only**; `store/`→hooks-level; `api/`/`services/`→data-access; `shared/`/`utils/`→lib. Projects override via the existing alias-map (`baseline-rules.md` § Override).

## 4. Artifact 1 — glob widening + frontend horizontal rules

### 4.1 Mechanism reality (corrected)

arch-audit detection is **imperative**, not declarative. `conditional.kind` on a `BaselineRule` is **decorative metadata** — no code dispatches on it (verified: `.kind` is read nowhere; `report-builder.ts:299/311` are comments). The actual layer detection + ordering + finding emission live in `adapters/typescript-depcruise.ts → detectStructural()`, a hand-written block that builds `detectedLayers`, hardcodes the backend order, and emits `layered-respect` / `architectural-layer-cycle` / `port-adapter-direction`.

Therefore artifact 1 is:
- **+2 registry entries** in `core/baseline-rules.ts` (for finding metadata: id, principle, severity, explanation) carrying `conditional: { kind: 'frontend_layered_detected', layers_min: 2 }` for metadata consistency with the other Layer-C rules — **not** because the kind is dispatched.
- **A new imperative detection block** in `detectStructural()` — the substance — that classifies a frontend profile, applies the §3 order, and emits the two findings. This mirrors *how the backend layered block is actually built*, not a fictional evaluator.

### 4.2 Glob widening (precondition)

`core/report-builder.ts:73` — `runner(configPath, 'src/**/*.ts')` → `runner(configPath, 'src/**/*.{ts,tsx}')`. The depcruise config already lists `.tsx/.jsx` in `enhancedResolveOptions.extensions` (`generate-depcruise-config.ts:87`), so resolution of `.tsx` import *targets* already works; this change adds `.tsx` as scan *entries*. Without it the frontend graph is empty and no rule fires.

### 4.3 What is reused (true only after 4.2)

After the glob includes `.tsx`, the generic graph rules — `no-circular`, `barrel-file`, `god-object`, `high-fanout`, `cross-module-import-info` — see the frontend graph and apply for free. (`not-to-test-from-prod` already matches `.tsx` via its `x?` regex — verified `generate-depcruise-config.ts:31` — moot until the glob change.)

### 4.4 What is new

| Rule | Severity | Principle | conditional.kind (metadata) |
|---|---|---|---|
| `frontend-layered-respect` | MEDIUM | `layered-architecture-respect` | `frontend_layered_detected` |
| `frontend-layer-cycle` | CRITICAL | `layered-architecture-respect` | `frontend_layered_detected` |

- `frontend-layered-respect` — upward / layer-skipping import within a frontend-profiled run, per §3 order.
- `frontend-layer-cycle` — cycle between two frontend layers (e.g. `components ↔ hooks`). **Derivation (not independent computation):** like `architectural-layer-cycle` (which at `detectStructural` filters the `inappropriate-intimacy` 2-cycle findings through the backend layer map), `frontend-layer-cycle` filters the **same** `inappropriate-intimacy` finding set through the **frontend** layer map. `inappropriate-intimacy` is a Layer-B universal rule and stays on in a frontend run; the frontend cycle rule is a second derivation keyed on the frontend ordered-map, not a fresh graph traversal.

### 4.5 Profile, name collisions, fullstack (honest)

No subtree model exists: a module is the flat top-level dir under `src/` (`parse-depcruise-output.ts:32-43`), and detection runs over the whole graph of one audit run. Resolution:

- **Per-run profile.** A run is **frontend-profiled** when ≥2 React-distinctive dirs (`components/`, `hooks/`, `pages/`, `features/`) are present under its `src/`. In a frontend-profiled run the frontend layer map applies (including the ambiguous `api/`, `services/`, `app/`).
- **The backend-rule skip is a HARD CORRECTNESS REQUIREMENT, not deduplication.** In a frontend-profiled run the backend layered rules **must** be skipped, because the backend `layerNamingMap` already classifies the ambiguous frontend names and would emit **false positives**. Worked example: a React run with `app/` + `api/` maps under the backend map to `app→application` (order 2) and `api→presentation` (order 1); backend `layered-respect` fires today on `app → api` as an upward violation — which is wrong (in a frontend SPA `app/` is the shell composing `api/`-typed data access, a legitimate downward edge). Skipping the backend rules is what prevents this. An implementer treating the skip as optional polish will emit wrong findings in exactly the `api/`+`app/` overlap.
- **The skip covers three emission sites across two loops + the cycle filter** (enumerate so none is missed in `detectStructural`): (1) `layered-respect` (main layered loop, keyed on the primary alias map); (2) `port-adapter-direction` (a separate loop keyed on the second alias map — only the `ports→domain` mapping could plausibly trigger on frontend, but it must still be guarded); (3) `architectural-layer-cycle` (the derivation that filters `inappropriate-intimacy` through the backend map — must not run in a frontend profile, since `frontend-layer-cycle` replaces it). `inappropriate-intimacy`, `no-circular`, barrel, god-object, coupling (Layer-A/B universals) stay ON in both profiles.
- **`app/` collision** (it is in the backend Application map *and* a common frontend shell dir) — resolved by profile: frontend profile ⇒ `app/` = pages-level; backend profile ⇒ `app/` = application (unchanged).
- **Fullstack** — arch-audit runs against one project root scanning `src/**`. A monorepo is audited **per package** (point arch-audit at `apps/web` then `apps/api`); each run gets its own profile. A **single mixed `src/`** holding both frontend-distinctive and backend dirs is the genuinely ambiguous case → frontend-distinctive presence wins the profile; this is a **documented best-effort limitation**, not solved here.

### 4.6 Suppression (doc-only)

`core/suppression.ts` is **edge+severity based**, not name-based: any finding with severity > LOW on an edge auto-suppresses a co-located `cross-module-import-info` (LOW). So a MEDIUM `frontend-layered-respect` (or CRITICAL `frontend-layer-cycle`) finding suppresses the LOW info finding **with zero code change**. The "precedence chain" in `baseline-rules.md` is descriptive documentation; the only edit is to **list** the two new rules there for completeness. No suppression code change.

### 4.7 Files touched

- `core/report-builder.ts` — glob (1 line, §4.2).
- `adapters/typescript-depcruise.ts` — new frontend detection block in `detectStructural()` (the substance: profile classification + §3 order + 2 emissions + the three-site backend-rule skip per §4.5).
- `core/baseline-rules.ts` — +2 rule entries **and** the inline section comment `// === Layer C — conditional structural (5) ===` → `(7)`.
- `core/types.ts` — extend the `conditional.kind` union with `frontend_layered_detected` (metadata only).
- `references/baseline-rules.md` — document the 2 rules, frontend vocabulary + order, profile rule, suppression listing; **bump every count restatement** (currently 15 / 5 / 1 / 7 → 17 / 7 / 2 / 8): the header region (`:13`), the §"Слой C" header (`:17`, `:107`), the severity-distribution section (`:191` CRITICAL, `:193` MEDIUM), and validation-history.
- **`SKILL.md`** (was missing from rev.1/rev.2 touched-list — count + narrative drift): bump `:433` "= 15 rules" → 17; sync the detection narrative — `:154` ("closed list of layer names") now has a *second* (frontend) layer list, and the suppression precedence rule-list (`:164-165`) gains the 2 new rules. Note `:151` ("Detection algorithms live in `core/` (stack-agnostic); the adapter supplies stack-specific constants") is a **pre-existing doc/code divergence** — `detectStructural` already lives in the adapter, and this change adds frontend layer *logic* there, deepening it; flag for the operator (not a code move in this scope).
- **`tests/core/baseline-rules.test.ts`** — the existing guard `it('returns 15 baseline rules', () => expect(rules).toHaveLength(15))` (`:5`) hard-fails on +2; update the count to 17 **and** the test title. (This is a pre-existing assertion the change invalidates — not a new fixture.)
- new fixtures: frontend clean-pass; upward-import violation; layer cycle (CRITICAL); per-run disjointness (a frontend-profiled run emits frontend findings + skips the three backend sites; a backend run unchanged); regression that existing `.ts` fixtures are unaffected by the glob. **Regression caveat:** the 3 integration tests (`cycle`/`barrel`/`layered-project`) currently fail *environmentally* because `dependency-cruiser` is absent from arch-audit devDependencies (`docs/active-issues.md` LOW) — the glob regression must run in an environment where the binary is present, else "still green" is vacuous.

## 5. Artifact 2 — react scaffold-template

### 5.1 Form

Hybrid (template files + README), same convention as `scaffold-templates/typescript/`. Demonstrates **how a module is built** in a React project — never domain logic (P8: scaffold = "HOW", not "WHICH modules").

### 5.2 What the scaffold instantiates

Only the **domain-free lower layers** — `components/`, `hooks/`, `lib/` — each with one generic example + co-located test. `pages/` and `features/` are **not** instantiated (a page/feature is inherently domain → predicting feature structure, arch-spec territory). The README documents them as the upper layers feature work fills.

```
references/scaffold-templates/react/
  README.md
  src/
    components/ExampleCard/ExampleCard.tsx   (+ ExampleCard.test.tsx, co-located)
    hooks/useExampleToggle.ts                (+ useExampleToggle.test.ts, co-located)
    lib/clamp.ts                             (+ clamp.test.ts, co-located)
```

Under the flat module model these resolve to modules `components`, `hooks`, `lib` (verified against `fileToModule`). The example imports go **downward only** (`ExampleCard` → `useExampleToggle` → `clamp`), so the scaffolded repo is green under `frontend-layered-respect` and demonstrates the allowed direction by example. **Note:** only `components/` + `hooks/` are detection-signal dirs (`lib/` is not), so the two of them activate the frontend profile (≥2) — the scaffold does trigger the rule, not vacuously.

### 5.3 Conventions demonstrated (from `react.md`)

- **Naming split:** component PascalCase (`ExampleCard.tsx`), hook camelCase (`useExampleToggle.ts`), non-component kebab-case (`clamp.ts`).
- **Named exports**, never `export default`.
- **Explicit props type** on the component.
- **Co-located tests** (Testing Library, query by role/text, behavior not internals).

### 5.4 Divergence from the typescript scaffold (explicit in README)

The typescript scaffold uses `tests/` **mirror** layout; the React scaffold uses **co-located** tests, because `react.md` § Overrides (the authoritative stack file) mandates co-location. The scaffold-templates README already encodes a "specs say co-located loosely, the stack file decides" precedent — here the stack file itself mandates co-located, so it stands. The React README records the divergence explicitly so the contrast is intentional.

### 5.5 Parameterization

`example` / `Example` placeholders substituted consistently when bootstrap lays the template; contents verbatim otherwise; comments kept (they teach the convention). After substitution the module compiles and `vitest run` passes. (Like the typescript template, the fragment relies on the target project's harness — `package.json`/`tsconfig`/`vitest` come from the React baseline §1-8, not the template; the README states this dependency.)

## 6. Coverage-manifest update

`references/coverage-manifest.md`, `### interface / frontend (UI)` row:
- **audit-adapter** → *present*: "typescript-depcruise (glob includes `.tsx`) + `frontend-layered-respect` / `frontend-layer-cycle` (horizontal layered governance). Feature isolation deferred — see active-issues."
- **scaffold-template** → *present*: `references/scaffold-templates/react/`.
- **Status** → **covered** (loud-signal prose replaced); the partial paragraph rewritten.
- **Summary table** row → `covered`; closing line updated to include `interface / frontend`.

## 7. External sync / open items

- **`react.md` § Cross-tool contracts drift (precise).** The section (verified `react.md:107`) has two clauses: (a) "arch-audit has **no frontend (component-graph) adapter**"; (b) "Frontend code is **outside arch-audit scope** until a frontend adapter exists." This work adds **import-graph** layered rules + a glob widening, **not** a component-graph/render-tree adapter — so clause (a) stays **literally true**, and only clause (b) flips (frontend import-graph is now in scope). The Known-Drift pointer must record exactly that: update (b) to "frontend import-graph governed by `frontend-layered-respect`/`frontend-layer-cycle`; render/hooks tree still has no component-graph adapter (clause a stands); feature isolation pending." `react.md` is a **global operator-personal file** (`[pending-Ф3a]`), out of this plugin's write scope — operator applies, or it folds into Ф3a.
- **Feature isolation deferred** → `docs/active-issues.md` "vertical-slice-respect — правило-призрак" (MEDIUM). The frontend horizontal rule does not depend on it.
- **Glob behavior change** — existing audits now scan `.tsx`; flagged for regression run (§2, §4.7).

## 8. Done criteria

- `report-builder.ts` glob includes `.tsx`; existing `.ts` arch-audit tests still green (regression) — **run with `dependency-cruiser` present**, else the 3 integration tests are environmentally red independent of this change (§4.7 caveat).
- `detectStructural` emits `frontend-layered-respect` / `frontend-layer-cycle` on a frontend-profiled graph; the three backend layered sites (`layered-respect`, `port-adapter-direction`, `architectural-layer-cycle`) skipped in that run; backend-profiled runs unchanged; the `app/`+`api/` case emits no false `app→api` violation (§4.5).
- `baseline-rules.ts` carries the 2 entries + the inline `(5)`→`(7)` comment; `baseline-rules.md` **and** `SKILL.md:433` count restatements bumped (15→17 / 5→7 / 1→2 / 7→8); `tests/core/baseline-rules.test.ts` length assertion + title updated to 17; `types.ts` union extended.
- Tests green: frontend clean-pass (non-empty graph observed — the `.tsx` component appears as module `components`, not an empty scan), upward-import violation, layer cycle (CRITICAL), per-run disjointness.
- `scaffold-templates/react/` exists; after placeholder substitution the module compiles and `vitest run` passes; running it through the frontend rule yields a **non-empty graph with zero violations** (clean, not vacuous).
- `coverage-manifest.md` interface/frontend row = `covered`; summary updated.
- ARCHITECTURE.md: a D-entry recording the coverage closure (pointer to this spec); Known-Drift pointer for the `react.md` sync.

## 9. References

- `hi_flow/skills/bootstrap/references/coverage-manifest.md` — SSoT of coverage (the two flipped fields).
- `hi_flow/skills/bootstrap/references/scaffold-templates/README.md` + `typescript/` — the scaffold convention this mirrors.
- `hi_flow/skills/arch-audit/core/report-builder.ts:73` — the scan glob (precondition change).
- `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts` → `detectStructural()` — where the frontend detection block lands.
- `hi_flow/skills/arch-audit/helpers/parse-depcruise-output.ts:32-43` — `fileToModule` (flat module model; the granularity constraint behind the deferred feature isolation).
- `hi_flow/skills/arch-audit/core/baseline-rules.ts` / `core/types.ts` / `core/suppression.ts` — registry, kind union, suppression (edge+severity, doc-only).
- `hi_flow/skills/arch-audit/references/baseline-rules.md` — rule contract + count restatements to bump.
- `~/.claude/architecture/stacks/react.md` + `references/react-baseline.md` — React conventions the scaffold encodes; § Cross-tool contracts drift (§7).
- `docs/active-issues.md` — deferred feature isolation (vertical-slice-respect).

## 10. Changelog (rev. 1 → rev. 2)

- Removed the fictional "declarative `conditional.kind` evaluator"; artifact 1 is an imperative detection block in the adapter (§4.1).
- Removed "subtree profile / root-agnostic / fullstack solved for free"; replaced with honest per-run profile + per-package fullstack + best-effort mixed `src/` (§4.5).
- Added the **glob-widening precondition** (`.tsx` not scanned today) as an explicit in-scope step touching the shared path (§2, §4.2).
- Removed "feature isolation for free via vertical-slice-respect"; descoped to a logged MEDIUM active-issue with the module-granularity root cause (§2, §7).
- Added explicit `app/` collision handling and the detection-signal-set ⊂ ordered-set reconciliation (§3, §4.5).
- Corrected suppression to doc-only (§4.6) and the done-gate to require a non-empty graph (§8).
- Enumerated the count restatements in `baseline-rules.md` (§4.7).
