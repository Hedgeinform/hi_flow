# Project State

This document is the current operational dashboard for the project. It is not a history log, intake, backlog, behavior registry, architecture contract, or implementation report.

## Current Focus

- **Focus:** ArchAudit uses one explicit D8 source contract for project-level NCCD findings across runtime validation and mandatory self-review.
- **Phase:** hi_flow `0.15.6` source implementation verified; PR publication and external Zhenka acceptance are next
- **Owner/session:** `codex/arch-audit-d8-contract-followup`

## Last Completed

- Bug-fix implementation report: `docs/superpowers/plans/2026-08-29-arch-audit-d8-nccd-followup-bug-fix-report.md`

## Ready Next

- Publish and merge the hi_flow `0.15.6` patch release.
- Canonicalize the 13 legacy `acyclic-dependencies (ADP)` principles in Zhenka's active `.audit-rules.yaml`.
- Update the installed plugin on the Codex VPS and rerun the official audit from the real Git worktree.

## Waiting / Blocked

- None.

## Latest Verification

- D8 NCCD source regression -> RED: 2 expected failures while 15 existing validator tests passed; GREEN: 17/17 validator tests passed on 2026-08-29.
- Full ArchAudit suite -> 30 test files and 214/214 tests passed, including standalone runtime distribution coverage, on 2026-08-29.
- `npm run typecheck`, `npm run build:check`, plugin validation, skill validation, independent review, and `git diff --check` -> passed on 2026-08-29.
- `npm audit --omit=dev --audit-level=high` -> zero production vulnerabilities on 2026-08-29.
- Plugin manifests for Claude Code, Codex, Cursor, and marketplace -> synchronized at `0.15.6`; internal ArchAudit package -> `0.3.6` on 2026-08-29.

## Active Artifacts

- Product backlog: not used for this contract-restoration bug fix
- Intake: `INTAKE.md`
- Behavior Registry: project-wide references under `hi_flow/references/behavior-registry/`
- Current design: D8 finding source contract in `hi_flow/skills/arch-audit/references/d8-schema.md`
- Current plan/report: `docs/superpowers/plans/2026-08-29-arch-audit-d8-nccd-followup-bug-fix.md`, `docs/superpowers/plans/2026-08-29-arch-audit-d8-nccd-followup-bug-fix-report.md`
- Architecture snapshot: `ARCHITECTURE.md`

## Update Notes

- Keep this file current-state only.
- Move raw untriaged problems and ideas to `INTAKE.md`.
- Move desired future behavior to backlog.
- Move accepted behavior details to Behavior Registry.
- Move architecture defects to `docs/active-issues.md`.
- Move accepted architecture debt to `ARCHITECTURE.md` Known Drift.
