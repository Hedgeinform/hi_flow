# Template: hi_flow implementation plan

````markdown
# <Feature Name> Implementation Plan

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes. Steps use checkbox (`- [ ]`) syntax for tracking.

**Feature-spec:** <path>
**Architecture gate/spec:** <waiver path or arch-spec path>
**Behavior Contract:** <BS-001..BS-00N summary>
**Goal:** <one sentence>
**Architecture:** <2-3 sentences or "waived: existing owners/contracts">
**Tech Stack:** <project stack + test/harness runner>

## Global Constraints

- <copied binding constraints from feature-spec / arch gate / arch-spec>
- Behavior changes must update Behavior Contract scenario rows in the same PR.
- `automated` behavior scenarios must be green before completion.
- Every `automated` scenario must map to a concrete executable harness/test file in this plan.

## Behavior Harness Strategy

**Runner command:** `<command>`
**Harness backend:** project-native / Cucumber / Playwright / pytest / custom / existing
**Adapters:** <API / CLI / bot handler / DB / event bus / LLM eval / UI>
**CI gate:** <workflow/job/check name or "add in Task N">
**Foundation state:** existing / create in Task 0

### Harness Artifacts

- Mapping: `<path>` - maps `BS-*` ids to executable cases.
- Behavior tests: `<path>` - <API/UI/agent/eval coverage>.
- Runner: `<package/script/config path>` - exposes `<command>`.
- CI: `<workflow path>` - runs `<command>`.

| Scenario ID | Status | Mapping target | Executable file | Covering task | Observable assertion |
|---|---|---|---|---|---|
| BS-001 | automated | `<case id / test name>` | `<path>` | Task 1 | <API response / DB state / event / UI state / bot reply / eval criterion> |
| BS-002 | blocked: <reason> | - | - | - | <unblock condition> |

## File Structure

- Create: `<path>` - <responsibility>
- Modify: `<path>` - <responsibility>
- Test: `<path>` - <what it verifies>

---

### Task 0: Behavior harness foundation

**Covers:** none - behavior harness foundation

Use this task only if the project lacks runner/mapping/CI rails for behavior scenarios. Delete this task when foundation already exists.

**Files:**
- Create: `<behavior mapping path>`
- Create: `<behavior test folder/sample case>`
- Modify: `<package/script/config path>`
- Modify: `<CI workflow path>`

**Interfaces:**
- Consumes: `feature-spec.md#Behavior Contract`
- Produces: `<runner command>` and `BS-* -> executable case` mapping convention

- [ ] **Step 1: Create a runner smoke/self-check**

Run: `<command>`
Expected: PASS for the harness smoke/self-check, or FAIL only because the runner is not wired yet

- [ ] **Step 2: Wire runner and mapping convention**

Create/update the runner, mapping file, and folder convention named above.

- [ ] **Step 3: Run behavior runner**

Run: `<command>`
Expected: runner executes successfully without intentional failing samples in the CI path

- [ ] **Step 4: Add CI hook**

Run: `<CI local equivalent or config validation>`
Expected: behavior gate is part of merge/delivery checks

---

### Task 1: <Name>

**Covers:** BS-001, BS-003

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
````

## Filling notes

- Keep the Superpowers-compatible header. The executor may use `task-brief` extraction and SDD review loops.
- Do not require `superpowers:writing-plans`; this template is the plan.
- Use exact file paths and exact commands.
- Each behavior-impact task must name `Covers: BS-...`.
- Each `automated` scenario must name a mapping target and executable file in the Behavior Harness Strategy table.
- Foundation-only tasks may say `Covers: none - foundation task`.
