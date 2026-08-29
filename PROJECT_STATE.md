# Project State

This document is the current operational dashboard for the project. It is not a history log, intake, backlog, behavior registry, architecture contract, or implementation report.

## Current Focus

- **Focus:** ArchAudit cluster mini-graphs preserve one logical edge, full style precedence, global hub classes, and deterministic finding reasons.
- **Phase:** hi_flow `0.15.7` source implementation and exact-SHA Zhenka smoke verified; PR merge and marketplace refresh are next
- **Owner/session:** `codex/arch-audit-cluster-edge-precedence`

## Last Completed

- Bug-fix implementation report: `docs/superpowers/plans/2026-08-29-arch-audit-cluster-mermaid-contract-bug-fix-report.md`

## Ready Next

- Publish and merge the hi_flow `0.15.7` patch release.
- Refresh the official marketplace plugin locally and on Codex VPS after merge.
- Start new Codex sessions before relying on the updated ArchAudit runtime.

## Waiting / Blocked

- Operator merge of the `0.15.7` PR is required before official marketplace installation.

## Latest Verification

- Mermaid + reason regressions -> RED on 3 cluster cases and 2 hedged baseline explanations; final focused gate 32/32 passed on 2026-08-29.
- Full ArchAudit suite -> 30 test files and 221/221 tests passed, including standalone runtime distribution coverage, on 2026-08-29.
- `npm run typecheck`, `npm run build:check`, plugin validation, skill validation, independent code review, and `git diff --check` -> passed on 2026-08-29.
- `npm audit --omit=dev --audit-level=high` -> zero production vulnerabilities on 2026-08-29.
- Exact-SHA Zhenka Phase 1+2 smoke (`bae98d0` runtime, `0a331a05` project) -> D8 semantic validation and isolated seven-group self-review PASS; 36 modules, LOC 137949, 19 findings, counts 0/17/2/0. Mermaid used the checklist static fallback because `mmdc` is unavailable.
- Plugin manifests for Claude Code, Codex, Cursor, and marketplace -> synchronized at `0.15.7`; internal ArchAudit package -> `0.3.7` on 2026-08-29.

## Active Artifacts

- Product backlog: not used for this contract-restoration bug fix
- Intake: `INTAKE.md`
- Behavior Registry: project-wide references under `hi_flow/references/behavior-registry/`
- Current design: Mermaid and prohibited-content contracts in `hi_flow/skills/arch-audit/references/self-review-checklist.md`
- Current plan/report: `docs/superpowers/plans/2026-08-29-arch-audit-cluster-mermaid-contract-bug-fix.md`, `docs/superpowers/plans/2026-08-29-arch-audit-cluster-mermaid-contract-bug-fix-report.md`
- Architecture snapshot: `ARCHITECTURE.md`

## Update Notes

- Keep this file current-state only.
- Move raw untriaged problems and ideas to `INTAKE.md`.
- Move desired future behavior to backlog.
- Move accepted behavior details to Behavior Registry.
- Move architecture defects to `docs/active-issues.md`.
- Move accepted architecture debt to `ARCHITECTURE.md` Known Drift.
