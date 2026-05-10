# `hi_flow:product-spec` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать Claude Code skill `hi_flow:product-spec`, который ведёт оператора-продуктолога через двенадцатишаговую таксономию опроса от первоначального описания продукта до законченной product-spec.md одной итерации, с автоматической миграцией парковки и shipped-фич в product-backlog.md.

**Architecture:** Skill — это markdown с frontmatter и инструкциями для LLM. Имплементация = SKILL.md (~500 строк) + три reference-файла (template для спеки, template для бэклога, worked example) + обновление manifest'ов плагина + behavioral validation через subagent. Никакого runtime-кода (per P2 проекта: «Skill = LLM instructions, не код»).

**Tech Stack:** Claude Code skills format (markdown + YAML frontmatter), Claude Code plugin структура.

**Spec:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`

---

## Methodology Notes (важно перед стартом)

Поскольку SKILL.md — инструкции для LLM, классическое TDD неприменимо (per P2). Замены:

- **Structural review** — проверка структуры файлов, frontmatter, секций. Subagent dispatch.
- **Behavioral validation** — запуск скилла на сценарии через subagent (агент симулирует выполнение инструкций). Output сверяется с ожиданиями.

Per P5 (subagent-driven с прагматичной адаптацией) — батчинг последовательных markdown-задач в один dispatch. Этот план — 12 task'ов вместо ~50, что укладывается в P5 целевые ~10-12 dispatches.

Worktree уже создан (текущий) — отдельный заводить не нужно.

---

## File Structure

```
hi_flow/
└── skills/
    └── product-spec/
        ├── SKILL.md                              # main skill instructions
        └── references/
            ├── product-spec-template.md          # output template (skeleton per D12)
            ├── product-backlog-template.md       # backlog template (skeleton per D17)
            └── example-contact-tracker-mvp.md    # worked example (small CRM, iter1)
```

Дополнительные изменения:
- `.claude-plugin/marketplace.json` — описание плагина обновляется упоминанием product-spec.
- `hi_flow/.claude-plugin/plugin.json` — skill list обновляется.
- `ARCHITECTURE.md` — Module Map переход product-spec из PLANNED в BUILT v0.1.0 (после полной валидации).

**Spec для всей содержательной части:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`. Все D-decisions D1-D9, D11-D18 отражаются в SKILL.md.

---

## Tasks

### Task 1: Setup directory + frontmatter scaffold

**Files:**
- Create directory: `hi_flow/skills/product-spec/`
- Create directory: `hi_flow/skills/product-spec/references/`
- Create: `hi_flow/skills/product-spec/SKILL.md` (frontmatter only, body TBD в следующей task)

- [ ] **Step 1: Create directories**

```bash
cd "C:\Users\Vegr\Projects\Owners\agent_orchesration_skills\.claude\worktrees\vigorous-ride-ac459b"
mkdir -p hi_flow/skills/product-spec/references
```

Verify:

```bash
ls -la hi_flow/skills/product-spec/
```

Expected: `references/` directory present.

- [ ] **Step 2: Write SKILL.md frontmatter**

