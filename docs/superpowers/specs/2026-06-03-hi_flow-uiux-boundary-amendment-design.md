# hi_flow UX/UI boundary amendment (feature-spec ∥ arch-spec) — Design

**Date:** 2026-06-03
**Status:** signed (autonomous session — operator delegated; approval gates substituted by isolated-subagent reviews)
**Type:** cross-skill amendment (incremental) к BUILT `hi_flow:feature-spec` + `hi_flow:arch-spec`
**Source feedback:** `docs/feedback/hi_flow-uiux-boundary-brief.md` (REH ERP, фича `comm`, 2026-06-03; priority Medium).
**Consumer:** subagent-driven impl (P5, by-file) в этой же сессии (автономный режим, P4-override).

---

## 1. Контекст и проблема

В фиче с заметным фронтендом (мессенджер/inbox) всплыло: у семейства нет явной позиции, что из фронтенда — продуктовый слой (feature-spec), а что — архитектурный (arch-spec). Дефолт агента — сваливать «дизайн экранов» целиком в arch-spec, что неверно. Граница проходит **внутри экрана**, не между «есть экран / нет экрана».

Это обоюдная находка (про передачу между двумя скиллами) — обрабатывается симметрично в feature-spec (отдаёт UX) и arch-spec (потребляет UX, проектирует UI).

## 2. Модель (продуктовое решение оператора — не переоткрывать)

**Три слоя:**

| Слой | Что | Чей |
|---|---|---|
| **1. UX-поведение / логика** | что можно, что происходит, правила, состояния, flows | **feature-spec** |
| **2. UX-структура / IA** | какие поверхности/экраны есть, зачем каждый, навигация, *функциональный* состав экрана, ключевые состояния | **feature-spec** |
| **3. UI / визуал** | раскладка, компоненты, типы контролов, визуальная иерархия, стиль | **arch-spec** (архитектура слоя 3) / **дизайнер** (пиксели) |

Дефолтная ошибка — слой 2 уходит в arch-spec вместе со слоем 3. Слой 2 — продуктовый (feature-spec).

**Тест границы (two designers test):** «Могут ли два дизайнера сделать визуально очень разные экраны, оба удовлетворяющие спеке?» Да → спека на UX-высоте (слои 1-2, описывает *что*, не *как выглядит*). Нет → залезла в UI (слой 3) → это arch-spec.

**Сопутствующее правило — поверхность ≠ канал:**
- **Поверхность** — где человек работает (веб-inbox, Telegram-бот, мобильное приложение).
- **Канал** — транспорт сообщения (Telegram, email, web-push).
- Одна поверхность показывает несколько каналов; один канал доставляется на несколько поверхностей. Ошибка — перечислять канал (email) как отдельную поверхность. Правильно: email surface'ит внутри веб-inbox как разговор с пометкой канала.

## 3. feature-spec edits

Затрагивает `hi_flow/skills/feature-spec/SKILL.md` + `references/feature-spec-template.md`.

### FS-1 — новая опциональная output-секция «Поверхности (UX)»

**SKILL.md** «Output Format → Top-level structure»: добавить опциональную секцию `## Поверхности (UX)` **после `Контракт выхода`, перед `Развилки`** (структурный контекст для форков, рядом с контрактами). Conditional — только если фича user-facing.
Содержимое (слои 1-2): перечень поверхностей; per surface — назначение, *функциональный* состав (что на ней функционально, НЕ визуал), ключевые состояния; навигация между поверхностями. Явная пометка: слои 1-2, НЕ слой 3 (визуал → arch-spec), two-designers test как калибровка высоты.

**feature-spec-template.md**: добавить соответствующий блок-секцию `## Поверхности (UX)` (после `Контракт выхода`, перед `Развилки`) с placeholder'ами (перечень поверхностей, назначение, функц-состав, ключевые состояния, навигация) + HTML-comment «conditional: только user-facing; слои 1-2, не визуал».

