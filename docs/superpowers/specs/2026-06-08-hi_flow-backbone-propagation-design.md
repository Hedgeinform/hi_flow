# Design — распространение backbone-конвенции модульного монолита в hi_flow

**Status:** signed — implemented 2026-06-08 (RED→GREEN→REFACTOR passed; report `-report.md`). Pending: release D16 + ARCHITECTURE.md fixation (both operator-gated).
**Date:** 2026-06-08
**Source brief:** `Reh_Erp/docs/specs/2026-06-07-hi_flow-backbone-propagation-brief.md` (governance-сессия Reh_Erp 2026-06-07). Предыдущий черновик (SUPERSEDED): `Reh_Erp/docs/specs/2026-06-07-arch-spec-backbone-edits.md`.
**Related:** P8 (разграничение высот), D9 (`module-boundary-awareness`, `vertical-slice-cohesion`), D11 (rules-patch контракт), D20 (порт-модель), D21 (arch-spec decoupled), D24 (composition-root exemption), D26 (shared-capability lookahead).
**Тип:** кросс-проектный дизайн + правки скиллов hi_flow (`bootstrap`, `arch-spec`, новый shared reference). Creative → прошёл `superpowers:brainstorming`; реализация — writing-plans/субагентная impl + writing-skills RED→GREEN.

---

## 1. Задача (problem statement)

Конвенция связности модульного монолита (high cohesion внутри фичи + low coupling снаружи; узкий published API на модуль, приватные внутренности, schema-per-feature ownership, границы тулингом), выработанная на Reh_Erp (принцип P2), должна жить в самом hi_flow — чтобы распространяться на проекты. Требование **двунаправленное**:

- **Forward.** Любой НОВЫЙ проект, заведённый через hi_flow (bootstrap → feature-spec → arch-spec → writing-plans), наследует конвенцию **по умолчанию** — не имея ни проектного принципа, ни прецедента в коде.
- **Backward.** Подключение hi_flow к СУЩЕСТВУЮЩЕМУ проекту в середине жизни **не ломается** от того, что конвенции нет. Мягкая деградация: отсутствие куска не валит остальное.

### Установленный дефект (аудит скиллов)

- **(i)** `arch-spec` floor-1 «Module breakdown» выводит структуру фичи из feature-spec + осмотра соседей; **нет инструкции потреблять проектный backbone-стандарт**. arch-spec decoupled от living-architecture (читает только Module Map как вход).
- **(ii)** Депкруизный примитив `pathNot`-allowlist **уже задействован** в `arch-spec/references/rules-patch-template.yaml` (composition-root exemption через `from.pathNot` в примере `no-feature-code-to-audit-emitter`); `required`-секция в комментарии упоминает форму «X reachable only through Y». Но: **(а)** готового **примера** narrow-public-entry с `to.pathNot`-allowlist в шаблоне НЕТ — все примеры это per-module forbidden-рёбра либо bottleneck-on-`from`; **(б)** в секции Fitness invariants `arch-spec/SKILL.md` **нет инструкции генерировать** narrow-entry. Сессии её не эмитят. Фикс закрывает оба: инструкция (D-ii) + канонический пример в шаблоне (LLM матчится на пример).

### Критический инсайт (почему «условности» мало)

Сделать правку arch-spec просто «условной на декларацию стандарта» **недостаточно для forward-требования**: у нового-с-нуля проекта ARCHITECTURE.md пустой, стандарт ещё не объявлен → условие не срабатывает → новый проект конвенцию НЕ получает. **Конвенцию должен НЕСТИ тулчейн, а не ждать декларации от проекта.** Носитель forward-засева может быть только bootstrap (project-level, владеет Create flow, пишет ARCHITECTURE.md). arch-spec засеять не может — он feature-level и не пишет в ARCHITECTURE.md (P8 + D21).

---

## 2. Разрешение развилок брифа

### Развилка 1 — носитель forward-распространения: **A (bootstrap засевает → arch-spec условно потребляет)**

