---
name: feature-spec
description: Use when operator needs to create a product spec for a single feature ("продуктовая спека", "спека на фичу", "продуктовый дизайн фичи", "анализ нашей фичи", "давай продумаем фичу"). Conducts structured brainstorm with hierarchical fork discovery using 8-category probing taxonomy + HAZOP guidewords + premortem. Outputs product-spec.md with cell-based decision tree, cross-cutting policies, reusable sub-policies. Solo-founder oriented, plain product Russian by default.
---

# `as_flow:feature-spec` — Feature-Level Product Spec Skill

## What this skill does

Ведёт оператора от запроса фичи к подписанной product-spec.md, которая (1) даёт оператору фокус для deep review, (2) даёт следующей фазе (`as_flow:arch-spec`) однозначное основание для архитектурного дизайна.

Skill systematically выявляет иерархические продуктовые развилки (forks) — конкретные поведенческие решения, edge cases, hard policies, критерии разграничения похожих ситуаций — через структурированный диалог с оператором.

## Out of scope

- Product-level декомпозиция (отдельный skill `as_flow:product-spec`).
- Архитектурные / технические решения (`as_flow:arch-spec`, `as_flow:impl-plan`).
- Автоматический вызов следующей фазы — оператор инициирует.
- n8n-проекты — специфика инструмента, отдельный кейс.

## Output

Один файл product-spec.md в формате, описанном ниже. Расположение: `<project>/docs/specs/YYYY-MM-DD-<feature-slug>-product-spec.md` (настраиваемо).

## Activation

### Triggers (explicit, content-specific)

Skill активируется только на эти явные фразы:

- «продуктовая спека [для X]» / «product spec [for X]»
- «спека на фичу X» / «спека по фиче X»
- «продуктовый дизайн фичи X» / «product design of X»
- «анализ продукта X» / «анализ нашей фичи X» (когда X — наша фича, не конкурент)
- «давай продумаем фичу X» / «давай спроектируем фичу X»

### Anti-triggers (skill НЕ активируется автоматически)

- Bare feature-shape запрос («хочу добавить X», «нужна фича Y», «давай добавим tool Z») — это может быть research / chatter / архитектурный запрос. Уточняй или предлагай skill, но не запускай сам.
- «собери информацию про X» / «исследуй X» / «анализ конкурента» — это research, не product spec.
- «реализуй X» / «нужна архитектура для X» — это территория других скиллов семейства.

### Self-assessment proposal

После активации генерируй proposal по выбору пути:

1. **Skip** — у задачи нет продуктовой составляющей (опечатка, чистый refactor). Редкий случай.
2. **Direct path** — спека формируется без brainstorm-диалога. Только при выполнении **всех** условий: input оператора эксплицитный со списком forks; scope мелкий (≤ 3-4 forks); low-stakes домен; high similarity к существующему паттерну; изолированная фича.
3. **Brainstorm path** — полный диалог с probing taxonomy. **Default.**

**Асимметрия cost'ов обосновывает conservative default:** false negative (direct там, где нужен brainstorm) → пропущенные forks → архитектурный долг. Cost радикально выше потери времени на лишний brainstorm. В сомнении → brainstorm.

### Proposal format

