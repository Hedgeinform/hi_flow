# `hi_flow:feature-spec` — Skill Design

**Status:** design v1, ready for implementation planning.
**Date:** 2026-04-26.
**Family:** `hi_flow` — семейство скиллов методологии Three-Phase Flow для solo-founder + AI разработки.
**Sibling skills (parked / future):** `hi_flow:product-spec` (product-level decomposition), `hi_flow:arch-spec` (Phase 2 архитектурная спека), `hi_flow:impl-plan` (Phase 3 implementation plan), `hi_flow:fitness` (architectural fitness functions), `hi_flow:sanity-check`, `hi_flow:handoff`.

---

## 1. Назначение и scope

### Что делает skill

Ведёт оператора от запроса фичи к подписанной `product-spec.md`, которая (1) даёт оператору фокус для deep review, (2) даёт следующей фазе (`hi_flow:arch-spec`) однозначное основание для архитектурного дизайна.

Skill systematically выявляет иерархические продуктовые развилки (forks) — конкретные поведенческие решения, edge cases, hard policies, критерии разграничения похожих ситуаций — через структурированный диалог с оператором.

### Что НЕ делает (явно out of scope)

- Не работает на product-level (декомпозиция крупного продукта на фичи) — для этого отдельный skill `hi_flow:product-spec` (parked).
- Не делает архитектурных или технических решений — это `hi_flow:arch-spec` и `hi_flow:impl-plan`.
- Не вызывает следующую фазу автоматически — оператор инициирует переход.
- Не покрывает n8n-проекты (специфика инструмента — отдельный кейс при необходимости).

### Парковано до iteration phase

- Temporal step-by-step decomposition (Cockburn-style extensions) как отдельная ось probing'а.
- Non-functional forks как отдельная категория (latency, privacy, observability, idempotency).
- Out-of-scope как явный probe-вопрос (сейчас — только inline в Цели / Контракте).
- Граф развилок (Mermaid рендер) как опциональная секция product-spec.md.

### Входные условия

Оператор приходит с описанием фичи произвольной полноты — от «нужно X» до подробного видения с готовыми forks. Skill адаптируется к полноте через self-assessment.

### Выходной артефакт

Один файл `product-spec.md` в формате, описанном в разделе 6.

---

## 2. Активация и self-assessment

### Триггеры активации (explicit, content-specific)

- «продуктовая спека [для X]» / «product spec [for X]»
- «спека на фичу X» / «спека по фиче X»
- «продуктовый дизайн фичи X» / «product design of X»
- «анализ продукта X» / «анализ нашей фичи X» (когда X — наша фича, не конкурент)
- «давай продумаем фичу X» / «давай спроектируем фичу X»

### Не триггеры (skill не активируется автоматически)

- Bare feature-shape запрос («хочу добавить X», «нужна фича Y», «давай добавим tool Z») — может быть research / chatter / архитектурный запрос. Агент уточняет или предлагает skill, но не запускает сам.
- «собери информацию про X» / «исследуй X» / «анализ конкурента» — research, не product spec.
- «реализуй X» / «нужна архитектура для X» — это `hi_flow:arch-spec` / `hi_flow:impl-plan` territory.

### Self-assessment proposal

После активации skill генерирует proposal по выбору пути:

1. **Skip** — у задачи нет продуктовой составляющей (опечатка, чистый refactor). Редкий случай при explicit trigger, но возможен.
2. **Direct path** — спека формируется без brainstorm-диалога, на основе уже данного оператором input'а. Только при выполнении **всех** условий: input оператора эксплицитный со списком forks; scope мелкий (≤ 3-4 forks); low-stakes домен; high similarity к существующему паттерну; изолированная фича.
3. **Brainstorm path** — полный диалог с probing taxonomy. **Default.**

**Асимметрия cost'ов обосновывает conservative default:**

- False positive (brainstorm там, где хватало direct) → потеря времени оператора.
- False negative (direct там, где нужен brainstorm) → пропущенные forks → архитектурный долг.

Cost второго радикально выше. В сомнении → brainstorm.

### Формат proposal

```
[Self-assessment: hi_flow:feature-spec]

Предлагаю: brainstorm / direct / skip
Причина: <одно-два предложения>
Факторы:
- Input completeness: high / medium / low
- Scope: small / medium / large
- Stakes: low / high
- Similarity: new / template available
- Cross-feature touches: isolated / many

Подтверди / измени.
```