Create `hi_flow/skills/product-spec/SKILL.md` with frontmatter only (body заполнится в следующих task'ах):

```markdown
---
name: product-spec
description: Use when operator says «продуктовая спека», «спека продукта X», «продуктовая декомпозиция», «давай продумаем продукт X», «product-spec для X», «новая итерация продукта», or English equivalents («product spec», «product decomposition», «next iteration of <product>»). Produces product-spec.md + product-backlog.md.
---

# `hi_flow:product-spec` — Product-Level Decomposition Skill

[BODY TBD — заполняется в Task 2-5]
```

- [ ] **Step 3: Verify frontmatter validity**

Frontmatter должен парситься как YAML. Проверка:

```bash
head -5 hi_flow/skills/product-spec/SKILL.md
```

Expected: видны поля `name: product-spec` и `description:`.

- [ ] **Step 4: Commit setup**

```bash
git add hi_flow/skills/product-spec/
git commit -m "scaffold(product-spec): create skill directory + frontmatter"
```

---

### Task 2: SKILL.md core sections (Overview, Output, Anti-triggers, Process flow)

**Files:**
- Modify: `hi_flow/skills/product-spec/SKILL.md` — заменить `[BODY TBD]` на core sections.

Это **batched markdown task per P5** — содержит несколько связанных секций, пишется одним dispatch'ем.

**Spec sections to translate:** D1 (terminology), D9 (top-down), D13 (brainstorm-only), D8 (feedback loop intra-iteration).

- [ ] **Step 1: Write Overview, Out of scope, Output sections**

Content for SKILL.md (после frontmatter):

```markdown
# `hi_flow:product-spec` — Product-Level Decomposition Skill

Help the operator turn a product idea (или next iteration of an existing product) into a frozen `product-spec.md` for one shippable iteration plus a living `product-backlog.md` that accumulates feature ledger across iterations.

Systematically surface domain features and derived enabler features through structured product-language probing (top-down per D9), classify strategic forks per D5 boundary test, manage cross-iteration memory through asymmetric size discipline backlog.

## Out of scope

- Feature-level продуктовая детализация (отдельный скилл `hi_flow:feature-spec` — углубляется в одну фичу).
- Архитектурные решения (`hi_flow:arch-spec` — выводит архитектуру из готовых product-spec + feature-spec).
- Implementation planning (`hi_flow:impl-plan` parked; покрывается Superpowers TDD methodology).
- Auto-invoking next phase — оператор инициирует переход.

## Output

**Два артефакта** (см. D17):

1. **product-spec.md** — frozen process record одной итерации. Default location: `<project>/docs/specs/YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md` (configurable, см. OQ15 в design doc).

2. **product-backlog.md** — feature ledger living through all iterations of this product. Default location: `<project>/docs/specs/<product-slug>-product-backlog.md` (configurable). Создаётся при первой итерации, обновляется в каждой последующей.
```

- [ ] **Step 2: Write Anti-triggers section**

```markdown
## Anti-triggers (do NOT auto-activate)

- «спека на фичу X», «продуктовый дизайн фичи X» — это уровень feature-spec, не product-spec. Suggest the right skill, не запускать product-spec.
- «давай добавим функцию Y в продукт» — может быть либо feature-spec (если продукт уже существует), либо update mode product-spec (если меняем scope текущей итерации). Уточнить у оператора, не запускать автоматически.
- «спроектируй архитектуру для X» — territory of arch-spec.
- «реализуй X», «напиши код» — implementation phase.
- «расскажи про методологию» — research / explanation, не запуск скилла.
```

- [ ] **Step 3: Write Mode section (brainstorm-only, no direct path)**

Per D13 — никакой self-assessment bifurcation, всегда brainstorm.

```markdown
## Mode

Скилл работает **только через brainstorm path** (per D13 design doc'а). Direct path не применяется на product-уровне — продукт inherently multi-feature, multi-segment, и top-down enabler derivation (D9) теряется при skip.

**Никаких self-assessment proposals оператору на старте сессии.** Скилл сразу переходит к Process flow.

Если оператор явно скажет «direct» / «без проб» — отказать с ссылкой на D13 и предложить short-path brainstorm (тривиальные шаги пробегаются быстро в простых продуктах, но проходятся все).
```

- [ ] **Step 4: Write Process flow section (high-level)**

```markdown
## Process flow

Сессия проходит через четыре фазы:

1. **Session setup** (Active spec identification + backlog load).
   Per D15 + D18 — определить, есть ли existing spec / backlog, определить mode (update existing active vs new iteration).

2. **Operator dump** — открытое описание продукта оператором, без структурирования. Скилл слушает, не задаёт probe'ов.

3. **Agent probing** — двенадцатишаговая таксономия (см. секцию ниже), последовательно. Cross-cutting probes активны параллельно.

4. **Closure** — Шаг 12 (scope confirmation + integrity validation + closure migration) + завершающий premortem + open items table.

После closure — User Review Gate, потом передача в feature-spec (если оператор инициирует) или закрытие сессии.
```

- [ ] **Step 5: Write Session setup phase details**

Per D18:

```markdown
### Session setup (per D15 + D18)

При активации скилла:

1. **Glob check** в configured location (default `<project>/docs/specs/`):
   - `*product-spec.md` — existing product-spec файлы.
   - `<product-slug>-product-backlog.md` — backlog файл текущего продукта.

2. **Identify active spec** среди found product-spec'ов. Active = metadata `status` field ∈ {draft, signed}. Frozen = status: shipped.

3. **Branch по результату:**
   - **Active spec found** → propose update mode (D14 mechanics): «Найдена active spec [path], status [status]. Продолжаем работу над ней?». Default — да; operator может override («закрыть active, начать новую»).
   - **Specs нет** → first iteration product, from-scratch без override.
   - **Только frozen specs** → propose new spec для следующей итерации: «Найдены frozen specs [list]. Стартуем новую итерацию?». Default — да; operator override через прямой edit metadata frozen spec'и (skill отказывает в этом, frozen invariant per D18).
   - **Frozen invariant override request** («открой повторно X для дополнения») → отказать: «Frozen specs не редактируются (D18 frozen invariant). Если решение iter1 нужно пересмотреть — это новое решение в новой spec'е, latest wins».

4. **Backlog loaded в context** для cross-iteration enabler reuse + auto-suggestion из parked.

5. **Operator confirmation** (либо явный, либо через продолжение работы) → переход в Operator dump phase.
```

- [ ] **Step 6: Write Operator dump phase**

```markdown
### Operator dump

Открыть единым broad-вопросом:

> *«Расскажи про продукт. Что это, для кого, какие задачи решает. Дамп всё, что в голове.»*

Если active spec / update mode — формулировка адаптируется:

> *«Что меняется в этой итерации продукта по сравнению с уже зафиксированным? Что нужно добавить, что убрать, что переосмыслить?»*

Скилл слушает, не probe'ит. Operator может быть кратким или подробным — обе ситуации валидны.

Дамп может быть пустым («хочу X, ничего пока не думал») — переходим к probing без задержки.
```

- [ ] **Step 7: Commit Task 2 batch**

```bash
git add hi_flow/skills/product-spec/SKILL.md
git commit -m "feat(product-spec): SKILL.md core sections (overview, output, anti-triggers, process flow setup + dump)"
```

---

### Task 3: SKILL.md probing taxonomy (12 шагов + cross-cutting + closing)

**Files:**
- Modify: `hi_flow/skills/product-spec/SKILL.md` — добавить секцию Probing Taxonomy.

Это **largest batched markdown task** — переводит D11 design doc'а в SKILL.md формат. Содержание ~150-200 строк.

**Spec sections to translate:** D2 (feature definition), D3 (module), D4 (DAG topology), D5 (boundary test), D11 (full taxonomy), D7 (two types of forks).

- [ ] **Step 1: Write Probing Taxonomy header + universal rule**

Content (продолжается после Process flow):

```markdown
## Probing Taxonomy

Floor checklist для brainstorm path: **7 обязательных шагов (1-6 + финальный 12) + 3 условных + 2 опциональных + 3 сквозных + 1 завершающая**.

### Universal rule

Walk through every category, но **не обязательно** генерировать output в каждой условной/опциональной — N/A explicit allowed для тех, у которых триггер не сработал. Mandatory шаги дают output всегда.

Adaptive depth (per D11) — глубина шагов 1-3 варьируется по типу проекта (личный / стартап-MVP / open-source / внутренний инструмент / коммерческий). Шаги 4-12 одинаковы.

Каждый шаг имеет explicit Procedure (input → algorithm → output). Adaptive probes допускаются как **дополнение** к procedure, не замена.
```

- [ ] **Step 2: Write Шаги 1-3 (Framing, Segments, Jobs)**

Per D11. Скопировать содержание Шагов 1-3 из design doc'а § Probing taxonomy. Адаптировать под скилл-формат (в design doc'е они описаны как процедуры, в SKILL.md — как инструкции для агента).

Структура каждого шага:
- **Trigger** (для conditional/optional, для mandatory — «всегда»)
- **Procedure** (input → sub-steps → output)
- **Adaptive notes** (где adaptive depth применяется)
- **Output anchor** (что попадёт в spec.md)

Полный текст Шагов 1-3 — см. design doc `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md` § Probing taxonomy. Перенести содержание адаптируя под SKILL.md формат: вместо описательных формулировок — императивные инструкции для агента («задай probe X», «получи ответ Y», «запиши в раздел Z»).

- [ ] **Step 3: Write Шаги 4-6 (Domain features, Enablers, Scope cuts)**

Per D11 + D17 sub-steps:
- Шаг 4 включает **auto-suggestion check parked backlog** (per D17).
- Шаг 5 включает **shipped backlog check + auto-suggestion parked check** (per D17).
- Шаг 6 включает **parking match flag** при обсуждении выноса в parking.

Перенести из design doc'а § Probing taxonomy секции Шагов 4-6 + относящиеся `> Updated by D17` блоки.

- [ ] **Step 4: Write Шаги 7-9 (Cross-cutting, Lifecycle, Cross-segment) — inheritance-aware**

Per D11 (after revision per operator request). Шаги 7 и 8 — inheritance-aware sub-steps (read existing standing → check coverage → probe только для новых concerns, валидное завершение «inherited only»).

Перенести из design doc'а § Probing taxonomy секции Шагов 7-9.

- [ ] **Step 5: Write Шаги 10-11 (Compliance, NFR)**

Optional шаги. Перенести из design doc'а § Probing taxonomy секции Шагов 10-11.

- [ ] **Step 6: Write Шаг 12 (Scope confirmation + integrity validation + closure migration)**

Per D11 (после правки) + D17 § Closure flow + D18 status transition.

Содержание из design doc § Probing taxonomy Шаг 12:

```markdown
### Шаг 12 (финальный обязательный). Scope confirmation + integrity validation + closure migration.

Запускается после Шагов 4-11. Sub-steps:

- 12.1. **Scope confirmation.** Skill показывает оператору финальный сводный список: in-scope features (с карточками), parked-this-iteration (с level), deferred forks, rejected. Operator подтверждает или правит.
- 12.2. **Integrity validation** (skill автоматически):
  - **Orphan check** — enabler в in-scope, ни одна domain-функция от него не зависит → flag.
  - **Broken closure** — domain-функция в in-scope, её enabler в parked / out-of-scope → flag.
  - **Cyclic deps** — цикл в графе зависимостей → блокирующая ошибка.
- 12.3. **Closure migration** per D17:
  - in-scope → backlog § Shipped (asymmetric pointers per Type — см. секцию Backlog mechanics ниже).
  - parked-this-iteration → backlog § Parked (full content + level field).
  - deferred forks → backlog § Deferred (full content).
  - rejected → backlog § Out-of-scope (one-liner).
  - resolved forks остаются в spec § Strategic forks.
  - Iteration index в backlog обновляется новой записью.
- 12.4. **Status transition** per D18. Operator confirmation → spec status `draft` → `signed` (готов к feature-spec). Переход на `shipped` — позже, по явному подтверждению что итерация отгружена.
```

