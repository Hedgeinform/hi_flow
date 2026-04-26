# `as_flow:feature-spec` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать Claude Code skill `as_flow:feature-spec`, который ведёт оператора от запроса фичи к подписанной `product-spec.md` через self-assessment + brainstorm с probing taxonomy.

**Architecture:** Skill — это markdown-файл с frontmatter и инструкциями для LLM. Имплементация = написание SKILL.md по разделам design doc'а + supporting reference files (template, example) + scenario-based validation. Никакого runtime-кода — только инструкции, которым следует агент.

**Tech Stack:** Claude Code skills format (markdown + YAML frontmatter), Claude Code plugin structure.

**Spec:** `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design.md`
**Reference example:** `examples/goal-setting-product-spec.md`

---

## Methodology Notes (важно перед стартом)

Поскольку SKILL.md — это инструкции для LLM, классическое TDD неприменимо. Замены:

- **Structural tests** — file structure / frontmatter validity / required sections present. Скриптуемо.
- **Behavioral tests** — запуск скилла на тестовом сценарии через subagent dispatch (агент с симулированной Claude Code средой выполняет инструкции скилла). Output сверяется с expected example.

Worktree не используем — это документационная работа, не код. Ветку можно создать обычным git checkout.

---

## File Structure

```
as_flow/
├── README.md                              # plugin overview, install instructions
├── plugin.json                            # plugin manifest (если требуется Claude Code)
└── skills/
    └── feature-spec/
        ├── SKILL.md                       # main skill instructions
        └── references/
            ├── product-spec-template.md   # template для генерации output
            ├── self-assessment-template.md # template для proposal
            └── example-goal-setting.md    # копия из examples/, для агента как reference
```

**Locations:**
- Project workspace: `C:\Users\Vegr\Projects\Owners\agent_orchesration_skills\as_flow\` (during development)
- Production install location: `~/.claude/plugins/<name>/as_flow/` или эквивалент (post-implementation, не в плане)

---

## Tasks

### Task 1: Plugin scaffolding

**Files:**
- Create: `as_flow/README.md`
- Create: `as_flow/plugin.json` (если требуется)
- Create: `as_flow/skills/feature-spec/` (директория)
- Create: `as_flow/skills/feature-spec/references/` (директория)

- [ ] **Step 1: Create directory structure**

```bash
cd "C:\Users\Vegr\Projects\Owners\agent_orchesration_skills"
mkdir -p as_flow/skills/feature-spec/references
```

- [ ] **Step 2: Verify Claude Code skill plugin format**

Reference: посмотреть структуру существующего плагина superpowers как образец:

```bash
ls -la "C:\Users\Vegr\.claude\plugins\cache\superpowers-marketplace\superpowers\5.0.7\"
```

Identify какие manifest-файлы нужны (plugin.json, manifest.json, или ничего — только skills/<name>/SKILL.md). Документировать в README что именно использует as_flow.

- [ ] **Step 3: Write plugin README**

Create `as_flow/README.md`:

```markdown
# as_flow — методология Three-Phase Flow для solo+AI разработки

Семейство Claude Code skill'ов, реализующих структурированную методологию разработки product → architecture → implementation для solo founder с AI-агентом.

## Skills в семействе

- **`as_flow:feature-spec`** — продуктовая спека одной фичи (Phase 1, feature-level). См. `skills/feature-spec/SKILL.md`.

## Future skills (parked)

- `as_flow:product-spec` — декомпозиция крупного продукта (Phase 1, product-level)
- `as_flow:arch-spec` — архитектурная спека фичи (Phase 2)
- `as_flow:impl-plan` — план реализации (Phase 3)
- `as_flow:fitness` — architectural fitness functions
- `as_flow:sanity-check` — пересмотр архитектурной целостности по запросу
- `as_flow:handoff` — session handoff discipline

## Install

[TBD после implementation, документировать как ставить локально / глобально]

## Background

