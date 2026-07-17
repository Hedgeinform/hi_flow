# ArchAudit JavaScript/ESM Module Root Bug-Fix Plan

> **For agentic workers:** REQUIRED EXECUTION SKILL: use `superpowers:executing-plans` to implement this plan task-by-task. REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes, `superpowers:requesting-code-review` before completion, and `superpowers:verification-before-completion` before claiming completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue / Active Issue:** not pre-existing; if execution ends `partial` or `blocked`, add it to `docs/active-issues.md` before close-out
**Accepted contract:** `hi_flow/skills/arch-audit/SKILL.md` section “Stack detection” and `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-impl-spec.md` section “Module pattern fallback policy”
**Current failure:** a package-only JavaScript/ESM project fails with `TS5083: Cannot read file 'tsconfig.json'`; the runtime also hard-codes `src/**/*.{ts,tsx}`, parses paths as `src/<module>/...`, and swallows a missing module root into an empty graph
**Expected accepted behavior:** package-only JavaScript/ESM projects are audited through the bundled dependency-cruiser runtime using the configured module root and all supported JS/TS extensions, while missing or empty roots fail closed
**Bug-fix classification:** mixed implementation deviation and architecture-contract violation
**Not a feature because:** JavaScript detection and configurable `overrides.module_pattern` are already explicitly promised by the accepted ArchAudit contract
**Tech Stack:** Node.js ESM, TypeScript, Vitest, dependency-cruiser 17.x, YAML project rules

## Global Constraints

