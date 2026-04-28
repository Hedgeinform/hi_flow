# `hi_flow:arch-audit` — Implementation Spec

**Status:** ready for `superpowers:writing-plans`.
**Date:** 2026-04-28.
**Upstream:** `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-design.md` (design v1).
**Purpose:** lock down implementation contracts that the design spec deferred — blocking open questions, helper I/O, core module decomposition, test strategy. Bridge between design and writing-plans.
**Audience:** writing-plans agent and downstream impl agent.

---

## 1. Open questions resolved

Five blocking questions from design spec section 11 are resolved here. Each decision is final and goes into impl plan as constraint.

**Mapping to design spec:**
- 1.1 closes `rule_id naming convention`.
- 1.2 closes `metadata.audit_sha for non-git project`.
- 1.3 closes `Partial dep_graph handling`.
- 1.4 closes `Self-Review subagent failure mode` + `Self-Review minimum tool requirements`.
- 1.5 closes `depcruise version compatibility check timing`.

Other design-spec opens (markdown size limit, languages mixing, performance benchmarking, deterministic finding ids, D9 evolution governance, decoupling structuredness, performance on large projects, depcruise opt-out for airgapped) — parked in section 6.

### 1.1. `rule_id` naming convention — **prefixed namespace**

Format: `<source>:<name>` where `<source> ∈ {baseline, project}`.

- Baseline rules: `baseline:no-circular`, `baseline:god-object`, `baseline:nccd-breach`, etc.
- Project rules (added via `arch-redesign` patches): `project:dispatcher-pipeline-forbidden`, `project:domain-no-channel-sdk-strict`.

**Reasons:**
- Provenance visible at glance — operator returning to a year-old audit immediately distinguishes baseline from custom.
- Conflict prevention by namespace: a project rule cannot accidentally overwrite a baseline rule with the same short name.
- arch-redesign filter-by-source becomes trivial when consuming D8 findings.

**Implementation note:** rule_id construction happens in `core/baseline-rules.ts` (baseline:* prefix hardcoded into rule definitions) and in `core/project-rules.ts` (project:* prefix prepended on load if absent — supports legacy patches that omit prefix).

### 1.2. `audit_sha` for non-git project — **UUID v4 with `uuid:` prefix**

If `git rev-parse HEAD` succeeds → `audit_sha = <commit-sha>`.
If git unavailable or not a repo → `audit_sha = uuid:<uuid-v4>`.

**Downstream contract:** consumers of D8 (`arch-redesign`, `arch-spec`) MUST detect `uuid:` prefix and:
- Skip git-based freshness check.
- Show operator a warning: «проект не под git'ом, актуальность аудита не верифицируема — убедись, что аудит был на текущем состоянии кода».

This is consistent with `arch-redesign/SKILL.md` lines 56-58 («If not a git repository → skip freshness check, show warning»).

**Reasons:** non-git projects (early experiments, scratch dirs) shouldn't be blocked from running audit. UUID guarantees globally unique identifier without expensive content-hashing. Freshness verification gracefully degrades.

### 1.3. Partial dep_graph handling — **continue with visible warning**

If depcruise reports parsing errors on some files (broken TS, unresolvable imports):

1. Continue with the partial graph that was successfully built.
2. In `audit-report.md` header — visible warning block:
   > **Warning: depcruise не смог распарсить N файлов:**
   > - `<path-1>`: `<error-summary>`
   > - `<path-2>`: `<error-summary>`
   >
   > Метрики и findings ниже считаны на partial графе — возможны пропуски (модули могут выглядеть менее coupled из-за невидимых импортов; hub-detection и cycle-detection могут не сработать на отсутствующих edges).
3. In `audit-report.json.metadata` — add field `parsing_errors: [{file, error}]` for downstream awareness.

**Reasons:** broken state is itself architectural debt and shouldn't be hidden behind a hard fail. Operator transparency: warning makes the limitation explicit. Hard fail variant would render skill unusable in projects with one broken experimental module — a frequent real-world case.

