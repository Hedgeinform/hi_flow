# ArchAudit Test Harness Hardening Bug-Fix Plan

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes, `superpowers:requesting-code-review` before completion, and `superpowers:verification-before-completion` before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue / Active Issue:** existing LOW issue `Integration-тесты arch-audit мутируют трекаемые фикстуры` in `docs/active-issues.md`; the other three defects were verified during the 2026-07-17 JS/ESM regression run
**Accepted contract:** approved design `docs/superpowers/specs/2026-07-17-arch-audit-test-harness-hardening-design.md`, existing D8 schema `audit_timestamp.format: date-time`, and ordinary test isolation/platform-independence
**Current failure:** tests resolve fixtures from `cwd`, four integration tests overwrite tracked reports, CRLF changes D9 parsing, and AJV logs that `date-time` is ignored
**Expected accepted behavior:** ArchAudit tests run from any directory without mutating tracked fixtures, D9 parsing is newline-independent, and D8 timestamps receive real RFC 3339 validation
**Bug-fix classification:** mixed harness defect and D8 contract implementation deviation
**Not a feature because:** no product or report-shape expectation changes; the work restores already declared validation and deterministic test behavior
**Tech Stack:** Node.js ESM, TypeScript, Vitest 1.6, AJV 8, `ajv-formats`, Windows/PowerShell verification

## Global Constraints

- Continue on branch `codex/arch-audit-js-esm` from exact base `80e0b9f6e62cb79041d984492329033df69c6972`.
- Do not use `process.chdir()` or another global working-directory mutation.
- Production code must never import the test helper.
- Tests may delete only a directory returned by their own `mkdtemp()` call.
- Do not change D8 schema version or report shape.
- Preserve pre-existing dirty state; tracked fixture verification compares before/after hashes instead of requiring a globally clean tree.
- Do not add lint, CI, snapshot-update tooling, or address other Active Issues.
- `npm install ajv-formats` requires the operator approval gate before execution.

## Contract and Harness Impact

**Behavior Registry:** no mapped product behavior; focused harness/unit/integration proofs are sufficient
**Runner command:** package-local `vitest.CMD run`, both from package root and an external temp directory with an absolute config path
**Architecture contract:** D8 schema already declares `audit_timestamp` as `date-time`; no architecture boundary changes
**Active Issue handling:** delete only the existing LOW mutation issue after all verification passes; if partial/blocked, retain it and add a narrow issue for any remaining defect

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| HARNESS-CWD | approved design § Независимые пути | external-cwd run passes | fixture reads use `cwd` | external Vitest command | add package-root helper and absolute config root |
| HARNESS-MUTATION | `docs/active-issues.md` LOW | suite leaves tracked reports byte-identical | four tests write fixture `audit-report/` | structural RED + SHA-256 before/after gate | temporary output helper and integration refactor |
| D9-EOL | approved design § Переводы строк | LF/CRLF/CR yield same `D9Index` | regexes assume LF separators | `tests/core/d9-loader.test.ts` | normalize at read boundary + Git attributes |
| D8-DATETIME | `references/d8-schema.json` | invalid timestamp rejected by `format` | AJV ignores unknown format | `tests/core/d8-schema-validator.test.ts` | register `ajv-formats` and expose error keyword |

## File Structure

- Create: `hi_flow/skills/arch-audit/tests/test-paths.ts` — package-root/fixture paths and safe temporary-directory lifecycle
- Create: `hi_flow/skills/arch-audit/tests/test-paths.test.ts` — temporary cleanup behavior
- Create: `hi_flow/skills/arch-audit/tests/test-harness.test.ts` — structural proof that tracked fixture output paths are not used
- Modify: `hi_flow/skills/arch-audit/vitest.config.ts` — absolute root derived from config URL
- Modify: fixture-reading unit/helper tests — replace cwd-relative paths with `fixturePath()`
- Modify: five `tests/integration/*.test.ts` files — use package paths and `withTempDir()`
- Modify: `hi_flow/skills/arch-audit/core/d9-loader.ts` and its test — newline normalization
- Modify: `.gitattributes` — LF contract for ArchAudit Markdown fixtures
- Modify: `hi_flow/skills/arch-audit/core/d8-schema-validator.ts` and its test — registered formats and error keyword
- Modify: `hi_flow/skills/arch-audit/package.json` and `package-lock.json` — `ajv-formats` runtime dependency
- Modify: `docs/active-issues.md`, `PROJECT_STATE.md` — close only verified debt and update current dashboard
- Create: `docs/superpowers/plans/2026-07-17-arch-audit-test-harness-hardening-bug-fix-report.md` — implementation evidence

---

### Task 1: Make fixture resolution independent of cwd