Дизайн-спеки: `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design.md` (в проекте agent_orchesration_skills).
```

- [ ] **Step 4: Verify structure**

```bash
ls -R as_flow/
```

Expected output: видны директории skills/feature-spec/references/ и файлы README.md.

- [ ] **Step 5: Commit**

```bash
git add as_flow/README.md as_flow/skills/
git commit -m "feat(as_flow): plugin scaffolding for feature-spec skill"
```

---

### Task 2: SKILL.md frontmatter

**Files:**
- Create: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Write frontmatter**

Create `as_flow/skills/feature-spec/SKILL.md` with YAML frontmatter:

```markdown
---
name: feature-spec
description: Use when operator needs to create a product spec for a single feature ("продуктовая спека", "спека на фичу", "продуктовый дизайн фичи", "анализ нашей фичи", "давай продумаем фичу"). Conducts structured brainstorm with hierarchical fork discovery using 8-category probing taxonomy + HAZOP guidewords + premortem. Outputs product-spec.md with cell-based decision tree, cross-cutting policies, reusable sub-policies. Solo-founder oriented, plain product Russian by default.
---

# `as_flow:feature-spec` — Feature-Level Product Spec Skill

[Тело скилла — заполняется в последующих задачах]
```

- [ ] **Step 2: Verify frontmatter parses**

```bash
head -10 as_flow/skills/feature-spec/SKILL.md
```

Expected: видны три строки `---` ограничивающие frontmatter, поля name и description.

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): SKILL.md frontmatter with triggers"
```

---

### Task 3: Skill body — overview, scope, activation, self-assessment

**Files:**
- Modify: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Add overview and scope sections**

Append to `SKILL.md` (after frontmatter):

```markdown
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
```

- [ ] **Step 2: Add activation section**

Append to `SKILL.md`:

```markdown
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
```

- [ ] **Step 3: Verify content matches design**

Read both files side by side:

```bash
cat as_flow/skills/feature-spec/SKILL.md
```

Cross-reference с `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design.md` разделы 1, 2.

Confirm: out-of-scope items match, triggers list matches, self-assessment factors match, proposal format identical.

- [ ] **Step 4: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): activation, self-assessment, scope sections"
```

---

### Task 4: Skill body — process flow (skip / direct / brainstorm paths)

**Files:**
- Modify: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Add process flow section**

Append to `SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Cross-check against design section 3**

Verify содержание соответствует дизайну: три пути, шаги brainstorm path, park-and-continue, coverage criterion, escalation rule.

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): process flow with three paths"
```

---

### Task 5: Skill body — probing taxonomy (categories 1-4)

**Files:**
- Modify: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Add probing taxonomy intro and categories 1-4**

Append to `SKILL.md`:

```markdown
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

[continued in next section]
```

- [ ] **Step 2: Verify content matches design section 5 (categories 1-4)**

Cross-reference с design doc.

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): probing taxonomy categories 1-4"
```

---

### Task 6: Skill body — probing taxonomy (categories 5-8)

**Files:**
- Modify: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Add categories 5-8**

Append to `SKILL.md` (continuing probing taxonomy section):

```markdown
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
```

- [ ] **Step 2: Verify content matches design section 5 (categories 5-8)**

Cross-reference с design doc.

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): probing taxonomy categories 5-8"
```

---

### Task 7: Skill body — cross-cutting probes and closing probe

**Files:**
- Modify: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Add cross-cutting probes and Premortem**

Append to `SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Verify cross-cutting + closing match design**

Cross-reference с design doc раздел 5.

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): cross-cutting probes and premortem"
```

---

### Task 8: Skill body — output format (product-spec.md structure)

**Files:**
- Modify: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Add output format section**

Append to `SKILL.md`:

```markdown
## Output Format — product-spec.md

### File location

`<project>/docs/specs/YYYY-MM-DD-<feature-slug>-product-spec.md` (default; настраиваемо).

### PRD-as-standalone principle

Спека самодостаточна для product context. Следующая фаза (arch-spec) читает её для понимания продукта, ARCHITECTURE.md для архитектурного контекста — без overlap.

### Plain language principle

Product-spec.md адресован оператору-продуктологу, не разработчику. Default — продуктовый русский язык. Английский жаргон допустим если он:

- (а) объективно упрощает восприятие (короче и точнее русского эквивалента), или
- (б) широко известен в профессиональной среде (MVP, KPI, UX, ИМТ, BMI, ROI, и т.п.).

Жаргон, понятный только инженеру (extract-all, payload, throughput, idempotency, fallback и т.п.) — переводи или раскрывай на продуктовом языке.

### Top-level structure

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

## Premortem findings
[absorbed concerns]

## Open items at closure
[skill-generated table]
```

### Sample dialogs

3 концетных user path'а в формате диалога:

- **Happy path** — всё прошло гладко.
- **Corrected path** — потребовалась корректировка, всё закрылось.
- **Refused path** — бот отказал. Если refuse-сценарий не применим — заменяется на **Edge path**.

Якорь для оператора и для следующей фазы.

### Cell format

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
- `[XOR]` — ровно одна ветка срабатывает
- `[OR]` — могут срабатывать одновременно
- `[OPT]` — необязательная ветка

**Status tags:**
- `RESOLVED` — решение принято
- `OPEN` — нужно решение, blocker для следующей фазы
- `OUT-OF-SCOPE` — явно выведено из scope
- `DEFERRED` — отложено, не блокирует

**Terminal markers:**
- `END.` — ветка завершается этим действием
- `→ see Fx.y.z` — развёрнут глубже
- `→ see CC1` / `→ see P-NAME` — переход к cross-cutting / sub-policy

**Resolution-first:** Resolution всегда первая строка после header.

### Cross-cutting policies — orthogonal forks

```markdown
### CC1. <название>
**Pre-empts:** F1.3.*, F1.1
**Resolution:** ...
**Pattern:** *Если <событие> → отказ / требование / лог <действие>*
```

### Reusable sub-policies — DAG factoring

```markdown
### P-INSIST-HANDLING
[блок, описывающий поведение]
**Used in:** F1.3.2.2, F2.5.1, F4.2
```
```

- [ ] **Step 2: Verify content matches design section 6**

Cross-reference с design doc.

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): output format and product-spec.md structure"
```

---

### Task 9: Skill body — operational and format rules

**Files:**
- Modify: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Add operational rules section**

Append to `SKILL.md`:

```markdown
## Operational Rules — что skill enforce'ит

1. **Happy path first.** Проводи happy path end-to-end до того, как разрешишь branching. Reviewer всегда имеет cohesive narrative spine.

2. **Sample dialog cohesion check.** При написании sample dialogs проверяй, что каждый bot turn consistent с предыдущим user input. Если bot говорит / спрашивает то, что не следует из текущего state — это сигнал missing fork. Эксплицитно подними вопрос оператору и зафиксируй fork в дереве, прежде чем продолжать диалог. Sample dialogs — integrative test для forks tree, вторая safety net после coverage-based closure.

3. **Depth budget — cap 3-4 уровней.** При превышении предложи выделить sub-tree в named P-policy.

4. **Cross-cutting detection.** Если rule повторяется в ≥2 ветках основного дерева — suggest move в Cross-cutting section.

5. **Repeated sub-tree detection.** Если sub-tree логически идентичен другому — suggest factor в P-policy.

6. **Decision tables вместо 2^N веток.** Когда fork зависит от N независимых булевых флагов — предложи таблицу с don't-care.

7. **Out-of-scope inline.** Не отдельная секция. Если есть явные исключения, описывай inline в Цели или Контракте выхода.

## Format Rules

1. **Hierarchical IDs (Cockburn-style).** Forks нумеруются F1, F1.3, F1.3.2.1.
2. **ID присваивается ⇔ cell существует.** Тривиальные терминальные branches описываются inline в parent'е без присвоения ID.
3. **Resolution-first** в каждом cell'е.
4. **Cardinality tag** обязателен на forks с branches.
5. **Status tag** обязателен на каждом fork.
6. **`Открыто`, `Связи`, `Examples`** — опциональные. Если пусты, строка не пишется.
7. **`END.`** на терминальных ветках.
8. **Без summary** в конце спеки. Оператор читает целиком.
```

- [ ] **Step 2: Verify content matches design sections 7, 8**

Cross-reference с design doc.

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): operational and format rules"
```

