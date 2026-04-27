# Skill Design — Anti-Patterns и Best Practices

**Date:** 2026-04-27
**Source:** best-practice review SKILL.md `hi_flow:feature-spec` против Anthropic канонов и superpowers reference skills.
**Audience:** будущие design-сессии скиллов (`product-spec`, `arch-spec`, и любые последующие в семействе `hi_flow:`).

**Назначение:** короткий чеклист анти-паттернов, на которых мы споткнулись при первом скилле. Применять при дизайне следующих, чтобы не делать те же ошибки. Не теория — конкретные правила с примерами «было / стало».

---

## Принципиальное разделение: SKILL.md vs OUTPUT

Это самое важное. Многие наши ошибки сводились к смешиванию двух разных артефактов:

| Артефакт           | Аудитория  | Язык              | Стиль                 |
|--------------------|------------|-------------------|-----------------------|
| **SKILL.md**       | **Claude** | English (preferred) | Imperative («do X», «help operator do Y») |
| **OUTPUT артефакт** (product-spec.md, arch-spec.md, ...) | **Оператор-продуктолог** | Русский | Plain product language |

**Plain language principle применяется к OUTPUT, не к SKILL.md.** SKILL.md — это инструкции для LLM. Claude лучше понимает английский (Anthropic подтверждает: тестируется лучше). Operator никогда не читает SKILL.md в ходе работы — он читает OUTPUT.