- [ ] **Step 7: Write Cross-cutting probes (CCP1, CCP2, CCP3) + Closing premortem**

CCP3 — extended D17 с auto-check deferred forks из backlog.

Перенести из design doc'а § Probing taxonomy секции «Сквозные проверки» + «Завершающая проверка» + «Условие завершения сессии».

- [ ] **Step 8: Commit Task 3 batch**

```bash
git add hi_flow/skills/product-spec/SKILL.md
git commit -m "feat(product-spec): SKILL.md probing taxonomy (12 steps + cross-cutting + closing premortem)"
```

---

### Task 4: SKILL.md backlog mechanics + active spec + update mode

**Files:**
- Modify: `hi_flow/skills/product-spec/SKILL.md` — добавить секцию Backlog mechanics.

**Spec sections to translate:** D14 (update mode mechanics), D15 (update mode triggering), D16 (one spec = one iteration), D17 (backlog two-doc system), D18 (active spec identification).

- [ ] **Step 1: Write Backlog mechanics section (intro + asymmetric pointers)**

```markdown
## Backlog mechanics

Per D17 — backlog хранит feature ledger living through all iterations с asymmetric size discipline (защита от unbounded growth по lesson из архитектурного документа проекта).

### Backlog content по типам entry

**Iteration index** — таблица с одной строкой на итерацию:

| Дата | Slug | Status | Spec |
|------|------|--------|------|
| 2026-05-10 | erp-mvp | shipped (2026-07-15) | docs/specs/2026-05-10-erp-mvp-product-spec.md |

**Shipped enabler pointer** (5-6 строк):

\`\`\`markdown
### F-id-2. Permissions [shipped iter1: erp-mvp]
**Module:** Identity
**Type:** enabler
**Назначение:** базовая модель прав доступа на уровне ресурсов
**Входит:** flat-роли (admin/user/viewer); per-resource permissions; assign/revoke/list
**Не входит:** иерархические роли с inheritance; ABAC; audit log
**Spec:** docs/specs/2026-05-10-erp-mvp-product-spec.md § F-id-2
\`\`\`

**Shipped domain pointer** (3 строки):

\`\`\`markdown
### F-comm-1. Email-conv [shipped iter1: erp-mvp]
**Module:** Communication
**Type:** domain
**Назначение:** двусторонние email-разговоры оператора с клиентами с threading
**Spec:** docs/specs/2026-05-10-erp-mvp-product-spec.md § F-comm-1
\`\`\`

**Parked feature** (full content + level field):

\`\`\`markdown
### F-comm-X. Auto-classification (level: detailed)
**Status:** parked
**Originating analysis:** docs/specs/2026-08-15-erp-multichannel-product-spec.md (Секция 4)
**Reason for parking:** ML-стоимость не вписалась в бюджет iter2
**Carry-over candidate for:** iter3+
[full card content]
\`\`\`

Levels per D17: `detailed / partial / note / fragment`. Operator выбирает level при парковке.

**Deferred fork** — full cell как было в spec'е + reason for deferring + originating spec ref.

**Out-of-scope (rejected)** — one-liner: `F-Z. Mobile app native — отвергнуто iter1, причина: scope MVP не выдерживает; альтернатива — responsive web.`

**Standing cross-cutting policies** — pointer (1 строка + spec ref на originating).
```

- [ ] **Step 2: Write Closure flow detail**

Сslightly из Шага 12 уже зафиксировано. Здесь — операционные детали:

```markdown
### Closure flow (operational)

При Шаге 12.3 closure migration:

1. Если backlog не существует — создать с шапкой:

\`\`\`markdown
# <Product> — Backlog

[Метаданные: дата создания, дата последнего обновления, версия структуры]

## Iteration index

(пусто на старте)

## Shipped features

(пусто на старте)

## Parked features

(пусто на старте)

## Deferred strategic forks

(пусто на старте)

## Out-of-scope (rejected)

(пусто на старте)

## Standing cross-cutting policies

(пусто на старте)
\`\`\`

2. Migration items в соответствующие секции.
3. Iteration index обновляется новой записью в табличной форме.
4. Standing CC policies — only for newly-introduced (skill flag'ит «новая CC, добавить в standing?» при closure если в spec'е есть CC, ещё не помеченная как inherited).

(Skeleton полный — `references/product-backlog-template.md`.)
```

- [ ] **Step 3: Write Cross-iteration enabler reuse mechanics**

Per D17. Как Шаг 5 проверяет shipped backlog:

```markdown
### Cross-iteration enabler reuse (Шаг 5 detail)

При Шаге 5 для каждой нового domain feature:

1. После «да» оператора на probe-вопрос (например, «нужны ли роли пользователей?») — skill **first checks shipped backlog**.
2. Decision tree:
   - **Match (Входит покрывает нужное)** → propose **reuse**: «У тебя F-id-2 (Permissions) shipped. Покрывает ли flat-роли admin/user, что нужно для F-sales-1, или нужно расширение?». Operator подтверждает → новая domain card получает `Зависит от: F-id-2`, новая enabler не создаётся.
   - **Partial match (Входит покрывает основное, но нужно добавить)** → propose **extension**: «F-id-2 покрывает flat-роли, но не иерархические. Создаём F-id-2-ext в этой итерации?». Operator подтверждает → новая card F-id-2-ext, depends on F-id-2.
   - **Mismatch (Не входит явно содержит нужное)** → propose **новая card**: «F-id-2 не покрывает ABAC. Создаём F-id-3 (ABAC permissions)?».
   - **Ambiguous (pointer недостаточен)** → skill **читает originating spec on-demand** для полной карточки enabler'а, делает финальное решение.

Domain shipped pointer (минимальный per D17) обычно используется только для name-level dedup в Шаге 4. При scope inquiry — spec read on-demand (редкий кейс).
```

- [ ] **Step 4: Write Auto-suggestion mechanic**

Per D17:

```markdown
### Auto-suggestion из parked backlog

Skill сканирует parked backlog на семантическое пересечение во время:

- **Шаг 4:** после описания operator'ом domain feature кандидата → match → flag «уже parked F-X с детальной проработкой из iterN; pull / merge / держать отдельно».
- **Шаг 5:** после кандидата enabler — после check'а shipped (если no match) → check parked → match → flag.
- **Шаг 6:** при обсуждении «выносим в parking» → match → flag «уже было запарковано похожее, слить или держать отдельно».

Match heuristic — **semantic** (LLM judgment), не regex / индекс. Признаки совпадения:
- близкие names,
- перекрывающиеся scopes (Назначение / Входит),
- одинаковые upstream deps.

False positives / negatives — operator корректирует устной фразой («нет, другая фича»), не блокирует процесс.

Аналогично для **deferred forks** в CCP3 — match → flag «связано с deferred Sf-Y из iterN, резолвить сейчас или продолжать как отдельный fork?».
```

- [ ] **Step 5: Write Update mode mechanics**

Per D14 + D15 + D18:

