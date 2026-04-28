# hi_flow — Architecture

Живой документ. Описывает текущее состояние проекта, принятые решения и зафиксированные архитектурные обязательства. Обновляется в момент принятия архитектурного решения, не «потом».

Глобальные архитектурные принципы — в `~/.claude/architecture/global-principles.md`. Они применяются по умолчанию ко всему проекту. Ниже — только project-specific принципы, overrides и состояние.

---

## Current Status — 2026-04-28

Проект `hi_flow` — семейство Claude Code скиллов, реализующих методологию Three-Phase Flow для solo+AI разработки. Опубликован на GitHub как Claude Code marketplace + плагин.

**Работает end-to-end:**
- `hi_flow:feature-spec` (v0.1.0) — Phase 1 продуктовая спека.
- `hi_flow:arch-redesign` (v0.1.0) — Phase 2 corrective.
- Marketplace metadata + plugin manifest + GitHub публикация.

**Runtime реализован, SKILL.md в работе:**
- `hi_flow:arch-audit` — Phase 2 analytical. Runtime v1 готов 2026-04-28: 62 теста, smoke на Zhenka (32 findings). SKILL.md — следующий этап.

**Не начато:**
- `hi_flow:product-spec` (low priority — operator strong zone).
- `hi_flow:arch-spec` (после SKILL.md arch-audit).
- Боевой тест полного цикла в реальной Claude Code сессии.

**Текущий фокус:** SKILL.md для arch-audit. Затем arch-spec design, затем end-to-end боевой прогон на ERP-микрофиче.

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
- **Status:** PLANNED (low priority — operator strong zone). **Purpose:** Product-level декомпозиция продукта на фичи + roadmap + cross-feature deps.

#### `hi_flow/skills/arch-redesign/` (BUILT v0.1.0)
- **Status:** BUILT — design + SKILL.md + 3 references templates готовы (2026-04-27). **Purpose:** Project-level corrective. Консьюмит arch-audit findings + existing arch state, выдаёт refactor plan. См. D7. **Spec:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md`. **Report:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design-report.md`.

#### `hi_flow/skills/arch-audit/` (BUILT v1, runtime only)
- **Status:** BUILT (runtime v1, 2026-04-28) — 62 unit+integration tests green, typecheck clean, smoke на Zhenka passed (32 findings). SKILL.md не написан — следующий этап.
- **Purpose:** Phase 2 analytical. TS/Node runtime: baseline-rules, enrich-findings, generate-mermaid, report-builder, typescript-depcruise adapter. Output: D8-compliant `audit-report.json` + `audit-report.md`. См. D7, D11.
- **Spec:** `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-design.md`. **Report:** `docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md`.

#### `hi_flow/skills/arch-spec/` (planned)
- **Status:** PLANNED — design после arch-audit. **Purpose:** Per-feature prophylactic, Phase 2. Наследует graph machinery из arch-audit, потребляет arch-audit findings + feature-spec. Output — target architecture фичи + delta + fitness function declarations. См. D7.

#### `hi_flow/references/` (BUILT, shared)
- **Status:** BUILT — `architectural-principles.md` создан 2026-04-28 в сессии arch-audit design (**17 принципов**, 4 группы, scope = static-only).
- **Path:** `hi_flow/references/architectural-principles.md` (+ planned `architectural-principles-index.json`, auto-generated).
- **Purpose:** Family-shared референсы. Library statically-detectable архитектурных принципов с типовыми fix alternatives. Owner — arch-audit (curates content); read-only для arch-redesign, arch-spec. См. D9.

#### Other skills (parked)
- `hi_flow:impl-plan` — Phase 3 implementation plan. Сейчас покрывается Superpowers TDD.
- `hi_flow:handoff` — session handoff discipline.
- `hi_flow:fitness` — **MERGED into arch-audit** (D7). Fitness functions = declarations в arch-spec/arch-redesign артефактах, audit = checker.
- `hi_flow:sanity-check` — **MERGED into arch-audit** (D7). Лёгкий режим того же audit'а.

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