Не как «рекомендация брифа», а потому что A — единственный вариант, согласованный с залоченным **P8** (bootstrap = project-level «как устроен модуль»; arch-spec = feature-level «какие модули»). Вариант B (backbone как дефолт самого arch-spec) заставил бы arch-spec нести project-level конвенцию своим дефолтом → подъём на чужую высоту → **прямое нарушение P8** + мягкость на нечёткой brownfield-детекции. A — детерминирован существующей архитектурой, не свободный выбор.

Разделение чистое: новый проект = засеян = получает; mid-life без засева = пусто = инертно = не ломается. Разграничение по **наличию** стандарта, без эвристик.

### Развилка 2 — где живёт текст конвенции: **один hi_flow-reference**

Новый `hi_flow/references/feature-backbone-convention.md` (по образцу D9 `architectural-principles.md` / `backlog-integration.md`). Owner — **bootstrap** (носитель-засеватель), read-only для arch-spec. DRY на уровне плагина: bootstrap сеет ИЗ reference, arch-спековские инструкции описывают, как honor'ить ту же каноническую форму.

**Тонкость (разрешена в брейншторме):** в ARCHITECTURE.md нового проекта bootstrap сеет **полный канонический текст принципа** (self-contained, как Reh_Erp P2 прописан целиком в своём ARCHITECTURE.md), + ссылку на reference как provenance. НЕ указатель «смотри плагин» — иначе ломается decoupling/self-containedness для market-ready (проект перестаёт быть автономным), и arch-spec'у пришлось бы резолвить указатель в плагин. DRY соблюдается на уровне плагина (bootstrap и arch-spec ссылаются на один reference за канонической формой), self-containedness — на уровне проекта.

**Single-source — только в момент засева (copy-on-seed).** Канонический текст копируется в ARCHITECTURE.md проекта один раз, при засеве. Дальше копия проекта **независима и НЕ ресинкается** с reference (изменится текст в reference — уже-засеянные проекты не трогаются). Это намеренно: проект остаётся автономным. Реализатору: **писать в ARCHITECTURE.md проекта ПОЛНЫЙ текст, не указатель на плагин.**

### Развилка 3 — мягкая деградация brownfield: **схлопывается в существующие контракты**

Нового механизма не нужно:
- Нет объявленного стандарта → arch-spec инертен (не эмитит narrow-entry, не форсит форму). Это **и есть** graceful degradation — несущий механизм тот же, что у forward (условность на декларацию).
- Brownfield-проект объявляет стандарт mid-life (оператор сам декларирует, либо bootstrap incremental) → narrow-entry эмитится как **обычный D11 rules-patch CANDIDATE** (оператор применяет явно, никогда не авто — operational rule 9). Существующие нарушения всплывут findings'ами на следующем arch-audit = корректная анти-регрессия; оператор триажит (фикс / Known Drift / заузить правило). Никакого отдельного «применить с логом» — D11 candidate-flow это уже «предложить, оператор применяет».

---

## 3. Уточнения из вопроса оператора (достаточно ли у bootstrap информации)

Backbone распадается на два слоя на разных высотах (P8):

- **Слой A — стойка/конвенция (generic, layout-agnostic):** «фича = вертикальный модуль, узкая декларируемая публичная поверхность, deps вниз, store = SSoT фичи, границы тулингом; дефолтная форма + дефолтная поверхность». Родовой текст, не выводимый из специфики проекта → **у bootstrap достаточно информации**: он его не выводит, а декларирует. Это ровно то, чем является Reh_Erp P2.
- **Слой B — конкретная machine-form (narrow-entry regex с реальными префиксами + allowlist поверхности конкретной фичи):** у bootstrap нет и не должно быть (зависит от реальных имён модулей) → **высота arch-spec**, эмитится при первой фиче.

Двухскилловый сплит откалиброван ровно под то, что каждый скилл знает. Недостающая bootstrap'у часть по P8 и не его.

**Три уточнения, которые это вносит в дизайн:**

