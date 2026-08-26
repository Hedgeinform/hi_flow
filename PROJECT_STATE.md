# Project State

This document is the current operational dashboard for the project. It is not a history log, intake, backlog, behavior registry, architecture contract, or implementation report.

## Current Focus

- **Focus:** ArchAudit preserves canonical `project:<rule-name>` identifiers from project-rule configuration through D8 finding enrichment.
- **Phase:** hi_flow `0.15.4` release and installed-plugin verification
- **Owner/session:** `codex/arch-audit-project-rule-ids`

## Last Completed

- Bug-fix implementation report: `docs/superpowers/plans/2026-08-26-arch-audit-project-rule-id-bug-fix-report.md`

## Ready Next

- Publish and refresh installed hi_flow plugins to `0.15.4`, then rerun the full Zhenka ArchAudit that previously failed on `project:no-tools-to-dispatcher` during enrichment.

## Waiting / Blocked

- None.

## Latest Verification

- Canonical project-rule regression -> RED failed with `unknown rule_id 'project:no-tools-to-dispatcher'`; GREEN passed with the namespaced D8 finding on 2026-08-26.
- Full ArchAudit suite -> 184/184 passed on 2026-08-26, including runtime freshness and clean installed-plugin distribution checks.
- `tsc --noEmit`, plugin validation, skill validation, independent review, and `git diff --check` -> passed on 2026-08-26.
- `npm audit --omit=dev` -> zero vulnerabilities on 2026-08-26.
- Plugin manifests for Claude Code, Codex, Cursor, and marketplace -> synchronized at `0.15.4`; internal ArchAudit package -> `0.3.4` on 2026-08-26.

## Active Artifacts

- Product backlog: not used for this contract-restoration bug fix
- Intake: `INTAKE.md`
- Behavior Registry: project-wide references under `hi_flow/references/behavior-registry/`
- Current design: canonical project-rule cross-reference contract in `hi_flow/skills/arch-audit/references/d8-schema.json`
- Current plan/report: `docs/superpowers/plans/2026-08-26-arch-audit-project-rule-id-bug-fix.md`, `docs/superpowers/plans/2026-08-26-arch-audit-project-rule-id-bug-fix-report.md`
- Architecture snapshot: `ARCHITECTURE.md`

## Update Notes

- Keep this file current-state only.
- Move raw untriaged problems and ideas to `INTAKE.md`.
- Move desired future behavior to backlog.
- Move accepted behavior details to Behavior Registry.
- Move architecture defects to `docs/active-issues.md`.
- Move accepted architecture debt to `ARCHITECTURE.md` Known Drift.
