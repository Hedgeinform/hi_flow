# Arch-Audit D8 NCCD Source Contract Bug-Fix Plan

> **For agentic workers:** REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes, `superpowers:requesting-code-review` before completion, and `superpowers:verification-before-completion` before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue / Active Issue:** not pre-existing
**Accepted contract:** `hi_flow/skills/arch-audit/references/d8-schema.md` requires graph-backed finding sources, while `baseline:nccd-breach` is the established project-level aggregate emitted by `core/report-builder.ts`; the mandatory `references/self-review-checklist.md` must describe the same exception as the executable validator.
**Current failure:** hi_flow 0.15.5 emits `source.module: "<project>"` for NCCD and the runtime validator accepts it, but the mandatory self-review checklist rejects every source absent from `metrics.dep_graph`.
**Expected accepted behavior:** `<project>` is valid only as the source of `type: nccd` / `baseline:nccd-breach`; all other sources are real dependency-graph modules.
**Bug-fix classification:** mixed implementation deviation and harness-contract defect
**Not a feature because:** project-level NCCD output already exists and passed runtime validation; this change only makes all D8 validators express the same accepted contract.
**Tech Stack:** TypeScript, Node.js, Vitest, AJV, generated standalone ESM runtime

## Global Constraints

- Preserve accepted product behavior; do not introduce new finding types or rule identifiers.
- Do not normalize legacy project-rule principles silently; Zhenka's 13 non-canonical values remain a project-data migration.
- Do not change non-Git `audit_sha` behavior in this fix; that compatibility decision is separate from the observed NCCD contradiction.
- Keep Claude, Codex, and Cursor plugin versions synchronized for the patch release.

## Contract and Harness Impact

**Behavior Registry:** not affected; this is an internal D8 contract with focused executable coverage
**Runner command:** `npm test -- --run tests/core/d8-schema-validator.test.ts`
**Architecture contract:** D8 finding-to-graph semantic validation and mandatory self-review checklist
**Active Issue handling:** none if fully verified; add a narrow issue only if completion is partial or blocked

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| D8 NCCD source | `references/d8-schema.md`, `core/report-builder.ts` | only `baseline:nccd-breach` uses `<project>` | validator and checklist disagree | `tests/core/d8-schema-validator.test.ts` | add strict positive/negative boundary and align checklist |

## File Structure

- Modify: `hi_flow/skills/arch-audit/core/d8-schema-validator.ts` - enforce the reserved project-level source sentinel
- Modify: `hi_flow/skills/arch-audit/tests/core/d8-schema-validator.test.ts` - prove invalid sentinel use is rejected
- Modify: `hi_flow/skills/arch-audit/references/self-review-checklist.md` - state the exact NCCD exception
- Modify: plugin manifests and marketplace version - publish synchronized patch release
- Modify: `PROJECT_STATE.md` - record the verified current state
- Create: this plan's `-report.md` - completion evidence

---

### Task 1: Reproduce the accepted-contract failure

**Covers:** D8 NCCD source

**Files:**
- Modify: `hi_flow/skills/arch-audit/tests/core/d8-schema-validator.test.ts`

**Interfaces:**
- Consumes: `validateD8Report(report, context)`
- Produces: failing proofs for non-NCCD `<project>` use and module-scoped NCCD

- [x] **Step 1: Write the failing proofs**

Add tests that require `<project>` to be reserved for `type: nccd` / `baseline:nccd-breach`, and require that NCCD owner to use `<project>`.

- [x] **Step 2: Run focused RED**

Run: `npm test -- --run tests/core/d8-schema-validator.test.ts`
Expected: FAIL because the current validator exempts every `<project>` source and permits graph-module NCCD sources.

---

### Task 2: Implement the minimal contract-preserving fix

**Covers:** D8 NCCD source

**Files:**
- Modify: `hi_flow/skills/arch-audit/core/d8-schema-validator.ts`
- Modify: `hi_flow/skills/arch-audit/references/self-review-checklist.md`
- Test: `hi_flow/skills/arch-audit/tests/core/d8-schema-validator.test.ts`

**Interfaces:**
- Consumes: D8 findings and dependency graph
- Produces: one explicit project-aggregate exception shared by runtime validation and self-review

- [x] **Step 1: Implement minimal validator fix**

Reserve `<project>` for the existing NCCD rule/type pair and require that pair to use the sentinel.

- [x] **Step 2: Align the mandatory checklist**

Document the same exact exception; do not add other virtual module sentinels.

- [x] **Step 3: Run focused GREEN**

Run: `npm test -- --run tests/core/d8-schema-validator.test.ts`
Expected: PASS.

- [x] **Step 4: Rebuild and run affected gate**

Run: `npm run build`, `npm run build:check`, `npm run typecheck`, `npm test`.
Expected: PASS with committed `dist/` matching TypeScript sources.

---

### Task 3: Publish synchronized patch metadata and close state

**Covers:** plugin distribution and project-state lifecycle

- [x] **Step 1: Bump release metadata**

Set Claude, Codex, Cursor, and marketplace plugin versions to `0.15.6`.

- [x] **Step 2: Update Project State**

Record this plan/report, focused regression, full verification, and the remaining external Zhenka rule migration.

- [x] **Step 3: Create implementation report**

Write `docs/superpowers/plans/2026-08-29-arch-audit-d8-nccd-followup-bug-fix-report.md` with exact commands and results.

---

## Completion Protocol

- [x] Focused RED and GREEN captured.
- [x] Generated runtime rebuilt and `build:check` clean.
- [x] Typecheck and full test suite pass.
- [x] Isolated code review completed with blocking findings resolved.
- [x] Architecture audit explicitly skipped: this restores the existing D8 contract and does not change project module boundaries.
- [x] Implementation report and `PROJECT_STATE.md` updated.
