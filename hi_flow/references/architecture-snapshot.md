# Architecture snapshot lifecycle

`ARCHITECTURE.md` is the compact entry point to the project's current technical
shape and project-specific architectural obligations. It is not a decision log,
behavior registry, generated module graph, or operational dashboard. This
reference owns its reading, maintenance and legacy-migration discipline; bootstrap
owns the initial template. No operator-personal `architecture` skill is required.

## Read the source for the question

At session start, read `PROJECT_STATE.md` when present. For architectural work,
read the compact `ARCHITECTURE.md`, then the current contracts and code relevant
to the task. Do not load historical architecture documents by default.

| Question | Current source |
|---|---|
| Where to resume; delivery status; next action | `PROJECT_STATE.md`, checked against current repository/release evidence |
| Actual implementation and applied stack | Code and executable configuration |
| Current covered behavior | Behavior Registry and its scenario mappings |
| Accepted behavior outside a partial registry | Specific signed specs, with later accepted amendments and supersession applied |
| Proposed changes not yet implemented | Signed feature/architecture spec and its change-set; do not describe it as implemented |
| Topology, domain ownership, project principles and accepted exceptions | Compact `ARCHITECTURE.md`, or a specific current reference it names |
| Enforced architecture boundaries | The actual project rules and their declared consumer; see `target-architecture-contract.md` |
| Observed dependencies and violations | Generated audit report/graph; evidence, never a replacement target contract |
| Known defects / accepted debt | One Active Issues source and one Accepted Drift source |
| Deployment details | Current Ops records and configuration |
| Why an old decision was made | Historical specs, reports and archived architecture |

Authority is scoped to a question or domain, not the newest date or largest file.
An older signed spec cannot override a migrated current registry expectation.
A partial registry cannot erase accepted requirements in an uncovered domain.
If a new signed change-set is not yet applied, keep target and implemented state
distinct. If code disagrees with an accepted requirement, record the discrepancy;
do not silently rewrite the requirement to match code.

## Snapshot shape and ownership

Use the bootstrap `references/architecture-template.md`: applied stack, technical
topology, domain ownership / SSoT, project-specific principles, Active Issues and
Accepted Drift / Exceptions. Preserve a project's existing external issue file
as its single source when appropriate; the snapshot contains a pointer, not a
second editable list. The same rule applies to a specific current contract or
exception reference already maintained elsewhere.

Record nonstandard source paths and their purpose here. Do not add a mandatory
source-map manifest, copy standard HiFlow paths everywhere, or duplicate contract
content that already has a current owner. If necessary, keep detailed current
norms in one narrowly scoped project reference, linked from the snapshot.

The agent performing the work owns the corresponding snapshot update:

- **Bootstrap:** creates the snapshot and updates stack/foundation projections.
- **Implementation or bug-fix close-out:** updates affected topology, ownership
  and issue status after verification. An accepted design alone is not proof of
  implementation. Unfinished work stays visibly partial in the report/state.
- **Architecture design/redesign:** records accepted normative decisions in its
  signed artifact. If a project-wide principle or exception changes immediately,
  update that current source at approval; keep future topology explicitly pending.
- **Audit:** produces evidence. Its consumer records confirmed issues or approved
  exceptions; an audit finding never silently changes accepted boundaries.
- **Ops:** owns delivery records. Snapshot refresh uses those records for the
  high-level delivery shape; it does not copy runbook details.

Update affected sections at phase boundaries. Do not restore continuous event
detection, Topic Index bookkeeping, duplicated decision histories, or recurring
confirmation for deterministic projections. Escalate actual conflicting accepted
requirements or new product/architecture choices, not routine source maintenance.

## Explicit document refresh

For "refresh architecture snapshot", "обнови архитектурный документ" or an
equivalent document-only request, use this reference directly. Do not invoke an
audit, redesign, feature flow, or legacy skill merely to edit documentation.

1. Read the current snapshot and its named sources, repository state, affected
   configuration/code, signed changes and implementation reports.
2. Reconcile what is implemented, accepted but pending, superseded, or uncertain.
   Do not infer implementation from a spec or acceptance from current code.
3. Update only affected current sections and pointers. Preserve principles,
   ownership, exceptions and re-review triggers unless an accepted change replaces
   them. A stale status paragraph is not an architectural obligation.
4. Check current links and evidence. Stop when the snapshot reflects the verified
   scope; state any unresolved discrepancy and where it is tracked. No mandatory
   application test run or new behavior harness is required for a prose-only edit.

## Migrating a legacy architecture document

Migration changes where existing truth is maintained; it does not redesign the
product, import all behavior by default, or change executable architecture rules.

1. Identify the actual repository/branch base and local accepted additions.
   Preserve dirty checkouts; do not treat every uncommitted decision as a draft.
2. Save the old document with a prominent historical notice and a link to the
   current snapshot. Preserve its original body and source revision. Retain old
   decision IDs as provenance; disambiguate collisions by source/revision.
3. Classify its content: current facts; current obligations; accepted exceptions
   and review triggers; active issues; future work; historical/superseded records.
   Give every still-active obligation a current destination. Preserve ambiguous
   obligations explicitly as unresolved; do not silently archive them away.
4. Prefer an existing current contract/spec/registry entry as the destination.
   Carry unique principles/ownership/exception rules into the compact snapshot or
   its named current reference. Use existing backlog/intake/issue owners for their
   respective content. Keep one editable owner for each fact or rule.
5. Update project startup instructions and live links. Preserve necessary anchor
   aliases or redirect them to the current owner. Historical specs need not be
   rewritten merely because the storage location changed.
6. Check source-to-destination preservation and routes with a focused migration
   report. Name the base, local additions, current destinations, checks, partial
   coverage and remaining work. No new recurring manifest or CI service is needed.

Do not label the whole legacy file historical while still relying on unnamed
sections of it as the only current requirements. If preservation is incomplete,
say which sections remain authoritative and leave migration visibly partial.

Retire legacy skill discovery and global/project instructions only when the
replacement references are available and project entry points resolve to them.
Distinguish prepared changes, merged/released package, installed package and fresh
chat context. A source edit does not update an already-running chat's skill list.
