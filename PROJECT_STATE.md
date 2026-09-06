# Project State

This document is the current operational dashboard for the project. It is not a history log, intake, backlog, behavior registry, architecture contract, or implementation report.

## Current Focus

- **Focus:** Ship ArchAudit `0.15.9` no-orphans granularity repair: an unused file can no longer make an imported module look orphaned.
- **Phase:** implementation, full verification, and isolated review completed; release PR pending
- **Owner/session:** `codex/arch-audit-no-orphans-module-granularity`

## Last Completed

- ArchAudit `0.15.8` correction set merged as PR #26.

## Ready Next

- Create and merge the hi_flow PR for the `0.15.9` patch release.
- Refresh the official marketplace plugin locally and on Codex VPS after merge.
- Start new Codex sessions before relying on the updated ArchAudit runtime.

## Waiting / Blocked

- Operator merge of the `0.15.9` PR is required before official marketplace installation.

## Latest Verification

- The no-orphans false module finding reproduced RED: `storage-key.ts` produced a finding while `office-integration-app` had `Ca=2` and two incoming module edges.
- Full ArchAudit suite passed 227/227 across 31 test files on 2026-09-06; typecheck, reproducible build, and `build:check` passed.
- Initial isolated review found missing end-to-end preservation proof for a real orphan; the fixture and test now cover it. Scoped re-review found no remaining issues.
- Claude Code, Codex, Cursor, and marketplace manifests are synchronized at `0.15.9`; internal ArchAudit package is `0.3.9`.

## Active Artifacts

- Product backlog: not used for this contract-restoration bug fix
- Intake: `INTAKE.md`
- Behavior Registry: project-wide references under `hi_flow/references/behavior-registry/`
- Current design: baseline and report contracts in `hi_flow/skills/arch-audit/references/baseline-rules.md` and `hi_flow/skills/arch-audit/references/self-review-checklist.md`
- Current plan/report: `docs/superpowers/plans/2026-09-06-arch-audit-no-orphans-module-granularity-bug-fix.md`, `docs/superpowers/plans/2026-09-06-arch-audit-no-orphans-module-granularity-bug-fix-report.md`
- Architecture snapshot: `ARCHITECTURE.md`

## Update Notes

- Keep this file current-state only.
- Move raw untriaged problems and ideas to `INTAKE.md`.
- Move desired future behavior to backlog.
- Move accepted behavior details to Behavior Registry.
- Move architecture defects to `docs/active-issues.md`.
- Move accepted architecture debt to `ARCHITECTURE.md` Known Drift.
