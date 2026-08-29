# Implementation Report: ArchAudit Cluster Mermaid Contract

**Spec:** `docs/superpowers/plans/2026-08-29-arch-audit-cluster-mermaid-contract-bug-fix.md`
**Date:** 2026-08-29
**Status:** completed

## Accepted contract

- `hi_flow/skills/arch-audit/references/self-review-checklist.md`, Groups 3 and 6.
- Cluster mini-graphs emit one ordered logical edge with precedence `cycle > critical > HIGH/MEDIUM boundary > default`.
- Every visible global dependency hub receives the canonical hub class.
- Finding reasons are deterministic and contain no checklist-prohibited hedging.
- Claude Code, Codex, and Cursor consume the same checked-in platform-neutral runtime distribution.

## What was done

- Reworked cluster Mermaid assembly to key edges by ordered module pair instead of rendered syntax.
- Applied full style precedence and canonical `linkStyle` output to every cluster edge.
- Propagated the global hub set into every cluster where a hub module is visible.
- Replaced hedged `no-orphans` and `high-fanout` explanations with graph-derived factual statements.
- Added regression coverage for overlapping cycle/boundary/critical edges, HIGH and MEDIUM boundaries, default edges, global hub propagation, and prohibited hedging.
- Rebuilt the shared runtime and synchronized marketplace, Claude Code, Codex, and Cursor manifests at `0.15.7`; internal ArchAudit package is `0.3.7`.

## Verification

- TDD RED: three Mermaid regressions failed against `0.15.6`; the baseline-wide hedging test failed on both `likely` explanations.
- Focused gate: 3 files, 32/32 tests passed.
- Full ArchAudit suite: 30 files, 221/221 tests passed; `build:check` passed as pretest.
- `npm run typecheck` passed.
- Plugin validation and ArchAudit skill validation passed.
- `npm audit --omit=dev --audit-level=high`: 0 production vulnerabilities.
- Independent code review: PASS after adding full precedence and foreign-cluster hub coverage.
- Full Zhenka Phase 1+2 smoke ran from published hi_flow commit `bae98d0753937f7c75fbc1be4bb95face758f950` against Zhenka commit `0a331a05f0b38c3e9428bc3c3dc8e447ceec5a04`.
- Smoke output: 36 modules, total LOC 137949, 19 findings, 4 clusters, severity counts CRITICAL/HIGH/MEDIUM/LOW = 0/17/2/0, NCCD 27.
- Final isolated seven-group self-review: PASS. `mmdc` was unavailable, so Mermaid syntax/rendering depth used the checklist's static fallback; all edges, indices, styles, classes, and graph membership were checked.

## Deviations from spec

- Strict self-review exposed two inherited LOW violations in baseline explanation text. They were fixed in the same patch because they directly violated the already accepted Group 6 contract; no new behavior was introduced.
- Directly copying the candidate runtime to VPS was rejected by the security policy. The smoke instead fetched the published Git branch and ran from exact commit `bae98d0`, which provides stronger provenance.

## Issues discovered

- `mmdc` / Mermaid CLI is not installed on the VPS. Static Mermaid validation passed; graphical compilation was not available.

## Open items

- Operator merges the hi_flow `0.15.7` PR.
- After merge, update the local and Codex VPS plugin caches from the official marketplace revision. New sessions are required to load the updated skills/runtime.
