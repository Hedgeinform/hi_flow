# Implementation Report: arch-audit v1 runtime

**Spec:** docs/superpowers/plans/2026-04-28-arch-audit-impl.md
**Date:** 2026-04-28
**Status:** completed

## What was done

- **Task 0:** Project scaffolding (`package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`). ESM, Node 20+, Vitest 1.2, Ajv 8, js-yaml 4, tsx 4.
- **Task 1:** D8 schema updated to v1.1 (`d8-schema.json`, `d8-schema.md`) — added optional `parsing_errors` field in metadata.
- **Task 2:** `core/types.ts` — all shared TypeScript types (Severity, RawFinding, Finding, ModuleMetrics, DepGraph, D8AuditReport, BaselineRule, ProjectRules, Rule, D9Index, ValidationError, ToolingRequirement).
- **Task 3:** `core/baseline-rules.ts` — 14 baseline rules across 3 layers (A=3 depcruise built-ins, B=6 universal custom, C=5 conditional structural).
- **Task 4:** `helpers/compute-nccd.ts` — pure NCCD computation via iterative DFS.
- **Task 5:** `helpers/parse-depcruise-output.ts` — parses depcruise JSON, extracts RawFindings + DepGraph + per-module Ca/Ce/LOC.
- **Task 6:** `core/d9-loader.ts` — reads D9 markdown library, extracts principles with descriptions and fix alternatives.
- **Task 7:** `core/project-rules.ts` — read/write `.audit-rules.yaml` with YAML serialization via js-yaml.
- **Task 8:** `core/d8-schema-validator.ts` — Ajv-based D8 schema validator.
- **Task 9:** `core/suppression.ts` — binary suppression: `baseline:cross-module-import-info` (LOW) suppressed when higher-severity finding on same module edge.
- **Task 10:** `helpers/enrich-findings.ts` — RawFinding[] + baselineRules + projectRules → Finding[] with namespaced rule_id, D8 severity, reason.principle.
- **Task 11:** `helpers/generate-depcruise-config.ts` — generates CJS depcruise config from baseline (Layer A only) + project rules.
- **Task 12:** `helpers/generate-mermaid.ts` — 4 Mermaid blocks (overall, foundation stub, layered, clusters by principle). Cap = 25 modules.
- **Task 13:** `helpers/validate-rules-patch.ts` — validates YAML patches: syntax, D9 principle existence, name uniqueness, severity enum, regex parseability.
- **Task 14:** `helpers/merge-rules-patch.ts` — atomic merge-then-archive of rules patches.
- **Task 15:** `helpers/regenerate-principles-index.ts` — standalone CLI, writes JSON index next to D9 .md.
- **Task 16+17:** `adapters/typescript-depcruise.ts` — adapter with identity constants, `detect()`, `identifyModules()`, `identifyEntryPoints()`, `detectStructural()` (god-object, dependency-hub, high-fanout, inappropriate-intimacy, layered-respect, architectural-layer-cycle).
- **Task 18:** `core/report-builder.ts` — main orchestrator. Accepts injectable `runDepcruise` for testing. Produces D8-validated `audit-report.json` + `audit-report.md`.
- **Task 19:** Integration test — cycle scenario (real depcruise on cycle-project fixture).
- **Task 20:** Integration test — god-object scenario (mock depcruise, LOC injection via `metrics.loc`).
- **Task 21:** Full test suite (typecheck + 62 tests green), smoke on Zhenka (32 findings: 10 HIGH, 22 MEDIUM — dispatcher→pipeline and pipeline↔validator/pre-processors correctly detected).

## Deviations from spec

