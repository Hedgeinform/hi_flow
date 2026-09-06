# Arch-Audit no-orphans Module Granularity Bug-Fix Plan

> **For agentic workers:** REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes, `superpowers:verification-before-completion` before claiming completion, and an isolated review before hand-off. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue / Active Issue:** not pre-existing
**Accepted contract:** D8 findings and `baseline:no-orphans` describe architecture modules; `metrics.dep_graph` and Ca are the canonical module-level evidence. A file-level dependency-cruiser violation cannot claim an imported module is orphaned.
**Current failure:** a dead file in an otherwise imported module becomes a D8 `baseline:no-orphans` finding whose explanation says that the whole module is unimported.
**Expected accepted behavior:** retain `baseline:no-orphans` only when its source module has no incoming module-graph edge; discard file-only signals inside an imported module.
**Bug-fix classification:** implementation deviation at the dependency-cruiser file-to-module aggregation boundary
**Not a feature because:** the D8 format, baseline explanation, report labels, and existing comments already define `no-orphans` as a module property.
**Tech Stack:** TypeScript, Node.js, dependency-cruiser, Vitest, generated standalone ESM runtime

## Global Constraints

- Preserve the existing `baseline:no-orphans` rule identifier and `MEDIUM` severity.
- Do not change project rules, rule precedence, or the module-root convention.
- Keep real module-level orphans visible.
- Rebuild committed `dist/` and synchronize patch-release metadata only when repository release conventions require it.
- Do not push, open a PR, merge, release, or install dependencies.

## Contract and Harness Impact

**Behavior Registry:** not affected; this is an internal D8 architecture-contract regression.
**Runner command:** `npm test -- --run tests/integration/no-orphans-module-granularity.test.ts`
**Architecture contract:** `baseline:no-orphans` is module-level D8 evidence and must agree with `metrics.dep_graph`/Ca.
**Active Issue handling:** none if verified; record a narrow issue only if the fix is partial or blocked.

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| D8 no-orphans granularity | `core/types.ts`, `core/baseline-rules.ts`, `helpers/parse-depcruise-output.ts` | only module-level orphans become D8 findings | a dead file makes an imported module look orphaned | `tests/integration/no-orphans-module-granularity.test.ts` | add fixture, prove RED, filter by module Ca |

## File Structure

- Create: `hi_flow/skills/arch-audit/tests/fixtures/no-orphans-mixed-module-project/` — real TypeScript reproduction fixture.
- Create: `hi_flow/skills/arch-audit/tests/integration/no-orphans-module-granularity.test.ts` — end-to-end regression proof against the bundled dependency-cruiser runtime.
- Modify: `hi_flow/skills/arch-audit/helpers/parse-depcruise-output.ts` — retain no-orphans only for modules with Ca zero.
- Modify: `hi_flow/skills/arch-audit/tests/helpers/parse-depcruise-output.test.ts` — unit proof of the file/module aggregation rule.
- Modify if release convention applies: plugin manifests, `package.json`, `package-lock.json`, `PROJECT_STATE.md`.
- Create: `docs/superpowers/plans/2026-09-06-arch-audit-no-orphans-module-granularity-bug-fix-report.md` — verified completion report.

### Task 1: Reproduce the module-granularity failure

- [x] Create a fixture where `office-integration-api` and `office-integration-onlyoffice` import `office-integration-app/index.ts`, while `office-integration-app/storage-key.ts` has no importer.
- [x] Add an integration assertion that the report has `Ca: 2` for `office-integration-app` and no `baseline:no-orphans` finding for that module.
- [x] Run the focused test and capture RED: current runtime emits the false module finding.

### Task 2: Restore the existing D8 boundary

- [x] In `parseDepcruiseOutput`, after deriving Ca/Ce from the module graph, remove `no-orphans` raw findings whose source module has `Ca > 0`.
- [x] Add a focused parser test proving an unimported file inside an imported module is not elevated to a module finding, while a module with Ca zero remains eligible.
- [x] Run focused integration and parser GREEN.

### Task 3: Distribute and record the verified fix

- [x] Rebuild `dist/`, run `build:check`, typecheck, full `npm test`, and inspect the final diff against this plan.
- [x] Apply the repository patch-release convention if the runtime change is distributable; otherwise record why metadata was unchanged.
- [x] Update `PROJECT_STATE.md` with the current verified state and write the implementation report.
- [x] Run an isolated review for the plan and the D8 contract, resolve blocking findings, and record the outcome.
