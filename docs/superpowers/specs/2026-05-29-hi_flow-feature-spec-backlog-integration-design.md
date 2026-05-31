# hi_flow:feature-spec — Backlog Integration at Closure (Design)

**Date:** 2026-05-29 (resync с main 2026-05-31 после мёрджа arch-spec)
**Status:** approved (design), уточнён по self-review субагента + resync (Approach B)
**Skill:** `hi_flow:feature-spec` (+ shared mechanism, co-consumer `hi_flow:arch-spec`)
**Trigger:** фидбэк первой боевой feature-spec сессии (REH ERP, audit-фича, 2026-05-28) — `Reh_Erp/docs/feedback/hi_flow-feature-spec-feedback.md` §1.
**Related:** D17, D18 (product-spec backlog), D21 (arch-spec — второй потребитель механизма), D22 (фиксация этого дизайна), D2 (cell-based forks), P1 (plain language), P6 (escalation discipline), глоб. принципы 4 (SSoT) и 8 (фиксация в момент решения), 10 (dependency graph).

> **Resync note (2026-05-31):** пока этот дизайн стоял на паузе, параллельная сессия реализовала `hi_flow:arch-spec` (D21) и смержила в main. arch-spec ссылается на описанный здесь механизм **по имени** (`backlog-integration`) как на shared family artifact и объявляет на него зависимость по принципу 10. Поэтому изначальный Approach A (механизм внутри `feature-spec/SKILL.md`) заменён на **Approach B**: механизм выносится в family-shared референс `hi_flow/references/backlog-integration.md`, потребители — feature-spec (bottom-up) и arch-spec (его closure). Изначальная посылка «feature-spec единственный consumer → B это YAGNI» аннулирована появлением второго потребителя.

---

## Problem

feature-spec не знает про product-level backlog. На closure он только перечисляет open items внутри `feature-spec.md`, а сознательно отложенные пункты остаются разбросанными по самой спеке. В итерации с N фичами (в REH ERP — 13) отложенное живёт в N разных файлах без точки агрегации: чтобы спланировать следующую итерацию, придётся перечитать все N спек.

В REH ERP product backlog уже существует (`docs/specs/reh-erp-product-backlog.md`, создан product-spec на прошлой итерации). В сессии 2026-05-28 оператор **вручную** перенёс ~11 отложенных пунктов audit-фичи в backlog отдельным проходом после утверждения спеки (все записи `F-audit-X-*` с `Originating analysis: docs/specs/2026-05-28-reh-erp-audit-feature-spec.md`). Этот ручной проход и нужно сделать частью workflow скилла.

Приоритет фидбэка: **Medium-High** — сейчас скрыто (одна фича), проявится к 5-6 фиче итерации.

---

## Context: где отложенное живёт сегодня

В готовой `feature-spec.md` отложенные пункты разбросаны по естественным местам, без единой точки сбора:

