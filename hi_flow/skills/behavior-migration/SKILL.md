---
name: behavior-migration
description: Use when the operator asks to migrate an existing project to hi_flow Behavior Registry, BDD/behavior contracts, behavior harness rails, executable scenarios, or to prepare a legacy project before the next hi_flow feature. Also use for Russian equivalents like «мигрировать проект на BDD», «перевести проект на harness-рельсы», «завести Behavior Registry для существующего проекта».
---

# Behavior Migration

## Overview

behavior-migration retrofits an existing project onto hi_flow's Behavior Registry and behavior harness discipline. It is not bootstrap: bootstrap prepares a new or missing foundation; migration extracts and normalizes behavior from a living codebase, legacy specs, tests, and existing harnesses.

The goal is a controlled bridge from "tests and specs exist somewhere" to "current behavior has a living registry, executable mapping, and a runner/gate the next feature can extend."

## Boundaries

Use this skill for existing projects. Use `hi_flow:bootstrap` for a new project foundation or for a missing infrastructure axis that must be fixed without importing historical behavior. Use `hi_flow:ops` only after the local behavior gate exists and needs delivery/deployment wiring.

Migration may create the same behavior-registry rail that bootstrap would create for a new project, but it does so from existing project truth and legacy artifacts. It must not wait for ops.

## Scope Modes

Choose the smallest mode that gives the next feature a real behavior rail:

| Mode | Use when | Output posture |
|---|---|---|
| `foundation-only` | The project has no registry/runner and no bounded domain is selected. | Create empty registry/mapping convention, self-check, runner slot, CI/follow-up. No product behavior imported. |
| `feature-slice` | One legacy or newly signed feature is the migration target. | Import only that feature's scenarios into registry + mapping + executable checks where practical. |
| `domain-baseline` | A bounded domain/module has enough tests/specs to migrate coherently. | Build a partial registry for that domain, marked as partial coverage. |
| `full-project` | The operator explicitly asks for broad migration after seeing scope. | Produce a migration plan first unless the project is trivially small. |

Do not silently choose `full-project`. Large historical migrations need batching because semantic deduplication is the hard part.

## Required Inputs

- Current repository state read from code, tests, package scripts, CI, and existing harness commands.
- Legacy specs or signed feature specs when present.
- Existing behavior contracts, scenario lists, e2e tests, integration tests, golden files, fixtures, or agent harnesses.
- `ARCHITECTURE.md` only as supporting context, not as target-state truth.

If no bounded scope is provided and broad migration would be large, ask one short scope question before editing: "which domain/feature should become the first behavior-registry slice?"

## Migration Flow

1. **Read current state.** Inspect code, tests, scripts, CI, existing docs/specs, and any current harness. Do not infer behavior from docs alone.
2. **Select scope mode.** Use the table above. Record whether the resulting registry is full or partial.
3. **Inventory behavior sources.** List candidate scenarios from specs, tests, harnesses, API/UI flows, fixtures, and bug/regression tests. Keep source paths.
4. **Deduplicate semantically.** Use domain/surface/actor/trigger/object/observable keys. Classify each candidate as `create`, `update`, `obsolete`, `unchanged-related`, or `ignore-not-behavior`.
5. **Create or update registry.** Use `docs/behavior/registry.md` unless the project already has a configured equivalent. Preserve legacy `BS-001` aliases when migrating feature-local IDs into project-unique IDs.
6. **Create mapping.** Add `docs/behavior/mappings/<scope>.md` or an equivalent project-native mapping from scenario IDs to executable checks.
7. **Create runner rail.** Add or reuse one behavior runner command and a registry self-check. Prefer project-native tests/harnesses; Cucumber is optional, never default.
8. **Apply executable coverage.** Automated scenarios must map to real test/harness files. Manual, blocked, or obsolete scenarios need visible reasons.
9. **Wire gate.** Add a CI hook or explicit CI follow-up. Do not claim behavior-gated migration complete without a runnable command.
10. **Write report.** Add `docs/behavior/migration/YYYY-MM-DD-<scope>-migration-report.md` with scope, sources read, registry rows changed, harness files, commands run, partial coverage warnings, and open items.

Report shape:

```markdown
# Behavior Migration Report: <scope>

**Status:** completed | partial | blocked
**Scope mode:** foundation-only | feature-slice | domain-baseline | full-project-plan
**Coverage:** full | partial

## Sources Read
- <code/test/spec/harness path>

## Registry Changes
- Created:
- Updated:
- Obsoleted:
- Unchanged related:

## Harness Rail
- Registry:
- Mapping:
- Runner:
- CI:

## Verification
- <command> -> <result>

## Open Items
- <item or None>
```

## Output Contract

At the end of a successful migration slice, the project has:

- `docs/behavior/registry.md` or configured equivalent;
- one or more mapping files from `BS-*` IDs to executable cases;
- a registry self-check command;
- a behavior runner command, even if the first slice only runs a small focused subset;
- executable harness/test files for each `automated` migrated scenario;
- visible reasons for `manual`, `blocked`, and `obsolete` rows;
- a migration report.

The registry is the living source of truth after migration. Old signed specs are historical evidence and are not rewritten.

## Behavior Status Rules

- `automated` means mapped to a real runnable behavior test/harness case.
- `manual` means intentionally checked by a person, with a reason automation is not worth it yet.
- `blocked` means a named external/domain dependency prevents validation. Missing registry/harness infrastructure is not a blocked scenario; it is migration work.
- `obsolete` means replaced or removed, with a replacement pointer or reason.

## Self-Review Checklist

Before presenting the result:

- The report states whether coverage is full or partial.
- Every migrated scenario has a stable project-unique ID.
- Legacy local IDs are preserved as aliases when they existed.
- Every `automated` row has a mapping target and an executable file.
- Every non-automated row has a concrete reason.
- The registry self-check command was run or the failure is reported exactly.
- The behavior runner command was run for the migrated slice or the blocker is reported exactly.
- CI is wired or a named follow-up is recorded.
- No old signed feature spec is edited just to match the new registry.
- No scenario is created from docs without checking code/tests/current harness state.

## Anti-Patterns

- **Full-project big bang by default.** This creates a semantic-deduplication swamp. Start with a slice unless the operator explicitly chooses broad migration.
- **Docs-only migration.** Legacy specs can be stale. Read code and tests before treating behavior as current.
- **Rewriting signed specs.** Historical specs explain decisions; the registry stores current behavior.
- **Cucumber cargo cult.** Do not install or recommend Cucumber just because BDD is mentioned.
- **Manual/blocked dump.** Do not mark scenarios manual or blocked merely because the runner rail is missing.
- **Fake completeness.** A partial registry is fine if it is labeled partial. Hidden partial coverage is failure.
- **Product redesign during migration.** Migration captures current accepted behavior. New product decisions belong in `hi_flow:feature-spec`.

## References

- `hi_flow/references/behavior-registry.md` - registry shape, semantic deduplication, and blocked lifecycle.
- `hi_flow/references/behavior-harness.md` - required harness guarantees and Cucumber decision rule.
- `hi_flow/references/workflow-routing.md` - family routing and Superpowers relationship.