```markdown
### Update mode (D14 mechanics)

Если на Session setup определена active spec → update mode применяется к текущему spec и backlog.

**Operations supported:**

- **Add feature** (новый F-X): probe Шаги 4-6 для новой; Шаг 5 enabler closure; spec update.
- **Remove feature**: проверка downstream deps (никто не зависит?); если зависят — резолвить.
- **Split feature** (X → A + B): add A + add B; remove X; reroute deps; integrity revalidate.
- **Merge features** (A + B → C): add merged; remove обе; reroute deps.
- **Update scope cuts**: edit карточки (поля In / Out), без cascade.
- **Add / edit CC policy**: новая или обновлённая запись в Section 6.
- **Resolve OPEN strategic fork**: apply changes per выбранной ветке (add/remove features); обновление feature list.

**Mechanics:**
- Read tool загружает spec + backlog в контекст.
- LLM понимает структуру семантически, edit'ит surgical через Edit tool.
- Integrity check после каждой операции (orphan / broken closure / cycles).
- Mermaid в Section 4 регенерируется LLM'ом при изменении deps.
- Diff representation — через «было/стало» в proposal оператору перед apply.
- Confirmation gate — per логическая операция (split = один confirmation, не три отдельных).

**Без structured parsing.** Skill работает с markdown как с текстом. Mermaid helper script alternative parked в OQ14 (если LLM-генерация Mermaid окажется ненадёжной на больших графах — пересмотрим).

**Frozen invariant** — shipped specs не редактируются (D18). Если operator пытается «open frozen spec для дополнения» — отказать: «Frozen invariant. Если решение из iter1 нужно пересмотреть — это новое решение в новой spec'е, latest wins».
```

- [ ] **Step 6: Write Status field semantics (D18 reference)**

```markdown
### Spec status field (D18)

Metadata спеки содержит поле `status` с тремя значениями:

- `draft` — спека в дизайне (operator работает в текущей session).
- `signed` — дизайн закрыт, перешли к feature-spec / impl. Active spec, можно editить.
- `shipped` — итерация отгружена, spec **frozen**, не редактируется.

**Transitions** (per P6 ARCHITECTURE.md — детерминированные действия, без эскалации оператору):

- `draft → signed` — автоматически по completion Шага 12 + User Review Gate.
- `signed → shipped` — по explicit operator command «iter X отгружена / iter X в production». Skill применяет mechanically.
- `shipped → anything` — запрещено. Skill блокирует edit attempts.
- `signed → draft` — operator может вручную через edit metadata, если решает переоткрыть design (skill не борется, но и не инициирует).

Active = `draft` или `signed`. Frozen = `shipped`.
```

- [ ] **Step 7: Commit Task 4 batch**

```bash
git add hi_flow/skills/product-spec/SKILL.md
git commit -m "feat(product-spec): SKILL.md backlog mechanics + cross-iteration reuse + update mode + status field"
```

---

### Task 5: SKILL.md output format + operational rules + references list

**Files:**
- Modify: `hi_flow/skills/product-spec/SKILL.md` — добавить финальные секции.

- [ ] **Step 1: Write Output Format section (high-level)**

```markdown
## Output Format

### File locations

- Spec: `<project>/docs/specs/YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md`
- Backlog: `<project>/docs/specs/<product-slug>-product-backlog.md`

(Configurable; default location зависит от OQ15 file convention для семейства hi_flow — на момент implementation v0.1.0 default это вариант (b) flat `docs/specs/`.)

### Skeleton

Полный skeleton spec'и — `references/product-spec-template.md`. Полный skeleton backlog'а — `references/product-backlog-template.md`. Worked example — `references/example-contact-tracker-mvp.md`. Skill читает эти три файла на старте сессии для anchoring формата output'а.

### PRD-as-standalone principle

Spec self-sufficient для контекста итерации. Backlog читается отдельно для cross-iteration памяти. ARCHITECTURE.md проекта читается отдельно для архитектурного контекста — не дублируется.

### Plain language principle (D4 + P1 проекта + memory feedback_plain_language_conditional)

Spec и backlog адресованы продуктологу, не разработчику. Default — продуктовый русский. Англицизм только если выполняется один из критериев (см. memory feedback_plain_language_conditional.md):

1. Устоявшийся термин в индустрии (MVP, KPI, API, UX, ROI).
2. Объективно компактнее или точнее русского при том же смысле.
3. Игра слов / специфический жаргон, теряющий смысл при переводе.

Engineer-only жаргон (extract-all, payload, throughput, idempotency) — переводится / раскрывается. Plain product naming для переменных (target_weight, current_weight) — OK как структурные идентификаторы.

### Adaptive depth (per D11 + D9)

Шаги 1-3 (Framing → Segments → Jobs) адаптируют глубину по `Тип проекта` из Шага 1.2:
- Личный продукт: 1 segment, тривиальный jobs list.
- Стартап-MVP / open-source: 2-4 imagined personas, гипотетические jobs.
- Внутренний инструмент / коммерческий: 3-7+ real roles, jobs matrix segment × jobs, **buyer outcomes** в Шаге 1.4.
```

- [ ] **Step 2: Write Operational Rules section**

```markdown
## Operational Rules — what the skill enforces

1. **Top-down probing only.** Шаг 5 (enabler derivation) идёт **из** domain features через продуктовый язык probe-таблицы D9, не через инженерный «нужен ли auth?». Skill переводит инженерный вопрос в продуктовый эквивалент перед задаванием оператору.

2. **D2 three-test gate для каждой кандидатной фичи.** Independent shippability + atomic user job + negotiability. Провал любого теста → переразложить (split / merge / drop), не пускать в feature list.

3. **D5 boundary test для каждой развилки-кандидата.** Меняет состав фич / связи между ними? → strategic fork (Section 5). Иначе — feature-level, не записывается (пойдёт в feature-spec).

4. **D17 asymmetric pointer discipline в backlog'е.** Shipped enabler 5-6 строк (Входит/Не входит), shipped domain 3 строки (минимальный), parked full content (любой Type), deferred full content, rejected one-liner.

5. **D18 frozen invariant для shipped специй.** Никаких edits. Override через новую spec'у, latest wins.

6. **P6 ARCHITECTURE.md (operator escalation discipline).** Не задавать оператору вопросы по детерминированным действиям (status transitions, integrity checks, format validations, миграция в backlog). Не принимать решения за оператора в продуктовых вопросах.

7. **Closure требует resolution всех strategic forks.** OPEN forks недопустимы при closure — должны быть либо RESOLVED, либо DEFERRED (мигрируют в backlog), либо OUT-OF-SCOPE.

8. **Mermaid mandatory в Section 4** (per D12). Регенерация LLM'ом при каждом изменении `Зависит от` фич. Source of truth — поле `Зависит от` в карточках.

9. **Living document scope (D8 updated D16/D17).** Spec — living **внутри** одной итерации (mid-design feedback от feature-spec → update mode). Backlog — living **across** iterations.

10. **Escalation rule:** при ambiguity, неразрешимой из available data — escalate операторy, не restart upstream skill (P6 + escalation discipline).
```

- [ ] **Step 3: Write Format Rules section**

