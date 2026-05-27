# `hi_flow:product-spec` v0.6.1 — Terminology Cleanup Amendment

**Status:** draft
**Date:** 2026-05-27
**Type:** patch к v0.6.0 (terminology realignment, no new mechanics)
**Source:** empirical discovery в session 2026-05-27 после v0.6.0 implementation + REH-ERP decomposition output.
**Original design specs:**
- `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md` (D1 origin)
- `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md` (introduced cluster concept)
**ARCHITECTURE anchor:** D1, D2, D3, D17, D18 — все touched by terminology realignment.

---

## Context

V0.6.0 implementation выявил **terminology drift** между current SKILL.md vocabulary и industry-standard PM terminology / operator's mental model.

**Empirical signal — REH-ERP decomposition output (2026-05-27):**

После прогона v0.6.0 на REH-ERP product-spec'е → 11 «clusters» × avg 3 функции = 33 функций total. Roadmap entries читаются как **feature descriptions** в industry sense:

- `tickets` cluster — «полный lifecycle заявок арендаторов» = feature: Request Management
- `accounts` cluster (merge id+org) — «связный account model» = feature: Identity & Access Management
- `soft-builder` cluster (split из soft) — «admin создаёт маршрут согласования за минуты без программистов, главный wow-демо» = feature: Workflow Builder

F-* идентификаторы внутри cluster'ов читаются как **capabilities / user stories**:
- F-tickets-1 «Подача заявки» = user story
- F-soft-3 «Действие участника шага» = capability
- F-id-1 «Аутентификация» = capability

**Current SKILL.md terminology (drift):**

D1 «trinity функций» использует `feature` как synonym для `function`, и определяет это narrow — atomic shippable unit per D2 three-test gate (atomicity / shippability / negotiability). Это **legitimate technical definition** но **conflicts с industry use**, где:
- **Feature** = significant chunk of user-facing functionality (aggregate)
- **Capability / User story** = atomic action (то, что у нас «функция»)

**Operator mental model — industry-aligned:**

Operator (в этой сессии): «Я думал, что фича может включать в себя несколько функций». Это standard Lean UX / Scrum интерпретация (Epic > Feature > Story hierarchy).

**Decision (этой сессией):**

Realign hi_flow terminology под industry standard:
- **Фича** (Feature) = aggregate of related capabilities = old cluster / module / «feature» в narrow D2 sense
- **Функция** (Function/Capability) = atomic user job per D2 three-test gate = old F-* (по семантике)

Module / cluster / feature концепты collapse в один — **фича**. Это упрощает mental model (3 concepts → 1).

**Scope ограничен** terminology cleanup'ом без structural rework. F-* идентификаторы и Module Map в ARCHITECTURE.md (это про code-modules, не product features) НЕ трогаются. feature-spec SKILL.md update — defer до empirical signal (REH-ERP прогон feature-spec'а).

---

## Out of scope

- **Rename F-* идентификаторов** на C-* (capability) — F-* стабильные ID в REH-ERP product-spec / backlog / plan directory; переименование сломает existing artefacts без real benefit. **F-`<feature-slug>`-`<N>` parses unambiguously как «функция N внутри фичи `<feature-slug>`»** — структура соответствует new terminology естественно (slug после F- = фича slug; цифра = индекс функции внутри фичи). Это и есть intended reading; explicit пояснение в SKILL.md Format Rules clarification note.
- **Module Map в ARCHITECTURE.md** — это про code-модули (директории, файлы), не product features. Concept'ы разные, не collapse.
- **Module-slug в F-`<module-slug>`-N format** — слот стабилен (исторический), но conceptually treated как feature-slug в documentation.
- **feature-spec SKILL.md rework** — defer до empirical signal. Current feature-spec работает с «feature» в narrow sense (single function); operator workflow на REH-ERP покажет работает ли semantically с aggregate bundle. **Collision risk mitigation in v0.6.1:** в bundle файле добавить explicit usage hint header (в bundle-template.md), который инструктирует оператора как привязать bundle к feature-spec session:
> «**Использование с feature-spec:** этот пакет описывает фичу — aggregate of N функций. При запуске feature-spec session: указать одну функцию из списка как target в operator-dump («работаем с F-X из этого пакета»). Для всей фичи целиком — N feature-spec sessions, каждая с одной функцией как target. Bundle reusable в каждой session для контекста.»