### FS-2 — UX/UI boundary principle (altitude calibration)

**SKILL.md** «Output Format» рядом с «Plain language principle» / «PRD-as-standalone principle»: добавить подсекцию `### UX/UI boundary principle` — 3-слойная модель + стоп-линия (feature-spec владеет слоями 1-2, НЕ слоем 3 → arch-spec) + two-designers test. Cross-ref P8 (altitude), D14 (complementary layers), D25.
Также в «Out of scope» (Цель template + Out of scope SKILL line 12-16): строка «визуальная раскладка / компоненты / стиль (слой 3) → arch-spec».

### FS-3 — structural probe «Surfaces & UX-structure» + surface ≠ channel

**SKILL.md** «Probing Taxonomy»: добавить **structural probe** (НЕ 9-я fork-категория — surfaces структурны, не форки; прецедент — Hard policies выводит в CC-секцию, не в forks-tree). Разместить как `### Structural probe — Surfaces & UX-structure [Conditional: feature has a user-facing surface]` сразу после категории 8, перед cross-cutting probes. Procedure: elicit surfaces / purpose / navigation / functional composition / key states (слои 1-2); output → секция «Поверхности (UX)» (FS-1), не forks-tree.
Внутри probe — правило **surface ≠ channel** (определения из §2; ошибка = канал как поверхность).
- Обновить taxonomy intro (line 212): «8 probe categories ... + 1 closure criterion» → добавить «+ 1 structural probe (conditional)».
- Обновить closure criterion (lines 197-204): добавить пункт «Structural probe (Surfaces) ран, если фича user-facing (или явный N/A)».
- Line 342 «After the 8 categories» (Premortem) — **правка НЕ нужна**: Premortem остаётся closing probe после всех (structural probe — conditional, не меняет порядок); счётчик «8 categories» остаётся (structural probe — не 9-я категория). Не трогать.
- Короткий cross-ref в категории 1 (Input space): каналы могут появляться как input/context поля — не путать с поверхностями (см. surface ≠ channel в structural probe).

## 4. arch-spec edits

Затрагивает `hi_flow/skills/arch-spec/SKILL.md` + `references/arch-spec-template.md` + `references/self-review-checklist.md`.

### AS-1 — потребление «Поверхности (UX)» как данности (Pre-conditions)

**SKILL.md** «Pre-conditions → Input artifacts» (+ «Reading feature-spec statuses» / extract-before-probing): для user-facing фич секция «Поверхности (UX)» из feature-spec (слои 1-2) **извлекается как факт** (как RESOLVED-форки), не переоткрывается. arch-spec проектирует слой 3 поверх; НЕ переопределяет UX-структуру/поведение. Cross-ref two-designers boundary, D25.

### AS-2 — проектирование слоя 3 (presentation/UI architecture) в §5

**SKILL.md** probing taxonomy «Ceiling — by trigger» (нумерованный список 5-10, lines 145-152): добавить **ceiling-категорию 11 «Presentation / UI architecture» [trigger: user-facing surface]**. Это симметрично arch-spec'овой природе таксономии — ceiling-категории ЕСТЬ §5.x архитектурные под-секции, и presentation-архитектура — одна из них (в отличие от feature-spec, где 8 категорий генерируют форки, а surfaces структурны → отдельный probe). Список 5-11 ↔ template §5.5-5.11 остаётся 1:1. Для user-facing фич arch-spec проектирует **архитектуру слоя 3** — component/module breakdown поверхностей, state-management структура, маппинг surfaces → modules — деривируя из потреблённой UX-структуры. Это *архитектура* UI (компоненты/состояние), НЕ визуальный дизайн (пиксели/стиль = дизайнер downstream).
«Output document → Structure» §5-описание (line 266, «+ conditional ceiling sub-sections by trigger») — generic-формулировка уже покрывает §5.11; явно presentation как триггер можно упомянуть, block-map «B → §5» / «10 sections» не трогать (§5.x — под-секции top-level §5, не top-level секции).
**arch-spec-template.md** §5: добавить conditional ceiling sub-section `### 5.11 Presentation / UI architecture <!-- trigger: user-facing surface -->` (следующий свободный индекс после 5.10) — component/state architecture поверхностей, derived from feature-spec «Поверхности (UX)»; boundary-нота «не переопределяет UX (слои 1-2); визуальный стиль — дизайнер».

