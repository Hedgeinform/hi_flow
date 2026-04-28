# `hi_flow:arch-redesign` — Skill Design

**Status:** design v1, ready for SKILL.md drafting (Russian intermediate → English final).
**Date:** 2026-04-27.
**Family:** `hi_flow` — семейство скиллов методологии Three-Phase Flow для solo-founder + AI разработки.
**Sibling skills (planned):** `hi_flow:arch-audit` (upstream, Phase 2 analytical), `hi_flow:arch-spec` (Phase 2 prophylactic). **Built:** `hi_flow:feature-spec` (Phase 1).
**Architectural anchors:** D7 (Phase 2 family split), D8 (audit reason-field contract), D9 (shared library of architectural principles), OQ6 (decoupling for market-ready).

---

## 1. Назначение и scope

### Что делает skill

Project-level **терапевтический** скилл. Превращает архитектурный долг (накопленный в проекте, зафиксированный аудитом) в actionable план refactor'а.

Двухрежимный:

- **Triage-mode** — превращает набор архитектурных нарушений из аудита в **campaign roadmap**: список кластеров с приоритетами, зависимостями и судьбами (в кампанию / принят как долг / отложено).
- **Cluster-mode** — для одного кластера производит **refactor plan**: архитектурный выбор из альтернатив + целевое состояние + упорядоченные fitness checkpoints + проверка скрытых зависимостей.

### Что НЕ делает (явно out of scope)

- Не работает per-feature — для prophylactic per-feature архитектуры — `hi_flow:arch-spec`.
- Не аудитирует код — это `hi_flow:arch-audit` (upstream-зависимость).
- **Не покрывает Phase 3 (impl)** — это сознательное архитектурное решение семейства hi_flow, не парковка. Phase 3 рекомендуется через `superpowers:writing-plans` далее по цепочке (см. секцию 5, контракт Phase 2/3); operator волен использовать любой alternative toolchain.
- Не управляет project-wide ARCHITECTURE.md — это скилл `architecture` (в текущей среде оператора) или его эквивалент в market-ready версии.
- Не создаёт новых архитектурных принципов — импортирует из индустрии (SOLID, package principles по Мартину, hexagonal/ports-adapters по Cockburn, vertical slices, etc.).
- Не enforce'ит Phase 3 escalation на superpowers стороне — bail conditions встроены в design doc; classes B/C — operator-level methodology guidance, не automation candidate.
- Не решает «нужно ли мне запускаться» (per Anti-Pattern 3) — это controller-уровень, не skill-уровень. **И не gatekeep'ит на input validation уровне** — input validation = техническая проверка наличия валидных данных (см. секцию 1, «Входные условия»).

### Парковано

- Эмпирическая валидация скилла. Возможна только после готовности arch-audit и его прогона на реальном проекте.
- Уточнение порогов self-assessment (refine via use).
- Refinement bail conditions в refactor plan template и operator-level methodology guidance для классов B/C — через empirical use, после первых боевых прогонов.
- **Ценность session log как механизма** (evaluate post-первый прогон — оставлять или выкинуть весь механизм). Сам log в каждой сессии пишется обязательно (override-причины + abort-причины), пока механизм активен.
- **Точечная правка rules-patch template после arch-audit design сессии** (см. амендмент 2026-04-27 D11). Текущий template на provisional depcruise YAML формате. Когда arch-audit зафиксирует финальный wrapper format — синхронизировать `references/rules-patch-template.yaml` (и при необходимости детерминированную конвертацию в шаге 3 cluster-mode). Trigger: финализация `docs/superpowers/specs/<date>-hi_flow-arch-audit-design.md` + соответствующая запись в `ARCHITECTURE.md`.

### Входные условия (input validation)

**Концептуальная рамка.** Скилл не gatekeeper — он не решает «нужно ли мне запускаться». Если контроллер активировал arch-redesign, скилл всегда выполняется. Но **скилл проверяет входные данные** — без D8-валидного audit-report'а он галлюцинирует кластеризацию (см. D8: structured reason-поля — единственная защита от LLM-эвристик с false plausibility). Поэтому невалидный input — это не «оператор передумал», это техническое препятствие: **создавать осмысленный output не из чего**.

Operator override на этом уровне **не работает** — overрид'ить нечего, нет данных. Единственный путь к запуску скилла — валидный input. Это input validation, не gatekeeping.

**Формат подачи.** Оператор указывает путь к директории с audit-report'ом (по умолчанию `<project>/audit-report/`).

**Трёхуровневая модель валидации:**

| Уровень | Что проверяется | Что делаем |
|---|---|---|
| **1. Existence** | Файл audit-report существует по указанному пути | hard fail с error message + actionable next step |
| **2. Schema compliance** | Файл match'ит D8 schema: reason-поля у каждого finding'а, project-level метрики, audit_sha метаданные, ссылки на принципы из D9 библиотеки | hard fail с конкретным error message «что не так» |
| **3. Freshness** | `audit_sha` совпадает с текущим `git rev-parse HEAD` | soft ask с operator override |

#### Existence check (hard fail)

Если файл audit-report'а не найден по указанному пути:

> Audit-report не найден по пути `<path>`. Без structured findings скилл будет галлюцинировать кластеризацию. Запусти `arch-audit` (если установлен), или положи audit-report в формате D8 schema по этому пути.

Skill не идёт дальше.

#### Schema compliance check (hard fail)

Если файл найден, но нарушает D8 schema (отсутствуют reason-поля, нет audit_sha, нет library refs, etc.) — skill сообщает конкретное нарушение:

> Audit-report найден, но N findings из M не имеют reason-поля (нарушение контракта D8, см. `<schema-link>`). Перезапусти `arch-audit` или дополни вручную.

Skill не идёт дальше. Operator override этой проверки **не доступен** — без structured reasons skill производит bullshit, что хуже отсутствия output'а.

#### Freshness check (soft ask + override)

Если файл валиден по schema, skill сравнивает `audit_sha` с текущим `git rev-parse HEAD`:

- **Совпадают** → audit актуален, продолжаем молча.
- **Расходятся** → soft ask:
  > Audit проведён на коммите `<audit_sha>`, текущий HEAD — `<current_sha>`. С аудита прошло N коммитов. Запустить `arch-audit` заново или продолжить с этим?

  Оператор решает. Если выбирает «продолжить» — skill пишет в session log: причину и факт override'а.

Логика: коммиты могли быть в unrelated файлах, оператор знает контекст лучше, чем skill из git diff. Расхождение — flag, не блок.

#### Edge cases

- **Не git-репозиторий** (отсутствует `.git`) → freshness check невозможен. Skill показывает warning: «freshness check пропущен — проект не под git'ом. Полагаемся на операторское суждение об актуальности audit'а». Продолжает.
- **Что НЕ проверяется на freshness уровне:** dirty working tree, связь изменённых файлов с audited модулями. Операторское суждение.

#### Edge case: интеграция вне hi_flow плагина

Скилл может быть импортирован отдельно от arch-audit (кто-то берёт только arch-redesign из marketplace, имея свой собственный audit-инструмент). В этом случае:

- D8 schema публикуется как machine-readable артефакт (JSON Schema) в references скилла. Любой audit-инструмент может производить compatible output.
- Skill не пытается auto-convertить из произвольных форматов — это **не** наша забота, ад поддержки.
- Если у интегратора другой формат — он пишет конвертер сам, или не использует arch-redesign.

Сообщение операторам, у которых только arch-redesign:

> Skill требует audit-report в D8 формате (schema: `<link>`). Канонический producer — `arch-audit` из плагина hi_flow. Если у тебя другой audit-инструмент — посмотри schema и сделай конвертер.

### Выходные артефакты

