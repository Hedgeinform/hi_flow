# Implementation Report: ArchAudit Project Rule Identifier

**Spec:** `docs/superpowers/plans/2026-08-26-arch-audit-project-rule-id-bug-fix.md`
**Date:** 2026-08-26
**Status:** completed

## Accepted contract

Project rule findings use the canonical `project:<rule-name>` identifier defined by the D8 schema. A rule loaded from `.audit-rules.yaml`, passed to dependency-cruiser, and returned as a violation must resolve to the same rule metadata during enrichment. Genuinely unknown identifiers must still fail closed.

## Reproduction proof

- A synthetic `.audit-rules.yaml` declared `no-tools-to-dispatcher`; the existing loader normalized it to `project:no-tools-to-dispatcher`.
- The focused report-builder regression supplied the same namespaced identifier as dependency-cruiser output.
- Before the fix, the focused run failed exactly with `enrich-findings: unknown rule_id 'project:no-tools-to-dispatcher'` because enrichment indexed only the stripped bare name.

## What was done

- Changed project-rule enrichment lookup to use the canonical stored identifier directly.
- Preserved the existing strict error for identifiers absent from both baseline and project rules.
- Corrected the `RawFinding.rule_id` type comment to reflect that project rules are namespaced while baseline findings may be bare before enrichment.
- Added a report-builder regression that exercises rule loading, parsing, enrichment, D8 output, and project metadata.
- Regenerated the shipped runtime.
- Synchronized hi_flow manifests at `0.15.4` and the internal ArchAudit package and lockfile at `0.3.4`.

## Verification

- Focused RED before the fix: `1` expected failure with the production error for `project:no-tools-to-dispatcher`; the other `5` report-builder tests passed.
- Focused GREEN: `6/6` report-builder tests passed.
- Full ArchAudit suite: `30` test files, `184/184` tests passed, including runtime freshness and standalone installed-plugin distribution coverage.
- `npm run typecheck`: passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Codex plugin validation: passed.
- ArchAudit skill structural validation: passed.
- `git diff --check`: passed.
- Independent review: Critical 0, implementation Important 0, Minor 0. Its two artifact findings were fixed before commit.
- Installed-plugin acceptance on Codex VPS: hi_flow `0.15.4` / ArchAudit `0.3.4`; the full Zhenka audit completed with exit code `0`, produced a jq-valid `audit-report.json`, and emitted 36 modules, 185 edges, and 21 findings without the former `project:no-tools-to-dispatcher` error.

## Deviations from spec

- None in production scope.
- Architecture audit was explicitly skipped because the repair aligns identifiers inside an existing report-building pipeline and changes no architecture boundary.
- Behavior Registry and Active Issues were left unchanged because the accepted contract is restored with focused executable coverage and no remaining local defect.

## Issues discovered

- The previous large-output fix exposed this downstream bug by allowing the Zhenka audit to reach enrichment.
- The same mismatch had previously appeared with `project:no-trial-components-to-pages`, confirming that the defect was systemic for triggered project rules rather than specific to one rule definition.

## Open items

- None.