### D7. Phase 2 splits into three skills: arch-audit, arch-redesign, arch-spec.

arch-spec (per-feature, prophylactic) не покрывает накопленный архитектурный долг. arch-audit держит graph machinery + findings, upstream обоих arch-redesign и arch-spec. Design-порядок (consumer-first): redesign → audit → spec. fitness и sanity-check свёрнуты в arch-audit. Триггер обнаружения — Zhenka audit-report (CRITICAL boundary + dispatcher↔pipeline cycle + NCCD breach).
**Spec:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md` (in progress, текущая сессия).

### D8. arch-audit обязан выдавать semantic reason-field для каждого finding'а.

Каждое нарушение, обнаруженное arch-audit (нарушение границ, кольца, SDP, coupling), сопровождается полем reason — ссылкой на нарушенный архитектурный принцип в свободной форме (например, «validator is channel-agnostic middleware»). Это контракт между arch-audit и его потребителями (arch-redesign, arch-spec). Root-cause analysis закрепляется за audit; design — за redesign/spec. Без reason-поля clustering в redesign требует LLM-эвристик с риском галлюцинаций. Триггер обнаружения: разбор кластеризации Zhenka audit-report показал 4 разных корневых причины внутри одной зоны модулей.
**Spec:** canonical schema в `hi_flow/skills/arch-audit/references/d8-schema.md` (markdown) + `hi_flow/skills/arch-audit/references/d8-schema.json` (JSON Schema). Consumer contracts в `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md` и `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-design.md`.

### D9. Семейная библиотека архитектурных принципов как shared reference.

Референс-артефакт `hi_flow/references/architectural-principles.md`: статически-детектируемые архитектурные принципы (**17 принципов**, 4 группы — SOLID на module-level, Martin's Package Principles, Hexagonal/Boundaries, Structural Classics). Industry-imported curation (SOLID, Martin, Cockburn, classical structural + LoD). Owner — arch-audit (curates); read-only для arch-redesign (cluster-mode шаг 1 — fix alternatives) и arch-spec (fitness function declarations). **Scope: static-only** — semantic-detectable принципы (OCP, LSP, CCP, REP, SSoT, silent-fallback) явно out of scope, остаются в индустриальном каноне без D9 entry. Companion: auto-generated `architectural-principles-index.json` для validators.
**Spec:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md` (consumer contract) + `docs/superpowers/specs/2026-04-27-hi_flow-arch-audit-design.md` (текущая сессия — формат, scope, рационал) + `hi_flow/references/architectural-principles.md` (артефакт).

### D10. Семейство hi_flow покрывает только design phases (0-2); Phase 3 — out of scope.

Сознательное архитектурное решение: Phase 3 (impl) рекомендуется через superpowers ecosystem (`writing-plans` + `executing-plans` или `subagent-driven-development`), но не реализуется внутри hi_flow. `hi_flow:impl-plan` остаётся parked не как «отложено», а как «не делаем». Boundary семейства проходит на уровне L2 design doc'а (refactor plan от cluster-mode, refactor plan от arch-spec). Operator override = любой Phase 3 toolchain.
**Spec:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md` секция 5 «Boundary семейства hi_flow».

### D11. Project rules — накопительный артефакт; arch-audit owns read/write/validation, arch-spec/arch-redesign генерируют rules-patches.

Project rules-файл (например, `dependency_rules.yaml`) — единственный источник истины для arch-audit при проверке. Накапливается распределённо: baseline (встроенный в arch-audit, universal + structural rules), patches от arch-spec (per-feature fitness function declarations), patches от arch-redesign cluster-mode (fitness checkpoints как rules). Patches — отдельные артефакты-кандидаты, **не пишутся в rules-файл автоматически**. Apply — explicit operator action: команда `arch-audit apply-patch <path>` или interactive prompt в начале следующего полного audit прогона (он сам сканирует pending patches и спрашивает). Валидация patch'а перед merge — ответственность arch-audit. Закрывает silent decay (забыть apply) при сохранении trust boundary (нет автозаписи в config из чужого скилла).
**Spec:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-audit-design.md` (текущая сессия) + амендмент к `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md`.

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

