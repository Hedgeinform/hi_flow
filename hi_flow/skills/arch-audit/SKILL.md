---
name: arch-audit
description: Use when operator says «запусти arch-audit / проведём аудит архитектуры / проверь архитектуру проекта / arch-audit apply-patch PATH» or English equivalents. Produces audit-report.{json,md} for full mode, or merges a rules-patch in apply-patch mode.
---

# arch-audit

## Overview

Help the operator obtain a deterministic map of the project's structural architectural problems. The skill is an analytical scanner: static dependency-graph analysis and connectivity metrics, with no semantic judgment. It compares the observed dependency graph from code against the Target Architecture Contract (stack baselines + project rules + applied rules-patches).

Two modes:

- **Full mode** (default) — full audit. Output: `audit-report.json` (D8-compliant — structured findings schema, see References) + `audit-report.md` (human-readable with Mermaid visualizations).
- **Apply-patch mode** — explicit command. Validate + merge a rules-patch (from `arch-redesign` or `arch-spec`) into the project rules file, i.e. into the current machine-checkable Target Architecture Contract. No audit is run.

Output is consumed downstream by `arch-redesign` (cluster-mode and triage-mode) and `arch-spec`.

**Fitness function classification (Building Evolutionary Architectures vocabulary).** Every baseline finding arch-audit produces is a **static + automated** fitness function — a machine-checkable, source-derived guard on an architectural characteristic. **Dynamic** fitness functions (measured against a running system: latency, resilience under load) and **manual** ones (human-judged at a review gate) are out of scope for this runtime. This shared vocabulary aligns with `arch-spec`, which declares fitness functions citing the same canonical D9 principle ids that arch-audit findings reference via `reason.principle`.

## Out of scope

- Semantic principle analysis (SSoT, OCP, LSP, silent-fallback-prohibition) — not statically detectable. Belongs to code review (human / AI agent).
- Translation boundary / Anti-Corruption Layer between subsystems with different semantics — a semantic concern: a dependency graph cannot detect a «semantic mismatch» across the boundary. Belongs to code review / arch-spec territory.
- Code-level checks (style, typing, lint rules) — eslint / prettier / tsc territory.
- Dependency hygiene (unresolvable imports, deprecated packages) — standalone `depcruise --validate` + `npm audit`.
- Security scans, performance profiling, integration testing.
- Authoring architectural principles — the D9 library is imported from industry; the skill reads it, does not create it.
- Project-wide ARCHITECTURE.md maintenance — outside this audit runtime. arch-audit produces reports/rules evidence; explicit document maintenance or the relevant Hi-Flow architecture phase consumes that evidence.
- Making architecture decisions or silently promoting current code to target truth. The observed graph is evidence only; target-contract changes require an explicit rules-patch apply.
- Onboarding tooling setup — separate family mechanism.

## Anti-triggers (do NOT auto-activate)

- «давай починим архитектуру», «спроектируем фикс» — that's `arch-redesign`.
- «давай спроектируем фичу X», «дизайн новой фичи» — that's `feature-spec` or `arch-spec`.
- «найди баги», «code review» — other tools.
- «проверь стиль кода», «запусти линтер» — eslint, not arch-audit.
- «security audit», «найди уязвимости» — other scanners (Snyk etc.).

## Mode selection

The skill always runs when invoked — no skip option for the audit itself. (Skipping individual pending patches in Session intro is a separate mechanism, not a skip of the skill.)

Mode is determined by trigger form:

- Trigger without an explicit path → **full mode**.
- Trigger `arch-audit apply-patch <path>` → **apply-patch mode**.
- Trigger `arch-audit apply-patch` without a path → ask: «Укажи path к patch файлу.» Do not fall back to full mode.

There is no auto-selection — both modes are signaled explicitly by the trigger.

## Common Rationalizations

