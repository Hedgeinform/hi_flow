# Implementation Report: Frontend Coverage Completion

**Spec:** `docs/superpowers/specs/2026-06-05-hi_flow-frontend-coverage-completion-design.md` (rev. 2)
**Plan:** `docs/superpowers/plans/2026-06-05-hi_flow-frontend-coverage-completion.md`
**Date:** 2026-06-05
**Status:** completed (one binary-gated verification deferred — see Open items)
**Branch:** `feat/frontend-coverage-completion` (9 commits, not pushed/merged — awaiting operator review)

## What was done

- **Glob widening** — `core/report-builder.ts` scan glob `src/**/*.ts` → `src/**/*.{ts,tsx}` (the precondition that makes the frontend graph visible).
- **Frontend horizontal layered rules** — `frontend-layered-respect` (MEDIUM) + `frontend-layer-cycle` (CRITICAL), implemented as an imperative block in `adapters/typescript-depcruise.ts` `detectStructural()`, mirroring the existing backend layered block with a frontend layer vocabulary (pages→features→components→hooks→data-access→lib) and a **run-level frontend/backend profile switch**. In a frontend-profiled run (≥2 of components/hooks/pages/features) the three backend layered emissions are skipped — the §4.5 hard-correctness requirement that prevents false positives on `api/`/`app/`/`services/`.
- **Registry + types** — 2 baseline entries in `core/baseline-rules.ts` (+ inline Layer C comment 5→7); `ConditionalTrigger` union extended with `frontend_layered_detected` in `core/types.ts`.
- **Doc sync** — `references/baseline-rules.md` (2 rule sections, frontend vocabulary, profile rule, suppression listing, all counts 15→17 / 5→7 / CRITICAL 1→2 / MEDIUM 7→8); `SKILL.md` (count + detection narrative + suppression list + core/adapter divergence flag).
- **React scaffold-template** — `hi_flow/skills/bootstrap/references/scaffold-templates/react/`: components/hooks/lib green skeleton, co-located tests, downward imports (component→hook→lib), README documenting conventions, the co-located divergence from the typescript template, and the harness dependency. `pages/`/`features/` deliberately not scaffolded (altitude P8).
- **Coverage-manifest** — interface/frontend audit-adapter + scaffold-template flipped to `present`; Status → `covered`; Summary + closing line updated.
- **Fixation** — `ARCHITECTURE.md` D27 (coverage closure) + KD3 (global react.md drift); `docs/active-issues.md` logs the deferred feature isolation.

**Verification:** 26/26 unit tests green (`baseline-rules.test.ts` + `typescript-depcruise.test.ts`, incl. 5 new frontend tests); `tsc -b` clean. Independent subagent verification against spec §8 → **PASS on all 8 criteria** (the §4.5 app→api no-false-positive confirmed by trace + a dedicated non-vacuous test; descope integrity confirmed — no sub-feature granularity dependency). Full-suite regression: the 3 integration tests are environmentally red (depcruise binary absent — pre-existing LOW issue), no new unit failures.

## Deviations from spec

- **`.gitignore`** — added `*.tsbuildinfo` to `hi_flow/skills/arch-audit/.gitignore` (outside the spec's touch-list). Hygiene: my `tsc -b` run left a build artifact at the arch-audit root; gitignoring keeps the branch clean. Benign.
- No functional deviations. Feature isolation being absent is **not** a deviation — it was descoped in the spec (§2) and logged as an active-issue.

## Issues discovered

- **Two pre-existing arch-audit latent bugs surfaced** (both flagged by isolated review, verified by hand):
  1. The scan glob was `.ts`-only — frontend was **never** audited, contradicting the manifest's own "depcruise applies to .tsx" premise. **Fixed here** (glob widening).
  2. `vertical-slice-respect` is a **ghost rule** — declared in the registry + docs + counts but emitted by no code, because the flat module model (`fileToModule` → `parts[srcIdx+1]`) collapses sibling features (`features/A` and `features/B` both → module `features`). **Logged** as a MEDIUM active-issue with the root cause; not fixed here (needs a module-granularity change, beyond this scope).
- **Integration tests mutate tracked fixtures** (pre-existing LOW issue) — the regression full-suite run dirtied `tests/fixtures/*/audit-report/`; restored via `git checkout -- tests/fixtures/` before committing. The independent verifier ran only the 2 binary-free unit files to avoid re-triggering this.

## Open items

- **Binary-gated verification (deferred — could not run autonomously).** The glob's actual `.tsx` scan, the scaffold module's `vitest run` green-not-vacuous, and the `.ts` regression require an environment with `dependency-cruiser` present (npm install is ask-listed; avoided per autonomous-mode rules). Recommended next: install the binary (or run in an env that has it) and audit a real React project / the new react scaffold through `cli-run-audit` to confirm `frontend-layered-respect` fires on `.tsx` end-to-end.
- **`react.md` § Cross-tool contracts** — the clause "frontend outside arch-audit scope" is now false (KD3). `~/.claude/architecture/stacks/react.md` is a global operator-personal file (`[pending-Ф3a]`), out of plugin write-scope — operator updates it, or it folds into Ф3a relocation.
- **Branch not pushed/merged** — `feat/frontend-coverage-completion` awaits operator review; merge/PR decision deferred (operator was away during autonomous implementation).