```markdown
## Format Rules

1. **Hierarchical IDs (Cockburn-style).** Features: `F-<module-slug>-N` (например, F-id-1, F-comm-1, F-sales-2). Strategic forks: `Sf1, Sf2 ...`. Cross-cutting policies: `CC1, CC2 ...`. Reusable sub-policies: `P-<UPPER-CASE-WITH-DASHES>`.

2. **ID assigned ⇔ entry exists.** No dangling IDs без карточек. No карточек без ID.

3. **Status / Type fields обязательны на каждой feature card.**

4. **Cardinality tag** (XOR / OR / OPT) обязательный на strategic forks с branches.

5. **`Зависит от`** — обязательное поле для **всех** features (для domain'ов часто пусто или ссылки на enabler'ы; для enabler'ов часто пусто или ссылки на другие enabler'ы). Mermaid строится по нему.

6. **Inherits** — опциональное поле в карточке для standing CC policies из предыдущих итераций.

7. **Доступно группам** — обязательное если Шаг 9 сработал и группы различаются. Иначе omit.

8. **Все strategic forks при closure** — RESOLVED / DEFERRED / OUT-OF-SCOPE. OPEN forks при closure — блокирующая ошибка.

9. **No summary at the end of spec** — оператор читает в полном объёме per PRD-as-standalone.

10. **Backlog file naming** — `<product-slug>-product-backlog.md` (без даты, один на продукт).

11. **Spec file naming** — `YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md`.
```

- [ ] **Step 4: Write References section**

```markdown
## References

- **Product-spec template** with placeholders: `references/product-spec-template.md`. Use as starting structure when writing.
- **Product-backlog template** with placeholders: `references/product-backlog-template.md`. Use when создавать backlog для нового продукта или дополнять existing.
- **Reference example** (worked product-spec + backlog для small contact tracker): `references/example-contact-tracker-mvp.md`. Read on session start для anchoring формата.
- **Design spec** для глубокого rationale всех D-decisions: `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md` (в проекте hi_flow). Не читается на каждой сессии, ссылка для cases когда поднимается архитектурный вопрос про сам скилл.
```

- [ ] **Step 5: Write Implementation Notes section**

```markdown
## Implementation Notes

- На skill start читать references files (template'ы + example) для anchoring формата output'а.
- При first iteration product (нет existing backlog'а) — создать backlog по skeleton'у `product-backlog-template.md`. При update mode — load existing backlog в context.
- При новой strategic fork — применять D5 test на всё, что выглядит как развилка. Если меняет feature list / deps → strategic fork в Section 5. Иначе — отбросить (feature-level, пойдёт в feature-spec, в product-spec не записываем).
- При completing Шаг 12 — automatically transition status `draft` → `signed` (per D18 + P6, без вопроса оператору).
- Никаких self-assessment proposals на старте (D13). Direct → silent decline + propose short brainstorm path.
```

- [ ] **Step 6: Commit Task 5 batch**

```bash
git add hi_flow/skills/product-spec/SKILL.md
git commit -m "feat(product-spec): SKILL.md output format + operational rules + format rules + references"
```

---

### Task 6: product-spec-template.md reference

**Files:**
- Create: `hi_flow/skills/product-spec/references/product-spec-template.md`

Перенести skeleton из design doc'а § Output structure D12 (полный markdown skeleton 12 секций).

- [ ] **Step 1: Create template file**

Скопировать markdown-блок «Полный скелет» из design doc'а D12 (после строки `### Полный скелет`). Сохранить как самостоятельный файл с placeholder'ами `<...>` для всех динамических полей.

Pre-filled boilerplate (header):

```markdown
# <Название продукта> — <название итерации>

[Метаданные: дата, статус (draft / signed / shipped — см. D18 design doc'а), версия, автор, iteration slug]

## 1. Описание продукта
[результат Шага 1]
...
```

(Полный текст — из design doc § D12 Полный скелет.)

- [ ] **Step 2: Verify template parses as valid markdown**

```bash
head -20 hi_flow/skills/product-spec/references/product-spec-template.md
```

Expected: markdown structure visible, no syntax errors.

- [ ] **Step 3: Commit**

```bash
git add hi_flow/skills/product-spec/references/product-spec-template.md
git commit -m "feat(product-spec): product-spec template reference (12 sections per D12)"
```

---

### Task 7: product-backlog-template.md reference

**Files:**
- Create: `hi_flow/skills/product-spec/references/product-backlog-template.md`

Перенести skeleton из design doc'а § D17 «Backlog skeleton».

- [ ] **Step 1: Create template file**

Скопировать markdown-блок «Backlog skeleton» из design doc'а § D17 (после строки `#### Backlog skeleton`).

```markdown
# <Product> — Backlog

[Метаданные: дата создания, дата последнего обновления, версия структуры]

## Iteration index

| Дата | Slug | Статус | Spec |
|------|------|--------|------|
(пусто на старте; одна строка добавляется при closure каждой итерации)

## Shipped features

[Asymmetric pointers per Type. Сгруппированы по модулям для читаемости.]

### Module: <Name>
(пусто на старте; pointers добавляются при closure итераций)

## Parked features

[Полный контент. Каждая запись имеет level: detailed / partial / note / fragment.]

(пусто на старте; full cards добавляются при closure парковок)

## Deferred strategic forks

[Полный cell + reason for deferring + originating spec.]

(пусто на старте)

## Out-of-scope (rejected)

[One-liner + причина. История в git, не в backlog'е.]

(пусто на старте)

## Standing cross-cutting policies

[Pointer + spec ref на originating.]

(пусто на старте)
```

- [ ] **Step 2: Verify template**

```bash
head -30 hi_flow/skills/product-spec/references/product-backlog-template.md
```

Expected: skeleton structure visible.

- [ ] **Step 3: Commit**

```bash
git add hi_flow/skills/product-spec/references/product-backlog-template.md
git commit -m "feat(product-spec): product-backlog template reference (per D17)"
```

---

### Task 8: Reference example — worked contact tracker MVP

**Files:**
- Create: `hi_flow/skills/product-spec/references/example-contact-tracker-mvp.md`

Worked example небольшого commercial-leaning продукта на одной итерации MVP.

- [ ] **Step 1: Write example product-spec.md content**

Контекст: small business contact tracker для команды из 2-3 человек (sales rep + manager). Multi-segment, multiple features, минимальный enabler set, одна strategic fork (resolved), одна CC policy.

Пример заполненного template'а (полный текст в файле):