| Thought | Reality |
|---|---|
| «Я и так знаю где архитектурные проблемы, audit избыточен» | Code review misses structural problems. Within its scope arch-audit is exhaustive — if a structural problem exists, it's in the report. Run it. |
| «Запущу arch-redesign напрямую, без audit» | arch-redesign cluster-mode without D8-compliant findings hallucinates clustering. Pre-condition is not bypassable. |
| «Pending patches от прошлой сессии можно проигнорировать» | An audit without them shows state without contract deltas already designed. Apply before audit, or skip explicitly with a warning in the report. |
| «Раз текущий код так устроен, значит это и есть целевая архитектура» | Нет. Current code is the observed graph, not target truth. Violations become findings / Active Issues / Accepted Drift, never silent contract edits. |

---

## Full mode

### Session intro — pending patches

Before the audit, check for unapplied rules-patches. They are candidate Target Architecture Contract deltas. Look for files matching `*-rules-patch.yaml` in `<project>/docs/superpowers/specs/` and exclude any already present in `<project>/audit-report/applied-patches/`.

If pending patches exist, show the operator:

> Запускаю audit для проекта `<project>`.
>
> Найдено N pending rules-patches от прошлых сессий arch-redesign / arch-spec:
> - `<path1>` (M правил)
> - `<path2>` (K правил)
>
> Apply перед audit'ом? Рекомендую да — иначе audit покажет состояние без учёта этих правил.
>
> 1. Apply все
> 2. Apply selectively (укажи какие)
> 3. Skip — audit с текущими project rules как есть (в `audit-report.md` будет warning о N skipped pending patches)

After the choice:
- (1) or (2) → apply via apply-patch logic (below), then continue. Each applied patch is archived per the apply-patch flow (move to `<project>/audit-report/applied-patches/`).
- (3) → continue with current rules; add a warning about N skipped pending patches to the `audit-report.md` header.

If there are no pending patches, this step is silent — proceed to stack detection.

### Stack detection

Auto-detect by structural project signals, in priority order:

- `package.json` + `tsconfig.json` → typescript-depcruise adapter.
- `package.json` without tsconfig → javascript-depcruise (same adapter, separate flag).
- `pyproject.toml` / `requirements.txt` → python adapter (not implemented in v1).
- `pom.xml` / `build.gradle` → java adapter (not implemented in v1).

Do **not** read `PROJECT_META.md` — it's an operator-personal artifact, unavailable in the distributed plugin.

**Recovery flow.** If multiple stacks are detected (polyglot) or none are detected — interactive prompt:

> Stack не определён в `<project-path>`. Не нашёл признаков:
> - package.json + tsconfig.json (TS) / package.json (JS)
> - pyproject.toml / requirements.txt (Python — adapter не реализован v1)
> - pom.xml / build.gradle (Java — adapter не реализован v1)
>
> Действия:
> 1. Указать workspace root (например, `frontend/` если monorepo)
> 2. Указать stack явно (typescript / javascript)
> 3. Stack не поддерживается v1 — abort
> 4. Это не код — abort

After recovery — re-run auto-detect on the supplied path. A second failure → hard fail.

### Tool availability

Check depcruise from the installed `arch-audit` skill directory:
```
npm run depcruise:version
```
- Success → continue.
- Fail → hard fail with: «depcruise недоступен в runtime `arch-audit`. Подними зависимости в установленном каталоге skill и повтори запуск.»

After version is detected, run preflight check (`core/preflight.ts → checkDepcruiseVersion`) against `requiredTooling[0]` from the adapter (currently `>= 16.0.0 < 18.0.0`; v16 and v17 explicitly tested). Out-of-range version → hard fail with downgrade/upgrade instructions per Q-1.5.

### Generate config + run depcruise

Helper `generate-depcruise-config.js`:
- Reads the machine-checkable Target Architecture Contract: baseline rules (Layer A — 3 built-ins) + project rules (`<project>/.audit-rules.yaml`, if present).
- Converts the wrapping YAML format into native depcruise CJS config.
- Output: temporary `.dependency-cruiser.cjs` in the working directory.

