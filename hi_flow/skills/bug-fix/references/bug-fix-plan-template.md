# Template: hi_flow bug-fix plan

````markdown
# <Issue Name> Bug-Fix Plan

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes, `superpowers:requesting-code-review` before completion, and `superpowers:verification-before-completion` before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue / Active Issue:** <AI-... or "not pre-existing">
**Accepted contract:** <Behavior Registry scenario / arch rule / signed artifact section / failing accepted test>
**Current failure:** <observable symptom>
**Expected accepted behavior:** <one sentence>
**Bug-fix classification:** behavior regression / architecture-contract violation / implementation deviation / harness defect / mixed
**Not a feature because:** <why expected behavior is already accepted>
**Tech Stack:** <project stack + test/harness runner>

## Global Constraints

- Preserve accepted product behavior; do not introduce new behavior expectations.
- Do not rewrite signed feature-specs or arch-specs.
- Update an existing Behavior Registry only for accepted-contract capture, mapping, status, or history.
- Do not create broad Behavior Registry / harness foundation in this bug-fix. If missing rails are wider than this one accepted-contract proof, record `hi_flow:behavior-migration` as follow-up.
- If implementation reveals desired behavior is different from the accepted contract, stop and escalate to `hi_flow:feature-spec`.

## Contract and Harness Impact

**Behavior Registry:** `<path>` - existing / not present (no broad foundation in this plan)
**Runner command:** `<command or not affected>`
**Architecture contract:** `<rule/audit finding/rules-patch or not affected>`
**Active Issue handling:** <remove/mark fixed after verification, update if partial, or none>

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| BS-... / AI-... / rule id | <path/section> | <expected> | <actual> | <test/harness file> | verify / add coverage / fix / update issue |

## File Structure

- Create: `<path>` - <responsibility>
- Modify: `<path>` - <responsibility>
- Test: `<path>` - <what it verifies>

---

### Task 1: Reproduce the accepted-contract failure

**Covers:** <BS-... / AI-... / rule id>

**Files:**
- Create/Modify: `<test or harness path>`

**Interfaces:**
- Consumes: <current public API / UI / CLI / module boundary>
- Produces: failing proof of the accepted-contract violation

- [ ] **Step 1: Write or identify the failing proof**

Add the smallest behavior/harness/unit/integration test that proves the accepted contract is currently violated. If an existing failing test already proves it, name it and do not duplicate it.

- [ ] **Step 2: Run focused RED**

Run: `<focused command>`
Expected: FAIL because `<current failure>`.

---

### Task 2: Implement the minimal contract-preserving fix

**Covers:** <BS-... / AI-... / rule id>

**Files:**
- Modify: `<implementation path>`
- Test: `<test path>`

**Interfaces:**
- Consumes: <contracts>
- Produces: <fixed behavior / restored boundary>

- [ ] **Step 1: Implement minimal fix**

Change only what is needed to restore the accepted contract.

- [ ] **Step 2: Run focused GREEN**

Run: `<focused command>`
Expected: PASS.

- [ ] **Step 3: Run affected behavior/architecture gate**

Run: `<behavior:test / arch-audit / relevant command>`
Expected: PASS, or blocked with exact reason.

---

### Task 3: Update living artifacts

**Covers:** project state / registry mapping / Active Issue lifecycle

Use this task only for artifacts affected by the fix.

- [ ] **Step 1: Update Behavior Registry / mapping**

Only update capture, status, executable mapping, or history for accepted behavior. Do not add a new product expectation.

- [ ] **Step 2: Update Active Issue**

Remove/mark the Active Issue fixed only after verification. If partial/blocked, keep or create an Active Issue row with a narrower current impact and next action.

- [ ] **Step 3: Update Project State**

Set current phase, last completed plan/report, latest verification, blockers/open items, and ready next action.

---

## Completion Protocol

- [ ] **Implementation report created**

Write: `<plan path>-report.md` or the project-configured implementation report path.

Report must include: accepted contract, reproduction proof, fix summary, deviations, issues discovered, open items, and final status (`completed` / `partial` / `blocked`).

- [ ] **Final verification passed or blockers recorded**

Run:

```bash
<focused regression command>
<behavior:test command if affected>
<typecheck/lint/test command required by project gates>
```

Expected: PASS. If any command cannot run or fails for an external reason, record the exact command and blocker in the report.

- [ ] **Isolated review completed**

Review against this bug-fix plan and the accepted contract. Fix blocking findings before completion, or record accepted follow-ups explicitly.

- [ ] **Architecture audit completed or explicitly skipped**

Run `hi_flow:arch-audit` if the fix touches architecture boundaries or the Target Architecture Contract. If skipped, record why.

- [ ] **Living artifacts updated**

Update `PROJECT_STATE.md`, affected existing Behavior Registry mapping/status, and Active Issues according to the verified outcome.
````

## Filling notes

- Keep the plan narrow. If expected behavior changes, this is no longer a bug-fix plan.
- Prefer one failing proof over broad exploratory testing.
- If the project lacks behavior rails, do not create project-wide registry/harness foundation here. Use the smallest focused regression proof for this fix and route durable retrofitting to `hi_flow:behavior-migration`.
