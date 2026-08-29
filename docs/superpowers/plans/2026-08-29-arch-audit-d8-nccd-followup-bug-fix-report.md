# Implementation Report: Arch-Audit D8 NCCD Source Contract

**Spec:** `docs/superpowers/plans/2026-08-29-arch-audit-d8-nccd-followup-bug-fix.md`
**Date:** 2026-08-29
**Status:** completed

## What was done

- Reserved `source.module: "<project>"` for the existing `type: nccd` / `rule_id: baseline:nccd-breach` aggregate and required that aggregate to use the sentinel.
- Added two focused regression tests covering both invalid directions: a non-NCCD finding using `<project>` and an NCCD aggregate naming a graph module.
- Aligned the canonical D8 reference and mandatory self-review checklist with the executable validator.
- Rebuilt the standalone runtime and synchronized hi_flow `0.15.6` across Claude Code, Codex, Cursor, and marketplace manifests; bumped the internal ArchAudit package to `0.3.6`.
- Updated `PROJECT_STATE.md` with the verified state and external Zhenka acceptance steps.

## Deviations from spec

- None. The non-Git `audit_sha` behavior was deliberately left unchanged because it is a separate compatibility decision and did not cause the NCCD self-review contradiction.
- Legacy `acyclic-dependencies (ADP)` values were not normalized inside hi_flow because the current D9 contract intentionally rejects non-canonical project-rule principles. Their migration belongs to Zhenka's project configuration.

## Issues discovered

- A control audit run from a temporary non-Git copy cannot establish D8 freshness because the current producer uses a UUID fallback. The official acceptance run must use the real Git worktree; changing non-Git support requires a separate contract decision.
- `npm ci` reports existing vulnerabilities in the development toolchain, while `npm audit --omit=dev --audit-level=high` reports zero production vulnerabilities. This patch does not change those dependencies.

## Open items

- Publish and merge the hi_flow `0.15.6` PR.
- Canonicalize the 13 active Zhenka project-rule principles and update the installed plugin on the Codex VPS.
- Rerun the official Zhenka audit from the real Git worktree and record the gate result.

## Verification

- RED: focused D8 validator run produced exactly 2 expected failures; 15 existing tests passed.
- GREEN: focused D8 validator run passed 17/17 tests.
- `npm test`: 30 test files passed, 214 tests passed.
- `npm run typecheck`: passed.
- `npm run build:check`: passed; shipped `dist/` matches TypeScript sources.
- Plugin package validation: passed.
- ArchAudit skill validation: passed with UTF-8 mode.
- `npm audit --omit=dev --audit-level=high`: 0 production vulnerabilities.
- Independent code review: no Critical runtime findings; required completion artifacts added afterward.
- Architecture audit skipped: the change restores an existing D8 validation invariant and does not alter project module boundaries.