**`overrides.profile` (frontend | backend) — optional.** Явно объявляет тип дерева для слоевого governance. `frontend` → активирует frontend layered-правила (`frontend-layered-respect` / `frontend-layer-cycle`), backend layered + port-adapter пропускаются. `backend` → принудительно backend-профиль даже при наличии папок `components`/`hooks` (escape hatch). Не указано → fallback на литеральную эвристику (≥2 из `components/hooks/pages/features`). Для feature-sliced раскладок с кастомными именами слоёв декларация обязательна (+ `overrides.layer_aliases` для маппинга имён на слои). Авто-детект раскладки сознательно не делается — «слой или слайс» статически неоднозначно. См. `docs/superpowers/specs/2026-06-06-hi_flow-frontend-slice-governance-amendment-design.md`.

The full audit command invokes this internally through the bundled runtime dependency:
```
node ./node_modules/dependency-cruiser/bin/dependency-cruise.mjs --output-type json --config <temp-config> src/
```
- Capture stdout (JSON) + stderr.
- Timeout: 60s default, tunable via project rules.
- Project-local `dependency-cruiser` is intentionally ignored: a broken audited project must not block `arch-audit` snapshot refresh.

### Parse + normalize

Helper `parse-depcruise-output.js`:
- Parse JSON.
- Map violations → D8 findings via `enrich-findings` (depcruise `error` → D8 `HIGH`, or `CRITICAL` if promoted; `warn` → `MEDIUM`; `info` → `LOW`).
- Map modules → D8 `metrics.dep_graph` + `metrics.per_module`. This is the observed graph generated from code for this audit run; never edit it by hand and never treat it as target architecture.

Helper `compute-nccd.js` computes NCCD from dep_graph (depcruise does not emit it directly).

### Apply structural detection (core, not adapter)