- **У1.** Засеваемый принцип формулируется как **стойка + дефолтная форма с пометкой «типовая инстанциация, НЕ мандат»**, layout-agnostic. Никакого хардкода `^src/<feature>-` regex в ARCHITECTURE.md проекта — конкретную форму resolve'ит arch-spec по реальной раскладке.
- **У2.** В reference явно прописать **связь со scaffold-конвенцией** (named exports / импорт по конкретному пути не через barrel / явный public-API — это уже про-narrow), чтобы стойка и пример в репо читались как одно целое. (Проверено: TS scaffold демонстрирует named export + явные public-API типы в `src/example/index.ts`, а non-barrel импорт по конкретному пути — в его тесте `tests/example/index.test.ts` с явным комментарием «Import from the concrete file path, not from a barrel». Backbone не противоречит scaffold'у — но scaffold и не инстанцирует feature-форму, что корректно по P8.)
- **У3.** Backbone-стойка несёт `store = SSoT` как **структурный слот** (фича владеет своей персистентностью), независимый от уже-зафиксированной БД (на init без product-spec ось `database` = not-touched). Фича без состояния — просто без store-модуля. Явно, чтобы засев на init был честным.

**Поза засева — не молча.** Create flow (порт Функции 1 architecture) и так пишет `## Project-specific принципы` через confirmation. Засев backbone идёт тем же путём: **informing confirmation в продуктовых терминах** (P1/P6) — «проект класса backend-service по умолчанию получает конвенцию модульного монолита, вот что это значит; ок?», с возможностью отказаться. Не тихая инъекция.

---

## 4. Дизайн правок (4 артефакта)

### 4.1. НОВЫЙ `hi_flow/references/feature-backbone-convention.md` (owner: bootstrap)

Family-shared reference. Содержит:

1. **Двухосевая рамка** — high cohesion внутри / low coupling снаружи; канон модульного монолита (Brown, Grzybek): узкий published API на модуль, приватные внутренности, schema-per-feature ownership, границы через тулинг, не приватность языка.
2. **Канонический текст backbone-принципа** (= ровно тот, что bootstrap сеет в проект; см. §4.2 ниже — single source).
3. **Машинная форма narrow-entry** (depcruise-шаблон, для справки arch-spec):
   ```yaml
   - name: <feature>-narrow-public-entry
     severity: HIGH
     principle: module-boundary-awareness
     from: { path: '^src/', pathNot: '^src/<feature>-|^src/main\.ts$' }   # извне фичи, кроме composition-root
     to:   { path: '^src/<feature>-', pathNot: '^src/<feature>-(<public-surface-allowlist>)/' }
   ```
   `<public-surface-allowlist>` = объявленная публичная поверхность (дефолт `shared|<read-model>|api`, плюс platform-порты, которые фича намеренно экспортирует). **Форма layout-зависима** — это шаблон flat-prefix раскладки; для nested (`^src/features/<feature>/`) arch-spec адаптирует regex. Машинная форма обобщает store-encapsulated со store на всю фичу.
4. **Контракт потребителей:**
   - **bootstrap** — что засевает (полный текст принципа, §4.2), для каких классов (backend-service / fullstack), как (informing confirmation).
   - **arch-spec** — что потребляет (читает декларацию из ARCHITECTURE.md `## Project-specific принципы`), что эмитит (narrow-entry type-1 invariant при декларированной публичной поверхности), цитируя `module-boundary-awareness`.
5. **Связь со scaffold-конвенцией (У2)** — named exports, импорт по конкретному пути не через barrel, явный public-API: scaffold демонстрирует generic-module механику, backbone декларирует feature-композицию поверх; разные высоты, не противоречат.
6. **Принцип, а не шаблон** — легальные вариации (platform-порты наружу; фича без единого фасада через bottleneck-хосты). Enforce машинно: narrow-entry + deps вниз + ацикличность.

**D9-связь:** narrow-entry цитирует существующий `module-boundary-awareness` (тот же, что store-encapsulated) — **новый принцип в D9 НЕ нужен**. Родственный `vertical-slice-cohesion` тоже в D9 (про feature-folder изоляцию) — упомянуть как related, но канонический id для narrow-entry = `module-boundary-awareness`.

### 4.2. Канонический текст засеваемого принципа (single source — в reference, копируется bootstrap'ом в проект)

```markdown
### P<N>. Фича — вертикальный модуль с узкой публичной поверхностью (backbone модульного монолита).

Каждая фича `<feature>` — вертикальный модуль: высокая связность внутри, низкое зацепление снаружи. Канон:
- фича **декларирует узкую публичную поверхность** — набор модулей фичи, импортируемых ИЗВНЕ фичи; все прочие модули фичи приватны;
- зависимости направлены **вниз**, без циклов; store — стабильное дно;
- **store фичи — единственный источник (SSoT)** данных фичи. Ownership персистентности — структурный слот, независимый от того, какой БД его подпирает; фича без состояния просто без store-модуля;
- границы держит **тулинг** (depcruise-правила), не приватность языка.

**Дефолтная форма скелета (типовая инстанциация, НЕ жёсткий мандат):** `<f>-shared` (типы, 0 зависимостей) → `<f>-store` (персистентность-SSoT, приватный) → `<f>-rules`/chokepoint (чистая функция инварианта, если есть) → домен-модули → read-model (проекция view-DTO) → `<f>-app` (секвенсинг — ТОЛЬКО при multi-module use-cases) → `<f>-api` (тонкий фасад). **Дефолтная публичная поверхность = {`<f>-shared`, read-model, `<f>-api`}.**

**Легальные вариации (потому принцип, а не шаблон):** platform-порты, которые фича намеренно отдаёт наружу, — тоже публичны; фича без единого фасада (эмиссия через bottleneck-хосты вместо facade).

Enforce машинно (per фича, эмитит `hi_flow:arch-spec`): narrow-public-entry forbidden-правило + направление вниз + ацикличность. Конкретная форма правила — по реальной раскладке модулей (arch-spec), не зафиксирована здесь.

Конвенция-источник: `hi_flow/references/feature-backbone-convention.md`. Согласуется со scaffold-конвенцией проекта (named exports, импорт по конкретному пути не через barrel, явный public-API).
```

`P<N>` — следующий свободный номер принципа в проекте (bootstrap резолвит при засеве). На greenfield обычно `P1`.

### 4.3. `bootstrap/SKILL.md` — правки (развилка 1A)

**Предпосылка (важно — исправление премиссы).** Текущий Create flow (init шаг 4 + Scope п.1) перечисляет, что создаёт: «create the document, project `## Stack`, init the Topic Index, lay a minimal Module Map skeleton» — **секции `## Project-specific принципы` в перечне НЕТ**, и bootstrap **не шипит собственный ARCHITECTURE.md-шаблон** (его references — только axis-taxonomy / coverage-manifest / scaffold-templates). Декларируемая «self-contained port Функции 1» опирается на шаблон operator-personal `architecture` (`~/.claude/skills/architecture/references/template.md`, у которого секция есть). Это **pre-existing** разрыв self-containedness, трекаемый под OQ6 / D20-Ф3 (relocation reference-контента внутрь плагина) — **в этой задаче НЕ решается** (был бы scope creep в Ф3a). Но засев требует, чтобы секция существовала и bootstrap ею владел. Поэтому:

**(a) Create flow создаёт и владеет секцией `## Project-specific принципы`.** Расширить перечень Create flow (init шаг 4 + Scope п.1): документ создаётся с секцией `## Project-specific принципы` (на greenfield — изначально пустой; присутствует в шаблоне). **Флажок (принцип 5, не молча):** шаблон ARCHITECTURE.md на текущий момент берётся из operator-personal `architecture` (pre-existing зависимость, OQ6/Ф3a); пока relocation шаблона внутрь плагина не сделан, Create flow гарантирует наличие секции явным построением (секции из перечня + `## Project-specific принципы`), не полагаясь молча на внешний шаблон.

**(b) Засев backbone-принципа (backend-service / fullstack only)** — добавить как шаг Create flow после создания секции:

> **Seed the feature-backbone principle (backend-service / fullstack only).** For project class `backend-service` or `fullstack`, write into the project's `## Project-specific принципы` the feature-backbone convention — the verbatim canonical principle from `hi_flow/references/feature-backbone-convention.md`. This is the **forward carrier**: a new project inherits the module-monolith convention by default, with no precedent in code yet (the first arch-spec instantiates it). Seed the **layout-agnostic stance + default form labeled "typical instantiation, not a mandate"** — never a hardcoded narrow-entry regex (that is per-feature, arch-spec's altitude, P8). The principle's `store = SSoT` is a **structural slot** (the feature owns its persistence), independent of whether the `database` axis is fixed yet. **Number resolution:** write it as the next free principle number in the section (greenfield → `P1`; if the section already holds principles, the next free `P<N>` — bootstrap now owns this section, so it reads the existing numbers). **Posture — informing confirmation in product terms** (P1/P6): "a `<class>` project gets the module-monolith convention by default; here is what it means; ok?" — operator may decline (then the section stays without it). **Do NOT seed for `frontend` / `CLI` / `library`** (frontend feature-isolation is a separate track; CLI/library are not module-monolith shaped). For `fullstack`, the backbone applies to the **backend tree**; the frontend tree follows the separate frontend-slice track.

