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
