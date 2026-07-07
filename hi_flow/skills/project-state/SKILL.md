---
name: project-state
description: Use when the operator asks where the project stands, what to do next, to resume a paused project, or to update/refresh PROJECT_STATE.md. Also use for Russian equivalents like «где мы остановились», «что сейчас по проекту», «с чего продолжить», «обнови состояние проекта», «актуализируй project state».
---

# project-state

## Overview

project-state owns the lightweight operational dashboard for a hi_flow project: `PROJECT_STATE.md`.

Its job is to help the operator and future agents resume work without rediscovering the repo from scratch. It stores current state, not history.

## Boundaries

project-state is not architecture design, behavior design, product backlog management, or implementation execution.

| Neighbor | Boundary |
|---|---|
| `ARCHITECTURE.md` | Architecture snapshot: technical topology, domain ownership / SSoT, Active Issues, Accepted Drift. |
| Behavior Registry | Living source of behavior contracts and scenario status. |
| Product Backlog | Desired future behavior and product scope. |
| ArchAudit | Target Architecture Contract validation/apply, audit reports, observed dependency graph, and architecture violations. |
| Superpowers | Execution layer for implementation and fixes. |

Do not duplicate these sources in `PROJECT_STATE.md`. Store only the operational summary and pointers needed to resume work.

## File Contract

Default location:

```text
<project>/PROJECT_STATE.md
```

If the file is missing and the operator asks for project state, create it from `references/project-state-template.md` after reading the current repo state and available hi_flow artifacts.

Do not create a long historical log. If an item is no longer current, remove it or move it to the right source of truth:

- future desired behavior -> Product Backlog;
- accepted behavior -> Behavior Registry;
- architecture / contract defect to fix -> `ARCHITECTURE.md` Active Issues;
- accepted architecture exception -> `ARCHITECTURE.md` Accepted Drift;
- completed implementation evidence -> implementation report.

## State Shape

`PROJECT_STATE.md` should answer:

- current focus;
- current phase;
- last completed phase artifact;
- ready next action;
- waiting / blocked items;
- latest verification state;
- relevant active artifacts.

Keep entries short. Prefer one-line pointers to specs, reports, audits, and plans over copied content.

## Update Discipline

Update `PROJECT_STATE.md` at phase boundaries, not through continuous event detection.

Phase boundaries include:

- product-spec finalization;
- feature-spec finalization;
- arch-spec waiver or full arch-spec finalization;
- implementation-plan creation;
- behavior-migration completion;
- bootstrap completion;
- ops completion;
- arch-audit completion;
- arch-redesign completion;
- implementation completion protocol completion.

Do not announce "project-state event detected". Do not append state proposals to ordinary answers unless the operator asked for state work or a phase boundary changes the next action.

## Startup Use

At the start of a hi_flow session, read `PROJECT_STATE.md` if it exists. If the next action is unclear, read only the needed source artifacts named by the state file.

Typical startup response:

```text
Проект сейчас на этапе <phase>. Последний завершенный шаг: <artifact>. Следующее действие: <next action>. Блокеры: <none/list>.
```

## Explicit Refresh

When the operator asks to update or refresh project state:

1. Read `PROJECT_STATE.md` if present.
2. Read the current git/repo state.
3. Read only relevant hi_flow artifacts:
   - latest product backlog if product scope is in question;
   - Behavior Registry if behavior state is in question;
   - latest implementation reports and plans if delivery state is in question;
   - `ARCHITECTURE.md` Active Issues / Accepted Drift if blockers or debt are in question.
4. Rewrite `PROJECT_STATE.md` as the current dashboard.
5. Report the resulting current focus and next action.

## Completion Rule

A state update is complete when:

- `PROJECT_STATE.md` describes the current phase and next action;
- stale completed items were removed or reduced to pointers;
- no behavior/backlog/architecture contract content was copied into the state file;
- blockers are either current blockers, Active Issues, Accepted Drift, or backlog items;
- the operator can resume work from the state file without a repo-wide archaeology pass.

## Anti-patterns

- **Event-detection chatter.** Never say "project-state event detected". Update at explicit phase exits or on request.
- **History pile.** Do not append every completed event. Keep only current state.
- **Duplicate backlog.** New desired behavior belongs in Product Backlog.
- **Duplicate registry.** Behavior scenario details belong in Behavior Registry.
- **Duplicate architecture.** Topology, domain ownership, Active Issues, and Accepted Drift belong in `ARCHITECTURE.md`.
- **Guessing completion.** If reports, tests, or audit evidence conflict, mark the state as `blocked` or `needs review`.

## References

- `references/project-state-template.md` - template for new `PROJECT_STATE.md`.
- `hi_flow/references/workflow-routing.md` - family-level routing.