- развилка со статусом `DEFERRED` (пример: `F4.5 Export CSV`);
- строки в `Out of scope` секции `Цель` (пример: «Export CSV — backlog для итерации 1»);
- пункты в `Premortem findings` (примеры: #4 forensic mapping, #6 rule versioning, #8 self-view);
- inline-проза «backlog» / «отложен» внутри Resolution развилок (примеры: F4.2 category filter, F5 retention differentiation, F6 DB-level immutability, F9 GDPR mapping).

Каноническое место агрегированного отложенного — **product backlog** (`*backlog*.md`), артефакт состава продукта. Формат его секций определён в `hi_flow/skills/product-spec/references/product-backlog-template.md`.

---

## Decisions (зафиксированы в брейнсторме)

1. **Harvest = hybrid.** Структурная пометка отложенного на месте по ходу сессии + scan-валидация на closure. (Не чистый scan: сбор по free-text «backlog» был бы fuzzy.)
2. **Отдельной register-секции в спеке нет.** Отложенное остаётся в естественных местах (DEFERRED-развилки / out-of-scope / premortem), помеченное структурно для детерминированного harvest. Backlog — единственный дом агрегации. Третья копия не заводится (SSoT, принцип 4).
3. **Два отдельных закрывающих списка.** «Open items at closure» (нерешённое, в спеке) и backlog (отложенное, отдельный артефакт) — разные оси, не сливаются.
4. **No-backlog → создать из шаблона product-spec.** Механизм читает `product-backlog-template.md` как авторитет формата, не дублирует его.
5. **feature-spec запускается standalone ИЛИ после product-spec.** backlog-sync не предполагает ни product-spec.md, ни bundle.
6. **Механизм — family-shared (Approach B, по итогам resync).** Алгоритм backlog-integration живёт в `hi_flow/references/backlog-integration.md`, owner — product-spec (steward backlog'а по D17). Потребители: feature-spec (harvest своих deferred/parked) и arch-spec (closure backlog-sync, D21). Формат записи остаётся в `product-backlog-template.md` (владение product-spec не меняется); shared-референс описывает только *механизм контрибуции* (detect → harvest contract → dedup → idempotency → patch+approval → create-if-missing).

---

## Flow model & ownership

**Два входных режима feature-spec** (оба обязаны поддерживать backlog-sync):
- **После product-spec** — оператор приносит `bundle-<feature-slug>.md`; backlog почти наверняка существует.
- **Standalone** — оператор приходит с готовой идеей фичи в существующий продукт, без product-spec и без bundle. Backlog может существовать (накоплен прошлыми feature-spec сессиями / вручную) или отсутствовать.

**Жёсткое требование:** closure backlog-sync зависит только от наличия/отсутствия `*backlog*.md`, не от артефактов product-spec.

**Владение backlog'ом (уточнение D17):** backlog — **общий артефакт состава продукта**, не эксклюзивная собственность product-spec.
- **product-spec** — первичный entry-point (top-down), создаёт backlog, владеет структурой/шаблоном.
- **feature-spec** — bottom-up контрибьютор: **читает** формат из `product-backlog-template.md`, **дополняет** backlog отложенным (с утверждением оператора), **создаёт** backlog из шаблона product-spec, если в standalone-flow его ещё нет.

Никто не пишет в backlog молча — feature-spec всегда показывает патч на утверждение (фидбэк §1.1). Формат не дублируется: `product-backlog-template.md` — single source формата (read-only для feature-spec, consistent с владением product-spec).

---

## Structural deferral markers

Важно: harvest **находит** отложенные пункты по структурным якорям детерминированно. Он НЕ требует, чтобы все backlog-поля (level / carry-over / reason) были записаны inline — это фиксировалось бы ригидным синтаксисом, который воюет с естественным стилем оператора и плодит friction (урок §2 product-spec фидбэка — ригидность/жаргон протекают). Поля level / carry-over / reason **предлагаются скиллом и подтверждаются оператором на шаге approval** (шаг 5), где он и так ревьюит патч. Inline нужны только якоря-находилки.

**Опора на органическую конвенцию.** В боевой спеке оператор уже выработал паттерн: под RESOLVED-развилкой, у которой часть под-функций отложена, идёт bold-label `**Backlog:**` со списком отложенного буллетами (пример F4.2: «Category filter — отложен: требует классификации event_types»). Дизайн **встраивается в эту конвенцию**, а не переопределяет её. (Поэтому НЕ вводим конфликтующий `**Backlog:** level: ... | ...` single-line — это была бы коллизия с уже существующим использованием.)

**Harvest-якоря (находят пункт детерминированно):**
1. Развилка со `[status: DEFERRED]` (пример F4.5 Export CSV) — отложена вся развилка.
2. Блок `**Backlog:**` (буллеты) под любой развилкой — органическая конвенция, отложены под-пункты RESOLVED-развилки.
3. Sf-развилки (deferred strategic forks), если в спеке заводятся.
4. Строки `Out of scope` (в `Цель`) и пункты `Premortem findings` с лёгким тегом `→ backlog` / `→ rejected` (новое, минимальное — нужно отличить backlog-bound от просто границы scope / absorbed-находки).

**Лёгкие теги для однострочников (Out of scope / Premortem):**
- `→ backlog` — отложено, идёт в Parked features.
- `→ rejected: <причина>[; альтернатива <...>]` — жёсткое «не делаем», опционально одной строкой в Out-of-scope (rejected).
- без тега — просто граница scope / absorbed в развилку, в backlog НЕ попадает.

```markdown
## Цель
**Out of scope:**
- Export CSV → backlog
- Tamper-proof хранение → rejected: вне scope baseline; альтернатива — ASVS L2 пакет
- Multi-language интерфейс                      ← без тега: граница scope, не backlog-bound

## Premortem findings
4. **<жалоба>** → backlog
6. **<жалоба>** — absorbed в F1.6                ← без тега: ушло в развилку, не backlog-bound
```

**Legacy / untagged специи.** Якоря 1-2 (`DEFERRED` статус, `**Backlog:**` блоки) присутствуют и в спеках, написанных ДО этого изменения, — они harvest'ятся структурно. Теги `→ backlog` (якорь 4) добавляет уже обновлённый скилл для новых спек; в legacy-спеках непомеченная проза «backlog/отложен» в Out of scope / Resolution / Premortem ловится **scan-валидацией** (шаг 2). То есть для новых спек scan — страховка, для legacy — основной путь по непомеченным пунктам.

---

## Closure backlog-sync algorithm

Подфаза в самом конце closure — **после** записи `feature-spec.md`, Self-Review и утверждения оператором (User Review Gate). Причина: набор отложенного стабилен и известен финальный путь спеки (нужен для pointer'а).

1. **Harvest.** Собрать backlog-bound пункты по якорям 1-4 (см. Structural deferral markers): `DEFERRED`-развилки; блоки `**Backlog:**`; Sf-развилки; строки Out of scope / Premortem с тегом `→ backlog` / `→ rejected`. **Sub-fork rule:** harvest'ится только сам помеченный узел; рекурсия по детям не делается. Если отложена развилка-контейнер с под-развилками (типа F1 с F1.1-F1.6) — переносится контейнер как один пункт, дети не размножаются в отдельные записи. Если конкретная под-развилка помечена отдельно (F4.5) — переносится она.
2. **Scan-validate (страховка hybrid).** Fuzzy-скан на прозу «backlog/отложен» без структурного якоря → показать расхождения оператору («F5 упоминает backlog в Resolution, но не помечен — добавить в перенос?»). Оператор решает per item. **Scope скана:** только operator-content секции (`Развилки`, `Цель`, `Premortem findings`), исключая fenced code-блоки (`` ``` ``). Это защищает от ложных срабатываний на словах «backlog» внутри примеров шаблона/инструкций, которые попадают в новую спеку из template.
3. **Dedup / merge.** Один пункт может всплыть из двух якорей сразу — реальный кейс: `F4.5 Export CSV` это и `DEFERRED`-развилка, и строка `Out of scope` (та же фича). Перед классификацией смержить дубли по ключу `(fork-id ИЛИ нормализованное имя)` в одну запись. Без этого получим две `F-audit-X-export`.
4. **Classify.** parked capability → секция «Parked features»; deferred strategic fork → «Deferred strategic forks»; rejected (с тегом `→ rejected`) → «Out-of-scope (rejected)».
5. **Detect backlog.** Glob `*backlog*.md` в проекте, порядок поиска: `docs/specs/`, `docs/`, корень проекта (путь переопределяется конфигом, если задан). 1 совпадение → берём; ≥2 → спросить оператора какой; 0 → no-backlog flow (шаг 8).
6. **Idempotency check.** Перед рендером патча сверить harvest-пункты с уже существующими записями backlog'а по каноническому ключу `Originating analysis: <spec-path> § <fork-id>` (этот ключ уже есть в реальных записях). Совпало → пункт **пропускается** (не дублируется), при отличии содержимого — предложить update существующей записи. Это защищает от дублей при повторном прогоне feature-spec на уже закрытой спеке (вероятен после правок на User Review Gate).
7. **Build patch + approval.** Прочитать `product-backlog-template.md` (каталог product-spec) как авторитет формата. Для каждого нового пункта отрендерить backlog-запись (см. Backlog entry mapping), **предложив** level / carry-over / reason (оператор подтверждает/правит — поля не требовались inline). Показать патч: что и в какую секцию допишется. **Не писать молча** (§1.1). Утвердил → Edit backlog (append в нужные секции); правки → применить; отказ → оставить отложенное в спеке как есть.
8. **No-backlog flow.** Сообщить «backlog не найден». Предложить создать из `product-backlog-template.md` (см. No-backlog flow ниже). Отказ → отложенное остаётся в спеке, сказать оператору что перенести можно позже (через product-spec или вручную).
9. **Iteration index не трогаем.** feature-spec не владеет итерациями: при дополнении существующего backlog'а Iteration index не меняется; при создании — остаётся пустым по шаблону (product-spec заполнит при первом запуске).

**In-spec breadcrumb не пишем:** канонический линк — `Originating analysis` в backlog'е. Обратную ссылку спека→backlog не пишем (склонна к устареванию). Подтверждение оператору — в чате.

---

## Backlog entry mapping

Источник формата — `product-backlog-template.md`. Harvest-пункт → запись целевой секции:

**Parked feature** (плоские записи в «Parked features», без группировки по `### Фича:`):
```markdown
### F-<feature-slug>-X-<suffix>. <Name> (level: <level>)
**Status:** parked
**Originating analysis:** <spec-path> § <fork-id>
**Reason for parking:** <reason>
**Carry-over candidate for:** <target>
**Описание:** <опционально, для note/partial>
```

**Pointer expansion:** локальный `§ F4.5` из маркера разворачивается в `Originating analysis: <финальный путь спеки> § F4.5`. Путь известен на шаге 5 (спека уже записана).

**ID convention:** `F-<feature-slug>-X-<suffix>` — `-X` маркирует parked (не committed), `-<suffix>` короткий kebab-тег. Скилл предлагает ID, оператор правит. Пример из боевой сессии: `F-audit-X-export`, `F-audit-X-category-filter`.

**Feature-slug derivation:** если есть bundle (после product-spec) — slug из него. В standalone — из slug'а имени файла спеки (`YYYY-MM-DD-<feature-slug>-feature-spec.md` → `<feature-slug>`); оператор подтверждает на approval. Без угадывания.

**Reason fallback (S4):** backlog-запись требует `Reason for parking`. Если у harvest-пункта reason не дан явно (typично — есть только Resolution-проза) → fallback на текст Resolution / на прозу буллета `**Backlog:**`; на approval оператор сокращает до одной-двух фраз при желании.

**Deferred strategic fork** → секция «Deferred strategic forks» (Sf-стиль с Branches + Reason for deferring + Originating analysis).

**Rejected** → «Out-of-scope (rejected)» одной строкой: `- <Name> — отвергнуто, причина: <фраза>; альтернатива — <если есть>.`

**Асимметричные pointers (D17):** деталь решения остаётся в развилке спеки; backlog-запись — pointer-с-summary на неё. Развилка в спеке не меняется после переноса, дублирования нет.

---

## No-backlog flow (создание)

Если `*backlog*.md` не найден и оператор согласился:

- **Путь:** `<project>/docs/specs/<slug>-product-backlog.md` (предложить, дать переопределить). `<slug>` — product-slug если известен, иначе feature-slug.
- **Структура:** по `product-backlog-template.md`. Секции «Parked features» / «Deferred strategic forks» / «Out-of-scope (rejected)» наполнены из harvest; «Committed features», «Standing cross-cutting policies» пустые по шаблону; Iteration index пустой.
- **Метаданные:** дата создания, версия структуры, и пометка «owner — product-spec; создан feature-spec в standalone-flow». Это явный маркер владения, чтобы будущий запуск product-spec знал, что достраивает существующий артефакт.

---

## Change surface

> **Разделение по Approach B:** *механизм* (generic-алгоритм detect/dedup/idempotency/patch/approval/create) живёт в shared-референсе; *harvest-источники и marking discipline* — специфика feature-spec, в его SKILL.md. Секции «Closure backlog-sync algorithm» / «Backlog entry mapping» / «No-backlog flow» выше описывают именно generic-механизм → их тело переезжает в shared-референс; «Structural deferral markers» — feature-spec-специфика.

**1. NEW `hi_flow/references/backlog-integration.md`** (shared family mechanism, owner — product-spec, прецедент — `architectural-principles.md`):
- Generic-алгоритм: detect `*backlog*.md` → harvest-contract (что поставляет consumer) → dedup/merge → idempotency-check по `Originating analysis: <spec> § <id>` → classify → build patch + approval → create-from-template если нет → Iteration index не трогать.
- Читает `product-backlog-template.md` как авторитет формата записи (формат остаётся за product-spec).
- Consumer-agnostic: определяет контракт, который скилл-потребитель наполняет (свои harvest-источники + slug derivation + что считать deferred/rejected).

**2. `hi_flow/skills/feature-spec/SKILL.md`:**
- «Feature scope clarification» — переписать под «product-spec опционален»: два входных режима (после product-spec с bundle / standalone). Сейчас секция завязана только на bundle.
- Новая короткая секция «Backlog sync at closure» — **вызывает shared-механизм по имени** + определяет harvest-источники feature-spec (DEFERRED-развилки, блоки `**Backlog:**`, теги `→ backlog`/`→ rejected`, premortem) + scan-validate scope.
- Wiring closure-флоу — backlog-sync после User Review Gate.
- Marking discipline — заметка: отложил → ставь структурный якорь на месте (`[status: DEFERRED]` / блок `**Backlog:**` буллетами / тег `→ backlog`). Это находилки; level/carry-over/reason финализируются на approval, inline не требуются.
- Format Rules — задокументировать конвенцию `**Backlog:**` блока (встроиться в существующий органический паттерн) и теги `→ backlog` / `→ rejected`.
- References — добавить `backlog-integration.md` (shared механизм) + `product-backlog-template.md` (авторитет формата).

**3. `hi_flow/skills/feature-spec/references/feature-spec-template.md`:**
- Пример блока `**Backlog:**` под развилкой + пример тегов `→ backlog` / `→ rejected` в Out of scope и Premortem. Примеры — внутри fenced code-блоков, чтобы scan-валидация их не подхватывала (S2). Отдельной register-секции нет. «Open items at closure» без изменений (это handoff в arch-spec, см. ниже).

**4. `hi_flow/skills/arch-spec/SKILL.md`** (уже в main, D21):
- Уже ссылается на `backlog-integration` **по имени** и объявил зависимость по принципу 10 («authoritative state in main, impl pending»). Создание shared-референса (п.1) закрывает эту зависимость.
- Опциональная последующая чистка (НЕ блокер этого дизайна): inline-описание механизма в arch-spec SKILL.md свернуть в pointer на shared-референс, чтобы не было двух копий. Делает та же impl-сессия или отдельный chip.
- Контракт handoff: feature-spec «Open items at closure» (severity-разметка: blocker / желательно / nice-to-have) — вход arch-spec; маршрутизацию (blocker → закрывает у себя; nice-to-have/operational → backlog) делает arch-spec. feature-spec эту таблицу только заполняет с severity (колонка уже есть в template).

**5. `ARCHITECTURE.md`** (через скилл `architecture`, с подтверждением «было→стало»):
- Уточнить **D17** — backlog = shared product-composition artifact; product-spec первичный владелец, feature-spec read+append+create-if-missing.
- Новый **D22** — shared `backlog-integration` механизм (owner product-spec; потребители feature-spec + arch-spec); закрывает зависимость arch-spec (D21).
- Module Map: новый entry под `hi_flow/references/backlog-integration.md` + заметка по feature-spec; append в History.
- **OQ10** — остаточный fork: двунаправленная сверка (Approach C) / дивергенция формата.

**6. Версия** — bump в `.claude-plugin/plugin.json` по D16 release flow (этап реализации).

**7. `example-goal-setting.md`** — трогаем только если в нём реально есть отложенное; иначе нет.

**Не меняется:** probing taxonomy (8 категорий), self-assessment, mode selection, формат развилок кроме новых маркеров.

---

## Out of scope (этот дизайн)

- **Approach C** — двунаправленная сверка product-spec'ом feature-spec / arch-spec отложений при новой итерации. YAGNI сейчас (→ OQ10).
- **Чистка arch-spec inline-описания** механизма в pointer на shared-референс — желательна, но не блокер (Change surface п.4).
- **Механика version bump** (D16) — этап реализации.
- Изменения probing taxonomy / self-assessment / mode selection.

*(Approach B — вынос механизма в shared-референс — перешёл из out-of-scope в принятое решение после resync, см. Decisions п.6.)*

---

## Open items (решены дефолтами, явно для имплементации)

- **Hard-rejected в backlog:** по умолчанию НЕ переносим жёсткие rejections автоматически; переносим только если у пункта стоит тег `→ rejected` с явной причиной (оператор сам решил зафиксировать). Чистые границы scope без тега — не трогаем.
- **Multiple `*backlog*.md`:** при ≥2 совпадениях — спросить оператора, не угадывать.
- **Config путь к backlog'у:** опциональное переопределение (как у output location спеки — «configurable»); по умолчанию — glob по `docs/specs/`, `docs/`, корень.
