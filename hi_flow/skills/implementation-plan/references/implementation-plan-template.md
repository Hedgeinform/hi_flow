# Template: hi_flow implementation plan

````markdown
# <Feature Name> Implementation Plan

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes and `superpowers:verification-before-completion` before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Feature-spec:** <path>
**Architecture gate/spec:** <waiver path or arch-spec path>
**Behavior Registry Changes:** <new / updated / obsoleted / unchanged-related summary>
**Goal:** <one sentence>
**Architecture:** <2-3 sentences or "waived: existing owners/contracts">
**Tech Stack:** <project stack + test/harness runner>

## Global Constraints

- <copied binding constraints from feature-spec / arch gate / arch-spec>
- Behavior changes must update the Behavior Registry in the same PR.
- `automated` behavior scenarios must be green before completion.
- Every `automated` scenario must map to a concrete executable harness/test file in this plan.

## Behavior Harness Strategy

**Behavior Registry:** `<path>` - existing / create in Task 0
**Runner command:** `<command>`
**Harness backend:** project-native / Cucumber / Playwright / pytest / custom / existing
**Adapters:** <API / CLI / bot handler / DB / event bus / LLM eval / UI>
**CI gate:** <workflow/job/check name or "add in Task N">
**Foundation state:** existing / create in Task 0

### Registry Changes

| Scenario ID | Change | Registry action | Status after change | Reason |
|---|---|---|---|---|
| BS-DOC-018 | new | create registry entry | automated / manual / blocked | <why this behavior exists> |
| BS-DOC-007 | updated | update expectation/history | automated | <why current behavior changes> |
| BS-DOC-003 | obsoleted | mark obsolete with replacement | obsolete | replaced by BS-DOC-018 |
| BS-DOC-011 | unchanged-related | verify unchanged | automated | related but different trigger |

### Harness Artifacts

- Registry: `<path>` - stores current behavior entries and history links.
- Mapping: `<path>` - maps `BS-*` ids to executable cases.
- Behavior tests: `<path>` - <API/UI/agent/eval coverage>.
- Runner: `<package/script/config path>` - exposes `<command>`.
- CI: `<workflow path>` - runs `<command>`.

| Scenario ID | Change | Status | Mapping target | Executable file | Covering task | Observable assertion |
|---|---|---|---|---|---|---|
| BS-DOC-018 | new | automated | `<case id / test name>` | `<path>` | Task 1 | <API response / DB state / event / UI state / bot reply / eval criterion> |
| BS-DOC-007 | updated | automated | `<case id / test name>` | `<path>` | Task 2 | <changed assertion> |
| BS-DOC-003 | obsoleted | obsolete | - | - | Task 3 | <replacement / removal reason> |
| BS-DOC-011 | unchanged-related | automated | `<existing case id / test name>` | `<existing path>` | Task 4 or "verify unchanged" | <assertion preserved> |

## File Structure

- Create: `<path>` - <responsibility>
- Modify: `<path>` - <responsibility>
- Test: `<path>` - <what it verifies>

---

### Task 0: Behavior registry/harness foundation

**Covers:** none - behavior registry/harness foundation

Use this task only if the project lacks Behavior Registry and/or runner/mapping/CI rails for behavior scenarios. Delete this task when foundation already exists.

**Files:**
- Create: `<behavior registry path>`
- Create: `<behavior mapping path>`
- Create: `<behavior test folder/smoke case>`
- Modify: `<package/script/config path>`
- Modify: `<CI workflow path>`

**Interfaces:**
- Consumes: `feature-spec.md#Behavior Registry Changes`
- Produces: `<behavior registry path>`, `<runner command>`, and `BS-* -> executable case` mapping convention

- [ ] **Step 1: Create a runner smoke/self-check**

Run: `<command>`
Expected: PASS for the harness smoke/self-check, or FAIL only because the runner is not wired yet

- [ ] **Step 2: Wire runner and mapping convention**

Create/update the registry, runner, mapping file, and folder convention named above.

- [ ] **Step 3: Run behavior runner**

Run: `<command>`
Expected: runner executes successfully without intentional failing samples in the CI path

