# Project State

This document is the current operational dashboard for the project. It is not a history log, intake, backlog, behavior registry, architecture contract, or implementation report.

## Current Focus

- **Focus:** ArchAudit ships an autonomous JavaScript/TypeScript runtime that works from an installed plugin without `node_modules`.
- **Phase:** hi_flow `0.15.2` release to `origin/master`
- **Owner/session:** `codex/arch-audit-standalone-runtime`

## Last Completed

- Bug-fix implementation report: `docs/superpowers/plans/2026-08-16-arch-audit-standalone-runtime-bug-fix-report.md`

## Ready Next

- Refresh installed hi_flow plugins to `0.15.2`, then rerun the REH_ERP ArchAudit from a new Codex session.

## Waiting / Blocked

- None.

## Latest Verification

- Full ArchAudit suite -> 181/181 passed on 2026-08-16.
- Clean plugin copy without any `node_modules` -> version, info, TypeScript D8 audit, Markdown render, apply-patch, and principles-index regeneration passed on 2026-08-16.
- Runtime freshness check, `tsc --noEmit`, plugin validation, skill validation, and `git diff --check` -> passed on 2026-08-16.
- `npm audit --omit=dev` -> zero vulnerabilities on 2026-08-16.
- Plugin manifests for Claude Code, Codex, Cursor, and marketplace -> synchronized at `0.15.2` on 2026-08-16.

## Active Artifacts

- Product backlog: not used for this contract-restoration bug fix
- Intake: `INTAKE.md`
- Behavior Registry: project-wide references under `hi_flow/references/behavior-registry/`
- Current design: accepted self-contained runtime contract in `hi_flow/skills/arch-audit/SKILL.md`
- Current plan/report: `docs/superpowers/plans/2026-08-16-arch-audit-standalone-runtime-bug-fix.md`, `docs/superpowers/plans/2026-08-16-arch-audit-standalone-runtime-bug-fix-report.md`
- Architecture snapshot: `ARCHITECTURE.md`

## Update Notes

- Keep this file current-state only.
- Move raw untriaged problems and ideas to `INTAKE.md`.
- Move desired future behavior to backlog.
- Move accepted behavior details to Behavior Registry.
- Move architecture defects to `docs/active-issues.md`.
- Move accepted architecture debt to `ARCHITECTURE.md` Known Drift.