- Preserve the existing TypeScript path and its `tsConfig` / `tsPreCompilationDeps` dependency-cruiser options when `tsconfig.json` exists.
- Do not introduce a separate `source_glob`; derive the scan glob from `overrides.module_pattern` and the supported extension set.
- Keep dependency-cruiser execution on ArchAudit's bundled runtime; never resolve the audited project's local dependency-cruiser.
- Treat `module_pattern` as a module-root declaration. Accept legacy trailing `/*` / `/*/` notation by normalizing it to the root, but reject absolute paths, parent traversal, and other glob metacharacters.
- Supported production extensions are `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, and `.cjs`.
- Do not modify the CWS target project or write audit output inside it.
- Do not redesign the adapter family or address unrelated ArchAudit active issues.

## Contract and Harness Impact

**Behavior Registry:** project-wide references exist, but this runtime regression has no mapped scenario; use focused unit/integration tests rather than creating broad behavior rails
**Runner command:** `node_modules\\.bin\\vitest.CMD run <focused tests>` and full `node_modules\\.bin\\vitest.CMD run`
**Architecture contract:** `SKILL.md` Stack detection plus module-pattern fail-closed contract
**Active Issue handling:** none on successful completion; if partial/blocked, add a HIGH entry to `docs/active-issues.md` with the exact remaining breakage

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| JS stack detection | `SKILL.md` “Stack detection” | `package.json` without `tsconfig.json` is accepted | adapter returns false and depcruise receives TS-only config | `tests/adapters/typescript-depcruise.test.ts` | add RED detection case, then restore contract |
| Configurable module root | arch-audit implementation spec “Module pattern fallback policy” | configured root drives discovery and graph mapping | discovery and parser assume `src` | `tests/core/source-scope.test.ts`, `tests/helpers/parse-depcruise-output.test.ts` | create one normalized source-scope SSoT and use it throughout |
| JS depcruise configuration | `SKILL.md` package-only JavaScript branch | JS run has no TS-only options | generated config always names `tsconfig.json` | `tests/helpers/generate-depcruise-config.test.ts` | conditionally emit TS options only when the file exists |
| Non-empty D8 graph | D8 audit contract | real production modules and edges appear | wrong glob/root can produce failure or empty result | `tests/integration/js-esm-project.test.ts` | add real bundled-runtime fixture and fail-closed guards |
| `.mjs` barrel support | existing barrel-discipline contract plus advertised resolver extensions | imported `index.mjs` can be classified as a barrel | parser and detector stop at js/jsx | `tests/helpers/detect-barrels.test.ts` and JS integration fixture | extend existing extension lists without changing barrel semantics |

## File Structure

- Create: `hi_flow/skills/arch-audit/core/source-scope.ts` - normalize and validate the configured module root, derive the supported scan glob, map files to modules, and discover non-empty production modules
- Create: `hi_flow/skills/arch-audit/tests/core/source-scope.test.ts` - focused root normalization, scan-glob, nested-root, and fail-closed tests
- Create: `hi_flow/skills/arch-audit/tests/fixtures/js-esm-project/package.json` - package-only ESM fixture
- Create: `hi_flow/skills/arch-audit/tests/fixtures/js-esm-project/.audit-rules.yaml` - `pipeline-runtime` root declaration
- Create: `hi_flow/skills/arch-audit/tests/fixtures/js-esm-project/pipeline-runtime/a/index.mjs` - imports module `b`
- Create: `hi_flow/skills/arch-audit/tests/fixtures/js-esm-project/pipeline-runtime/b/index.mjs` - `.mjs` barrel
- Create: `hi_flow/skills/arch-audit/tests/fixtures/js-esm-project/pipeline-runtime/b/value.mjs` - barrel target
- Create: `hi_flow/skills/arch-audit/tests/integration/js-esm-project.test.ts` - bundled-runtime D8 graph regression proof
- Modify: `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts` - accept package-only JS and consume the normalized module root for modules and entry points
- Modify: `hi_flow/skills/arch-audit/core/report-builder.ts` - resolve scope once, fail closed before and after depcruise, pass the scope through glob/parser/suppression/structural checks
- Modify: `hi_flow/skills/arch-audit/core/suppression.ts` - reuse file-to-module mapping for the configured root
- Modify: `hi_flow/skills/arch-audit/helpers/generate-depcruise-config.ts` - conditionally include TS-only options
- Modify: `hi_flow/skills/arch-audit/helpers/parse-depcruise-output.ts` - use exact root-prefix mapping and recognize `.mjs` / `.cjs` barrels
- Modify: `hi_flow/skills/arch-audit/helpers/detect-barrels.ts` - inspect modules under the configured root and recognize `.mjs` / `.cjs` index files
- Modify: `hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts` - JS detection and configured-root coverage
- Modify: `hi_flow/skills/arch-audit/tests/core/report-builder.test.ts` - scan-glob/parser propagation and empty-result fail-closed coverage
- Modify: `hi_flow/skills/arch-audit/tests/core/suppression.test.ts` - configured-root parsing-error suppression coverage
- Modify: `hi_flow/skills/arch-audit/tests/helpers/generate-depcruise-config.test.ts` - JS/TS option split
- Modify: `hi_flow/skills/arch-audit/tests/helpers/parse-depcruise-output.test.ts` - configured-root graph and `.mjs` barrel coverage
- Modify: `hi_flow/skills/arch-audit/tests/helpers/detect-barrels.test.ts` - `.mjs` barrel classification under a configured root
- Modify: `hi_flow/skills/arch-audit/SKILL.md` - align runtime wording with the implemented shared adapter and module-root semantics
- Create: `docs/superpowers/plans/2026-07-17-arch-audit-js-esm-bug-fix-report.md` - completion evidence
- Create/Update: `PROJECT_STATE.md` - current phase, verification, blockers, and next action only

---

### Task 1: Reproduce the accepted-contract failure in executable tests

**Covers:** JS stack detection, configurable module root, JS depcruise configuration, non-empty D8 graph, `.mjs` barrel support

**Files:**
- Create: `hi_flow/skills/arch-audit/tests/core/source-scope.test.ts`
- Create: `hi_flow/skills/arch-audit/tests/fixtures/js-esm-project/**`
- Create: `hi_flow/skills/arch-audit/tests/integration/js-esm-project.test.ts`
- Modify: the five focused existing test files named in File Structure

**Interfaces:**
- Consumes: current adapter, report builder, config generator, parser, suppression, and barrel detector APIs
- Produces: failing proofs for every required behavior before production changes

- [ ] **Step 1: Add the package-only ESM fixture**

Use `{"type":"module"}` in `package.json`, `overrides.module_pattern: pipeline-runtime` in `.audit-rules.yaml`, an import from `a/index.mjs` to `b/index.mjs`, and a pure re-export from `b/index.mjs` to `b/value.mjs`. Do not add `tsconfig.json`.

- [ ] **Step 2: Add focused unit/component tests**

Assert exact behavior:

```ts
expect(await adapter.detect(jsProject)).toBe(true)
expect(resolveSourceScope(projectRoot, 'pipeline-runtime').scanGlob)
  .toBe('pipeline-runtime/**/*.{ts,tsx,js,jsx,mjs,cjs}')
