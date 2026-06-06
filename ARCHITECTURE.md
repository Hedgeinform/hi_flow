# hi_flow — Architecture

Живой документ. Описывает текущее состояние проекта, принятые решения и зафиксированные архитектурные обязательства. Обновляется в момент принятия архитектурного решения, не «потом».

Глобальные архитектурные принципы — в `~/.claude/architecture/global-principles.md`. Они применяются по умолчанию ко всему проекту. Ниже — только project-specific принципы, overrides и состояние.

---

## Current Status — 2026-06-06

Проект `hi_flow` — семейство Claude Code скиллов, реализующих методологию Three-Phase Flow для solo+AI разработки. Опубликован на GitHub как Claude Code marketplace + плагин.

**Работает end-to-end:**
- `hi_flow:product-spec` (v0.6.2) — Phase 0 продуктовая декомпозиция (с decomposition phase).
- `hi_flow:feature-spec` (v0.1.0) — Phase 1 продуктовая спека. Боевой прогон выполнен (REH ERP audit-фича 2026-05-28).
- `hi_flow:arch-redesign` (v0.1.0) — Phase 2 corrective.
- `hi_flow:arch-audit` (v0.2.6) — Phase 2 analytical.
- `hi_flow:arch-spec` (BUILT) — Phase 2 prophylactic, мост feature-spec → writing-plans (D21). **Первый боевой прогон выполнен 2026-05-31** (REH ERP audit, green field) — цепочка дала работающий софт (Slice 1: 14/14 tests, typecheck+dep-audit clean). Выявил amendment B+C+D + chain-находку A → `docs/handoffs/2026-06-01-arch-spec-feedback-roadmap-handoff.md`, долг в active-issues. **2026-06-04: D26 platform-port lookahead (A+)** — awareness-probe против first-feature-defines-shared-port.
- `hi_flow:bootstrap` (BUILT v0.7.1) — Phase 2 project-level foundation. Реализован 2026-06-01 (находка A закрыта). **Первый боевой прогон (incremental, REH ERP frontend) выполнен 2026-06-02** — React Vite SPA заскаффолжен, managed-гейты зелёные, coverage-honesty → Known Drift в REH. См. Module Map § bootstrap.
- `hi_flow:ops` (BUILT v0.8.0) — последняя миля доставки (форма «профиль+рендер», personal-first): fix-profile + onboard (container/static), CD = GH Actions→GHCR→SSH, co-tenant-safe. **Боевой прогон (onboarding реального проекта на VPS) НЕ выполнялся** → OQ13. См. Module Map § ops, D23.
- Marketplace metadata + plugin manifest + GitHub публикация.

**TO DESIGN (roadmap per D20 + L3 hygiene handoff):**
- `hi_flow:living-architecture` (working name) — Функция 2 порта operator-personal `architecture` (living document maintenance).
- L3 hygiene layer — hooks, baselines relocation (Функция 3), arch-audit blocking mode, distribution mechanics.

**BUILT с прошлого фокуса:**
- **shared graph-core** (`hi_flow/skills/arch-audit/core/graph-core.ts`, 2026-05-31) — Ca/Ce/I/NCCD как SSoT + Tarjan-traversal циклов/достижимости на декларативном графе. Снял блокер боевой работы блока C arch-spec (D21, принцип 10).

**Текущий фокус:** frontend coverage закрыт (**релиз 0.8.3**, 2026-06-06 — D27): React-ось `covered`, arch-audit управляет фронтом горизонтальными слоевыми правилами (`frontend-layered-respect`/`frontend-layer-cycle`), scaffold react/ добавлен. ops (0.8.0) / arch-spec amendment (D24) / bootstrap — в main (0.8.2). Следующее — **боевой прогон ops** (первый реальный onboarding на VPS, OQ13) → living-architecture → L3 hygiene (Ф3a relocation для distributable bootstrap). Открыто: должен ли bootstrap класть CD-stub под ops (OQ14). Backlog bootstrap: Ф3a relocation (frontend covered-хвосты закрыты). Изоляция фич на фронте отложена → active-issues (vertical-slice-respect).

---

## Stack

Архитектурные компоненты проекта, для которых применяются стек-специфичные правила из `~/.claude/architecture/stacks/`.

