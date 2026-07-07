---
name: implementation-plan
description: "Use when the operator asks for a hi_flow implementation plan, impl-plan, or plan from signed hi_flow artifacts: feature-spec with Behavior Registry Changes plus architecture-gate waiver or arch-spec. Prefer this over superpowers:writing-plans inside the hi_flow pipeline. Produces a Superpowers-compatible, behavior-first implementation plan for execution by subagent-driven-development or equivalent workflows."
---

# implementation-plan

## Overview

implementation-plan is the hi_flow bridge from signed specs to execution. It writes a behavior-first implementation plan that is compatible with Superpowers execution skills while preserving hi_flow's Behavior Registry change-set, architecture gate, and harness discipline.

It does **not** execute the plan. Recommended execution: `superpowers:subagent-driven-development`; fallback: `superpowers:executing-plans` or another workflow that follows the plan exactly.

## Inputs

Required:

- signed `feature-spec.md` with `## Behavior Registry Changes` (or a legacy `## Behavior Contract` for compatibility only; do not use legacy form for new specs);
- either an architecture-gate waiver or a signed `arch-spec.md`;
- current project code state, read from the repository, not inferred from docs alone.
- current Behavior Registry path when present (`docs/behavior/registry.md` or project-configured equivalent).

Conditional:

- arch-spec rules-patch path, if emitted;
- bootstrap foundation notes if behavior harness runner/folders are not yet present;
- existing tests/harness commands.

If the feature-spec has neither `Behavior Registry Changes` nor legacy `Behavior Contract`, stop and route back to `hi_flow:feature-spec`. If a legacy `Behavior Contract` changes existing behavior or a Behavior Registry already exists, route back to `hi_flow:feature-spec` to produce an explicit `Behavior Registry Changes` change-set instead of treating it as new-only. If architecture impact has not been gated, stop and route to `hi_flow:arch-spec`.

## Routing

This skill replaces `superpowers:writing-plans` **only inside the hi_flow pipeline**. Generic plans outside hi_flow can still use Superpowers directly.

Read `hi_flow/references/workflow-routing.md` when routing is ambiguous.

## Output

Write a plan to:

`<project>/docs/superpowers/plans/YYYY-MM-DD-<feature-slug>-implementation.md`

Use the structure in `references/implementation-plan-template.md`. The plan must be executable by an agent that knows Superpowers SDD but has no conversation context.

## Planning Flow

1. **Read current state.** Inspect the repo before planning file changes. Do not trust target-state docs over code.
2. **Extract Behavior Registry Changes.** Build a change matrix: `scenario_id`, change_type (`new` / `updated` / `obsoleted` / `unchanged-related`), status, observable result, source fork, automation target, registry action.
3. **Read architecture gate/spec.** Pull constraints, owners, invariants, delegated code-sight forks, deployment-bound bindings.
4. **Map registry update.** Name the Behavior Registry file to create/modify and the exact entries to add, update, obsolete, or leave unchanged. If no registry exists, add a foundation task before product behavior tasks.
5. **Map harness strategy.** Decide how each automated new/updated/non-obsolete scenario is checked: project-native runner by default; Cucumber/Gherkin only when the project explicitly chooses it or its cross-role value is clear.
6. **Map concrete harness artifacts.** For every `automated` new/updated/non-obsolete scenario, name the exact mapping target and the exact test/harness file that will prove it. If no behavior registry/harness rail exists yet, add a first foundation task that creates Behavior Registry file/entry convention, runner command, folder convention, mapping convention, green smoke/self-check, and CI hook before product behavior tasks.
7. **Map files and interfaces.** List files to create/modify and the interfaces between tasks.
8. **Write tasks.** Each task is independently reviewable and contains concrete steps, commands, expected results, and scenario coverage.
9. **Write completion protocol.** Add the mandatory implementation close-out: implementation report, verification, isolated review, arch-audit/audit-skip decision, and `PROJECT_STATE.md` update.
10. **Self-review.** Check registry application, behavior coverage, TDD order, scenario traceability, placeholders, execution compatibility, and close-out coverage.
11. **Offer execution.** Recommend Superpowers SDD if installed; otherwise say the plan is compatible with any task-by-task executor that preserves tests and verification.

## Behavior Harness Strategy

Every plan must include `## Behavior Harness Strategy` before task sections.

Required contents:

- runner command, existing or to be created (`behavior:test`, stack-native equivalent);
- Behavior Registry file to create/modify;
- registry change table (`New`, `Updated`, `Obsoleted`, `Unchanged related`);
- scenario coverage table;
- concrete harness files to create/modify, including scenario mapping and executable cases;
- backend choice: project-native / Cucumber / Playwright / pytest / custom runner / existing harness;
- adapter surfaces: API, CLI, UI, bot handler, database, event bus, LLM-agent harness, etc.;
- status handling for non-automated scenarios;
- CI expectation: behavior gate must be green before completion, or explicitly blocked with reason.

Default: project-native harness. Cucumber is recommended only for cross-role Gherkin value; see `hi_flow/references/behavior-harness.md`.