**(c) References** — добавить:
> - `hi_flow/references/feature-backbone-convention.md` — the feature-backbone convention (module-monolith). bootstrap **owns** it and seeds its canonical principle into a new backend-service/fullstack project's `## Project-specific принципы` (forward carrier). Read it for the canonical stance + what to seed.

**(d) Anti-patterns** — добавить:
> - **Seeding the backbone as a hardcoded enforcement form.** bootstrap seeds the layout-agnostic *stance* (default form = "typical, not a mandate"); the concrete narrow-entry regex is per-feature (arch-spec, P8). Do not write a `^src/<feature>-` rule into the project's ARCHITECTURE.md.
> - **Seeding the backbone for frontend / CLI / library.** Only backend-service / fullstack get it (module-monolith canon). Frontend feature-isolation is a separate track.

**(e) Boundaries / Scope** — в строке про Create flow (Scope п.1) добавить: «+ создаёт секцию `## Project-specific принципы` и для backend-service/fullstack сеет в неё feature-backbone принцип (forward carrier)». Точечно, без дублирования.

### 4.4. `arch-spec/SKILL.md` — правки D-i + D-ii (строго условные)

**D-i — потреблять backbone-стандарт (2 точки):**

1. **Floor — пункт «1. Module breakdown»** (текущая строка: `1. **Module breakdown** — by which responsibilities the feature splits.`) — дополнить:
   > **If the project's `ARCHITECTURE.md` declares a feature-backbone / module-shape standard** (a project principle prescribing the per-feature skeleton + what counts as the feature's *public surface*), derive the breakdown to conform to it and **declare this feature's public surface** (the modules importable from outside the feature; everything else private). Absent such a standard — derive from responsibilities alone.

