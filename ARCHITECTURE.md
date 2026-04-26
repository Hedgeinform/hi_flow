# hi_flow — Architecture

Живой документ. Описывает текущее состояние проекта, принятые решения и зафиксированные архитектурные обязательства. Обновляется в момент принятия архитектурного решения, не «потом».

Глобальные архитектурные принципы — в `~/.claude/architecture/global-principles.md`. Они применяются по умолчанию ко всему проекту. Ниже — только project-specific принципы, overrides и состояние.

---

## Current Status — 2026-04-27

Проект `hi_flow` — семейство Claude Code скиллов, реализующих методологию Three-Phase Flow для solo+AI разработки. Опубликован на GitHub как Claude Code marketplace + плагин.

**Работает end-to-end:**
- `hi_flow:feature-spec` (v0.1.0) — продуктовая спека на уровне фичи. Полный цикл: design spec → implementation plan → SKILL.md + references → spec compliance review → behavioral validation (instruction-clarity audit на 3 сценариях, 7 ambiguity fixes применены).
- Marketplace metadata + plugin manifest + GitHub публикация на github.com/Hedgeinform/hi_flow.

**В процессе / недоделано:**
- Боевой тест в реальной Claude Code сессии — ещё не было.
- `hi_flow:product-spec` — design не начат.
- `hi_flow:arch-spec` — design не начат.

**Текущий фокус:** дизайн оставшихся двух скиллов (product-spec, arch-spec) в отдельных сессиях, затем end-to-end боевой прогон на ERP-микрофиче.

---

## Stack

Архитектурные компоненты проекта, для которых применяются стек-специфичные правила из `~/.claude/architecture/stacks/`.

