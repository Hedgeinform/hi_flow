# hi_flow Project State and Architecture Split - Decision Notes

**Date:** 2026-07-07
**Status:** decision notes, not an implementation spec

These notes capture the design decisions from the project-state / architecture discussion before changing any skills.

---

## 1. Problem

The old operator-personal `architecture` skill is overloaded:

- it tries to be a living architecture document, decision log, drift tracker, session-start context loader, and semantic deduplication mechanism at the same time;
- its triggers conflict with `hi_flow:arch-spec`, `hi_flow:arch-audit`, and `hi_flow:arch-redesign`;
- its "architectural event detected" behavior creates too much operator friction;
- its Topic Index / aliases / deduplication mechanics are too heavy and fragile;
- after Behavior Registry, Backlog, architecture contracts, and implementation reports exist, a large `ARCHITECTURE.md` becomes a duplicate source of truth.

The new goal is not to port that skill as-is. The goal is to split its useful responsibilities into smaller Hi-Flow-owned mechanisms.

---

## 2. File Roles

### `ARCHITECTURE.md`

Keep the filename, but narrow the meaning:

> `ARCHITECTURE.md` is an architecture snapshot: the current technical shape of the project.

It is not:

- a decision log;
- a behavior registry;
- a backlog;
- a full module graph;
- a project status dashboard;
- a place to duplicate standard Hi-Flow artifact paths.

It should contain only project-specific architectural facts that do not have a better source of truth.

### `PROJECT_STATE.md`

Add a separate operational state file:

> `PROJECT_STATE.md` is the return-to-project dashboard.

It answers:

- where are we now?
- what was completed most recently?
- what is ready next?
- what is waiting or blocked?
- which signed specs / plans / reports are still operationally relevant?
- what was the latest verification state?

It is current-state only, not history. Old items are removed, moved to backlog, moved to Active Issues, moved to Accepted Drift, or closed by reference to an implementation report.

---

## 3. `ARCHITECTURE.md` Sections

### 3.1 Technical Topology

Stack + runtime/deployment/integration shape in one compact section.

Examples:

- frontend runtime and delivery form;
- backend runtime and delivery form;
- database / object storage / queue / scheduler;
- external entrypoints such as web app, webhook, bot, API;
- LLM provider integration shape;
- deployment target shape at a high level.

Do not store stack baselines here. The stack baseline is a Hi-Flow reference artifact.

### 3.2 Domain Ownership / SSoT Map

Project-specific ownership of domain data and states.

Examples:

- Files owns bytes, storage keys, file revisions;
- Documents owns document semantics and editable document state;
- Tasks owns workflow status;
- Users owns identity/profile;
- Billing owns subscription state.

This section is valuable because it prevents agents from spreading responsibility across modules.

### 3.3 Active Issues

Active Issues are known violations of already accepted contracts that should be fixed.

They include:

- behavior contract violations;
- bugs in already accepted behavior;
- architecture contract violations;
- technical gate failures;
- known defects that do not require a new product decision.

Boundary with backlog:

- if the system violates an existing accepted contract -> Active Issue;
- if the desired behavior itself needs to change or be added -> Backlog.

Active Issues can live inside the narrowed `ARCHITECTURE.md` because the document is now small enough. Closing an Active Issue does not need a separate historical event. The list itself is the current truth.

### 3.4 Accepted Drift / Accepted Exceptions

Accepted Drift is a known violation or exception that the project consciously lives with until a review trigger.

It is not a bug list and not "we forgot this".

Each item should state:

- what is being accepted;
- why it is acceptable for now;
- the trigger for re-review.

---

## 4. What Must Not Live In `ARCHITECTURE.md`

These artifacts have their own source of truth:

- desired behavior -> Behavior Registry;
- product scope / future behavior -> Product Backlog;
- target architecture graph / boundary contract -> ArchAudit-owned contract format;
- observed architecture graph -> ArchAudit generated output;
- stack baselines -> Hi-Flow shared reference layer;
- implementation truth -> implementation reports and code;
- delivery runbook/profile details -> Ops artifacts;
- current operational status -> `PROJECT_STATE.md`.

Do not copy standard Hi-Flow artifact paths into `ARCHITECTURE.md` unless the project uses a non-standard location.

---

## 5. Architecture Contract and ArchAudit

The target architecture graph evolves through design skills:

- `hi_flow:bootstrap` creates the initial minimal contract / baseline wiring;
- `hi_flow:arch-spec` adds or changes target boundaries for a feature;
- `hi_flow:arch-redesign` changes target boundaries when fixing architecture debt.

`hi_flow:arch-audit` does not make architecture decisions. It owns the enforcement layer:

- the target boundary contract format;
- validation of that contract;
- observed graph generation from code;
- comparison between observed graph and target contract;
- audit report / generated graph output;
- surfacing architecture regressions and violations.

After implementation, ArchAudit should confirm that the observed graph still conforms to the target contract. It may update generated observed graph artifacts, but it must not silently update the target contract from current code.

---

## 6. Stack Baselines

Stack baselines should not be owned by `ARCHITECTURE.md`.