The plan must not hand-wave registry or behavior execution to the downstream executor. Superpowers or another execution workflow can follow a plan, but it is not responsible for discovering hi_flow's registry/harness discipline from scratch. The implementation plan must explicitly tell the executor which registry entries and harness artifacts to create/update and how each `BS-*` row is checked.

### Harness artifact obligations

For every `automated` new/updated/non-obsolete Behavior Registry scenario, the plan must provide:

- **Registry action** — create/update/obsolete/keep with exact registry entry id and file path.
- **Mapping target** — the scenario id maps to a named executable case, for example `behavior/scenarios/documents-ux.behavior.ts::BS-DOC-018` or a project-native equivalent.
- **Executable file** — exact test/harness file path to create or update.
- **Observable assertion** — API response / DB state / emitted event / UI state / bot reply / eval criterion, copied or refined from the signed change-set and current registry.
- **Covering task** — a task that creates the failing scenario first, watches it fail, and then implements the behavior.

If the project has no Behavior Registry or behavior runner/mapping convention yet, add a first task with `Covers: none - behavior registry/harness foundation`. That task creates the minimum rail:

- registry file and entry convention;
- runner command;
- folder convention;
- scenario mapping file or equivalent lookup from `BS-*` to executable cases;
- a runner smoke/self-check or equivalent proof that the rail executes successfully;
- CI hook or explicit CI follow-up in the same plan.

Do not leave intentionally failing foundation samples in CI. Real `BS-*` scenarios should fail first inside the product behavior task that implements them, then pass before completion.

Do not downgrade `automated` scenarios just because the registry or rail is missing. Missing project-wide registry/harness rail is a foundation task in the plan.

## Completion Protocol

Every plan must include a `## Completion Protocol` section after the task list. This section is the handoff back from the implementation executor to hi_flow.

Required items:

- implementation report path, preferably next to the feature-spec unless the project has a stronger convention;
- final verification commands, including behavior gate when a Behavior Registry exists;
- isolated review requirement before claiming completion;
- architecture audit requirement after implementation review, or an explicit recorded skip reason when there is no architecture impact and no architecture contract changed;
- `PROJECT_STATE.md` update requirement: current phase, last completed artifact, verification state, blockers/open items, and next hi_flow action;
- rule that signed feature-specs are historical decision artifacts and are not rewritten just to match changed registry entries.

If the project lacks `PROJECT_STATE.md`, the plan must include creating it from `hi_flow:project-state`'s template as part of close-out rather than silently skipping the update.

## Task Requirements

Each task must include:

- exact files to create/modify/test;
- interfaces consumed/produced;
- `Covers: BS-...` line for relevant behavior scenarios, or `Covers: none - foundation task`;
- registry action for each covered scenario (`create`, `update`, `obsolete`, or `verify unchanged`);
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

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes and `superpowers:verification-before-completion` before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.
```

Do not require `superpowers:writing-plans`; this skill already wrote the plan.

## Self-Review Checklist

Before presenting the plan:

- Every `New` / `Updated` / `Obsoleted` / `Unchanged related` Behavior Registry change appears in the registry change table.
- Every `automated` new/updated/non-obsolete scenario appears in the scenario coverage table.
- Every `Unchanged related` row has a `verify unchanged` registry action or a reason why no executable check is affected.
- Every `automated` scenario names an executable mapping target and an exact harness/test file.
- Every scenario marked `manual`, `blocked`, or `obsolete` has a reason.
- Every task with behavior impact has `Covers: BS-...`.
- Harness/behavior runner command is named.
- If the project has no Behavior Registry or behavior harness rail, the plan starts with a foundation task that creates registry/runner/mapping/files/CI hook and green smoke/self-check before product behavior tasks.
- The plan contains a `## Completion Protocol` with report, verification, isolated review, arch-audit/audit-skip decision, and Project State update.
- Architecture invariants from waiver/spec are represented in tasks or global constraints.
- No TODO/TBD/placeholders remain.
- Each task can be executed from its own task brief without reading the whole conversation.
- The handoff does not ask the executor to re-plan the feature.

## Anti-patterns

- **Generic file-change plan.** A plan that lists files but does not map behavior scenarios is not a hi_flow implementation plan.
- **Implicit registry/harness.** A plan that says "add tests for BS-DOC-018" without naming registry edits, mapping files, executable cases, runner command, and CI gate is not a behavior-first plan.
- **Silent manual scenarios.** Manual/non-automated behavior must be visible debt.
- **Cucumber cargo cult.** Do not install or recommend Cucumber just because the word BDD appears.
- **Replacing SDD.** Do not duplicate Superpowers execution mechanics. Write the plan; let execution skills execute.
- **Skipping current-state read.** Implementation plans are written against the actual repo, not only against specs.

## References

- `references/implementation-plan-template.md` - output structure.
- `hi_flow/references/behavior-registry.md` - Behavior Registry lifecycle and change-set rules.
- `hi_flow/references/behavior-harness.md` - behavior gate policy and Cucumber decision rule.
- `hi_flow/references/workflow-routing.md` - hi_flow vs generic workflow routing.
