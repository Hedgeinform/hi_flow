---
name: intake
description: "Use when the operator wants to capture, review, triage, or select work from INTAKE.md without immediately starting code work: «зафиксируй проблему», «запаркуй идею», «посмотри intake», «разбери intake», «что брать в работу», «добавь в intake», or English equivalents."
---

# intake

## Overview

intake owns `INTAKE.md`: a human-readable, transient inbox for raw project signals that are not ready for a formal hi_flow artifact yet. It also helps select which raw signal should enter a formal hi_flow or implementation workflow next.

`INTAKE.md` is not a source of truth. It is a live staging area before promotion into Product Backlog, `ARCHITECTURE.md` Active Issues, `hi_flow:feature-spec`, `hi_flow:bug-fix`, or deletion as noise / duplicate. Processed entries do not stay in intake.

## Boundaries

| Neighbor | Boundary |
|---|---|
| Product Backlog | Formal desired future behavior and product scope. Intake may feed it, but does not replace it. |
| `ARCHITECTURE.md` Active Issues | Formal current problems with accepted behavior / architecture contracts. Intake may feed it, but does not replace it. |
| `PROJECT_STATE.md` | Current operational dashboard. It may point to `INTAKE.md`, but does not store raw intake content. |
| `hi_flow:feature-spec` | New or changed behavior design. Do not start it just to capture a raw idea. |
| `hi_flow:bug-fix` | Contract-preserving fix plan. Do not start it just to capture a raw problem. |
| `hi_flow:arch-audit` | Architecture scanner. Do not start it just to capture a suspicion. |

`INTAKE.md` accepts human-originated signals. Agent-originated findings must go to formal artifacts (`ARCHITECTURE.md` Active Issues, Product Backlog, implementation report, audit report) or stay in the current response until the operator explicitly asks to park them in intake.

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

Write to `INTAKE.md` only when one of these is true:

- the operator explicitly asks to capture / park / remember a signal;
- the operator asks to record an external human signal, such as customer, support, sales, user interview, or research feedback;
- after a semantic phase, the agent asks whether to park an ambiguous human-facing signal and the operator explicitly confirms.

Do not write agent-discovered issues to intake by default. If an agent finds a real contract violation, route to Active Issues or `hi_flow:bug-fix`; if it finds a future product improvement, route to Product Backlog or `hi_flow:feature-spec`; if it only has a weak suspicion, report it as an open question.

1. Read or create `INTAKE.md`.
2. Classify the signal:
   - existing problem, regression, risk, debt, violated expectation -> `Observed Problems`;
   - future idea, capability, improvement, product opportunity -> `Parked Ideas`;
   - unclear -> ask one short question: "это проблема текущего обещанного поведения или идея на будущее?"
3. Scan existing `INTAKE.md` entries and the likely formal target when present (`ARCHITECTURE.md` Active Issues for problems, Product Backlog for ideas) for semantic duplicates. If a formal target is missing, record that the target was not present and continue capture; do not create Product Backlog or `ARCHITECTURE.md` during capture. If a likely duplicate exists, show it and ask whether to append context or create a separate entry.
4. Add a new entry with:
   - stable ID `IN-YYYY-MM-DD-NNN`;
   - current date;
   - priority `P0 Critical` / `P1 High` / `P2 Medium` / `P3 Low`;
   - optional `Source` only when the signal came from a non-operator human source;
   - the operator's wording preserved as raw note.
5. Do not start a spec, audit, bug-fix, implementation plan, or code change during capture.

Priority is section-relative. The same label orders triage inside a section, but `Observed Problems` and `Parked Ideas` interpret it differently.

Canonical priority values use both numeric and verbal labels. If the operator gives only one form (`P1` or `High`), normalize to the paired form.

For `Observed Problems`:

- `P0 Critical` - blocks current work, production use, or a key accepted scenario. It may still be captured briefly before immediate fix work so it does not get lost.
- `P1 High` - serious defect, risk, or debt, but the system is not stopped.
- `P2 Medium` - normal defect or debt signal; default when the operator gives no priority.
- `P3 Low` - weak signal, suspicion, informational note, small rough edge, or low-impact cleanup.

For `Parked Ideas`:

- `P0 Critical` - exceptional. Ask whether this is really a parked idea or should start `hi_flow:product-spec` / `hi_flow:feature-spec` now.
- `P1 High` - strong candidate for the next product/design triage.
- `P2 Medium` - normal parked idea; default when the operator gives no priority.
- `P3 Low` - someday, low-confidence, or speculative idea kept only so it is not forgotten.

## Triage Mode

Use triage mode when the operator asks to process, clean, promote, or review intake.

For each live entry:

