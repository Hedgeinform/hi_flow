# Target Architecture Contract

## Purpose

The Target Architecture Contract is the project-local, machine-checkable subset of the intended architecture. It is what `hi_flow:arch-audit` validates against the observed dependency graph.

In the current implementation, the contract's concrete form is:

- stack baseline rules bundled with Hi-Flow;
- project rules in `<project>/.audit-rules.yaml`;
- explicit rules-patches emitted by `hi_flow:arch-spec` and `hi_flow:arch-redesign`.

Do not introduce a second target-graph file unless a runtime actually consumes it. For the bundled HiFlow runtime, `.audit-rules.yaml` plus applied rules-patches are the project contract.

## Existing project-native enforcement

An existing project may already enforce a deliberate contract at another path,
such as `apps/api/audit-rules.yaml` consumed by its own generator. Preserve that
single source and document its exact path, scope, consumer, validation command and
apply procedure in the architecture snapshot. Do not create a parallel
`.audit-rules.yaml` merely to match the default layout.

This is a project-native enforcement route, not an implicit path fallback in
`hi_flow:arch-audit`. The bundled runtime still reads its documented canonical
path; it does not automatically load, validate or apply patches to other formats.
If a requested operation needs the bundled runtime, establish explicit compatible
wiring or report the unsupported operation. Never claim the other contract was
checked just because an unrelated baseline-only audit passed. For unsupported
stacks, retain human-readable boundaries and state the enforcement limit.

## Sources of Truth

| Artifact | Role |
|---|---|
| `ARCHITECTURE.md` | Human-readable architecture snapshot: topology, domain ownership, Active Issues, Accepted Drift. |
| Target Architecture Contract | Machine-checkable boundary contract consumed by `arch-audit`. Current form: stack baselines + `.audit-rules.yaml` + applied rules-patches. |
| Observed graph | Generated output from the current code during `arch-audit`. It is evidence, not target truth. |

Human-readable principles, domain ownership and accepted exceptions that cannot
be checked by the dependency graph remain in the snapshot or its named current
reference. Reading, maintenance and migration follow `architecture-snapshot.md`.

## Ownership

- `hi_flow:bootstrap` seeds the initial contract through stack baselines, audit config, and project rules.
- `hi_flow:arch-spec` emits feature-level contract deltas as rules-patches when a feature changes target boundaries.
- `hi_flow:arch-redesign` emits corrective contract deltas as rules-patches when a debt-fix target state is approved.
- `hi_flow:arch-audit` owns validation, apply-patch merge, observed graph generation, comparison, and violation reporting.

## Non-Negotiables

- Current code must never be silently promoted to target architecture.
- `arch-audit` may update generated observed-graph/report artifacts, but it must not edit the target contract except through explicit `apply-patch`.
- A violation can become an Active Issue or Accepted Drift in `ARCHITECTURE.md`, but that is not the same as changing the target contract.
- `rules-patch` files are candidate contract deltas. Apply is explicit: `arch-audit apply-patch <path>` or the pending-patch prompt during a full audit.