**Что в SKILL.md остаётся русским:**
- Trigger phrases в frontmatter `description` (это user-facing matchers).
- Embedded operator-facing dialogue inside `>` blocks (то, что Claude должен сказать оператору).
- Имена секций в шаблонах OUTPUT (e.g. «## Цель», «## Контракт входа» — описывают content, который должен быть на русском).
- Russian terminology, ссылающаяся на OUTPUT structure (e.g. «Открыто», «Связи»).

Всё остальное в SKILL.md — English.

---

## Анти-паттерны, на которых мы споткнулись

### 1. Description в frontmatter суммирует workflow

**Анти-паттерн:**
```yaml
description: Use when X. Conducts structured brainstorm with hierarchical fork discovery using 8-category probing taxonomy + HAZOP guidewords + premortem. Outputs product-spec.md with cell-based decision tree, cross-cutting policies, reusable sub-policies. Solo-founder oriented, plain product Russian by default.
```

**Почему плохо:** Anthropic документирует — когда description суммирует процесс, Claude следует description и **пропускает body**. Workflow знание остаётся в body, наружу не торчит.

**Правильно:**
```yaml
description: Use when operator says X, Y, Z phrases. Produces product-spec.md for a single feature.
```

≤300 chars. Триггеры + краткое «когда применять». Без описания HOW.

---

### 2. Дублирование триггеров между frontmatter и body

**Анти-паттерн:** В body есть секция `## Activation` со списком тех же фраз, что уже в `description`.

**Почему плохо:** Чистое дублирование. Body должна добавлять смысл, не повторять frontmatter.

**Правильно:** Триггеры **только** в `description`. Если хочешь в body — описывай **симптомы / категории контекста**, не точные фразы. Например:
```markdown
## When to use

The operator wants to think through a feature's product decisions before architecting — needs a structured way to surface edge cases, hard policies, and similar-looking situations needing different responses.
```

---

### 3. Skill пытается решать «нужно ли мне запускаться»

**Анти-паттерн:** В body skill'а — proposal оператору с вариантом «skip» («может, мне не запускаться?»).

**Почему плохо:** К моменту, когда skill body выполняется — controller (главный agent) уже решил, что skill релевантен. Skill — **executor**, не **gatekeeper**. Решение «должен ли я запускаться» — задача controller'а через description matching. Skip-предложение от skill'а к оператору — некорректная декомпозиция ролей.

**Правильно:** Skill всегда выполняется, когда вызван. Если есть **варианты режима** (например, «direct vs brainstorm»), это **mode selector** — не «should I run», а «given input, which approach». Skip — недопустим.

---

### 4. Анти-триггеры в body

**Анти-паттерн (наша **ошибка**):** Думали, что анти-триггеры — это decomposition smell.

**На самом деле:** Anti-triggers — **задокументированный best practice** для near-miss disambiguation. Когда есть похожие триггеры, могущие случайно совпасть с нашими (например, «исследуй X» — research, не product spec), их **полезно** явно перечислить как «не активируется».

**Правильно:**
```markdown
## Anti-triggers (do NOT auto-activate)

- "Bare feature request" («хочу добавить X», «нужна фича Y») — could be research, brainstorm, or architecture. Operator must use explicit trigger.
- "Research about external systems" («собери информацию», «анализ конкурента») — research task, not product spec.
- "Implementation request" («реализуй X», «нужна архитектура для X») — different skill territory.
```

---

### 5. Cost-asymmetry / trade-off reasoning многословно

**Анти-паттерн:** В body 3-5 строк объяснения «почему default = brainstorm» через анализ false-positive vs false-negative cost.

**Почему плохо:** SKILL.md — instructions, не essay. Reasoning принадлежит design doc'у. Skill хочет короткой команды.

**Правильно:**
```markdown
**Default: brainstorm.** When in doubt, choose brainstorm.
```

Если есть конкретная типичная rationalization, которую надо контрить — используй **Common Rationalizations table** (canonical pattern из `systematic-debugging`):

```markdown
## Common Rationalizations

| Thought | Reality |
|---|---|
| "Operator's input looks complete, direct should be enough" | Direct missing forks → architectural debt. Choose brainstorm. |
```

---

### 6. Skill знает о соседних фазах / pipeline position

**Анти-паттерн:** Секция «Контракт с следующей фазой» / упоминания типа «output поступит в `arch-spec`».

**Почему плохо** (частично; см. nuance ниже): Skill должен быть loosely coupled. Receive input → produce output → done. Что было до и что будет после — **не его дело**. Поведение skill'а **не должно меняться** в зависимости от знания о соседях.

**Nuance — что **разрешено**:**
- Producing well-defined output (формат описан, его получатели знают как читать).
- В description / handoff упоминать имя следующего skill'а: «output is consumed by arch-spec». Это routing, не behavior coupling.

**Что запрещено:**
- Behavior, меняющееся по знанию о фазах: «если pre-phase showed Y, do X» — нет.
- Длинные разделы про contracts с соседями. Если есть единственное правило escalation — это просто rule, а не contract.

**Правильно:** Лаконичное упоминание handoff в нужном месте (например, в финальной части skill'а: «output the file at <path>; controller will hand off to next skill if operator requests»). Без отдельной секции «контракт с фазой N».

---

### 7. Subsection numbering без parent'а

**Анти-паттерн:** `### 3.3.1.`, `### 3.3.2.`, `### 3.3.3.` — но `## 3.` нигде нет.

**Почему плохо:** Visible structural break — читатель видит numbered child без numbered parent. Canonical skills вообще не используют numbered subsections.

**Правильно:** Просто `### Operator-dump`, `### Agent probing`, `### Closure`. Без чисел.

---

### 8. Descriptive voice вместо imperative

**Анти-паттерн:**
```markdown
This skill leads the operator from a feature request to a signed product-spec.md...
```

**Почему плохо:** Skill — это **инструкции Claude'у**, не описание skill'а в третьем лице. Должно читаться как команда.

**Правильно:**
```markdown
Help the operator turn a feature request into a signed product-spec.md...
```

«Do X», «Help operator do Y», «Walk through Z» — императив. Не «this skill does X».

---

## Дополнительные принципы

### Length discipline

Canonical superpowers skills (brainstorming, systematic-debugging, writing-plans) — 150-200 строк. Наш первый скилл стартовал с 453, после фиксов — 284. **Если новый скилл лезет за 300+ строк — reasonable bloat alert.** Пересмотри разделы:
- Self-machinery (proposals, gates, meta-rules) часто over-specified.
- Reasoning эссе вместо одной строки + Rationalizations table.
- Дублирование между разделами.

Probing taxonomy / per-category procedures / output format — это **legitimate reference content**, оно может быть длинным. Бороться надо с meta-bloat, не reference bulk.

### Consistency: язык и voice

- Body — English imperative.
- Embedded operator-Claude dialogue — Russian (что Claude должен сказать).
- Output format examples — Russian section names (output is Russian).
- Frontmatter description — bilingual: English explanation + Russian trigger phrases.

### Validation cadence

**Применяй best-practice review РАНО, не в конце.** В сессии 1 мы сделали review только после полного draft'а. Лучше:
- После 2-3 разделов SKILL.md — quick canonical-comparison check.
- После полного draft'а — full review (как сейчас).
- После исправлений — sanity check, не повторили ли паттерн в другом месте.

Это снижает rework. У нас был один rework cycle (8 фиксов в финале) — мог бы быть нулевой при early validation.

---

## Чеклист для design сессии нового скилла

Применяй до того, как зафиксировать SKILL.md:

- [ ] **Frontmatter description ≤300 chars, только триггеры + when-to-use, не how.**
- [ ] **Body не дублирует триггеры из description** (если есть body-section про triggers — это симптомы / категории, не точные фразы).
- [ ] **Anti-triggers present** для near-miss disambiguation (если применимо).
- [ ] **No skip path** в self-assessment / mode selection.
- [ ] **No cost-asymmetry essays** — только imperative defaults + опционально Rationalizations table.
- [ ] **No явных «контрактов с фазами»** — handoff одной строкой, не отдельной секцией.
- [ ] **Subsections не numbered** (или с правильным parent).
- [ ] **Imperative voice везде** в body — «do X», «help operator do Y», не «this skill does X».
- [ ] **Body in English**, Russian — только в operator-facing literals + output examples.
- [ ] **Length ≤300 строк** для типичного скилла (probing taxonomies могут быть длиннее).
- [ ] **Sample comparison** — открой canonical skill (например, brainstorming) и сравни структуру. Если очевидно длиннее или иначе организован — почему?
- [ ] **Self-Review step + User Review Gate присутствуют** перед финализацией output (см. ниже).

---

## Обязательный финал spec-производящего скилла: Self-Review + User Review Gate

Это **canonical pattern** из Anthropic brainstorming skill. Его легко пропустить (мы пропустили при первом проходе). Нельзя.

### Структура финала

После того как content output'а сформирован, но **до** предъявления оператору:

1. **Write output to file** (по configured path).
2. **Self-Review через субагента** с изоляцией контекста (per global CLAUDE.md operator-rule). Main agent immersed в content и подвержен confirmation bias — fresh subagent объективнее. Передавать: path к файлу + checklist. **No conversation history.**
3. **Apply fixes inline** по findings субагента. **No re-review** — fix and move on (per Anthropic канон).
4. **User Review Gate** — explicit предъявление оператору с фразой типа «Spec written to `<path>`. Please review and let me know if you want changes before we move to the next phase.»
5. **Wait for operator response.** Если правки — apply + re-run Self-Review. Только после approval — переход к следующей фазе.

### Self-Review checklist (адаптируй под уровень скилла)

Базовые 4 чека (из Anthropic канона):
- **Placeholder scan** — TBD / `<placeholder>` / vague text / open items без обоснования.
- **Internal consistency** — секции не противоречат друг другу.
- **Scope check** — артефакт focused на свой уровень, не сполз в соседний.
- **Ambiguity check** — формулировки однозначны, status и cardinality консистентны.

Плюс **format compliance** check специфичный для семейства hi_flow:
- Все forks имеют status + cardinality tags.
- Inline vs cell branches правильно (ID ⇔ cell).
- Cross-cutting forks в CC секции, не nested.
- Reusable sub-policies factored как P-NAME.

Плюс уровневые чеки (для arch-spec — fitness function declarations completeness, Mermaid graph correctness, escalation criteria coverage; для product-spec — feature decomposition completeness, cross-feature deps mapped, etc.).

### Где это в SKILL.md

Раздел между Closure и Operational Rules. См. `hi_flow/skills/feature-spec/SKILL.md` после раздела «Closure» как референс — там `### Self-Review (via subagent with isolated context)` + `### User Review Gate`.

---

## References

- **Anthropic Skill Authoring Best Practices:** https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- **Claude Code Skills Doc:** https://code.claude.com/docs/en/skills
- **Complete Guide to Building Skills (PDF):** https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- **anthropics/skills repo (skill-creator example):** https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
- **obra/superpowers writing-skills:** https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md
- **Local canonical examples:** `~/.claude/plugins/cache/superpowers-marketplace/superpowers/5.0.7/skills/{brainstorming, writing-skills, writing-plans, systematic-debugging}/SKILL.md`

---

## Применимость

Этот документ — для **дизайна и валидации SKILL.md**. К **формату output артефактов** (product-spec.md, arch-spec.md и т.д.) не применяется — там действуют другие правила (Plain language principle, аудитория-продуктолог, форматные конвенции семейства). Не путай слои.