- **Campaign roadmap** (триаж): `docs/superpowers/specs/<date>-arch-redesign-campaign.md`.
- **Refactor plan** (cluster-mode, по одному файлу на cluster session): `docs/superpowers/specs/<date>-arch-redesign-<cluster-name>.md`.
- **Rules-patch** (cluster-mode, по одному файлу на cluster session): `docs/superpowers/specs/<date>-arch-redesign-<cluster-name>-rules-patch.yaml`. Кандидаты на новые project rules, соответствующие fitness checkpoints этого кластера. **Не applied автоматически** — apply через `arch-audit apply-patch <path>` или через pending prompt при следующем audit прогоне. См. D11.
- **Session log** (alpha-only): `docs/superpowers/specs/<date>-arch-redesign-<topic>-session-log.md`. Записи об override'ах рекомендаций self-assessment'а и причинах abort'ов из escape valve. Цель — ревизия методологии после нескольких боевых сессий. Эвалюация ценности — после первого боевого прогона.

### Стратегическая позиция

`arch-redesign` — keystone для оператора-продуктолога в семействе. Phase 0 и Phase 1 (product / feature) — его strong zone, скиллы там ускоряют работу. Phase 2 (architecture) — пограничная зона, наиболее рискованная для качества всей цепочки. Phase 3 (impl) — out of family scope (см. секцию 5), там работают superpowers-инструменты.

**Что это формирует — требование к output артефактам, не к SKILL.md.** Refactor plan и campaign roadmap — артефакты для оператора-продуктолога на пограничной зоне; они должны явно surface'ить branch points, разжёвывать архитектурные решения, давать защиту от слепой зоны через структуру. Сами SKILL.md (для Claude'а) остаются tight imperative — это разные слои с разной аудиторией. Plain language принцип и подробное обоснование решений живут в **output / references**, не в SKILL.md.

---

## 2. Активация и mode selection

### Триггеры активации (explicit-only)

Skill **не** активируется автоматически. Только по explicit запросу оператора:

- «запусти arch-redesign», «давай сделаем редизайн», «спроектируем фикс архитектурного долга».
- «run arch-redesign», «let's redesign», «design refactor for these findings».

### Anti-triggers (не активируется автоматически)

Per Anti-Pattern 4 — anti-triggers полезны для near-miss disambiguation:

- «давай проверим архитектуру», «запусти аудит» — это `arch-audit`, не redesign.
- «что у нас с кодом», «найди проблемы» — research / debugging, не redesign.
- «сделай рефакторинг X» — это execution-level, Phase 3 territory.
- «давай спроектируем фичу X» — feature-level prophylactic, `arch-spec` или `feature-spec`.

### Mode selection (НЕ skip, **always execute**)

Per Anti-Pattern 3 — skill всегда выполняется, когда вызван. Решает только режим: triage или cluster-mode.

**Default — operator override always wins.** Skill даёт рекомендацию, оператор выбирает.

**Сигналы для рекомендации (только детерминированные, из audit-данных):**

| Сигнал | На «триаж» | На «direct cluster-mode» |
|---|---|---|
| Количество findings | 10 и больше | 1-2 |
| Количество разных reason'ов | 3 и больше | один |
| Размер потенциального кластера | 3+ кластеров или один с 10+ нарушений | один кластер 3-7 нарушений |
| Доля unmapped findings | > 10% | низкая или нулевая |
| Severity-разбивка | есть CRITICAL | только MEDIUM/LOW |
| Cross-cluster signals | пересечения по модулям с разными reason'ами | нет пересечений |

**Conservative default:** при противоречии сигналов — преобладают «триаж». Cost от пропущенной приоритизации выше, чем от лишней триажной сессии.

**Сигналы из диалога — НЕ используются.** Контекст и срочность работы — территория оператора, его override'а более чем достаточно. Skill не дублирует то, что оператор и так знает (single ownership of decision factors).

### Алгоритм mode selection

1. Skill читает audit-данные.
2. Применяет детерминированные сигналы.
3. Формирует рекомендацию: **триаж** / **direct cluster-mode** / **триаж рекомендуется, но direct допустим**.
4. Показывает оператору рекомендацию + причины plain language: «вижу 14 findings, 4 разных reason'а, 2 CRITICAL — рекомендую триаж».
5. Оператор соглашается или overrides.
6. Если override противоречит рекомендации — skill записывает причину в session log одной строкой.

### Common Rationalizations (per Anti-Pattern 5)

| Мысль | Реальность |
|---|---|
| «Аудит небольшой, прыгну сразу в cluster-mode» | Если в аудите 3+ разных reason'а — нарушения скорее всего НЕ в одном кластере. Direct без триажа = риск проектировать фикс под mis-grouped кластер. Используй триаж. |
| «Я знаю, что чинить, триаж не нужен» | Триаж выявит cross-cluster зависимости, которые ты не замечаешь. Если решишь после триажа, что и так знал — потеря десяти минут. Если не делать — риск неоптимального порядка фиксов. |
| «Свежего аудита нет, но я и так знаю, что чинить» | Без reason-полей кластеризация теряется в LLM-эвристиках с риском галлюцинаций (D8). Запусти `arch-audit` сначала. Pre-condition не обходится. |

**Note для семейной консистентности.** Старый handoff product-spec/arch-spec'а декларировал паттерн «skip / direct / brainstorm» для каждой фазы. Здесь от skip отказались осознанно — следствие Anti-Pattern 3 («skill — executor, не gatekeeper»). Skip как опция в mode selection отменяется. Mode selection даёт только варианты исполнения (triage / direct cluster-mode), не «нужно ли запускаться». Будущим сессиям семейства (arch-spec, product-spec) — учитывать как новую конвенцию.

---

## 3. Triage-mode

### Назначение

Превратить набор архитектурных нарушений из аудита в **campaign roadmap** — список кластеров с приоритетами, зависимостями, судьбами. Оператор выходит из триажа со чёткой картиной «что чинить, в каком порядке, что отложить, что принять как долг».

### Session intro (показ, не probe)

Skill показывает:
- Общую статистику аудита: количество findings, разбивка по severity.
- Количество unmapped findings (без reason или со слабой формулировкой).
- Auto-grouping по reason: первый драфт списка кластеров.

### Probing taxonomy — 5 шагов

#### Шаг 1. Уточнение формы кластеров

Skill показывает таблицу из auto-grouping с рекомендацией по каждому кластеру и **поднимает вопросы только там, где видит развилку** (паттерн «surface only branches»). По остальным — констатация без задержки.

Возможные действия по кластеру (skill recommends, operator confirms or overrides):

