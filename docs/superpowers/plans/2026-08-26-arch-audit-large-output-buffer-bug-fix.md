# ArchAudit Large Dependency Graph Output Bug-Fix Plan

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes, `superpowers:requesting-code-review` before completion, and `superpowers:verification-before-completion` before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue / Active Issue:** not pre-existing
**Accepted contract:** `hi_flow/skills/arch-audit/SKILL.md` installed-plugin audit flow and the self-contained runtime contract restored by `docs/superpowers/plans/2026-08-16-arch-audit-standalone-runtime-bug-fix.md`
**Current failure:** a valid dependency-cruiser JSON report larger than Node's default synchronous child-process buffer is truncated at 1,114,112 bytes; `runBundledDepcruise` returns the partial stdout after `ENOBUFS`, and JSON parsing fails with `Unterminated string`.
**Expected accepted behavior:** ArchAudit accepts ordinary project dependency graphs larger than 1 MiB and never treats buffer-truncated stdout as complete dependency-cruiser JSON.
**Bug-fix classification:** implementation deviation
**Not a feature because:** the installed-plugin audit already promises to build and parse the complete dependency graph; supporting a graph above the child-process default buffer does not introduce a new product behavior.
**Tech Stack:** TypeScript, Node.js `execFileSync`, dependency-cruiser 17.4.3, Vitest, esbuild

## Global Constraints

- Preserve accepted product behavior; do not introduce new behavior expectations.
- Keep the synchronous full-JSON pipeline; do not add streaming infrastructure while the next boundary immediately performs `JSON.parse` on the complete string.
- Preserve complete JSON emitted by dependency-cruiser on legitimate non-zero exits.
- Do not accept partial stdout from an `ENOBUFS` failure.
- Synchronize the internal ArchAudit package and all platform plugin manifests for the repair release.

## Contract and Harness Impact

**Behavior Registry:** project-wide references under `hi_flow/references/behavior-registry/` are not affected; no new behavior contract is needed.
**Runner command:** `npm test -- tests/core/depcruise-runtime.test.ts`
**Architecture contract:** no architecture boundary changes; this restores the existing self-contained runtime adapter.
**Active Issue handling:** none if the regression and full release verification pass; create a narrow Active Issue only if the fix remains partial or blocked.

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| arch-audit/complete-dependency-graph | `hi_flow/skills/arch-audit/SKILL.md` installed-plugin audit flow | Complete dependency-cruiser JSON reaches the parser | Node aborts above its default buffer and partial stdout is returned | `hi_flow/skills/arch-audit/tests/core/depcruise-runtime.test.ts` | add RED for output above 1 MiB and `ENOBUFS`, then restore the boundary |

## File Structure

- Create: `docs/superpowers/plans/2026-08-26-arch-audit-large-output-buffer-bug-fix-report.md` - final evidence and release status.
- Modify: `hi_flow/skills/arch-audit/core/depcruise-runtime.ts` - bounded large-output buffer and fail-closed `ENOBUFS` handling.
- Modify: `hi_flow/skills/arch-audit/tests/core/depcruise-runtime.test.ts` - real large-output regression and error-path proof.
- Modify: `hi_flow/skills/arch-audit/dist/cli-run-audit.mjs` - regenerated shipped runtime.
- Modify: ArchAudit package metadata and Claude Code, Codex, Cursor, and marketplace manifests - repair release versions.
- Modify: `PROJECT_STATE.md` - current verified release state and next action.

---

### Task 1: Reproduce the accepted-contract failure

**Covers:** arch-audit/complete-dependency-graph

**Files:**
- Modify: `hi_flow/skills/arch-audit/tests/core/depcruise-runtime.test.ts`

**Interfaces:**
- Consumes: `runBundledDepcruise` and its injected child-process boundary
- Produces: failing proof for real JSON output above 1 MiB and for `ENOBUFS` with partial stdout

- [x] **Step 1: Write the failing proofs**

Add a temporary bundled CLI that writes valid JSON larger than the default buffer, plus an injected `ENOBUFS` failure carrying partial stdout.

- [x] **Step 2: Run focused RED**

Run: `npx vitest run tests/core/depcruise-runtime.test.ts`
Expected: FAIL because the large JSON is truncated and the `ENOBUFS` branch returns partial stdout.

---

### Task 2: Implement the minimal contract-preserving fix

**Covers:** arch-audit/complete-dependency-graph

**Files:**
- Modify: `hi_flow/skills/arch-audit/core/depcruise-runtime.ts`
- Test: `hi_flow/skills/arch-audit/tests/core/depcruise-runtime.test.ts`
- Regenerate: `hi_flow/skills/arch-audit/dist/cli-run-audit.mjs`

**Interfaces:**
- Consumes: complete dependency-cruiser JSON or a child-process failure
- Produces: complete bounded JSON output, or a clear failure before parsing partial output

- [x] **Step 1: Implement minimal fix**

Set an explicit bounded `maxBuffer` large enough for real project graphs on the audit invocation. Detect `ENOBUFS` before the legacy non-zero-exit stdout recovery and throw a contextual error. Leave the version probe and complete non-zero JSON behavior unchanged.

- [x] **Step 2: Run focused GREEN**

Run: `npm test -- tests/core/depcruise-runtime.test.ts`
Expected: PASS.

- [x] **Step 3: Run affected runtime and distribution gates**

Run: `npm run build`, `npm run build:check`, and the standalone distribution regression.
Expected: PASS.

---

### Task 3: Release and update living artifacts

**Covers:** release metadata and current project state

- [x] **Step 1: Synchronize release metadata**

Bump the internal ArchAudit runtime package and all Claude Code, Codex, Cursor, and marketplace manifests for hi_flow `0.15.3`.

- [x] **Step 2: Update Project State**

Record the repaired large-output boundary, latest verification, current plan/report, and the installed-plugin rerun as the ready next action.

---

## Completion Protocol

- [x] **Implementation report created**

Write: `docs/superpowers/plans/2026-08-26-arch-audit-large-output-buffer-bug-fix-report.md`.

- [x] **Final verification passed or blockers recorded**

Run the focused regression, full `npm test`, `npm run typecheck`, `npm run build:check`, `npm audit --omit=dev`, manifest and skill validation, and `git diff --check`.

- [x] **Isolated review completed**

Review against this bug-fix plan and the accepted complete-graph contract. Fix blocking findings before completion, or record accepted follow-ups explicitly.

- [x] **Architecture audit explicitly skipped**

This fix changes only the existing child-process adapter limit and failure classification; it does not add or alter an architecture boundary.

- [x] **Living artifacts updated**

Update `PROJECT_STATE.md`; leave Behavior Registry and Active Issues unchanged when the verified fix is complete.
