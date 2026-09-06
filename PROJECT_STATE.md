# Project State

This document is the current operational dashboard for the project. It is not a history log, intake, backlog, behavior registry, architecture contract, or implementation report.

## Current Focus

- **Focus:** Ship ArchAudit `0.15.8` corrections: deduplicated barrel findings, bounded foundation diagrams, readable Markdown evidence, and semantically accurate NCCD findings.
- **Phase:** implementation and independent review completed; release PR pending
- **Owner/session:** `codex/arch-audit-037-contract-fixes`

## Last Completed

- ArchAudit `0.15.7` baseline contract repair merged as PR #25.

## Ready Next

- Create and merge the hi_flow PR for the `0.15.8` patch release.
- Refresh the official marketplace plugin locally and on Codex VPS after merge.
- Start new Codex sessions before relying on the updated ArchAudit runtime.

## Waiting / Blocked

- Operator merge of the `0.15.8` PR is required before official marketplace installation.

## Latest Verification

- Barrel, foundation-view, Markdown Details, and NCCD semantic regressions reproduced RED and passed GREEN.
- Full ArchAudit suite passed 224/224 across 30 test files on 2026-09-06.
- Typecheck, reproducible build, installed-artifact parity, diff check, and independent code review passed.
- Claude Code, Codex, Cursor, and marketplace manifests are synchronized at `0.15.8`; internal ArchAudit package is `0.3.8`.

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
