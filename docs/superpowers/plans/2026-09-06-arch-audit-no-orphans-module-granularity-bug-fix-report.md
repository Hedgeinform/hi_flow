# Implementation Report: Arch-Audit no-orphans Module Granularity

**Spec:** `docs/superpowers/plans/2026-09-06-arch-audit-no-orphans-module-granularity-bug-fix.md`
**Date:** 2026-09-06
**Status:** completed

## What was done

- Added a real TypeScript fixture where two modules import `office-integration-app/index.ts`, while `office-integration-app/storage-key.ts` remains unused; it reproduces the original false finding with `Ca=2` before the fix.
- Changed the file-to-module aggregation boundary so a dependency-cruiser `no-orphans` file signal is retained only when its containing module has `Ca=0`.
- Added D8 semantic validation that rejects any `baseline:no-orphans` finding for a module with incoming graph dependencies.
- Added unit and integration coverage that preserves a real `Ca=0` orphan while suppressing the false imported-module finding.
- Documented the exact file/module contract in baseline rules, D8 schema guidance, and the self-review checklist.
- Rebuilt the committed standalone runtime and synchronized patch versions: hi_flow `0.15.9`, ArchAudit `0.3.9`.

## Deviations from spec

- None. The D8 validator was added as a contract backstop after the existing D8 and baseline documents confirmed that `no-orphans` is already module-level.

## Issues discovered

- The first isolated review found that the integration fixture proved only false-positive suppression. The fixture was strengthened with a real unimported module and an assertion that its finding remains.
- The initial focused test could not start in the filesystem sandbox because its `pretest` lacked local dependencies; existing matching dependencies from a sibling hi_flow worktree were linked locally without installation. Vitest also required an out-of-sandbox local run because the sandbox failed to resolve `localhost`.

## Open items

- Create and merge the hi_flow `0.15.9` PR; do not install the marketplace artifact until after merge.

## Verification

- RED runtime reproduction: bundled dependency-cruiser emitted `baseline:no-orphans` for `src/office-integration-app/storage-key.ts` while `office-integration-app` had `Ca=2` and two incoming module edges.
- RED D8 contract: the new validator test failed because the current validator accepted a no-orphans finding for a module with incoming dependencies.
- Focused GREEN: parser, D8 validator, and integration tests passed 35/35; strengthened integration coverage separately passed 1/1.
- Final verification: `npm test` passed 227/227 across 31 files; `npm run typecheck`, `npm run build`, and `npm run build:check` passed.
- Initial isolated review findings were addressed; scoped re-review returned no findings.