```
[Self-assessment: as_flow:feature-spec]

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

**Все пути запускаются только после confirmation.** Skill ничего не делает молча — каждый переход даёт оператору момент согласия / override.

## Process flow

После confirmation в self-assessment → один из трёх путей.

### Skip path

Завершение без артефакта. Если оператор не согласен с skip — он не подтверждает, а override'ит на direct или brainstorm в self-assessment proposal. Skip case рассмотрен только когда оператор явно сказал «да, skip».

### Direct path

Читай input оператора, структурируй в product-spec.md по формату (см. ниже), покажи финальный draft, оператор апрувит или просит правки. Минимум диалога.

### Brainstorm path

Три под-фазы: operator-dump → agent probing → closure.

#### 3.3.1. Operator-dump

Начни с одного открытого вопроса:

> *«Расскажи, что у тебя уже есть про эту фичу — цели, поведение, развилки, ограничения. Дамп всё, что в голове.»*

Параллельно (если в проекте есть `ARCHITECTURE.md`) прочитай Module Map и Active Decisions — для понимания existing features (нужно для Cross-feature integration probe).

Дамп может быть пустым («хочу X, ничего пока не думал») — переходи к probing без него.

#### 3.3.2. Agent probing

Идёшь через **8 probe-категорий** (раздел Probing Taxonomy ниже) как floor checklist, плюс свободно добавляешь адаптивные probes по контексту.

Probing итеративный: вопрос → ответ оператора → запись в новый или существующий fork cell → следующий probe.

**Park-and-continue:** если оператор говорит «не знаю» / «позже» — записывай в `Открыто` и идёшь дальше. Никаких deadlock'ов.

**Cross-cutting probes (всегда активны):**
- *Make implicit criteria explicit* — при появлении vague-формулировок.
- *Contradiction detection* — после каждого нового fork-ответа сверяй с уже зафиксированными.

**Closing probe (mandatory at end):**
- *Premortem* — *«представь, фича запущена, через 3 месяца идут жалобы. Какие?»*

#### 3.3.3. Closure

После coverage-based closure criterion enumerate все open items:

- Forks без `Решение` — likely blocker для следующей фазы.
- Непустые `Открыто` поля — sub-questions, обычно не блокеры.
- Parked items.

Каждый item flag'ируй: **likely blocker / nice-to-have / уточнить**.

Оператор per item решает: **resolve сейчас / оставить для следующей фазы эскалации / out of scope**.

После — пиши финальный product-spec.md, покажи оператору, жди подтверждения. На «да» — сохраняй и выходи. На правки — вноси и переспрашивай.

### Coverage-based closure criterion

Переходи к Closure только при выполнении всех:

- Все Mandatory категории дали forks или явное N/A.
- Все Conditional с выполненными preconditions дали forks или явное N/A.
- Premortem closing завершён.
- Contradiction detection не имеет открытых конфликтов.

До этого — probing продолжается.

### Контракт с следующей фазой

При обнаружении ambiguity, которую не можешь решить — эскалируй оператору. Не перезапускай предыдущую фазу (если она была — например, product-level skill).

## Probing Taxonomy

Floor checklist для агента в Brainstorm path: **8 probe-категорий + 1 cross-cutting probe + 1 cross-cutting check + 1 closing probe + 1 closure criterion**.

### Универсальное правило

Проходи через все категории, но **не обязан** генерировать forks в каждой. Пустая категория — нормальный результат, если у фичи действительно нет соответствующих решений. **Не заполняй искусственно** — это путь к галлюцинациям.

Каждая категория имеет explicit Procedure (input → algorithm → output). Адаптивные probes допустимы как **дополнение** к процедуре, не замена.

### 1. Input space [Mandatory]

**Procedure:**
- Спроси: «какие поля есть у фичи?»
- Per поле: «откуда берётся (user input / context / system)? обязательно? есть default?»
- Iteratively, пока не появляются новые поля.
- Для user-input полей: «какие формы пользовательского ввода (raw forms — числа, даты, неточные ссылки, дельты, проценты)?»

**Output:** список полей с метаданными.

### 2. Boundary [Mandatory]

**Procedure:** для каждого поля прогонь **HAZOP guidewords**:
- *No* — поле не дано
- *More* — значение больше ожидаемого
- *Less* — значение меньше
- *As Well As* — есть и что-то ещё
- *Part Of* — частичное значение
- *Reverse* — противоположный смысл
- *Other Than* — неожиданная форма

Каждый guideword → 1 probe «как бот реагирует на это?». Нерелевантные пропускай явно.

**Output:** forks для нетривиальных реакций.

### 3. Invalid combinations [Conditional: ≥2 взаимодействующих поля]

**Procedure:**
- Identify все пары / тройки / N-tuples полей с логическим взаимодействием (один параметр зависит / противоречит / усиливает / ослабляет другой).
- Per группа: «есть ли запрещённая или проблематичная комбинация? Какое правило?»
- Запись: обычный fork **или** decision table (если ≥3 независимых булевых условия с don't-care).

**Output:** combination forks / decision tables.

### 4. User reactions [Conditional: фича имеет user-visible output]

**Procedure:** per user-visible output walk через **5 стандартных user reactions**:
- *Accept* — пользователь согласен
- *Reject* — отказ
- *Partial-accept* — соглашается с частью
- *Abandon* — не отвечает
- *Change* — возвращается изменить

Каждая → probe «как бот реагирует?».

**Output:** forks per (output, reaction).

### 5. Hard policies [Optional]

**Procedure:** срабатывает если домен имеет ethical / safety / medical / legal риск.

- Walk через Boundary findings — per экстремум: «триггерит ли concern?»
- Если домен высоко-stakes — walk через стандартные sensitive areas (privacy, finance, age, vulnerability, harm).
- Каждая policy формулируется паттерном: *«Если <условие>, то отказ / требование / лог <действие>»*.

**Важно:** **не фабрикуй** policy для нейтральных фич. Если риска нет — категория пропускается без записи.

**Output:** policy-forks. Уходят в раздел Cross-cutting policies, не в основное дерево.

### 6. Disambiguation [Optional]

**Procedure:** срабатывает при наличии ≥2 похожих внешне ситуаций.

- Попарный обход всех forks: «выглядят похоже извне (для пользователя), но требуют разной реакции?»
- Highlight near-misses оператору.
- Critery — обычно examples + checklist, не формула.

**Важно:** **не изобретай** псевдо-disambiguation для заполнения категории. Если нет реальных near-misses — категория пропускается.

**Output:** disambiguation forks с критериями + examples.

### 7. Lifecycle [Conditional: фича имеет state, сохраняющийся после первичного действия]

**Procedure:** per state-change из Контракта выхода — **5 lifecycle вопросов**:

- *Expire* — когда state перестаёт быть актуален?
- *Change* — пользователь хочет изменить?
- *Abandon* — пользователь забил, что бот делает?
- *Repeat* — повторное действие через время?
- *Override* — что если пришёл новый input, перекрывающий старый?

**Output:** lifecycle forks.

### 8. Cross-feature integration [Conditional: в проекте есть существующие фичи]

**Procedure:**
- Прочитай Module Map из `ARCHITECTURE.md` (если есть).
- Per module/feature: «наша фича взаимодействует? Как — read / write / trigger / depend on?»

**Output:** integration forks.

### Cross-cutting probe — Make implicit criteria explicit [Always active]

При появлении любой vague-формулировки определи flavor:

- **Скрытое число** (быстро / часто / много / низкий темп) → quantify в значение.
- **Скрытый критерий** (опасный / настойчивый / нереалистичный) → operationalize в правило / checklist.
- **Genuinely fuzzy** (похоже / естественно / уместно) → accept fuzziness, дать LLM якорные примеры.

### Cross-cutting check — Contradiction detection [Always active]

После каждого нового fork-ответа сверяй с уже зафиксированными. При противоречии — flag оператору эксплицитно:

> *«В F1.3 ты сказал X, в текущем F2.4 — предполагается Y. Конфликт. Какое решение верно / нужно ли пересмотр?»*

### Closing probe — Premortem [Mandatory at end]

После прохождения 8 категорий + cross-cutting checks:

> *«Представь, что фича запущена и через 3 месяца идут жалобы пользователей. Какие жалобы?»*

Каждая воображаемая жалоба → потенциальный новый fork.
