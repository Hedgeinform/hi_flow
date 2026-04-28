# `hi_flow:arch-audit` — Skill Design

**Status:** design v1, ready for Russian SKILL.md drafting → operator review → English final.
**Date:** 2026-04-28.
**Family:** `hi_flow` — семейство скиллов методологии Three-Phase Flow для solo-founder + AI разработки.
**Sibling skills:** `hi_flow:arch-redesign` (BUILT, downstream consumer), `hi_flow:arch-spec` (planned, downstream consumer), `hi_flow:feature-spec` (BUILT, sibling Phase 1).
**Architectural anchors:** D7 (Phase 2 family split), D8 (audit reason-field contract), D9 (shared library of architectural principles), D11 (project rules ownership), OQ6 (decoupling for market-ready), OQ7 (tooling onboarding parking).

---

## 1. Назначение и scope

### Что делает skill

Project-level **аналитический** скилл. Производит детерминированную карту структурных архитектурных проблем проекта на основе статического анализа графа зависимостей и метрик связности.

Двухрежимный:

- **Full mode** (по умолчанию) — полный аудит проекта. Производит `audit-report.json` (D8-compliant structured data) + `audit-report.md` (human-readable с Mermaid визуализациями).
- **Apply-patch mode** — explicit команда: validate + merge rules-patch (от arch-redesign / arch-spec) в project rules-файл. Не делает audit.

### Что НЕ делает (явно out of scope)

