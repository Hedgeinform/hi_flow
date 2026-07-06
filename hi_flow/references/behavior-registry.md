# Behavior Registry

The Behavior Registry is the living source of truth for current product behavior. Signed feature specs are historical decision records; they explain why behavior changed, but they are not rewritten when later features change that behavior.

## Artifact roles

- `feature-spec.md` proposes a `Behavior Registry Changes` change-set and records product reasoning for operator review.
- `docs/behavior/registry.md` (or the project-configured equivalent) stores the current active behavior contracts plus history links to specs that created or changed them.
- harness mapping and executable test files enforce registry scenarios.
- `hi_flow:implementation-plan` maps how the signed change-set must be applied to registry, harness, and code during execution.

Do not make operators re-review old signed specs only because a later feature changes a scenario. The operator reviews the new feature's compact behavior change-set.

## Registry entry shape

Use project-unique scenario IDs. Recommended form: `BS-<DOMAIN>-NNN` (for example `BS-DOC-007`). If a project already has feature-local `BS-001` style rows, keep them as legacy aliases during migration and assign project-unique IDs when moving them into the registry.

Each active entry should include:

- **ID** - stable project-unique behavior scenario id.
- **Status** - `automated`, `manual`, `blocked`, or `obsolete`.
- **Domain / Surface / Actor / Trigger / Object / Observable** - semantic keys used for deduplication and impact scans.
- **Current expectation** - Given/When/Then or equivalent product-readable expectation.
- **Observability** - what the harness or reviewer can check from outside or near-outside the system.
- **Harness mapping** - executable case id/file, or visible non-automation reason.
- **History** - created by / updated by / obsoleted by spec links.

Minimal Markdown shape:

```markdown
## BS-DOC-007: Document edit creates a revision

**Status:** automated
**Domain:** documents
**Surface:** document editor
**Actor:** office user
**Trigger:** edits document content
**Object:** document revision
**Observable:** revision row + saved UI state
**Harness mapping:** `behavior/documents/document-edit.behavior.ts::BS-DOC-007`

**Current expectation**
Given ...
When ...
Then ...

**History**
- Created by: `docs/specs/2026-06-20-documents-feature-spec.md#Behavior Registry Changes`
- Updated by: `docs/specs/2026-07-06-documents-ux-surfaces-feature-spec.md#Behavior Registry Changes`
```

## Feature-spec change-set shape

New feature specs write `## Behavior Registry Changes`, not a canonical living registry.

The section must include:

- **Reviewed existing contracts** - related registry entries and/or legacy signed spec contracts scanned for semantic overlap. If the registry is missing or incomplete, legacy signed specs are the historical contract source.
- **New** - scenarios that introduce genuinely new behavior.
- **Updated** - existing scenario IDs whose expectation, status, observability, or harness obligation changes.
- **Obsoleted** - existing scenario IDs replaced or removed, with replacement pointer or reason.
- **Unchanged related** - related scenarios intentionally left unchanged, with a short reason.

Operator review focuses on this compact change-set. Old specs remain historical records.

## Semantic deduplication

Before creating a new scenario, run an existing-contract impact scan:

1. Search registry and specs with `rg` by domain, surface, actor, trigger/action, object, and observable result. No registry means legacy signed specs are the only historical contract source, not a reason to assume a new-only change-set.
2. Filter candidates by semantic keys.
3. Compare meaning, not wording.
4. Decide `New`, `Updated`, `Obsoleted`, or `Unchanged related`.

Decision rule:

- Same actor/object/action with a changed expected result -> `Updated` or `Obsoleted + New`.
- Same behavior with narrower edge-case detail -> update the existing entry if the old expectation was too broad; otherwise add a new entry and link it as extending the existing scenario.
- New actor, object, trigger, surface, or externally observable effect -> `New`.
- Conflicting old expectation -> must be `Updated`, `Obsoleted`, or explicitly `Unchanged related` with reason. Silent conflict is failure.

## Blocked lifecycle

`blocked` requires a named external/domain dependency and an unblock condition. When a later feature resolves that dependency, its change-set must update the blocked registry entry to `automated`/`manual`, or obsolete it with a replacement pointer.

Missing project-wide harness foundation is not a registry scenario dependency. It is a bootstrap/implementation-plan foundation task.