- **markdown** — основной формат всех артефактов (SKILL.md, дизайн-спеки, планы, references, handoff'ы).
- **claude-code-plugin** — формат распространения (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, директорная структура `<plugin>/skills/<skill>/SKILL.md` + `references/`).
- **git** — version control + distribution через GitHub.

---

## Topic Index

<!-- Индекс концептов, упоминаемых в нескольких секциях документа.
     Формат: - **concept_name** [aliases: synonym1, synonym2] — D1, OQ2, Section § anchor

     При появлении второй записи об одном концепте скилл предложит зарегистрировать его здесь автоматически. -->

- **fork** [aliases: развилка, development fork] — D2, Module Map § feature-spec, OQ1
- **probing taxonomy** [aliases: probe taxonomy, taxonomy] — D2, OQ2
- **fitness functions** [aliases: architectural fitness functions] — D3, OQ3, Module Map § arch-spec
- **plain language principle** [aliases: plain language] — D4
- **subagent-driven** [aliases: subagent dispatch] — D5

---

## Project-specific принципы

Применяются в дополнение к глобальным (`~/.claude/architecture/global-principles.md`).

### P1. Аудитория артефактов скиллов — продуктолог, не инженер.

Все скиллы семейства `hi_flow` производят артефакты, адресованные оператору в продуктовой роли. Английский жаргон допустим только если он широко известен (MVP, KPI, UX, BMI, ИМТ, ROI) или объективно компактнее русского эквивалента и без потери смысла. Engineering-only терминология (extract-all, payload, throughput, idempotency, retry-strategy) — переводится или раскрывается. Плэйн-нейминг переменных (target_weight, current_weight) — ОК как структурные идентификаторы.

### P2. Skill = LLM instructions в markdown, не код.

Скиллы — инструкции для агента, не runtime-код. Следствия:
- TDD неприменим. Заменяется structural validation (file structure, frontmatter, sections) + behavioral validation (subagent simulation сценариев + spec compliance review).
- Worktree избыточен (изолированные markdown-правки, низкий conflict risk).
- «Code review» в smysl pull requests неприменим. Заменяется spec compliance review (соответствие design'у) + behavioral review (clarity instructions).

### P3. End-to-end validation through real-world pipeline.

Качество семейства проверяется не unit-тестами скиллов в изоляции, а полноценным прогоном через цепочку (product-spec → feature-spec → arch-spec → impl-plan) на реальной задаче. Изолированный тест одного скилла менее ценен — методология имеет смысл как pipeline.

### P4. Каждый скилл — дедикейтная design-сессия.

Объединение дизайнов нескольких скиллов в одну сессию даёт хуже качество (контекст загрязняется, parking decisions смешиваются). Свежая сессия per skill design дороже по setup, но даёт чище решения и тестирует self-sufficiency артефактов.

### P5. Subagent-driven implementation с прагматичной адаптацией.

Strict «fresh subagent per task + 2-stage review» из superpowers даёт ~54 dispatch'а на 18 задач — избыточно для documentation work. Адаптация: батчинг последовательных markdown-задач в один dispatch + selective review (spec compliance после batch, behavioral validation после complete skill). Quality gate сохраняется, dispatch count снижается до ~10-12.

---

## Module Map

### `.claude-plugin/marketplace.json`
- **Status:** BUILT
- **Path:** `.claude-plugin/marketplace.json`
- **Purpose:** Claude Code marketplace manifest. Декларирует список плагинов в репо. Источник установки в Claude Code.

### `hi_flow/` (plugin)
- **Status:** BUILT
- **Path:** `hi_flow/`
- **Purpose:** Claude Code плагин, контейнер для скиллов семейства. Включает `.claude-plugin/plugin.json`, README, директорию `skills/`.

#### `hi_flow/skills/feature-spec/`
- **Status:** BUILT (v0.1.0)
- **Path:** `hi_flow/skills/feature-spec/`
- **Purpose:** Скилл feature-level продуктовой спеки. Ведёт оператора от запроса фичи к подписанной product-spec.md через self-assessment + brainstorm с probing taxonomy + closure. Output — `<project>/docs/specs/YYYY-MM-DD-<feature>-product-spec.md`.
- **References:** product-spec-template.md, self-assessment-template.md, example-goal-setting.md.

#### `hi_flow/skills/product-spec/` (planned)
- **Status:** PLANNED
- **Purpose:** Скилл product-level декомпозиции крупного продукта на фичи. Уровнем выше feature-spec.

#### `hi_flow/skills/arch-spec/` (planned)
- **Status:** PLANNED
- **Purpose:** Скилл архитектурной спеки фичи. Phase 2. Включает fitness functions integration, Summary раздел, Mermaid граф связей.

#### Other skills (parked)
- `hi_flow:impl-plan` — Phase 3 implementation plan. Сейчас покрывается Superpowers TDD.
- `hi_flow:fitness` — standalone fitness functions skill (если выделится из arch-spec).
- `hi_flow:sanity-check` — пересмотр архитектурной целостности по запросу.
- `hi_flow:handoff` — session handoff discipline.

### `docs/superpowers/specs/`
- **Status:** BUILT
- **Path:** `docs/superpowers/specs/`
- **Purpose:** Дизайн-спеки и implementation reports каждого скилла. На текущий момент только feature-spec.

### `docs/superpowers/plans/`
- **Status:** BUILT
- **Path:** `docs/superpowers/plans/`
- **Purpose:** Implementation plans для скиллов. На текущий момент только feature-spec.

### `docs/handoffs/`
- **Status:** BUILT
- **Path:** `docs/handoffs/`
- **Purpose:** Hand-off документы между сессиями. На текущий момент один — для product-spec и arch-spec design сессий.

### `examples/`
- **Status:** BUILT
- **Path:** `examples/`
- **Purpose:** Reference examples для каждого скилла. На текущий момент один — `goal-setting-product-spec.md` (Zhenka feature). Этот файл также скопирован в `hi_flow/skills/feature-spec/references/example-goal-setting.md` с дополнительной шапкой.

---

## Active Decisions

### D1. Имя плагина — `hi_flow` (анаграмма HedgeInform).

Изначально планировался `as_flow` (от Three-Phase Flow), но в английском быстро перерастает в «ass_flow». Перешли на `hi_flow` — анаграмма GitHub аккаунта владельца (Hedgeinform), без побочных коннотаций. Видовые скиллы — `hi_flow:feature-spec`, `hi_flow:product-spec`, и т.д.

### D2. Cell-based hierarchical forks как универсальный pattern для всех уровневых спек семейства.

Format A (forks list с uniform cells: `Когда / Альтернативы / Решение / Открыто / Связи / Examples` + Cockburn IDs F1.3.2.1 + Status + Cardinality) — переиспользуется в product-spec и arch-spec. Cross-cutting policies (CC) и reusable sub-policies (P-NAME) тоже общесемейные.

### D3. Probing taxonomy — floor checklist + adaptive ceiling.

Каждый скилл имеет свою probing taxonomy с per-category procedures. Mandatory / Conditional / Optional пометки. Cross-cutting probes (criteria-explicit, contradiction detection) и closing probe (premortem) общие. Coverage-based closure criterion для перехода к финализации.

### D4. Plain language principle (см. также P1).

Закреплено как explicit правило в SKILL.md формата. Не запреты, а guard rail.

### D5. Subagent-driven implementation pragmatically batched.

Подробно см. P5. Конкретно для feature-spec: batch SKILL.md content (Tasks 2-10) в один dispatch с последующим spec compliance review. Behavioral validation объединена для трёх сценариев в один dispatch (clarity audit вместо реального execution симуляции).

### D6. Marketplace at repo root, plugins as subdirectories.

`.claude-plugin/marketplace.json` в корне репо, плагин `hi_flow/` рядом. Формат скопирован у superpowers-marketplace. Source плагина в marketplace.json указывает на `./hi_flow`.

**Spec:** см. `docs/superpowers/specs/2026-04-26-hi_flow-feature-spec-design.md` для детального дизайна feature-spec.

---

## Known Drift

### KD1. Typo в имени локальной директории — `agent_orchesration_skills` (должно быть `orchestration`).

Опечатка в названии локального workspace директории (отсутствует «t» после «s»). На GitHub репо назван корректно (`hi_flow`). Не блокирует работу. Переименование локально потребует обновления git remote и пересоздания связи. **Trigger для re-review:** при первом удобном случае (например, при чистке workspace или переезде на новую машину).

---

## Open Questions

### OQ1. Will the methodology deliver an ERP feature end-to-end?

Боевой тест запланирован на сессию 4 после готовности product-spec и arch-spec. Критерий успеха: можно ли пройти от ERP-микрофичи через все три скилла + impl до работающего кода без существенных доработок методологии по ходу. Если не может — сигнал к ревизии.

### OQ2. Какие probing taxonomy на product / arch уровнях?

Для feature-spec: 8 категорий (Input space, Boundary, Invalid combinations, User reactions, Hard policies, Disambiguation, Lifecycle, Cross-feature integration). Для product-spec и arch-spec — нужно проектировать. Кандидаты для product-spec: scope boundaries, capability decomposition, user types, integration points, rollout strategy, success metrics, non-functional baselines, risk areas. Для arch-spec: boundaries, dependencies, fitness function categories, deployment topology, observability hooks, failure modes, scaling concerns, security boundaries.

### OQ3. Fitness functions specification format в arch-spec.

Декларативный (yaml-like) или прозой? Маппинг на конкретные tools (dep-cruiser для TS, ArchUnit для Java, import-linter для Python) — на каком этапе фиксируется в arch-spec'е и где живёт config? К дизайну в сессии 3.

### OQ4. Mermaid graph conventions в arch-spec.

Какие nodes (модули? функции?), какие edges (deps? dataflow? control flow?), какие boundaries (hexagonal? layers? microservices?), какой scope per граф (вся фича? один компонент? subsystem?). К дизайну в сессии 3.

### OQ5. Связь arch-spec с существующим скиллом `architecture` (управляет ARCHITECTURE.md проектов).

arch-spec обновляет ARCHITECTURE.md по ходу или после имплементации? Module Map синхронизируется автоматически или через explicit handoff? К дизайну в сессии 3.

---

## History of Architectural Decisions

Append-only лог. Ничего не удаляется, отменённые решения помечаются как `[deprecated]`.

### 2026-04-27 — Init: Architecture document created

**Что:** Создан ARCHITECTURE.md как living document проекта.
**Почему:** К моменту перехода к design'у двух новых скиллов (product-spec, arch-spec) — нужен явный архитектурный контекст для cross-session consistency и для self-sufficiency artefактов в новых сессиях.

### 2026-04-27 — D1: Rename `as_flow` → `hi_flow`

**Что:** Имя плагина и семейства изменено с `as_flow` на `hi_flow` (анаграмма HedgeInform).
**Почему:** В английском «as_flow» быстро перерастает в «ass_flow» — нежелательная коннотация для distributable плагина.

### 2026-04-26 — D2-D6 + P1-P5 fixed during feature-spec design + implementation

**Что:** Зафиксированы основные архитектурные решения (cell forks pattern, probing taxonomy, plain language, subagent-driven adaptation, marketplace structure) и project-specific принципы.
**Почему:** Первый скилл семейства (`hi_flow:feature-spec`) полностью спроектирован и имплементирован. Решения, принятые по ходу, сформировали базу для всех будущих скиллов.

**Spec:** `docs/superpowers/specs/2026-04-26-hi_flow-feature-spec-design.md`
**Plan:** `docs/superpowers/plans/2026-04-26-hi_flow-feature-spec.md`
**Report:** `docs/superpowers/specs/2026-04-26-hi_flow-feature-spec-design-report.md`
