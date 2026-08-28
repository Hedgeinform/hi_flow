# Implementation Report: Arch-Audit D8 Contract Repair

**Spec:** `docs/superpowers/plans/2026-08-28-arch-audit-d8-contract-repair-bug-fix.md`
**Date:** 2026-08-29
**Status:** completed

## What was done

- Replaced dependency-cruiser's nonexistent LOC input with physical LOC aggregated from audited source files, including guarded project-root resolution and actionable read failures.
- Normalized dependency-cruiser 17 cycle data to ordered module members, removed intra-module cycles, and made two-module versus 3+ cycle ownership deterministic and semantically validated.
- Added D8 semantic validation for module/metric equality, Ca/Ce/I, severity totals, graph-valid finding edges, external SDK boundaries, canonical D9 principles, known rule IDs, and cycle-owner uniqueness.
- Loaded the shipped canonical D9 dialect and normalized legacy D11 project-rule names before collision checks and persistence.
- Made Phase 1 write an explicit incomplete Markdown marker and Phase 2 replace it atomically only after the JSON, embedded rule registry, and cluster prose pass validation.
- Completed the Markdown report sections and Mermaid cycle visualization required by the D8 checklist.
- Updated the D8 producer to schema 1.2, rebuilt the standalone runtime, and synchronized plugin version 0.15.5 across the marketplace, Claude, Codex, and Cursor manifests.

## Deviations from spec

- The initial repair concept could not remain on D8 1.1: its closed metadata object rejected the new Phase 1 provenance needed for equivalent Phase 2 rule validation. The plan was amended to emit D8 1.2 while retaining explicit structural support for legacy 1.1 reports.
- Two-module cycle ownership was made more precise after review: an applicable `architectural-layer-cycle` or `frontend-layer-cycle` owns the cycle; otherwise `inappropriate-intimacy` is the default. Exactly one owner is retained.

## Issues discovered

- The previous D8 JSON Schema checked shape but not the cross-field invariants required by the human checklist, allowing reports that were structurally parseable but operationally invalid.
- Full `npm audit` still reports vulnerabilities in the existing Vitest/Vite development toolchain; its automatic resolution requires a breaking Vitest upgrade. Production dependencies are clean under `npm audit --omit=dev --audit-level=high`.

## Open items

- Merge and publish plugin 0.15.5, update the plugin on the Codex VPS, and rerun the official Zhenka audit at the target SHA as external acceptance evidence. No source implementation items remain open in this change.

## Verification

- `npm test`: 30 test files passed, 212 tests passed.
- `npm run typecheck`: passed.
- `npm run build:check`: passed.
- Plugin package validator: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- Independent final review: no blockers.
