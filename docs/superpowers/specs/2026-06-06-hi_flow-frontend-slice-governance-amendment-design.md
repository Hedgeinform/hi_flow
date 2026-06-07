# hi_flow frontend-slice-governance amendment — design

**Date:** 2026-06-06
**Status:** draft
**Trigger:** `docs/feedback/hi_flow-frontend-slice-governance-brief.md` — feedback from first consumer (reh-erp comm web arch-spec, 2026-06-06).
**Affected skills:** `hi_flow:arch-audit` (primary — adapter activation gate + rules schema); `hi_flow:bootstrap` (coverage-manifest honesty).
**Scope:** Part 1 only — declarative frontend-profile activation. Part 2 (peer/vertical-slice isolation), arch-spec auto-emission, explicit layer-order — deferred, tracked in `docs/active-issues.md`.
**Downstream:** `superpowers:writing-plans`.

---

## 1. Problem

The frontend layered-governance block in `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts` activates only when the run's top-level modules literally include ≥2 of `['components','hooks','pages','features']` (`isFrontendProfile`, ~`:209-210`). On a **feature-sliced** React layout (feature-named top-level dirs + a shared "spine"), zero literals match → `isFrontendProfile = false` → the whole frontend block (`frontend-layered-respect` / `frontend-layer-cycle`, ~`:258-305`) **silently does not run**. No loud signal (violates global principle 5).

Feature-slicing is a mainstream React convention, not an edge case — so the tool no-ops its core layered function on a typical layout. reh-erp apps/web (modules `audit, comm, inbox, conversation, groups, lib, …`) hit this first and had to hand-write a project rules-patch instead of reusing the tool.

**Confirmed in current code (2026-06-06, worktree at master `6073d88`):**
- Activation gate hardcodes literals and ignores `layer_aliases` (`:209-210`).
- Layer classification **already** merges `projectRules.overrides.layer_aliases` (`feAlias`, `:270`) — custom layer names are already supported *once the profile is active*. Only the activation gate is broken.
- `loadProjectRules` (`core/project-rules.ts:30`) passes `overrides` through verbatim — a new override field reaches the adapter without loader changes.
- Peer-slice isolation is absent by design (only direction + cross-layer cycle are checked) — that is Part 2, an existing MEDIUM active-issue (`vertical-slice-respect — правило-призрак`).

**Not in scope / not the cause:** this is **not** about fullstack per-tree (D28) — package separation `apps/api`↔`apps/web` works. This is the D27 frontend layer-profile **inside** a front package.

## 2. Decision — Approach 1: explicit declaration, additive activation

Let a project **declare** its profile rather than have the tool guess from folder names. Declaration is unambiguous, survives any convention (horizontal / top-level slices / nested `features/*`), and — being a declaration — does not bake reh-erp's taxonomy into the tool (neutralizes the brief's n=1 caveat for Part 1). Auto-detection is explicitly rejected: "layer vs slice" is statically ambiguous (exactly why D27 deferred it); a wrong guess in a governance gate produces false positives → the consumer mutes the rule → loss of trust.

**No new rule logic.** The directional rules (`frontend-layered-respect`, `frontend-layer-cycle`) already exist and already honor `layer_aliases`. This amendment changes **only the activation condition** + adds the declaration field. This delivers the brief's "cheap ~80%" — closes 3 of reh-erp's 6 rules (the directional "spine"); the remaining 3 (peer isolation) are Part 2.

### 2.1 Activation rule

New field `profile?: 'frontend' | 'backend'` on `ProjectRulesOverrides`. The gate becomes:

```
isFrontendProfile =
  overrides.profile === 'frontend'
  || (overrides.profile !== 'backend' && (literal-signal-dir heuristic, ≥2 of FRONTEND_SIGNAL_DIRS))
```

| `overrides.profile` | Behavior |
|---|---|
| `'frontend'` | Frontend layered rules ON; backend layered + port-adapter rules OFF (they gate on `!isFrontendProfile`). Explicit. |
| `'backend'` | Frontend OFF even if `components`/`hooks` dirs exist (escape hatch for backend projects with frontend-looking dir names); backend path runs as today. |
| absent (default) | Falls back to the literal heuristic — **existing behavior preserved**. |

**Additive — no regression.** Projects with no declaration are unaffected. Horizontal layouts that use standard dir names (e.g. zhenka-web: `components, hooks, pages, features, lib`) keep activating via literals exactly as today. This additivity is a hard requirement of the design, not an option.

### 2.2 Declaration format

In the project's `.audit-rules.yaml`:

```yaml
overrides:
  profile: frontend
  layer_aliases:
    comm: data-access
    conversation: data-access
    groups: data-access
    lib: lib
```

`layer_aliases` maps the project's top-level dir names onto the built-in frontend layer vocabulary (`pages, features, components, hooks, data-access, lib`); the built-in `frontendOrder` then governs allowed import direction. Produced by the operator or (deferred follow-up) by arch-spec's frontend rules-patch generation.

### 2.3 Why not the alternatives (recorded for posterity)

- **Infer profile from `layer_aliases` values** (no new field): rejected — `data-access`/`lib` are valid backend names too; inferring "frontend" from alias values re-introduces the heuristic guessing the brief warns against, and cannot express "force backend."
- **Also declare explicit layer order** (`frontend_layer_order`): deferred (YAGNI) — the built-in order is a sane default and the brief marks order as optional. Revisit when a real project needs a non-standard order. **Non-goal for this amendment.**

## 3. Changes

