---
name: arch-audit
description: Use when operator says «запусти arch-audit / проведём аудит архитектуры / проверь архитектуру проекта / arch-audit apply-patch <path>» or English equivalents. Produces audit-report.{json,md} for full mode, or merges a rules-patch in apply-patch mode.
---

# arch-audit

## Overview

Help the operator obtain a deterministic map of the project's structural architectural problems. The skill is an analytical scanner: static dependency-graph analysis and connectivity metrics, with no semantic judgment.

Two modes:

- **Full mode** (default) — full audit. Output: `audit-report.json` (D8-compliant — structured findings schema, see References) + `audit-report.md` (human-readable with Mermaid visualizations).
- **Apply-patch mode** — explicit command. Validate + merge a rules-patch (from `arch-redesign` or `arch-spec`) into the project rules file. No audit is run.

Output is consumed downstream by `arch-redesign` (cluster-mode and triage-mode) and `arch-spec`.

## Out of scope

- Semantic principle analysis (SSoT, OCP, LSP, silent-fallback-prohibition) — not statically detectable. Belongs to code review (human / AI agent).
- Code-level checks (style, typing, lint rules) — eslint / prettier / tsc territory.
- Dependency hygiene (unresolvable imports, deprecated packages) — standalone `depcruise --validate` + `npm audit`.
- Security scans, performance profiling, integration testing.
- Authoring architectural principles — the D9 library is imported from industry; the skill reads it, does not create it.
- Project-wide ARCHITECTURE.md management — separate `architecture` skill.
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
| «Pending patches от прошлой сессии можно проигнорировать» | An audit without them shows state without rules already designed. Apply before audit, or skip explicitly with a warning in the report. |

---

## Full mode

### Session intro — pending patches

Before the audit, check for unapplied rules-patches. Look for files matching `*-rules-patch.yaml` in `<project>/docs/superpowers/specs/` and exclude any already present in `<project>/audit-report/applied-patches/`.

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

Check depcruise:
```
npx --no-install dependency-cruiser --version
```
- Success → continue.
- Fail → try `npx --yes dependency-cruiser --version` (npx will install/cache itself).
- Second failure → hard fail with: «depcruise недоступен. Установи: `npm install -g dependency-cruiser` или `npm install -D dependency-cruiser`.»

### Generate config + run depcruise

Helper `generate-depcruise-config.js`:
- Reads baseline rules (Layer A — 3 built-ins) + project rules (`<project>/.audit-rules.yaml`, if present).
- Converts the wrapping YAML format into native depcruise CJS config.
- Output: temporary `.dependency-cruiser.cjs` in the working directory.

Run:
```
npx --yes dependency-cruiser --output-type json --config <temp-config> src/
```
- Capture stdout (JSON) + stderr.
- Timeout: 60s default, tunable via project rules.

### Parse + normalize

Helper `parse-depcruise-output.js`:
- Parse JSON.
- Map violations → D8 findings via `normalize-severity.js` (depcruise `error` → D8 `HIGH`, or `CRITICAL` if promoted; `warn` → `MEDIUM`; `info` → `LOW`).
- Map modules → D8 `metrics.dep_graph` + `metrics.per_module`.

Helper `compute-nccd.js` computes NCCD from dep_graph (depcruise does not emit it directly).

### Apply structural detection (core, not adapter)

Detection algorithms live in `core/` (stack-agnostic). The adapter supplies stack-specific constants: `channelSdkList`, `layerNamingMap`, `defaultModulePattern`.

Checks:
- **Layered detection** — closed list of layer names + adapter-provided alias map.
- **Hub-like / god-object detection** — based on computed Ca/Ce/LOC.
- **Vertical-slice detection** — when feature folders are detected.
- **Channel SDK detection** — when a domain layer is detected; SDK list comes from the adapter.

### Apply suppression precedence

Helper `apply-suppression.js`. Rules with more specific semantics suppress general informational findings on the same import edge:

1. CRITICAL: `architectural-layer-cycle`.
2. HIGH: `god-object`, `dependency-hub`, `inappropriate-intimacy`, `nccd-breach`, `no-circular`, `not-to-test-from-prod`.
3. MEDIUM: `layered-respect`, `port-adapter-direction`, `vertical-slice-respect`, `domain-no-channel-sdk`, `high-fanout`, `no-orphans`.
4. LOW (suppressed by higher): `cross-module-import-info`.

Algorithm: for each LOW finding (`cross-module-import-info`) — match by key `(source.module, target.module)`; if any finding with the same key has higher severity → suppress the LOW one.

### Build artifacts

`core/report-builder` produces:
- `<project>/audit-report/audit-report.json` — D8-compliant structured data (full schema: `references/d8-schema.json`).
- `<project>/audit-report/audit-report.md` — human-readable.

Helper `generate-mermaid.js` deterministically generates Mermaid diagrams (project overview, foundation, layered, per-cluster) from `audit-report.json`. Not LLM. The script embeds Mermaid blocks into the template at `references/audit-report-template.md`.

Markdown structure: header, scope reminder, severity roll-up table, project dependency graph (Mermaid), foundation diagram (if hidden utilities exist), layered diagram (if detected), module metrics table, findings grouped by severity with per-cluster mini-graphs, cluster suggestions, notes for operator.

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

### Transition offer

> Audit готов. Что дальше:
>
> 1. Запустить `arch-redesign` для триажа кластеров и refactor planning. Рекомендуется если ≥3 distinct clusters или есть CRITICAL findings.
> 2. Закрыть — вернёмся к audit'у позже. JSON остаётся как input для будущих arch-redesign / arch-spec сессий.

Do not chain automatically. Wait for the operator's choice.

---

## Apply-patch mode

Validate + merge a rules-patch into the project rules file. No audit is run.

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
>    - Run `npx tsx hi_flow/skills/arch-audit/helpers/regenerate-principles-index.js`.
>    - Re-run `arch-audit apply-patch <path>`.
> 3. Если не статически детектируется. Принцип принадлежит semantic-only category (out of D9 scope). Переформулируй rule на existing static principle, или не добавляй rule.

**Rationale for hard fail:** the patch is generated automatically by arch-redesign / arch-spec — if it contains an error, that's **their** bug. Forced feedback loop into the right place beats workarounds inside audit.

### Successful merge flow

On validation success — atomic ordering: **merge first, on success — archive**. If the merge fails on write, the patch stays in place and archive does not run.

- Helper `merge-rules-patch.js` applies the patch into the project rules file (`<project>/.audit-rules.yaml`).
- On success — move the patch file into archive: `<project>/audit-report/applied-patches/<date>-<original-name>.yaml`. Not deleted — non-destructive default; git history holds the full audit trail.
- Returns success report:

> Patch applied: N rules added, M rules updated. Project rules файл обновлён. Patch заархивирован в `<archive-path>`.

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

## References

- `references/d8-schema.json` — JSON Schema for validators.
- `references/d8-schema.md` — markdown spec for D8 (canonical source — `hi_flow/skills/arch-audit/references/`; `arch-redesign` and `arch-spec` read from here).
- `references/baseline-rules.md` — canonical baseline rule set (3 built-in + 6 universal custom + 5 conditional structural = 14 rules), severity normalization, suppression precedence, override mechanism.
- `references/self-review-checklist.md` — seven-group checklist for the Self-Review subagent.
- `references/audit-report-template.md` — markdown template for header + sections.
- `hi_flow/references/architectural-principles.md` — D9 library (catalog of principles with typical fix alternatives; owned by this skill).
- `examples/zhenka-audit-report-mock.md` — example of a complete `audit-report.md` for visual reference.
