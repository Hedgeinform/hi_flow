# Implementation Report: ArchAudit JavaScript/ESM Module Root Bug Fix

**Spec:** `docs/superpowers/plans/2026-07-17-arch-audit-js-esm-bug-fix.md`
**Date:** 2026-07-17
**Status:** completed

## Accepted contract

- A project with `package.json` but no `tsconfig.json` is a supported JavaScript project.
- `overrides.module_pattern` declares the production module root and drives discovery, scanning, parsing, suppression, and structural checks.
- Supported production extensions are `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, and `.cjs`.
- A missing or empty module root and an empty dependency-cruiser result fail closed.
- ArchAudit runs its bundled dependency-cruiser runtime, not a dependency from the audited project.

## What was done

- Added one shared source-scope implementation for root normalization, glob derivation, exact file-to-module mapping, and production-module discovery.
- Restored package-only JavaScript detection and made dependency-cruiser configuration conditional on the real presence of `tsconfig.json`.
- Routed the configured module root through the report builder, parser, suppression, module discovery, entry-point discovery, structural checks, and barrel detection.
- Added `.js`, `.jsx`, `.mjs`, and `.cjs` coverage to source scanning, test-file rules, entry points, and barrel classification.
- Added fail-closed guards for unsafe roots, missing/empty roots, and dependency-cruiser output with no production modules.
- Added a package-only ESM fixture and a real bundled-runtime integration test proving a non-empty `a -> b` `.mjs` dependency graph.
- Updated `SKILL.md` so the operator contract matches the runtime.

## Root cause and RED evidence

- The adapter required both `package.json` and `tsconfig.json`, while the accepted contract advertised package-only JavaScript support.
- The generated dependency-cruiser config always emitted `tsConfig` and `tsPreCompilationDeps`; the live CWS reproduction therefore failed with `TS5083: Cannot read file 'tsconfig.json'`.
- The report builder hard-coded `src/**/*.{ts,tsx}` and did not pass `module_pattern` into graph parsing. Module discovery also hard-coded `src` and its failure was converted to an empty module list.
- Parser, suppression, and barrel logic assumed `src/<module>` and did not consistently recognize `.mjs` / `.cjs`.
- Initial focused RED: 11 accepted-contract failures and 51 passing tests. The real bundled-runtime integration reproduced `TS5083` and the hard-coded TypeScript glob.
- Review follow-up RED: `source-scope.test.ts` failed 2 extglob cases (`@(pipeline-runtime)`, `!(tests)`) before root validation was tightened.

## GREEN and verification evidence

- Focused regression suite: 8 files, 75 tests passed.
- Full ArchAudit package suite: 27 files, 171 tests passed.
- TypeScript: `tsc --noEmit` passed from `hi_flow/skills/arch-audit`.
- Patch hygiene: `git diff --check` passed.
- Independent review: no Critical or Important findings. Its one Minor extglob finding was fixed with RED -> GREEN coverage before completion.
- Final CWS smoke used source hash `1de1e20e62e40fc6c6cdc96d15ce8ef4d9a2e77d`: 43 `.mjs` files, 0 hash mismatches, 7 modules, 7 graph nodes, 10 edges, no parsing errors, and D8 validation `{ "valid": true, "errors": [] }`.
- Final smoke output: `C:\tmp\cws-arch-audit-smoke-20260717-final-output` contains `audit-report.json`, `clusters-input.json`, and `audit-report.md`.
- CWS remained unchanged by the smoke. Its two pre-existing documentation changes remained the only dirty paths.

## Deviations from spec

- CWS had no `.audit-rules.yaml`, and dependency-cruiser did not follow a directory junction used by the first read-only harness. The final smoke therefore ran on a physical temporary copy containing all 43 source files with hash equality checked against CWS, plus a temporary `module_pattern: pipeline-runtime` rule. No CWS file or audit output was changed.
- ArchAudit was not recursively run against its own implementation. The focused/full suites and the real CWS audit are the scoped architecture-contract verification required by the plan.

## Issues discovered

- ArchAudit tests are working-directory-sensitive and integration tests rewrite tracked fixture reports. Generated reports were restored after verification. This is pre-existing test-harness debt and was not widened into this regression fix.
- Windows checkout line-ending conversion can make the D9 fixtures fail byte-sensitive tests in a fresh worktree. The full suite was run against content matching the indexed LF blobs; no fixture line-ending change is included.
- AJV still logs the pre-existing warning that the `date-time` format is unknown; D8 validation itself passes.

## Open items

- None for this regression.