```markdown
# Contact Tracker — iter1: mvp

**Дата:** 2026-05-15
**Статус:** signed
**Версия итерации:** mvp (v1.0)
**Автор:** [operator name]
**Iteration slug:** mvp

## 1. Описание продукта

- **Что:** инструмент учёта контактов и заявок для small business sales-команды (2-3 человека).
- **Тип проекта:** коммерческая разработка под конкретного заказчика (small accounting firm).
- **Заказчик ↔ пользователь:** заказчик — владелец фирмы; пользователи — sales rep, manager, иногда сам владелец.
- **Бизнес-цели заказчика:**
  - сокращение упущенных заявок (currently 30% lost из-за забытых follow-up'ов)
  - видимость текущего pipeline'а для manager / owner

## 2. Группы пользователей

- **Sales rep** — добавляет контакты, ведёт переписку, выставляет follow-up'ы.
- **Manager** — видит pipeline и активность всех rep'ов, может re-assign контакты.
- **Owner** (occasional user) — видит manager-level + executive summary.

## 3. Задачи пользователей

| Группа | Задачи |
|--------|--------|
| Sales rep | добавить контакт; добавить заявку; поставить follow-up; пометить «закрыто/успех», «закрыто/отказ»; видеть свои активные follow-up'ы |
| Manager | видеть pipeline всех rep'ов; re-assign контакт; смотреть отчёт по упущенным follow-up'ам |
| Owner | видеть pipeline + executive summary (counts + revenue projection) |

Buyer outcomes mapping:
- «сокращение упущенных заявок» → задачи rep'а «поставить follow-up», «видеть активные follow-up'ы» + manager «отчёт по упущенным».
- «видимость pipeline'а» → manager + owner pipeline-задачи.

## 4. Модули и функции

\`\`\`mermaid
graph TD
    F-id-1[F-id-1: User CRUD]
    F-id-2[F-id-2: Permissions]
    F-contacts-1[F-contacts-1: Contacts CRUD]
    F-leads-1[F-leads-1: Leads / opportunities]
    F-followup-1[F-followup-1: Follow-up reminders]
    F-pipeline-1[F-pipeline-1: Pipeline view]
    F-id-1 --> F-id-2
    F-id-2 --> F-contacts-1
    F-id-2 --> F-leads-1
    F-contacts-1 --> F-leads-1
    F-leads-1 --> F-followup-1
    F-leads-1 --> F-pipeline-1
\`\`\`

### Module: Identity

#### F-id-1. User CRUD

**Тип:** поддерживающая
**Статус:** in-scope
**Назначение:** CRUD пользователей системы (3 роли: rep, manager, owner).
**Входит:** create, read, update, delete пользователей; assign роли
**Не входит (это отдельная функция):** —
**Зависит от:** —

#### F-id-2. Permissions

**Тип:** поддерживающая
**Статус:** in-scope
**Назначение:** простая RBAC: rep видит свои контакты, manager — все свои rep'ов, owner — всё.
**Входит:** проверка прав доступа на чтение / изменение контактов и заявок per role.
**Не входит (это отдельная функция):** иерархические роли с inheritance (нет необходимости в команде из 2-3 человек); ABAC.
**Зависит от:** F-id-1

### Module: Contacts

#### F-contacts-1. Contacts CRUD

**Тип:** пользовательская
**Статус:** in-scope
**Назначение:** контакт = карточка лица (имя, компания, телефон, email, заметки) с историей взаимодействий.
**Входит:** CRUD контактов, поиск по имени/компании, история взаимодействий (текст + дата) внутри карточки.
**Не входит (это отдельная функция):** автоматический импорт из email; интеграция с LinkedIn; bulk import.
**Зависит от:** F-id-2
**Доступно группам:** sales rep (свои), manager (свои rep'ов), owner (все)

### Module: Leads

#### F-leads-1. Leads / opportunities

**Тип:** пользовательская
**Статус:** in-scope
**Назначение:** заявка = возможность сделки, привязана к контакту, имеет сумму, статус (new / negotiating / closed-won / closed-lost), assigned rep.
**Входит:** CRUD заявок, привязка к контакту, status transitions, re-assign (manager-only).
**Не входит (это отдельная функция):** quote / контракт generation; integration с accounting.
**Зависит от:** F-contacts-1, F-id-2
**Доступно группам:** sales rep (свои), manager (свои rep'ов + re-assign), owner (все)

#### F-followup-1. Follow-up reminders

**Тип:** пользовательская
**Статус:** in-scope
**Назначение:** rep ставит дату follow-up'а на заявку; на дату — нотификация в email.
**Входит:** установка / изменение / удаление follow-up даты на заявку; email-нотификация на дату.
**Не входит (это отдельная функция):** sms / push / Telegram-нотификации; calendar integration; recurring reminders.
**Зависит от:** F-leads-1
**Доступно группам:** sales rep, manager (overview)

### Module: Reports

#### F-pipeline-1. Pipeline view

**Тип:** пользовательская
**Статус:** in-scope
**Назначение:** табличный view всех заявок с фильтрами (rep, status, value range), для manager / owner.
**Входит:** табличный view, фильтры, сортировка, summary counts (active leads, won this month, lost this month, projected revenue).
**Не входит (это отдельная функция):** advanced analytics (cohort, conversion funnels); export в PDF; dashboards с графиками.
**Зависит от:** F-leads-1
**Доступно группам:** manager, owner (rep видит pipeline только своих заявок через F-leads-1, отдельный view не нужен)

## 5. Стратегические развилки

### Sf1. Email-нотификации vs in-app vs оба [decision: какой канал follow-up reminder'ов в MVP] [status: RESOLVED]

**Resolution:** только email в MVP. Reasoning: команда уже в email постоянно (это был ключевой signal от заказчика); in-app требует периодического входа (≤1 раз/день в среднем по их workflow), что недостаточно для timely напоминаний.

**Branches [XOR]:**
- Sf1.1 — email only → impact: F-followup-1 в текущем виде (email canal). RESOLVED.
- Sf1.2 — in-app only → impact: F-followup-1 без email-канала, добавляется в-app notification subsystem. ОТВЕРГНУТО.
- Sf1.3 — оба — impact: F-followup-1 + новый F-notif-1 (in-app notifications). DEFERRED для возможного v2.

**Связи:** F-followup-1.

## 6. Сквозные политики

### CC1. Audit log для leads и status transitions

**Применяется к:** F-leads-1, F-followup-1
**Resolution:** все изменения статусов заявок и follow-up'ов логируются в audit log с user / timestamp / before / after. View доступен manager + owner.
**Pattern:** «При изменении status или follow-up — записать в audit log».

(Standing policy для будущих итераций — manager и owner ожидают audit для compliance; впишется в backlog § Standing CC policies при closure.)

## 7. Переиспользуемые подполитики

(нет — продукт компактный, P-policies не выделялись)

## 8. Базовые требования к нагрузке и доступности

(не применимо — Шаг 11 не сработал; small product, NFR — материал arch-spec)

## 9. Примерные сценарии работы

### Сценарий: rep ведёт сделку до закрытия

Rep получает входящий email о потенциальной сделке. Открывает Contact Tracker, добавляет контакт (F-contacts-1), создаёт заявку (F-leads-1) со статусом `new` и суммой. Ставит follow-up на завтра (F-followup-1). На следующий день получает email-напоминание, переписывается с клиентом, ставит status `negotiating`, новый follow-up через 3 дня. После переговоров — status `closed-won` с финальной суммой. Manager видит сделку в pipeline (F-pipeline-1) с её историей.

### Сценарий: manager перераспределяет нагрузку

Manager видит в pipeline (F-pipeline-1), что у одного rep'а 25 active leads, у другого — 5. Открывает заявки первого rep'а, делает re-assign 10 из них на второго (F-leads-1, manager-only operation). Audit log (CC1) фиксирует re-assign'ы.

## 10. Ссылки на парковку

Из этой спеки в backlog перенесены:

- **F-import-1** (bulk contact import из CSV) → parked (level: partial). Нужна, но в MVP не входит — пока вручную добавляют. См. backlog § Parked.
- **F-quote-1** (генерация коммерческого предложения из leada) → parked (level: note). Идея пришла во время дизайна, нужна для buyer outcome «упрощение продажного цикла», но требует значительной ML / template работы — отложено.
- **Sf2** (multi-tenant SaaS vs single-tenant deployment) — этот клиент один, single-tenant. DEFERRED для возможного product-tization. См. backlog § Deferred forks.
- **F-mobile-1** (native mobile app) → rejected. Команда работает с десктопа в офисе, mobile не нужен.

Полные карточки и причины — в backlog. Эта секция — навигация.

## 11. Что может пойти не так

Premortem на 6 месяцев:

- **«rep не использует follow-up'ы»** — рассчитываем на behavior change, может не случиться. Mitigation: manager видит follow-up activity per rep в pipeline view (F-pipeline-1), может коучить.
- **«manager не открывает pipeline»** — если manager по факту менеджит через таблички в Excel'е по привычке. Mitigation: weekly / monthly auto-email с pipeline summary (deferred for v2).
- **«нужен mobile»** — если команда вырастет и часть начнёт работать выездом. Trigger для re-evaluation F-mobile-1 из rejected → новая итерация.
- **«не справляется с объёмом»** — если приходит 100+ leads/день, фильтры pipeline'а станут неудобными. Trigger для F-search-1 + advanced filters (новая итерация).

## 12. Открытые вопросы на момент закрытия сессии

| ID | Тип | Описание | Likely blocker / nice-to-have / уточнить |
|----|-----|----------|------------------------------------------|
| F-followup-1 | scope cut уточнить | какой час дня для email-напоминаний — 9 утра / configurable per user? | nice-to-have, default 9am, configurable можно добавить в feature-spec |
| F-pipeline-1 | scope cut уточнить | какой default-фильтр у manager'а — все active или только assigned to me as supervisor? | уточнить с заказчиком до feature-spec |
```