Target ownership:

- shared Hi-Flow reference layer owns stack baseline content;
- `hi_flow:bootstrap` applies stack baselines to a project;
- `hi_flow:arch-audit` enforces the machine-checkable subset;
- `hi_flow:arch-spec` emits feature-level rules-patches when a feature needs additional boundaries;
- `ARCHITECTURE.md` only records the project-specific applied topology, not the baseline rules.

Existing gap:

- arch-audit baseline rules already live inside the plugin;
- stack baseline references for TypeScript / React still point to the operator-personal architecture area and need relocation into the plugin.

---

## 7. `hi_flow:project-state`

Add a new skill:

```text
hi_flow:project-state
```

Its role:

- own the `PROJECT_STATE.md` format;
- answer "where are we now?";
- refresh project state on explicit request;
- validate that `PROJECT_STATE.md` remains current-state, not history;
- provide a compact session-start context source.

It must not be called `architecture` or `living-architecture`; those names collide with architecture design/audit/redesign routing.

Suggested triggers:

- "project state";
- "current project state";
- "where are we?";
- "what is the current project status?";
- "с чего продолжить";
- "где мы остановились";
- "что сейчас по проекту";
- "актуализируй состояние проекта";
- "обнови project state".

Anti-triggers:

- "архитектурная спека" -> `hi_flow:arch-spec`;
- "архитектурный аудит" / "проверь архитектуру" -> `hi_flow:arch-audit`;
- "архитектурный редизайн" -> `hi_flow:arch-redesign`.

---

## 8. Project State Update Discipline

`PROJECT_STATE.md` should be updated at phase boundaries, not by continuous event detection.

Do not reproduce the old pattern:

> "Project-state event detected..."

Instead, each phase skill should include a final requirement to update Project State.

Phase-exit update points:

- `hi_flow:product-spec` finalization;
- `hi_flow:feature-spec` finalization;
- `hi_flow:arch-spec` waiver/full arch-spec finalization;
- `hi_flow:implementation-plan` creation;
- `hi_flow:behavior-migration` completion;
- `hi_flow:bootstrap` completion;
- `hi_flow:ops` completion;
- `hi_flow:arch-audit` completion;
- `hi_flow:arch-redesign` completion.

State updates should summarize the new current state and next action. They should not store a historical event log.

Hook usage should be limited to session-start context loading:

- read `PROJECT_STATE.md` if present;
- read compact `ARCHITECTURE.md` if needed;
- do not proactively write state from a hook.

---

## 9. Implementation Completion Protocol

The post-implementation protocol must be embedded in `hi_flow:implementation-plan`, because Hi-Flow does not control the Superpowers implementation skill directly.

Every Hi-Flow implementation plan should include a Completion Protocol:

1. Create an implementation report next to the plan/spec.
2. Run required verification:
   - behavior checks / harness runner;
   - targeted tests;
   - lint/typecheck/build as applicable.
3. Request or perform isolated review:
   - compare implementation against feature-spec;
   - compare executable contracts / registry changes;
   - check deviations and missing coverage.
4. If review passes, run architecture audit:
   - use the target architecture contract;
   - generate observed graph;
   - confirm no architecture regression.
5. Update `PROJECT_STATE.md`:
   - completed / partial / blocked status;
   - current focus;
   - next action;
   - active blockers;
   - verification summary.

The implementation is not complete until the Completion Protocol is complete or explicitly blocked.

---

## 10. Backlog vs Active Issue vs Accepted Drift

### Backlog

Queue of desired behavior changes.

Use when:

- new behavior is needed;
- existing behavior should change;
- UX/product scope expands;
- a product decision is required.

### Active Issue

Known violation of an already accepted contract that should be fixed.

Use when:

- expected accepted behavior does not work;
- behavior contract is violated;
- architecture contract is violated;
- CI / lint / test / audit gate is broken;
- the issue is a defect, not a new desired behavior.

### Accepted Drift

Known violation consciously accepted for now.

Use when:

- the violation is real;
- the team/operator decides not to fix it now;
- there is a clear trigger for re-review.

Closing Active Issues or Accepted Drift does not need a separate event log. The current list is the source of truth.

---

## 11. Implementation Tracking

This note records the design decisions. The living behavior and operational
rules must be enforced by the plugin skills, not by this note.

Implemented in the first Project State slice:

1. `hi_flow:project-state` exists.
2. `PROJECT_STATE.md` template exists.
3. Bootstrap creates the initial project-state foundation during init.
4. Bootstrap incremental creates/updates Project State when it fixes a foundation axis.
5. Phase skills require Project State updates at closure.
6. Implementation-plan writes a Completion Protocol for executor close-out.
7. Hi-Flow skills no longer route generic architecture/document updates to an operator-personal `architecture` / `living-architecture` skill.

Still needed:

1. Slim the `ARCHITECTURE.md` template.
2. Relocate stack baselines from operator-personal paths into the plugin.
3. Update ArchAudit / ArchSpec / ArchRedesign responsibilities around target architecture contract and observed graph.
