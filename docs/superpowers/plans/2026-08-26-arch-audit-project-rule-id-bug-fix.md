# ArchAudit Project Rule Identifier Bug-Fix Plan

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes, `superpowers:requesting-code-review` before completion, and `superpowers:verification-before-completion` before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue / Active Issue:** not pre-existing
**Accepted contract:** `hi_flow/skills/arch-audit/references/d8-schema.json` defines project findings as `project:<rule-name>` cross-references; `hi_flow/skills/arch-audit/core/project-rules.ts` normalizes project rule names to that namespace.
**Current failure:** dependency-cruiser returns the canonical rule id `project:no-tools-to-dispatcher`, but `enrichFindings` indexes project rules only by the stripped bare name and aborts with `unknown rule_id`.
**Expected accepted behavior:** a triggered project rule is enriched and emitted under the same canonical `project:<rule-name>` identifier used by configuration and dependency-cruiser.
**Bug-fix classification:** implementation deviation
**Not a feature because:** project rules and their namespaced D8 findings are an existing ArchAudit contract; the pipeline currently fails while resolving an already loaded rule.
**Tech Stack:** TypeScript, Node.js, dependency-cruiser 17.4.3, Vitest, esbuild

## Global Constraints

- Preserve strict failure for genuinely unknown rule identifiers.
- Use the existing canonical `project:` namespace; do not introduce aliases, migration infrastructure, or a second identifier format.
- Keep the fix at the enrichment lookup boundary; do not change dependency-cruiser output or project-rule storage.
- Synchronize the internal ArchAudit package and all platform plugin manifests for the repair release.

## Contract and Harness Impact

**Behavior Registry:** project-wide references under `hi_flow/references/behavior-registry/` are not affected; no new behavior contract is needed.
**Runner command:** `npx vitest run tests/core/report-builder.test.ts`
**Architecture contract:** restores D8 `rule_id` cross-reference semantics without changing an architecture boundary.
**Active Issue handling:** none if the regression and full release verification pass; create a narrow Active Issue only if execution remains partial or blocked.

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| arch-audit/project-rule-id | `hi_flow/skills/arch-audit/references/d8-schema.json` `finding.rule_id` | `project:<name>` survives config, parser, enrichment, and report generation | enrichment strips `project:` from its lookup keys but receives the namespaced id | `hi_flow/skills/arch-audit/tests/core/report-builder.test.ts` | add RED for a triggered project rule, then fix the lookup |

## File Structure

- Create: `docs/superpowers/plans/2026-08-26-arch-audit-project-rule-id-bug-fix-report.md` - final evidence and release status.
- Modify: `hi_flow/skills/arch-audit/helpers/enrich-findings.ts` - canonical project-rule lookup.
- Modify: `hi_flow/skills/arch-audit/tests/core/report-builder.test.ts` - pipeline regression for a triggered `project:*` rule.
- Modify: `hi_flow/skills/arch-audit/core/types.ts` - accurate raw rule identifier contract comment if needed.
- Modify: `hi_flow/skills/arch-audit/dist/cli-run-audit.mjs` - regenerated shipped runtime.
- Modify: ArchAudit package metadata and Claude Code, Codex, Cursor, and marketplace manifests - repair release versions.
- Modify: `PROJECT_STATE.md` - current verified release state and next action.

---

### Task 1: Reproduce the accepted-contract failure

**Covers:** arch-audit/project-rule-id

**Files:**
- Modify: `hi_flow/skills/arch-audit/tests/core/report-builder.test.ts`

**Interfaces:**
- Consumes: `.audit-rules.yaml`, dependency-cruiser violation JSON, and `buildReport`
- Produces: a failing proof that the canonical project identifier cannot be enriched

- [x] **Step 1: Write the failing proof**

Add a synthetic project rule whose dependency-cruiser violation is returned as `project:no-tools-to-dispatcher`; assert that the generated D8 finding preserves the id, severity, principle, and explanation.

- [x] **Step 2: Run focused RED**

Run: `npx vitest run tests/core/report-builder.test.ts`
Expected: FAIL with `enrich-findings: unknown rule_id 'project:no-tools-to-dispatcher'`.

---

### Task 2: Implement the minimal contract-preserving fix

**Covers:** arch-audit/project-rule-id

**Files:**
- Modify: `hi_flow/skills/arch-audit/helpers/enrich-findings.ts`
- Modify: `hi_flow/skills/arch-audit/core/types.ts` if its raw identifier comment contradicts the verified pipeline
- Test: `hi_flow/skills/arch-audit/tests/core/report-builder.test.ts`
- Regenerate: `hi_flow/skills/arch-audit/dist/cli-run-audit.mjs`

**Interfaces:**
- Consumes: canonical baseline or project rule ids from parsed findings
- Produces: enriched D8 findings, while retaining strict rejection of unknown ids

- [x] **Step 1: Implement minimal fix**

Index project rules by their canonical stored name and resolve the parser-provided id directly. Keep the existing unknown-rule error unchanged.

- [x] **Step 2: Run focused GREEN**

Run: `npx vitest run tests/core/report-builder.test.ts`
Expected: PASS.

- [x] **Step 3: Run affected runtime and distribution gates**

Run: `npm run build`, `npm run build:check`, and the standalone distribution regression.
Expected: PASS.

---

### Task 3: Release and update living artifacts

**Covers:** release metadata and current project state

- [x] **Step 1: Synchronize release metadata**

Bump the internal ArchAudit runtime package and all Claude Code, Codex, Cursor, and marketplace manifests for the repair release.

- [x] **Step 2: Update Project State**

Record the restored project-rule pipeline, latest verification, current plan/report, and installed-plugin rerun as the ready next action.

---

## Completion Protocol

- [x] **Implementation report created**

Write: `docs/superpowers/plans/2026-08-26-arch-audit-project-rule-id-bug-fix-report.md`.

- [x] **Final verification passed or blockers recorded**

Run the focused regression, full `npm test`, `npm run typecheck`, `npm run build:check`, `npm audit --omit=dev`, manifest and skill validation, and `git diff --check`.

- [x] **Isolated review completed**

Review against this bug-fix plan and the accepted project-rule identifier contract. Fix blocking findings before completion, or record accepted follow-ups explicitly.

- [x] **Architecture audit explicitly skipped**

This fix aligns identifiers within the existing report-building pipeline and does not add or alter an architecture boundary.

- [x] **Living artifacts updated**

Update `PROJECT_STATE.md`; leave Behavior Registry and Active Issues unchanged when the verified fix is complete.