Это narrow workaround в v0.6.1 — не меняет feature-spec SKILL.md, but unblocks operator workflow. Full feature-spec amendment (auto-read bundle, aggregate feature spec mode) — отдельный design после empirical signal от боевого прогона.
- **Introduction of new capability-spec skill** — YAGNI per current empirical evidence (REH-ERP features have avg 3 capabilities each, max 6 — feature-spec scope manageable). Если в боевом прогоне feature-spec на large feature окажется unwieldy — это empirical signal для будущего capability-spec design'а, не proactive.

---

## A1. SKILL.md product-spec — terminology realignment

### Проблема

D1 / D3 / Process flow / Module assignment / Decomposition phase используют «module» / «cluster» / «function» / «feature» в narrow technical senses, протекающих в operator-facing коммуникацию. Operator's mental model (industry-aligned) — фича = aggregate. Drift создаёт misframing.

### Дизайн

**D1 redefinition в SKILL.md Concepts section:**

Старая формулировка:
> «Trinity функций (D1). Любая функция в продукте — одна из трёх категорий: пользовательская (domain feature) даёт ценность юзеру напрямую (контакты, заявки, отчёты); поддерживающая (enabler feature) обслуживает пользовательские, но содержит продуктовые развилки (auth, права, нотификации); scaffolding — чисто инженерные решения без продуктовых развилок.»

Новая формулировка:
> «**Trinity функций (D1).** Любая **функция** в продукте (атомарная capability per D2) — одна из трёх категорий: **пользовательская функция** (domain capability) даёт ценность юзеру напрямую (подача заявки, аутентификация, поиск); **поддерживающая функция** (enabler capability) обслуживает пользовательские, но содержит продуктовые развилки (управление учётками, RBAC, нотификации); **scaffolding** — чисто инженерные решения без продуктовых развилок (схема БД, deployment, CI/CD, бэкапы). Product-spec фиксирует только domain + enabler функции.
>
> **Фича** (feature) — группа связанных функций, представляющая блок функциональности продукта. Эквивалентна module / cluster в product-spec output (в decomposition phase эти концепты collapse). 
>
> **D2 application clarification:** Atomicity gate D2 (атомарность / отгружаемость / переговариваемость) применяется к **функциям** — это decomposition gate для разбиения user jobs на атомарные единицы. **Фича** — это grouping decision (Feature assignment Шага 4-5 / Sub-phase 1 Decomposition phase), не D2 gate. Фича сама по себе — aggregate, не atomic; её independent shippability — emergent property её функций (если все функции фичи shipped, фича works). In-scope determination для итерации — по функциям (через D2 + Шаг 6 границы), фича автоматически follows.»

**D3 redefinition в SKILL.md Concepts section:**

Старая формулировка:
> «Модуль = кластер, не уровень иерархии (D3). Заголовок «### Модуль: <Name>» в Section 4 — организационная метка для группировки родственных функций (Identity, Contacts, Leads), а не уровень декомпозиции.»

Новая формулировка:
> «**Фича = группа функций, не уровень иерархии (D3).** Заголовок «### Фича: <Name>» в Section 4 — organisational метка для группировки родственных функций (Identity & Access, Communications, Sales Pipeline), а не уровень декомпозиции. Функции внутри фичи равноправны и связаны через DAG, не через вложенность. Фича не имеет собственной карточки и собственных полей сверх module-level (раньше — module-level).»

**Process flow refresh:**

«Module assignment» Step (между Шагами 4 и 5) → «**Feature assignment**». Process: после Шага 4 (domain функции собраны) скилл группирует по cohesion и предлагает оператору **feature-slug** (раньше — module-slug). Каждая функция получает финальный ID `F-<feature-slug>-N` (структурно идентично).

«Pivot guidance при перестройке module map» → «**Pivot guidance при перестройке feature map**».

«Эвристика классификации модулей по категориям Mermaid-визуализации» → «**Эвристика классификации фич по категориям Mermaid-визуализации**».

«Один module = один cluster» default в Decomposition phase Sub-phase 1 — replaced by: «**default — feature assignment из Шага 4-5 = cluster boundary в decomposition (1:1 inheritance)**». Splits/merges в decomposition refine feature boundary established на Шаге 4-5.

**Cluster concept в Decomposition phase — collapse в фичу:**

