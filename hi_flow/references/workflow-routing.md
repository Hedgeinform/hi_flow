# hi_flow workflow routing

This file is the family-level routing contract between hi_flow and general implementation workflows such as Superpowers.

## Core rule

Use hi_flow for feature-and-above work, raw project-signal intake, and fixes that restore an accepted hi_flow contract. Use a general implementation workflow directly for small local changes.

hi_flow is intentionally heavier than a plain bugfix loop. It is the right tool when the work changes product behavior, introduces or changes Behavior Registry entries, carries architectural risk, needs a durable behavior harness, or fixes a known violation of an accepted Behavior Registry / architecture contract. For local bugfixes, test fixes, small refactors, and tightly scoped technical cleanup with no hi_flow contract impact, route directly to the implementation workflow.

For existing projects that predate the Behavior Registry, route "migrate to BDD", "bring this project onto behavior harness rails", or similar requests to `hi_flow:behavior-migration` before the next large feature. That skill retrofits registry/harness rails from current code, tests, and legacy specs. It does not replace `hi_flow:bootstrap` for new-project foundation or `hi_flow:ops` for deployment.

For raw capture requests like "зафиксируй проёб", "запаркуй идею", "не забыть фичу", "add this to intake", or similar, route to `hi_flow:intake`. Intake records the signal in `INTAKE.md` without launching feature-spec, bug-fix, arch-audit, or implementation. Later triage may promote entries into Product Backlog or `ARCHITECTURE.md` Active Issues.

For "where are we?", "what should I do next?", "resume this project", "update project state", or Russian equivalents like «где мы остановились» / «что сейчас по проекту» / «обнови состояние проекта», route to `hi_flow:project-state`. Do not route these requests to architecture design/audit/redesign skills.

## Skill priority

When the operator explicitly asks for a hi_flow artifact, hi_flow wins over competing generic skills:

| Operator intent | Use | Do not use as the primary step |
|---|---|---|
| raw observed problem or parked idea, no immediate design/fix requested | `hi_flow:intake` | `hi_flow:feature-spec` / `hi_flow:bug-fix` / `hi_flow:arch-audit` |
| product / feature spec, feature behavior, feature forks | `hi_flow:feature-spec` | `superpowers:brainstorming` |
| current project status, resume point, next action, project state refresh | `hi_flow:project-state` | `hi_flow:arch-spec` / `hi_flow:arch-audit` / `hi_flow:arch-redesign` |
| migrate an existing project to Behavior Registry / BDD / harness rails | `hi_flow:behavior-migration` | `hi_flow:bootstrap` unless only empty foundation is requested |
| Active Issue, regression, or bug in already accepted behavior/architecture with fix planning requested | `hi_flow:bug-fix` | `hi_flow:feature-spec` unless expected behavior changes; `hi_flow:intake` unless the operator only wants capture |
| new project needs empty Behavior Registry / behavior gate foundation | `hi_flow:bootstrap` | `hi_flow:behavior-migration` |
| architecture spec or "do we need architecture?" for a signed feature-spec | `hi_flow:arch-spec` | ad-hoc technical brainstorming |
| implementation plan from signed hi_flow specs | `hi_flow:implementation-plan` | `superpowers:writing-plans` |
| execute an already-written plan | recommended: `superpowers:subagent-driven-development`; fallback: `superpowers:executing-plans` | rewriting the plan during execution |
| small bugfix / local technical change with no accepted hi_flow contract impact | Superpowers directly, if installed | hi_flow unless the operator asks for it |

Ambiguous "spec" or "plan" requests must be clarified in one short question: "hi_flow feature flow or a regular implementation flow?" Ambiguous bug requests must be clarified as: "capture only, accepted-contract bug fix, or new behavior/change?"

## Superpowers relationship

Superpowers is a recommended executor, not a required bundled dependency. hi_flow may produce Superpowers-compatible implementation plans, but users may execute those plans with any agentic workflow that preserves:

- task-by-task execution;
- test-first discipline;
- explicit verification;
- review before completion.

When a plan uses Superpowers-compatible structure, credit the source concept in user-facing documentation. Superpowers is MIT-licensed; do not copy substantial text without preserving the license notice.