- [ ] **Step 4: Add CI hook**

Run: `<CI local equivalent or config validation>`
Expected: behavior gate is part of merge/delivery checks

---

### Task 1: <Implement new/updated behavior>

**Covers:** BS-DOC-018, BS-DOC-007

**Registry actions:** create BS-DOC-018; update BS-DOC-007

**Files:**
- Create: `<path>`
- Modify: `<path>`
- Test: `<path>`

**Interfaces:**
- Consumes: <exact signatures / APIs / data contracts>
- Produces: <exact signatures / APIs / data contracts>

- [ ] **Step 1: Write the failing behavior/unit test**

```<language>
<complete test or scenario skeleton>
```

- [ ] **Step 2: Run test to verify RED**

Run: `<command>`
Expected: FAIL because <feature missing / scenario unmapped>

- [ ] **Step 3: Implement minimal code**

```<language>
<concrete implementation guidance or code block where useful>
```

- [ ] **Step 4: Run focused verification**

Run: `<command>`
Expected: PASS

- [ ] **Step 5: Run behavior gate if affected**

Run: `<behavior:test command>`
Expected: relevant scenarios PASS

- [ ] **Step 6: Commit**

```bash
git add <files>
git commit -m "<message>"
```

---

### Task 2: <Obsolete replaced behavior>

**Covers:** BS-DOC-003

**Registry actions:** mark BS-DOC-003 obsolete with replacement BS-DOC-018

**Files:**
- Modify: `<behavior registry path>`
- Modify: `<behavior mapping path if obsolete case had executable mapping>`
- Test: `<behavior gate / mapping validation>`

**Interfaces:**
- Consumes: replacement scenario BS-DOC-018
- Produces: obsolete registry entry with replacement pointer

- [ ] **Step 1: Update registry and mapping**

Mark the scenario obsolete, add the replacement/removal reason, and remove or redirect obsolete executable mapping according to project convention.

- [ ] **Step 2: Run behavior gate / mapping validation**

Run: `<behavior:test command or mapping validation>`
Expected: obsolete scenario is not enforced as active behavior; replacement scenario is enforced if automated.

---

## Completion Protocol

- [ ] **Implementation report created**

Write: `<feature-spec path>-report.md` or the project-configured implementation report path.

Report must include: what was done, deviations from spec, issues discovered, open items, and final status (`completed` / `partial` / `blocked`).

- [ ] **Final verification passed or blockers recorded**

Run:

```bash
<focused verification command>
<behavior:test command if registry exists>
<typecheck/lint/test command required by project gates>
```

Expected: PASS. If any command cannot run or fails for an external reason, record the exact command and blocker in the implementation report.

- [ ] **Isolated review completed**

Run an isolated review of the implementation against this plan, the signed feature-spec, Behavior Registry changes, and architecture gate/spec. Fix blocking findings before completion, or record accepted follow-ups explicitly.

- [ ] **Architecture audit completed or explicitly skipped**

Run `hi_flow:arch-audit` after implementation review when architecture changed, an arch-spec/rules-patch exists, or the project requires post-implementation architecture verification.

If skipped, record the reason in the implementation report and `PROJECT_STATE.md`.

- [ ] **Project State updated**

Update `PROJECT_STATE.md` (create from `hi_flow:project-state` template if missing) with:

- current phase after implementation;
- last completed artifact/report;
- final verification state;
- current blockers/open items;
- next hi_flow action.

Do not rewrite signed feature-specs just to match updated Behavior Registry entries; signed specs are historical decision artifacts, while the registry is the living behavior source.
````

## Filling notes

- Keep the Superpowers-compatible header. The executor may use `task-brief` extraction and SDD review loops.
- Do not require `superpowers:writing-plans`; this template is the plan.
- Use exact file paths and exact commands.
- Each behavior-impact task must name `Covers: BS-...`.
- Each behavior-impact task must name its registry actions.
- Each `automated` scenario must name a mapping target and executable file in the Behavior Harness Strategy table.
- Foundation-only tasks may say `Covers: none - foundation task`.
- Keep the Completion Protocol in the final plan. It is not optional boilerplate; it closes the hi_flow loop after execution.