---

### Task 10: Skill body — references and example pointer

**Files:**
- Modify: `as_flow/skills/feature-spec/SKILL.md`

- [ ] **Step 1: Add references section**

Append to `SKILL.md`:

```markdown
## References

- **Reference example** of completed product-spec.md: `references/example-goal-setting.md`. Read this when generating own product-spec.md to anchor format and style.
- **Product-spec template** with placeholders: `references/product-spec-template.md`. Use as starting structure when writing.
- **Self-assessment proposal template:** `references/self-assessment-template.md`.

## Implementation Notes

- При запуске skill, сначала читай эти reference files для якорения output format.
- Self-assessment proposal — generate using self-assessment-template.md format.
- При генерации product-spec.md — использовать product-spec-template.md как скелет, заполнять по результатам brainstorm'а.
```

- [ ] **Step 2: Final read of complete SKILL.md**

```bash
cat as_flow/skills/feature-spec/SKILL.md | wc -l
cat as_flow/skills/feature-spec/SKILL.md | head -50
```

Verify общая структура: frontmatter, все секции на месте.

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/SKILL.md
git commit -m "feat(as_flow:feature-spec): references and implementation notes"
```

---

### Task 11: Reference template — product-spec.md skeleton

**Files:**
- Create: `as_flow/skills/feature-spec/references/product-spec-template.md`

- [ ] **Step 1: Create template file**

Create `as_flow/skills/feature-spec/references/product-spec-template.md`:

```markdown
# <Feature name>

## Sample dialogs

### Happy path: <короткий лейбл>

```
User:  <первое сообщение пользователя>
Bot:   <ответ бота>
User:  <следующий turn>
Bot:   <финальное подтверждение>
```

### Corrected path: <лейбл>

```
<dialog>
```

### Refused / Edge path: <лейбл>

```
<dialog>
```

---

## Цель

<1-3 предложения: какую задачу пользователя закрываем, какую боль/нужду адресуем>

**Out of scope (если применимо):**
- <явные исключения>

---

## Контракт входа

### От пользователя (raw)

- **field_name** — обязательно/опционально. Формы:
  - <форма 1>
  - <форма 2>

### Из контекста

- **field_name** — тип, источник, обязательность, default

---

## Контракт выхода

- **Запись в БД:** <таблицы / поля / status enum>
- **Возврат пользователю:** <текстовый формат / структура>
- **Side effects:** <шедулинг / нотификации / лог>

---

## Развилки

### F1. <название> [decision: <что решаем>] [status: <STATUS>]

**Resolution:** <ответ + reasoning>

**Branches [XOR | OR | OPT]:**
- F1.1 — <label> → <action OR see F1.1>
- F1.2 — <label> → <action OR see F1.2>

**Открыто:** <если есть>
**Связи:** <если есть>
**Examples:** <конкретные сценарии>

---

## Cross-cutting policies

### CC1. <название> [orthogonal] [status: <STATUS>]

**Pre-empts:** <forks которые перебиваются>
**Resolution:** <что бот делает>
**Pattern:** *Если <условие>, то <действие>*

---

## Reusable sub-policies

### P-<NAME>

<блок, описывающий поведение>

**Used in:** <forks где применяется>

---

## Premortem findings

«Через 3 месяца после запуска — какие жалобы пользователей?»

1. **<жалоба>** — <как закрыто или где зафиксировано>
2. ...

---

## Open items at closure

| ID                | Severity для следующей фазы | Note                      |
|-------------------|------------------------------|---------------------------|
| <fork-id>         | <вероятный блокер / желательно> | <описание>             |
```

- [ ] **Step 2: Verify template structure**

```bash
cat as_flow/skills/feature-spec/references/product-spec-template.md | head -50
```

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/references/product-spec-template.md
git commit -m "feat(as_flow:feature-spec): product-spec.md template"
```

---

### Task 12: Reference template — self-assessment proposal

**Files:**
- Create: `as_flow/skills/feature-spec/references/self-assessment-template.md`

- [ ] **Step 1: Create template file**