2. **Operational rules — новый пункт 11** (текущих 10; добавить 11):
   > 11. **Honor the project backbone standard (if declared).** When `ARCHITECTURE.md`'s `## Project-specific принципы` declares a per-feature backbone / module-shape standard, the module breakdown conforms to it and the spec declares the feature's public surface. Read it from `ARCHITECTURE.md` (this is a **read** — decoupling D21 is about not *writing*); project-specific, not invented per-feature (P8). Absent the standard — inert (derive from responsibilities, as before).

3. **Pre-conditions → Input artifacts** — у строки `ARCHITECTURE.md Module Map` расширить роль: «Map of existing modules, boundaries, known problems **+ a declared feature-backbone standard, if any (`## Project-specific принципы`)**».

**D-ii — эмитить narrow-entry (Fitness invariants):**

Добавить абзац в секцию Fitness invariants (рядом с «Composition-root exemption (generation rule)», т.к. форма родственна):

> **Narrow public entry (when a backbone standard declares a public surface).** If the project backbone standard (D-i) mandates a narrow public surface, emit a type-1 invariant `<feature>-narrow-public-entry`: a `forbidden` rule, `from` = modules outside the feature (`^src/`, `pathNot` feature-prefix + composition-root), `to` = the feature's modules EXCEPT its public surface (`to.pathNot: ^src/<feature>-(<public-surface-allowlist>)/`). Generalizes a store-encapsulation rule from the store to the whole feature; cite `module-boundary-awareness`. **Resolve the regex to the project's actual module layout** — the `^src/<feature>-` form is the flat-prefix default; for a nested layout (`^src/features/<feature>/`) adapt it. **Platform ports the feature deliberately exposes** (Shared-capability lookahead, D26) belong **IN the allowlist**. Absent such a standard — do not emit. See `hi_flow/references/feature-backbone-convention.md` for the canonical form.

