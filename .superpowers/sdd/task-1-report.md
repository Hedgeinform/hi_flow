# Implementation Report: ArchAudit fixture resolution independent of cwd

**Spec:** `.superpowers/sdd/task-1-brief.md`
**Date:** 2026-07-17
**Status:** completed

## What was done
- Added `hi_flow/skills/arch-audit/tests/test-paths.ts` with `PACKAGE_ROOT`, `packagePath`, and `fixturePath`, all derived from `import.meta.url`.
- Anchored `vitest.config.ts` at its package directory and replaced all Task 1 fixture path literals in the specified core, helper, and integration tests.
- Replaced the remaining external-cwd test dependency in `tests/core/audit-sha.test.ts` with `PACKAGE_ROOT`; this was an observed HARNESS-CWD RED and was explicitly added to Task 1 by the controller.
- Kept production code independent of the test helper and made no global cwd mutation.

## Files changed
- `hi_flow/skills/arch-audit/vitest.config.ts`
- `hi_flow/skills/arch-audit/tests/test-paths.ts`
- `hi_flow/skills/arch-audit/tests/core/{audit-sha,d9-loader,project-rules,report-builder}.test.ts`
- `hi_flow/skills/arch-audit/tests/helpers/{merge-rules-patch,parse-depcruise-output,regenerate-principles-index,validate-rules-patch}.test.ts`
- `hi_flow/skills/arch-audit/tests/integration/{barrel-project,cycle-project,god-object-project,js-esm-project,layered-project}.test.ts`

## RED
Command:
```powershell
$pkg = (Resolve-Path 'C:\tmp\hi-flow-arch-audit-js-esm\hi_flow\skills\arch-audit').Path
Set-Location $env:TEMP
& "$pkg\node_modules\.bin\vitest.CMD" run --config "$pkg\vitest.config.ts" tests/core/d9-loader.test.ts
```

Before the change, Vitest started at `C:/Users/Vegr/AppData/Local/Temp`, retained `include: tests/**/*.test.ts`, and returned `No test files found, exiting with code 1`. This demonstrated config/test discovery tied to the external cwd.

The first full external run also showed `audit-sha.test.ts` passing the `%TEMP%` cwd to `resolveAuditSha`, returning `uuid:...` instead of a Git SHA. The controller explicitly included this remaining HARNESS-CWD dependency in Task 1.

## GREEN
- External focused audit-sha command (same package/config invocation, target `tests/core/audit-sha.test.ts`): **1 file, 3 tests passed**.
- Full external command (same invocation without target): **26 files, 169 tests passed**. All fixture-bearing core/helper/integration tests passed from `%TEMP%`; no fixture `ENOENT` errors occurred.
- `git diff --check`: passed.

The full command exits nonzero only for the two known D9 CRLF assertions in `tests/core/d9-loader.test.ts` (169/171 tests passed). The controller classified these as the expected cross-task RED for Task 3; D9 normalization was deliberately not changed.

## Self-review
- `PACKAGE_ROOT` and paths use `fileURLToPath(new URL(..., import.meta.url))`, not `process.cwd()`.
- `rg` confirmed no production import of `tests/test-paths.ts`.
- Integration runtime lookup now uses `PACKAGE_ROOT`.
- Test-generated tracked fixture reports were restored to HEAD after each full run; they are not part of this change.

## Concerns
- The suite retains expected Task 3 D9 failures, plus existing AJV `unknown format "date-time"` warnings; neither was modified in Task 1.
