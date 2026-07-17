# Implementation Report: ArchAudit Test Harness Hardening

**Spec:** `docs/superpowers/plans/2026-07-17-arch-audit-test-harness-hardening-bug-fix.md`
**Date:** 2026-07-17
**Status:** completed

## What was done

- Replaced cwd-relative fixture resolution with package-root paths derived from `import.meta.url`, including an explicit Vitest root. The complete suite now runs from outside the package.
- Added `withTempDir()` with guaranteed cleanup and moved all five integration tests to isolated output directories. Callback and cleanup failures are both preserved through `AggregateError` when they coincide.
- Added a structural harness test that rejects tracked fixture report paths in integration tests.
- Normalized CRLF and lone CR at the D9 read boundary and declared LF for all ArchAudit Markdown fixtures in `.gitattributes`.
- Registered `ajv-formats` before D8 schema compilation and exposed AJV's `keyword`; invalid `audit_timestamp` values now fail the existing `date-time` contract.
- Closed the verified LOW Active Issue about integration tests mutating tracked fixtures.

## RED / GREEN evidence

- HARNESS-CWD RED: a package-local Vitest run started from an external cwd could not resolve the package tests/fixtures. GREEN: the external-cwd full suite passes 180/180.
- HARNESS-MUTATION RED: four integration tests targeted tracked `tests/fixtures/*/audit-report/` directories. GREEN: all five integrations target `mkdtemp()` directories, and SHA-256 hashes for all 12 tracked report files are identical before and after the external-cwd full suite.
- D9-EOL RED: CRLF and lone-CR variants did not produce the same complete `D9Index` as LF. GREEN: all three variants are deep-equal; all six indexed Markdown fixtures are LF and have `text eol=lf` attributes.
- D8-DATETIME RED: `not-a-date` was accepted and AJV emitted `unknown format "date-time" ignored`. GREEN: the focused validator suite passes 4/4, the invalid timestamp produces `keyword: format`, and the warning is absent.

## Verification

- `cmd /c npm test` from `hi_flow/skills/arch-audit`: 29 files, 180/180 tests passed.
- Absolute package-local Vitest with the same config from `C:\tmp`: 29 files, 180/180 tests passed.
- Tracked report manifest: 12 files checked, 0 SHA-256 changes.
- `cmd /c npm run typecheck`: passed.
- `git diff --check`: passed.
- `git check-attr text eol` and `git ls-files --eol`: all six tracked Markdown fixtures have `text: set`, `eol: lf`, and LF index blobs.
- Each of the four implementation tasks and the complete branch diff received independent review; no Critical or Important findings remain. Two documentation-only Minor findings from the final review were corrected.
- Recursive ArchAudit was intentionally not run because this repair changes test infrastructure and implements an existing D8 schema constraint; it does not change production architecture boundaries.

## Deviations from spec

- `tests/core/audit-sha.test.ts` also moved to package-root path resolution because it had the same cwd dependency as the files enumerated in Task 1.
- `withTempDir()` uses `AggregateError` when callback work and cleanup both fail, following review feedback so neither failure is hidden.

## Issues discovered

- `npm audit --omit=dev` reports two pre-existing production dependency findings: moderate `js-yaml@4.1.1` and high transitive `fast-uri@3.1.0`. Both exact versions were already present at the implementation baseline; adding `ajv-formats@3.0.1` did not introduce them. No automatic audit remediation was applied.

## Open items

- Integrate branch `codex/arch-audit-js-esm` when ready.
- Dependency vulnerability remediation is separate scope and should be handled as an explicit dependency-maintenance change.