**Связка с Shared-capability lookahead (D26):** в существующем cross-cutting check «Shared-capability lookahead» (и/или operational rule 10) добавить одну фразу, что platform-порт, признанный публичным, попадает в `<public-surface-allowlist>` правила narrow-public-entry. Точечно — без переписывания D26-блока.

**Канонический пример в `arch-spec/references/rules-patch-template.yaml`.** Добавить в `forbidden`-секцию закомментированный пример `<feature>-narrow-public-entry` (рядом с существующим `no-feature-code-to-audit-emitter`), демонстрирующий `to.pathNot`-allowlist форму публичной поверхности + composition-root exemption на `from`. Депкруизный примитив тот же, новой механики нет — но готового примера этой формы в шаблоне сейчас НЕТ, а LLM-сессии матчатся на примеры. Пример = машинная форма из §4.1(3):
```yaml
#   - name: <feature>-narrow-public-entry
#     severity: HIGH
#     from:
#       path: ^src/                                  # извне фичи...
#       pathNot: ^src/<feature>-|^src/main\.ts$      # ...кроме самой фичи + composition-root
#     to:
#       path: ^src/<feature>-                        # модули фичи...
#       pathNot: ^src/<feature>-(shared|<read-model>|api)/   # ...КРОМЕ публичной поверхности (+ platform-ports)
#     principle: module-boundary-awareness
#     # Объявленная публичная поверхность фичи. <allowlist> = {shared, read-model, api} по дефолту
#     # + platform-порты, которые фича намеренно экспортирует (Shared-capability lookahead, D26).
#     # Раскладка flat-prefix; для nested (^src/features/<feature>/) адаптировать regex.
```

**References** — добавить:
> - `hi_flow/references/feature-backbone-convention.md` — the feature-backbone convention. arch-spec reads the project's declared standard (D-i) and emits `<feature>-narrow-public-entry` when it mandates a public surface (D-ii). Read for the canonical form + the narrow-entry machine template.

### 4.5. Версии-манифесты (D16 release flow)

После мёржа правок — синхронный bump в **обоих** манифестах (`hi_flow/.claude-plugin/plugin.json` И запись `hi_flow` в корневом `.claude-plugin/marketplace.json`), commit → push → **manual fetch+ff в cache** (`~/.claude/plugins/marketplaces/hi_flow-marketplace/`). Без последнего шага релиз не доходит до Reh_Erp и будущих проектов. Версия: minor bump (0.8.5 → 0.9.0 — кросс-скилловая фича).

---

## 5. Что явно ВНЕ scope (не молча — принцип 5)