| Artifact | Change |
|---|---|
| `core/types.ts` — `ProjectRulesOverrides` | Add `profile?: 'frontend' \| 'backend'`. |
| `adapters/typescript-depcruise.ts` (~`:210`) | Replace activation expression with the rule in §2.1. Layer mapping (`:270`) unchanged. |
| `core/project-rules.ts` | No code change — `overrides` already passes through verbatim. Add a focused test asserting `profile` survives load. |
| `hi_flow/skills/bootstrap/references/coverage-manifest.md` | `interface / frontend` row — honesty wording (§4). |
| `hi_flow/skills/arch-audit/references/baseline-rules.md` (§156-167) | **Canonical user-facing rule doc.** `frontend-layered-respect` "Detection" currently states activation as literals-only (`≥2 из components/hooks/pages/features`). Update to: activation = `profile: frontend` declaration **or** the literal heuristic (fallback). Keep the mutual-exclusion note. |
| `hi_flow/skills/arch-audit/SKILL.md` | Document the `profile` field where project rules / `.audit-rules.yaml` `overrides` are described: meaning, the three cases (§2.1), the declarative-not-auto-detect rationale (pointer to this spec). No dedicated overrides-schema md exists — canonical types live in `core/types.ts`. |
| Tests (`tests/adapters/typescript-depcruise.test.ts` + integration fixtures) | §5. |

## 4. Coverage-manifest honesty (bootstrap)

The `interface / frontend` row currently reads **covered** unconditionally. That is optimistic for feature-sliced layouts: there the horizontal adapter is inert, leaving only universals (cycles / barrel / god-object) — not layered/boundary governance. Honesty fix (pointer-level wording, not a row rewrite):

- `covered` holds for **horizontal layouts** (standard dir names → literal activation) **and feature-sliced layouts that declare `profile: frontend` + `layer_aliases`**.
- Feature-sliced **without** declaration → only universals apply; layered governance is **not** delivered → state this explicitly (not a silent "covered"). Point the reader to the declaration format.
- Keep the existing "feature isolation (vertical-slice) deferred" note — unchanged, it is Part 2 for both layouts.

## 5. Validation (TDD — arch-audit is runtime code, not markdown)

P2's "skill = markdown" exception does not cover the arch-audit TS runtime. Tests gate this change.

1. **Regression — horizontal, no declaration.** Fixture with top-level `components/`, `hooks/`, `pages/` (zhenka-web shape), no `.audit-rules.yaml` profile → `isFrontendProfile === true`, frontend rules evaluated, backend layered/port-adapter skipped. (Proves additivity: existing projects unchanged.)
2. **New — feature-sliced + declaration.** Fixture with feature-named top-level dirs + a shared `lib`, `.audit-rules.yaml` with `profile: frontend` + `layer_aliases` → `isFrontendProfile === true`; a downward-violating import emits `frontend-layered-respect`. (Proves the gap is closed.)
3. **New — feature-sliced, no declaration.** Same layout, no profile → `isFrontendProfile === false` (literals don't match); frontend rules not emitted. (Proves we did NOT introduce auto-detection — declaration is required.)
4. **Escape hatch — `profile: backend` with frontend-looking dirs.** Layout has `components/` + `hooks/` but `profile: backend` → `isFrontendProfile === false`. (Proves the backward override.)
5. **Loader pass-through.** `loadProjectRules` on a YAML with `overrides.profile` → field present in the returned object.

Plus structural: typecheck clean; `profile` typed (no `any`). Behavioral: `baseline-rules.md` §156-167 activation wording matches the implemented gate (§2.1), and SKILL.md describes `profile` accurately (clarity review — doc must not still claim literals-only).

## 6. Backward compatibility

No project without a `profile` declaration changes behavior. The literal fallback is preserved verbatim. Metrics (Ca/Ce/NCCD), module granularity, and `fileToModule` are untouched — zero blast radius on backend projects and on already-audited frontends (verified: zhenka-bot tools are flat files; zhenka-web is horizontal with one feature folder). Contrast with Part 2, which would re-base module granularity and is deferred for exactly this reason.

## 7. Non-goals (deferred — tracked in `docs/active-issues.md`)

- **Part 2 — peer/vertical-slice isolation** + finer module resolution (`vertical-slice-respect — правило-призрак`, MEDIUM). Real test case = reh-erp apps/web peers (`inbox/conversation/groups`), not yet built. Needs a real feature-sliced run before release.
- **arch-spec auto-emission** of `profile` + `layer_aliases` into its frontend rules-patch (MEDIUM). Depends on this amendment's declaration format (principle 10). bootstrap is NOT in this follow-up — it scaffolds the standard horizontal skeleton, which needs no declaration.
- **Explicit `frontend_layer_order`** declaration (YAGNI until a non-standard-order project appears).

## 8. References

- Brief: `docs/feedback/hi_flow-frontend-slice-governance-brief.md`
- Consumer artifacts: reh-erp `docs/specs/2026-06-06-reh-erp-comm-web-arch-spec.md` (§5.1, §6, §8), `docs/specs/comm-web-rules-patch.yaml`
- D27 frontend coverage: `docs/superpowers/specs/2026-06-05-hi_flow-frontend-coverage-completion-design.md`
- D11 (rules-patch contract), D21 (arch-spec), P7 (coverage-honesty), global principle 5 (no silent fallback), global principle 10 (sequential by dependency graph)
- Deferred: `docs/active-issues.md` (`vertical-slice-respect`; arch-spec auto-emission)
