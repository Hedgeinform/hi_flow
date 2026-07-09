---
name: intake
description: "Use when the operator wants to quickly capture a raw project signal without starting feature-spec, bug-fix, arch-audit, or implementation: «зафиксируй проёб», «запаркуй идею», «не забыть фичу», «добавь в intake», «потом сделать», or English equivalents."
---

# intake

## Overview

intake owns `INTAKE.md`: a human-readable, transient inbox for raw project signals that are not ready for a formal hi_flow artifact yet.

`INTAKE.md` is not a source of truth. It is a staging area before promotion into Product Backlog, `ARCHITECTURE.md` Active Issues, `hi_flow:feature-spec`, `hi_flow:bug-fix`, or closure as noise / duplicate.

## Boundaries

| Neighbor | Boundary |
|---|---|
| Product Backlog | Formal desired future behavior and product scope. Intake may feed it, but does not replace it. |
| `ARCHITECTURE.md` Active Issues | Formal current problems with accepted behavior / architecture contracts. Intake may feed it, but does not replace it. |
| `PROJECT_STATE.md` | Current operational dashboard. It may point to `INTAKE.md`, but does not store raw intake content. |
| `hi_flow:feature-spec` | New or changed behavior design. Do not start it just to capture a raw idea. |
| `hi_flow:bug-fix` | Contract-preserving fix plan. Do not start it just to capture a raw problem. |
| `hi_flow:arch-audit` | Architecture scanner. Do not start it just to capture a suspicion. |

## File Contract

Default location:

```text
<project>/INTAKE.md
```

If the file is missing, create it from `references/intake-template.md`.

`INTAKE.md` has two primary sections:

- `Observed Problems` - raw reports of broken, risky, confusing, or debt-like current behavior.
- `Parked Ideas` - raw ideas for future behavior, improvements, or product opportunities.

## Capture Mode

Use capture mode when the operator wants to record something quickly.

1. Read or create `INTAKE.md`.
2. Classify the signal:
   - existing problem, regression, risk, debt, violated expectation -> `Observed Problems`;
   - future idea, capability, improvement, product opportunity -> `Parked Ideas`;
   - unclear -> ask one short question: "это проблема текущего обещанного поведения или идея на будущее?"
3. Scan existing `INTAKE.md` entries and the likely formal target when present (`ARCHITECTURE.md` Active Issues for problems, Product Backlog for ideas) for semantic duplicates. If a formal target is missing, record that the target was not present and continue capture; do not create Product Backlog or `ARCHITECTURE.md` during capture. If a likely duplicate exists, show it and ask whether to append context or create a separate entry.
4. Add a new entry with:
   - stable ID `IN-YYYY-MM-DD-NNN`;
   - current date;
   - priority `P0` / `P1` / `P2` / `P3`;
   - status `inbox`;
   - source;
   - optional target if obvious;
   - the operator's wording preserved as raw note.
5. Do not start a spec, audit, bug-fix, implementation plan, or code change during capture.

Priority defaults:

- `P0` - blocks current work or production use.
- `P1` - materially important soon.
- `P2` - normal candidate; default when the operator gives no priority.
- `P3` - someday / low confidence.

## Triage Mode

Use triage mode when the operator asks to process, clean, promote, or review intake.

For each `Status: inbox` entry:

- **Problem with accepted contract evidence** -> propose or append an `ARCHITECTURE.md` Active Issue using the project's architecture template / existing Active Issues table, or route to `hi_flow:bug-fix` if the operator wants a fix plan now.
- **Problem without accepted contract evidence** -> keep in intake or route to investigation; do not silently promote to Active Issue.
- **Future behavior / product improvement** -> propose Product Backlog entry by following `hi_flow/references/backlog-integration.md` and `hi_flow/skills/product-spec/references/product-backlog-template.md`, or route to `hi_flow:feature-spec` / `hi_flow:product-spec` if the operator wants design now. Do not invent a backlog record shape inside intake.
- **Duplicate** -> mark `duplicate` and point to the canonical entry.
- **Noise / no longer relevant** -> mark `closed` with one-line reason.

Every promotion or closure requires an explicit operator-approved patch. After promotion, keep the intake entry compact and update only its status/target; do not copy the whole formal artifact back into intake.

## Statuses

| Status | Meaning |
|---|---|
| `inbox` | Captured, not triaged. |
| `promoted` | Moved into a formal artifact; `Target` points to it. |
| `duplicate` | Duplicate of another intake or formal entry. |
| `closed` | Deliberately discarded or no longer relevant. |

## Project State

Do not update `PROJECT_STATE.md` for ordinary capture.

Update `PROJECT_STATE.md` only when triage changes the current next action, blocker state, or active artifact pointers. In that case, store only a pointer to `INTAKE.md` or the formal target, not the raw note.

## Completion Rule

Capture is complete when:

- `INTAKE.md` exists;
- the raw signal is in the right section;
- date, priority, status, source, and raw note are present;
- duplicates were checked against `INTAKE.md` and any present formal targets, with missing targets noted rather than created;
- no formal source of truth was mutated unless the operator explicitly asked for triage/promotion.

Triage is complete when:

- every processed entry has status `promoted`, `duplicate`, or `closed`, or remains `inbox` with a reason;
- promoted items point to the formal target;
- Product Backlog / Active Issues / downstream plans remain the formal sources of truth.

## Anti-patterns

- **Intake as SSoT.** Never treat `INTAKE.md` as the final backlog or issue register.
- **Silent promotion.** Do not mutate Product Backlog or `ARCHITECTURE.md` without showing the patch.
- **Heavy workflow on capture.** Recording a signal is not permission to run feature-spec, bug-fix, arch-audit, or implementation.
- **Duplicate Project State.** Do not copy raw intake into `PROJECT_STATE.md`.
- **Over-structuring.** Preserve the operator's freeform wording; add only minimal routing metadata.

## References

- `references/intake-template.md` - template for new `INTAKE.md`.
- `hi_flow/references/workflow-routing.md` - family routing.
- `hi_flow/references/backlog-integration.md` - required when promoting ideas into Product Backlog.
- `hi_flow/skills/product-spec/references/product-backlog-template.md` - Product Backlog format authority.
- `hi_flow/skills/bootstrap/references/architecture-template.md` - default Active Issues table shape when the project has no richer local convention.
