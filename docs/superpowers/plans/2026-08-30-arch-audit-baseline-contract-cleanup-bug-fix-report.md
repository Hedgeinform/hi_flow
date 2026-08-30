# Implementation Report: ArchAudit Baseline Contract Cleanup

**Spec:** `docs/superpowers/plans/2026-08-30-arch-audit-baseline-contract-cleanup-bug-fix.md`
**Date:** 2026-08-31
**Status:** completed

## What was done

- Removed the unproduced `baseline:cross-module-import-info` rule from the live registry, suppression path, current skill contract, references, checklist, tests, example, and bundled runtime.
- Kept ordinary module dependencies as graph evidence in `metrics.dep_graph`, Mermaid diagrams, and coupling metrics without manufacturing LOW findings.
- Synchronized the current NCCD default reference with the runtime/schema value `1.0`.
- Restored `npx depcruise --validate` to the generated Markdown Scope reminder.
- Added report-level regression coverage for graph-only ordinary edges, the public rule registry, and the Scope reminder.
- Kept the shared Claude Code, Codex, and Cursor release at plugin `0.15.7` and internal ArchAudit package `0.3.7`.

## Verification

- TDD RED reproduced both public contract failures before the implementation change.
- Focused gate: 4 files, 35/35 tests passed.
- Full ArchAudit suite: 30 files, 218/218 tests passed.
- `npm run typecheck`, `npm run build:check`, plugin validation, skill validation, `npm audit --omit=dev`, and `git diff --check` passed.
- Independent code review passed without Critical, Important, or Minor findings.
- Full Phase 1+2 smoke ran from published candidate commit `421edf544c1502484201e7a4b728711ff755c501` against a pinned production-scale TypeScript project snapshot; D8 semantic validation passed.
- Isolated seven-group report self-review passed after a full recomputation of graph metrics, source LOC, finding coverage, prohibited content, and static Mermaid consistency.

## Deviations from spec

- The first isolated report review returned `partial` because it had not completed every metric and reverse-coverage recomputation. A bounded second pass closed only those missing checks and produced a full PASS.
- The public PR description contains only sanitized verification results; project-internal smoke metrics were intentionally not published.

## Issues discovered

- Mermaid CLI (`mmdc`) is unavailable in the VPS smoke environment. The checklist's complete static fallback passed; graphical compilation was not available.

## Open items

- Operator merges hi_flow PR #25 for `0.15.7`.
- After merge, refresh the official plugin cache locally and on Codex VPS, then start new sessions before relying on the updated runtime.