**Covers:** HARNESS-CWD

**Files:**
- Create: `hi_flow/skills/arch-audit/tests/test-paths.ts`
- Modify: `hi_flow/skills/arch-audit/vitest.config.ts`
- Modify: `tests/core/d9-loader.test.ts`, `tests/core/project-rules.test.ts`, `tests/core/report-builder.test.ts`
- Modify: `tests/helpers/merge-rules-patch.test.ts`, `tests/helpers/parse-depcruise-output.test.ts`, `tests/helpers/regenerate-principles-index.test.ts`, `tests/helpers/validate-rules-patch.test.ts`
- Modify: all five files under `tests/integration/`

**Interfaces:**
- Produces: `PACKAGE_ROOT: string`, `packagePath(...segments: string[]): string`, `fixturePath(...segments: string[]): string`
- Consumes: `import.meta.url`, `fileURLToPath`, `join`

- [ ] **Step 1: Run external-cwd RED**

From a system temp directory run package-local Vitest with the absolute existing config:

```powershell
$pkg = (Resolve-Path 'C:\tmp\hi-flow-arch-audit-js-esm\hi_flow\skills\arch-audit').Path
Set-Location $env:TEMP
& "$pkg\node_modules\.bin\vitest.CMD" run --config "$pkg\vitest.config.ts" tests/core/d9-loader.test.ts
```

Expected: FAIL because the config/test resolves paths from the external cwd.

- [ ] **Step 2: Add the minimal package path helper**

```ts
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

export const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))
export const packagePath = (...segments: string[]): string => join(PACKAGE_ROOT, ...segments)
export const fixturePath = (...segments: string[]): string => packagePath('tests', 'fixtures', ...segments)
```

- [ ] **Step 3: Anchor Vitest config and replace relative fixture paths**

Set `root: fileURLToPath(new URL('.', import.meta.url))` in `vitest.config.ts`. Replace every literal `tests/fixtures/...`, `resolve('tests/fixtures/...')`, and `join(process.cwd(), 'tests/fixtures/...')` in the listed tests with `fixturePath(...)`. Use `PACKAGE_ROOT` for the bundled runtime root.

- [ ] **Step 4: Run external-cwd GREEN**

Run the Step 1 command, then run the complete external suite without the final test path argument.

Expected: focused and complete runs PASS; no fixture ENOENT errors.

---

### Task 2: Stop integration tests from mutating tracked reports

**Covers:** HARNESS-MUTATION

**Files:**
- Create: `tests/test-paths.test.ts`, `tests/test-harness.test.ts`
- Modify: `tests/test-paths.ts`
- Modify: `tests/integration/barrel-project.test.ts`, `cycle-project.test.ts`, `god-object-project.test.ts`, `layered-project.test.ts`, `js-esm-project.test.ts`

**Interfaces:**
- Produces: `withTempDir<T>(prefix: string, fn: (directory: string) => Promise<T>): Promise<T>`
- Cleanup contract: exact `mkdtemp()` result removed in `finally`; callback and cleanup errors remain visible

- [ ] **Step 1: Write structural and cleanup RED tests**

`test-harness.test.ts` reads the four historically mutating integration sources and asserts they do not contain `join(projectRoot, 'audit-report')` and do contain `withTempDir`. `test-paths.test.ts` imports the helper namespace dynamically and expects a callback-thrown sentinel to be rethrown while the captured directory no longer exists.

- [ ] **Step 2: Run RED**

```bat
node_modules\.bin\vitest.CMD run tests\test-harness.test.ts tests\test-paths.test.ts
```

Expected: FAIL because four sources still contain tracked output paths and `withTempDir` is absent.

- [ ] **Step 3: Implement the minimal lifecycle helper**

```ts
export async function withTempDir<T>(prefix: string, fn: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  try {
    return await fn(directory)
  } finally {
    await rm(directory, { recursive: true })
  }
}
```

- [ ] **Step 4: Refactor all five integration tests**

Wrap each test body in `withTempDir('arch-audit-<fixture>-', async outDir => { ... })`. The four old tests pass `outDir` instead of `join(projectRoot, 'audit-report')`; JS/ESM keeps its temp behavior but gains guaranteed cleanup.

- [ ] **Step 5: Run GREEN**

Run the Task 2 focused command and all five integration tests. Expected: PASS.

- [ ] **Step 6: Record and compare tracked-report hashes**

Before and after the full suite, enumerate tracked `tests/fixtures/**/audit-report/**`, record relative path + SHA-256, sort, and compare exact arrays. Expected: no added, removed, or changed path/hash.

---

### Task 3: Normalize D9 newlines and lock fixture EOL

