# Project State

This document is the current operational dashboard for the project. It is not a history log, intake, backlog, behavior registry, architecture contract, or implementation report.

## Current Focus

- **Focus:** Ship the verified ArchAudit `0.15.7` contract repair: deterministic Mermaid output plus graph-only ordinary edges and a consistent baseline registry.
- **Phase:** implementation, independent review, and exact-SHA Phase 1+2 smoke completed; PR #25 is open, with operator merge and plugin refresh next
- **Owner/session:** `codex/arch-audit-cluster-edge-precedence`

## Last Completed

- Bug-fix implementation report: `docs/superpowers/plans/2026-08-30-arch-audit-baseline-contract-cleanup-bug-fix-report.md`

## Ready Next

- Merge hi_flow PR #25 for the `0.15.7` patch release.
- Refresh the official marketplace plugin locally and on Codex VPS after merge.
- Start new Codex sessions before relying on the updated ArchAudit runtime.

## Waiting / Blocked

- Operator merge of the `0.15.7` PR is required before official marketplace installation.

## Latest Verification

- Baseline registry and Scope regressions reproduced RED; focused GREEN gate passed 35/35 on 2026-08-30.
- Full ArchAudit suite passed 218/218 across 30 test files on 2026-08-30.
- Typecheck, reproducible build, plugin/skill validation, dependency audit, diff check, and independent code review passed.
- Exact published candidate `421edf5` completed Phase 1+2 smoke and isolated seven-group report self-review; the permitted static Mermaid fallback was used because `mmdc` is unavailable.
- Claude Code, Codex, Cursor, and marketplace manifests remain synchronized at `0.15.7`; internal ArchAudit package remains `0.3.7`.

## Active Artifacts

- Product backlog: not used for this contract-restoration bug fix
- Intake: `INTAKE.md`
- Behavior Registry: project-wide references under `hi_flow/references/behavior-registry/`
- Current design: baseline and report contracts in `hi_flow/skills/arch-audit/references/baseline-rules.md` and `hi_flow/skills/arch-audit/references/self-review-checklist.md`
- Current plan/report: `docs/superpowers/plans/2026-08-30-arch-audit-baseline-contract-cleanup-bug-fix.md`, `docs/superpowers/plans/2026-08-30-arch-audit-baseline-contract-cleanup-bug-fix-report.md`
- Architecture snapshot: `ARCHITECTURE.md`

## Update Notes

- Keep this file current-state only.
- Move raw untriaged problems and ideas to `INTAKE.md`.
- Move desired future behavior to backlog.
- Move accepted behavior details to Behavior Registry.
- Move architecture defects to `docs/active-issues.md`.
- Move accepted architecture debt to `ARCHITECTURE.md` Known Drift.