Оператор может override любое предложение или сразу указать конкретный путь («запусти brainstorm под X», «direct по моему input'у»).

---

## 3. Процесс работы skill'а

Все три path'а активируются только после confirmation от оператора в self-assessment proposal. Skill ничего не делает молча — каждый переход даёт оператору момент согласия / override.

### 3.1. Skip path

Skill завершается без создания артефакта. Если оператор не согласен с skip предложением — он не подтверждает, а override'ит на direct или brainstorm в self-assessment proposal. Skip case рассмотрен только когда оператор явно сказал «да, skip».

### 3.2. Direct path

Skill читает input оператора, структурирует его в product-spec.md по формату из раздела 6, показывает оператору финальный draft, оператор апрувит или просит правки. Минимум диалога.

### 3.3. Brainstorm path

Состоит из трёх под-фаз: operator-dump → agent probing → closure.

#### 3.3.1. Operator-dump

Skill начинает с одного открытого вопроса оператору:

> *«Расскажи, что у тебя уже есть про эту фичу — цели, поведение, развилки, ограничения. Дамп всё, что в голове.»*

Оператор выгружает что есть. Skill параллельно (если в проекте есть `ARCHITECTURE.md`) читает Module Map и Active Decisions — для понимания existing features (нужно для Cross-feature integration probe).

Дамп может быть пустым («хочу X, ничего пока не думал») — skill переходит к probing без него.

#### 3.3.2. Agent probing

Skill идёт через 8 probe-категорий (раздел 5) как **floor checklist**, плюс свободно добавляет адаптивные probes по контексту.

Probing итеративный: вопрос → ответ оператора → запись в новый или существующий fork cell → следующий probe.

**Park-and-continue:** оператор может сказать «не знаю» / «позже» — skill записывает в `Открыто` и идёт дальше. Никаких deadlock'ов.

**Cross-cutting probes (всегда активны):**
- *Make implicit criteria explicit* — при появлении vague-формулировок (раздел 5).
- *Contradiction detection* — после каждого нового fork-ответа skill сверяет с уже зафиксированными.

**Closing probe (mandatory at end):**
- *Premortem* — *«представь, фича запущена, через 3 месяца идут жалобы. Какие?»*

#### 3.3.3. Closure

Skill enumerates все open items в спеке:

- Forks без `Решение` — likely blocker для следующей фазы.
- Непустые `Открыто` поля — sub-questions, обычно не блокеры.
- Parked items.

Каждый item flag'ается: **likely blocker / nice-to-have / уточнить**.

Оператор per item решает: **resolve сейчас / оставить для следующей фазы эскалации / out of scope**.

После этого skill пишет финальный product-spec.md в `<project>/docs/specs/YYYY-MM-DD-<feature-slug>-product-spec.md` (точное расположение настраиваемо), показывает оператору, ждёт подтверждения. На «да» — сохраняет и выходит. На правки — вносит и переспрашивает.

### Coverage-based closure criterion

Skill переходит к Closure только при выполнении всех условий:

- Все Mandatory категории дали forks или явное N/A.
- Все Conditional с выполненными preconditions дали forks или явное N/A.
- Premortem closing завершён.
- Contradiction detection не имеет открытых конфликтов.

До этого — probing продолжается.

### Контракт с следующей фазой

Если в брейншторме возникает ambiguity, которую агент не может решить из доступных данных — skill эскалирует оператору. Skill **не перезапускает** предыдущую фазу (если она была — например, product-level skill).

Та же логика применима к следующей фазе: если `hi_flow:arch-spec` обнаружит, что product-spec.md недостаточен для архитектурного вывода — он эскалирует оператору, не возвращается к этому skill'у.

---

## 4. Иерархия в семействе `hi_flow`

Текущий skill `hi_flow:feature-spec` — один из четырёх уровней Phase-уровневой decomposition.

**Уровни (сверху вниз):**

1. **Product-level** — `hi_flow:product-spec` (parked). Декомпозиция крупного продукта на фичи. Выход — список фич + meaningful связи между ними + roadmap.
2. **Feature-level** — `hi_flow:feature-spec` (текущий). Продуктовая спека одной фичи. Выход — `product-spec.md`.
3. **Architecture-level** — `hi_flow:arch-spec` (parked, future). Архитектурный дизайн фичи на основе product-spec.md. Выход — `arch-spec.md` с диаграммой связей.
4. **Implementation-level** — `hi_flow:impl-plan` (parked, future). План реализации + TDD на основе arch-spec.md.

**Принципы между уровнями:**

- Каждый уровень self-assessment выдаёт proposal (запускать / не запускать). Оператор подтверждает.
- Каждый уровень не вызывает следующий автоматически — оператор инициирует.
- При обнаружении ambiguity на каком-то уровне — эскалация оператору, **не** автоматический возврат на предыдущий уровень.
- Артефакт каждого уровня самодостаточен для product/architecture/implementation context этого уровня.

---

## 5. Probing taxonomy

Floor checklist для агента в Brainstorm path: **8 probe-категорий + 1 cross-cutting probe + 1 cross-cutting check + 1 closing probe + 1 closure criterion**.

### Универсальное правило

Агент проходит через все категории, но **не обязан** генерировать forks в каждой. Пустая категория — нормальный результат, если у фичи действительно нет соответствующих решений. Агент **не заполняет** искусственно — это путь к галлюцинациям.

Каждая категория имеет explicit Procedure (input → algorithm → output). Адаптивные probes допустимы как **дополнение** к процедуре, не замена.

### Категории

#### 1. Input space [Mandatory]

**Procedure:**
- Спросить оператора: «какие поля есть у фичи?»
- Per поле: «откуда берётся (user input / context / system)? обязательно? есть default?»
- Iteratively, пока не появляются новые поля.
- Для user-input полей: «какие формы пользовательского ввода (raw forms — числа, даты, неточные ссылки, дельты, проценты)?»

**Output:** список полей с метаданными.

#### 2. Boundary [Mandatory]

**Procedure:** для каждого поля прогнать **HAZOP guidewords**:
- *No* / *More* / *Less* / *As Well As* / *Part Of* / *Reverse* / *Other Than*

Каждый guideword → 1 probe «как бот реагирует?». Нерелевантные пропускаются явно.

**Output:** forks для нетривиальных реакций.

#### 3. Invalid combinations [Conditional: ≥2 взаимодействующих поля]

**Procedure:**
- Identify все пары / тройки / N-tuples полей с логическим взаимодействием.
- Per группа: «есть ли запрещённая или проблематичная комбинация? Какое правило?»
- Запись: обычный fork **или** decision table (если ≥3 независимых булевых условия с don't-care).

**Output:** combination forks / decision tables.

#### 4. User reactions [Conditional: фича имеет user-visible output]

**Procedure:** per user-visible output walk через **5 стандартных user reactions**:
- *Accept* / *Reject* / *Partial-accept* / *Abandon* / *Change*

Каждая → probe «как бот реагирует?».

**Output:** forks per (output, reaction).

#### 5. Hard policies [Optional]

**Procedure:** срабатывает если домен имеет ethical / safety / medical / legal риск.
- Walk через Boundary findings — per экстремум: «триггерит ли concern?»
- Если домен высоко-stakes — walk через стандартные sensitive areas.
- Каждая policy формулируется паттерном «Если <условие>, то отказ / требование / лог <действие>».

**Важно:** агент **не фабрикует** policy для нейтральных фич. Если риска нет — категория пропускается без записи.

**Output:** policy-forks. Уходят в раздел Cross-cutting policies, не в основное дерево.

#### 6. Disambiguation [Optional]

**Procedure:** срабатывает при наличии ≥2 похожих внешне ситуаций.
- Попарный обход всех forks: «выглядят похоже извне, но требуют разной реакции?»
- Highlight near-misses оператору.
- Critery — обычно examples + checklist, не формула.

**Важно:** агент **не изобретает** псевдо-disambiguation. Если нет реальных near-misses — категория пропускается.

**Output:** disambiguation forks с критериями + examples.

#### 7. Lifecycle [Conditional: фича имеет state, сохраняющийся после первичного действия]

**Procedure:** per state-change из Контракта выхода — **5 lifecycle вопросов**:
- *Expire* / *Change* / *Abandon* / *Repeat* / *Override*

**Output:** lifecycle forks.

#### 8. Cross-feature integration [Conditional: в проекте есть существующие фичи]

**Procedure:**
- Skill читает Module Map из ARCHITECTURE.md.
- Per module/feature: «наша фича взаимодействует? Как — read / write / trigger / depend on?»

**Output:** integration forks.

### Cross-cutting probe — Make implicit criteria explicit [Always active]

При появлении любой vague-формулировки skill определяет flavor:

- **Скрытое число** (быстро / часто / много) → quantify в значение.
- **Скрытый критерий** (опасный / настойчивый / нереалистичный) → operationalize в правило / checklist.
- **Genuinely fuzzy** (похоже / естественно / уместно) → accept fuzziness, дать LLM якорные примеры.

### Cross-cutting check — Contradiction detection [Always active]

После каждого нового fork-ответа skill сверяет с уже зафиксированными. При противоречии — flag оператору:

> *«В F1.3 ты сказал X, в текущем F2.4 — предполагается Y. Конфликт. Какое решение верно?»*

### Closing probe — Premortem [Mandatory at end]

После прохождения 8 категорий + cross-cutting checks:

> *«Представь, фича запущена, через 3 месяца идут жалобы пользователей. Какие?»*

Каждая воображаемая жалоба → потенциально новый fork.

---

## 6. Формат product-spec.md

### Имя файла

`<project>/docs/specs/YYYY-MM-DD-<feature-slug>-product-spec.md`

Расположение настраиваемо в скилле через параметр.

### PRD-as-standalone principle

Спека самодостаточна для product context. Следующая фаза (arch-spec) читает её для понимания продукта, ARCHITECTURE.md для архитектурного контекста — без overlap. Никаких внешних зависимостей чтения для product-уровня.

### Plain language principle

Product-spec.md адресован оператору-продуктологу, не разработчику. Default — продуктовый русский язык. Английский жаргон допустим если он:

- (а) объективно упрощает восприятие (короче и точнее русского эквивалента), или
- (б) широко известен в профессиональной среде (MVP, KPI, UX, ИМТ, BMI, ROI, и т.п.).

Жаргон, понятный только инженеру (extract-all, payload, throughput, idempotency, fallback, retry-strategy и т.п.) — переводить или раскрывать на продуктовом языке.

Принцип не создаёт запретов на разумные общеупотребимые сокращения; он защищает оператора от ненужного инженерного шума.

### Верхнеуровневая структура

```markdown
# <Feature name>

## Sample dialogs
### Happy path
[concrete dialog]

### Corrected path
[concrete dialog]

### Refused / Edge path
[concrete dialog]

## Цель
[1-3 предложения; out of scope inline если есть явные исключения]

## Контракт входа

### От пользователя (raw)
- field: формы

### Из контекста
- field: тип, источник, обязательность, default

## Контракт выхода
- Запись: ...
- Возврат пользователю: ...
- Side effects: ...

## Развилки
[hierarchical decision tree]

## Cross-cutting policies
[orthogonal forks]

## Reusable sub-policies
[named blocks referenced from forks]

## Premortem findings (closing probe absorbed)
[absorbed into spec or list of additional concerns]

## Open items at closure
[generated by skill at closure step]
```

### Sample dialogs

3 концетных user path'а в формате диалога:

- **Happy path** — всё прошло гладко.
- **Corrected path** — потребовалась корректировка, всё закрылось.
- **Refused path** — бот отказал. Если refuse-сценарий не применим к фиче — заменяется на **Edge path** (один из крупных edge cases).

Якорь для оператора и для следующей фазы. Без них дерево forks читается в вакууме.

### Cell-формат

```markdown
### F1.3.2. <название> [decision: что решаем] [status: OPEN | RESOLVED | OUT-OF-SCOPE | DEFERRED]

**Resolution:** <ответ + одна фраза reasoning'а> | OPEN — нужно решение

**Branches [XOR | OR | OPT]:**
- F1.3.2.1 — <branch label> → <inline action OR see deeper>
- F1.3.2.2 — <branch label> → see CC1 / see P-NAME

**Открыто:** <sub-questions, опционально>
**Связи:** <cross-references, опционально>
**Examples:** <конкретные сценарии, опционально>
```

**Cardinality tags:**
- `[XOR]` — ровно одна ветка срабатывает.
- `[OR]` — могут срабатывать одновременно.
- `[OPT]` — необязательная ветка.

**Status tags:**
- `RESOLVED` — решение принято.
- `OPEN` — нужно решение, blocker для следующей фазы.
- `OUT-OF-SCOPE` — явно выведено из scope.
- `DEFERRED` — отложено, не блокирует, следующая фаза может работать без.

**Terminal markers:**
- `END.` — ветка завершается этим конкретным действием.
- `→ see Fx.y.z` — развёрнут глубже.
- `→ see CC1` / `→ see P-NAME` — переход к cross-cutting / sub-policy.

**Resolution-first:** Resolution всегда первая строка после header — reviewer видит ответ сразу, спускается в детали только при интересе.

### Cross-cutting policies — orthogonal forks

```markdown
### CC1. <название>
**Pre-empts:** F1.3.*, F1.1
**Resolution:** ...
**Pattern:** *Если <событие> → отказ / требование / лог <действие>*
```

Reviewer не должен мысленно дублировать CC в каждую ветку — оно отдельным списком.

### Reusable sub-policies — DAG factoring

```markdown
### P-INSIST-HANDLING
[блок, описывающий поведение]
**Used in:** F1.3.2.2, F2.5.1, F4.2
```

Если sub-tree повторяется в разных ветках — выносится в named sub-policy. Дерево становится DAG.

---

## 7. Operational rules — что skill enforce'ит

1. **Happy path first.** Skill проводит happy path end-to-end до того, как разрешает branching. Reviewer всегда имеет cohesive narrative spine.

2. **Sample dialog cohesion check.** При написании sample dialogs агент проверяет, что каждый bot turn consistent с предыдущим user input. Если bot говорит / спрашивает то, что не следует из текущего state — это сигнал missing fork. Агент эксплицитно поднимает вопрос оператору и фиксирует fork в дереве, прежде чем продолжать диалог. Sample dialogs — integrative test для forks tree, вторая safety net после coverage-based closure.

3. **Depth budget — cap 3-4 уровней.** При превышении skill предлагает выделить sub-tree в named P-policy.

4. **Cross-cutting detection.** Если rule повторяется в ≥2 ветках основного дерева — suggest move в Cross-cutting section.

5. **Repeated sub-tree detection.** Если sub-tree логически идентичен другому — suggest factor в P-policy.

6. **Decision tables вместо 2^N веток.** Когда fork зависит от N независимых булевых флагов — skill предлагает таблицу с don't-care, не дерево.

7. **Out-of-scope inline.** Не отдельная секция. Если есть явные исключения, легко перепутаемые с in-scope — добавляется bullet inline в Цели или Контракте выхода.

---

## 8. Format rules

1. **Hierarchical IDs (Cockburn-style).** Forks нумеруются F1, F1.3, F1.3.2.1. Стабильны при реорганизации.
2. **ID присваивается ⇔ cell существует.** Никаких dangling IDs без cells. Никаких cells без IDs. Тривиальные терминальные branches описываются inline в parent'е без присвоения ID.
3. **Resolution-first** в каждом cell'е.
4. **Cardinality tag** обязателен на forks с branches.
5. **Status tag** обязателен на каждом fork.
6. **`Открыто`, `Связи`, `Examples`** — опциональные поля. Если пусты — строка не пишется.
7. **`END.`** на терминальных ветках для ясности reviewer'у.
8. **Без summary** в конце спеки. Оператор читает целиком.

---

## 9. References

- **Example product-spec.md** на реальном кейсе goal-setting в Zhenka: `examples/goal-setting-product-spec.md` (в этом проекте).
- **Source brief:** `agent-orchestration-system-draft.md` (в корне проекта) — стратегический handoff brief из сессии 2026-04-24, в котором поставлена задача семейства hi_flow.
- **Research outputs:** два research-цикла по probing frameworks и существующим скиллам — выводы интегрированы в этот дизайн.

---

## 10. Open items / future iterations

Парковано до iteration phase, после получения опыта работы с MVP скилла:

1. **Temporal step-by-step decomposition.** Cockburn-style extensions — пошаговый проход по happy path с probing «what else can happen here?» на каждом шаге. Surface forks между шагами user flow.
2. **Non-functional forks** как отдельная категория. Latency / privacy / observability / idempotency. Сейчас может быть пропущено.
3. **Out-of-scope как явный probe.** Сейчас inline; возможно стоит сделать explicit probe для surface'а.
4. **Граф развилок (Mermaid).** Опциональная секция product-spec.md с визуальным рендером forks tree. Когда дерево сложное — помогает review.
5. **Sibling skills** в семействе `hi_flow`: `product-spec`, `arch-spec`, `impl-plan`, `fitness`, `sanity-check`, `handoff`.

Проверка через 5-10 реальных запусков скилла на разных фичах (включая Zhenka и будущий ERP) — что работает, что ломается, что нужно дотягивать.

---

## 11. Implementation notes (для writing-plans)

При реализации SKILL.md (Claude Code skill format):

- Описание триггеров активации (раздел 2) — для frontmatter `description` поля.
- Каждая фаза процесса (3.1 / 3.2 / 3.3) — отдельная сегкция в SKILL.md с явными шагами.
- Probing taxonomy (раздел 5) — отдельная секция с подсекциями per category.
- Output format (раздел 6) — отдельная секция с template'ами.
- Operational + format rules (разделы 7, 8) — отдельные секции с явными правилами.
- Plain language principle — упомянуть как правило в operational rules.
- Coverage-based closure criterion и contradiction detection — формализованные процедуры в фазе probing.
- Self-assessment proposal (раздел 2) — шаблон с заполняемыми полями.
- Скилл в финале вызывается из триггера, генерирует proposal, проводит выбранный path, пишет файл, выходит.

Локация финального скилла (после реализации): `~/.claude/skills/hi_flow/feature-spec/SKILL.md` (или эквивалентная глобальная локация в зависимости от Claude Code skill structure conventions).