expect(parseDepcruiseOutput(raw, 'pipeline-runtime').dep_graph)
  .toEqual({ a: ['b'], b: [] })
expect(jsConfig.options).not.toHaveProperty('tsConfig')
expect(jsConfig.options).not.toHaveProperty('tsPreCompilationDeps')
expect(tsConfig.options.tsConfig).toEqual({ fileName: 'tsconfig.json' })
expect(tsConfig.options.tsPreCompilationDeps).toBe(true)
```

Also assert that missing roots, roots without supported production files, and parsed output with zero production modules reject with actionable errors.

- [ ] **Step 3: Add the bundled-runtime integration test**

Run the real `buildReportData()`/bundled dependency-cruiser path on `tests/fixtures/js-esm-project`. Assert `per_module` and `dep_graph` are non-empty, `a -> b` exists, no parsing errors exist, and all three output artifacts can be produced in a temporary output directory.

- [ ] **Step 4: Run focused RED**

Run:

```bat
node_modules\.bin\vitest.CMD run tests\core\source-scope.test.ts tests\adapters\typescript-depcruise.test.ts tests\helpers\generate-depcruise-config.test.ts tests\helpers\parse-depcruise-output.test.ts tests\helpers\detect-barrels.test.ts tests\core\suppression.test.ts tests\core\report-builder.test.ts tests\integration\js-esm-project.test.ts
```

Expected: FAIL for the accepted-contract reasons reproduced live: JS detection false, TS-only config present, hard-coded `src` mapping/glob, missing `.mjs` barrel recognition, and no fail-closed source-scope API.

---

### Task 2: Implement the minimal shared source-scope path

**Covers:** configurable module root, extension set, fail-closed discovery

**Files:**
- Create: `hi_flow/skills/arch-audit/core/source-scope.ts`
- Modify: `adapters/typescript-depcruise.ts`, `helpers/parse-depcruise-output.ts`, `core/suppression.ts`, `helpers/detect-barrels.ts`

**Interfaces:**
- Produces: `SUPPORTED_SOURCE_EXTENSIONS`, `normalizeModuleRoot(pattern?: string): string`, `buildSourceScanGlob(moduleRoot: string): string`, `fileToModule(filePath: string, moduleRoot: string): string | null`, and `discoverProductionModules(projectRoot: string, moduleRoot: string): Promise<ModuleInfo[]>`
- Consumes: `overrides.module_pattern`, default `src`, and existing top-level-module semantics

- [ ] **Step 1: Implement validated normalization and exact prefix mapping**

Normalize slashes, strip `./` and legacy trailing `/*` / `/*/`, preserve nested roots, and reject empty/absolute/traversal/wildcard-bearing roots. File mapping must compare the complete root segment prefix, not `parts.indexOf()`.

- [ ] **Step 2: Implement production-module discovery**

Read only top-level directories under the normalized root and retain a directory only when it recursively contains at least one supported non-test source file. Throw an actionable error when the root is missing or yields zero production modules.

- [ ] **Step 3: Route adapter, parser, suppression, and barrel detection through the SSoT**

Keep default `src` behavior unchanged. Add JS/JSX/MJS/CJS test patterns and entry-point candidates. Pass the configured root into barrel detection rather than reconstructing `src` locally.

- [ ] **Step 4: Run focused GREEN for scope consumers**

Run the Task 1 focused command excluding the integration test if the report builder is not yet green. Expected: all scope, adapter, parser, suppression, and barrel tests PASS.

---

### Task 3: Route report building and depcruise configuration through the scope

**Covers:** JS config, derived glob, parser propagation, non-empty graph, bundled runtime

**Files:**
- Modify: `core/report-builder.ts`
- Modify: `helpers/generate-depcruise-config.ts`
- Test: `tests/core/report-builder.test.ts`, `tests/helpers/generate-depcruise-config.test.ts`, `tests/integration/js-esm-project.test.ts`

**Interfaces:**
- Consumes: normalized source scope and project-root `tsconfig.json` presence
- Produces: one derived scan glob passed to bundled depcruise, one matching root passed to the parser/suppression/structural detection, and a hard failure for empty analysis

- [ ] **Step 1: Resolve and validate the source scope before depcruise**

Load project rules, normalize `module_pattern ?? 'src'`, discover modules before invoking depcruise, and do not catch discovery failures into `[]`.

- [ ] **Step 2: Use the derived scan glob and parser root**

Replace the hard-coded `src/**/*.{ts,tsx}` with `buildSourceScanGlob(moduleRoot)` and call `parseDepcruiseOutput(depcruiseOut, moduleRoot)`. Throw if parsing yields no production modules.

- [ ] **Step 3: Make depcruise config language-aware**

Check for `<projectRoot>/tsconfig.json`. Include `tsConfig` and `tsPreCompilationDeps` only when it exists; preserve the resolver extension list for both project types.

- [ ] **Step 4: Run complete focused GREEN**

Run the full Task 1 focused command. Expected: every focused unit/component/integration test PASS, including a real `a -> b` `.mjs` edge.

---

### Task 4: Align documentation and execute live CWS verification

**Covers:** accepted contract wording, live output validity and freshness

**Files:**
- Modify: `hi_flow/skills/arch-audit/SKILL.md`
- Create: `docs/superpowers/plans/2026-07-17-arch-audit-js-esm-bug-fix-report.md`
- Create/Update: `PROJECT_STATE.md`

**Interfaces:**
- Consumes: final runtime behavior and verification output
- Produces: accurate operator-facing contract, implementation report, and current-state pointer

- [ ] **Step 1: Update SKILL.md without expanding scope**

State that the shared dependency-cruiser adapter accepts TS and JS, `module_pattern` is the production module root (legacy trailing `/*` accepted), the glob is derived over six supported extensions, and missing/empty roots fail closed.

- [ ] **Step 2: Run all deterministic gates**

Run:

```bat
node_modules\.bin\vitest.CMD run
node_modules\.bin\tsc.CMD --noEmit
git diff --check
```

Expected: PASS. Record exact test counts and any pre-existing environmental warnings.

- [ ] **Step 3: Run live CWS smoke outside the target project**

Without changing CWS, provide `overrides.module_pattern: pipeline-runtime` through the supported invocation path and write only to `C:\tmp\cws-arch-audit-smoke-<unique-id>`. Render markdown after phase 1. Verify D8 schema, actual CWS HEAD equals `metadata.audit_sha`, current-run timestamp, non-empty `metrics.per_module` and `dep_graph`, real `pipeline-runtime` modules, at least one `.mjs` edge, absent parsing errors, and presence of `audit-report.json`, `clusters-input.json`, and `audit-report.md`.

- [ ] **Step 4: Complete isolated review**

Dispatch a read-only reviewer over `origin/master..HEAD` (or the complete staged/working diff before commit). Fix every Critical or Important finding, then re-run affected focused tests and the final gates.

- [ ] **Step 5: Write completion artifacts and commit**

Create the implementation report beside this plan with status, exact RED/GREEN evidence, deviations, issues, and open items. Create/update `PROJECT_STATE.md` as a compact current dashboard. Commit only intended files with a message such as `Fix ArchAudit JavaScript module roots` and record the SHA.

---

## Completion Protocol

- [ ] **Implementation report created**

Write `docs/superpowers/plans/2026-07-17-arch-audit-js-esm-bug-fix-report.md` with accepted contract, live reproduction, fix summary, deviations, issues discovered, open items, and final status.

- [ ] **Final verification passed or blockers recorded**

Focused tests, full ArchAudit suite, `tsc --noEmit`, `git diff --check`, D8 schema validation, and live CWS smoke must all have fresh evidence. A pre-existing or environmental failure is recorded exactly and prevents `completed` unless it is proven unrelated and explicitly accepted.

- [ ] **Isolated review completed**

No Critical or Important findings may remain. Minor findings are either fixed or recorded with rationale.

- [ ] **Architecture audit decision recorded**

Do not recursively run ArchAudit on its own implementation merely because this bug fixes the auditor. The required live CWS audit is the meaningful architecture-contract verification; record this scoped choice in the report.

- [ ] **Living artifacts updated**

On success, no Active Issue entry is added. On partial/blocked execution, add/retain a HIGH Active Issue. Update `PROJECT_STATE.md` at close-out without copying plan or architecture content.