Create `as_flow/skills/feature-spec/references/self-assessment-template.md`:

```markdown
# Self-Assessment Proposal Template

При активации скилл генерирует proposal в этом формате (заполняй <placeholders> по контексту):

```
[Self-assessment: as_flow:feature-spec]

Предлагаю: <brainstorm | direct | skip>
Причина: <одно-два предложения, почему именно этот путь>

Факторы:
- Input completeness: <high | medium | low>
- Scope: <small | medium | large>
- Stakes: <low | high>
- Similarity: <new | template available>
- Cross-feature touches: <isolated | many>

Подтверди / измени.
```

## Heuristics для определения каждого фактора

**Input completeness:**
- *high* — оператор уже дал список forks с альтернативами или решениями.
- *medium* — оператор описал общую идею + несколько specifics.
- *low* — однострочник или vague description.

**Scope:**
- *small* — ожидаемо ≤ 3-4 forks; одна tool / простая фича.
- *medium* — 5-10 forks; стандартная фича.
- *large* — 10+ forks; крупная фича с многими аспектами.

**Stakes:**
- *low* — нейтральный домен (UI, settings, list/fetch).
- *high* — медицина / финансы / privacy / safety / age / vulnerability.

**Similarity:**
- *new* — первая в своём роде.
- *template available* — есть похожая существующая фича в проекте.

**Cross-feature touches:**
- *isolated* — фича не взаимодействует с существующими.
- *many* — фича читает/пишет/триггерит несколько существующих модулей.

## Когда какой path рекомендовать

**Skip:**
- Чистый refactor / cosmetic change / fix опечатки. Нет продуктовой составляющей.

**Direct:**
- Все условия одновременно: input=high, scope=small, stakes=low, similarity=template available, cross-feature=isolated.

**Brainstorm (default):**
- Любой случай, не подходящий под Direct.
- В сомнении — brainstorm.
```

- [ ] **Step 2: Verify content**

```bash
cat as_flow/skills/feature-spec/references/self-assessment-template.md
```

- [ ] **Step 3: Commit**

```bash
git add as_flow/skills/feature-spec/references/self-assessment-template.md
git commit -m "feat(as_flow:feature-spec): self-assessment template"
```

---

### Task 13: Reference example — copy goal-setting product-spec

**Files:**
- Create: `as_flow/skills/feature-spec/references/example-goal-setting.md`

- [ ] **Step 1: Copy example file**

```bash
cp examples/goal-setting-product-spec.md as_flow/skills/feature-spec/references/example-goal-setting.md
```

- [ ] **Step 2: Add header note for context**

Edit beginning of `as_flow/skills/feature-spec/references/example-goal-setting.md` to add a note before the existing content:

```markdown
> **Reference example for `as_flow:feature-spec` skill.** Это полный пример product-spec.md, сгенерированный по дизайну скилла на реальном кейсе goal-setting в Zhenka (фитнес-бот). Используй как образец формата, плотности, баланса деталей при генерации собственных product-spec.md.
>
> **Что хорошо демонстрирует пример:**
> - Все 8 probe-категорий (где применимы), включая Optional которые не выдуманы.
> - Hierarchical IDs F0 → F1 → F1.1, F1.2, F1.3 → F1.3.1, F1.3.2 → F1.3.2.1, F1.3.2.2, F1.3.2.3.
> - Decision table в F1 (4 комбинации входов).
> - Cross-cutting policies (CC1, CC2, CC3).
> - Reusable sub-policies (P-NORMALIZATION-DEADLINE/WEIGHT, P-REALISM-CHECK, P-REMINDER-SCHEDULE, P-INSIST-HANDLING).
> - Все статусы (RESOLVED, OPEN, OUT-OF-SCOPE, DEFERRED).
> - Plain language — нет инженерного жаргона.
> - Inline vs cell branches (F1 trivial branch без ID, остальные cells).
> - Premortem findings absorbed.
> - Open items at closure table.

---

[остальной контент существующего файла]
```

- [ ] **Step 3: Verify file size and structure**