- **feature-spec не трогаем** — backbone структурный, не продуктовый; на §«Поверхности (UX)» не влияет (бриф «вряд ли» — подтверждено анализом: backbone про код-модули, поверхности про UX-слои 1-2, D25).
- **Frontend-slice трек отдельный** — для frontend backbone НЕ сеется. Изоляция фронт-фич (vertical-slice) ведётся своим треком: active-issues «vertical-slice-respect правило-призрак» + «arch-spec авто-эмиссия frontend-профиля». Не смешиваем.
- **arch-audit runtime / D9 / depcruise-движок не трогаем** — `module-boundary-awareness` уже есть; narrow-entry эмитится как rules-patch и проверяется существующим движком без правок runtime. (Шаблон `rules-patch-template.yaml` правим минимально — один закомментированный пример, §4.4; новой формы/примитива не вводим.)
- **Стиль-таксономию в артефактах не разжёвываем.** Backbone — дефолт для backend-service/fullstack (модульный монолит — наиболее качественный дефолт для solo+AI), seeding declinable через informing confirmation. Эссе про альтернативные стили (микросервисы, event-driven и т.п.) в reference/SKILL.md НЕ пишем — конвенция просто ЕСТЬ как дефолт. Backbone — единственный структурный стиль, покрытый плагином end-to-end (P7); другие стили = unmanaged через существующую graceful-машинерию, без нового механизма.
- **README/дистрибуция-честность — deferred.** Явное «плагин ориентирован на модульный монолит» — в README на этапе дистрибуции (market-ready трек, связан с OQ9/OQ11), НЕ в этой спеке. Зафиксировано здесь, чтобы не потерялось.

---

## 6. Валидация (writing-skills RED→GREEN)

**Механика:** изолированные субагенты (P2/P3 — TDD заменён behavioral validation; subagent simulation). **RED гонится в ЧИСТОМ greenfield-сценарии, НЕ в Reh_Erp** — там ложный pass из-за P2 + прецедента `comm-narrow-public-entry` в SSoT (урок брифа §6).

**Критерий судейства — МЕХАНИЧЕСКИЙ АРТЕФАКТ, не «качество дизайна».** Это защита от второго источника ложного pass: backbone (модульный монолит) — общее знание, и свежий субагент может спроектировать «модуль-shaped» структуру из собственного prior knowledge даже на скиллах AS-IS. Поэтому RED/GREEN судится НЕ по тому, «спроектировал ли субагент что-то узкое», а по **наличию конкретных артефактов**:
- **bootstrap:** записан ли в `## Project-specific принципы` проекта **блок backbone-принципа** (вербатим-узнаваемый) — да/нет.
- **arch-spec:** есть ли в сгенерированном rules-patch строка-правило с `name: <feature>-narrow-public-entry` (форма `to.pathNot`-allowlist) — да/нет; задекларирована ли публичная поверхность в §5 спеки явным списком — да/нет.

Судим по присутствию/отсутствию этих строк, не по дизайнерскому вкусу субагента.

**Порядок строгий: RED ДО правок, GREEN ПОСЛЕ** (субагент читает SKILL.md с диска).