- **Task 9 location:** `applySuppression` placed in `core/suppression.ts` (not a separate `helpers/` file as initially named "helper #5"). Cleaner placement given it's pure logic.
- **Tasks 16+17 batched:** Both adapter tasks implemented in a single commit (same file). Functionally identical.
- **Task 14 write-failure test:** Path `/this/path/cannot/exist/.audit-rules.yaml` not reliable on Windows. Replaced with a portable approach (file blocking the parent path creation).
- **LOC extraction:** `parse-depcruise-output.ts` extended to extract `m.metrics?.loc` from depcruise output when present (needed for god-object detection in real runs).
- **Violation type normalization:** Added `normalizeViolationType()` mapping depcruise's `dependency`/`reachability`/`module`/`cycle` → D8 enum `boundary`/`cycle`/`coupling`. Without this, real depcruise output failed D8 schema validation.
- **`generate-depcruise-config` options cleanup:** Removed invalid `reporterOptions.json.showTitle` option that caused depcruise v17 schema rejection.
- **`report-builder` src path:** Changed `runner(configPath, 'src/')` to `runner(configPath, 'src/**/*.ts')` for correct file enumeration on Windows.
- **`enrich-findings` rule lookup:** Fixed to match by both `r.name` and `r.id` since depcruise config uses `rule.id` as the rule name in violations.

## Issues discovered

- **D8 type enum too narrow for real depcruise output:** Depcruise emits violation type `"dependency"` but D8 enum only had `boundary/cycle/sdp/coupling/nccd`. Fixed via `normalizeViolationType()`.
- **node_modules modules in dep_graph:** `fileToModule()` returns `"node_modules"` for external dependency paths, polluting the dep_graph with external module entries. V1 limitation — acceptable for smoke test, should be filtered in v2.
- **LOC always 0 in standard depcruise JSON:** Standard `--output-type json` does not include `metrics.loc` by default. God-object detection requires depcruise to be run with metrics mode or LOC to be estimated from file size. V1 limitation: detection works only when `metrics.loc` is present in output.
- **AJV date-time format warning:** Pre-existing, non-blocking. Ajv 8 drops `format` validation by default; `audit_timestamp` format check is informational only.

## Open items

- **`fileToModule` external dep filtering:** Remove external packages (node_modules, bun:, crypto, fs) from dep_graph to avoid false positives in dependency-hub detection.
- **SKILL.md:** Not implemented in this session (out of scope for runtime implementation plan).
- **`architectural-principles-index.json`:** Auto-generated artifact — not committed; operator can regenerate via `regenerate-principles-index CLI` on the real D9 library.
- **Mermaid foundation diagram:** Stub `null` in v1; foundation detection requires adapter to mark utility modules, not yet implemented.

---

## Deviations from spec (continued)

- **`validateRulesPatchSchema` not implemented:** spec section 3.4 specified two exports for d8-schema-validator. v1 only exports `validateD8Report`; patch validation in helper #8 uses field-level runtime checks instead of JSON Schema. Decision: acceptable for v1, defense-in-depth schema validation parked for v2.

## Post-review fixes (2026-04-28)

Per `docs/superpowers/plans/2026-04-28-arch-audit-review-fixes.md`:

- F1: preflight depcruise version check implemented (`core/preflight.ts`).
- F2: `metadata.parsing_errors` populated end-to-end.
- F3: fake modules (node_modules, builtins, top-level src files) filtered from dep_graph.
- F4: `port-adapter-direction`, `domain-no-channel-sdk`, `nccd-breach` baseline rules now emit findings.
- F5: `audit_sha` resolver with git/UUID fallback (`core/audit-sha.ts`).
- F6: `project:` prefix normalized on `loadProjectRules`.
- F7: D9 loader regex fixed to skip Related blocks in fix_alternatives.
- F8: cluster Mermaid no longer renders self-edges.
- F9: documentation comment in adapter clarifying namespacing pipeline.
- F10: SKILL.md helper names synced (`normalize-severity.js` → `enrich-findings`, `apply-suppression.js` → `core/suppression.ts`).
- F11: validateRulesPatchSchema parked for v2 (operator decision).
- F12: silent `--yes` install removed from depcruise runner.
- F13: Windows-compatible CLI guard in regenerate-principles-index.
- F14: explicit cluster prose fallback marker.