```bash
wc -l as_flow/skills/feature-spec/references/example-goal-setting.md
head -30 as_flow/skills/feature-spec/references/example-goal-setting.md
```

- [ ] **Step 4: Commit**

```bash
git add as_flow/skills/feature-spec/references/example-goal-setting.md
git commit -m "feat(as_flow:feature-spec): goal-setting reference example"
```

---

### Task 14: Structural validation

**Files:**
- Test: ad-hoc bash commands

- [ ] **Step 1: Verify SKILL.md structure**

```bash
cd as_flow/skills/feature-spec
head -10 SKILL.md
```

Expected: первые 10 строк включают frontmatter (`---`, `name:`, `description:`, `---`).

- [ ] **Step 2: Verify all expected sections present**

```bash
grep -E "^## " SKILL.md
```

Expected sections (порядок может отличаться):
- `## What this skill does`
- `## Out of scope`
- `## Output`
- `## Activation`
- `## Process flow`
- `## Probing Taxonomy`
- `## Output Format — product-spec.md`
- `## Operational Rules`
- `## Format Rules`
- `## References`
- `## Implementation Notes`

- [ ] **Step 3: Verify reference files exist**

```bash
ls -la references/
```

Expected: 3 files — `product-spec-template.md`, `self-assessment-template.md`, `example-goal-setting.md`.

- [ ] **Step 4: Verify SKILL.md size reasonable**

```bash
wc -l SKILL.md
wc -c SKILL.md
```

Expected: ≤ 800 lines, ≤ 30K chars (skills should not be excessively long).

- [ ] **Step 5: Verify cross-references in SKILL.md point to existing files**

```bash
grep -E "references/" SKILL.md
```

Each mentioned reference should exist:

```bash
ls references/product-spec-template.md
ls references/self-assessment-template.md
ls references/example-goal-setting.md
```

All three should return without errors.

- [ ] **Step 6: Commit if any fixes needed**

If structural issues found — fix and commit:

```bash
git add as_flow/skills/feature-spec/
git commit -m "fix(as_flow:feature-spec): structural validation fixes"
```

If no issues — skip commit.

---

### Task 15: Behavioral test — goal-setting scenario via subagent

**Files:**
- Test: subagent dispatch

- [ ] **Step 1: Dispatch subagent to simulate skill execution**

Dispatch a fresh subagent with the SKILL.md content + example reference + simulated user input. The subagent should follow skill instructions and produce a product-spec.md.

Subagent prompt (skeleton):

```
You are simulating execution of the as_flow:feature-spec Claude Code skill.

Read the skill instructions from: as_flow/skills/feature-spec/SKILL.md
Read reference files: as_flow/skills/feature-spec/references/

Simulated user input: "давай продумаем фичу постановки начальной цели для пользователя в Zhenka (фитнес-бот)"

Simulated user follow-up to operator-dump prompt: [provide the same domain content from the operator's original brainstorm — F1 to F4 forks as we discussed in the brainstorm session]

Execute the skill end-to-end:
1. Generate self-assessment proposal.
2. Receive simulated confirmation "brainstorm".
3. Run operator-dump phase, receive simulated dump.
4. Run probing through 8 categories.
5. Run cross-cutting checks.
6. Run premortem.
7. Apply coverage-based closure.
8. Generate final product-spec.md.

Save output to: as_flow/skills/feature-spec/test-output/scenario-goal-setting.md
Document any deviations from skill instructions encountered.
```

- [ ] **Step 2: Compare output to reference example**

```bash
diff -u as_flow/skills/feature-spec/references/example-goal-setting.md \
       as_flow/skills/feature-spec/test-output/scenario-goal-setting.md > test-output/diff-goal-setting.md
```

Review the diff. Differences are expected (LLM variation), but **structure** must match:
- Same major sections (Sample dialogs, Цель, Контракты, Развилки, Cross-cutting, Sub-policies, Premortem, Open items)
- Same hierarchical numbering scheme
- Status tags present on every fork
- Cardinality tags present on forks with branches
- No inventions (no hallucinated forks not derived from input)

- [ ] **Step 3: Document deviations**

Create `as_flow/skills/feature-spec/test-output/scenario-goal-setting-review.md`:

```markdown
# Scenario Test: Goal Setting

**Date:** 2026-04-26
**Reference:** references/example-goal-setting.md
**Output:** test-output/scenario-goal-setting.md

## Structure conformance
- [ ] Sample dialogs section present, 3 paths
- [ ] Контракт входа split into «От пользователя» и «Из контекста»
- [ ] Forks use hierarchical IDs
- [ ] All forks have status tags
- [ ] Cross-cutting policies separated
- [ ] Reusable sub-policies separated
- [ ] Plain language (no engineering jargon)

## Deviations
[list]

## Required fixes to SKILL.md
[list]
```

- [ ] **Step 4: Apply fixes if needed**

If deviations found:
- Update SKILL.md with clarifications.
- Re-run test.
- Iterate until output structure matches reference.

- [ ] **Step 5: Commit**

```bash
git add as_flow/skills/feature-spec/test-output/ as_flow/skills/feature-spec/SKILL.md
git commit -m "test(as_flow:feature-spec): goal-setting scenario validation"
```

---

### Task 16: Behavioral test — simpler scenario (small tool)

**Files:**
- Test: subagent dispatch

- [ ] **Step 1: Define simple scenario**

Use a smaller Zhenka tool as test. Example: «daily reminder tool — пользователь настраивает время, бот напоминает залогировать приём пищи».

Operator input (simulated): «давай спека на daily reminder tool. Пользователь говорит "напомни в 19:00 каждый день поесть", бот шедулит. Можно отменить, можно изменить время. По умолчанию мотивационный текст, можно переключить на нейтральный.»

- [ ] **Step 2: Dispatch subagent**

Same dispatch pattern as Task 15, but with smaller scope input.

Verify: skill should produce a smaller product-spec.md with fewer forks (maybe 5-7 vs 15+ in goal setting). No cross-cutting policies (no medical/safety/legal stakes). No or minimal Lifecycle (small state).

- [ ] **Step 3: Verify expected behavior**

- Self-assessment correctly classifies as small scope, low stakes.
- Probing skips Hard policies and possibly Disambiguation.
- Output has fewer cells, no CC section.

If skill incorrectly fabricates forks in Optional categories — это критический сигнал, fix in SKILL.md.

- [ ] **Step 4: Document and commit**

```bash
git add as_flow/skills/feature-spec/test-output/ as_flow/skills/feature-spec/SKILL.md
git commit -m "test(as_flow:feature-spec): daily-reminder scenario validation"
```

---

### Task 17: Behavioral test — skip path

**Files:**
- Test: subagent dispatch

- [ ] **Step 1: Define skip-path scenario**

Operator input: «продуктовая спека для исправления опечатки в reply_casually» — это не product decision, это cosmetic fix.

- [ ] **Step 2: Dispatch subagent**

Skill should:
- Activate (на trigger «продуктовая спека»).
- Self-assessment proposes **Skip** with reasoning «нет продуктовой составляющей».
- Wait for confirmation.
- On «да, skip» — exit cleanly without artifact.

- [ ] **Step 3: Verify behavior**

- Skill не пытается строить product-spec.md.
- Proposal explicitly suggests skip.

- [ ] **Step 4: Commit**

```bash
git add as_flow/skills/feature-spec/test-output/ as_flow/skills/feature-spec/SKILL.md
git commit -m "test(as_flow:feature-spec): skip-path scenario validation"
```

---

### Task 18: Documentation finalization and report

**Files:**
- Modify: `as_flow/README.md`
- Create: `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design-report.md`

- [ ] **Step 1: Update plugin README with usage instructions**

Edit `as_flow/README.md`:

```markdown
# as_flow — методология Three-Phase Flow для solo+AI разработки

[обновлённое содержание с install/usage instructions, basis на тестах, статусе скиллов]

## Skills в семействе

### as_flow:feature-spec — продуктовая спека одной фичи [READY]

Активация: «продуктовая спека [для X]», «спека на фичу X», «давай продумаем фичу X», и др. (полный список см. в SKILL.md).

Запуск: оператор пишет trigger phrase. Skill генерирует self-assessment proposal, далее по утверждённому пути.

Output: `<project>/docs/specs/YYYY-MM-DD-<feature-slug>-product-spec.md`.

### Other skills [PARKED]

- `as_flow:product-spec` — декомпозиция крупного продукта (Phase 1, product-level).
- `as_flow:arch-spec` — архитектурная спека фичи (Phase 2).
- `as_flow:impl-plan` — план реализации (Phase 3).
- `as_flow:fitness` — architectural fitness functions.
- `as_flow:sanity-check`, `as_flow:handoff`.

## Install

[Документировать после первого распространения]

## Background

- Design spec: `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design.md`
- Reference example: `as_flow/skills/feature-spec/references/example-goal-setting.md`
- Implementation report: `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design-report.md`
```

- [ ] **Step 2: Create implementation report**

Create `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design-report.md`:

```markdown
# Implementation Report: as_flow:feature-spec

**Spec:** `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design.md`
**Date:** 2026-04-26
**Status:** completed

## What was done

- Plugin scaffolding: `as_flow/` with `skills/feature-spec/`, README.
- SKILL.md with full content per design (frontmatter + 11 sections).
- Reference files: product-spec-template, self-assessment-template, example-goal-setting (copied from examples/).
- Behavioral validation: 3 scenarios tested via subagent dispatch (goal-setting, daily-reminder, skip-path).

## Deviations from spec

[Document any deviations encountered during implementation. If none — write "None".]

## Issues discovered

[Document issues with the design spec found during implementation. If none — write "None".]

## Open items

[Document any incomplete aspects. Should be "None" since plan completed.]
```

- [ ] **Step 3: Final commit**

```bash
git add as_flow/README.md docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design-report.md
git commit -m "docs(as_flow:feature-spec): finalize README and implementation report"
```

---

## Self-Review Checklist (run после написания плана)

- [x] Все секции design doc'а (1-11) покрыты задачами:
  - Section 1 (Назначение и scope) → Task 3
  - Section 2 (Активация и self-assessment) → Tasks 2, 3
  - Section 3 (Процесс работы) → Task 4
  - Section 4 (Иерархия в семействе) → Task 1 (README)
  - Section 5 (Probing taxonomy) → Tasks 5, 6, 7
  - Section 6 (Формат product-spec.md) → Task 8
  - Section 7 (Operational rules) → Task 9
  - Section 8 (Format rules) → Task 9
  - Section 9 (References) → Task 10
  - Section 10 (Open items / future iterations) → не имплементируется (parked)
  - Section 11 (Implementation notes) → Tasks 1-13 (распределено по сборке)

- [x] Нет placeholders (TBD/TODO без конкретики).

- [x] Нет неопределённых типов / методов — каждая ссылка на файл / команду конкретна.

- [x] Каждый Task имеет concrete files, steps с командами, expected outputs, commit step.

---

## Notes for executor

- **Worktree** — не используется для этого плана (документационная работа, не код). Если оператор хочет git branch — создаётся обычным `git checkout -b`.
- **TDD неприменимо** — заменено на structural validation (Task 14) + behavioral validation через subagent dispatch (Tasks 15-17).
- **Plan execution** — рекомендуется subagent-driven mode (с review между задачами). Каждая задача оставляет коммит, оператор может остановиться в любой момент.
- **Implementation report** обязателен (Task 18) — это правило из глобального CLAUDE.md.

---

## Risks / Open assumptions

1. **Claude Code skill plugin format** — точные требования к manifest и структуре могут отличаться. Task 1 step 2 предполагает посмотреть существующий skillspack как образец. Если требования жёстче ожидаемых — adjust scaffolding.

2. **Subagent simulation fidelity** — subagent в Tasks 15-17 симулирует выполнение скилла. Реальное поведение в Claude Code session может отличаться. После имплементации желательно прогнать в реальной session оператором — но это после плана, не часть плана.

3. **Reference example size** — если файл example-goal-setting.md слишком большой, может не помещаться в context при загрузке скиллом. В таком случае — extract key portions only. Текущий размер (~450 строк) приемлем.