1. **RED (требование 1, forward-пробел) — до правок.** Свежий изолированный субагент, greenfield-сценарий: пустой/без-backbone ARCHITECTURE.md проекта класса backend-service, тестовая фича. Прогнать цепочку (bootstrap init → arch-spec на фиче) на скиллах AS-IS. **Ожидание (по артефактам):** bootstrap НЕ записал блок принципа; в rules-patch arch-spec НЕТ строки `<feature>-narrow-public-entry`. Задокументировать вербатим (подтвердить пробел по артефактам, не по «не догадался»).
2. **GREEN (после правок).** Свежий субагент, тот же greenfield, **с приёмом seed'а** (симулируемый оператор отвечает «ок» на informing confirmation — иначе gate легально no-op'ит и GREEN ложно совпадёт с RED): bootstrap init (backend-service) → **записал** блок backbone-принципа в `## Project-specific принципы` → arch-spec на тестовой фиче → **прочитал** стандарт + **записал** публичную поверхность в §5 + **эмитил** строку `<feature>-narrow-public-entry` в rules-patch (regex по реальной раскладке, platform-порты в allowlist). Проверка — по присутствию этих артефактов.
3. **Graceful degradation (требование 2).** Свежий субагент, brownfield-сценарий без декларации стандарта → arch-spec **инертен**. Проверка **механическая, не на глаз**: прогнать arch-spec на фиксированной no-standard фикстуре до и после правок → output (спека + rules-patch) **эквивалентен** (нет строки `<feature>-narrow-public-entry`, нет форсинга формы, остальные блоки не сломаны). Та же дисциплина output-equivalence, что у arch-spec для single-tree фич.
4. **REFACTOR.** Если субагент находит лазейку (забыл platform-порты в allowlist / засеял не тот класс / хардкоднул regex в ARCHITECTURE.md / отказ от seed'а не обработан / сломал graceful) → уточнить формулировку, перепрогнать затронутый сценарий.

**Spec self-review** — **выполнен** изолированным субагентом до реализации (глобальная добавка оператора к brainstorming): субагент получил этот файл + контекст скиллов + инструкцию найти placeholder'ы / противоречия / факт-несоответствия / ambiguity / scope. Находки (1 blocker + 2 major + minor) учтены в этой ревизии спеки.

---

## 7. Implementation checklist (для writing-plans)

Spec self-review (§6) выполнен ДО реализации. Sequential по dependency graph (принцип 10):

0. **RED-прогон** (изолированный субагент, greenfield, скиллы AS-IS) → задокументировать пробел по артефактам (§6 п.1). **До любых правок.**
1. **Создать** `hi_flow/references/feature-backbone-convention.md` (§4.1 + §4.2). Upstream для bootstrap и arch-spec.
2. **Править** `bootstrap/SKILL.md` (§4.3 a–e: создание/владение секцией принципов + засев backbone backend-service/fullstack + References + Anti-patterns + Scope). Зависит от шага 1 (reference существует).
3. **Править** `arch-spec/SKILL.md` + `arch-spec/references/rules-patch-template.yaml` (§4.4: D-i floor-1 + rule 11 + pre-conditions; D-ii narrow-entry-инструкция + связка D26 + канонический пример в шаблоне; References). Зависит от шага 1. Touch-points с шагом 2 пустые (разные файлы) → можно параллельно с шагом 2.
4. **GREEN + graceful-прогоны** (§6 п.2–3, изолированные субагенты, после правок 1–3; судейство по артефактам, GREEN с приёмом seed'а). REFACTOR при находках.
5. **Версии** (§4.5, D16): синхронный bump plugin.json + marketplace.json → commit → push → fetch+ff cache.
6. **Implementation report** рядом со спекой (`-report.md`) + **фиксация в ARCHITECTURE.md** (§8).

---

## 8. Фиксация в ARCHITECTURE.md (кандидаты, через скилл architecture)

- **Новый D — backbone propagation.** «bootstrap засевает feature-backbone принцип в backend-service/fullstack проекты (forward carrier); arch-spec условно потребляет + эмитит narrow-public-entry. Текст конвенции — `hi_flow/references/feature-backbone-convention.md` (owner bootstrap). Связь P8/D11/D21/D26.» Spec — этот файл.
- **Module Map** — bootstrap/arch-spec обновить ссылками на новый reference; добавить `hi_flow/references/feature-backbone-convention.md` как BUILT shared reference.
- **Topic Index** — кандидаты концепты: `feature-backbone` / `narrow-public-entry` / `public surface` (появятся в ≥2 D-записях/секциях).

Фиксация — отдельным шагом через скилл `architecture` (confirmation для D + принципов), не в этой сессии implementation молча.

---

## 9. Durability (напоминание)

Правки — в ИСХОДНИКЕ hi_flow (этот проект), НЕ в кэше `~/.claude/plugins/cache/hi_flow-marketplace/...`. После мёржа + version bump — обязательный manual fetch+ff marketplace-кэша (D16), иначе Reh_Erp и будущие проекты обновлённые скиллы не увидят.