**Status:** частично резолвлено D11. Closed sub-questions: «где живёт config» — project rules-файл, owned arch-audit. «На каком этапе фиксируется» — через rules-patches от arch-spec/arch-redesign + apply через arch-audit. Open sub-question: формат rules-файла (yaml-like vs проза) — design в текущей arch-audit сессии.

### OQ4. Mermaid graph conventions в arch-spec.

Какие nodes (модули? функции?), какие edges (deps? dataflow? control flow?), какие boundaries (hexagonal? layers? microservices?), какой scope per граф (вся фича? один компонент? subsystem?). К дизайну в сессии 3.

### OQ5. Связь arch-spec с существующим скиллом `architecture` (управляет ARCHITECTURE.md проектов).

arch-spec обновляет ARCHITECTURE.md по ходу или после имплементации? Module Map синхронизируется автоматически или через explicit handoff? К дизайну в сессии 3.

### OQ6. Decoupling hi_flow семейства от скилла `architecture` для market-ready версии.

Сейчас arch-redesign (и потенциально arch-audit, arch-spec) ссылается на состояние проекта через скилл `architecture` — он управляет ARCHITECTURE.md, секцией Known Drift и активными fitness functions проекта. Для market-ready версии (распространение через marketplace другим solo-foundery'ам) такая привязка к operator-personal скиллу не работает. Нужно сделать пути к артефактам конфигурируемыми (default — текущая среда оператора, при необходимости — другой источник). К решению при подготовке релизной версии плагина hi_flow.

**Связано:** D9 library evolution — для v1 расширение через manual edit. Для market-ready — через GitHub issue + PR в публичный hi_flow репо (community-driven curation, maintainer review мерджит). Это часть market-ready подготовки, не отдельный механизм.

### OQ7. Tooling setup onboarding для новых проектов в семействе hi_flow.

Продуктологи-операторы часто не настраивают базовый tooling (eslint, dependency-cruiser default ruleset, npm audit, tsconfig strict mode) — потому что в семействе нет механизма, который бы об этом напомнил на старте проекта. arch-audit этот gap не закрывает по природе (вызывается, когда долг уже накопился, не на старте). Кандидат — отдельный хук «первая сессия первого проекта» с onboarding'ом конкретных tools и команд для copy-paste. Конкретный механизм (plugin-level hook? отдельный скилл `hi_flow:setup`? часть marketplace install flow?) — open. Out of scope текущей arch-audit design сессии. К дизайну в отдельной сессии (вероятно — в рамках market-ready подготовки, см. OQ6).

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

### 2026-04-27 — D7: Phase 2 splits into arch-audit + arch-redesign + arch-spec

**Что:** Семейство расширилось с одного Phase-2 скилла до трёх с фиксированным графом зависимостей (audit upstream обоих consumer'ов). fitness + sanity-check свёрнуты в arch-audit.
**Почему:** Zhenka audit-report (CRITICAL boundary, cycles, NCCD breach) показал, что arch-spec по природе не покрывает терапевтический сценарий накопленного архитектурного долга проектного уровня.

### 2026-04-27 — D8: arch-audit обязан выдавать semantic reason-field

**Что:** Inter-skill contract: каждый finding от arch-audit включает поле reason с явной ссылкой на нарушенный архитектурный принцип. Распределение обязанностей в семействе: audit находит и объясняет, redesign и spec проектируют фиксы.
**Почему:** Без reason-поля arch-redesign cluster-by-root-cause работает на LLM-эвристиках — риск галлюцинаций. С reason-полем clustering — детерминированная сортировка.

### 2026-04-27 — D9: Семейная библиотека архитектурных принципов как shared reference

**Что:** Внутри hi_flow вводится референс-артефакт «библиотека архитектурных принципов» — каталог стандартных принципов с типичными альтернативами фиксов. Owner — arch-audit; reader'ы — arch-redesign, arch-spec.
**Почему:** Без общего каталога reason-поля выходят свободной формой и теряют переиспользуемость между сессиями и проектами; redesign не имеет источника типичных альтернатив для cluster-mode шага 1.

### 2026-04-27 — D10: Семейство hi_flow покрывает только design phases (0-2)

**Что:** Phase 3 (impl) explicit out of family scope. Рекомендуется superpowers ecosystem; `hi_flow:impl-plan` остаётся parked не как «отложено», а как «не делаем». Boundary — на уровне L2 design doc'а.
**Почему:** Superpowers ecosystem уже покрывает имплементацию; переписывать дублирование без ценности. Сознательное решение по итогам design сессии arch-redesign.

### 2026-04-27 — D11: Distributed ownership project rules-файла

**Что:** arch-audit owns project rules-файл (read/write/validate). arch-spec и arch-redesign генерируют rules-patches как часть своих outputs (как кандидатов). Apply — explicit operator action через arch-audit, либо handcraft.
**Почему:** Silent decay в варианте «patch-as-pending без auto-apply» (забыть применить — rules не растут). Pure auto-apply размывает trust boundary (запись в config из чужого скилла без явного гейта). Гибрид с explicit гейтом сохраняет оба свойства. Триггер фиксации — arch-audit design сессия surface'нула, что без распределённой ответственности кандидаты на rules падают в gap между Phase 2 design и Phase 3 impl.

### 2026-04-28 — D8 schema migration: canonical arch-audit location + schema_version + rule_id

**Что:** D8 schema перенесена в canonical location `hi_flow/skills/arch-audit/references/d8-schema.md` + `d8-schema.json`. Добавлены два новых обязательных поля: `metadata.schema_version` (semver string, default "1.0") и `finding.rule_id` (cross-reference к baseline или project rule). Подтверждён severity enum: только `{CRITICAL, HIGH, MEDIUM, LOW}` — depcruise native severities нормализуются adapter'ом. Старый `hi_flow/skills/arch-redesign/references/d8-schema.md` заменён pointer-stub'ом.
**Почему:** arch-audit design сессия (2026-04-28) зафиксировала arch-audit как канонического owner'а D8 schema. `schema_version` защищает downstream consumers от breaking changes без warning. `rule_id` даёт downstream возможность pull rule definition по имени, не только по principle id.

### 2026-04-28 — D9 design завершён: 17 принципов, scope static-only

**Что:** Зафиксированы формат записи и стартовый набор D9 library — `hi_flow/references/architectural-principles.md`. **17 принципов** в 4 группах (SOLID на module-level, Martin's Package Principles, Hexagonal/Boundaries, Structural Classics), каждый с полями id/source/formulation/why/detection/fix-alternatives/related. Изначально 15 принципов; +2 добавлены через subagent validation pass'ы: `hub-like-dependency` (Lakos package metrics), `vertical-slice-cohesion` (industry pattern, surface'нут через Zhenka audit-report валидацию). Companion auto-generated `architectural-principles-index.json` для validators. Module Map: `hi_flow/references/` → BUILT.
**Почему:** D9 закрепил scope как **statically-detectable subset** канона — не «все архитектурные принципы», а только те, что arch-audit реально может проверить. Семантические принципы (OCP, LSP, CCP, REP, SSoT, silent-fallback) сознательно вне scope, поскольку семейство hi_flow ограничено static analysis (см. D7-D11). YAGNI override полноты канона: бессмысленно держать в D9 принципы, которые ни один consumer не использует. Триггер — design walkthrough в arch-audit сессии: оператор задал прямой вопрос «зачем добавлять то, что мы не проверим?», что surface'нуло scope-incoherence в первоначальном черновике на 21 принцип.