### AS-3 — derivability/boundary нота

**SKILL.md** «Cross-cutting checks → Derivability from the product» (или рядом): нота — UX-структура (слои 1-2) есть *продуктовый* вход (из feature-spec), потребляется не ре-деривируется; слой 3 (UI-архитектура) — то, что arch-spec добавляет. Симметрично закрывает границу.

**self-review-checklist.md**: новый чек (supplements — существующий Coverage line 12 «every triggered condition» уже generic-покрывает §5.11; новый чек добавляет boundary-специфику) — «Если фича user-facing: §5.11 presentation architecture деривирована из feature-spec „Поверхности (UX)", не переопределяет UX (two-designers boundary); визуальный стиль не зафиксирован (это дизайнер)».

## 5. ARCHITECTURE.md (closure, через скилл architecture)

- Новый **Active Decision D25** — UX/UI boundary feature-spec ∥ arch-spec: 3-слойная модель (UX 1-2 → feature-spec; UI 3 → arch-spec), surfaces-секция контракт, surface ≠ channel, two-designers test. Инстанс P8 (altitude) на оси UX/UI; связан с D14 (complementary layers). **Spec:** эта спека. Pointer-формат.
- **Topic Index:** концепт «surface» пока в одном месте (D25) — не регистрирую (нужно ≥2 sibling-секции). Отметить, не добавлять.
- **History** — запись 2026-06-03 D25.

## 6. Out of scope

- Сам визуальный дизайн / пиксели / style-guide — дизайнер, не hi_flow.
- bootstrap presentation-ось (project-stack уровень, axis-taxonomy) — отдельный концепт, не трогаем (это про фиксацию UI-фреймворка, не про UX/UI границу фичи).
- Глубокая UI-component методология в arch-spec — proportional scope: arch-spec даёт component/state *архитектуру*, не дизайн-систему.
- product-spec — фича-уровень surfaces ≠ product-уровень декомпозиция; product-spec не трогаем.

## 7. Версия + closure actions

- **Version bump:** 0.8.0 → **0.8.1** (patch — amendment к BUILT-скиллам, backward-compatible; консистентно с arch-spec amendment 0.7.1→0.7.2). plugin.json + marketplace.json синхронно (D16).
- **Report** рядом со спекой (`-report.md`) — эта сессия (impl в той же сессии).
- **active-issues:** не добавляю lingering-запись (impl в той же сессии); источник — бриф в `docs/feedback/`.
- **Commit + push + cache fetch+ff** (D16) — автономный режим, оператор делегировал релиз.

## 8. Implementation notes

- P2/P5: markdown layered поверх текущих SKILL.md + templates. By-file субагенты (feature-spec / arch-spec — разные файлы, conflict-safe, параллельно).
- Read current state перед правкой (global принцип 9).
- Язык SKILL.md/templates — английский (match existing); operator-facing формулировки в template (секция «Поверхности (UX)») — plain Russian (P1, как остальной feature-spec template, который двуязычен: структура EN, контент RU).
- §2 guard: не трогать валидированные механизмы feature-spec (8 probe-категории, backlog-sync, cell-format) и arch-spec (block C, §10 split, fitness invariants) — только ADD UX/UI обработку.
- После impl — изолированный субагент-ревью правок (spec compliance + coherence + два-designers boundary корректность).

## 9. Spec self-review

Перед impl — изолированный субагент на поиск проблем спеки (placeholders, противоречия, anchor-валидность в целевых файлах, scope). Применить safe-fixes.

---

**Конец design-спеки.**