**Parking lot (post-v1):** preflight check that detects broken state before audit launch and proposes to fix first. Not now — current B-flow gives operator equivalent visibility post-fact.

### 1.4. Self-Review subagent tool availability — **required + optional tier with operator install prompt**

**Required tools (Self-Review cannot run without them):**
- `jq` — structural/numeric queries on `audit-report.json` (recompute Ca/Ce/I, severity_counts cross-check, suppression precedence verification).
- `ajv-cli` — independent D8 schema validation (defense in depth: main agent's `core/d8-schema-validator.ts` validates pre-write using `Ajv` library; subagent independently re-validates the on-disk file).

**Optional tools (graceful degrade with explicit warning):**
- `mmdc` (Mermaid CLI) — Mermaid syntax validation. Without it, subagent writes in Self-Review report: «mmdc not found, Mermaid syntax check skipped — рекомендую визуально проверить отчёт в Cursor/VS Code/GitHub».

**Native subagent tools (always available, no install needed):**
- `Read`, `Grep`, `Bash` — for ad-hoc verification, prohibited-content regex (emoji, placeholders, sensitive paths), file-level checks.

**Not needed:**
- `git` — only relevant for freshness check, which is delegated to downstream (Q-1.2).

**Tool-availability flow at Self-Review start:**
1. Subagent runs `which jq && which ajv && which mmdc` (Bash) and reports availability to main agent.
2. If required tool missing → main agent shows operator:
   > Self-Review требует `<missing-tool-list>`. Команды для установки:
   > - `npm install -g ajv-cli` (для ajv)
   > - `winget install jqlang.jq` (Windows) / `apt install jq` (Linux) / `brew install jq` (macOS)
   > - `npm install -g @mermaid-js/mermaid-cli` (для mmdc, optional)
   >
   > Установить и продолжить? (да / нет — тогда Self-Review hard fail)
3. **«да»** → operator installs → re-check → continue Self-Review.
4. **«нет»** → hard fail: «Self-Review требует deterministic validation. Без [tools] валидация неполная. Установи и перезапусти audit.»
5. If only optional tool (mmdc) missing → continue silently; subagent appends warning to Self-Review report.

**Defense-in-depth principle:** main agent guarantees correctness via Node libraries (Ajv, deterministic Mermaid generator + helper test suite); subagent independently verifies on-disk artifacts via CLI tools. Both layers exist intentionally to catch helper bugs.

### 1.5. depcruise version compatibility check — **preflight, hard fail on out-of-range**

Adapter constants:
```typescript
const MIN_DEPCRUISE_VERSION = "16.0.0"
const MAX_DEPCRUISE_VERSION = "17.0.0"  // exclusive — major bumps require adapter update
```

**Flow:**
1. After tool availability check (Q-1.4 doesn't gate this — version is checked even before subagent invocation), run `npx --no-install dependency-cruiser --version`.
2. Parse output via regex `/(\d+)\.(\d+)\.(\d+)/`.
3. Compare against MIN/MAX:
   - `version >= MIN && version < MAX` → continue.
   - `version < MIN` → hard fail: «depcruise версия `<v>` слишком старая, скилл рассчитан на ≥ 16.0.0. Обнови: `npm install -g dependency-cruiser@latest`.»
   - `version >= MAX` → hard fail: «depcruise версия `<v>` новее протестированного диапазона (< 17.0.0). Adapter может работать некорректно. Понижай через `npm install -g dependency-cruiser@^16.0.0` или подожди обновления adapter'а.»

**Reasons:** preflight catches version mismatch with a clear actionable message instead of an opaque parse error in helper internals. Costs ~3 lines of code (extending tool-availability check that already runs `--version`). Range check (not exact version) tolerates patch/minor updates within `16.x` per semver.

---

## 2. Helper I/O contracts

Nine helpers as defined in design spec section 5. Locked I/O for each. Contracts derived deterministically from D8 schema, depcruise output structure, and `references/baseline-rules.md`.

**Pipeline note.** Helpers #2 and #4 share data flow with structural-detection results from adapter. The full finding lifecycle:
1. Helper #2 produces *raw findings* from depcruise (rule_id from depcruise + raw severity, no `reason.principle` yet).
2. Adapter's structural-detection methods produce *additional findings* (rule_id from baseline-rules + raw severity, no `reason.principle` yet).
3. Helper #4 takes the union of both and **enriches** each with finalized severity (D8 enum) AND `reason.principle` lookup from baseline-rules + project-rules.
4. Helper #5 applies suppression on enriched findings.

| # | Helper | Input | Output | Hard-fail cases |
|---|---|---|---|---|
| 1 | `generate-depcruise-config.js` | `{baselineRules: BaselineRule[], projectRules: ProjectRules, projectRoot: string}` | Path to temporary `.dependency-cruiser.cjs` file in working dir | YAML parse fail (caught upstream by `core/project-rules.ts`, helper assumes pre-validated input); ruleset cannot be expressed in depcruise CJS |
| 2 | `parse-depcruise-output.js` | depcruise stdout (JSON string) | `{findings: RawFinding[], dep_graph: {[module]: string[]}, per_module_raw: {[module]: {ca, ce, loc}}}`. `RawFinding` has `rule_id` (depcruise rule name, **without `baseline:` prefix yet**), raw severity (depcruise `error`/`warn`/`info`), source/target, but no `reason.principle`. | Output not valid JSON; expected fields missing (caught at preflight Q-1.5, not here) |
| 3 | `compute-nccd.js` | `dep_graph: {[module]: string[]}` | `nccd: number` (float) | none — empty graph returns 0 |
| 4 | `enrich-findings.js` (renamed from `normalize-severity.js` to reflect expanded scope) | `{rawFindings: RawFinding[], baselineRules: BaselineRule[], projectRules: ProjectRules}` | `findings: Finding[]` — each enriched with: (a) final D8 severity from baseline lookup + project overrides, (b) `rule_id` with `baseline:`/`project:` namespace prefix, (c) `reason.principle` from baseline rule definition or project rule's `principle` field, (d) `reason.explanation` (template-filled from baseline rule explanation). | Finding's `rule_id` not in baseline_rules ∪ project_rules (indicates upstream bug in adapter or helper #2) |
| 5 | `apply-suppression.js` | `findings: Finding[]` (enriched) | `findings: Finding[]` (after suppression). Algorithm: **binary**, not multi-level. Only `baseline:cross-module-import-info` (LOW) findings are suppressed when ANY higher-severity finding exists on the same `(source.module, target.module)` edge. **Edge equivalence is module-level only** — file-level path is ignored for matching. | none — pure function |
| 6 | `generate-mermaid.js` | `auditReportJson: D8AuditReport` | `{overall: string \| null, foundation: string \| null, layered: string \| null, clusters: {[cluster_id]: string}}` — `overall` is `null` if `module_count > MERMAID_OVERALL_CAP` (constant = 25 modules; report-builder substitutes textual summary). `clusters` is **per-cluster** (one diagram per cluster, NOT per-finding) — v1 does not generate per-finding diagrams. | none — `null` for absent diagrams |
| 7 | `regenerate-principles-index.js` | `{principlesMdPath: string}` | Writes `architectural-principles-index.json` next to source; returns `{regenerated_count: number}` | Markdown does not match canonical entry format. **Standalone CLI utility — NOT part of `buildReport` or `applyPatch` runtime flow.** Invoked manually by operator after editing D9 markdown (per design spec section 7 D9 evolution mechanism). |
| 8 | `validate-rules-patch.js` | `{patchPath: string, projectRules: ProjectRules, d9Index: D9Index}` | `{valid: boolean, errors: ValidationError[], parsed_rules: Rule[]}` | none — always returns structured result, never throws |
| 9 | `merge-rules-patch.js` | `{patchPath: string, projectRulesPath: string, archiveDir: string}` (patch must be pre-validated by #8) | `{success: boolean, rules_added: number, rules_updated: number, archive_path: string}` | Write fail on rules file (disk full, permissions) → `success: false`, patch left in place per atomic ordering (design spec Q3 «merge first, on success archive») |

**Type definitions** (locked here, expanded in writing-plans):
- `Finding` — see `references/d8-schema.json` `findings[]` schema. Has finalized `rule_id` (with namespace), `severity` (D8 enum), `reason.principle`, `reason.explanation`, etc.
- `RawFinding` — internal pre-enrichment shape used between helper #2 / adapter detection and helper #4. Same as `Finding` but missing namespace prefix on `rule_id`, missing `reason.principle`/`reason.explanation`, `severity` is depcruise raw.
- `ProjectRules` — see section 3.3 for full structure (forbidden, required, overrides).
- `Rule` — single rule entry, fields: `name, severity, principle, from?, to?, comment?`.
- `BaselineRule` — see section 3.2 for full structure.
- `D9Index` — output of helper #7, `{principles: {[id]: PrincipleMetadata}, fix_alternatives: {[id]: string[]}}`. `fix_alternatives` source: D9 markdown contains a `**Fix alternatives:**` section per principle entry (added during D9 promotion to canonical format) — see `references/baseline-rules.md` for the catalog mapping rules → principles → fix alternatives.
- `ValidationError` — `{rule_name?: string, field?: string, message: string, suggestion?: string}`.
- `ToolingRequirement` — `{name: string, min: string, max?: string}`.

---

## 3. Core module decomposition

Six modules in `core/`. Each has explicit responsibility and exports. No further decomposition for v1.

### 3.1. `core/d9-loader.ts`
**Responsibility:** centralized read of D9 library (markdown + JSON index).
**Exports:**
- `loadD9(): Promise<{principles: Map<id, Principle>, fix_alternatives: Map<id, string[]>}>`
- Type `Principle = {id, name, description, fix_alternatives: string[]}`.
**Consumers:** `report-builder.ts` (cluster suggestions / fix alternatives lookup), helper #8 `validate-rules-patch.js` (principle id existence check).

### 3.2. `core/baseline-rules.ts`
**Responsibility:** single source of truth for 14 baseline rules. TypeScript constant array, ships with skill release.
**Exports:**
- `getBaselineRules(): BaselineRule[]`
- Type `BaselineRule = {id: string (with baseline: prefix), severity, principle: string, threshold_default?: number, conditional?: ConditionalTrigger}`.
**Consumers:** helper #1 `generate-depcruise-config.js` (config generation), `core/suppression.ts` (precedence chain), adapter (severity normalization mapping).

### 3.3. `core/project-rules.ts`
**Responsibility:** centralized read/write of `<project>/.audit-rules.yaml`. Parsing, format validation, lookup, mutation, write-back. **Added per operator review** — three helpers (1, 8, 9) all touch project rules; centralize to avoid duplication.
**Exports:**
- `loadProjectRules(projectRoot: string): Promise<ProjectRules>` (returns empty `ProjectRules` if file absent — normal greenfield case, no warning)
- `writeProjectRules(projectRoot: string, rules: ProjectRules): Promise<void>`
- `findRuleByName(rules: ProjectRules, name: string): Rule | null` (searches across forbidden + required)
- `addRules(rules: ProjectRules, newRules: Rule[]): ProjectRules`
- Full type:
  ```typescript
  type ProjectRules = {
    forbidden: Rule[]              // forbidden module-edge rules from arch-redesign patches
    required: Rule[]               // structural-invariant rules
    overrides?: {
      nccd_threshold?: number      // raise/lower from baseline default 1.0
      layer_aliases?: {[name: string]: string}  // extend canonical layer names
      baseline_disables?: {rule_id: string, comment: string}[]  // disable specific baseline rule with reason
      severity_overrides?: {rule_id: string, severity: Severity}[]  // promote/demote severity
      channel_sdk_extras?: string[]  // additional SDK packages for domain-no-channel-sdk
    }
  }
  ```
  Override semantics align with design spec section 6 ("Override mechanism" listing).
**Consumers:** helpers #1 (config gen reads overrides), #4 (enrichment uses severity_overrides), #8 (patch validation uses findRuleByName), #9 (apply uses addRules + writeProjectRules), `core/suppression.ts` (reads baseline_disables to skip).

### 3.4. `core/d8-schema-validator.ts`
**Responsibility:** validate any object against D8 schema before write. Uses `Ajv` library internally. Two contexts of use: pre-write validation in `report-builder.ts`, structure validation in helper #8 `validate-rules-patch.js`.
**Exports:**
- `validateD8Report(obj: unknown): {valid: boolean, errors: AjvError[]}`
- `validateRulesPatchSchema(obj: unknown): {valid: boolean, errors: AjvError[]}`
**Consumers:** `report-builder.ts`, helper #8.

### 3.5. `core/suppression.ts`
**Responsibility:** apply suppression precedence (LOW informational findings suppressed by HIGHER-severity findings on the same import edge). Pure function, isolated for testability.
**Exports:**
- `applySuppression(findings: Finding[]): Finding[]`
- Internal precedence chain table.
**Consumers:** `report-builder.ts` (called after metric computation, before D8 validation).

### 3.6. `core/report-builder.ts`
**Responsibility:** thin orchestrator. The entry point of full mode. Stack-agnostic in composition (calls adapter, helpers, other core modules) — does NOT contain depcruise-specific logic itself.
**Exports:**
- `buildReport(adapter: StackAdapter, projectRoot: string, opts: BuildOpts): Promise<{json_path: string, md_path: string}>`
**Flow inside `buildReport`:**
1. Adapter detects modules, runs depcruise via helper #1 + #2 → produces `RawFinding[]` (parse-stage) + `dep_graph` + `per_module_raw`.
2. Adapter applies structural detection (layered, hub, vertical-slice, channel-SDK) using its constants + core algorithms → produces additional `RawFinding[]` (structural-stage).
3. Helper #3 computes NCCD on dep_graph.
4. Helper #4 (`enrich-findings.js`) takes UNION of parse-stage + structural-stage RawFindings, enriches with finalized severity (D8 enum) + `rule_id` namespace prefix + `reason.principle` + `reason.explanation` using `core/baseline-rules.ts` + `core/project-rules.ts.overrides`.
5. `core/suppression.ts` applies binary suppression (LOW informational findings on edges with higher-severity findings removed).
6. `core/d9-loader.ts` provides cluster `fix_alternatives` for cluster prose.
7. Cluster grouping (deterministic algorithm: 1 unique `reason.principle` = 1 cluster default; if findings within a cluster touch two disjoint sets of modules → split into two sub-clusters with suffixed ids) + LLM-generated cluster prose (cluster name + root cause formulation; the only LLM call inside `report-builder`, rest is deterministic).
8. Adapter populates `metadata.audit_tooling_version` via `adapter.getToolingVersionString()` returning `"<adapter.name> (<detected-depcruise-version>)"` (from preflight Q-1.5).
9. `core/d8-schema-validator.ts` validates the assembled `audit-report.json` object pre-write.
10. Helper #6 generates Mermaid blocks (overall null if module_count > 25).
11. Embed Mermaid into `references/audit-report-template.md` template, write `audit-report.md`. If `overall === null` — substitute textual summary block per design spec section 8.
12. Write `audit-report.json` to disk.
13. Return paths.

**Module count justification:** 6 modules, not 5 (per operator review: project-rules separated for symmetry with d9-loader). Not 7+: cluster grouping lives inline in `report-builder` as a 30-line method until empirical pain shows it needs extraction.

---

## 4. Adapter

Single v1 adapter: `adapters/typescript-depcruise.ts`. Implements `StackAdapter` interface as defined in design spec section 4.

**Adapter-specific constants** (locked, **synchronized with `references/baseline-rules.md`** as single source of truth — discrepancy = bug):

- `name: "typescript-depcruise"`
- `version: "1.0.0"` — adapter version, independent of skill version. Bump policy: MAJOR — D8 output structure change; MINOR — new constants / SDK additions; PATCH — bug fixes.
- `requiredTooling: ToolingRequirement[] = [{name: "dependency-cruiser", min: "16.0.0", max: "17.0.0"}]` (per Q-1.5)
- `testFilePatterns: ["*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx", "__tests__/**/*"]`
- `channelSdkList`: full list synced with `references/baseline-rules.md` `domain-no-channel-sdk` rule definition (Telegram, Discord, HTTP frameworks, messaging, sockets, email, message buses — ~22 entries). Extensible per project rules `overrides.channel_sdk_extras`.
- `layerNamingMap`: full closed list synced with `references/baseline-rules.md` `layered-respect` rule definition (~17 entries: domain/core/business/service[s]/api/web/ui/presentation/infra/infrastructure/gateway[s]/persistence/repositor[y/ies]/usecases/controllers/handlers/adapters/ports/interface). Extensible per project rules `overrides.layer_aliases`.
- `defaultModulePattern: "src/*/"` (single-level subdirs of src — overridable via project rules `overrides.module_pattern`).

**Module pattern fallback policy:** if `defaultModulePattern` resolves to zero modules (e.g., project doesn't have `src/`), adapter hard-fails with actionable instruction: «`src/` не найдено в `<project-root>`. Укажи корневую директорию модулей через `overrides.module_pattern` в `<project>/.audit-rules.yaml` (например, `app/*/` или `lib/*/`).» Auto-fallback на root запрещён — приведёт к мусорному graph'у.

**Tooling version reporting:** adapter exports `getToolingVersionString(): string` that returns `"<this.name> (<detected-depcruise-version>)"` using version captured during preflight (Q-1.5). Used in workflow step 8 to populate `metadata.audit_tooling_version`.

---

## 5. Test strategy

**Three-layer approach:**

| Layer | Coverage | When written | Owner |
|---|---|---|---|
| **Unit (TDD)** | All 9 helpers individually. ~5 cases per helper (happy path, 1-2 edge cases, 1-2 error cases). | TDD: test → impl → next helper. | impl agent |
| **Integration (post-fact)** | 1-2 synthetic fixture projects (~5 TS files each) covering one cycle scenario + one god-object scenario. End-to-end: invoke adapter → produce `audit-report.json` → assert structure. | After all helpers + adapter assembled, before manual smoke. | impl agent |
| **Manual smoke** | Real-world run on Zhenka (`<C:\Users\Vegr\Projects\Owners\zhenka-bot>` per operator's local setup, OR equivalent). Operator visually reviews `audit-report.md` against `examples/zhenka-audit-report-mock.md` for sanity (Mermaid renders, severity counts plausible, no glaring issues). | After integration tests pass, as final check before impl-session closure. | operator + impl agent |

**Test framework:** Vitest (preferred — native TypeScript support, fast, modern). Falls to impl agent's discretion if Vitest blocked by environment — Jest acceptable substitute.

**Coverage targets:** no formal % gate. Goal is meaningful coverage of helper I/O paths, not metric chasing. Integration tests are smoke + glue verification, not a coverage tool.

**TDD justification:** I/O contracts in section 2 are pre-locked. TDD becomes mechanical (input → expected output, derived from the contract). Lower cost than post-fact retrofit.

**No tests for:**
- LLM-generated content (cluster prose) — non-deterministic, validation belongs in Self-Review subagent runtime.
- `report-builder.ts` end-to-end — covered by integration tests, not unit (orchestrator with many dependencies, mock-heavy unit test would test mock setup, not behavior).
- **Self-Review subagent itself** — it is a behavioral instruction in `SKILL.md`, not code. Tool-availability check and categorized fix-application logic execute as part of Claude subagent runtime, not unit-testable in isolation. Manual smoke covers the end-to-end Self-Review invocation path.

---

## 6. Open questions parked for v2 + cascade actions

### Cascade actions (must complete before or during impl, NOT parked)

- **D8 schema bump for `metadata.parsing_errors`.** Per Q-1.3 the skill writes `parsing_errors: [{file, error}]` into `metadata`. Current D8 schema (`hi_flow/skills/arch-audit/references/d8-schema.json`) has `metadata.additionalProperties: false` — new field will fail validation. **Action:** add `parsing_errors` as optional property in `metadata` of `d8-schema.json`, bump `metadata.schema_version` from `1.0` to `1.1`. Cascade to `references/d8-schema.md`. Handle in writing-plans as a step before helper #2 implementation.

### Parked for v2 (do NOT block writing-plans)

- **Preflight broken-state check** — pre-audit detection of unfixable parsing problems with operator prompt to fix first (operator request during Q-1.3 review). Out of v1 scope, post-MVP UX enhancement.
- **Performance benchmarking** — what's "too slow" for large projects (1000+ modules)? Target metrics TBD after first real audits on multiple projects.
- **rule_id legacy migration** — when arch-redesign generates patches without `project:` prefix (legacy / pre-Q-1.1 patches), `core/project-rules.ts` silently prepends. If backward compat becomes pain — explicit migration command.
- **Deterministic finding ids** — `Finding.id` strategy: **v1 default = sequential `f-001`, `f-002`, ...** (assigned in `core/report-builder.ts` step 4 after enrichment, before suppression). Sufficient for unique reference within a single audit-report.json. Cross-audit deterministic ids (same input → same id across runs) parked for v2 — refine after first boevoy run when use cases are clearer (audit-vs-audit diffing, etc.).
- **Markdown size limit** — current spec doesn't cap `audit-report.md`. If reports become unwieldy on large projects — paginate or split.
- **Languages mixing policy** — output is bilingual by design (English technical terms + Russian operator-facing prose). Refine after operator usage feedback if friction surfaces.
- **D9 evolution governance for market-ready** — design spec section 11 already parks this. Out of v1 scope.

---

## 7. Implementation plan handoff to writing-plans

Sufficient information for `superpowers:writing-plans` to produce concrete TDD-first plan. Suggested structure (writing-plans sets actual granularity):

1. **Helper-by-helper unit-first plan** (9 helpers, each with locked I/O from section 2) — TDD: tests → impl → green → next helper.
2. **Core modules implementation** (6 modules from section 3) — implement in dependency order: `baseline-rules` (no deps) → `d9-loader` (no deps) → `project-rules` (no deps) → `d8-schema-validator` (no deps) → `suppression` (depends on `baseline-rules`) → `report-builder` (depends on all).
3. **Adapter implementation** (`typescript-depcruise.ts`) — assembles helpers + core. Interface scaffolding → identifyModules + detect → structural detection methods.
4. **Integration tests** — 2 fixture projects + assertion harness.
5. **Manual smoke** — final boevoy run, operator review.

Sessions split per natural boundary at writing-plans' discretion (helpers + core may fit one session, adapter + integration + smoke another — boundary chosen by impl-context, not by item count).

---

## 8. Self-Review status

This impl-spec to be reviewed by isolated subagent (per global CLAUDE.md operator-rule on superpowers:brainstorming with subagent isolation). Subagent receives:
- This file path.
- Design spec path (`docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-design.md`).
- D8 schema (`hi_flow/skills/arch-audit/references/d8-schema.json`).
- Baseline rules (`hi_flow/skills/arch-audit/references/baseline-rules.md`).

Conversation history NOT passed.

**Self-Review checklist:**
1. Are all 5 design-spec open questions resolved with concrete, actionable decisions (not deferrals)?
2. Are 9 helper I/O contracts internally consistent (output of one == input of next where chained)?
3. Does core module decomposition cover all responsibilities mentioned in design spec workflow?
4. Are there responsibilities mentioned in design spec but missing from core/helpers/adapter assignment?
5. Does the test strategy cover all 9 helpers + integration boundaries?
6. Are there contradictions between this impl-spec and the design spec? (Should NOT contradict — impl-spec resolves opens, doesn't override design.)
7. Is anything ambiguous enough that writing-plans would have to make a judgment call? (Should NOT — impl-spec's job is to leave nothing ambiguous.)
8. Format compliance: section structure, no placeholders, no TBDs without justification.
