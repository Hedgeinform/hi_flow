---
name: implementation-plan
description: Use when the operator asks for a hi_flow implementation plan, impl-plan, or plan from signed hi_flow artifacts: feature-spec with Behavior Contract plus architecture-gate waiver or arch-spec. Prefer this over superpowers:writing-plans inside the hi_flow pipeline. Produces a Superpowers-compatible, behavior-first implementation plan for execution by subagent-driven-development or equivalent workflows.
---

# implementation-plan

## Overview

implementation-plan is the hi_flow bridge from signed specs to execution. It writes a behavior-first implementation plan that is compatible with Superpowers execution skills while preserving hi_flow's Behavior Contract, architecture gate, and harness discipline.

It does **not** execute the plan. Recommended execution: `superpowers:subagent-driven-development`; fallback: `superpowers:executing-plans` or another workflow that follows the plan exactly.

## Inputs

Required:

- signed `feature-spec.md` with `## Behavior Contract`;
- either an architecture-gate waiver or a signed `arch-spec.md`;
- current project code state, read from the repository, not inferred from docs alone.

Conditional:

- arch-spec rules-patch path, if emitted;
- bootstrap foundation notes if behavior harness runner/folders are not yet present;
- existing tests/harness commands.

If the feature-spec has no Behavior Contract, stop and route back to `hi_flow:feature-spec`. If architecture impact has not been gated, stop and route to `hi_flow:arch-spec`.

## Routing

This skill replaces `superpowers:writing-plans` **only inside the hi_flow pipeline**. Generic plans outside hi_flow can still use Superpowers directly.

Read `hi_flow/references/workflow-routing.md` when routing is ambiguous.

## Output

Write a plan to:

`<project>/docs/superpowers/plans/YYYY-MM-DD-<feature-slug>-implementation.md`

Use the structure in `references/implementation-plan-template.md`. The plan must be executable by an agent that knows Superpowers SDD but has no conversation context.

## Planning Flow

1. **Read current state.** Inspect the repo before planning file changes. Do not trust target-state docs over code.
2. **Extract Behavior Contract.** Build a scenario matrix: `scenario_id`, status, observable result, source fork, automation target.
3. **Read architecture gate/spec.** Pull constraints, owners, invariants, delegated code-sight forks, deployment-bound bindings.
4. **Map harness strategy.** Decide how each automated scenario is checked: project-native runner by default; Cucumber/Gherkin only when the project explicitly chooses it or its cross-role value is clear.
5. **Map files and interfaces.** List files to create/modify and the interfaces between tasks.
6. **Write tasks.** Each task is independently reviewable and contains concrete steps, commands, expected results, and scenario coverage.
7. **Self-review.** Check behavior coverage, TDD order, scenario traceability, placeholders, and execution compatibility.
8. **Offer execution.** Recommend Superpowers SDD if installed; otherwise say the plan is compatible with any task-by-task executor that preserves tests and verification.

## Behavior Harness Strategy

Every plan must include `## Behavior Harness Strategy` before task sections.

Required contents:

- runner command, existing or to be created (`behavior:test`, stack-native equivalent);
- scenario coverage table;
- backend choice: project-native / Cucumber / Playwright / pytest / custom runner / existing harness;
- adapter surfaces: API, CLI, UI, bot handler, database, event bus, LLM-agent harness, etc.;
- status handling for non-automated scenarios;
- CI expectation: behavior gate must be green before completion, or explicitly blocked with reason.

Default: project-native harness. Cucumber is recommended only for cross-role Gherkin value; see `hi_flow/references/behavior-harness.md`.

## Task Requirements

Each task must include:

- exact files to create/modify/test;
- interfaces consumed/produced;
- `Covers: BS-...` line for relevant behavior scenarios, or `Covers: none - foundation task`;
- RED step: failing unit/integration/behavior test or failing harness scenario;
- GREEN step: minimal implementation;
- verification commands with expected results;
- commit step;
- notes for SDD implementer when a task needs a specific model/judgment level.

Preserve TDD: production code follows a failing test or failing harness scenario. A behavior scenario can be the outer RED, while inner unit tests drive implementation details.

## Plan Header Contract

The plan header must be Superpowers-compatible and must explicitly name the execution skills:

```markdown
# <Feature Name> Implementation Plan

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes. Steps use checkbox (`- [ ]`) syntax for tracking.
```

Do not require `superpowers:writing-plans`; this skill already wrote the plan.

## Self-Review Checklist

Before presenting the plan:

- Every `automated` Behavior Contract scenario appears in the scenario coverage table.
- Every scenario marked `manual`, `blocked`, or `obsolete` has a reason.
- Every task with behavior impact has `Covers: BS-...`.
- Harness/behavior runner command is named.
- Architecture invariants from waiver/spec are represented in tasks or global constraints.
- No TODO/TBD/placeholders remain.
- Each task can be executed from its own task brief without reading the whole conversation.
- The handoff does not ask the executor to re-plan the feature.

## Anti-patterns

- **Generic file-change plan.** A plan that lists files but does not map behavior scenarios is not a hi_flow implementation plan.
- **Silent manual scenarios.** Manual/non-automated behavior must be visible debt.
- **Cucumber cargo cult.** Do not install or recommend Cucumber just because the word BDD appears.
- **Replacing SDD.** Do not duplicate Superpowers execution mechanics. Write the plan; let execution skills execute.
- **Skipping current-state read.** Implementation plans are written against the actual repo, not only against specs.

## References

- `references/implementation-plan-template.md` - output structure.
- `hi_flow/references/behavior-harness.md` - behavior gate policy and Cucumber decision rule.
- `hi_flow/references/workflow-routing.md` - hi_flow vs generic workflow routing.