- **Подтвердить.**
- **Объединить с другим кластером**, если корневые причины фактически совпадают (одно архитектурное недоразумение, разнесённое на два formulation в reason'ах).
- **Разделить кластер**, если внутри него две разные проблемы.

**Sub-probe для unmapped findings** (отдельно): мини-кластер с пометкой `unmapped`, разнести по существующим, объединить unmapped'ы между собой.

После шага 1 набор кластеров финализирован.

#### Шаг 2. Назначение судьбы каждому кластеру

Для каждого кластера три **взаимоисключающих** варианта:

- **В кампанию.** Идёт в дальнейшую обработку.
- **Принять как долг.** Не лечим. Уходит в Known Drift через скилл `architecture` (через детектор-механизм, см. секцию 5).
- **Отложить.** На следующую кампанию.

Skill recommends на основе сигналов (severity, размер, cascade-эффект); operator confirms or overrides.

#### Шаг 3. Выявление зависимостей между кампанийными кластерами

Только для тех, что в кампанию. Skill предлагает связи по двум сигналам:

- **Общие модули.** Кластеры, трогающие одни модули, скорее всего нужно делать последовательно.
- **Технические блокировки.** Checkpoint кластера A не может выполниться, пока не сделан кластер B.

Operator confirms or corrects на развилках.

#### Шаг 4. Приоритизация кампанийных кластеров

Skill предлагает порядок по сигналам: severity (CRITICAL раньше), cascade-эффект (разблокирующие — раньше), размер (компромисс по контексту). Operator corrects.

#### Шаг 5. Sanity check кампании

- **Покрытие.** Каждое finding имеет judgment (в кампании / принят как долг / отложен / в составе unmapped).
- **Связность.** Граф зависимостей между кампанийными кластерами не должен сам быть кольцевым.
- **Размеры.** Кампанийные кластеры размером 10+ — либо обоснование, либо настоятельная просьба разбить.

### Сквозные проверки (применяются на всех шагах)

- **Coverage.** Каждое finding имеет judgment.
- **Plain language** (применяется к output, не к SKILL.md).
- **Cluster size guard.** Рекомендуемый диапазон 3-7 нарушений на кампанийный кластер.

### Формат output (campaign roadmap)

Файл: `docs/superpowers/specs/<date>-arch-redesign-campaign.md`.

**Высокоуровневая структура** (детальный шаблон — в `hi_flow/skills/arch-redesign/references/campaign-roadmap-template.md`):

- Список кампанийных кластеров (имя + корневая причина + findings + размер + приоритет).
- Списки принятых долгов и отложенных кластеров (отдельно).
- Текстовая таблица зависимостей.
- Mermaid-диаграмма зависимостей.

**Правило регенерации Mermaid (дисциплинарное в SKILL.md).** Source of truth — текстовая таблица. После любого изменения таблицы skill обязан перегенерировать диаграмму строго по таблице. Если эмпирически окажется, что забывает — добавим детерминированный helper-скрипт. До этого момента — YAGNI, дисциплина.

### Self-Review (через субагента с изоляцией контекста)

После того, как 5 шагов пройдены и campaign roadmap записан в файл, но **до** предъявления оператору, skill запускает Self-Review через изолированного субагента. Main agent immersed в content и подвержен confirmation bias — fresh subagent объективнее.

Передаётся: путь к файлу roadmap'а + checklist. **Conversation history НЕ передаётся.**

**Self-Review checklist для триаж-output'а:**

- **Placeholder scan.** Нет `TBD`, `TODO`, размытых формулировок, кластеров без имени или корневой причины.
- **Internal consistency.** Судьбы кластеров не противоречат приоритизации (например, cluster, помеченный как «отложен», не стоит первым в порядке проработки). Граф зависимостей не противоречит таблице.
- **Scope check.** Артефакт остаётся на уровне триажа — кластеризация и приоритизация. Не уходит в дизайн refactor'ов внутри кластеров (это cluster-mode территория).
- **Ambiguity check.** Названия кластеров и формулировки корневых причин однозначны. Зависимости между кластерами явно выражены (что блокирует что), не оставлены на догадку.
- **Format compliance.** Каждый кластер имеет: имя + корневую причину + список findings + размер + приоритет. Кампанийные / принятые долги / отложенные — в отдельных списках. Mermaid-диаграмма зависимостей сгенерирована из таблицы (источник истины — таблица).
- **Coverage.** Каждое finding из аудита имеет judgment (в кампании / принят как долг / отложен / в составе unmapped).

**Apply fixes inline.** Skill применяет правки по findings субагента. **Без повторного Self-Review** — fix and move on. Это canonical Anthropic pattern.

### User Review Gate

После Self-Review и применения фиксов skill предъявляет оператору:

> Campaign roadmap записан в `<path>`. Прочитай и дай знать, если хочешь внести правки до того, как переходить к cluster-mode сессиям.

Skill ждёт ответа оператора. Если правки — applies + re-run Self-Review. Только после approval — закрытие сессии.

### Transition offer (после approval)

После approval campaign roadmap'а skill explicit'но предлагает три опции:

> Campaign roadmap готов и записан в `<path>`. Что дальше:
> 1. Запустить cluster-mode сессию для кластера `<name>` (highest priority по roadmap).
> 2. Выбрать другой кластер из roadmap для запуска.
> 3. Остановиться — вернёмся к остальным кластерам в следующих сессиях.

Skill **не** chain'ит автоматически. Ждёт операторского выбора. Operator решает с учётом контекста сессии (не загружен ли уже, есть ли время на следующий кластер сейчас).

### Закрытие сессии

По выбору оператора:
- **Опция 1 или 2** → skill инвоит cluster-mode для выбранного кластера, передавая cluster scope из roadmap'а.
- **Опция 3** → skill сообщает: «roadmap записан в `<path>`; для каждого кампанийного кластера — отдельная cluster-mode сессия в порядке, заданном roadmap. Можешь вернуться позже».

Полная структура закрытия: **Output written → Self-Review → Apply fixes → User Review Gate → Transition offer → Closure действие**.

---

## 4. Cluster-mode

### Назначение

Спроектировать **refactor plan** для одного кластера связанных архитектурных нарушений. Оператор выходит с actionable планом для импл-сессии: архитектурный выбор + целевое состояние + упорядоченные fitness checkpoints + проверка скрытых зависимостей.

### Entry paths

1. **Из триажа.** Оператор выбрал cluster из campaign roadmap → запускает cluster-mode сессию по нему.
2. **Direct.** Mode selection рекомендовал «триаж не нужен» (или operator overrode), сразу cluster-mode на единственном кластере.
3. **Re-entry.** Phase 3 эскалировала обратно (см. секцию 5 — Phase 3 эскалации) → возвращаемся в cluster-mode для доработки плана.

### Session intro (показ, не probe)

Skill показывает:
- Cluster scope: список нарушений внутри.
- **Корневую причину из reason-полей audit'а** (через библиотеку принципов D9). Skill **не переподтверждает** root cause — это территория audit'а (D8). Если оператор хочет возразить — делает это через override-путь.
- Связь с другими кластерами (если есть, из roadmap триажа).

### Probing taxonomy — 4 шага

#### Шаг 1. Поверка архитектурных альтернатив

Skill достаёт из библиотеки принципов (D9) типичные альтернативы для названного принципа. Например, для «missing-transport-layer»: extract transport/, DIP via interface, merge dispatcher into pipeline. Каждая альтернатива — с короткими плюсами-минусами.

#### Шаг 2. Выбор альтернативы

Operator выбирает; альтернативы и обоснование выбора фиксируются в **ячейке-развилке** (формат от feature-spec — `### Rx [decision: ...] / Альтернативы / Решение / Связи`).

#### Шаг 3. Определение целевого состояния + упорядоченных fitness checkpoints + генерация rules-patch

- **Target state.** Что должно выполняться в новой архитектуре. На **module-level** (например, «модуль `transport/` существует, send-path-логика живёт там»), **не** на code-level.
- **Fitness checkpoints.** Упорядоченные архитектурные инварианты, каждый — в языке audit'а («нет ребра `dispatcher → pipeline`»). **Checkpoints касаются только этого кластера.** Если есть пересечение с другим кластером — пометить в шаге 4 (зависимости), не в checkpoints этого кластера.
- **Rules-patch.** После того как fitness checkpoints определены, скилл **детерминированно конвертирует** каждый checkpoint в depcruise rule (provisional формат — финальный согласуется в arch-audit design сессии, см. секцию 5 disclaimer). Patch — отдельный YAML-файл (`<date>-arch-redesign-<cluster-name>-rules-patch.yaml`). Granularity — один patch на cluster (один файл на cluster session, все правила кластера внутри). Каждое правило обязано иметь поле `principle` — ссылку на canonical principle id из библиотеки D9 (требование D8, применённое к rules). **Имя правила соответствует имени checkpoint'а** для трассируемости. Patch **не applied автоматически** — это второй output скилла, кандидат на расширение project rules. Apply — explicit operator action через arch-audit (см. D11).

#### Шаг 4. Проверка скрытых зависимостей и cluster-cluster связей

Закрытый чеклист (не открытый premortem):

- **Runtime-зависимости** (config-load order, lazy imports, dynamic dispatch).
- **Тестовая инфраструктура** (моки, привязанные к структуре модулей).
- **Миграции данных.**
- **Внешние потребители.**
- **Конфигурация / ENV.**
- **Cluster-cluster связи.** Этот кластер блокируется другим / блокирует другой.

### Сквозные проверки

- **Покрытие.** Все нарушения в cluster покрываются выбранной альтернативой и checkpoints. Если какое-то нарушение остаётся вне фикса — cluster mis-grouped (см. escape valve).
- **Phase 2/3 contract.** Артефакт остаётся на уровне архитектурного состояния и инвариантов; конкретные file moves, function signatures, импл-детали — **не** этот скилл, Phase 3.
- **Plain language** (применяется к output).

### Session-level escape valve

Если на шагах 3 или 4 возникает сигнал «это finding / эта зависимость не вписывается в выбранную альтернативу / этот кластер на самом деле не связан корневой причиной» — оператор может прервать cluster-mode и вернуться в triage для перекластеризации. Это session-level поведение скилла, не отдельный probing-шаг. В session log записывается причина abort'а.

### Формат output (refactor plan + rules-patch)

Cluster-mode сессия производит **два артефакта**:

#### Refactor plan

Файл: `docs/superpowers/specs/<date>-arch-redesign-<cluster-name>.md`.

**Высокоуровневая структура** (детальный шаблон — в `hi_flow/skills/arch-redesign/references/refactor-plan-template.md`):

- **Goal line** — single sentence, что фиксим (см. секцию 5, gap-fill для writing-plans compatibility).
- **Tech Stack line** — стек проекта (TS / Node / etc).
- **Refactor framing note** — type=refactor, behavior preservation critical.
- **Cluster scope:** входящие findings + корневая причина + связь с roadmap.
- **Ячейки-развилки (cells):** альтернативы + решение + обоснование.
- **Target state** на module-level.
- **Success criteria (fitness checkpoints)** — упорядоченные архитектурные инварианты, явно framed как success criteria для writing-plans.
- **Stop conditions** — bail conditions для класса A (см. секцию 5, контракт Phase 2/3).
- **Hidden dependencies** — список с judgement (проверено / нужна работа / закрыто).
- **Cluster-cluster связи.**
- **Rules-patch reference** — путь к patch-файлу + список правил в нём + инструкция apply через `arch-audit apply-patch`.

#### Rules-patch

Файл: `docs/superpowers/specs/<date>-arch-redesign-<cluster-name>-rules-patch.yaml`.

Структура (provisional depcruise YAML формат — финал в arch-audit session):

- `forbidden:` — массив правил-запретов, каждое с `name`, `severity`, `from.path`, `to.path`, `principle`.
- `required:` — массив правил-требований (например, существование модуля), каждое с `name`, `severity`, `description`, `principle`.

Каждое правило обязано иметь поле `principle` — canonical principle id из D9 библиотеки. Имя правила трассируется на имя checkpoint'а в refactor plan'е.

Полная structура обоих output'ов с примерами заполнения — в reference template'ах:
- `hi_flow/skills/arch-redesign/references/refactor-plan-template.md`
- `hi_flow/skills/arch-redesign/references/rules-patch-template.yaml`

SKILL.md ссылается на references, не воспроизводит структуру в теле.

### Self-Review (через субагента с изоляцией контекста)

После того, как 4 шага пройдены и оба cluster-mode артефакта записаны (refactor plan + rules-patch), но **до** предъявления оператору, skill запускает Self-Review через изолированного субагента (тот же паттерн, что в triage-mode).

Передаётся: **оба пути** (refactor plan + rules-patch) + checklist. **Conversation history НЕ передаётся.** Без path'а к patch-файлу субагент не сможет верифицировать пункт «Rules-patch generation» (там проверки YAML validity, principle-полей, трассируемости имён).

**Self-Review checklist для cluster-mode output'а:**

- **Placeholder scan.** Нет `TBD`, `TODO`, размытых формулировок, fitness checkpoints без явных условий.
- **Internal consistency.** Выбранная альтернатива в развилке-ячейке логически приводит к target state'у. Target state логически даёт fitness checkpoints. Hidden deps не противоречат предположениям альтернативы.
- **Scope check.** Артефакт остаётся на **module-level** (extract module, change boundary, break cycle), не сполз на code-level (write function X, edit file Y, change line Z). Phase 2/3 граница удерживается.
- **Ambiguity check.** Cells развилок имеют явный status, alternatives, decision, rationale. Fitness checkpoints в языке audit'а (нет ребра X → Y, кольцо X-Y-Z отсутствует), не в свободной формулировке.
- **Format compliance.** Cells в feature-spec формате (`### Rx [decision: ...] / Альтернативы / Решение / Связи`). Target state на module-level. Fitness checkpoints упорядочены и формализованы. Hidden deps закрытый чеклист (runtime / тесты / миграции / внешние потребители / ENV / cluster-cluster).
- **Coverage.** Все нарушения в cluster покрываются выбранной альтернативой и checkpoints. Если какое-то finding остаётся вне фикса — это сигнал mis-grouped кластера (escape valve). Coverage здесь — финальный gate.
- **Rules-patch generation.** Каждый fitness checkpoint имеет соответствующее правило в rules-patch файле. Patch синтаксически валиден (YAML парсится). Имена правил соответствуют именам checkpoints в плане (трассируемость). Каждое правило имеет поле `principle` со ссылкой на canonical id из D9 библиотеки.

**Apply fixes inline.** Skill применяет правки по findings субагента. **Без повторного Self-Review.**

### User Review Gate

После Self-Review и применения фиксов skill предъявляет оператору:

> Refactor plan и rules-patch для кластера `<cluster-name>` записаны:
> - План: `<plan-path>`
> - Rules-patch: `<patch-path>` (не applied)
>
> Прочитай и дай знать, если хочешь внести правки до передачи в Phase 3.

Skill ждёт ответа. Если правки — applies + re-run Self-Review. Только после approval — закрытие сессии.

### Transition offer (после approval)

После approval refactor plan'а skill сообщает оператору про rules-patch + предлагает три опции:

> Patch применишь когда захочешь: `arch-audit apply-patch <patch-path>` — рекомендуется до Phase 3, чтобы прогресс был виден в audit'ах. Либо дождись следующего полного audit прогона — он сам спросит про un-applied patches.
>
> Что дальше:
> 1. Перейти к следующему кластеру по roadmap (`<next-cluster-name>`).
> 2. Передать этот план в Phase 3 (рекомендуем `superpowers:writing-plans`); к остальным кластерам вернёмся позже.
> 3. Остановиться.

Skill **не** chain'ит автоматически и **не** инвоит arch-audit apply-patch автоматически. Apply patch'а — explicit operator action (см. D11). Ждёт операторского выбора.

### Закрытие сессии

По выбору оператора:
- **Опция 1** → skill инвоит cluster-mode для следующего кластера по roadmap'у.
- **Опция 2** → skill инвоит `superpowers:writing-plans` с refactor plan'ом как input spec. Skill arch-redesign сам не делает Phase 3 работу — это recommended toolchain (см. секцию 5, контракт Phase 2/3).
- **Опция 3** → skill сообщает: «план записан в `<path>`; готов к передаче в Phase 3 в любой удобный момент».

Полная структура закрытия: **Output written → Self-Review → Apply fixes → User Review Gate → Transition offer → Closure действие**.

---

## 5. Контракты с другими скиллами

> **Provisional disclaimer.** Контракты в этой секции — starting point по консумер-first design. В сессии arch-audit могут возникнуть push-back'и (нужны дополнительные поля, корректировки структуры). Тогда переоткрываем эту спеку и поправляем. Risk of rework низкий — большинство правок будут амендментами, не переписыванием.

### Boundary семейства hi_flow

**Семейство hi_flow покрывает Phase 0-2** (design phases): product-spec (L0), feature-spec (L1), arch-spec и arch-redesign (L2). Phase 3 (impl) — **explicitly out of family scope**, не парковка. Это сознательное архитектурное решение: superpowers ecosystem (`writing-plans`, `executing-plans`, `subagent-driven-development`) уже покрывает имплементацию, переписывать их — дублирование без ценности.

**Boundary семейства проходит на уровне L2 артефактов.** Refactor plan от cluster-mode и refactor plan от arch-spec — это design docs в Superpowers-смысле: уровень детализации, достаточный для writing-plans (архитектурный target state, fitness checkpoints, design rationale). Только L2-output может быть прямым input'ом для Phase 3.

**L0 и L1 артефакты — не design docs в этом смысле.** Они работают на других уровнях:
- **L0 (product-spec)** — стратегическая декомпозиция продукта на фичи, roadmap, cross-feature dependencies. Не содержит архитектурных решений.
- **L1 (feature-spec)** — продуктовая спека одной фичи: цели, контракт выхода, поведенческие развилки, hard policies. Описывает «что и почему» на feature-уровне, без архитектуры.

Эти уровни идут downstream **внутри hi_flow**: product-spec → feature-spec → arch-spec/arch-redesign. Только в L2 продукт получает архитектурное наполнение, которое делает спеку готовой к импл.

**Перепрыгивать L2 — анти-паттерн методологии.** Если feature-spec идёт сразу в writing-plans, минуя архитектурную фазу, writing-plans вынуждена сама додумывать архитектуру по ходу импл. Результат — накопленный архитектурный долг (ровно та проблема, ради решения которой arch-redesign и существует — Zhenka audit-report как иллюстрация: спеки Zhenka объединяли продуктовые и архитектурные решения, импл шла сразу в код, архитектура нарастала ad-hoc, в итоге 14 boundary violations + cycles + NCCD breach).

**Recommended Phase 3 toolchain — superpowers** (`writing-plans` далее по цепочке) при потреблении L2-артефактов. Это **рекомендация**, не enforcement. Operator волен:
- Запустить `writing-plans` (рекомендуемый путь, поддерживается transition offer'ом cluster-mode сессии).
- Использовать любой другой план-агент или impl-инструмент.
- Имплементировать руками.
- Положить design doc в backlog.

Skill не контролирует, что operator делает дальше с L2-артефактом.

### Input от arch-audit (по контракту D8)

**Per-finding данные:**

- Стабильный ID.
- Тип (boundary / cycle / SDP / coupling / NCCD-компонент).
- Severity (CRITICAL / HIGH / MEDIUM / LOW).
- Источник и цель (модули + файлы).
- **Reason** — обязательное поле, ссылка на принцип из библиотеки (D8 + D9).
- Type-specific extras (cycle members, type-only flag, etc.).

**Project-level данные:**

- Метрики на модуль: Ca (входящие зависимости), Ce (исходящие), I (нестабильность). Это пакетные метрики Мартина из 1994, **архитектурно-стиль-агностичные**.
- NCCD + порог.
- Подсчёты findings по severity.
- Граф зависимостей модулей.

**Метаданные audit-report'а:**

- `audit_sha` — git commit hash, на котором запускался audit. Используется skill'ом для freshness check (см. секцию 1).
- `audit_timestamp` — время прогона audit'а (для дебага и session log).
- *(опционально)* `audit_tooling_version` — версии инструментов, чтобы было понятно, против каких rule sets'ов был прогон.

**Формат:** JSON для логики скилла, Markdown для цитирования при показе оператору.

### Shared family resources (read-only для arch-redesign)

Это **разные артефакты в разных местах**:

- **Библиотека архитектурных принципов (D9).** Каталог стандартных принципов с типичными альтернативами фиксов. Industry-imported curation: SOLID, package principles по Мартину (REP, CCP, CRP, ADP, SDP, SAP), hexagonal/ports-adapters по Cockburn, vertical slices, и т.п. Original methodology НЕ создаём. Owner — arch-audit; дизайн самой библиотеки — в сессии arch-audit.
- **Известные принятые архитектурные долги (Known Drift).** Текстовые описания в `ARCHITECTURE.md` проекта (в текущей среде оператора управляется скиллом `architecture`). arch-redesign читает, чтобы не плодить уже принятые drift'ы как новые.
- **Активные fitness functions проекта (project rules).** Декларативные правила в файле проекта, например `docs/project/dependency_rules.yaml`. По D11 — owned by `arch-audit` (read/write/validate). arch-redesign:
  - **Читает** project rules — чтобы не предлагать решений, ломающих существующие инварианты.
  - **Генерирует rules-patch** как второй output cluster-mode — кандидата на расширение rules. Patch — отдельный артефакт, не применяется автоматически.
  - **Не пишет напрямую** в основной rules-файл. Apply patch'а идёт **только через arch-audit** (`apply-patch <path>` или interactive prompt при следующем audit прогоне).

  Это закрывает silent decay (fitness checkpoints из refactor plan'ов теряются между Phase 2 и Phase 3) при сохранении trust boundary (нет автозаписи в config из чужого скилла).

Для market-ready версии — все три источника становятся **конфигурируемыми путями**, не привязанными к скиллу `architecture`. Конкретный механизм — open question, ждёт резолюции OQ6 при подготовке релиза.

### Output arch-redesign (что скилл производит)

Артефакты:
- **Campaign roadmap** (триаж).
- **Refactor plan** (cluster-mode, по одному файлу на cluster session).
- **Rules-patch** (cluster-mode, по одному файлу на cluster session — второй output, см. D11).
- **Session log** (alpha-only).

Высокоуровневое описание полей и принципов — в секциях 3 и 4 этой спеки. **Точная структура форматов output'ов** вынесена в references-файлы и не дублируется в SKILL.md:

- `hi_flow/skills/arch-redesign/references/campaign-roadmap-template.md`
- `hi_flow/skills/arch-redesign/references/refactor-plan-template.md`
- `hi_flow/skills/arch-redesign/references/rules-patch-template.yaml`

SKILL.md ссылается на references, не воспроизводит структуру в теле.

### Интеграция со скиллом `architecture` (вариант B — decoupled)

arch-redesign пишет **только в свои собственные артефакты**. Состояние проекта (Known Drift, Active Decisions, Module Map) обновляется через **детектор-механизм** — в текущей среде это скилл `architecture`, который:

- активен в той же сессии (запускается через детерминированный SessionStart хук),
- детектит события из conversation'а (новые accepted drifts из триажа, новые архитектурные решения из cluster-mode),
- предлагает фиксацию оператору.

В текущей среде защитного «напоминания оператору проверить детектор» **не нужно** — скилл активен надёжно через хук.

Для market-ready — другой механизм (open question, ждёт резолюции OQ6).

### Phase 2 → Phase 3 контракт (refactor plan → writing-plans)

**Главный принцип.** Refactor plan от cluster-mode = **готовый design doc** для `superpowers:writing-plans`. Никакого промежуточного brainstorming-шага: feature-spec / arch-redesign в семействе hi_flow выполняют функции brainstorming'а на своих уровнях, дублирование не нужно.

#### Как writing-plans потребляет refactor plan

writing-plans описан как «Use when you have a spec or requirements for a multi-step task, before touching code» и принимает любой design doc. Он сам делает file-level decomposition (читает код, решает какие файлы создать/модифицировать), сам декомпозирует в TDD-задачи. От input'а ему нужно: цель + архитектурное описание + tech stack + функциональные требования + scope-boundedness.

**Mapping таблица** (writing-plans expectations vs refactor plan content):

| Writing-plans expects | Refactor plan provides |
|---|---|
| Goal — одно предложение | Goal line (см. ниже gap-fills) |
| Architecture — 2-3 предложения про approach | Target state на module-level + cells развилок |
| Tech Stack — key technologies | Tech Stack line (см. ниже gap-fills) |
| Functional requirements / sections | Fitness checkpoints как success criteria + cells как design rationale |
| Scope-bounded (single subsystem) | Один кластер на сессию (по дисциплине из секции 4) |

#### Gap-fills в формате refactor plan'а

Чтобы refactor plan был полностью compatible с writing-plans expectations, output template (`references/refactor-plan-template.md`) включает четыре поля:

1. **Goal line** (одно предложение в начале артефакта):
   ```
   **Goal:** Разорвать кольцо `dispatcher ↔ pipeline` выделением transport-слоя.
   ```

2. **Tech Stack line** (читается из проектного контекста — `PROJECT_META.md` или операторской подачи):
   ```
   **Tech Stack:** TypeScript, Node.js, dependency-cruiser для fitness functions.
   ```

3. **Refactor framing note** — явное указание для writing-plans, что это refactor work, не new feature:
   ```
   **Type:** Refactor (не new feature). Behavior preservation critical. Используй characterization tests + verify fitness checkpoints, не классический TDD «failing test → impl».
   ```

4. **Success criteria section** — fitness checkpoints явно в роли «что нужно достичь, чтобы план считался выполненным»:
   ```
   ## Success criteria (fitness checkpoints)
   После исполнения плана все checkpoints должны быть зелёными в audit:
   - ...
   ```

С этими полями writing-plans LLM имеет всё нужное для file-level decomposition + TDD task list.

#### Invocation chain

В transition offer cluster-mode (см. секцию 4, опция «передать в Phase 3»):
- Skill arch-redesign инвоит `superpowers:writing-plans` с refactor plan'ом как input spec.
- writing-plans читает refactor plan, делает file structure + TDD tasks.
- writing-plans предлагает execution choice (subagent-driven / inline) — это уже superpowers-территория.

Triage roadmap **не** идёт в writing-plans. Roadmap — навигационный документ, не design doc для импл. Transition с triage возможен только в cluster-mode сессию (см. секцию 3).

#### Bail conditions в design doc'е (vs «эскалация»)

Концепт «Phase 3 эскалация обратно к hi_flow» **не enforce'ится** — superpowers не имеет идеи возвращаться к hi_flow:arch-redesign, и hi_flow на superpowers стороне не контролирует поведение. Вместо этого:

**Класс A (target state не достижим — fitness checkpoint остаётся красным после импл-работы)** → автоматизируемое **bail condition** в refactor plan'е. Output template (`references/refactor-plan-template.md`) включает раздел:

```
## Stop conditions

If fitness checkpoint X stays red after impl attempt:
- Stop, do not commit partial fix.
- Reason: target architecturally undeliverable as designed.
- Notify operator: arch-redesign re-engagement may be needed.
```

writing-plans / executing-plans это понимают как обычные stop-conditions в плане — никакой специальной интеграции с hi_flow не нужно.

#### Operator-level methodology guidance (vs enforce'нутая эскалация)

**Классы B и C** — это архитектурные сигналы, требующие архитектурного мышления. Импл-агенты (writing-plans / executing-plans) task-oriented, не architecture-aware. Автоматизировать их детектирование — false positive ад / false negative провалы.

Это **operator's territory** по природе:

- **Класс B — обнаружено архитектурное недоразумение, не описанное в исходном аудите.** В процессе refactor'а вылезает другой архитектурный фолт, связанный с текущим кластером, но не входивший в его scope. Если оператор замечает — он сам останавливает импл и руками re-engage'ит arch-redesign (re-entry path 3 в cluster-mode из секции 4).

- **Класс C — кластер был неверно сгруппирован.** Одно из нарушений в кластере не лечится выбранной альтернативой — у него на самом деле другая корневая причина. Если оператор замечает — он сам прерывает импл и возвращается в triage для перекластеризации.

Skill arch-redesign **не enforce'ит** обнаружение классов B и C, **не имеет логики «эскалация обратно ко мне»**. Производит design doc, остальное — оператор.

#### Принцип молчаливого fallback'а

Запрещён по глобальным принципам. Если writing-plans / executing-plans не может достигнуть checkpoint'а — стопится, отчитывается оператору. Это часть superpowers собственной discipline, не специальная hi_flow-логика.

---

## 6. Design walkthrough на Zhenka audit-report

В этой design-сессии прошёл walkthrough дизайна на гипотетическом входе (Zhenka audit-report) — **проверка консистентности дизайна**, не behavioral test и не empirical validation скилла. Полная валидация наступает только после готовности arch-audit и его прогона на Zhenka в формате D8.

### Триаж walkthrough

Auto-grouping по reason'ам Zhenka audit'а (CRITICAL boundary + 4 кольца + 10 SDP + NCCD breach) дал 9 кандидатов в кластеры + unmapped корзину для foundational SDP. Skill предложил действия по каждому, поднял **2 явные развилки** (объединять C1+C4 channel-agnostic или нет; что делать с unmapped foundational SDP).

Шаги 2-5 прошли без новых дыр — recommendations skill'а в большинстве случаев очевидны (severity, cascade), оператор confirms.

### Cluster-mode walkthrough на C1 («нет transport-слоя»)

- Альтернативы из библиотеки → выбор «extract transport/».
- Target state на module-level.
- Fitness checkpoints («нет ребра `dispatcher → pipeline`», «нет ребра `pipeline → dispatcher`»).
- Проверка скрытых зависимостей (тесты, runtime, миграции, внешние потребители — все пройдены или помечены).

План чистый, готов для импл-сессии.

### Что surface'ил walkthrough (refinements в дизайне, уже внесены)

1. **Шаг 1 триажа — паттерн «surface only branches».** Skill не задаёт вопрос по каждому кластеру, а показывает таблицу с рекомендациями и поднимает явные вопросы только там, где видит развилку. **Зафиксировано в секции 3.**
2. **Cluster-mode шаг 3 — checkpoints касаются только своего кластера.** Если есть пересечение с другим кластером — пометить в шаге 4 (зависимости), не в checkpoints. Каждый кластер владеет только своими fitness checkpoints. **Зафиксировано в секции 4.**

Других дыр walkthrough не нашёл.

---

## 7. Открытые вопросы и out-of-scope

### Открытые вопросы (несут по ходу использования; refine via empirical use)

- **Пороги в детерминированных сигналах mode selection** (секция 2). Сейчас интуитивные, refine после первых N сессий.
- **Исчерпывающесть Phase 3 эскалации классов A/B/C** (секция 5). Refine при появлении не покрытых случаев.
- **Ценность session log** (секция 5). Alpha-only, evaluate после первых боевых сессий — оставлять или выкинуть.
- **Decoupling для market-ready.** В текущей среде arch-redesign читает Known Drift и активные fitness functions через скилл `architecture`. Для marketplace-distribution нужны конфигурируемые пути. Open question, ждёт резолюции при подготовке релиза — см. OQ6 в `ARCHITECTURE.md`.
- **Размер и стартовое наполнение библиотеки принципов** — design в arch-audit. Если курация окажется тяжёлой — обсуждать упрощение формата.
- **Контракт arch-audit input** (D8 + D9 + per-finding и project-level fields, см. секцию 5) — provisional до arch-audit session. Push-back'и в arch-audit потребуют амендментов в этой спеке.
- **Точный формат rules-patch'а и команды `arch-audit apply-patch`** (секция 4, шаг 3) — provisional depcruise YAML до arch-audit design сессии. Финал согласуется в arch-audit. Patch granularity (один на cluster) и validation behaviour при apply fail — open для empirical refinement.
- **Apply timing default в transition offer** (секция 4) — рекомендация vs дефолт «применить сейчас». Сейчас рекомендация в тексте, оператор решает. Refine после первых сессий — насколько часто оператор хочет «прогресс виден сразу» vs «не загромождать audit пока impl не закончен».

### Что explicitly out-of-scope

- **Дизайн arch-audit.** Следующая сессия. Здесь только определены контракты (D8 + Q10 input contract, D9 библиотека).
- **Дизайн arch-spec.** Сессия после arch-audit. Здесь только обозначен в семейной карте (D7).
- **Содержимое библиотеки принципов** — записи каталога. Только структура (формат записи) обозначена. Контент собирается в arch-audit сессии.
- **Tools-specific форматы fitness functions** (dependency-cruiser YAML, ArchUnit, import-linter TOML). Слой arch-audit's tooling layer.
- **Code-level исполнение refactor'а.** Phase 3 территория (Superpowers TDD).
- **Project-wide ARCHITECTURE.md updates.** Управляется скиллом `architecture`, не arch-redesign.
- **Создание новых архитектурных принципов.** Принципы импортируем из индустрии, не изобретаем своих.

---

## 8. SKILL.md authoring notes

Эта секция — guidance для следующих шагов: drafting Russian SKILL.md → operator review → English final.

### Применение анти-паттернов из handoff'а

**Source of truth для чеклиста:** `docs/handoffs/2026-04-27-skill-design-anti-patterns.md`. При drafting'е SKILL.md прогнать полный чеклист оттуда (12 пунктов).

**Критический пункт чеклиста — Self-Review + User Review Gate.** Это canonical Anthropic pattern из brainstorming skill, который легко пропустить. Для arch-redesign **обе** мод-сессии (триаж и cluster-mode) обязаны заканчиваться:

1. Запись output в файл.
2. Self-Review через изолированного субагента (path + checklist; **conversation history НЕ передаётся**).
3. Apply fixes inline (без повторного Self-Review — fix and move on).
4. User Review Gate (явное предъявление оператору с ожиданием ответа).
5. Если оператор просит правки — применить и **re-run** Self-Review.
6. Только после approval — закрытие сессии.

Конкретные Self-Review checklist'ы для каждой мод-сессии — в секциях 3 и 4 этой спеки.

Reference: `hi_flow/skills/feature-spec/SKILL.md` после раздела «Closure» — там оформление `### Self-Review (via subagent with isolated context)` + `### User Review Gate`.

**Arch-redesign-specific уточнения (поверх общего чеклиста):**

- **Output format examples в SKILL.md — на русском.** Имена секций campaign roadmap и refactor plan'а (например, «## Кластеры в кампании», «## Целевое состояние») — на русском, потому что output для оператора-продуктолога.
- **Embedded operator-Claude dialogue в `>` блоках — на русском.** Skill цитирует то, что должен сказать оператору, в plain Russian.
- **Длина SKILL.md.** Probing taxonomies (секции 3 и 4 этой design-спеки) — legitimate reference content, могут быть длиннее ≤300 строк. Главное — не bloat в meta-machinery.
- **Sample comparison.** Открыть `brainstorming/SKILL.md` и `writing-plans/SKILL.md` для структуры, плюс `hi_flow:feature-spec/SKILL.md` для семейной консистентности (включая Self-Review + User Review Gate оформление).

### Workflow для следующих сессий

1. **Russian SKILL.md draft** (для operator review) — структура и контент по этой спеке, на русском, с применением анти-паттернов. Не финальный артефакт, версия для проверки оператором.
2. **Operator review of Russian draft** — оператор читает, вносит правки.
3. **English final SKILL.md** — translation утверждённого Russian draft'а. Деплой-ready артефакт.
4. **Implementation plan via writing-plans** — после approved SKILL.md.

### Sibling references для SKILL.md

При drafting'е SKILL.md полезно:

- Канонические superpowers skills для структуры: `brainstorming/SKILL.md`, `writing-plans/SKILL.md`, `systematic-debugging/SKILL.md`, `writing-skills/SKILL.md`.
- `hi_flow:feature-spec/SKILL.md` для семейной консистентности (cell-format inheritance, sample dialogs, frontmatter style).

---

## Spec compliance check (self-review)

**Status:** completed 2026-04-27 via изолированный субагент (per CLAUDE.md addendum к superpowers:brainstorming).

**Findings и их обработка:**

- **HIGH H1.** Session log противоречие («alpha-only» vs «обязательно записывает»). **Fixed** — раздел «Парковано» переформулирован: эвалюации подлежит механизм целиком, в каждой сессии log пишется обязательно пока активен.
- **HIGH H2.** OQ6 ссылался как на решение, но это open question. **Fixed** — все упоминания OQ6 переформулированы как «open question, ждёт резолюции».
- **MEDIUM M1.** «Q10» упоминался без контекста. **Fixed** — заменено на «контракт arch-audit input (D8 + D9 + per-finding и project-level fields)».
- **MEDIUM M2.** Rationalizations table не покрывала «нет аудита, я и так знаю». **Fixed** — добавлена строка про pre-condition.
- **MEDIUM M3.** Секция 8 чеклист дублировал handoff. **Fixed** — секция 8 стала ссылкой на handoff + arch-redesign-specific уточнения.
- **LOW L1.** Молчаливый отказ от skip pattern из старого handoff'а. **Fixed** — добавлен Note для семейной консистентности в секции 2.
- **LOW L2.** Секция 6 называлась «Stress-test (paper-run)», вводило в заблуждение. **Fixed** — переименовано в «Design walkthrough».

**Полный отчёт subagent'а:** в session-log этой brainstorm-сессии (если оператор хочет посмотреть).

**Дополнительная правка после первоначального self-review** (2026-04-27, после обновления handoff'а с новым обязательным паттерном):

- **Self-Review + User Review Gate** добавлены как обязательная финальная фаза для обоих мод-сессий (триаж и cluster-mode). Это canonical Anthropic pattern, изначально пропущенный. Зафиксировано в секциях 3 и 4 + явное упоминание в секции 8. Без этого паттерна skill не соответствует Anthropic канону и теряет защиту от собственного confirmation bias.

**Batch-фикс по итогам operator review** (2026-04-27, 8 замечаний):

- **Замечание 1.** Секция 1 «Стратегическая позиция» переформулирована: zone применения «защита через структуру» — output / references, не SKILL.md.
- **Замечание 2.** Секция 1 «Входные условия» переписана как input validation, не gatekeeping. Трёхуровневая модель валидации (existence + schema = hard fail; freshness = soft ask + override). Добавлен edge case интеграции вне hi_flow плагина (D8 schema публикуется, конвертеры на стороне интегратора).
- **Замечание 3.** Pass через все упоминания audit'а — Common Rationalizations table, anti-triggers, секции 5 и 1 — теперь следуют единой трёхуровневой модели.
- **Замечание 4.** Закрытие триаж- и cluster-mode сессий расширено transition offer'ом после User Review Gate. Структура: Output → Self-Review → Apply fixes → User Review Gate → Transition offer → Closure действие.
- **Замечание 6.** Секция 5 расширена контрактом Phase 2/3 с mapping таблицей writing-plans expectations vs refactor plan content; invocation chain через `superpowers:writing-plans` без промежуточного brainstorming-шага; triage roadmap NOT для writing-plans (только навигация).
- **Замечание 7.** Секции 1 (что НЕ делает) и 5 (boundary семейства) явно фиксируют: hi_flow покрывает только Phase 0-2 как сознательное архитектурное решение; Phase 3 рекомендуется через superpowers, но не enforce'ится; operator override = любой Phase 3 toolchain.
- **Замечание 8.** Output format details вынесены в reference templates (`references/campaign-roadmap-template.md`, `references/refactor-plan-template.md`), не дублируются в SKILL.md и спеке. Секции 3 и 4 содержат только высокоуровневую структуру + указатель на references. В Phase 2/3 контракте зафиксированы 4 gap-fills для writing-plans compatibility (Goal line, Tech Stack line, Refactor framing note, Success criteria section).
- **Замечание 9.** «Phase 3 эскалация» как enforced механизм удалён. Класс A → bail condition в design doc'е (writing-plans/executing-plans его понимает как обычный stop-condition). Классы B/C → operator-level methodology guidance, документированы в секции 5 без enforcement; operator сам re-engage'ит arch-redesign через re-entry path 3 в cluster-mode (если узнаёт сигналы во время impl).

**Дополнительные правки на втором проходе review** (2026-04-27, 2 замечания):

- **Замечание 10.** Парковка-item «Расширение Phase 3 эскалации классов A/B/C» устарел после Замечания 9. Заменён на «Refinement bail conditions и operator-level methodology guidance через empirical use».
- **Замечание 11.** Секция 5 «Boundary семейства hi_flow» переписана. Раньше формулировка «все артефакты по природе design docs» была некорректна — конфликтовала с реальным уровнем детализации L0/L1. Теперь явно разделено: только **L2 артефакты** (refactor plan от cluster-mode и refactor plan от arch-spec) — design docs в Superpowers-смысле, готовы к writing-plans. **L0 (product-spec)** и **L1 (feature-spec)** — продуктовые/feature-level спеки, не прямой input для Phase 3. Идут downstream внутри hi_flow до L2. Перепрыгивание L2 — анти-паттерн методологии (иллюстрация — Zhenka, где спеки объединяли продуктовое+архитектурное и шли сразу в импл, в результате накопленный архитектурный долг).

---

## Амендмент 2026-04-27: D11 — rules-patches как второй output cluster-mode

**Контекст.** В arch-audit design сессии (2026-04-27) вскрылась дыра: gap между fitness checkpoints в refactor plan'е и project rules в depcruise config'е. Текущий дизайн arch-redesign не записывал checkpoints в project rules, рассчитывая на «Phase 3 после impl'а». Но Phase 3 (superpowers writing-plans/executing-plans) этой логики не имеет — там просто исполняются TDD-задачи. Через несколько рефакторов накапливается silent decay: refactor plans есть, project rules не растут.

**Архитектурное решение** — D11 (зафиксировано в `ARCHITECTURE.md` → Active Decisions + History 2026-04-27). Распределение ownership project rules-файла:

- **arch-audit** owns rules-файл: read, validate, apply, baseline.
- **arch-spec** и **arch-redesign** генерируют rules-patches как **второй output** их основной работы.
- **Patches — отдельные артефакты-кандидаты**, не пишутся в rules-файл автоматически.
- **Apply — explicit operator action:** команда `arch-audit apply-patch <path>` или interactive prompt при следующем нормальном audit прогоне (он сам сканирует pending patches и спрашивает).
- **Валидация patch'а** перед merge — ответственность arch-audit.

Это закрывает silent decay (через pending detection в arch-audit) при сохранении trust boundary (нет автозаписи в config из чужого скилла).

**Применённые изменения в этой спеке:**

- **Замечание A1 (секция 1, «Выходные артефакты»).** Добавлен третий артефакт — Rules-patch.
- **Замечание A2 (секция 4, шаг 3).** Шаг 3 переименован в «целевое состояние + упорядоченных fitness checkpoints + генерация rules-patch». Добавлен подпункт про детерминированную конвертацию каждого checkpoint'а в depcruise rule, granularity (один patch на cluster), требование `principle` field в каждом правиле, трассируемость имён.
- **Замечание A3 (секция 4, формат output).** Раздел переименован в «Refactor plan + rules-patch», расщеплён на два подраздела с описанием обоих артефактов и ссылками на оба template'а.
- **Замечание A4 (секция 4, Self-Review checklist).** Добавлен пункт «Rules-patch generation» — каждый checkpoint имеет правило, patch синтаксически валиден, имена трассируются, у каждого правила есть `principle`.
- **Замечание A5 (секция 4, User Review Gate + Transition offer).** Сообщение оператору расширено упоминанием patch'а и пути; transition offer включает текст про apply timing (через arch-audit, рекомендуется до Phase 3); explicit reminder, что skill не автоинвоит arch-audit.
- **Замечание A6 (секция 5, Shared family resources).** Подпункт «Активные fitness functions проекта» переписан под D11 — три функции arch-redesign по отношению к rules: read, generate-patch, не пишет напрямую. Apply через arch-audit.
- **Замечание A7 (секция 5, Output arch-redesign).** Артефактный список расширен Rules-patch; references список — `rules-patch-template.yaml`.
- **Замечание A8 (секция 7, Open questions).** Закрыты sub-questions из OQ3 в `ARCHITECTURE.md` — где живёт config (project rules-файл, owned arch-audit), на каком этапе фиксируется (через rules-patches от arch-spec/arch-redesign + apply через arch-audit). Добавлены два новых open question'а: точный формат rules-patch'а (provisional до arch-audit session), apply timing default (refine после empirical use).

**Provisional disclaimer.** Точный формат rules-patch'а и команды `arch-audit apply-patch` — design в текущей arch-audit сессии. Спека работает на provisional depcruise YAML формате. Если arch-audit спека сдвинет финальный формат — переоткрываем эту спеку и поправляем patch template.

**Self-Review амендмент-сессии** (2026-04-27, изолированный субагент, 1 HIGH + 3 MEDIUM + 2 LOW):

- **HIGH H1 — Self-Review subagent должен получить и patch-путь.** Cluster-mode Self-Review без передачи patch-файла субагенту делает пункт «Rules-patch generation» unfalsifiable. **Fixed** — секция 4 Self-Review block + SKILL.md теперь явно требуют передавать оба пути (refactor plan + rules-patch).
- **MEDIUM M1 — description SKILL.md не упоминал rules-patch.** Создавал inconsistency с Overview. **Fixed** — frontmatter description теперь упоминает rules-patch как часть cluster-mode output'а.
- **MEDIUM M2 — нет defensive check на arch-audit availability.** Транзишн-оффер советовал команду `arch-audit apply-patch`, но arch-audit ещё PLANNED, не BUILT. **Fixed** — SKILL.md transition offer проверяет наличие `hi_flow:arch-audit` в loaded skill list и swap'ает phrasing на «patch ждёт apply» если недоступен (паттерн уже применяется для writing-plans availability check).
- **MEDIUM M3 — D11 leakage в Overview.** «(per D11)» — design-doc concept в operator-facing reading material. **Fixed** — заменено на «candidate project rules to harden the architecture».
- **LOW L1 — refactor-plan-template путь к patch'у.** Был в виде «filename + parenthetical», в SKILL.md и спеке — full path. **Fixed** — template теперь использует full path для consistency.
- **LOW L2 — амендмент claim не цитирует OQ3.** Apparent для self-sufficiency — добавление полного пути к OQ3 в ARCHITECTURE.md. **Decided not to fix** — claim ссылается на ARCHITECTURE.md → D11 + History 2026-04-27, оператор может оттуда дойти до OQ3 status update.

---

## Амендмент 2026-04-28: D8 cascade — severity normalization + canonical schema location

**Контекст.** D8 cascade сессия (2026-04-28) завершила финализацию D8 schema. Cascade items из handoff `2026-04-28-d8-schema-cascade-handoff.md`, требовавшие правок в arch-redesign артефактах.

**Применённые изменения:**

- **rules-patch-template.yaml — severity normalization.** Severity values обновлены с depcruise-native (`error`, `warn`, `info`) на D8 normalized enum (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`). Arch-audit validation (Section 7 apply-patch mode design) требует именно этот enum. Примеры: `severity: error → severity: HIGH`, `severity: warn → severity: MEDIUM`. Добавлено явное объяснение в комментарий (depcruise native severities не используются в patch'е).

- **rules-patch-template.yaml — canonical project rules path.** Добавлена явная отметка canonical path'а: `<project>/.audit-rules.yaml` — именно в этот файл arch-audit merge'ит правила из patch'а при apply. Из arch-audit design Section 10 (D11).

- **rules-patch-template.yaml — rule_id traceability note.** Добавлено объяснение что `name` правила в patch'е становится `rule_id` в D8 findings при следующем audit прогоне — explicit cross-reference между patch и audit findings.

- **rules-patch-template.yaml — provisional disclaimer обновлён.** Удалён статус «provisional» — arch-audit design финализирован 2026-04-28. Template теперь отражает finalized формат.

- **SKILL.md — schema check message.** Путь к D8 schema обновлён на canonical: `hi_flow/skills/arch-audit/references/d8-schema.md` (вместо `references/d8-schema.md`).

- **SKILL.md — References секция.** Описание `references/d8-schema.md` обновлено: pointer stub → canonical `hi_flow/skills/arch-audit/references/d8-schema.md` + `d8-schema.json`.

**Что НЕ изменилось:** design спека (секции 1-7) без изменений. D11 mechanisms, workflow, Self-Review checklist — без изменений.
