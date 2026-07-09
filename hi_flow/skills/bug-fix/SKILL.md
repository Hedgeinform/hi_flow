---
name: bug-fix
description: Use when the operator asks to fix an Active Issue, regression, or bug in already accepted hi_flow behavior or architecture. Do not use for new behavior, product changes, or ambiguous expectations without an accepted contract.
---

# bug-fix

## Overview

bug-fix is the hi_flow path for restoring an accepted contract without reopening product design. It produces a Superpowers-compatible, contract-preserving fix plan; execution still belongs to Superpowers or an equivalent implementation workflow.

Core distinction:

- **Bug fix:** accepted behavior/architecture says X, the system does not do X.
- **Feature/change:** the desired behavior is different from the accepted contract, unclear, or not yet accepted.

If the second case is true, stop and route to `hi_flow:feature-spec` or product backlog. Do not smuggle product decisions through a bug fix.

## Inputs

At least one accepted-contract source is required:

- Behavior Registry scenario(s), mapping, or harness case;
- `ARCHITECTURE.md` Active Issue row with a violated contract;
- Target Architecture Contract rule / arch-audit finding;
- signed feature-spec / arch-spec / implementation report proving the accepted expectation;
- existing failing test/harness case that clearly encodes accepted behavior.

If no accepted-contract source exists:

- for raw capture only -> route to `hi_flow:intake`;
- for a product expectation or behavior change -> route to `hi_flow:feature-spec`;
- for a desired future improvement -> route to product backlog;
- for an old project with missing behavior rails and broad undocumented expectations -> route to `hi_flow:behavior-migration`;
- for a tiny local technical bug with no hi_flow contract impact -> use the generic implementation workflow directly.

## Anti-triggers

- New user-visible behavior, UX decision, or policy change -> `hi_flow:feature-spec`.
- Raw "зафиксируй проблему / зафиксируй ошибку / note this bug" capture with no immediate fix planning -> `hi_flow:intake`.
- Architecture debt campaign -> `hi_flow:arch-redesign`.
- Unknown current state / resume question -> `hi_flow:project-state`.
- Small local bugfix with no accepted behavior/architecture contract -> Superpowers directly.

## Planning Flow

1. **Read current state first.** Inspect code, tests, Behavior Registry, `ARCHITECTURE.md`, relevant reports, and failing evidence. Do not trust old specs over code.
2. **Identify the violated contract.** Name exact scenario IDs, Active Issue IDs, audit rule IDs, or signed artifact sections. If expectation is ambiguous, stop and route upstream.
3. **Classify the fix.** Behavior regression, architecture-contract violation, implementation deviation, harness/test defect, or mixed.
4. **Map registry and harness impact.**
   - Existing accepted scenarios may get new/updated executable coverage.
   - Existing registry content may be updated only to capture evidence, status, mapping, or history of an already accepted expectation.
   - If the project has no Behavior Registry / behavior runner yet, do not create broad registry or harness foundation in bug-fix. Use a focused regression proof and record `hi_flow:behavior-migration` as a follow-up when durable rails are needed.
   - Do not create a new behavior expectation inside bug-fix.
5. **Write the bug-fix plan.** Use `references/bug-fix-plan-template.md`. The plan must name the original failing symptom, accepted expectation, RED test/harness step, minimal GREEN implementation, final verification, Active Issue handling, and completion protocol.
6. **Self-review.** Verify the plan preserves accepted behavior, does not invent product decisions, has a failing proof, and closes hi_flow state.
7. **Offer execution.** Recommend `superpowers:subagent-driven-development` or `superpowers:executing-plans` with `superpowers:test-driven-development`, `superpowers:requesting-code-review`, and `superpowers:verification-before-completion`.

## Active Issue Handling

If the bug is already listed in `ARCHITECTURE.md` Active Issues, the plan must reference the row ID and tell the executor how to update it after verification.

If the issue is discovered during planning and will not be fully fixed by this plan, add or propose an Active Issue row. If the plan intends to fix it immediately, the implementation report is enough only when completion is verified. The plan must say: if execution ends `partial` or `blocked`, create or keep an Active Issue row before close-out.

Closing an Active Issue means removing it or marking it according to the project's compact architecture convention after verification. Do not create a separate event log.

## Output

Write:

`<project>/docs/superpowers/plans/YYYY-MM-DD-<slug>-bug-fix.md`

The plan must be executable without conversation history and must keep Superpowers-compatible task checkboxes.

## Self-Review Checklist

- A concrete accepted-contract source is named.
- The plan says why this is a bug fix, not a feature/change.
- No signed feature-spec or arch-spec is rewritten.
- Behavior Registry changes, if any, are capture/mapping/status/history for accepted behavior, not new product decisions.
- Missing broad behavior rails are routed to `hi_flow:behavior-migration`; bug-fix does not create a project-wide registry/harness foundation.
- Every behavior-impact task has RED before GREEN.
- Every automated affected scenario names exact executable files or existing mapping.
- Active Issue handling is explicit.
- Completion Protocol includes implementation report, focused verification, behavior gate if relevant, isolated review, arch-audit if architecture contract is touched, and Project State update.
- No TODO/TBD/placeholders remain.

## References

- `references/bug-fix-plan-template.md` - output structure.
- `hi_flow/references/workflow-routing.md` - family routing.
- `hi_flow/references/behavior-registry.md` - registry lifecycle.
- `hi_flow/references/behavior-harness.md` - behavior gate policy.
- `hi_flow/references/target-architecture-contract.md` - architecture contract vs observed graph.