- [ ] **Step 2: Write companion example backlog**

Также в example-contact-tracker-mvp.md показать пример closure'а — как backlog выглядит **после** closure этой спеки. Включить:
- Iteration index с iter1 entry
- Shipped section с pointers per asymmetric format (5-6 строк для enabler'ов, 3 строки для domain)
- Parked section с full cards для F-import-1 + F-quote-1
- Deferred forks с Sf2
- Out-of-scope (rejected) с F-mobile-1
- Standing CC policies с CC1

(Полный пример backlog'а — порядка 100-150 строк.)

- [ ] **Step 3: Verify example**

Visually inspect через Read:
- Обе части (spec + backlog) parseable as markdown.
- Все feature ID consistent между spec и backlog.
- Mermaid syntax корректный.
- Cross-references valid (F-X в одном месте → соответствующий F-X в другом).

- [ ] **Step 4: Commit**

```bash
git add hi_flow/skills/product-spec/references/example-contact-tracker-mvp.md
git commit -m "feat(product-spec): worked example — contact tracker MVP (spec + backlog)"
```

---

### Task 9: Update plugin metadata

**Files:**
- Modify: `.claude-plugin/marketplace.json` — описание упоминает product-spec.
- Modify: `hi_flow/.claude-plugin/plugin.json` (если существует и содержит skill list) — добавить product-spec.

- [ ] **Step 1: Inspect existing manifests**

```bash
cat .claude-plugin/marketplace.json
ls hi_flow/.claude-plugin/ 2>/dev/null || echo "no plugin.json"
cat hi_flow/.claude-plugin/plugin.json 2>/dev/null
```

Identify, какие manifest'ы содержат list скиллов или description.

- [ ] **Step 2: Update marketplace.json description**

Если в marketplace.json есть поле `description` для hi_flow, добавить упоминание product-spec. Например:

```diff
   "description": "Family of skills for Three-Phase Flow methodology: feature-spec (Phase 1), product-spec (Phase 0 — top-down decomposition), arch-redesign + arch-audit (Phase 2)."
```

(Точный формат зависит от текущего содержания.)

- [ ] **Step 3: Update plugin.json skill list**

Если plugin.json содержит explicit skill list — добавить запись:

```diff
   "skills": [
     "feature-spec",
+    "product-spec",
     "arch-redesign",
     "arch-audit"
   ]
```

Или (depending on format) добавить product-spec в whatever структуру использует plugin.json.

- [ ] **Step 4: Verify plugin loads**

Smoke test — попробовать manually invoke skill через Claude Code (если operator может проверить локально) или через grep validity:

```bash
grep -l "product-spec" .claude-plugin/marketplace.json hi_flow/.claude-plugin/plugin.json 2>/dev/null
```

Expected: matches in updated files.

- [ ] **Step 5: Commit metadata updates**

```bash
git add .claude-plugin/marketplace.json hi_flow/.claude-plugin/plugin.json
git commit -m "chore(product-spec): update plugin metadata to include product-spec skill"
```

---

### Task 10: Spec compliance review (subagent dispatch)

**Files:**
- Read-only review of: `hi_flow/skills/product-spec/SKILL.md` + `references/*.md`
- Reference for compliance check: `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`

Subagent dispatch с изолированным контекстом — checking что implementation отражает все D-decisions из design spec'а.

- [ ] **Step 1: Dispatch spec compliance review subagent**

Use `Agent` tool with `subagent_type: general-purpose`. Prompt:

```
Read these two files:
1. SKILL.md: hi_flow/skills/product-spec/SKILL.md
2. References: hi_flow/skills/product-spec/references/product-spec-template.md, product-backlog-template.md, example-contact-tracker-mvp.md
3. Design spec: docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md

Validate that SKILL.md correctly implements all D-decisions from design spec. Specifically check:

1. **D1 terminology**: domain feature / enabler feature / scaffolding — присутствует и используется консистентно.
2. **D2 three-test gate**: independent shippability / atomic user job / negotiability — упоминается в Шаге 4.
3. **D3 module = cluster**: модуль не как уровень декомпозиции.
4. **D4 DAG topology**: упомянуто, что зависимости — DAG, ordering — топосорт.
5. **D5 boundary test**: применяется в CCP3, явно используется для классификации forks.
6. **D6 card format**: skeleton в template + example соответствует D6 (Type / Status / Назначение / Входит / Не входит / Зависит от + опционально Доступно группам, Inherits).
7. **D7 two types of forks**: strategic (Section 5) vs scope cuts (карточка) — оба представлены.
8. **D8 living document scope**: spec living within iteration, backlog living across.
9. **D9 top-down probes**: Шаг 5 включает таблицу probe-вопросов в продуктовом языке.
10. **D11 12 шагов**: все 12 шагов присутствуют, mandatory / conditional / optional разделение корректно.
11. **D12 skeleton**: 12 секций product-spec.md в template корректны.
12. **D13 brainstorm-only**: явно сказано, что direct path не применяется.
13. **D14 update mode mechanics**: LLM-driven Read+Edit без structured parsing — описано.
14. **D15 update mode triggering**: glob check + active spec identification — описано.
15. **D16 one spec = one iteration**: явно указано в Output Format / Process flow.
16. **D17 backlog**: все элементы (asymmetric pointers, levels for parked, closure flow, cross-iteration enabler reuse, auto-suggestion, extensions = новые cards) — описаны в SKILL.md.
17. **D18 active spec identification**: status field draft/signed/shipped + transitions + frozen invariant — описано.

Также проверить:
- **P6 ARCHITECTURE.md (operator escalation discipline)**: status transitions автоматические, без вопросов оператору; integrity checks — flag, не вопросы; product decisions — escalate.
- **P1 проекта (plain language)**: SKILL.md и templates на продуктовом русском без избыточных англицизмов.
- **Template + example coherent**: example использует template structure корректно.

Return findings в формате:
- Critical gaps (что отсутствует и блокирует использование)
- Inconsistencies между SKILL.md, template, example
- Format violations
- Suggestions for clarity

Под 600 слов финальный отчёт.
```

- [ ] **Step 2: Address findings**

Read subagent report. Fix critical gaps + inconsistencies inline. Не делать второй review pass — один достаточно.

- [ ] **Step 3: Commit fixes if any**

```bash
git add hi_flow/skills/product-spec/
git commit -m "fix(product-spec): address spec compliance review findings"
```

---

### Task 11: Behavioral validation (subagent simulates scenario)

**Files:**
- Read-only validation of: full skill folder.

Subagent dispatch — симулирует выполнение скилла на тестовом сценарии. Проверяет, что инструкции SKILL.md приводят к correct output.

- [ ] **Step 1: Dispatch behavioral validation subagent**

Use `Agent` tool. Prompt:

```
You're simulating an operator-product-spec session. You'll play the role of an LLM agent following SKILL.md instructions.

Setup:
- Read: hi_flow/skills/product-spec/SKILL.md (your instructions).
- Read: hi_flow/skills/product-spec/references/*.md (templates + example).
- Pretend operator just invoked you with prompt: "Запускаем продуктовую спеку для бренд-нового ERP-проекта. Это будет демонстрационный ERP для маленькой производственной компании, начнём с коммуникационного модуля."

Walk through the entire skill flow:

1. Session setup — что ты делаешь? Glob check, identification of active spec, etc.
2. Operator dump — какой broad-вопрос задаёшь? (Покажи)
3. Probing — пройди Шаги 1-3 (framing, segmentation, jobs) с симулированными operator-ответами. Покажи как ты:
   - Определяешь тип проекта (коммерческий)
   - Спрашиваешь buyer outcomes
   - Энумерируешь user segments
   - Получаешь jobs per segment
4. Шаг 4 — domain feature enumeration. Применяешь D2 три-test gate. Покажи applied test для one feature.
5. Шаг 5 — enabler derivation. Применяешь D9 probe table. Симулируй один full probe → answer → enabler creation.
6. Шаг 12 closure — покажи scope confirmation prompt и integrity validation steps.

Return findings:
- Did you find все нужные инструкции в SKILL.md?
- Где инструкции были ambiguous / missing / contradictory?
- Соответствует ли финальный (симулированный) output template'у в references?
- Любые gaps между «тем, что говорит SKILL.md» и «тем, что нужно для completion сессии»?

Под 800 слов финальный отчёт.
```

- [ ] **Step 2: Address findings**

Read subagent report. Fix instructional gaps / ambiguities inline.

- [ ] **Step 3: Commit fixes if any**

```bash
git add hi_flow/skills/product-spec/
git commit -m "fix(product-spec): address behavioral validation findings"
```

---

### Task 12: Closure — ARCHITECTURE.md Module Map + implementation report

**Files:**
- Modify: `ARCHITECTURE.md` — Module Map updated (product-spec PLANNED → BUILT v0.1.0).
- Create: `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design-report.md` — implementation report per CLAUDE.md global instruction.

- [ ] **Step 1: Update ARCHITECTURE.md Module Map**

Найти запись product-spec в ARCHITECTURE.md (изначально PLANNED). Обновить:

```diff
 #### `hi_flow/skills/product-spec/` (planned)
-- **Status:** PLANNED (low priority — operator strong zone). **Purpose:** Product-level декомпозиция продукта на фичи + roadmap + cross-feature deps.
+- **Status:** BUILT (v0.1.0)
+- **Path:** `hi_flow/skills/product-spec/`
+- **Purpose:** Product-level top-down декомпозиция: одна продуктовая спека на одну итерацию + per-product backlog (shipped как pointers, parked / deferred full content). Двенадцатишаговая probing taxonomy с adaptive depth по типу проекта.
+- **References:** product-spec-template.md, product-backlog-template.md, example-contact-tracker-mvp.md.
+- **Spec:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`. **Report:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design-report.md`.
```

Также — Current Status section обновить, убрать «PLANNED» для product-spec из «Не начато».

- [ ] **Step 2: Write implementation report**

Per CLAUDE.md global instruction — отчёт `<spec-path>-report.md` рядом со spec'ой:

```markdown
# Implementation Report: hi_flow:product-spec design

**Spec:** docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md
**Date:** 2026-05-10 (планирование) / [actual implementation date]
**Status:** completed

## What was done

- Implemented `hi_flow/skills/product-spec/SKILL.md` per design spec D1-D9 + D11-D18.
- Created three reference files: product-spec-template.md, product-backlog-template.md, example-contact-tracker-mvp.md.
- Updated plugin manifest (.claude-plugin/marketplace.json + hi_flow/.claude-plugin/plugin.json) — product-spec упомянут в skill list.
- Updated ARCHITECTURE.md Module Map: product-spec PLANNED → BUILT v0.1.0.
- Spec compliance review (subagent) — passed [N findings, fixed].
- Behavioral validation (subagent) — passed [N findings, fixed].
- New project-specific principle P6 (operator escalation discipline) добавлен в ARCHITECTURE.md.

## Deviations from spec

[Заполняется по результатам имплементации. Если deviations нет — None.]

## Issues discovered

[Заполняется по результатам имплементации. Если issues нет — None.]

## Open items

- OQ11 (boundary с arch-spec) — отложено до arch-spec design.
- OQ12 (feature-spec наследование product-context) — отложено до review feature-spec после первого боевого прогона.
- OQ13 (Mermaid readability на больших продуктах) — отложено до боевого прогона на нетривиальном продукте.
- OQ14 (Mermaid helper script alternative) — parked, пересмотр при reliability issues.
- OQ15 (file location convention для семейства) — отдельная микро-сессия.

## Next step

Боевой прогон скилла на ERP-проекте оператора (per OQ1 в ARCHITECTURE.md). После прогона — feedback в скилл (если выявятся gaps) либо переход к design `arch-spec`.
```

- [ ] **Step 3: Final commit and verification**

```bash
git add ARCHITECTURE.md docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design-report.md
git commit -m "docs(product-spec): update Module Map BUILT v0.1.0 + implementation report"
```

Verify final state:

```bash
git log --oneline | head -15
ls hi_flow/skills/product-spec/
ls hi_flow/skills/product-spec/references/
```

Expected: ~10-12 commits matching task structure, full directory structure present.

---

## Self-Review (выполняется author'ом плана перед сдачей в исполнение)

После написания плана — пройтись свежим взглядом:

1. **Spec coverage:** все D-decisions D1-D9, D11-D18 имеют соответствующие task'и в плане? Да — Task 2 (Process flow + D8 + D13), Task 3 (D11 + D5 + D7), Task 4 (D14, D15, D17, D18), Task 5 (D9, D10 — но D10 удалён, D2/D3/D4/D6 в template), Task 6/7/8 (templates + example отражают D6/D12/D17), Task 10 (compliance check D1-D18).

2. **Placeholder scan:** проверить план на «TBD», «implement later», «similar to Task N». Найти и заменить если есть. (Перепроверено: «BODY TBD» в Task 1 step 2 — это intentional placeholder для скаффолда, заменится в Task 2).

3. **Type consistency:** имена feature ID, секций, статусов согласованы между tasks (например, F-id-2 в Task 4 step 1 совпадает с F-id-2 в Task 8 example). Status field values draft/signed/shipped используются единообразно.

4. **Inter-task ordering:** Task 2-5 batched по P5 — последовательный SKILL.md write. Tasks 6-8 references могут идти параллельно (no dependencies). Task 9 metadata требует все skill files в месте. Tasks 10-11 reviews — subagent, после implementation. Task 12 closure — последний.

5. **References valid:** ссылки в SKILL.md / references на design doc и memory корректны. Memory references (feedback_plain_language_conditional.md) — операционно полезны для агента-исполнителя.

Если найдены issues в self-review — fix inline, не re-review.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-10-hi_flow-product-spec.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review между tasks, fast iteration. Per P5 — markdown task'и батчатся (Tasks 2-5 как один dispatch вместо четырёх). Total ожидаемых dispatches ~10-12.

**2. Inline Execution** — execute tasks в этой sessии через executing-plans, batch execution с checkpoints для review.

Какой подход выбираешь?