В разделе `## Decomposition phase`:
- «cluster boundary dialog» → «**feature boundary refinement dialog**» (refines initial feature assignment из Шага 4-5)
- «cluster slug» → «feature slug»
- «cluster-level cycle» → «**циклу между фичами**» (operator-facing) / «feature-level cycle» (internal)
- «inter-cluster dependency» → «inter-feature dependency» / «межфичевая зависимость»
- «cluster functions list» (в bundle) → «функции этой фичи»
- «one cluster = one module» — REPLACED: «default — фича из feature assignment Шага 4-5, refined splits/merges в decomposition»

**В bundle/roadmap render'е (operator-facing):**
- Заголовки и labels — «Фича: <Name>», «Функции этой фичи», «Зависим от», «Используется» (downstream фич)
- ID идентификаторы остаются F-X-N (structural identifiers)

**Operational Rule 11 — translation table update:**

Старые entries:
```
| domain feature | пользовательская функция |
| enabler / enabler feature | поддерживающая функция |
```

Новые entries (replacing):
```
| domain function / domain capability | пользовательская функция |
| enabler function / enabler capability | поддерживающая функция |
| feature | фича (группа функций) |
| capability | функция (атомарная per D2) — НЕ «возможность», НЕ «функционал» в operator-facing; canonical pair только «capability ↔ функция». «Функционал» как обиходный синоним допустим в conversational tone, но **не использовать в спеках / templates / output**. |
| cluster | фича (в decomposition phase collapsed в feature concept) |
| module (product-spec sense) | фича (в product-spec context; не путать с code-modules в Module Map ARCHITECTURE.md) |
| module assignment | назначение фич (Feature assignment) |
| cluster boundary | граница фичи |
| feature-level cycle | цикл между фичами |
| inter-feature dependency | межфичевая зависимость |
```

V0.6.0 entries про decomposition phase обновляются под new terminology где relevant (cluster references → фича).

**Visibility hint в Concepts:**

В section Concepts добавить explicit note:

> «**Note про terminology realignment в v0.6.1.** Предыдущие версии (v0.5.0 и ранее) использовали «module» в product-spec'е как concept для группировки функций; «feature» использовалось как synonym для «function» (atomic shippable unit). V0.6.1 realign terminology под industry standard: **фича = aggregate of capabilities** (раньше — module), **функция = atomic capability** (раньше — function/feature в narrow sense). Module/cluster/feature концепты collapse в один — фича. F-* идентификаторы stable (структурно не меняются). Module Map в ARCHITECTURE.md — separate concept (code-modules, не product features), не trogaem.»

### Implementation impact