- **markdown** — основной формат всех артефактов (SKILL.md, дизайн-спеки, планы, references, handoff'ы).
- **claude-code-plugin** — формат распространения (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, директорная структура `<plugin>/skills/<skill>/SKILL.md` + `references/`).
- **git** — version control + distribution через GitHub.
- **typescript** — runtime arch-audit (`hi_flow/skills/arch-audit/`): adapters, helpers, core, integration tests. Подтягивает `~/.claude/architecture/stacks/typescript.md` через скилл `architecture`.
- **node** — Node.js runtime для arch-audit CLI (`cli-run-audit`, `cli-apply-patch`, `regenerate-principles-index`).

---

## Topic Index

<!-- Индекс концептов, упоминаемых в нескольких секциях документа.
     Формат: - **concept_name** [aliases: synonym1, synonym2] — D1, OQ2, Section § anchor

     При появлении второй записи об одном концепте скилл предложит зарегистрировать его здесь автоматически. -->

- **backlog** — D17, D18, D22, Module Map § product-spec, Module Map § backlog-integration
- **fork** [aliases: развилка, development fork] — D2, Module Map § feature-spec, OQ1
- **probing taxonomy** [aliases: probe taxonomy, taxonomy] — D3, Module Map § feature-spec
- **fitness functions** [aliases: architectural fitness functions] — D11, D21, Module Map § arch-spec
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

### P6. Дисциплина обращения к оператору.

Скилл соблюдает чёткое разграничение, когда обращаться к оператору, а когда действовать самостоятельно, по двум осям:

1. Не принимает решения за оператора в зонах его сильной экспертизы. Для hi_flow по умолчанию это продуктовые решения (что входит в продукт, какие приоритеты, какие компромиссы, кто целевая аудитория). Инженерные решения скилл может принимать самостоятельно — у hi_flow аудитории инженерная экспертиза слабее продуктовой (см. P1).

2. Не задаёт оператору вопросы по детерминированным действиям — те, ответ на которые однозначно выводится из правил (смена статуса спеки, проверка целостности, валидация формата, проверка замкнутости зависимостей, миграция содержимого между артефактами). К оператору обращаться только если событие требует продуктового суждения (выбор между альтернативами с компромиссами, разрешение неоднозначности, решения о составе продукта).

Антипаттерн «лишний вопрос оператору»: «спрошу-ка на всякий случай», когда ответ однозначен.

Антипаттерн «решение за оператора»: «решу сам», когда вопрос про продуктовые компромиссы.

Применяется ко всем скиллам семейства hi_flow.

### P7. Coverage-honesty — предлагать только полностью покрытое плагином.

Скиллы, ведущие оператора через выбор технологий/компонентов (напр. bootstrap probing стека), предлагают только компоненты, **полностью покрытые плагином** (stack-file + baseline + audit-adapter + scaffold-template). SSoT покрытия — явный coverage-manifest. Непокрытое — не молчаливое предложение, а громкий сигнал + degrade «unmanaged» (global принцип 5). Запрет обещать turnkey-hygiene там, где плагин её не довезёт. Coverage читается динамически (не хардкод), растёт вместе с плагином. Триггер фиксации — bootstrap design 2026-06-01.

### P8. Разграничение высот: project-level foundation vs feature-level structure.

Скилл не залезает на чужую высоту. bootstrap (project-level) задаёт «КАК устроен модуль в проекте» (toolchain, conventions, scaffold-convention); arch-spec (feature-level) решает «КАКИЕ модули у фичи». project-foundation не предугадывает feature-структуру; feature-design не фиксирует project-стек. Системное разрешение границы находок A↔C. Обобщается на уровни семейства (product / feature / project-foundation / impl). Триггер фиксации — bootstrap design 2026-06-01.

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
- **Status:** BUILT (v0.1.0) — clarification note added v0.6.2 для aggregate feature scope compatibility с product-spec D19 terminology. Backlog-sync at closure — BUILT (D22). UX/UI boundary amendment 2026-06-03 (D25 — опц. секция «Поверхности (UX)» + structural probe + surface≠channel).
- **Path:** `hi_flow/skills/feature-spec/`
- **Purpose:** Скилл feature-level продуктовой спеки. Ведёт оператора от запроса фичи к подписанной feature-spec.md через self-assessment + brainstorm с probing taxonomy + closure. Output — `<project>/docs/specs/YYYY-MM-DD-<feature-slug>-feature-spec.md`. **Feature scope (post v0.6.2 / D19):** aggregate of capabilities, не single capability — 8 probe categories масштабируются на whole feature scope; input — bundle файл из product-spec decomposition phase (когда applicable).
- **References:** product-spec-template.md, self-assessment-template.md, example-goal-setting.md.

#### `hi_flow/skills/product-spec/`
- **Status:** BUILT v0.6.2 — decomposition phase per D17/D18 + terminology realignment per D19 + bundle usage hint correction (post-release fix к v0.6.1 implementation bug). v0.7.0 deferred (retrospective improvements, см. active-issues).
- **Path:** `hi_flow/skills/product-spec/`
- **Purpose:** Product-level top-down декомпозиция: одна продуктовая спека на одну итерацию + per-product backlog (committed как pointers, parked / deferred full content). Двенадцатишаговая probing taxonomy с adaptive depth по типу проекта. v0.5.0 — visibility дефолтов в Шаге 5, structured гейт после probes, jargon translation rule (Operational Rule 11), feature-level Mermaid с pre-baked skeleton. v0.6.0 — decomposition phase per D17/D18 (feature boundary refinement dialog, topological sort с inter-feature cycle handling, bundle generation per фичу, output в subdirectory с roadmap + bundle файлами). v0.6.1 — terminology realignment per D19 (фича = aggregate, функция = capability; module/cluster collapsed в фичу). v0.6.2 — patch fix к v0.6.1 implementation bug: bundle usage hint в template correct'нут с неверного per-function workflow на правильный aggregate workflow + minimal Group F start (feature-spec SKILL.md aggregate scope clarification note).
- **References:** product-spec-template.md, product-backlog-template.md, example-contact-tracker-mvp.md, **roadmap-template.md (v0.6.0)**, **bundle-template.md (v0.6.0)**.
- **Spec:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md` + amendment `docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment.md` + `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md` + `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design.md`. Companion handoff (v0.7 implementation deferred): `docs/handoffs/2026-05-26-product-spec-v0.7-retrospective-improvements-design-handoff.md`. **Reports:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design-report.md`, `docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment-report.md`, `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design-report.md`, `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design-report.md`.

#### `hi_flow/skills/arch-redesign/` (BUILT v0.1.0)
- **Status:** BUILT — design + SKILL.md + 3 references templates готовы (2026-04-27). **Purpose:** Project-level corrective. Консьюмит arch-audit findings + existing arch state, выдаёт refactor plan. См. D7. **Spec:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md`. **Report:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design-report.md`.

#### `hi_flow/skills/arch-audit/` (BUILT v0.2.6)
- **Status:** BUILT — runtime + SKILL.md (434 lines) + первый боевой прогон завершён. 133 tests (129 unit/component green; 4 integration требуют depcruise-бинарь), 15 baseline rules (incl. barrel-file), 18 D9 principles.
- **Purpose:** Phase 2 analytical. TS/Node runtime: baseline-rules, enrich-findings, generate-mermaid, report-builder, typescript-depcruise adapter, **`core/graph-core.ts`** (shared graph machinery — Ca/Ce/I/NCCD formulas SSoT + cycle/reachability traversal, импортируется arch-spec block C). Output: D8-compliant `audit-report.json` + `audit-report.md`. См. D7, D11, D12, D21.
- **Spec:** `docs/superpowers/specs/2026-04-28-hi_flow-arch-audit-design.md`. **Report:** `docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md`.

#### `hi_flow/skills/arch-spec/` (BUILT — design + SKILL.md + references)
- **Status:** BUILT — design-спека (18 секций) + SKILL.md (~400 lines) + 3 references (template 10 секций + Mermaid ego-skeleton, self-review-checklist, rules-patch-template переиспользован D11). Прошёл spec self-review + spec compliance review + behavioral validation (9 findings, существенные закрыты). **Боевой прогон:** выполнен 2026-05-31 (REH ERP, green field) — работающий софт; выявил amendment B+C+D (active-issues) + chain-находку A (→ bootstrap), roadmap-handoff 2026-06-01. closure backlog-sync wired на shared backlog-integration механизм (D22, в main). **Purpose:** Per-feature Phase 2, мост feature-spec → writing-plans. См. D21, D7.
- **Spec:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-design.md`. **Plan:** `docs/superpowers/plans/2026-05-31-hi_flow-arch-spec.md`. **Amendment (B+C+D+E):** `docs/superpowers/specs/2026-06-03-hi_flow-arch-spec-amendment-design.md` (implemented 2026-06-03, isolated review PASS). См. D24. **UX/UI amendment:** `docs/superpowers/specs/2026-06-03-hi_flow-uiux-boundary-amendment-design.md` (ceiling-cat 11 / §5.11 presentation, потребляет «Поверхности (UX)»). См. D25. **Platform-port probe amendment (A+, D26):** `docs/superpowers/specs/2026-06-04-hi_flow-arch-spec-platform-port-probe-amendment-design.md` (+ `-report.md`) — cross-cutting check «Shared-capability lookahead», awareness-only.

#### `hi_flow/skills/bootstrap/` (BUILT v0.7.1)
- **Status:** BUILT — SKILL.md + references (axis-taxonomy, coverage-manifest SSoT, scaffold-templates TS convention pattern). Прошёл spec-compliance (COMPLIANT) + behavioral (3 сценария) валидацию. **Первый боевой прогон (incremental, REH ERP frontend, 2026-06-02): успешен** — заскаффолдил React Vite SPA (apps/web), managed-гейты зелёные (typecheck/lint:fe/test), coverage-honesty сработал (frontend partial → записал Known Drift в REH «frontend вне arch-audit governance»). Прогон чистый — записи bootstrap (forward-safe biome override, durable D16, Stack как scope) корректны (подтверждено независимым review имплементатора). Ф3a relocation — pre-condition **distributable** прогона (self-containedness), не операторского.
- **Purpose:** Владелец технического фундамента проекта — Create flow ARCHITECTURE.md + app-stack probing + scaffolding + CI/baseline wiring. Атом-ось (probe→scaffold→wire) + режимы init/incremental; coverage-gated probing (coverage-manifest SSoT). Реализует D20 Функцию 1, закрывает находку A. См. P7, P8, KD2, D20.
- **Spec:** `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design.md`. **Report:** `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design-report.md`.

#### `hi_flow/skills/ops/` (BUILT v0.8.0)
- **Status:** BUILT 2026-06-03 — SKILL.md (13 секций) + references (profile-schema, template-manifest) + scaffold-templates (container/static/shared, параметризованы из боевой `Hedgeinform/zhenka`). Прошёл structural + behavioral (6 сценариев, субагент-симуляция) + spec-compliance (COMPLIANT) валидацию. **Боевой прогон (onboarding реального проекта на VPS) НЕ выполнялся** → OQ13.
- **Path:** `hi_flow/skills/ops/`
- **Purpose:** Владелец последней мили — доставка построенного проекта на удалённый сервер. Форма «профиль+рендер»: fix-profile (снять субстрат в operator-personal профиль) + onboard (рендер шаблонов под проект×профиль, CD = GH Actions→GHCR→SSH). Покрытие двухуровневое (covered/best-effort) + per-component; co-tenant-safe; decoupled от ARCHITECTURE.md (R5). Personal-first; distributable — расширение (профиль = шов). См. D23, D14, P6/P7/P8.
- **Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-ops-design.md`. **Plan:** `docs/superpowers/plans/2026-06-03-hi_flow-ops.md`. **Report:** `docs/superpowers/specs/2026-06-03-hi_flow-ops-design-report.md`.

#### `hi_flow/references/` (BUILT, shared)
- **Status:** BUILT — `architectural-principles.md` создан 2026-04-28 в сессии arch-audit design (**18 принципов**, 4 группы, scope = static-only). +1 `barrel-discipline` добавлен 2026-04-29.
- **Path:** `hi_flow/references/architectural-principles.md` (+ planned `architectural-principles-index.json`, auto-generated).
- **Purpose:** Family-shared референсы. Library statically-detectable архитектурных принципов с типовыми fix alternatives. Owner — arch-audit (curates content); read-only для arch-redesign, arch-spec. См. D9.
- **BUILT:** `backlog-integration.md` — shared механизм контрибуции в product-backlog (owner — product-spec; потребители feature-spec + arch-spec). D22, 2026-05-31.

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

### D10. Семейство hi_flow покрывает design phases (0-2) + deterministic hygiene enforcement layer для phase 3.

Phase 3 implementation methodology (TDD, plan execution, code review, verification, debugging) делегирована superpowers ecosystem — hi_flow её не дублирует. Phase 3 hygiene enforcement (deterministic quality gates, hooks с блокировкой `--no-verify`, blocking-режим arch-audit, distributable baseline configs для tooling) — **в scope hi_flow**, поскольку superpowers явно полагается на оператора с инженерным background'ом и эту обвязку non-engineer оператор сам не построит. `hi_flow:impl-plan` остаётся parked как «не делаем» (методология импла — superpowers). Boundary семейства = L2 design doc + L3 hygiene gates, но не L3 methodology.

**Уточнение scope L3 (2026-06-01).** Активный L3 = distributable baseline configs + CI/gates (Ф3a — relocation baselines внутрь плагина) + опц. blocking-режим arch-audit. **Хуки с блокировкой `--no-verify` (Ф3b) выведены в research-trigger**: качественно настроенного CI достаточно; вернуться к хукам только если CI окажется недостаточен (хуки ускорили бы локализацию vs разматывание цепочки постфактум, но сейчас несоразмерно). Развязывает зависимость bootstrap — Ф3a лёгкая (перемещение файлов + overlay), Ф3b не блокер. См. bootstrap design `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design.md` §14.

**Reviewability clause:** граница с superpowers — текущее состояние, не вечное. Если в дальнейшем выяснится, что superpowers не покрывает наши потребности в L3 в полном объёме (методология не подходит non-engineer аудитории, разрывы между L2 и L3 не закрываемы текущей split-схемой, или иные ограничения surface'нутся), hi_flow гипотетически может поглотить L3 целиком, включая методологию. На текущий момент такой потребности не ощущается; формулировка эксплицитна, чтобы будущие сессии не воспринимали границу как sacred.

**Триггер амендмента:** empirical research (2026-04-29) подтвердил отсутствие turnkey hygiene-enforcement plug'инов для Claude Code, ориентированных на non-engineer аудиторию. Эмпирическая проверка zhenka-bot и hi_flow/arch-audit показала отсутствие линтера, CI и хуков в принципе. Оператор зафиксировал решение шипить hi_flow на open source с pitch'ем «install hi_flow + superpowers, делай что говорят».

**Spec:** требуется новая design-сессия по L3 hygiene layer (hooks scope, baselines relocation, arch-audit blocking mode, decoupling от operator-personal artefakts).

### D11. Project rules — накопительный артефакт; arch-audit owns read/write/validation, arch-spec/arch-redesign генерируют rules-patches.

Project rules-файл (например, `dependency_rules.yaml`) — единственный источник истины для arch-audit при проверке. Накапливается распределённо: baseline (встроенный в arch-audit, universal + structural rules), patches от arch-spec (per-feature fitness function declarations), patches от arch-redesign cluster-mode (fitness checkpoints как rules). Patches — отдельные артефакты-кандидаты, **не пишутся в rules-файл автоматически**. Apply — explicit operator action: команда `arch-audit apply-patch <path>` или interactive prompt в начале следующего полного audit прогона (он сам сканирует pending patches и спрашивает). Валидация patch'а перед merge — ответственность arch-audit. Закрывает silent decay (забыть apply) при сохранении trust boundary (нет автозаписи в config из чужого скилла).
**Spec:** `docs/superpowers/specs/2026-04-27-hi_flow-arch-audit-design.md` (текущая сессия) + амендмент к `docs/superpowers/specs/2026-04-27-hi_flow-arch-redesign-design.md`.

### D12. barrel-discipline — 15-е baseline-правило arch-audit, вариант B.

Barrel detection: `index.ts` как pure re-export aggregator (≥80% re-exports, нет value declarations), импортируемый sibling-модулями — MEDIUM severity. Вариант B locked: barrels, импортируемые только внутри своего модуля, не флагируются. Threshold 0.8. Detection: content classification (regex) + depgraph cross-reference через `helpers/detect-barrels.ts`.
**Spec:** `docs/superpowers/plans/2026-04-28-arch-audit-barrel-detection.md`. **Report:** `docs/superpowers/plans/2026-04-28-arch-audit-impl-report.md`.

### D13. tsconfig preconditions для arch-audit зафиксированы в typescript stack file (closes OQ7).

Список tsconfig-опций, без которых depcruise-резолвинг на TS-проекте даёт false findings, перенесён в `~/.claude/architecture/stacks/typescript.md` § Cross-tool contracts как контракт «что требуется от проекта». Required: `tsconfig.json` существует; `compilerOptions.moduleResolution` set; `include`/`files` покрывает audit scope; `paths` consistent if used; `allowImportingTsExtensions: true` if explicit `.ts` imports. Recommended: `strict: true`. Эмпирическое обоснование — zhenka 0.2.3.
**Where checked:** preflight check **planned** в arch-audit — на момент D13 не реализован (есть только preflight для depcruise version). Этот файл фиксирует **что** требуется; arch-audit зафиксирует **как** проверяется отдельной задачей.
**Spec:** `~/.claude/architecture/stacks/typescript.md` § Cross-tool contracts.

### D14. hi_flow и superpowers — комплементарные слои, не overlap.

superpowers = methodology of implementation (как именно делать TDD, как писать план, как ревьюить, как верифицировать готовность, как дебажить). hi_flow = architectural and hygiene infrastructure (что считать архитектурным решением, как фиксировать, какие quality-инструменты обязательны, как их детерминированно gate'ить, что считать архитектурным долгом). При любом сомнении про scope: «это методология того, как делать?» → superpowers. «Это инфраструктура и нормативные правила того, что делать?» → hi_flow. Пересечения не должно быть; если возникнет — фиксируется как Known Drift и устраняется. Принцип work'ает в текущей split-схеме (см. D10 reviewability clause); при пересмотре границы D14 ревизуется одновременно с D10.

**Boundary clause — security review (2026-06-03, closes OQ12):** adversarial trust-chain review of security invariants (трассировка data-flow за границу диффа) = superpowers methodology, не hi_flow. arch-spec только ТЕГАЕТ security-critical инварианты §8 маркером `[trust-chain review required — not diff-local]` (downstream-сигнал); сам ревью не выполняет и не определяет. Тег — сигнал, не присвоение security-review в scope hi_flow. См. D24.

**Deploy/CD boundary clause (2026-06-03, R6, ops design):** для покрытой формы Dockerfile/CD = инстанцирование шаблона, которым владеет ops, не free-hand superpowers-execution. ops владеет deploy/CD-шаблонами + wiring; superpowers = методология импла нового кода проекта. Снимает формулировку D23 «Dockerfile/CD = superpowers». Совместимо с security-clause выше — разные швы (security review = superpowers; deploy-шаблоны = ops). См. D23, ops-spec §8.

**Триггер фиксации:** decision на расширение D10 в L3 hygiene layer surface'нул необходимость явного principle, по которому будущие развилки между «это в hi_flow или в superpowers?» решаются без re-litigation базовых вопросов.

### D15. product-spec v0.5.0 feedback iteration — visibility, jargon, module-level Mermaid.

Первая боевая сессия product-spec (REH ERP, 33 функции, 13 модулей) выявила три High Priority проблемы. Amendment v0.5.0 фиксирует решения: (a) Шаг 5 теперь требует explicit visibility presumed defaults + structured гейт после probes (закрывает silent skip из feedback §1; привязка к global principle 5); (b) новая Operational Rule 11 (jargon translation) отделяет internal D-N / CCP-N / кальки (enabler/domain feature/scaffolding/premortem) от operator-facing коммуникации с таблицей перевода; (c) Mermaid в Section 4 переходит с function-level (не рендерилось при 30+ нодах) на module-level с pre-baked skeleton (3 универсальные категории Infra/Passive/Domain + opt-in расщепление любой категории при семантическом триггере). Плюс low-priority cleanup: premortem-без-дельты как валидный исход, committed vs shipped terminology (signed = committed по дизайну, shipped = production), pivot guidance в Module assignment с обновлением cross-references.
**Spec:** `docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment.md`. **Report:** `docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment-report.md`.

### D16. Plugin marketplace cache требует ручного git fetch+ff после release.

Claude Code marketplace cache живёт в `~/.claude/plugins/marketplaces/hi_flow-marketplace/` как отдельный git clone репозитория. После `git push` в основной репо (с bump'нутой версией плагина) cache **не обновляется автоматически** при `plugin update` — работает по старому snapshot'у. Manual update обязателен: `cd ~/.claude/plugins/marketplaces/hi_flow-marketplace/ && git fetch && git merge --ff-only origin/master`. До этого шага новая версия плагина не видна в Claude Code (включая локальный setup оператора).

**Release flow для hi_flow:** bump версии в **обоих** манифестах синхронно — `hi_flow/.claude-plugin/plugin.json` И запись плагина `hi_flow` в корневом `.claude-plugin/marketplace.json` (поле `version`); они обязаны совпадать → commit → push в master → **manual fetch+ff в cache directory**. Без последнего шага release не доходит до пользователя; без синхронного бампа marketplace.json версия в маркетплейсе застревает. **Реальный дрейф (устранён 2026-05-31):** marketplace.json висел на `0.4.0` через релизы 0.5.0-0.6.3, пока plugin.json рос — D16-флоу исходно бампал только plugin.json. Оба синхронизированы на 0.6.4.

### D17. hi_flow:product-spec scope включает decomposition phase (iteration plan + feature bundles).

Decomposition product-spec на feature-spec кластеры с ordered roadmap и pointer-based context bundles — closure-phase product-spec скилла, не отдельный скилл семейства.

Обоснование: декомпозиция нужна во всех трёх режимах product-spec (fresh / update / new iteration); вынос в отдельный скилл создаёт три точки операторской координации с тем же контекстом, который только что был сгенерирован. Принцип единого entry-point per layer: product-spec — universal entry для всего, что касается «состав продукта»; feature-spec — entry для «как работает одна функция»; arch-spec — entry для «архитектура одной функции».

Output decomposition phase — третий тип артефакта product-spec session (рядом с product-spec.md и product-backlog.md): **subdirectory** `<product-slug>-iteration-<N>-plan/` содержащая `roadmap.md` + `bundle-<feature-slug>.md` × N (multi-file layout — boundary файла = boundary feature-spec session). Pointer-based bundle cards (lightweight refs на product-spec, не embed). Mechanics — см. D18.

**Terminology realignment (v0.6.1):** «cluster» в этом D17 переименован в «фича» (industry-aligned). Iteration plan directory содержит roadmap (с фичами) + bundle-<feature-slug>.md × N. См. D19 для full terminology shift detail.

**Ownership уточнение (D22, 2026-05-31):** backlog — shared product-composition artifact, не эксклюзив product-spec; product-spec первичный владелец (создаёт, владеет структурой/шаблоном), feature-spec и arch-spec — read+append+create-if-missing через shared backlog-integration механизм. См. D22.

**Триггер фиксации:** retrospective REH-ERP сессии 2026-05-25 выявил gap между product-spec (33 функции на выходе) и feature-spec (одна фича на входе); анализ trade-off'ов показал что включение в product-spec лучше отдельного скилла — контекст не дублируется, прецедент с backlog (один скилл уже выдаёт два артефакта разной природы), P4 защищает чистоту design (decomposition — execution planning, не design).

**Spec:** `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md`. Companion handoff (implementation deferred): `docs/handoffs/2026-05-26-product-spec-v0.7-retrospective-improvements-design-handoff.md`.

### D18. hi_flow:product-spec v0.6.0 decomposition phase — mechanics implementation.

Closure sub-phase product-spec'а, генерирующая iteration plan + per-cluster context bundles после Шага 12. Реализована v0.6.0.

**Trigger logic — два entry points:**
- **Entry A** — explicit gate в Шаге 12.5 после fresh mode closure (status flip `draft → signed`). Три опции: запустить / отложить (без маркера) / не нужно (маркер `decomposition: skipped` в frontmatter спеки).
- **Entry B** — session setup detection при обнаружении `signed` спеки без plan directory и без маркера. Три опции: запустить decomposition / открыть update mode / закрыть. Покрывает initial decomposition в update mode (типа REH-ERP сценарий — спека подписана до v0.6.0, плана нет).

**Mechanics:**
- **Feature boundary refinement** — default — фичи из Feature assignment Шага 4-5 без изменений; LLM/deterministic detection split candidates (≥5 функций + качественное разделение) и merge candidates (inter-feature dep density ≥3, либо явное упоминание оператором cross-feature lifecycle). Operator dialog с structured table; silent autoclustering запрещён per P6.
- **Topological sort** — Kahn's algorithm на feature-level dep graph (aggregation function-level `Зависит от`). Tie-break stable alphabetic + visibility «взаимозаменяемый порядок» в roadmap.
- **Inter-feature cycle handling** — genuine new finding (function-level Шаг 12.2 не ловит). 3 варианта резолва: merge cycle features / move function across boundary / focused mini-12.2 recovery с edit спеки (constrained slice of D14 update mechanics).
- **Bundle generation** — 8 элементов per фичу: feature functions list, upstream contracts, downstream consumers, CC inheritance, Sf resolved, backlog parked refs, user groups, scenarios. Pointer для длинных (function cards), verbatim для коротких (CC/Sf/groups/scenarios) per D17 spirit. Strict filter by formal references; empty section visibility.
- **Standing-policy candidates flag** — pt 11 retrospective minimum: scan CC спеки на indicators cross-iteration характера, flag-блок в конце roadmap. Full mechanism — v0.7.
- **Output** — subdirectory `<product-slug>-iteration-<N>-plan/` с `roadmap.md` (operator-facing navigation) + `bundle-<feature-slug>.md` × N (feature-spec input per фичу). Frozen invariant: mutable только поле `Статус:` в roadmap entries (manual progress tracking), всё остальное immutable. Soft enforcement в v0.6.0, hard — v0.6.3+. Plan status flip `signed → shipped` синхронно со спекой.

**Scope v0.6.0:** только initial decomposition в Fresh + Update session modes. Re-decomposition при изменениях функций active спеки + new iteration mode handling (committed pointers в bundles) — defer v0.6.3+. Feature-spec auto-read bundle — отдельный amendment feature-spec'а после v0.6.0; в v0.6.0 operator manually attach'ит bundle к feature-spec session.

**Terminology update v0.6.1:** all «cluster» references переименованы в «фича» — см. D19.

### D19. Terminology realignment v0.6.1 — фича = aggregate, функция = capability.

Hi_flow семейство terminology aligns под industry standard (Lean UX / Scrum):
- **Фича** (feature) — группа связанных функций, представляющая блок функциональности продукта.
- **Функция** (function / capability) — атомарная пользовательская задача per D2 three-test gate.

Previously (до v0.6.1) — D1 / SKILL.md product-spec использовали «feature = function» (narrow technical definition, conflicting с industry). Module/cluster/feature concepts collapse в один — фича.

**Mapping (old → new):**
- module (product-spec sense) → фича
- cluster (decomposition phase v0.6.0) → фича (concept collapsed)
- function (D1 narrow sense, atomic) → функция (= capability)
- module assignment → Feature assignment
- cluster boundary dialog → feature boundary refinement dialog
- cluster-level cycle → inter-feature cycle

**Realignment scope:** terminology only, no structural mechanics changes. F-* identifiers stable (структурно `F-<feature-slug>-<N>` parses естественно как «функция N внутри фичи `<feature-slug>`»). Module Map в ARCHITECTURE.md (про code-modules) не trogaem — это different concept, не collapse с product-spec фичами.

**REH-ERP existing artefacts cleanup:** product-spec.md / backlog / iteration plan directory refreshed find-replace pass'ом синхронно с release v0.6.1. Legacy «Модуль:» → «Фича:», «### Module:» → «### Фича:», «Функции этого блока» → «Функции этой фичи».

**Triggers фиксации:** empirical discovery в session 2026-05-27 — operator's mental model (industry-aligned) conflicts с current SKILL.md narrow definition. REH-ERP decomposition output (11 «clusters» reading как features, F-* как capabilities) подтверждает need realignment.

**Spec:** `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design.md`. **Report:** `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design-report.md`.

**Plain language constraint** — bundle и roadmap файлы operator-facing; roadmap — особенно (для управленца / продуктолога). Operational Rule 11 SKILL.md расширен на 12 новых v0.6.0 terms + plain language guarantee для новых артефактов.

**Триггер фиксации:** реализация design'а 2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md в той же сессии (operator decision override anti-pattern #8 хенд-оффа — implementation сразу после design'а вместо отдельной сессии; зафиксировано в implementation report).

**Spec:** `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md`. **Report:** `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design-report.md`.

### D20. hi_flow поглощает operator-personal `architecture` функционал тремя порт-задачами для open-source distribution.

Operator-personal `architecture` скилл декомпонируется на три function-cluster'а с разными use-flow:
- **Функция 1 — Initial creation** (Create flow для ARCHITECTURE.md, template, format validation, Topic Index v2 init, stack section bootstrap) → `hi_flow:bootstrap` (working name) = project init wizard + stack selection + initial macro-arch probing + folder skeleton.
- **Функция 2 — Living maintenance** (Bootstrap read, Write mode, Topic Index sibling check, Audit mode, Pending mechanism, Event detection — 10 categories, Active Issues integration) → `hi_flow:living-architecture` (working name) = полный порт maintenance функциональности.
- **Функция 3 — Reference content** (`global-principles.md`, `stacks/`, `stack-file-schema.md`) → relocation внутрь плагина (overlay-паттерн) через L3 hygiene design (handoff готов).

arch-spec **orthogonal** этому решению — per-feature Phase 2 prophylactic scope сохраняется без изменений; контракт с living-architecture (как arch-spec proposes decisions → who fixes в ARCHITECTURE.md) определяется в design-сессии arch-spec. Operator-personal `architecture` после порта = тонкий override-слой (personal global-principles overrides, custom stack extensions, personal triggers). **Closes part of OQ6** — decomposition план зафиксирован, mechanics конкретных портов — отдельные design-сессии.

**Triggered:** arch-spec design session 2026-05-28 — surface'нула что архитектурный функционал operator-personal скилла не монолит, а три разных ответственности.

**Spec:** Конкретные реализации — отдельные сессии. Roadmap: arch-spec (current 2026-05-28) → bootstrap → living-architecture → L3 hygiene.

### D21. arch-spec — полноценная архитектурная дизайн-спека фичи (мост feature-spec → writing-plans).

Per-feature Phase 2 скилл. Производит технический design-spec, consumable для `superpowers:writing-plans`, + rules-patch (D11). Четыре задачи: вывод архитектуры из продукта / устройство фичи / проверка встраивания (профилактика) / fitness-инварианты. Профилактика встраивания — одна из четырёх, не единственная суть; скилл нужен всегда (на green-field блок C неприменим, остальное работает). Вход: feature-spec + D8-снимок arch-audit (freshness через `audit_sha`; три ситуации green / brown+fresh / brown+нет→громкий сигнал). Блок C (анализ встраивания) — на модульном уровне, дельта = прогноз, гибрид код/LLM. Fitness-инварианты: первичный потребитель — реализация (профилактика), arch-audit вторичен (анти-регрессия); классификация по механизму (граф→rules-patch / код-схема→тест / динамика→текст). Decoupled от `architecture`-скилла (вариант 2, OQ6) — не пишет в ARCHITECTURE.md.

**Зависимость (принцип 10) — РАЗРЕШЕНА (2026-05-31):** shared graph-core построен в `hi_flow/skills/arch-audit/core/graph-core.ts` (Ca/Ce/I/NCCD как SSoT + новый Tarjan-traversal циклов/достижимости на декларативном графе). Блокер боевой работы блока C снят; остаётся боевой прогон block C. **Report:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-graph-core-report.md`.

**Spec:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-design.md`. **Plan:** `docs/superpowers/plans/2026-05-31-hi_flow-arch-spec.md`. **Report:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-design-report.md`.

### D22. Shared `backlog-integration` механизм — единая точка контрибуции downstream-скиллов в product-backlog.

Generic-алгоритм (detect `*backlog*.md` → harvest-contract → dedup+idempotency по `Originating analysis: <spec> § <id>` → patch+approval → create-if-missing) в `hi_flow/references/backlog-integration.md` (family-shared, owner — product-spec). Формат записи — `product-backlog-template.md`. Потребители: feature-spec + arch-spec (закрывает их принцип-10 зависимость, D21). backlog = shared product-composition artifact (D17). feature-spec работает standalone.
**Spec:** `docs/superpowers/specs/2026-05-29-hi_flow-feature-spec-backlog-integration-design.md`.
**Триггер:** feature-spec фидбэк (REH ERP audit 2026-05-28); resync 2026-05-31 → arch-spec второй потребитель → Approach B.
**Status:** BUILT (2026-05-31). **Report:** `docs/superpowers/specs/2026-05-29-hi_flow-feature-spec-backlog-integration-design-report.md`.

### D23. `ops` — отдельный скилл доставки/операционализации, отделён от bootstrap (стройка vs доставка).

ops владеет пятью столбами доставки: хост/рантайм, упаковка + CD-доставка, секрет-стор, сетевая доступность, наблюдаемость+восстановление. Резолвит bootstrap'овские `delegated`-оси (конкретный deployment-binding: где Postgres, MinIO vs AWS-S3, pg_cron). Граница: bootstrap = ось + код-абстракция + CI(гейты); ops = конкретная привязка + CD(доставка). bootstrap'овский `delegated` («until a deployment model is fixed», axis-taxonomy) — заранее вырезанное гнездо, ops и есть его «infra/deployment-bound consumer». Режимы как init/incremental: personal (известный фиксированный VPS → wire рано, set-and-forget) / distributable (probe таргета, P7-gated). По D14 (refined 2026-06-03, R6): решения о deploy-субстрате И deploy/CD-шаблоны+wiring = hi_flow (ops); covered Dockerfile/CD = инстанцирование шаблона ops, не free-hand superpowers; superpowers = методология нового кода проекта. Decoupled от ARCHITECTURE.md (R5, как D21/D24). Уточняет D20 — новый function-cluster сверх трёх портов operator-personal `architecture`.
**Внутренний дизайн:** BUILT 2026-06-03 (форма «профиль+рендер», personal-first; covered формы — container/static; покрытие двухуровневое + per-component). Субстрат заземлён на реальном VPS (spec §2 — не гипотеза Postgres/MinIO/pg_cron из исходной формулировки). **Боевой прогон (onboarding реального проекта на VPS) НЕ выполнялся** → OQ13. **Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-ops-design.md` (+ `-report.md`). **Plan:** `docs/superpowers/plans/2026-06-03-hi_flow-ops.md`. См. Module Map § ops.

### D24. arch-spec amendment — §10 split / green-field stack-signal / composition-root-aware rules-patch / security-tag + D14 boundary.

§10 разведён: §10.1 code-sight forks (→ writing-plans) · §10.2 deployment-bound bindings (рекоменд. дефолт + констрейнт, НЕ writing-plans; привязка внутри зафиксированной оси, не фиксация оси). Green-field: arch-spec сигналит «инфра-ось не зафиксирована → bootstrap», стек не фиксирует, таксономию не дублирует (C схлопнут в сигнал, P8/D20). rules-patch type-1 несёт composition-root exemption в `from.pathNot` (baseline-константа, ортогональна feature-allowlist). Security-critical инварианты §8 тегаются `[trust-chain review required — not diff-local]` (downstream-сигнал; ревью = superpowers, D14/E).
**Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-arch-spec-amendment-design.md` (+ `-report.md`). **Status:** implemented + released 2026-06-03 (B+C+D+E; isolated review PASS; commit `03d92ad` 0.7.2, свёрнуто в release 0.8.0). Осознанный P4-override (impl в design-сессии; rationale: overhead передачи > выигрыш изоляции).

### D25. UX/UI boundary — feature-spec владеет UX (слои 1-2), arch-spec владеет UI (слой 3); граница проходит внутри экрана.

3-слойная модель: (1) UX-поведение/логика + (2) UX-структура/IA → feature-spec; (3) UI/визуал → arch-spec (архитектура слоя 3) / дизайнер (пиксели). feature-spec эмитит опциональную секцию «Поверхности (UX)» (слои 1-2: поверхности, назначение, навигация, функц-состав, ключевые состояния); arch-spec потребляет её как факт (extract-before-probing) и проектирует §5.11 presentation architecture поверх, не переопределяя UX. Калибровка высоты — two-designers test («два дизайнера → визуально разные экраны, оба удовлетворяют спеке?»). Сопутствующее правило: поверхность ≠ канал (поверхность = где работает человек; канал = транспорт сообщения; один surface показывает много каналов). Инстанс P8 (altitude) на оси UX/UI; связан с D14 (complementary layers).
**Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-uiux-boundary-amendment-design.md` (+ `-report.md`). **Источник:** `docs/feedback/hi_flow-uiux-boundary-brief.md`. **Status:** implemented 2026-06-03 (feature-spec + arch-spec; isolated review PASS). Autonomous-session decision (оператор делегировал, спит) — architecture confirmation-gate замещён isolated review; на ревью оператора.

### D26. Платформенный зазор (first-feature-defines-shared-port) — на текущем этапе A+, не реестр.

Зазор «первая фича узко определяет сквозной порт» (object-storage ×2 + comm-channels в REH ERP) разрешается **awareness-probe в arch-spec** (cross-cutting check «Shared-capability lookahead»: триггер — floor-2 решение вводит порт/адаптер-границу; детект по признакам — backlog/roadmap называет др. потребителей / ARCHITECTURE флагует infra-constant / ортогональность домену → контракт шире узкого YAGNI + пометка §3 как platform port, не module-of-this-feature). Реестр platform capabilities (вариант B/C) **отклонён сейчас**: долг видимый (Known Drift) + погашаемый (arch-redesign) + линейный от длины потока + локализован в проектах, не в hi_flow; B конфликтует с decoupling arch-spec ↔ ARCHITECTURE.md (вариант 2/OQ6, зафиксирован в D21) и завязан на незавершённый living-architecture (D20). Awareness-only — без реестра, без чтения в block A, без product-spec секции, без события в architecture skill, без cross-skill write.
**Re-review trigger:** реальный поток 4+ потребителей одной способности на боевом проекте → переход к реестру с якорем в backlog-механизм (D22) + детектором в product-spec decomposition.
**Источник:** `docs/feedback/hi_flow-platform-architecture-gap-brief.md`. **Spec:** `docs/superpowers/specs/2026-06-04-hi_flow-arch-spec-platform-port-probe-amendment-design.md` (+ `-report.md`). **Status:** implemented 2026-06-04 (P4-override, эта сессия; isolated review).

### D27. Frontend coverage closed — React-ось `covered` (горизонтальное слоевое управление).

`frontend-layered-respect` (MEDIUM) + `frontend-layer-cycle` (CRITICAL) — императивный frontend-блок в arch-audit адаптере (run-level frontend-профиль, backend layered-правила пропускаются — нет false positives на `api`/`app`/`services`); scan-глоб → `.tsx`; добавлен `scaffold-templates/react/`; manifest interface/frontend → covered. Изоляция фич (vertical-slice) отложена — нужна правка модели модулей → active-issues. Глоб binary-gated (verify с depcruise-бинарём).
**Spec:** `docs/superpowers/specs/2026-06-05-hi_flow-frontend-coverage-completion-design.md`. **Status:** implemented 2026-06-05 (P4-override автономно; isolated re-review).

### D28. Fullstack-aware arch-spec — per-tree аудит + per-tree output/rules-patch.

arch-spec на fullstack-фиче (≥2 дерева, детект по «Поверхности (UX)» + бэк-модулях блока B) аудитит каждое **brown** дерево (invoke `cli-run-audit` per package; green-field дерево не аудитится), гоняет блок C по снапшоту (дизъюнктные графы → два прохода), выдаёт per-tree §1/§4/§5.1/§6/§8/§9 + один rules-patch на дерево. Имена модулей голые, дерево — routing-метка. bootstrap: soft guidance «раздельные пакеты». Без кода/схемы/merge. Прошла 4 изолированных дизайн-ревью + поведенческую валидацию (3 субагента, закрыты дыры green-field/granularity/precondition).
**Spec:** `docs/superpowers/specs/2026-06-06-hi_flow-fullstack-audit-design.md` (+ `-report.md`). **Status:** implemented 2026-06-06 (автономно; behavioral validation). Боевого прогона нет.

---

## Known Drift

### KD1. Typo в имени локальной директории — `agent_orchesration_skills` (должно быть `orchestration`).

Опечатка в названии локального workspace директории (отсутствует «t» после «s»). На GitHub репо назван корректно (`hi_flow`). Не блокирует работу. Переименование локально потребует обновления git remote и пересоздания связи. **Trigger для re-review:** при первом удобном случае (например, при чистке workspace или переезде на новую машину).

### KD2. ARCHITECTURE.md: bootstrap создаёт, living-architecture ведёт — осознанный разрыв single-ownership документа.

By-design следствие порт-модели D20 (Ф1 Create flow → bootstrap; Ф2 maintenance → living-architecture): один документ — два владельца на разных фазах жизни. Принято осознанно, обусловлено декомпозицией порта operator-personal `architecture`. Смягчение: стек = truth в конфигах (`package.json`/`tsconfig`/lockfile), `## Stack` — проекция → global «code is truth» не нарушается; разрыв только по владению документом-проекцией. Материализуется при impl bootstrap + living-architecture (оба TO DESIGN). **Trigger re-review:** пересмотр порт-модели D20 либо реальный конфликт двух писателей на практике.

### KD3. react.md § Cross-tool contracts устарел (global file) — frontend теперь в scope arch-audit.

Пункт «frontend outside arch-audit scope» стал ложным (frontend import-граф управляется `frontend-layered-respect`/`frontend-layer-cycle`, D27); пункт «no component-graph adapter» **остаётся верным** (render/hooks-дерево без адаптера). `~/.claude/architecture/stacks/react.md` — `[pending-Ф3a]`, вне write-scope плагина. **Trigger re-review:** оператор правит react.md, либо складывается в Ф3a relocation.

---

## Open Questions

### OQ1. Will the methodology deliver an ERP feature end-to-end?

Боевой тест запланирован на сессию 4 после готовности product-spec и arch-spec. Критерий успеха: можно ли пройти от ERP-микрофичи через все три скилла + impl до работающего кода без существенных доработок методологии по ходу. Если не может — сигнал к ревизии.

**Status update 2026-05-31 (частично закрыт):** backend Slice 1 (REH ERP audit) прошёл end-to-end — работающий софт (14/14 tests, typecheck+dep-audit clean). Методология на backend-слайсе подтверждена; находки доработки (B-G) — не «существенные доработки по ходу», а post-hoc refinement. Frontend-слайс (`audit-ui`) был заблокирован отсутствием владельца app-stack fixation (находка A → bootstrap). **Status update 2026-06-02:** bootstrap (incremental) разблокировал frontend — заскаффолдил React Vite SPA на REH, managed-гейты зелёные. Цепочка теперь покрывает и project-foundation шаг (bootstrap), не только feature-design. Полное закрытие OQ1 — после прохождения frontend-фичи (audit-ui) через arch-spec → writing-plans → impl поверх готового фундамента.

### OQ6. Decoupling hi_flow семейства от скилла `architecture` для market-ready версии. **[CRITICAL PATH per D10 amendment 2026-04-29]**

Сейчас arch-redesign (и потенциально arch-audit, arch-spec) ссылается на состояние проекта через скилл `architecture` — он управляет ARCHITECTURE.md, секцией Known Drift и активными fitness functions проекта. Для market-ready версии (распространение через marketplace другим solo-foundery'ам) такая привязка к operator-personal скиллу не работает. Нужно сделать пути к артефактам конфигурируемыми (default — текущая среда оператора, при необходимости — другой источник).

**Также сюда подтягивается** relocation stack-файлов: сейчас `~/.claude/architecture/stacks/typescript.md` + `references/typescript-baseline.md` живут в operator-personal области, но при distributable hi_flow они должны быть первичным источником **внутри плагина**, operator-personal копия становится либо синком, либо overlay-механизмом.

**Связано:** D9 library evolution — для v1 расширение через manual edit. Для market-ready — через GitHub issue + PR в публичный hi_flow репо (community-driven curation, maintainer review мерджит). Это часть market-ready подготовки, не отдельный механизм.

**Status переход 2026-04-29:** из «к решению при подготовке релизной версии» в **критический путь** в составе D10 amendment. Без decoupling distributable hi_flow физически невозможен.

**Status update 2026-05-28:** decomposition план зафиксирован в D20 — operator-personal `architecture` функционал разделяется на три порт-задачи (Функция 1 → bootstrap, Функция 2 → living-architecture, Функция 3 → L3 hygiene relocation). Mechanics конкретных портов — отдельные design-сессии.

### OQ9. feature-spec без боевого прогона — risk при scope-расширении hi_flow до open-source распространения.

D10 amendment (2026-04-29) расширяет hi_flow до design phases (0-2) + L3 hygiene enforcement и фиксирует решение шипить плагин на open source с pitch'ем «turnkey». Из трёх готовых L0-L2 скиллов:
- `arch-redesign` + `arch-audit` прошли совместный боевой прогон на zhenka-bot 2026-04-29.
- `feature-spec` реализован (v0.1.0), но **боевой прогон не выполнялся**.

При publish'е на open source с pitch'ем «делай что говорят» каждый из трёх скиллов должен быть verified. feature-spec — слабое звено в этом отношении. Open question: как обкатать feature-spec до релиза — на реальной ERP-микрофиче (изначальный план) или иной кейс? Какой риск релизить с неверифицированным скиллом? Риск вероятно низкий (markdown-only, deterministic instructions), но не нулевой.

**К решению:** при планировании первого open-source релиза hi_flow.

### OQ8. Campaign-based folder structure для audit/redesign artifacts.

**Проблема.** Сейчас flat-структура `<project>/audit-report/` смешивает три разных типа артефактов с разными lifecycle: (a) кампанийные baseline-snapshot'ы (initial и final audit-report.json/.md), (b) refactor execution artifacts (cluster baseline'ы, routing reports, applied-patches), (c) live verification state (depgraph-script output: graph.json, violations.json, dep-graph.md). Это создаёт путаницу при просмотре и провоцирует случайное удаление неправильного слоя — реальный кейс на zhenka-bot 2026-04-29: cleanup-сессия удалила routing reports приняв их за «execution artifacts которые не нужны».

**Предлагаемая структура.**

```
<project>/audit-report/
  campaigns/
    <YYYY-MM-DD>[/-suffix-при-collision]/
      roadmap.md           # SSoT для метаданных кампании
      initial-audit.json   # snapshot kickoff'a
      initial-audit.md
      redesign/
        clusters-input.json
        cluster-prose.json
        c1-baseline.txt + c1-routing.md
        c2-... applied-patches/
      final-audit.json     # snapshot закрытия (отдельный явный прогон)
      final-audit.md
    <next-campaign>/
      ...
  live/                    # gitignored
    graph.json
    violations.json
    *-dep-graph.md
```

**Owner и lifecycle.** roadmap.md — SSoT, owner = arch-redesign. Создаётся в triage-mode либо в cluster-mode (оба обязаны зафиксировать кампанию). frontmatter содержит `campaign_id`, `status: active|closed`, `mode: full-triage|cluster-only`, `goal`, `initial_audit`, `final_audit`. Closure flow в arch-redesign ставит `status: closed` + заполняет ссылку на final-audit. **Pointer-файл отдельной сущностью не нужен** — поиск активной кампании идёт по `find campaigns/*/roadmap.md` + grep `status: active`. Multi-active — guard rail в arch-redesign (refuse to create new active без явного override).

**Идентификатор кампании** — `<YYYY-MM-DD>` (опциональный `-<suffix>` если в один день стартует две). Дата однозначнее short-name'а.

**Изменения в инструментах.** arch-audit получает `--campaign <id>` флаг (либо resolves в `campaigns/<id>/`, либо через `--out-dir`). arch-redesign owns создание/закрытие roadmap. Local depgraph-script (если есть в проекте) пишет в `audit-report/live/`. Initial-audit может быть либо результатом отдельного `arch-audit` прогона, либо копией свежего глобального audit-report.json в момент создания кампании.

**Migration existing data.** Для проектов со flat-структурой — один `git mv` в первую кампанию. Для zhenka-bot конкретно: `audit-report/audit-report.json` + routing reports + applied-patches/ → `audit-report/campaigns/2026-04-28-pipeline-god-object/`, депграф-скрипт перенаправить в `audit-report/live/`.

**К дизайну.** Скилл arch-redesign отвечает за contract; arch-audit получает CLI-флаги; SKILL.md обоих обновляются. Не trivial change — затрагивает оба наших скилла плюс конвенцию для проектных live-tools.

### OQ10. Двунаправленная сверка backlog-контрибуций (Approach C) / дивергенция формата.

feature-spec и arch-spec дописывают в backlog снизу-вверх через shared механизм (D22). Открыто: нужна ли product-spec'у активная реконсиляция этих записей при новой итерации (Approach C) и что делать при дивергенции формата записи между скиллами. К решению при первом расхождении или росте числа контрибуций.

### OQ11. Packaging arch-audit (code-скилл) для public release — tests shipping + code-onboarding.

arch-audit — единственный code-скилл семейства (TS/Node runtime: `core/` + `adapters/` + `helpers/` + `package.json`/`tsconfig`/`vitest`; остальные 4 скилла — только `SKILL.md` + `references/`). При git-based distribution маркетплейс клонирует **всю** директорию скилла в кэш каждого юзера. Два вопроса к моменту public release:
1. **`tests/` (82 файла) едут каждому юзеру** — dev-артефакт, потребителю не нужен. Стандартного exclude (как `.npmignore`) у git-маркетплейса нет. Варианты: смириться (bloat, функционально безвредно) / вынести тесты из директории скилла (нетривиальный рефактор путей + потеря self-containedness).
2. **Code-onboarding** — рантайм требует `npm install` в директории скилла + бинарь `dependency-cruiser`; не plug-and-play как markdown-скиллы. Надо документировать в release.

`node_modules` корректно заигнорен (не едет). **Связано:** D10 (L3 hygiene), OQ6 (market-ready decoupling), OQ7-parked (tooling onboarding hook). **К решению:** при подготовке первого public-релиза hi_flow.

### OQ13. ops без боевого прогона — risk при первом реальном onboarding'е.

ops реализован (BUILT v0.8.0) + прошёл валидацию **симуляцией** (субагент, 6 сценариев), но реального onboarding'а проекта на VPS не было. Аналог OQ9 (feature-spec): markdown+шаблоны deterministic, риск вероятно низкий, но covered-путь на боевой co-tenant коробке вживую не проверён. **К решению:** при первой реальной доставке (кандидат — сервис/фронтенд на `zhenka-vps`).

### OQ14. Должен ли bootstrap класть CD-stub под ops, или ops всегда создаёт CD сам.

ops-spec §8: ops **создаёт** deploy/CD-воркфлоу сам (существующую заглушку достраивает). Хэндофф предполагал «усыновление bootstrap'овского orphan cd.yml», но bootstrap по текущей спеке CD-stub **не** кладёт. Открыто: оставить как есть (ops создаёт) или добавить bootstrap'у генерацию stub'а (тогда — амендмент bootstrap). **К решению:** при следующем касании bootstrap либо при первом ops-прогоне.

### OQ15. Fullstack audit — отложенные хвосты (от D28).

(1) Mixed-`src/` (всё в одном дереве) требует настоящей subtree-осознанности (эпик, родственник vertical-slice) — смягчён bootstrap-guidance (D28) для управляемых проектов, неуправляемый legacy best-effort. (2) Shared-пакет (`packages/shared`, импортируемый обоими) ломает дизъюнктность блока C по деревьям — **триггер пересмотра D28:** первый реальный пакет под `packages/`. (3) «Аудит монорепо одной командой» (оркестрация-надстройка в arch-audit, требует расщепления `buildReportData`) — отложено. Связки: D27, D28, active-issues vertical-slice.

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

### 2026-04-29 — OQ7 reframed: project tooling onboarding split out of hi_flow scope

**Что:** Старый OQ7 («tooling setup onboarding для новых проектов в семействе hi_flow», список `eslint / dependency-cruiser default ruleset / npm audit / tsconfig strict mode`) закрыт reframing'ом. Список из 4 при честном анализе разваливается: (1) `dependency-cruiser` уже embedded в arch-audit как backend через `typescript-depcruise` адаптер — не tooling что оператор настраивает; (2) `tsconfig strict` — precondition корректности arch-audit, остаётся в scope hi_flow как контрактное требование (новый narrow OQ7); (3) `eslint` — implementation discipline (Phase 3), за границей семейства per D10; (4) `npm audit` — security concern, ортогонален архитектуре, за границей. OQ7 переписан как narrow вопрос про tsconfig preconditions. Operator-level project tooling baseline (для оператора, не для семейства) — отдельная задача в отдельной сессии, не часть hi_flow.
**Почему:** Те сессии, что делали arch-audit, провели границу «design vs implementation» прямолинейно и решили что все 4 инструмента за пределом семейства. Это смешало две разные задачи — «что hi_flow конфигурирует» (правильный ответ: ничего из этих 4) и «какие preconditions hi_flow требует от проекта» (правильный ответ: некоторые tsconfig flags обязательны). Reframing разделил их. Триггер — операторский вопрос про список инструментов после реального прогона arch-audit на zhenka, где недоконфигурированный tsconfig дал каскад false findings и потребовал фиксов 0.2.3.

### 2026-04-29 — D12: barrel-discipline добавлен как 15-е baseline-правило arch-audit

**Что:** Реализован barrel detection (variant B) — `helpers/detect-barrels.ts` + `baseline:barrel-file` rule (MEDIUM) + D9 принцип `barrel-discipline` (18 принципов). 107 тестов green. Вариант B: только barrels, импортируемые sibling-модулями.
**Почему:** Barrels искажают dep-граф для статического анализа и маскируют реальный coupling между модулями. Вариант B locked per operator decision — per-module-internal barrels (легитимный package-internal API) не флагируются.

### 2026-04-29 — D13: tsconfig preconditions для arch-audit зафиксированы в typescript stack file (closes OQ7)

**Что:** OQ7 закрыт. Список tsconfig-опций, требуемых от TS-проекта для корректной работы arch-audit'а, перенесён в `~/.claude/architecture/stacks/typescript.md` § Cross-tool contracts. Список зафиксирован эмпирически — на базе чтения adapter-кода (`adapters/typescript-depcruise.ts`, `helpers/generate-depcruise-config.ts`) и реального кейса zhenka 0.2.3, не invented превентивно. Preflight-check для tsconfig в arch-audit — planned, отдельная задача.
**Почему:** До D13 контракт между arch-audit и проектом был unwritten — каждый раз оператор натыкался на false findings и фиксил по симптомам. Контракт в stack-файле убирает повторное расследование и даёт arch-audit'у явное место для будущего preflight-check'а.
**Spec:** `~/.claude/architecture/stacks/typescript.md` § Cross-tool contracts.

### 2026-04-29 — OQ8 opened: campaign-based folder structure for audit/redesign artifacts

**Что:** Зафиксирован open question про реструктуризацию `audit-report/` из flat-папки в campaign-folder структуру. Корень проблемы — смешение трёх lifecycle'ов в одной директории (campaign baseline'ы, refactor execution artifacts, live verification state) что приводит к accidental deletion. Предлагаемая структура: `audit-report/campaigns/<YYYY-MM-DD>/` с roadmap.md как SSoT, initial-audit + redesign/ subfolder + final-audit; `audit-report/live/` (gitignored) для live tools. Owner roadmap = arch-redesign в triage-mode и cluster-mode. Pointer-файл не нужен — active campaign определяется через `status: active` field в roadmap. Затрагивает arch-redesign (owns roadmap creation/closure), arch-audit (получает `--campaign <id>` flag), и конвенцию для проектных live-tools.
**Почему:** Триггер — реальный инцидент на zhenka-bot 2026-04-29, когда cleanup-сессия удалила committed routing reports (c1a/c1b/c2-routing.md) приняв их за «execution artifacts which are not needed». Восстановление через git checkout прошло без потерь, но flat-структура спровоцировала эту ошибку: visually невозможно отличить «это initial baseline кампании», «это intermediate refactor state», «это live tool output». Campaign-folder делает границы explicit на уровне путей, не на уровне знания контекста.

### 2026-04-29 — Status drift correction: arch-audit SKILL.md + first combat run

**Что:** Current Status и Module Map обновлены — `hi_flow:arch-audit` переведён в категорию «работает end-to-end» (был в «runtime реализован, SKILL.md в работе»). SKILL.md написан (434 строки), первый боевой прогон завершён без дополнительных проблем.
**Почему:** Drift discovered через прямой вопрос оператора. Принцип 9 (read current state, not target state) — документ отставал от реальности минимум на одну итерацию.

### 2026-04-29 — D10 amendment: scope expansion в L3 hygiene enforcement + D14: complementary layers principle

**Что:** D10 переписан. Старая формулировка «Phase 3 explicit out of scope, делегируется superpowers» заменена на «design phases (0-2) + deterministic hygiene enforcement layer для phase 3; methodology phase 3 остаётся в superpowers». Добавлен D14 — complementary layers principle (superpowers = methodology, hi_flow = architectural and hygiene infrastructure, no overlap). Добавлен reviewability clause в D10: граница с superpowers пересматриваема при появлении сигналов, что текущий split не покрывает потребности; в крайнем случае hi_flow может поглотить L3 целиком. OQ6 (decoupling от operator-personal скилла `architecture`) переведён в critical path и расширен на relocation stack-файлов внутрь плагина. Открыт OQ9 — feature-spec без боевого прогона как risk при scope-расширении.

**Почему:** Эмпирический research (web-discovery) подтвердил, что turnkey hygiene-enforcement plugin'ов для Claude Code, ориентированных на non-engineer аудиторию, на рынке нет. Эмпирическая проверка двух TS-проектов оператора (zhenka-bot и hi_flow/arch-audit) показала отсутствие линтера, CI и pre-commit hooks **в принципе** — не «плохо настроены», а отсутствуют физически. superpowers'а скилл `requesting-code-review` оказался LLM-ревью через субагента, не механической lint/typecheck/test pipeline'ой как изначально думали. Это означает, что superpowers без оператора-инженера не закрывает hygiene gap, и для целевой аудитории hi_flow (non-engineer product-people) этот gap остаётся открытым. Решение оператора — закрыть его внутри hi_flow и шипить на open source как «install hi_flow + superpowers, делай что говорят».

**Trigger amendments:** последовательность observations в текущей сессии — drift discovery (SKILL.md status) → research request (рынок) → empirical check (наличие tools'ов в проектах) → reading superpowers SKILL.md → strategic decision на расширение scope.

### 2026-05-25 — D15: product-spec v0.5.0 feedback iteration + D16: marketplace cache manual update

**Что:** D15 — amendment v0.5.0 для скилла product-spec по итогам feedback'а первой боевой сессии (REH ERP, 33 функции, 13 модулей). Три High Priority изменения: (a) Шаг 5 visibility presumed defaults + structured гейт после probes; (b) Operational Rule 11 — jargon translation rule с разделением internal vs operator-facing коммуникации; (c) module-level Mermaid в Section 4 с pre-baked skeleton (3 универсальные категории Infra/Passive/Domain + opt-in расщепление). Low-priority cleanup: premortem-без-дельты, committed vs shipped terminology, pivot guidance. Module Map обновлён до BUILT v0.5.0. D16 — обнаружено эмпирически в этом же release: marketplace cache не обновляется автоматически при `plugin update`, требуется manual `git fetch && git merge --ff-only origin/master` в `~/.claude/plugins/marketplaces/hi_flow-marketplace/`. Зафиксировано как обязательный шаг release flow.

**Почему:** Feedback после первой боевой сессии показал три неустранимых на скилл-уровне проблемы — silent skip probes в Шаге 5 (нарушение global principle 5 о fallback-молча), жаргон D-N/CCP-N протекает в operator-facing reply'и (нарушение D4 / P1 plain language для аудитории-продуктолога), function-level Mermaid не рендерится при >25 нодах. Все три — design-уровень, требуют amendment. D16 surface'нулся как блокер release: bump версии в master не давал product-spec видимости в Claude Code до manual fetch'а в cache. Без D16 каждый последующий release незаметно ломался бы.

**Trigger fixation:** D15 — feedback документ в корне проекта от оператора + boevая сессия. D16 — эмпирическое обнаружение в release v0.5.0; оператор вручную выполнил fetch+ff и зафиксировал поведение.

### 2026-05-26 — D17 (decomposition phase) + retrospective REH-ERP v0.4.0 prog → v0.7.0 deferred

**Что:** hi_flow:product-spec scope расширен до decomposition phase per D17 (v0.6.0 planned). Retrospective REH-ERP сессии (v0.4.0 прогон) выявил 13 improvement пунктов сверх того, что закрыто в D15 v0.5.0 — scaling probe-iteration по модулям, CCP2 self-application, architectural axes checkpoint, module-card revisit, pre-baked Mermaid skeleton, описания модулей, CC naming enforcement, адаптивные форматы Section 2/3, premortem tagging, Reason for parking, multi-message dump pattern, Sf-ID gap пометки, decision log appendix. Sequencing — две design-спеки (v0.6 immediate per D17, v0.7 deferred to next product-spec trigger event), implementation v0.7 зафиксирована как Active Issue с trigger condition «следующая реальная product-spec session со scope, активирующим affected pathways». Решение писать v0.7 design немедленно (а implementation отложить) — для preserving свежести retrospective контекста.

**Почему:** Анализ happy path (попытка пройти от product-spec REH-ERP к feature-spec'ам) обнаружил missing layer между ними. Trade-off analysis показал — единственный layer entry per concern (product-spec для «состав», feature-spec для «как работает одна», arch-spec для «архитектура одной») требует включения decomposition в product-spec (декомпозиция нужна во всех трёх режимах product-spec). Active issues недостаточны для preserving retrospective context (5-line bullets теряют nuance) — design specs нужны для quality. Параллельность design'ов разрешена CLAUDE.md global rule 10.

**Trigger fixation:** retrospective integration session 2026-05-26 после анализа happy path по REH-ERP.

### 2026-05-26 — D18: product-spec v0.6.0 decomposition phase implemented inline в design сессии

**Что:** v0.6.0 decomposition phase реализована в той же сессии что design (override anti-pattern #8 хенд-оффа per explicit operator decision). Implementation покрывает: Entry A gate в Шаге 12.5 + Entry B detection в session setup; новый top-level раздел `## Decomposition phase` в SKILL.md с 6 sub-phases (cluster boundary dialog, topological sort, cluster-level cycle handling с 3 вариантами резолва, bundle generation, standing-policy candidates flag pt 11 minimum, output artefacts); Operational Rule 11 расширен на 12 новых v0.6.0 terms + plain language guarantee для decomposition phase артефактов; новые reference файлы roadmap-template.md и bundle-template.md; product-spec-template.md frontmatter с optional `decomposition: skipped` метой; Format Rules с naming convention для plan directory и frozen invariant. ARCHITECTURE.md: D17 wording update (single file → subdirectory) + cleanup misplaced D16 paragraphs, новый D18 entry, Module Map status update.

**Почему:** Operator override scope decision сессии — implementation выгоднее inline т.к. design context fresh, можно сразу применить без re-derivation cost в отдельной сессии. Trade-off: нарушение anti-pattern #8 хенд-оффа (design + implementation в разных сессиях), но не нарушение P4 ARCHITECTURE (P4 — про два design'а в одной сессии, не про design+impl). Conscious decision зафиксирован в implementation report.

**Trigger fixation:** explicit operator instruction в design сессии после spec sign-off — «выполни реализацию inline и потом проведи self-review субагентом».

**Spec:** `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md`. **Report:** `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design-report.md`.

### 2026-05-27 — D19: terminology realignment v0.6.1 — фича = aggregate, функция = capability

**Что:** v0.6.1 — terminology cleanup hi_flow семейства под industry standard. Module/cluster/feature концепты product-spec'а collapse в один — фича. F-* identifiers stable (F-`<feature-slug>`-N parses естественно). Module Map в ARCHITECTURE.md не trogaem (separate concept). REH-ERP existing artefacts cleanup find-replace в product-spec / backlog / iteration-1-plan directory.

**Почему:** v0.6.0 implementation выявил drift через empirical evidence — REH-ERP decomposition output показал что operator's mental model (фича = aggregate of capabilities) aligns с industry, а current SKILL.md narrow terminology (feature = function, atomic) misframes. Operator interrupt'нул в session 2026-05-27 после анализа bundle файлов: «Я думал, что фича может включать в себя несколько функций». Empirical confirmation через 3 bundle файла reading подтвердил semantic misalignment.

**Trigger fixation:** mid-session discovery после v0.6.0 release. Decision — terminology cleanup сразу в новой patch v0.6.1, чтобы next feature-spec session использовала consistent terminology.

**Spec:** `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design.md`. **Report:** `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design-report.md`.

### 2026-05-27 — v0.6.2: bundle usage hint correction + feature-spec aggregate scope clarification (Group F minimal start)

**Что:** patch fix к v0.6.1 implementation bug + минимальный feature-spec compatibility note. Реализовано:

- `bundle-template.md` usage hint corrected — заменён неправильный per-function workflow («указать одну функцию из списка как target») на правильный aggregate workflow («Bundle описывает фичу целиком; feature-spec работает с фичей как единый scope; output — один feature-spec.md на всю фичу с hierarchical развилками per capability area»).
- 13 REH-ERP bundles updated — corrected hint header inserted в каждый файл (perl multiline insert после metadata block, до content).
- `feature-spec/SKILL.md` — добавлен «Feature scope clarification» section с explicit aggregate scope explanation + 8 probes масштабирование на feature-level + bundle input pattern + Direct path criterion clarification + when extraction в separate фичу oправдана.
- Module Map обновлены: product-spec → BUILT v0.6.2 + purpose note; feature-spec → status note про v0.6.2 clarification.

**Почему:** discovered mid-session 2026-05-27 после release v0.6.1 — implementation bug в bundle-template usage hint. Earlier в conversation сказано «feature-spec на cluster работает как aggregate spec», но потом в v0.6.1 spec implemented narrow per-function workaround (self-contradicting guidance). Operator caught contradiction перед feature-spec прогоном (не успел произойти damage от wrong guidance). Fix исправляет hint + adds minimal feature-spec compatibility note для consistency.

Scope v0.6.2 — focused fix scope: bundle hint correction + feature-spec aggregate clarification. **Group F minimal start** — full feature-spec amendment (auto-read bundle path discovery, formal aggregate mode flag, possible capability-spec consideration) defer'нут до empirical signal post-v0.6.2 prototype run.

**Trigger fixation:** operator explicit interrupt: «Я был уверен, что в фича-спек добавили функциональность, которая объясняет, как работать с бандлом в целом» — exposed contradiction в implementation.

**Spec:** v0.6.2 report (combined design + impl rationale) — `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.2-feature-spec-compatibility-patch-report.md` (no separate design spec для small focused patch — design rationale inline в report).

### 2026-05-28 — D20: decomposition operator-personal `architecture` для hi_flow port

**Что:** Зафиксирован план разделения operator-personal `architecture` функционала на три порт-задачи внутрь hi_flow плагина для open-source distribution. Функция 1 (initial creation) → новый скилл `hi_flow:bootstrap`. Функция 2 (living maintenance: Topic Index, Audit, Write mode, Pending, Event detection) → новый скилл `hi_flow:living-architecture` (working name). Функция 3 (reference content: global-principles, stacks/) → relocation в плагин через L3 hygiene design. arch-spec остаётся orthogonal — per-feature Phase 2 prophylactic scope без изменений.

**Почему:** Текущая arch-spec design session (2026-05-28) — операторская формулировка задачи surface'нула что архитектурный функционал operator-personal скилла, который сейчас за границами плагина, должен быть включён в hi_flow для open-source distribution. Анализ показал что три функции имеют разный use-flow и должны разделиться при порте. Решение детализирует OQ6 critical path план.

**Trigger fixation:** session 2026-05-28 — operator explicit ask «надо подумать, как нам это все включить в HiFlow» после reframe scope discussion. Decomposition зафиксирован прежде чем продолжить arch-spec brainstorm.

**Spec:** конкретные реализации — отдельные design-сессии. Roadmap: arch-spec (current) → bootstrap → living-architecture → L3 hygiene.

### 2026-05-31 — D21: arch-spec спроектирован и реализован (design + SKILL.md + references)

**Что:** Полный цикл arch-spec — design-спека (18 секций) → lightweight implementation plan (P5) → SKILL.md (~400 lines) → 3 references. Прошёл spec self-review (5 правок), spec compliance review (0 существенных), behavioral validation на REH ERP audit-фиче (9 findings: 1 HIGH + 3 MED + мелкие, существенные закрыты правками; ядро проходит end-to-end). arch-spec = полноценная архитектурная дизайн-спека фичи (мост feature-spec → writing-plans), не «просто профилактический». Закрыты OQ4 (Mermaid — ego-граф radius 1-2), OQ5 (связь с architecture — decoupling вариант 2), OQ3 (fitness format — rules-patch yaml D11 для граф-части + инвариант с механизмом в спеке), OQ2 (probing taxonomy — arch-часть через D21 floor+ceiling, product-часть через product-spec 12-step). Заземление probing taxonomy на канон через deep-research (arc42, ATAM, ArchUnit, fitness functions, DDD ACL).

**Почему:** Третий Phase 2 скилл семейства, замыкающий мост от продукта (feature-spec) к реализации (writing-plans). Заземлён на реальный feature-spec (REH ERP audit).

**Коллизия D20 (flag при мерже):** в этой ветке D20 = decomposition operator-personal architecture; в main backlog-integration design (2026-05-29) предлагал D20 под свой контракт. Развести нумерацию при мерже worktree → main.

**Deferred:** shared graph-core (upstream-задача в arch-audit, код + тесты, блокер боевой работы блока C); боевой прогон arch-spec (green-field на audit проверит блоки A/B/D/E; блок C — на второй фиче); пример выходной спеки в references (после прогона); arch-audit canonical-alignment правки (в chip).

**Spec:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-design.md`. **Plan:** `docs/superpowers/plans/2026-05-31-hi_flow-arch-spec.md`. **Report:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-design-report.md`.

### 2026-05-31 — D22: shared backlog-integration механизм (design + resync)

**Что:** feature-spec closure-sync отложенного в product-backlog, вынесен в shared-референс `hi_flow/references/backlog-integration.md` (Approach B) — т.к. arch-spec (D21) оказался вторым потребителем механизма, ссылающимся на него по имени. backlog = shared product-composition artifact (D17 уточнён). Impl pending (отдельная сессия).

**Почему:** фидбэк первой боевой feature-spec сессии (REH ERP audit 2026-05-28) — отложенное скапливается в N спеках без точки агрегации. Resync 2026-05-31 после мёрджа arch-spec аннулировал посылку «единственный consumer» → A заменён на B.

**Spec:** `docs/superpowers/specs/2026-05-29-hi_flow-feature-spec-backlog-integration-design.md`.

### 2026-05-31 — D22 реализован (shared backlog-integration mechanism)

**Что:** создан `hi_flow/references/backlog-integration.md`; feature-spec SKILL + template, product-backlog-template (формат-авторитет формализован под реальный артефакт), arch-spec SKILL (inline-алгоритм → pointer). Post-review фиксы: B1 (idempotency key — exact + name-fallback для pathless-записей), N1 (кардинальность `**Backlog:**` блока), S1 (mapping → pointer). plugin 0.6.3. Закрывает принцип-10 зависимость arch-spec (D21).
**Report:** `docs/superpowers/specs/2026-05-29-hi_flow-feature-spec-backlog-integration-design-report.md`.

### 2026-05-31 — shared graph-core построен (D21 принцип-10 блокер снят)

**Что:** Создан `hi_flow/skills/arch-audit/core/graph-core.ts` — SSoT чистых граф-функций над декларативным графом: Ca/Ce (`computeCoupling`), I (`instability`), NCCD, `reachableFrom` + новый Tarjan-traversal циклов (`findCycles`). arch-audit runtime (parse-depcruise, report-builder) переведён на него; поведение сохранено (129/129 unit/component green, typecheck чист). arch-spec SKILL.md Block C + References → конкретный путь к модулю.
**Почему:** upstream-зависимость боевой работы блока C arch-spec (D21, принцип 10). Cycle-детекцию нельзя импортировать из depcruise (он сканирует реальные файлы; у гипотетического графа фичи кода ещё нет) → новый алгоритм обхода. Формулы Ca/Ce/I вынесены из fused-цикла парсера / inline-выражения в единый источник (принцип 4).
**Report:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-graph-core-report.md`.

### 2026-06-01 — bootstrap design (находка A) + L3 scope refinement (Ф3b → research-trigger)

**Что:** Спроектирован `hi_flow:bootstrap` (design-ready, impl deferred) — project-level владелец технического фундамента, закрывает находку A первого боевого прогона arch-spec (REH ERP). Модель: атом-ось (probe→scaffold→wire) + два враппера (init/incremental); таксономия инфра-осей (находка C) = рабочий словарь bootstrap; coverage-gated probing (coverage-manifest SSoT, coverage-honesty); Create flow ARCHITECTURE.md (Вариант 1 — разрыв single-ownership принят как KD2, code-is-truth цел). D10 amendment: хуки `--no-verify` (Ф3b) выведены в research-trigger; bootstrap зависит только от Ф3a (relocation baselines+CI, лёгкое).
**Почему:** Находка A (нет владельца app-stack fixation) блокирует greenfield implementation рекуррентно (backend+frontend); bootstrap наполняет D20 Функцию 1 требованиями. Ф3b dropped по ROI — CI решает гигиену однократной настройкой; хуки несоразмерны (вернуться при недостаточности CI).
**Spec:** `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design.md`. **Roadmap фидбека:** `docs/handoffs/2026-06-01-arch-spec-feedback-roadmap-handoff.md`.

### 2026-06-02 — D23: `ops` — отдельный скилл доставки/операционализации (отделён от bootstrap)

**Что:** Развилка «кто владеет deployment-моделью» закрыта — выделен отдельный скилл `ops` (доставка/операционализация: хост, упаковка+CD, секрет-стор, сеть, наблюдаемость+восстановление), резолвящий bootstrap'овские `delegated`-оси (конкретные deployment-привязки). Граница: bootstrap = ось + код-абстракция + CI; ops = привязка + CD. Внутренний дизайн отложен в отдельную сессию (P4).
**Почему:** «Deployment» оказался не одной сущностью, а тремя на разных высотах: stack-оси (bootstrap), операционализация (дыра → ops), реализация адаптеров (обычная impl-цепочка). bootstrap не залезает на ops — его классификация `delegated` («until a deployment model is fixed») — заранее вырезанное гнездо под этого consumer'а. CI у bootstrap, CD у ops; разрез чистый.
**Spec:** TO DESIGN (отдельная сессия per P4).

### 2026-06-03 — D24: arch-spec amendment (B+C+D+E) design signed

**Что:** §10 разведён на code-sight (§10.1 → writing-plans) / deployment-bound (§10.2); green-field C схлопнут в сигнал «ось не зафиксирована → bootstrap» (P8/D20); rules-patch type-1 → composition-root exemption в `from.pathNot`; security-инварианты §8 тегаются `[trust-chain review required — not diff-local]` + D14 boundary-clause (closes OQ12).
**Почему:** первый боевой прогон arch-spec (REH ERP, 2026-05-31) выявил находки B/C/D/E; scope финализирован после постройки bootstrap.
**Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-arch-spec-amendment-design.md`. Impl — эта сессия (осознанный P4-override).

### 2026-06-03 — ops BUILT (spec+plan+report) + D14/D23 amendment

**Что:** Скилл `hi_flow:ops` спроектирован и реализован (форма «профиль+рендер», personal-first; covered формы container/static; покрытие двухуровневое + per-component; co-tenant-safe; decoupled от ARCHITECTURE.md). D23 переведён TO-DESIGN → BUILT. D14 получил deploy/CD boundary clause (R6): ops владеет deploy/CD-шаблонами+wiring, снимает формулировку D23 «Dockerfile/CD = superpowers». Версия плагина 0.7.2 → 0.8.0 (D16). Боевой прогон не выполнялся (OQ13).
**Почему:** Закрытие дыры доставки (D23) — заземление на реальном VPS (`zhenka-vps`) показало субстрат compose+nginx+LE+GHCR, state external (не гипотеза хэндоффа). Execution-шов находки A закрыт для covered-пути (шаблоны), best-effort оставлен честно открытым (OQ-ops-7 в spec).
**Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-ops-design.md`. **Plan:** `docs/superpowers/plans/2026-06-03-hi_flow-ops.md`. **Report:** `docs/superpowers/specs/2026-06-03-hi_flow-ops-design-report.md`.

### 2026-06-03 — D25: UX/UI boundary amendment (feature-spec ∥ arch-spec)

**Что:** Зафиксирована граница UI/UX внутри экрана: UX (слои 1-2 — поведение + структура/IA) → feature-spec (новая опц. секция «Поверхности (UX)» + structural probe + правило surface≠channel); UI (слой 3 — визуал) → arch-spec (ceiling-категория 11 / template §5.11 presentation architecture, потребляет UX как факт). Two-designers test — калибровка высоты. Инстанс P8 на оси UX/UI.
**Почему:** фича `comm` (REH ERP) с фронтендом вскрыла отсутствие явной позиции «что из фронтенда продуктовое, что архитектурное»; дефолт агента — сваливать структуру экрана в arch-spec. Бриф `docs/feedback/hi_flow-uiux-boundary-brief.md`.
**Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-uiux-boundary-amendment-design.md` (+ `-report.md`). Impl — эта сессия (автономный режим, осознанный P4-override; isolated review PASS).

### 2026-06-04 — D26: platform-port lookahead (A+) — arch-spec probe

**Что:** Зазор «первая фича узко определяет сквозной порт» (платформенные shared capabilities) разрешён вариантом A+ — cross-cutting check «Shared-capability lookahead» в arch-spec (триггер floor-2 порт → контракт шире YAGNI + пометка §3 platform port). Реестр (B/C) отклонён сейчас, дверь открыта с trigger'ом (4+ потребителя → backlog-якорь D22 + детектор в product-spec). Правки: SKILL.md (cross-cutting check + Op-rule 10), template §3, self-review-checklist.
**Почему:** REH ERP — object-storage переоткрыт дважды, comm-channels готов повторить третий раз предсказуемо. Профилактика на awareness дешевле arch-redesign-реконсиляции для предсказуемых случаев; полный реестр — золочение под нерепрезентативный ERP-кейс + конфликт с decoupling arch-spec ↔ ARCHITECTURE.md (вариант 2/OQ6, D21). Бриф `docs/feedback/hi_flow-platform-architecture-gap-brief.md`.
**Spec:** `docs/superpowers/specs/2026-06-04-hi_flow-arch-spec-platform-port-probe-amendment-design.md` (+ `-report.md`). Impl — эта сессия (P4-override; isolated review).