Detection algorithms live in `core/` (stack-agnostic). The adapter supplies stack-specific constants: `channelSdkList`, `layerNamingMap`, `defaultModulePattern`. (Note: the layered + frontend-layered detection currently lives in the adapter's `detectStructural`, not `core/` — a pre-existing core/adapter divergence, not resolved in this scope.)

Checks:
- **Layered detection** — closed list of layer names + adapter-provided alias map. A second, **frontend** layer vocabulary (`pages → features → components → hooks → data-access → lib`) applies when the run is frontend-profiled — declared `overrides.profile: frontend`, or (fallback) ≥2 of `components/`, `hooks/`, `pages/`, `features/`; `overrides.profile: backend` opts out. In that case the backend layered rules are skipped (mutual exclusion, avoids false positives on `api/`/`app/`/`services/`).
- **Hub-like / god-object detection** — based on computed Ca/Ce/LOC.
- **Vertical-slice detection** — when feature folders are detected.
- **Channel SDK detection** — when a domain layer is detected; SDK list comes from the adapter.

### Apply suppression precedence

Helper `core/suppression.ts`. Rules with more specific semantics suppress general informational findings on the same import edge:

1. CRITICAL: `architectural-layer-cycle`, `frontend-layer-cycle`.
2. HIGH: `god-object`, `dependency-hub`, `inappropriate-intimacy`, `nccd-breach`, `no-circular`, `not-to-test-from-prod`.
3. MEDIUM: `layered-respect`, `frontend-layered-respect`, `port-adapter-direction`, `vertical-slice-respect`, `domain-no-channel-sdk`, `high-fanout`, `no-orphans`.
4. LOW (suppressed by higher): `cross-module-import-info`.

Algorithm: for each LOW finding (`cross-module-import-info`) — match by key `(source.module, target.module)`; if any finding with the same key has higher severity → suppress the LOW one.

### Build artifacts — two-phase

Cluster prose is LLM-generated by the skill agent, the rest is deterministic. To keep these concerns separate, build runs in two phases:

**Phase 1 — data assembly (deterministic):**

```
npm run audit -- [--out-dir <path>] <project-root> [d9-md-path]
```

`--out-dir` overrides the default output location (`<project-root>/audit-report/`). Use it on projects that already have tooling writing to `audit-report/` (e.g. legacy `depgraph-audit.mjs` baselines + patches ledgers) to avoid namespace collision — pass something like `<project-root>/arch-audit-report/`.

Produces:
- `<project>/audit-report/audit-report.json` — D8-compliant structured data (full schema: `references/d8-schema.json`).
- `<project>/audit-report/clusters-input.json` — for each cluster: principle id, finding ids, affected modules. Input contract for prose generation.

**Phase 1.5 — prose generation (LLM, agent-side):**

Read `clusters-input.json`. For each principle id, generate a `name` (short cluster label, ≤6 words) and `root_cause` (2–4 sentence diagnosis grounded in the listed findings + modules + D9 principle). Write to `<project>/audit-report/cluster-prose.json`:

```json
{
  "<principle-id>": { "name": "...", "root_cause": "..." },
  ...
}
```

**Phase 2 — markdown rendering (deterministic):**

```
npm run render-md -- \
  <project>/audit-report/audit-report.json \
  <project>/audit-report/cluster-prose.json \
  [d9-md-path]
```

Produces `<project>/audit-report/audit-report.md`.

**Why split:** the deterministic parts (graph, metrics, findings, mermaid) and the LLM part (prose) have separate authors and separate failure modes. A single-shot pipeline either makes prose generation impossible (no LLM in Node runtime) or hides the boundary (silent fallback prose). Two-phase makes the contract explicit.

Mermaid diagrams (project overview, foundation, layered, per-cluster) are generated by `helpers/generate-mermaid.ts` from `audit-report.json`. Edge styling and `classDef` follow the conventions in `references/audit-report-template.md` and `references/self-review-checklist.md` (Group 3): cycles bold red, CRITICAL red dashed, HIGH/MEDIUM boundary orange, default light gray, hub modules pink fill.

Markdown structure: header, severity roll-up, project dependency graph (Mermaid, focused view excluding foundation modules), foundation diagram (conditional), layered diagram (conditional, with explicit «not detected» negative case), module metrics table, findings, cluster suggestions with per-cluster mini-graphs.

**Cluster suggestions are hybrid:** structure (which findings group together) is deterministic (by `reason.principle` + module overlap). Prose (cluster name + root cause wording) is LLM-generated. Acceptable trade-off: reproducibility at the structure level, prose acceptably variable.

### LLM ↔ deterministic-code boundary

**Deterministic (helpers + Bash):** running depcruise, parsing output, computing metrics (Ca/Ce/I/NCCD/LOC), severity normalization, suppression, Mermaid generation, patch validation/merge, D8 schema validation, cluster grouping structure.

**LLM (skill agent):** cluster prose description (name + root cause), notes for operator, dialogue (pending prompts, recovery flow, transition), Self-Review judgment.

The boundary: where data is structured and the transformation is formal → code. Where human-readable explanation or judgment is needed → LLM.

### Self-Review via isolated subagent

After artifacts are built — Self-Review by a subagent with isolated context. Conversation history is **not** passed (the main agent is immersed in the content and prone to confirmation bias).

Pass the subagent these paths:
- `audit-report.json`
- `audit-report.md`
- `references/d8-schema.json`
- `hi_flow/references/architectural-principles.md` (D9 library)
- `references/baseline-rules.md`
- project root

The subagent first declares available tools (jq, ajv-cli, mmdc, git) — for understanding validation depth.

Full checklist — `references/self-review-checklist.md`. Seven groups:

1. D8 schema compliance.
2. Internal consistency (cross-checks finding ↔ dep_graph, recompute Ca/Ce/I, suppression precedence).
3. Markdown report quality (Mermaid syntax, edge styling, conditional sections).
4. Coverage (forward + reverse, suppression-aware).
5. Format compliance.
6. Prohibited content (emoji, placeholders, sensitive paths, internal usernames).
7. JSON ↔ MD consistency.

### Apply fixes inline (categorized)

- **Safe-to-autofix** — typos, formatting, missing default fields, severity capitalization. Subagent applies inline.
- **Human-required** — structural changes, Mermaid edges/nodes (cascading), severity changes, cluster regrouping. Flag for the operator at the User Review Gate.
- **Lightweight verification pass** — if safe-to-autofix > 5 fixes OR there are human-required findings, re-run only Group 2 (consistency) after fixes.

### User Review Gate

> Audit report для проекта `<project>` готов:
> - JSON: `<path>/audit-report.json`
> - Markdown: `<path>/audit-report.md` (открой в Cursor/VS Code с Mermaid extension или на GitHub)
>
> Найдено: X CRITICAL, Y HIGH, Z MEDIUM, W LOW. Auto-grouped в M кластеров.
>
> [Если был skip pending patches:] Warning: N pending rules-patches не applied. Для актуальной картины — apply через `arch-audit apply-patch <path>` и перезапусти audit.
>
> Прочитай и дай знать, если хочешь правки или уточнения до перехода к arch-redesign / arch-spec.

Wait for the response. On edits — apply via the safe-to-autofix category + lightweight verification pass through the subagent. Only after approval — close.

### Project State at closure

After the operator approves or closes the audit report, update `PROJECT_STATE.md` through `hi_flow:project-state`:

- current phase: `arch-audit completed`;
- last completed: `audit-report.json` and `audit-report.md` paths;
- ready next: `hi_flow:arch-redesign`, `hi_flow:arch-spec`, or the operator-approved stop;
- latest verification: audit command/result and self-review status;
- blockers/open items: only current audit blockers, unapplied patches explicitly skipped, or follow-up choices.

If `PROJECT_STATE.md` is missing, create it from the `hi_flow:project-state` template.

### Transition offer

> Audit готов. Что дальше:
>
> 1. Запустить `arch-redesign` для триажа кластеров и refactor planning. Рекомендуется если ≥3 distinct clusters или есть CRITICAL findings.
> 2. Закрыть — вернёмся к audit'у позже. JSON остаётся как input для будущих arch-redesign / arch-spec сессий.

Do not chain automatically. Wait for the operator's choice.

---

## Apply-patch mode

Validate + merge a rules-patch into the project rules file. This is the only mode where `arch-audit` changes the machine-checkable Target Architecture Contract. No audit is run.

Trigger: `arch-audit apply-patch <path>`, or invoked from full-mode Session intro on detection of unapplied patches.

### Validation checks (hard fail on any failure)

- **Syntax validity** — YAML parses, structure matches the rules-format.
- **Principle reference exists** — every `principle:` field references an existing canonical id in the D9 library (`hi_flow/references/architectural-principles.md`).
- **Name uniqueness** — rule names from the patch do not collide with already-applied names in the project rules.
- **Severity is valid** — value from the enum `{CRITICAL, HIGH, MEDIUM, LOW}`.
- **Path patterns valid** — regexes in `from.path` / `to.path` parse.
- **No circular suppression** — the patch does not try to suppress a rule it itself references.

### Hard fail handling

On validation failure the patch is **not applied**. The error report contains actionable instructions:

> ERROR: patch `<path>` validation failed.
>
> Rule `<rule-name>` references principle `<principle-id>`, which does not exist in D9 library.
>
> Возможные действия:
>
> 1. Использовать существующий принцип. Closest matches в D9: `<list>`. Отредактируй patch, чтобы ссылался на один из них.
> 2. Добавить новый принцип в D9. Если `<principle-id>` действительно отсутствует и статически детектируется:
>    - Edit `hi_flow/references/architectural-principles.md` (entry в canonical format).
>    - Run `npm run regenerate-principles-index -- <md-path>` only after the D9 edit is complete and the local runtime is healthy.
>    - Re-run `arch-audit apply-patch <path>`.
> 3. Если не статически детектируется. Принцип принадлежит semantic-only category (out of D9 scope). Переформулируй rule на existing static principle, или не добавляй rule.

**Rationale for hard fail:** the patch is generated automatically by arch-redesign / arch-spec — if it contains an error, that's **their** bug. Forced feedback loop into the right place beats workarounds inside audit.

### Successful merge flow

On validation success — atomic ordering: **merge first, on success — archive**. If the merge fails on write, the patch stays in place and archive does not run.

- Helper `helpers/cli-apply-patch.ts` orchestrates validate → merge → archive.
- Merge writes to the project rules file (`<project>/.audit-rules.yaml`), the project-local contract layer.
- On success — move the patch file into archive: `<project>/audit-report/applied-patches/<date>-<original-name>.yaml`. Not deleted — non-destructive default; git history holds the full audit trail.
- Returns success report:

> Patch applied: N rules added, M rules updated. Project rules файл обновлён. Patch заархивирован в `<archive-path>`.

**CLI:**

```
npm run apply-patch -- <patch-path> [project-root] [d9-md-path]
```

Defaults: `project-root` = current working directory; `d9-md-path` resolves to the bundled `hi_flow/references/architectural-principles.md`. On hard validation fail — non-zero exit + actionable diagnostics on stderr; patch stays in place.

### D9 evolution mechanism

- **v1 (current environment):** manual markdown edit + regenerate JSON index. Not an automated command — protection against lazy expansion.
- **Market-ready:** GitHub issue + PR to the public hi_flow repo. Maintainer review → merge → new plugin release with extended D9.

---

## Stack adapter pattern (overview)

The skill is split into a **stack-agnostic core** (reads D9 + baseline rules, validation, detection algorithms, suppression, artifact assembly) and a **stack-specific adapter** (per-language tooling integration). v1 ships a single adapter, `typescript-depcruise.ts`.

**The boundary (important):** detection algorithms live in core. The adapter only supplies stack-specific data (testFilePatterns, channelSdkList, layerNamingMap, defaultModulePattern) and tooling-specific methods (buildDepGraph, computeMetrics, validatePatch, mergePatch). The adapter does not own detection algorithms.

Full adapter interface — see the design spec and the implementation plan.

---

## Output schema reference

### audit-report.json

D8-compliant structured data. Full schema — `references/d8-schema.json`. Top-level fields:

- `metadata` — `audit_sha`, `audit_timestamp`, `audit_tooling_version`, `schema_version`.
- `findings[]` — `id`, `rule_id`, `type`, `severity`, `source.{module,file}`, `target.{module,file}`, `reason.{principle,explanation}`, `extras`.
- `metrics` — `per_module.{Ca,Ce,I,A,D,LOC}`, `nccd`, `nccd_threshold`, `severity_counts`, `dep_graph`.

### audit-report.md

Section structure — see workflow «Build artifacts» above plus `references/audit-report-template.md` (template). Visual reference of a complete report — `examples/zhenka-audit-report-mock.md`.

---

## How to invoke (CLI)

The runtime is a Node.js package. The skill agent calls it via CLI during a full audit. It can also be run manually for debugging.

### Prerequisites

Run commands from the installed `arch-audit` skill directory. Required binaries must be available in that directory's `node_modules` (including `tsx` and `dependency-cruiser`). Supported depcruise majors: `16.x.x` and `17.x.x`.

### Run

```
npm run audit -- <project-root> [d9-md-path]
```

- `<project-root>` — absolute or relative path to the project being audited.
- `[d9-md-path]` — optional path to a custom D9 architectural-principles markdown file. Defaults to the bundled `hi_flow/references/architectural-principles.md`.

Output:
```
audit-report.json: <project-root>/audit-report/audit-report.json
audit-report.md:   <project-root>/audit-report/audit-report.md
```

### Example

```
npm run audit -- C:\path\to\project
```

---

## Deployment

The `arch-audit` runtime is intentionally self-contained: it uses its own installed dependencies instead of the audited project's `node_modules`. This prevents a broken project-local `dependency-cruiser` installation from blocking audit snapshot refresh.

---

## References

- `references/d8-schema.json` — JSON Schema for validators.
- `references/d8-schema.md` — markdown spec for D8 (canonical source — `hi_flow/skills/arch-audit/references/`; `arch-redesign` and `arch-spec` read from here).
- `references/baseline-rules.md` — canonical baseline rule set (3 built-in + 7 universal custom + 7 conditional structural = 17 rules, incl. `barrel-file` and the frontend layered pair), severity normalization, suppression precedence, override mechanism.
- `references/self-review-checklist.md` — seven-group checklist for the Self-Review subagent.
- `references/audit-report-template.md` — markdown template for header + sections.
- `hi_flow/references/architectural-principles.md` — D9 library (catalog of principles with typical fix alternatives; owned by this skill).
- `hi_flow/references/target-architecture-contract.md` — family-level ownership and SSoT rules for target contract vs observed graph.
- `examples/zhenka-audit-report-mock.md` — example of a complete `audit-report.md` for visual reference.