- `SKILL.md` Concepts section — D1, D3 reformulated + terminology realignment note added.
- `SKILL.md` Probing Taxonomy — «Module assignment» переименован в «Feature assignment»; references updated.
- `SKILL.md` Decomposition phase section — cluster → фича throughout (sub-phases 1, 2, 3, 4, 5, 6).
- `SKILL.md` Operational Rule 11 translation table — replace old entries + add new v0.6.1 entries.
- `SKILL.md` Format Rules — references к «module» → «фича» где applicable (item 12: «<product-slug>-iteration-<N>-plan/` directory с roadmap + `bundle-<feature-slug>.md` × N»).
- `SKILL.md` Mermaid sections — «module-level Mermaid» терминология сохраняется (Mermaid визуализирует **фичи** = grouping units; «module-level» терминологически OK как описание уровня granularity, не путается с фичами по содержанию).

---

## A2. ARCHITECTURE.md updates

### D1 wording update

**Было:**
> «### D1. Имя плагина — `hi_flow` (анаграмма HedgeInform).»

(D1 в ARCHITECTURE.md — actually об имени плагина, не trinity функций. Этот D1 unrelated.)

**Trinity функций (D1 в SKILL.md / design spec) — see A1 above для wording.** ARCHITECTURE.md ssylaetsya на это через D17/D18 — update там.

### D17 wording update

Add reference к v0.6.1 terminology realignment в D17:

В конце текущего D17 content (перед Spec ref), добавить:

```
**Terminology realignment (v0.6.1):** «cluster» в этом D17 переименован в «фича» (industry-aligned). Iteration plan directory содержит roadmap (с фичами) + bundle-<feature-slug>.md × N. Mechanics — см. D18 (with terminology updates).
```

### D18 wording update

Aналогично D17 — реfresh wording с фичи вместо cluster. Сложнее: D18 содержит много references к cluster. Let me list изменения:

В D18:
- «Cluster boundary» → «Feature boundary» throughout
- «Cluster-level cycle» → «Inter-feature cycle» (genuine new finding — feature-level Шаг 12.2 не ловит)
- «Bundle generation — 8 элементов per cluster» → «per фичу»
- «cluster slug» → «feature slug»

### New D19 — Terminology realignment

Add new Active Decision:

```
### D19. Terminology realignment v0.6.1 — фича = aggregate, функция = capability.

Hi_flow семейство terminology aligns под industry standard (Lean UX / Scrum):
- **Фича** (feature) — группа связанных функций, представляющая блок функциональности.
- **Функция** (function / capability) — атомарная пользовательская задача per D2 three-test gate.

Previously (до v0.6.1) — D1 / SKILL.md product-spec использовали «feature = function» (narrow technical definition, conflicting с industry). Module/cluster/feature concepts collapse в один — фича.

**Realignment scope:** terminology only, no structural mechanics changes. F-* identifiers stable (структурно не меняются — префикс read как «functional element»). Module Map в ARCHITECTURE.md (про code-modules) не trogaem — это different concept.

**Triggers фиксации:** empirical discovery в session 2026-05-27 — operator's mental model (industry-aligned) conflicts с current SKILL.md narrow definition. REH-ERP decomposition output (11 «clusters» reading как features, F-* как capabilities) подтверждает need realignment.

**Spec:** `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design.md`. **Report:** `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design-report.md`.
```

### Module Map status update

`hi_flow/skills/product-spec/` entry в Module Map — status BUILT v0.6.0 → **BUILT v0.6.1** (terminology cleanup applied). Purpose description расширяется с v0.6.1 realignment note.

### History entry

Append history entry для v0.6.1.

---

## A3. REH-ERP existing artefacts — find-replace cleanup

**Files в `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/`:**

### `2026-05-25-reh-erp-comm-core-plus-demos-product-spec.md`

- «### Модуль: <Name>» (Section 4 заголовки) → «### Фича: <Name>»
- «#### F-<slug>-N. <Название функции>» — оставить как есть (F-* identifiers стабильны)
- «**Module:** <Name>» (если есть в карточках функций) → «**Фича:** <Name>»
- Текстовые упоминания «модуль» в context content — судить per case, если означает «фича» (product-spec sense) → переименовать; если означает technical/code module → оставить

### `reh-erp-product-backlog.md`

- «### Module: <Name>» (committed section группировка) → «### Фича: <Name>»
- «**Module:** <Name>» (в pointer записях committed enabler / domain) → «**Фича:** <Name>»

### `reh-erp-iteration-1-plan/roadmap.md`

- Заголовок «### <N>. <Human name> (`<slug>`)» — operator-facing наименования уже используют «Фича» concept'но; structural элемент остаётся.
- Если есть упоминания «cluster» / «кластер» / «группа функций» в meta-text — переименовать в «фича».

### `reh-erp-iteration-1-plan/bundle-<feature>.md` (× **13 файлов**)

13 bundle файлов в REH-ERP: accounts, audit, comm, contracts, crm, notif, objects, pipeline, portal, soft-builder, soft-flow, tasks, tickets.

- Заголовок «# Контекст для feature-spec: <Human name> (`<slug>`)» — оставить (feature-spec — name скилла, не concept).
- «## Функции этого блока» → «## Функции этой фичи»
- «Из блока: `<slug>`» → «Из фичи: `<slug>`»
- «Группа функций» / «cluster» / «кластер» — переименовать в «фича» где применимо (включая operator-facing комментарии типа «**Происхождение кластера:**» в bundle-soft-flow.md и bundle-accounts.md → «**Происхождение фичи:**»).
- Все «cluster slug» / «cluster-level» в inline комментариях / описаниях — переименовать в «фича» / «межфичевый».

### Backlog terminology resilience (бonus)

Если бэклог REH-ERP всё ещё использует `Shipped features` / `[shipped iter1]` (legacy v0.4.0 terminology, не closed in v0.5.0 amendment migration) — это **pre-existing manual action** per v0.5.0 Implementation Checklist note. В рамках v0.6.1 manual rename'а это можно включить параллельно (один pass через файл), если operator confirm'ит. Иначе — отдельная задача.

---

## Implementation Checklist

### SKILL.md `hi_flow/skills/product-spec/SKILL.md`

**Concepts section:**
- [ ] D1 redefinition: «trinity функций» с capability framing + добавление концепта «фича = aggregate» + atomicity gate D2 на функции, не на фичи.
- [ ] D3 redefinition: «Фича = группа функций, не уровень иерархии». «### Фича: <Name>» heading per Section 4.
- [ ] Realignment note: explicit V0.6.1 terminology shift explanation.

**Process flow / Probing Taxonomy:**
- [ ] «Module assignment» → «Feature assignment» throughout (Шаг между 4-5).
- [ ] «module-slug» → «feature-slug» в namings + F-<feature-slug>-N convention preserved.
- [ ] «module map» → «feature map».
- [ ] «Pivot guidance при перестройке module map» → «...feature map».
- [ ] «Эвристика классификации модулей по категориям Mermaid-визуализации» → «...фич...».

**Decomposition phase section:**
- [ ] Sub-phase 1 «Cluster boundary dialog» → «Feature boundary refinement dialog».
- [ ] «cluster slug» / «cluster» throughout sub-phases → «фича».
- [ ] «one module = one cluster» default → «default — фича из Feature assignment Шага 4-5».
- [ ] «cluster-level cycle» → «inter-feature cycle» (Sub-phase 3).
- [ ] «cluster functions list» в bundle → «функции этой фичи».

**Operational Rule 11 translation table:**
- [ ] Replace `domain feature` / `enabler feature` entries с `domain function (capability)` / `enabler function (capability)`.
- [ ] Add new entries: `feature → фича`, `capability → функция`, `cluster → фича`, `module (product-spec sense) → фича`, `module assignment → назначение фич`, `cluster boundary → граница фичи`, `feature-level cycle → цикл между фичами`, `inter-feature dependency → межфичевая зависимость`.
- [ ] Refresh v0.6.0 entries из decomposition phase где cluster reference (теперь фича).

**Format Rules:**
- [ ] Item 12 (plan directory naming): `bundle-<cluster-slug>.md` → `bundle-<feature-slug>.md`.
- [ ] Add clarifying note в Format Rules: «F-* префикс — generic «functional element»; structurally stable через terminology realignment v0.6.1».

### Templates

**`references/product-spec-template.md`:**
- [ ] Section 4 заголовок «### Модуль: <Name>» → «### Фича: <Name>».
- [ ] Mermaid skeleton placeholders — «Module-A/B/C/D/E/F/W1/W2/S1» → «Feature-A/B/...» (или сохранить «Module-X» как абстрактный placeholder, но обновить subgraph label `Domain ["Пользовательские (domain modules)"]` → `Domain ["Пользовательские фичи"]`).
- [ ] Inline комментарии в Mermaid: «Связи между модулями» → «Связи между фичами»; «classDef ... fill:... color:#fff` per группа — без изменений; ноды agent заполняет именами фич.
- [ ] **Mermaid section terminology decision:** keep «module-level Mermaid» как technical descriptor *уровня granularity* (vs function-level), но subgraph labels и operator-facing комментарии в **product-spec** контексте использовать «фича». Это не конфликтует с Module Map в ARCHITECTURE.md (там Module Map — code-modules, не product-spec концепт).
- [ ] **Splitting раздел** — references к «модулей»/«supermodule»/«module-level» где они operator-facing → «фич»/«superфича»/«фичевый уровень». Технические `linkStyle 0`, indexing, hex codes — без изменений.
- [ ] Любые остальные «module» текстовые упоминания → «фича».

**`references/product-backlog-template.md`:**
- [ ] «### Module: <Module name>» grouping headers → «### Фича: <Feature name>».
- [ ] «**Module:** <Module>» в pointer записях → «**Фича:** <Feature>».

**`references/roadmap-template.md`:**
- [ ] «cluster» references в inline comments → «фича».
- [ ] Operator-facing labels — уже plain Russian; verify нет cluster/cluster slug упоминаний.

**`references/bundle-template.md`:**
- [ ] «# Контекст для feature-spec: <Human name> (`<slug>`)» — оставить (feature-spec = name скилла).
- [ ] «## Функции этого блока» → «## Функции этой фичи».
- [ ] «Из блока: `<slug>`» → «Из фичи: `<slug>`».
- [ ] Любые cluster/cluster slug упоминания в comments → фича.

**`references/example-contact-tracker-mvp.md`:**
- [ ] Update worked example terminology — «module» → «фича», cluster → фича. Опционально (consistency).

### ARCHITECTURE.md

- [ ] D17 — add realignment note (terminology shift в v0.6.1).
- [ ] D18 — refresh wording (cluster → фича throughout).
- [ ] New D19 — Terminology realignment as explicit decision.
- [ ] Module Map entry для `hi_flow/skills/product-spec/` — status update BUILT v0.6.0 → BUILT v0.6.1 + purpose description note.
- [ ] History entry для v0.6.1 implementation.

### REH-ERP existing artefacts (find-replace)

- [ ] `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/2026-05-25-reh-erp-comm-core-plus-demos-product-spec.md`:
  - «### Модуль: <Name>» → «### Фича: <Name>» (all Section 4 headers)
  - «**Module:** <Name>» → «**Фича:** <Name>» (in F-* cards)
  - «**Module-level dependency graph**» (Section 4 label) → «**Mermaid: зависимости между фичами**» или подобное.
  - Inline комментарии Mermaid `%% Связи между модулями` → `%% Связи между фичами`; `subgraph Domain ["Пользовательские (domain modules)"]` → `subgraph Domain ["Пользовательские фичи"]`.
  - Текстовые упоминания «модуль X» в Section 9 scenarios и context — **LLM-assisted review pass** (не pure find-replace, осмысленный per-context decision).
  - Verify: ~14 «Module»/«Модуль» occurrences total. Скилл проверяет всех при apply.
- [ ] `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/reh-erp-product-backlog.md`:
  - «### Module: <Name>» → «### Фича: <Name>»
  - «**Module:** <Name>» → «**Фича:** <Name>»
  - **Bonus** (опционально): «§ Shipped features» → «§ Committed features» + «[shipped iter1]» → «[committed iter1]» (если ещё не migrated в v0.5.0 manual action — спросить operator).
- [ ] `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/reh-erp-iteration-1-plan/roadmap.md`:
  - Verify нет «cluster» / «кластер» упоминаний в meta-text; если есть — переименовать в «фича».
- [ ] `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/reh-erp-iteration-1-plan/bundle-*.md` (× 11 файлов):
  - «## Функции этого блока» → «## Функции этой фичи»
  - «Из блока: `<slug>`» → «Из фичи: `<slug>`»

### Implementation report

- [ ] `docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design-report.md` — после implementation.

### Release flow

- [ ] Bump `hi_flow/.claude-plugin/plugin.json` 0.6.0 → 0.6.1.
- [ ] Commit (separate from REH-ERP cleanup если operator решит decoupled).
- [ ] Push в origin/master.
- [ ] Manual fetch+ff в cache directory per D16.

---

## Open Questions

- **OQ-v6.1-1. REH-ERP backlog terminology (Shipped → Committed).** v0.5.0 amendment ввёл convention, но REH-ERP backlog ещё legacy. Включить parallel rename в v0.6.1 release или отдельный manual action? **Recommended решение в session:** включить как bonus в REH-ERP cleanup pass, один find-replace.
- **OQ-v6.1-2. feature-spec SKILL.md update.** Currently feature-spec работает с «feature» в narrow sense (single function). С новой terminology feature-spec semantically спецает aggregate. Empirical signal от REH-ERP прогона feature-spec'а должен определить нужен ли feature-spec amendment. **Decision:** defer до empirical signal — не trogaem в v0.6.1.
- **OQ-v6.1-3. Capability-spec skill — необходим?** YAGNI per current evidence (REH-ERP features avg 3 capabilities). Если боевые прогоны feature-spec'а на large features покажут unwieldy outcome — это empirical аргумент для capability-spec design в будущем. **Decision:** drop из v0.6.1+ scope, fallback к re-extraction capability в свою feature если потребуется.

---

## References

- **v0.6.0 design spec:** `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design.md`
- **v0.6.0 implementation report:** `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design-report.md`
- **v0.6.2+ amendments handoff:** `docs/handoffs/2026-05-27-product-spec-v0.6.2+-amendments-design-handoff.md` (originally `v0.6.1+`, renamed after v0.6.1 was used for terminology cleanup; этот terminology cleanup НЕ был in scope того handoff'а — discovery в session 2026-05-27)
- **Original product-spec design:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md` (D1 origin)
- **v0.5.0 amendment:** `docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment.md` (Operational Rule 11 origin)
- **Current SKILL.md (post-v0.6.0):** `hi_flow/skills/product-spec/SKILL.md`
- **REH-ERP empirical evidence:**
  - Decomposition output: `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/reh-erp-iteration-1-plan/`
  - Spec: `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/2026-05-25-reh-erp-comm-core-plus-demos-product-spec.md`
  - Backlog: `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/reh-erp-product-backlog.md`
- **ARCHITECTURE.md** — D1 (project), D17 (decomposition scope), D18 (v0.6.0 mechanics), P1 (audience), P6 (escalation discipline)
