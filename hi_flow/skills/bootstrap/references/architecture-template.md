# ARCHITECTURE.md Template

Use this template when `hi_flow:bootstrap` creates the initial project architecture
snapshot. Keep it compact: this file is current architectural shape, not history.

```markdown
# Architecture

## Stack

- Runtime:
- Frontend:
- Backend:
- Database:
- Storage:
- Deployment:
- External integrations:

Record project-specific applied topology only. Do not copy standard Hi-Flow stack
baselines here; they live in `hi_flow/references/stacks/`.

## Technical Topology

- Entry points:
- Runtime boundaries:
- Data stores:
- Delivery shape:

## Domain Ownership / SSoT Map

| Domain / State | Owner | Source of Truth | Notes |
|---|---|---|---|
| <domain> | <module/service> | <storage/mechanism> | <project-specific boundary> |

## Project-specific Principles

- <principle id/name>: <project-specific architecture rule>

## Active Issues

Known violations of accepted contracts that should be fixed.

| ID | Issue | Contract violated | Current impact | Next action |
|---|---|---|---|---|
| AI-001 | <issue> | <behavior/architecture/gate> | <impact> | <fix path> |

## Accepted Drift / Accepted Exceptions

Known violations or exceptions consciously accepted for now.

| ID | Exception | Why accepted now | Re-review trigger |
|---|---|---|---|
| AD-001 | <exception> | <reason> | <trigger> |
```

Do not add Topic Index, decision history, full generated module graph, backlog,
Behavior Registry entries, implementation reports, or Project State content.
