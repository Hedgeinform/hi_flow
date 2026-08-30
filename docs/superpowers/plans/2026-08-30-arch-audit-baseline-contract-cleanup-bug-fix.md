# ArchAudit Baseline Contract Cleanup Bug-Fix Plan

> **For agentic workers:** Use `superpowers:test-driven-development`, `superpowers:requesting-code-review`, and `superpowers:verification-before-completion`.

**Issue / Active Issue:** not pre-existing
**Accepted contract:** operator decision on 2026-08-30: ordinary cross-module edges remain graph diagnostics and are not findings; signed ArchAudit design default NCCD threshold is `1.0`; Scope names the complementary dependency validation gate.
**Current failure:** the baseline registry still advertises a rule with no producer, one reference says NCCD `0.5`, and generated Scope omits `depcruise --validate`.
**Expected accepted behavior:** reports preserve `dep_graph` while listing only actionable findings, consistently use NCCD `1.0`, and identify complementary dependency validation.
**Bug-fix classification:** architecture-contract correction
**Not a feature because:** no new detector or user-facing product behavior is introduced; the patch removes a dead declaration and restores existing documentation/runtime consistency.
**Tech Stack:** TypeScript, Node.js, Vitest, bundled platform-neutral runtime

## Global Constraints

- Keep Claude Code, Codex, and Cursor on the same shared source and built distribution.
- Do not rewrite historical signed specs or historical implementation plans.
- Do not generate LOW findings for ordinary graph edges.
- Keep the existing D8 graph, metrics, actionable findings, and project rules unchanged.

## Contract and Harness Impact

**Behavior Registry:** not affected
**Runner command:** `npm test` under `hi_flow/skills/arch-audit`
**Architecture contract:** baseline rule registry, current ArchAudit skill/reference/checklist, and generated Scope
**Active Issue handling:** none; close through the implementation report if verification completes

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| baseline registry | operator decision + report metadata | graph edges stay in `dep_graph`, dead LOW rule absent from `known_rule_ids` | registry advertises an impossible finding | `tests/core/report-builder.test.ts` | RED then remove dead rule and suppression branch |
| Scope reminder | `references/baseline-rules.md` Scope contract | generated Markdown names `depcruise --validate` | renderer omits it | `tests/core/report-builder.test.ts` | RED then update renderer |
| NCCD default | signed design + schema + runtime | all current references say `1.0` | one current reference says `0.5` | existing runtime/schema tests + reference review | synchronize current reference |

## File Structure

- Modify: `hi_flow/skills/arch-audit/core/baseline-rules.ts` - remove the dead LOW rule.
- Modify: `hi_flow/skills/arch-audit/core/suppression.ts` - remove its unreachable special case while preserving cycle and parse-error suppression.
- Modify: `hi_flow/skills/arch-audit/core/report-builder.ts` - restore the complete Scope reminder.
- Modify: current ArchAudit skill/references/examples - synchronize the accepted contract.
- Modify: focused tests - prove the public report registry and Scope behavior.
- Rebuild: `hi_flow/skills/arch-audit/dist/*.mjs` - shared platform-neutral runtime.

---

### Task 1: Reproduce the public contract failures

- [x] Add a report-builder assertion that an ordinary `a -> b` edge remains in `dep_graph` but the dead LOW rule is absent from `known_rule_ids` and findings.
- [x] Add a report-builder assertion that Scope contains `depcruise --validate`.
- [x] Run focused RED and confirm both failures have the expected causes.

### Task 2: Implement the minimal cleanup

- [x] Remove `cross-module-import-info` from the live baseline registry, suppression path, current skill/reference/checklist, tests, and current example.
- [x] Synchronize the current NCCD reference to default `1.0`.
- [x] Restore `depcruise --validate` in generated Scope.
- [x] Rebuild the shared distribution and run focused GREEN.

### Task 3: Close the existing PR extension

- [x] Run the full test, typecheck, build, plugin, skill, dependency, and diff gates.
- [x] Run an exact-branch Zhenka audit smoke and isolated report review.
- [x] Create the implementation report and update `PROJECT_STATE.md`.
- [x] Obtain isolated code review, commit, push, and update PR #25 without merging it.

## Completion Protocol

- [x] Implementation report exists beside this plan.
- [x] Focused RED/GREEN evidence is recorded.
- [x] Full verification and exact-branch Zhenka audit pass, or exact blockers are recorded.
- [x] Claude Code, Codex, Cursor, marketplace, and internal package versions remain synchronized at `0.15.7` / `0.3.7`.
- [x] PR #25 contains the verified patch and remains operator-controlled.