- **Problem with accepted contract evidence** -> propose or append an `ARCHITECTURE.md` Active Issue using the project's architecture template / existing Active Issues table, or route to `hi_flow:bug-fix` if the operator wants a fix plan now.
- **Problem without accepted contract evidence** -> keep in intake or route to investigation; do not silently promote to Active Issue.
- **Future behavior / product improvement** -> propose Product Backlog entry by following `hi_flow/references/backlog-integration.md` and `hi_flow/skills/product-spec/references/product-backlog-template.md`, or route to `hi_flow:feature-spec` / `hi_flow:product-spec` if the operator wants design now. Do not invent a backlog record shape inside intake.
- **Rejected product decision worth remembering** -> move to the Product Backlog's out-of-scope / rejected area if the local backlog has one, then remove from intake.
- **Accepted architecture / technical exception worth remembering** -> move to `ARCHITECTURE.md` Accepted Drift / Accepted Exceptions using the local convention, then remove from intake.
- **Duplicate** -> merge any useful context into the canonical live intake entry or formal target, then remove the duplicate from intake.
- **Noise / no longer relevant** -> remove from intake.

Every promotion, merge, or deletion requires an explicit operator-approved patch. Intake does not keep `promoted`, `duplicate`, or `closed` history.

## Work Selection Mode

Use work selection mode when the operator asks what to take from intake next, such as "посмотри intake", "что брать в работу", "разбери intake", or "triage intake".

1. Read `INTAKE.md` and the likely formal targets if present: Product Backlog for ideas, `ARCHITECTURE.md` Active Issues for problems, Behavior Registry / reports only when needed to classify accepted-contract evidence.
2. Group live entries into a short decision table:
   - `feature-spec candidate` - new or changed behavior that needs design;
   - `product-backlog candidate` - useful idea to park formally, not start now;
   - `bug-fix candidate` - current problem with accepted-contract evidence;
   - `active-issue candidate` - current problem worth tracking formally but not fixing now;
   - `investigate` - signal is real enough to keep, but not enough to classify;
   - `merge/delete` - duplicate, stale, or noise.
3. Recommend the next action, but ask the operator to confirm before mutating formal artifacts or starting another skill.
4. After the operator chooses an entry, route it:
   - idea / changed behavior -> `hi_flow:feature-spec` or Product Backlog;
   - product-level scope -> `hi_flow:product-spec`;
   - accepted-contract bug -> `hi_flow:bug-fix`;
   - tracked-but-not-now problem -> `ARCHITECTURE.md` Active Issues;
   - small local technical fix with no hi_flow contract impact -> general implementation workflow.
5. Do not implement code from an intake entry directly. Intake selects the route; the downstream workflow owns design, planning, and execution.

## Completion Rule

Capture is complete when:

- `INTAKE.md` exists;
- the raw signal is in the right section;
- date, priority, and raw note are present;
- `Source` is present only when useful for a non-operator human source;
- duplicates were checked against `INTAKE.md` and any present formal targets, with missing targets noted rather than created;
- no formal source of truth was mutated unless the operator explicitly asked for triage/promotion.

Triage is complete when:

- processed entries were removed from `INTAKE.md` after promotion, merge, or deletion;
- remaining entries are only still-live untriaged signals;
- Product Backlog / Active Issues / downstream plans remain the formal sources of truth.

Work selection is complete when:

- live entries are classified into route candidates;
- the recommended next action is explicit;
- no code work, spec work, bug-fix plan, or formal source mutation starts without the operator choosing the route.

## Anti-patterns

- **Intake as SSoT.** Never treat `INTAKE.md` as the final backlog or issue register.
- **Silent promotion.** Do not mutate Product Backlog or `ARCHITECTURE.md` without showing the patch.
- **Heavy workflow on capture.** Recording a signal is not permission to run feature-spec, bug-fix, arch-audit, or implementation.
- **Updating Project State.** Intake capture and triage do not update `PROJECT_STATE.md`; the downstream semantic phase updates it when that phase completes.
- **Agent scratchpad.** Do not store agent-originated findings in intake unless the operator explicitly asked to park them there.
- **Processed-item cemetery.** Do not keep handled items as `promoted`, `duplicate`, or `closed` records.
- **Skipping routing.** Do not turn an intake entry directly into code. Select the downstream workflow first.
- **Over-structuring.** Preserve the operator's freeform wording; add only minimal routing metadata.

## References

- `references/intake-template.md` - template for new `INTAKE.md`.
- `hi_flow/references/workflow-routing.md` - family routing.
- `hi_flow/references/backlog-integration.md` - required when promoting ideas into Product Backlog.
- `hi_flow/skills/product-spec/references/product-backlog-template.md` - Product Backlog format authority.
- `hi_flow/skills/bootstrap/references/architecture-template.md` - default Active Issues table shape when the project has no richer local convention.
