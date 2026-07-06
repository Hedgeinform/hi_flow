# hi_flow workflow routing

This file is the family-level routing contract between hi_flow and general implementation workflows such as Superpowers.

## Core rule

Use hi_flow for feature-and-above work. Use a general implementation workflow directly for small local changes.

hi_flow is intentionally heavier than a plain bugfix loop. It is the right tool when the work changes product behavior, introduces or changes Behavior Registry entries, carries architectural risk, or needs a durable behavior harness. For local bugfixes, test fixes, small refactors, and tightly scoped technical cleanup, route directly to the implementation workflow.

## Skill priority

When the operator explicitly asks for a hi_flow artifact, hi_flow wins over competing generic skills:

| Operator intent | Use | Do not use as the primary step |
|---|---|---|
| product / feature spec, feature behavior, feature forks | `hi_flow:feature-spec` | `superpowers:brainstorming` |
| architecture spec or "do we need architecture?" for a signed feature-spec | `hi_flow:arch-spec` | ad-hoc technical brainstorming |
| implementation plan from signed hi_flow specs | `hi_flow:implementation-plan` | `superpowers:writing-plans` |
| execute an already-written plan | recommended: `superpowers:subagent-driven-development`; fallback: `superpowers:executing-plans` | rewriting the plan during execution |
| small bugfix / local technical change | Superpowers directly, if installed | hi_flow unless the operator asks for it |

Ambiguous "spec" or "plan" requests must be clarified in one short question: "hi_flow feature flow or a regular implementation flow?"

## Superpowers relationship

Superpowers is a recommended executor, not a required bundled dependency. hi_flow may produce Superpowers-compatible implementation plans, but users may execute those plans with any agentic workflow that preserves:

- task-by-task execution;
- test-first discipline;
- explicit verification;
- review before completion.

When a plan uses Superpowers-compatible structure, credit the source concept in user-facing documentation. Superpowers is MIT-licensed; do not copy substantial text without preserving the license notice.
