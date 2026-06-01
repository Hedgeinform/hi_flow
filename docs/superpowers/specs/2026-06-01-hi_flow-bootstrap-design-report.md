# Implementation Report: hi_flow:bootstrap

**Spec:** `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design.md`
**Plan:** `docs/superpowers/plans/2026-06-01-hi_flow-bootstrap.md`
**Date:** 2026-06-01
**Status:** completed

## What was done

Implemented the `hi_flow:bootstrap` skill (markdown skill, P2 — no code, no TDD) via subagent-driven development (P5 — batched dispatches + selective review).

Artifacts created:

- `hi_flow/skills/bootstrap/SKILL.md` — the skill: frontmatter + Overview/place-in-chain + Scope (5 items) + Boundaries (4 neighbours + altitude P8) + the axis atom (probe→scaffold→wire) + Coverage (coverage-gated, coverage-honesty, partial=not-covered, forced-now ∩ uncovered resolution) + Probing discipline (probe-class differentiation, P1 product translation, coverage=1 degeneration) + init mode (7-step) + incremental mode (5-step, shared atom) + Boundary with living-architecture (KD2) + Output & done (enumerable gates) + Decoupling/ownership (Variant 1, KD2, code-is-truth) + Anti-patterns (incl. §17 don't-touch list) + References.
- `hi_flow/skills/bootstrap/references/axis-taxonomy.md` — working vocabulary: 8 infrastructure axes (plain English + engineering term in parens), slicing criterion, axes ≠ toolchain components, per-axis probe-class, run classification (forced-now / delegated / not-touched).
- `hi_flow/skills/bootstrap/references/coverage-manifest.md` — SSoT of coverage: rows `axis → technology → { stack-file, baseline, audit-adapter, scaffold-template, probe-class }`; honest current TS-only state (runtime covered; Postgres partial→not-covered; frontend gap; other axes not covered); pending-Ф3a marks on relocatable paths; dynamic-read + partial=not-covered rules.
- `hi_flow/skills/bootstrap/references/scaffold-templates/` — README (hybrid form decision + convention-not-feature criterion + anti-example) + a generic domain-free TypeScript convention pattern (`typescript/src/example/index.ts` = `clamp`, `typescript/tests/example/index.test.ts`).

Registration / release (Task 7):

- Skills are auto-discovered (no `skills` array in `plugin.json`; neighbour skills are not declared either) — no manifest declaration needed.
- Version bumped 0.6.4 → 0.7.0 synchronously in both manifests (D16): `hi_flow/.claude-plugin/plugin.json` and the `hi_flow` entry in `.claude-plugin/marketplace.json`.

Validation (Task 8, P5 review layer — two isolated subagents):

- **Spec compliance review:** verdict COMPLIANT (all §1-§17 covered, altitude boundary holds, coverage-honesty faithful, shared atom single-sourced, no over-building). No MUST-FIX.
- **Behavioral validation** (3 scenarios: init greenfield no-product-spec / init with product-spec / incremental REH frontend): all three CORRECT. One MUST-FIX surfaced — the forced-now ∩ uncovered logical seam — applied inline. Two minor clarity fixes applied (incremental→insist-branch cross-link; project-class hard-prerequisite).

## Deviations from spec

- **Language: skill written in English, not Russian.** Operator instruction this session: "язык скилла строго английский". The spec writes the axis taxonomy and operator-facing options in plain Russian (P1). Resolution: the skill source is English; plain-English is the form of P1 in the source; operator-facing dialogue is rendered in the operator's language at runtime (same model as the existing arch-spec skill, which is fully English). The `[pending-Ф3a]` internal tag keeps its Cyrillic Ф to stay consistent with spec/ARCHITECTURE.md notation (it references the internal roadmap item, not operator-facing prose).
- **Test location in the scaffold pattern.** Spec §7.5 says "co-located test" (same dir); the TS stack file (`~/.claude/architecture/stacks/typescript.md`) mandates `tests/` mirroring `src/`. Followed the stack file (authoritative project convention) and documented the divergence in the scaffold README.

## Issues discovered

- **MUST-FIX found by behavioral validation (resolved inline):** the spec specifies the coverage-honesty *signal* for an uncovered axis but not the *bookkeeping* when an axis is simultaneously `forced-now` (product-forced) and uncovered/partial — the atom's scaffold/wire steps cannot run, and the done-criterion "gates green with the new axis" contradicts an `unmanaged` axis with no gates. The grounding case (REH ERP frontend) hits this directly. Resolved by adding an explicit "forced-now ∩ uncovered resolution" rule to Coverage (run only the covered sub-part; mark `unmanaged`; exclude from done-gates; loud signal is the deliverable) and carving `unmanaged` axes out of the Done criterion. **Spec feedback:** §5/§7/§8 of the design spec would benefit from stating this resolution explicitly.
- **Spec text nit (no skill change):** §7.5 wording "co-located test" should read "test in `tests/` mirror" to match the authoritative TS stack convention, so a future reviewer does not re-flag the divergence.
- **delegated vs not-touched boundary** (§4) is slightly underspecified for a bare backend with no deployment model (when does a deferred binding make an axis `delegated` rather than `not-touched`?). Low practical risk — all current examples resolve to `not-touched`. Left as-is (tightening would be inventing design beyond the spec).

## Open items

- **Ф3a relocation is a pre-condition of *running* bootstrap on a project** (not of writing the skill): baselines + CI + `stacks/` must move plugin-internal so the wire step resolves them. The coverage-manifest marks these paths `pending-Ф3a`. Until Ф3a lands, even the "covered" TypeScript runtime axis points at operator-personal paths (disclosed in the manifest, not hidden).
- Real live run of bootstrap (REH ERP frontend incremental) — after Ф3a.
- ARCHITECTURE.md Module Map: bootstrap DESIGN-READY → BUILT (proposed to operator via the architecture skill proposal-flow).
- Commits — proposed to operator (standing rule); not committed by the implementer.
