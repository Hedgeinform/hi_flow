# Project State

This document is the current operational dashboard for the project. It is not a history log, intake, backlog, behavior registry, architecture contract, or implementation report.

## Current Focus

- **Focus:** JavaScript/ESM support and the four ArchAudit harness/runtime regressions are fixed and verified.
- **Phase:** released to `origin/master`
- **Owner/session:** `master`

## Last Completed

- Bug-fix implementation report: `docs/superpowers/plans/2026-07-17-arch-audit-test-harness-hardening-bug-fix-report.md`

## Ready Next

- Refresh the installed hi_flow plugin to `0.15.0`, then select the next Active Issue or intake item.

## Waiting / Blocked

- None.

## Latest Verification

- Full ArchAudit suite from the package and an external cwd -> 180/180 passed in each run on 2026-07-17.
- Tracked audit-report SHA-256 manifest -> 12/12 unchanged after the external-cwd full suite on 2026-07-17.
- Six tracked Markdown fixtures -> index LF with `text eol=lf` on 2026-07-17.
- `tsc --noEmit` and `git diff --check` -> passed on 2026-07-17.
- CWS hash-identical smoke from the preceding JS/ESM fix -> valid D8, 7 modules and 10 edges on 2026-07-17.
- Plugin manifests for Claude, Codex, Cursor, and marketplace -> synchronized at `0.15.0` on 2026-07-17.

## Active Artifacts

- Product backlog: not used for this contract-restoration bug fix
- Intake: `INTAKE.md`
- Behavior Registry: project-wide references under `hi_flow/references/behavior-registry/`
- Current design: `docs/superpowers/specs/2026-07-17-arch-audit-test-harness-hardening-design.md`
- Current plan/report: `docs/superpowers/plans/2026-07-17-arch-audit-test-harness-hardening-bug-fix.md`, `docs/superpowers/plans/2026-07-17-arch-audit-test-harness-hardening-bug-fix-report.md`
- Architecture snapshot: `ARCHITECTURE.md`

## Update Notes

- Keep this file current-state only.
- Move raw untriaged problems and ideas to `INTAKE.md`.
- Move desired future behavior to backlog.
- Move accepted behavior details to Behavior Registry.
- Move architecture defects to `docs/active-issues.md`.
- Move accepted architecture debt to `ARCHITECTURE.md` Known Drift.