**Covers:** D9-EOL

**Files:**
- Modify: `core/d9-loader.ts`
- Modify: `tests/core/d9-loader.test.ts`
- Create: `.gitattributes`

**Interfaces:**
- Consumes: UTF-8 Markdown with LF, CRLF, or lone CR
- Produces: identical full `D9Index`

- [ ] **Step 1: Write CRLF and lone-CR RED tests**

Read `fixturePath('d9-sample.md')`, write LF/CRLF/CR variants into a `withTempDir()`, load all three, and assert deep equality of the returned objects.

- [ ] **Step 2: Run RED**

```bat
node_modules\.bin\vitest.CMD run tests\core\d9-loader.test.ts
```

Expected: FAIL because CRLF/CR descriptions or alternatives differ from LF.

- [ ] **Step 3: Normalize at the read boundary**

```ts
const content = (await readFile(mdPath, 'utf-8')).replace(/\r\n?/g, '\n')
```

- [ ] **Step 4: Run GREEN**

Run the Task 3 focused command. Expected: PASS.

- [ ] **Step 5: Add and verify Git attributes**

Add:

```gitattributes
hi_flow/skills/arch-audit/tests/fixtures/**/*.md text eol=lf
```

Run `git check-attr text eol --` for every tracked Markdown fixture and a byte scan of indexed fixture blobs. Expected: `text: set`, `eol: lf`, and no CR bytes.

---

### Task 4: Enforce D8 date-time validation

**Covers:** D8-DATETIME

**Files:**
- Modify: `core/d8-schema-validator.ts`
- Modify: `tests/core/d8-schema-validator.test.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: validation errors `{ path: string; message: string; keyword: string }`
- Preserves: valid RFC 3339 timestamps and D8 schema version 1.1

- [ ] **Step 1: Write format-specific RED**

Add a report with `audit_timestamp: 'not-a-date'`; assert invalid, `/metadata/audit_timestamp`, `keyword === 'format'`, and a `date-time` message. Keep the valid ISO test.

- [ ] **Step 2: Run RED**

```bat
node_modules\.bin\vitest.CMD run tests\core\d8-schema-validator.test.ts
```

Expected: FAIL because the invalid string currently passes and AJV logs the unknown-format warning.

- [ ] **Step 3: Install and register the standard format package**

After approval, run from the package root:

```bat
npm install ajv-formats
```

Import `addFormats` from `ajv-formats`, call `addFormats(ajv)` before `ajv.compile(schema)`, and include `e.keyword` in `formatErrors()`.

- [ ] **Step 4: Run GREEN**

Run the Task 4 focused command. Expected: PASS with no unknown-format warning.

---

### Task 5: Full verification and living artifacts

**Covers:** all contracts and issue lifecycle

- [ ] **Step 1: Run deterministic gates**

Run focused tests, all 27+ ArchAudit test files from package root, the same full suite from `$env:TEMP`, `tsc --noEmit`, `git diff --check`, Git attribute/byte gates, and before/after tracked-report hash comparison. Capture exact counts and warnings.

- [ ] **Step 2: Complete isolated review**

Review the complete working diff against the approved design and this plan. Fix every Critical/Important finding and rerun affected gates.

- [ ] **Step 3: Close the existing Active Issue only after proof**

Delete the LOW entry `Integration-тесты arch-audit мутируют трекаемые фикстуры` from `docs/active-issues.md`. Do not change unrelated issues.

- [ ] **Step 4: Write implementation report and update state**

Create `docs/superpowers/plans/2026-07-17-arch-audit-test-harness-hardening-bug-fix-report.md` with RED/GREEN evidence, exact commands, deviations, review, and open items. Update `PROJECT_STATE.md` to point at this report and the latest verification.

- [ ] **Step 5: Commit intended files**

Stage only this bug-fix scope and commit with `Fix ArchAudit test harness isolation`. Preserve the worktree and do not push or merge.

## Completion Protocol

- [ ] Implementation report created beside this plan.
- [ ] All four RED proofs observed before their GREEN implementation.
- [ ] Package-root and external-cwd full suites pass without AJV warnings.
- [ ] Tracked report hashes are identical before/after.
- [ ] Git attributes apply LF and indexed Markdown fixtures contain no CR bytes.
- [ ] TypeScript and diff hygiene pass.
- [ ] Independent review has no remaining Critical/Important findings.
- [ ] Existing LOW Active Issue is removed only on completed status; otherwise retained/narrowed.
- [ ] `PROJECT_STATE.md` reflects final status, next action, verification, and blockers.
- [ ] Recursive ArchAudit is explicitly skipped because no production architecture boundary changes; tests and D8 schema validation are the relevant gates.