- Не делает **семантический анализ**. Принципы типа SSoT, OCP, LSP, silent-fallback-prohibition — out of scope. Они каноничны в индустрии, но статически не детектируются. Для них — code review (человек / AI агент), специализированные сканеры.
- Не делает **code-level checks** (style, linter rules, type safety). Это работа eslint / prettier / typescript compiler.
- Не делает **dependency hygiene checks** (unresolvable imports, deprecated packages, deps in devDependencies). Это работа стандартного `npx depcruise --validate` + `npm audit`.
- Не делает **security scans** (secrets, vulnerabilities, injection paths). Это работа Snyk / SAST / secret scanners.
- Не **создаёт архитектурные принципы** — импортирует из индустрии (SOLID, Martin's Package Principles, Hexagonal/Cockburn, structural classics + LoD). См. D9.
- Не **управляет project-wide ARCHITECTURE.md** — это скилл `architecture` (в текущей среде оператора) или эквивалент в market-ready версии.
- Не **enforces** Phase 3 — bail conditions встроены в design docs от arch-redesign, не в arch-audit.
- Не **gatekeep'ит** на input validation — input validation = техническая проверка наличия валидных данных (см. секцию 2, «Входные условия»).
- Не **подменяет линтеры и соседние tools** — рекомендует параллельное использование через scope reminder в audit-report.md (см. секция 8).
- Не **предлагает onboarding tooling setup** — это отдельный механизм семейства, парковано как OQ7.

### Парковано

- Дополнительные режимы: `quick` (skip метрик), `targeted` (subset модулей), `incremental` (с прошлого audit_sha). Добавятся при empirical боли. Use cases описаны в секции 11.
- AST-based checks для `interface-segregation` и `law-of-demeter` (chain analysis на code-level). Требуют integration AST tooling beyond depcruise.
- Multi-stack одновременный аудит (полиглот-проекты).
- `no-deep-internal-import` rule (требует barrel/index discipline detection).
- Reproducibility / deterministic finding ids design — TBD после первого боевого прогона.
- Markdown size limit + Mermaid дополнительные caps — magic numbers без empirical baseline.

### Ценность скилла (value proposition)

arch-audit — **детерминированный сканер структурных архитектурных проблем**. Делает накапливающийся технический долг **видимым и измеримым**, даёт ground truth для дальнейшего refactor'а через arch-redesign и arch-spec.

**Что это даёт:**
1. **Объективность вместо субъективного впечатления.** Code review может пропустить структурную проблему. arch-audit на своём scope **исчерпывающий**: если структурная проблема есть — она в отчёте.
2. **Воспроизводимость и трекаемость.** Запустил сегодня, через месяц — видишь дельту в числах, не «ощущениях».
3. **Делает архитектурный долг видимым** до того как он становится болью.
4. **Освобождает code review для семантики** — машина закрывает структурный layer, человек/AI фокусируется на смысле.
5. **Ground truth для всего семейства hi_flow** — arch-redesign и arch-spec строятся на D8 reason-полях.

**Что НЕ заменяет:** семантические проверки, security audit, performance profiling, integration testing.

### Стратегическая позиция

`arch-audit` — **upstream обоих consumer'ов** (arch-redesign + arch-spec) в Phase 2. Без него:
- arch-redesign cluster-mode работает на LLM-эвристиках вместо structured reason-полей → риск галлюцинаций.
- arch-spec не имеет baseline для прогресса (нет before/after).

Также — **единственный скилл семейства со встроенным actionable knowledge** (baseline rule set + D9 library). Остальные — workflow skills. Это normal для аналитического скилла: оператор-продуктолог не курирует industry architectural canon, нужна industry-imported foundation.

### Входные условия (input validation)

**Концептуальная рамка.** Скилл не gatekeeper. Если controller активировал arch-audit, скилл всегда выполняется. Но **проверяет входные условия** — без detected stack и доступного tooling он не может производить осмысленный output.

**Двухуровневая модель валидации:**

| Уровень | Что проверяется | Что делаем |
|---|---|---|
| **1. Stack detection** | Detected supported stack по структурным признакам проекта | recovery flow (см. секция 4) или hard fail |
| **2. Tool availability** | depcruise доступен через `npx --no-install` или может быть установлен через `npx --yes` | hard fail с install instructions если не получается |

Pending patches от прошлых сессий arch-redesign / arch-spec не блокируют запуск, но **обязательно prompt'ятся** в session intro (см. секция 3.1).

### Выходные артефакты

- **Audit report (full mode):**
  - `<project>/audit-report/audit-report.json` — D8-compliant structured data.
  - `<project>/audit-report/audit-report.md` — human-readable с Mermaid визуализациями.
- **Patch merge result (apply-patch mode):**
  - Updated `<project>/<project-rules-file>` (например, `docs/project/dependency_rules.yaml`).
  - Validation report (success / fail с конкретными errors).

---

## 2. Активация и mode selection

### Триггеры активации (explicit-only)

Skill **не** активируется автоматически. Только по explicit запросу оператора:

- «запусти arch-audit», «давай проведём аудит архитектуры», «проверь архитектуру проекта».
- «run arch-audit», «audit project architecture», «check architectural health».

Apply-patch mode — отдельный trigger:
- «arch-audit apply-patch <path>», «применяй patch <path>», «apply pending patches».

### Anti-triggers (не активируется автоматически)

Per Anti-Pattern 4 — анти-триггеры полезны для near-miss disambiguation:

- «давай починим архитектуру», «спроектируем фикс» — это `arch-redesign`, не audit.
- «спроектируем фичу», «дизайн новой фичи» — это `feature-spec` или `arch-spec`.
- «найди баги», «code review» — это work для других tools, не arch-audit.
- «проверь стиль кода», «запусти линтер» — это eslint, не arch-audit.
- «security audit» — это другие сканеры (Snyk, etc.), не arch-audit.

### Mode selection

Mode selection **не auto** — определяется по форме trigger'а:

- Trigger без явного path → **full mode**.
- Trigger вида «apply-patch <path>» → **apply-patch mode**.

Per Anti-Pattern 3 — skill **всегда выполняется** когда вызван. Skip как опция отсутствует.

---

## 3. Full mode workflow

### 3.1. Session intro (start-of-session)

Перед основным audit'ом скилл проверяет наличие unapplied rules-patches от прошлых сессий:

```
Запускаю audit для проекта <project>.

Найдено N pending rules-patches от прошлых сессий arch-redesign / arch-spec:
- <path>/2026-04-27-cluster-channel-agnostic-rules-patch.yaml (3 правила)
- <path>/2026-04-27-cluster-dispatcher-pipeline-rules-patch.yaml (5 правил)

Apply перед audit'ом? Рекомендую да — иначе audit покажет состояние без учёта этих правил.

1. Apply все
2. Apply selectively (укажи какие)
3. Skip — audit с текущими project rules как есть (в audit-report будет warning о N skipped pending patches)
```

После выбора:
- (1) или (2) → apply selected patches через apply-patch logic (см. секция 5), then continue.
- (3) → continue с current project rules; в `audit-report.md` шапку добавляется warning.

Если pending patches нет — этот шаг пропускается, переходим к шагу 3.2.

### 3.2. Stack detection

См. секция 4 (Stack adapter pattern). Detect'ит stack автоматически. Если успешно — переход к шагу 3.3. Если нет — recovery flow.

### 3.3. Generate depcruise config

Adapter генерирует config через helper-script (см. секция 5).

### 3.4. Run depcruise + parse output

Adapter запускает depcruise, парсит output, нормализует в D8 schema (см. секция 5).

### 3.5. Apply structural detection

Adapter применяет:
- Layered detection (закрытый список имён слоёв).
- Hub-like / god-object detection (на основе computed Ca/Ce/LOC).
- Vertical-slice detection (если detected feature folders).
- Channel SDK detection (если detected domain layer).

### 3.6. Apply suppression precedence

Helper-script suppress'ит overlapping informational findings (см. секция 6).

### 3.7. Build artifacts

Core/report-builder собирает `audit-report.json` (D8-compliant). Helper-script `generate-mermaid.js` генерирует Mermaid diagrams для embedded в `audit-report.md`. Core строит финальный markdown.

### 3.8. Self-Review через изолированного субагента

См. секция 9. Передаются paths к artifacts + checklist + tools availability.

### 3.9. Apply fixes inline (categorized)

См. секция 9. Safe-to-autofix — apply, human-required — flag оператору.

### 3.10. User Review Gate

```
Audit report для проекта <project> готов:
- JSON: <path>/audit-report.json
- Markdown с визуализациями: <path>/audit-report.md (открой в Cursor/VS Code с Mermaid extension или на GitHub).

Найдено: N CRITICAL, N HIGH, N MEDIUM, N LOW. Auto-grouped в M кластеров.

[Если был skip pending patches на step 3.1:] Warning: N pending rules-patches не applied. Для актуальной картины — apply через arch-audit apply-patch <path> и перезапусти audit.

Прочитай и дай знать, если хочешь правки или уточнения до перехода к arch-redesign / arch-spec.
```

Скилл ждёт ответа. Если правки — applies через safe-to-autofix категорию + lightweight verification pass через subagent. Только после approval — закрытие сессии.

### 3.11. Transition offer

```
Audit готов. Что дальше:

1. Запустить arch-redesign для триажа кластеров и refactor planning. Рекомендуется если ≥3 distinct clusters or any CRITICAL findings.
2. Закрыть — вернёмся к работе с этим audit'ом позже. JSON остаётся как input для будущих arch-redesign / arch-spec сессий.
```

Скилл не chain'ит автоматически. Ждёт операторского выбора.

---

## 4. Stack adapter pattern

### Базовая идея

Скилл разделён на **stack-agnostic core** и **stack-specific adapters**. Это позволяет добавлять новые стеки (Python, Java) без переписывания core.

### Stack-agnostic core (общая логика)

- Чтение D9 library + baseline rule definitions.
- Layered detection (закрытый list имён директорий, alias map).
- Validation patch syntax (D8 schema compliance).
- Suppression precedence.
- Сборка `audit-report.json` по D8 schema.
- Сборка `audit-report.md` (human-readable, с Mermaid визуализациями).

### Stack-specific adapter (per-language tooling)

Каждый adapter обязан реализовать interface:

```typescript
interface StackAdapter {
  // identity (constants)
  name: string                              // "typescript-depcruise"
  version: string                           // adapter version + tooling version
  requiredTooling: ToolingRequirement[]    // ["dependency-cruiser >= 16.0"]

  // stack-specific data (constants)
  testFilePatterns: string[]                // ["*.test.ts", "*.spec.ts", "__tests__/*"]
  channelSdkList: string[]                  // ["telegraf", "express", ...]
  layerNamingMap: LayerMap                  // {"domain": "domain", "core": "domain", ...}
  defaultModulePattern: string              // "src/*/"

  // detection
  detect(projectPath): boolean
  identifyModules(projectPath): Module[]
  identifyEntryPoints(projectPath): string[]   // for no-orphans rule

  // analysis
  buildDepGraph(projectPath, ruleConfig): DepGraph
  computeMetrics(depGraph): Metrics
  detectViolations(depGraph, ruleConfig): Violation[]

  // config translation
  translateRulesToToolingConfig(baselineRules, projectRules): ToolingConfig

  // patch handling
  validatePatch(patchPath, currentRules): ValidationResult
  mergePatch(patchPath, currentRules): MergeResult

  // optional
  cleanup?(): void
}
```

### Stack detection (pure auto-detection)

При запуске scan структурных признаков проекта в порядке приоритета:

- `package.json` + `tsconfig.json` → typescript-depcruise.
- `package.json` без tsconfig → javascript-depcruise (тот же adapter, отдельный flag).
- `pyproject.toml` или `requirements.txt` → python-importlinter (когда будет).
- `pom.xml` или `build.gradle` → java-archunit (когда будет).

PROJECT_META.md **не читается** — operator-personal artifact, не доступен для распространяемого плагина.

### Recovery flow

Если detected несколько стеков (полиглот) или ничего не detected — interactive prompt:

```
Stack не определён в <project-path>. Не нашёл признаков:
- package.json + tsconfig.json (TS) / package.json (JS)
- pyproject.toml / requirements.txt (Python — adapter не реализован)
- pom.xml / build.gradle (Java — adapter не реализован)

Возможные действия:
1. Указать workspace root (например, frontend/ если monorepo).
2. Указать stack явно (typescript / javascript), если markers отсутствуют по custom build.
3. Stack не поддерживается v1 — abort. См. roadmap для статуса adapters.
4. Это вообще не код — abort.

Ответ:
```

После recovery попытки — повторный auto-detect на указанном path. Если повторно fail — hard fail.

### Файловая структура

```
hi_flow/skills/arch-audit/
├── SKILL.md                          # описание скилла, workflow, output format
├── adapters/
│   ├── typescript-depcruise.ts       # v1 — единственный adapter
│   ├── (future) python-importlinter.ts
│   ├── (future) java-archunit.ts
├── core/
│   ├── d9-loader.ts                  # читает architectural-principles.md
│   ├── baseline-rules.ts             # canonical baseline rule definitions
│   ├── d8-schema-validator.ts        # validates audit-report.json structure
│   ├── suppression.ts                # precedence rules
│   ├── report-builder.ts             # сборка audit-report.md из json
├── helpers/
│   ├── generate-depcruise-config.js
│   ├── parse-depcruise-output.js
│   ├── compute-nccd.js
│   ├── normalize-severity.js
│   ├── apply-suppression.js
│   ├── generate-mermaid.js
│   ├── regenerate-principles-index.js
│   ├── validate-rules-patch.js
│   └── merge-rules-patch.js
└── references/
    ├── d8-schema.json                # отдельный JSON file для validation tools
    ├── audit-report-template.md      # template шапки + sections
    └── ...
```

---

## 5. Runtime workflow & tool integration

Детальная механика взаимодействия adapter'а typescript-depcruise с depcruise tooling.

### Workflow (9 шагов)

**1. Setup & availability check.**
```
npx --no-install dependency-cruiser --version
```
- Если успех → step 2.
- Если fail → run `npx --yes dependency-cruiser --version` (npx сам install/cache, не требует ask-list).
- Если повторно fail → hard fail с инструкцией: «depcruise недоступен. Установи: `npm install -g dependency-cruiser` или `npm install -D dependency-cruiser`.»

**2. Generate depcruise config.** Helper `generate-depcruise-config.js`:
- Читает baseline rules (Слой A — 3 built-ins).
- Читает project rules файл (если есть).
- Конвертирует наш wrapping YAML format в depcruise native CJS config (filtering field `principle`, etc.).
- Output: temporary `.dependency-cruiser.cjs` в working dir, передаётся через `--config` flag.

**3. Run depcruise.**
```
npx --yes dependency-cruiser --output-type json --config <temp-config> src/
```
- Captures stdout (JSON) + stderr (errors).
- Timeout: default 60 секунд, tunable через project rules.

**4. Parse + normalize output.** Helper `parse-depcruise-output.js`:
- Parse JSON.
- Map violations → D8 findings (с severity normalization через `normalize-severity.js`).
- Map modules → D8 `metrics.dep_graph` + `metrics.per_module`.

**5. Compute extra metrics.** Helper `compute-nccd.js` — depcruise не считает NCCD напрямую, считаем сами из dep_graph.

**6. Apply structural detection** (выполняется в **core/** через `core/baseline-rules.ts` + `core/suppression.ts`; **adapter предоставляет constants** через `channelSdkList`, `layerNamingMap`, `defaultModulePattern`):
- Layered detection (закрытый list имён слоёв + adapter-provided alias map).
- Hub-like / god-object detection (на основе Ca/Ce/LOC, computed в шаге 5).
- Vertical-slice detection.
- Channel SDK detection (используя `channelSdkList` adapter'а).

> **Граница adapter ↔ core (важно):** detection algorithms живут в core (stack-agnostic). Adapter предоставляет **stack-specific data** (списки имён, SDK, patterns). Это решает развилку F1 из spec self-review — detection это core's job с adapter-provided data, не adapter's job целиком.

**7. Apply suppression precedence.** Helper `apply-suppression.js`:
- Iterate findings.
- Для каждого LOW finding (`cross-module-import-info`) — find matching key (source.module, target.module).
- Если есть finding с тем же key и более высокой severity — suppress LOW finding.

**8. Build artifacts.** core/report-builder:
- `audit-report.json` (D8-compliant).
- helper `generate-mermaid.js` генерирует Mermaid diagrams.
- core embeds Mermaid в template из `references/audit-report-template.md` → `audit-report.md`.

**9. Self-Review subagent → User Review Gate → Transition offer.** См. секции 9, 3.10, 3.11.

### Helper-scripts inventory

| Script | Purpose | Approx LOC |
|---|---|---:|
| `generate-depcruise-config.js` | wrapping YAML → depcruise CJS config | ~80 |
| `parse-depcruise-output.js` | depcruise JSON → D8 findings + metrics | ~120 |
| `compute-nccd.js` | NCCD из dep_graph | ~40 |
| `normalize-severity.js` | depcruise error/warn/info → D8 CRITICAL/HIGH/MEDIUM/LOW | ~30 |
| `apply-suppression.js` | suppression precedence rules | ~60 |
| `generate-mermaid.js` | D8 metrics → Mermaid diagrams (project overview, foundation, layered, per-cluster) | ~150 |
| `regenerate-principles-index.js` | D9 markdown → JSON index (regenerate after D9 edits) | ~50 |
| `validate-rules-patch.js` | patch validation для apply-patch mode | ~100 |
| `merge-rules-patch.js` | apply patch into project rules-файл | ~70 |

**Total:** ~700 строк Node implementation. Каждый helper делает одну вещь, isolated, testable.

### LLM ↔ детерминированный код граница

**Детерминированно (helpers + Bash):**
- Запуск depcruise (subprocess).
- Парсинг depcruise output (JSON).
- Computing метрик (Ca/Ce/I/NCCD/LOC).
- Severity normalization.
- Suppression precedence.
- Mermaid generation.
- Patch validation + merge.
- D8 schema validation.
- **Cluster grouping structure** — findings группируются по `reason.principle` детерминированно: каждая уникальная principle id ↔ один cluster, все findings с этим принципом в нём. Дополнительная группировка по shared module groups (если найдено overlap) — алгоритмическая, не LLM.

**LLM (агент скилла):**
- **Cluster prose description** — для каждого детерминированно-сформированного cluster'а LLM пишет human-readable name + root cause формулировку. Structure stable across runs, prose может слегка варьироваться (acceptable trade-off для readability).
- Notes for operator (override applied, suppression rules fired, threshold tuned summaries).
- Self-Review через изолированного субагента — natural language judgment.
- Диалог с оператором (pending prompts, transition offers, recovery flow).

**Граница:** где данные структурированы и преобразование формальное → код. Где нужно человеко-читаемое объяснение, диалог, judgment → LLM. **Cluster suggestions specifically** — гибрид: structure (какие findings вместе) deterministic, prose (как назвать и описать) LLM.

Это resolves развилку F6 из spec self-review — value prop «воспроизводимость» сохраняется на уровне structure, prose acceptably variable.

### Error handling matrix

| Сценарий | Reaction |
|---|---|
| depcruise unavailable | Hard fail с install инструкциями. |
| depcruise non-zero exit | Parse stderr, surface оператору с возможными причинами. |
| Timeout (>60s default) | Fail с suggestion: «повысь timeout через project rules или используй targeted mode (когда будет)». |
| Output не парсится | Fail: «depcruise вернул некорректный JSON. Проверь версию (≥16.0)». |
| Project rules файл не валиден | Hard reject с конкретными ошибками валидации. |
| Pending patch invalid | Reject patch с error message (см. секция 7), audit продолжается без него. |

---

## 6. Baseline rule set

Производное от 17 принципов D9 library. Не каждый принцип даёт baseline rule — только статически детектируемые подмножества покрываются. Принципы без baseline (interface-segregation, dependency-inversion standalone, stable-dependencies/abstractions/common-reuse, law-of-demeter) остаются доступны для project rules через ссылки на D9.

**Полный draft baseline rules:** `docs/superpowers/specs/2026-04-28-arch-audit-baseline-rules-draft.md` (отдельный artifact из этой сессии).

### Структура baseline (3 слоя, 14 правил)

**Слой A — depcruise built-ins (3):**
- `no-circular` (acyclic-dependencies, HIGH after normalization, configured `minCycleLength: 3`).
- `no-orphans` (dead-code-elimination, MEDIUM).
- `not-to-test-from-prod` (no-test-prod-coupling, HIGH).

**Слой B — universal custom (6):**
- `god-object` (god-object-prohibition, HIGH; Ca>10 AND Ce>10 AND LOC>300).
- `dependency-hub` (hub-like-dependency, HIGH; Ca > max(20% N, 10)).
- `inappropriate-intimacy` (acyclic-dependencies subcase, HIGH; cycle length 2).
- `nccd-breach` (acyclic-dependencies aggregate, HIGH; **conditional N > 15** + tunable threshold default 1.0).
- `high-fanout` (single-responsibility-module, MEDIUM; Ce > 15).
- `cross-module-import-info` (module-boundary-awareness, LOW; informational).

**Слой C — conditional structural (5):**
- `layered-respect` (layered-architecture-respect, MEDIUM; if ≥2 imена слоёв из закрытого list).
- `domain-no-channel-sdk` (channel-agnosticism, MEDIUM; if domain detected; список SDK).
- `port-adapter-direction` (port-adapter-separation, MEDIUM; if layered).
- `architectural-layer-cycle` (layered-architecture-respect escalation, **CRITICAL**; if layered AND cycle между слоями).
- `vertical-slice-respect` (vertical-slice-cohesion, MEDIUM; if feature folders detected).

### Severity normalization (важно)

depcruise native severities (`error`, `warn`, `info`) **нормализуются** adapter'ом в D8 scheme:
- depcruise `error` → D8 `HIGH` (или `CRITICAL` если правило project-promote'нуто).
- depcruise `warn` → D8 `MEDIUM`.
- depcruise `info` → D8 `LOW`.

D8 schema findings всегда содержат severity ∈ {CRITICAL, HIGH, MEDIUM, LOW}.

### Suppression precedence

Правила с более специфичной семантикой подавляют общие informational findings на том же импорте. Precedence chain:

1. CRITICAL: `architectural-layer-cycle`.
2. HIGH: `god-object`, `dependency-hub`, `inappropriate-intimacy`, `nccd-breach`, `no-circular`, `not-to-test-from-prod`.
3. MEDIUM: `layered-respect`, `port-adapter-direction`, `vertical-slice-respect`, `domain-no-channel-sdk`, `high-fanout`, `no-orphans`.
4. LOW (suppressed by higher): `cross-module-import-info`.

Алгоритм suppression: см. baseline rules draft + Self-Review checklist Group 2.

### Override mechanism

Project rules могут:
- **Disable** baseline rule (с обязательным `comment` поле — обоснование).
- **Tune threshold** (например, повысить `nccd-breach` threshold до 2.0 для сложного domain).
- **Lower/raise severity** (например, поднять `domain-no-channel-sdk` до CRITICAL для проектов где channel-agnosticism foundational).
- **Add layer alias map** (например, `mybiz/` → domain).
- **Add custom rules**, ссылающиеся на любые принципы из D9 — включая принципы без baseline rule.

---

## 7. Apply-patch mode

### Назначение

Validate + merge rules-patch (от arch-redesign cluster-mode или arch-spec) в project rules-файл. Не делает audit. Запускается explicit командой `arch-audit apply-patch <path>` или из Session intro full mode при detection unapplied patches.

### Validation checks (hard-fail если любой fail)

- **Syntax validity:** YAML парсится, structure соответствует rules-format.
- **Principle reference exists:** каждое `principle:` поле ссылается на existing canonical id в D9 library.
- **Name uniqueness:** имена правил из patch'а не конфликтуют с уже-applied именами в project rules.
- **Severity is valid:** значение из enum {CRITICAL, HIGH, MEDIUM, LOW}.
- **Path patterns valid:** regex'ы в `from.path` / `to.path` парсятся.
- **No circular suppression:** patch не пытается suppress правило, на которое сам ссылается.

### Hard fail handling

При validation fail — patch **не applied**, error report содержит actionable instructions:

```
ERROR: patch <path> validation failed.

Rule `enforce-cohesive-aggregates` references principle `cohesive-data-model`,
which does not exist in D9 library.

Possible actions:

1. Use existing principle. Closest matches in D9:
   - single-responsibility-module (similar concept on module-level)
   Edit patch to reference one of these.

2. Add new principle to D9. If `cohesive-data-model` is genuinely missing
   and statically detectable, add it:
   - Edit hi_flow/references/architectural-principles.md
     (add entry following the canonical format).
   - Run regeneration: npx tsx hi_flow/skills/arch-audit/helpers/regenerate-principles-index.js
   - Re-run arch-audit apply-patch <path>.

3. If not statically detectable. Principle belongs to semantic-only category
   (out of D9 scope per design). Reformulate patch rule to use existing static principle,
   or do not add the rule.
```

**Логика hard fail:** защита от соляники в rules-файле. Patch генерится автоматически от arch-redesign / arch-spec — если в нём ошибка, это **их баг**. Forced feedback loop в правильное место (back to arch-redesign re-engagement) предпочтительнее workaround в audit'е.

### D9 evolution mechanism

- **v1:** manual edit markdown + regenerate JSON index. Не automated команда (защита от lazy expansion).
- **Market-ready:** через GitHub issue + PR в публичный hi_flow репо. Maintainer review мерджит, новый release плагина содержит расширенный D9. См. OQ6.

### Successful merge flow

При validation success:
- Helper `merge-rules-patch.js` apply'ит patch into project rules-файл.
- **Перемещает patch файл в archive directory** `<project>/audit-report/applied-patches/<date>-<original-name>.yaml`. Не удаляет — non-destructive default; git history будет содержать full audit trail если нужно.
- Returns success report: «Patch applied: N rules added, M rules updated. Project rules файл обновлён. Patch заархивирован в `<archive-path>`.»

---

## 8. Output: audit-report.{json,md}

### audit-report.json — D8 schema

Полная D8 schema specification — `hi_flow/skills/arch-audit/references/d8-schema.json` (cascading update от arch-redesign references после approval этой спеки).

**Ключевые поля:**

```json
{
  "metadata": {
    "audit_sha": "...",
    "audit_timestamp": "...",
    "audit_tooling_version": "typescript-depcruise (16.3.0)",
    "schema_version": "1.0"
  },
  "findings": [
    {
      "id": "...",
      "rule_id": "no-circular",
      "type": "cycle",
      "severity": "HIGH",
      "source": { "module": "dispatcher", "file": "..." },
      "target": { "module": "pipeline", "file": "..." },
      "reason": {
        "principle": "acyclic-dependencies",
        "explanation": "..."
      },
      "extras": { "members": ["dispatcher", "pipeline"] }
    }
  ],
  "metrics": {
    "per_module": { "<module>": { "Ca": ..., "Ce": ..., "I": ..., "A": ..., "D": ..., "LOC": ... } },
    "nccd": ...,
    "nccd_threshold": ...,
    "severity_counts": { "CRITICAL": ..., "HIGH": ..., "MEDIUM": ..., "LOW": ... },
    "dep_graph": { "<module>": ["<other>", ...] }
  }
}
```

### audit-report.md — human-readable

**Структура (см. reference: `examples/zhenka-audit-report-mock.md`):**

1. Шапка: Date, Audit SHA, Stack (с adapter version), Project info (включая total modules count).
2. **Scope reminder section:** рекомендация по соседним tools (eslint, npm audit) — оператор не подменяет линтеры.
3. Severity roll-up table (counts).
4. **Project Dependency Graph** (Mermaid flowchart focused view):
   - Hide pure utility modules (Ca > 5 AND Ce ≤ 3 AND no findings) → отдельная Foundation diagram.
   - Edge styling: cycles bold red solid, CRITICAL bold red dashed, HIGH/MEDIUM boundary orange, default light gray opacity 0.5.
   - Hub modules — pink fill.
   - Cap: если N modules > 25 → overall diagram skipped (textual summary), per-cluster diagrams показаны.
5. Foundation modules diagram (если есть hidden utilities).
6. Layered diagram (если detected layered architecture; иначе явный «not detected» абзац).
7. Module Metrics table.
8. Findings секция grouped by severity (CRITICAL → HIGH → MEDIUM → LOW), с per-cluster Mermaid mini-graphs где applicable.
9. Cluster suggestions section (auto-grouping с recommended fixes из D9 fix_alternatives).
10. Notes for operator (override applied, suppression rules fired, threshold tuned).

### Mermaid визуализация

Generation — детерминированный helper-script `generate-mermaid.js`. Не LLM. Скрипт берёт `audit-report.json`, генерирует Mermaid markdown blocks, embeds в `audit-report.md`.

GitHub renders Mermaid в markdown natively. Локально — Cursor / VS Code с Mermaid extension показывают visually.

---

## 9. Self-Review + User Review Gate + Transition offer

Полный Self-Review checklist — `docs/superpowers/specs/2026-04-28-arch-audit-self-review-checklist-draft.md` (отдельный artifact из этой сессии). 7 групп:

1. D8 schema compliance.
2. Внутренняя консистентность (cross-checks finding ↔ dep_graph, recompute Ca/Ce/I, suppression precedence с алгоритмом).
3. Markdown report quality (Mermaid syntax, edge styling exact match, layered/foundation conditional).
4. Coverage (forward + reverse, suppression-aware).
5. Format compliance.
6. Prohibited content (emoji, placeholders, sensitive paths, internal usernames).
7. **JSON ↔ MD consistency** (новая Группа — explicit cross-checks).

**Subagent invocation specifics:**
- Передаются paths к 5 артефактам (json, md, D8 schema as .json, D9, baseline rules) + project root.
- Subagent в начале declares available tools (jq, ajv-cli, mmdc, git).
- Conversation history НЕ передаётся.

**Apply fixes inline categorized:**
- **Safe-to-autofix:** typos, форматирование, missing default fields, severity capitalization. Subagent применяет inline.
- **Human-required:** structural changes, Mermaid edges/nodes (cascading), severity changes, cluster regrouping. Subagent flag'ает оператору.
- **Lightweight verification pass:** если safe-to-autofix > 5 fixes ИЛИ есть human-required findings — повторно run только Group 2 (consistency) после fixes.

**User Review Gate** + **Transition offer** — см. секции 3.10 + 3.11.

---

## 10. Контракты с другими скиллами

> **Provisional disclaimer.** Контракты в этой секции finalised после этой сессии. Cascade impact — D8 schema cascading update в `hi_flow/skills/arch-redesign/references/d8-schema.md` + амендмент arch-redesign-design.md (rules-patch format consistency). Эти cascade'ы будут handle'нуты в отдельных сессиях.

### Boundary семейства hi_flow

См. D7, D10. arch-audit — **upstream обоих consumer'ов** (arch-redesign + arch-spec) в Phase 2.

### Output для downstream (arch-redesign + arch-spec)

См. секция 8 (D8 schema). Ключевое:
- Per-finding: id, rule_id, type, severity, source, target, reason.principle, extras.
- Project-level metrics: per-module Ca/Ce/I/A/D/LOC, NCCD, severity_counts, dep_graph.
- Metadata: audit_sha (для freshness check downstream), audit_timestamp, audit_tooling_version, schema_version.

### Input от arch-redesign + arch-spec

**Rules-patches** (см. D11 + апендмент arch-redesign-design.md):
- arch-redesign cluster-mode генерирует rules-patch как второй output (после refactor plan).
- arch-spec генерирует rules-patch как часть feature spec output (когда arch-spec будет реализован).
- Patch — отдельный YAML файл, включает poле `principle` для каждого правила.
- Apply через arch-audit apply-patch mode (см. секция 7).

### Shared family resources

- **D9 library** (`hi_flow/references/architectural-principles.md`): owned by arch-audit (curates content), read-only для arch-redesign + arch-spec. См. D9.
- **Project rules-файл** (canonical path: `<project>/.audit-rules.yaml` в root): owned by arch-audit (read/write/validate). См. D11. **No fallback paths** — adapter ищет только canonical path. Если файл отсутствует — baseline-only audit (без warning, normal для greenfield project). Если оператор переносит существующий rules-файл из старого проекта — должен переименовать в canonical.

### Интеграция со скиллом `architecture` (текущая среда оператора)

arch-audit пишет **только в свои собственные артефакты** + project rules через apply-patch. Состояние проекта (Known Drift, Active Decisions) обновляется через скилл `architecture` через детектор-механизм (sессия hook). Для market-ready — другой механизм (см. OQ6).

---

## 11. Открытые вопросы и парковано

### Открытые вопросы (несут по ходу использования)

- **Reproducibility / deterministic finding ids.** Scheme (hash? UUID v5? sequential?) — design в adapter implementation. Refine после первого боевого прогона.
- **Markdown size limit.** Magic threshold (N KB). Refine эмпирически.
- **Mermaid дополнительные caps** (foundation cap, cluster cap). Magic numbers без validation.
- **Languages mixing policy.** Текущий output намеренно смешан (Russian для operator-facing prose, English для technical terms). Strict policy противоречит дизайну. Refine после operator usage feedback.
- **Decoupling для market-ready.** В текущей среде arch-audit интегрируется с скиллом `architecture`. Для market-ready — конфигурируемые пути. См. OQ6.
- **D9 evolution governance** для market-ready. Через GitHub issue + PR. Конкретный maintenance workflow — design при market-ready подготовке. См. OQ6.
- **Tooling onboarding** для новых проектов (не arch-audit's job — отдельный механизм семейства). См. OQ7.

### Парковано

- **Дополнительные modes:** quick (skip метрик), targeted (subset модулей), incremental (с прошлого audit_sha). Use cases:
  - quick: оператор после мелкой правки хочет понять «не сломал ли границы», не нужно полное метрическое полотно.
  - targeted: фокус-сессия на одной зоне refactor'а.
  - incremental: post-impl reaудит после refactor'а — не аудитировать неизменённый код повторно.
- **AST-based checks** для `interface-segregation` и `law-of-demeter` (chain analysis). Требуют integration AST tooling beyond depcruise.
- **Multi-stack одновременный аудит** (полиглот-проекты).
- **`no-deep-internal-import` rule** (требует barrel/index discipline detection).
- **Bootstrap mode** для генерации первичного rules-файла из текущего состояния кода. Анти-pattern (закрепляет долг как «правильное»), отложено.

### Что НЕ парковать

- **Inter-skill контракт** (D8 + D9 + D11) — если возникнут push-back'и от arch-spec design сессии (когда будет), переоткрываем эту спеку и поправляем.
- **Critical findings первого боевого прогона на Zhenka** — фиксим сразу, не откладывая.

---

## 12. SKILL.md authoring notes

### Применение анти-паттернов из handoff'а

**Source of truth для чеклиста:** `docs/handoffs/2026-04-27-skill-design-anti-patterns.md`. При drafting'е SKILL.md прогнать полный чеклист (12 пунктов).

**Критический пункт чеклиста — Self-Review + User Review Gate.** Canonical Anthropic pattern. Обе мод-сессии (full + apply-patch) обязаны заканчиваться:
- Self-Review через изолированного субагента (с Group 2 lightweight verification если N>5 fixes).
- User Review Gate.
- Transition offer.

### Arch-audit-specific уточнения

**Anti-patterns checklist для будущего SKILL.md (12 пунктов):**

- **Description в frontmatter ≤300 chars** — только триггеры + when-to-use, не how.
- **Body не дублирует триггеры из description** — в body описывать симптомы / категории контекста, не точные фразы.
- **Anti-triggers present** для near-miss disambiguation (см. секция 2 спеки — список готов).
- **No skip path** в mode selection — skill всегда выполняется (per Anti-Pattern 3, см. секция 2).
- **No cost-asymmetry essays** — только imperative defaults + опционально Rationalizations table.
- **No явных контрактов с фазами как отдельных секций в SKILL.md** — секция 10 этой спеки про контракты НЕ воспроизводится в SKILL.md, заменяется short references.
- **Subsections не numbered в SKILL.md** (numbered в дизайн-спеке OK, но не наследуется в SKILL.md).
- **Imperative voice в SKILL.md body** — «Do X», «Help operator do Y», не «this skill does X».
- **Body in English** (preferred Anthropic). Русский — только в operator-facing literals (frontmatter description trigger phrases, embedded operator-Claude dialogue в `>` блоках, output format examples / section names).
- **Self-Review + User Review Gate присутствуют** перед финализацией output (секции 3.8-3.11 этой спеки описывают паттерн).
- **Length ≤300 строк** — **decision held до Russian SKILL.md draft**. Арх-audit ожидаемо длиннее feature-spec / arch-redesign из-за tool integration + workflow + adapter pattern. После drafting'а посмотреть фактическую длину и **семантически** оценить, есть ли смысл в декомпозиции (вынос частей в references) или это legitimate complexity. Не ориентироваться на mechanical 300-строк cutoff.
- **Sample comparison** — открыть `brainstorming/SKILL.md`, `writing-plans/SKILL.md`, `hi_flow/skills/feature-spec/SKILL.md`, `hi_flow/skills/arch-redesign/SKILL.md`.

**Output format examples в SKILL.md** — на русском (audit-report.md sections — для оператора). Embedded operator-Claude dialogue в `>` блоках — на русском.

### Workflow для следующих сессий

1. **Russian SKILL.md draft** для operator review.
2. **Operator review** — оператор читает, вносит правки.
3. **English final SKILL.md** — translation утверждённого Russian draft'а.
4. **Implementation plan** через `superpowers:writing-plans` — после approved SKILL.md. Implementation substantial (~700 строк helper-scripts + adapters + core + tests), **отдельная impl-сессия** (или несколько).

### Cascade impact для других сессий

После approval этой спеки — следующие cascade actions:

1. **D8 schema update** (`hi_flow/skills/arch-redesign/references/d8-schema.md`) — добавить `metadata.schema_version` + `finding.rule_id` поля. Решить через что — markdown spec + отдельный JSON file? Перенос в `hi_flow/skills/arch-audit/references/d8-schema.json` как primary source. Координация в отдельной session.
2. **arch-redesign амендмент** — handoff `docs/handoffs/2026-04-27-arch-redesign-amend-d11-handoff.md` уже создан, добавить туда note про severity normalization + schema_version + rule_id changes. Сессия амендмента подхватит.
3. **arch-spec design** (когда будет) — наследует контракты D8 + D9 + D11.

---

## Spec compliance check (self-review)

**Status:** completed 2026-04-28 через изолированный Opus subagent.

### Findings и обработка

**Quick fixes applied inline:**

- **HIGH A:** ARCHITECTURE.md D9 запись — поправлена с «15 принципов» на «17 принципов». History entry обновлена с обоснованием +2 принципов.
- **HIGH B:** Section 6 baseline rules count — исправлен с «13» на «14», Слой B count «5 → 6».
- **HIGH D:** Section 12 anti-patterns checklist расширен до полных 12 пунктов с явным conscious-deviation marking для длины SKILL.md.
- **LOW F7:** Patch archive vs delete — решено в пользу archive (`<project>/audit-report/applied-patches/<date>-<original-name>.yaml`), non-destructive default. Section 7 обновлена.

**Развилки resolved оператором** (operator decisions 2026-04-28):

- **F1: Adapter vs core boundary** → resolved inline в Section 5 шаг 6. Detection algorithms — в core/, adapter предоставляет stack-specific constants. Граница явно зафиксирована в callout-box.
- **F2: D8 schema cascade timing** → выбран explicit dirty period (вариант b). Cascade actions делегированы в отдельные сессии через handoffs. Не блокирует Russian SKILL.md drafting.
- **F3: Project rules file path** → выбран canonical `<project>/.audit-rules.yaml` (вариант a). Без fallback на old paths — Section 10 обновлена.
- **F6: Cluster suggestions** → выбран hybrid (вариант c). Structure deterministic (по `reason.principle`), prose LLM-generated. Section 5 LLM↔code граница обновлена.
- **Section 12 SKILL.md длина** → hold до Russian draft (вариант c). Не ориентироваться на mechanical 300-строк cutoff, оценить семантически после drafting'а.

**Park'нуто в Section 11 Open Questions** (medium findings без блокирующего impact):

- D8 contract расширение `rule_id` — нужна явная фиксация в ARCHITECTURE.md (амендмент D8).
- OQ6 decoupling structuredness — отсутствует hooks для market-ready hardcoded paths.
- Metrics computation owner unclear (adapter vs core helper) — связано с F1.
- Failure handling для apply-patch fail в session intro — продолжать или abort.
- Partial dep_graph handling — depcruise может частично fail на TS errors.
- Self-Review subagent failure mode — skip Self-Review или hard fail.
- `metadata.audit_sha` для non-git проекта — generation policy.
- `rule_id` naming convention — нужна фиксация (`baseline:no-circular`? `project:custom-rule`? plain).
- Self-Review minimum tool requirements — без mmdc/ajv/jq что валидно.
- depcruise version compatibility check — должна быть до запуска, не post-mortem.
- depcruise opt-out для airgapped environments — отсутствует.
- Performance benchmarking для large projects — TBD после first real audit.

**Refinements в style/density:**

- Severity normalization упомянуто 3 раза — acceptable separation (одно concept, три positioning контекста: workflow, baseline, output).
- Section 1 «Парковано» vs Section 11 «Парковано» — acceptable separation (Section 1 — high-level scope statement, Section 11 — detailed sub-features).
- Helper-scripts inventory: layered/vertical-slice/channel-SDK detection — это **core code**, не helpers. Файловая структура (Section 4) явно показывает их в `core/` (`baseline-rules.ts` + suppression.ts + report-builder.ts cover detection logic). Неоднозначность была в Section 5 «применяется adapter» — должно быть «применяется core, использует adapter-provided constants». Inline note в Section 5.

### Полный отчёт subagent'а

В conversation log этой design сессии. 7 HIGH + 17 MEDIUM + 10 LOW findings. Critical findings — нет (5 серьёзных, но категоризированы как HIGH/HIGH/HIGH/HIGH/HIGH развилки, требуют operator decision).
