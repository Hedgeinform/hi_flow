# Handoff: design `hi_flow:product-spec` и `hi_flow:arch-spec`

**Date:** 2026-04-27
**Source session:** дизайн `hi_flow:feature-spec` (2026-04-26 — 27)
**Audience:** будущие сессии, в которых будут проектироваться `product-spec` и `arch-spec`.

**Назначение документа:** дать достаточный контекст следующим сессиям, чтобы они могли начать с осмысленного места без перечитывания всей предыдущей сессии. Это hand-off, не спека.

---

## 1. Контекст и место в семействе

Семейство `hi_flow` — методология Three-Phase Flow для solo+AI разработки. Реализуется как Claude Code плагин на github.com/Hedgeinform/hi_flow.

**Текущее состояние семейства:**

| Skill                    | Уровень              | Статус       |
|--------------------------|----------------------|--------------|
| `hi_flow:product-spec`   | Phase 1, product     | **TO DESIGN** (next session) |
| `hi_flow:feature-spec`   | Phase 1, feature     | READY (v0.1.0, в реальном тесте ещё не был) |
| `hi_flow:arch-spec`      | Phase 2              | **TO DESIGN** (session после product-spec) |
| `hi_flow:impl-plan`      | Phase 3              | parked — Superpowers TDD пока покрывает |
| `hi_flow:fitness`        | cross-cutting (gate) | parked       |
| `hi_flow:sanity-check`   | cross-cutting        | parked       |
| `hi_flow:handoff`        | cross-cutting        | parked       |

Артефакты feature-spec для referencing:

- Design spec: `docs/superpowers/specs/2026-04-26-hi_flow-feature-spec-design.md` (этот же репозиторий)
- Implementation plan: `docs/superpowers/plans/2026-04-26-hi_flow-feature-spec.md`
- Implementation report: `docs/superpowers/specs/2026-04-26-hi_flow-feature-spec-design-report.md`
- Reference example: `examples/goal-setting-product-spec.md`
- Live skill: `hi_flow/skills/feature-spec/SKILL.md` + `references/`

---

## 2. Решения, принятые для product-spec и arch-spec в текущей сессии

Что уже зафиксировано (не нужно переоткрывать в следующих сессиях):

### 2.1. `hi_flow:product-spec`

- **Уровень декомпозиции:** product → features. Один уровень над feature-spec.
- **Trigger активации:** будет explicit content-specific (например «декомпозиция продукта», «product spec для X», «разбор продукта на фичи»). Конкретный список — design в новой сессии.
- **Self-assessment:** тот же pattern, что у feature-spec (skip / direct / brainstorm с conservative default). Адаптировать факторы под product-уровень.
- **Output:** product-spec.md, который содержит:
  - Список фич с краткими описаниями (каждая — кандидат для feature-spec).
  - Меж-фич dependencies / interactions.
  - Roadmap / последовательность реализации.
  - Стратегические развилки product-уровня (что включаем / не включаем, какие компромиссы).
- **Что НЕ делает:** не вызывает feature-spec автоматически. Выдаёт список — оператор затем для каждой фичи отдельно запускает feature-spec.
- **Критическая отличие от feature-spec:** развилки на product-уровне — **стратегические** (например «делаем ли модуль склада»), не **поведенческие** (как F1.3.2 в goal-setting). Природа решений другая, но cell format переиспользуется.

### 2.2. `hi_flow:arch-spec`

Из изначального видения оператора (записано в этой сессии):

- **Архитектура должна прямо следовать из продукта.** Input — product-spec.md (output feature-spec). Архитектурные решения выводятся из продуктовых, не изобретаются параллельно.
- **Fitness functions methodology применяется в полном объёме.** Это ядерная часть arch-spec — не парковочная. Декларация архитектурных инвариантов (структурных + dynamic) в формате, пригодном для автоматической проверки. Static fitness functions = dependency-cruiser-стиль graph constraints; dynamic = latency budgets, error rates; triggered = pre-merge gates; continual = monitoring. Baseline freeze (FreezingArchRule паттерн) для brownfield.
- **Phase 2 → Phase 1 feedback loop:** если архитектурное проектирование показывает, что конкретное продуктовое решение даёт неоправданное усложнение — агент сообщает оператору, либо возвращаемся на product-spec / feature-spec для упрощения, либо принимаем расширение архитектуры осознанно.
- **Раздел Summary:** обязательная компактная сводка архитектурных принципов. Оператор читает arch-spec менее детально, чем product-spec — ему нужен якорь для быстрого восприятия.
- **Визуальный граф связей (Mermaid):** обязательный элемент. Был запаркован в feature-spec, но в arch-spec он ядерный. Описан оператором как «аналог канваса n8n для ПО». Нативный markdown-рендер (Mermaid в `.md`) — стартовая опция.
- **Phase 2 → Phase 3 эскалация:** агент на Phase 3 (implementation) дёргает оператора **только** при объективном влиянии на UX / безопасность / стоимость / сложность поддержки. Эскалация включает: обоснование на что повлияет ответ, плюсы/минусы вариантов. **Запрещено:** «на каком языке хочешь, JS или TS?» без обоснования влияния. Эта дисциплина формализуется в arch-spec (он определяет, что должно быть зафиксировано в архитектуре, чтобы Phase 3 не дёргал оператора по мелочам).

### 2.3. Контракт между фазами

- **Каждая фаза self-assessment'ит и предлагает оператору skip / direct / brainstorm.** Conservative default = brainstorm.
- **Каждая фаза не вызывает следующую автоматически.** Оператор инициирует переход.
- **При обнаружении ambiguity на каком-то уровне — эскалация оператору**, а не автоматический возврат на предыдущий уровень.
- **PRD-as-standalone:** артефакт каждого уровня самодостаточен для своего content (product / feature / architecture). ARCHITECTURE.md проекта читается отдельно для архитектурного контекста, не дублируется в spec'и.

---

## 3. Что переиспользуется из feature-spec design

В новых сессиях не нужно переизобретать:

- **Cell-формат forks:** `### Fx [decision: ...] [status: ...] / Resolution: ... / Branches [XOR/OR/OPT] / Открыто / Связи / Examples`. Переносим в product-spec и arch-spec без изменений.
- **Hierarchical IDs (Cockburn-style):** `F1, F1.3, F1.3.2.1`. Семантические prefixes для категорий (`F-life-`, `F-disamb-`, `F-integ-`, `CC`, `P-`).
- **Status tags:** `RESOLVED / OPEN / OUT-OF-SCOPE / DEFERRED`.
- **Cardinality tags:** `[XOR / OR / OPT]`.
- **Cross-cutting policies (CC) и reusable sub-policies (P-NAME):** структуры применимы на всех уровнях.
- **Sample dialogs:** возможно нужны и в product-spec (что оператор скажет и как агент декомпозирует), и в arch-spec (как Phase 3 будет общаться с агентом). Ревизия по ходу design.
- **Plain language principle:** аудитория всех трёх спек — продуктолог, не разработчик. Жаргон только если он широко известен или объективно упрощает.
- **Coverage-based closure:** probing tax покрыт + premortem пройден + contradiction detection чист. Адаптировать под уровневую taxonomy.
- **Probing taxonomy как floor checklist + adaptive ceiling:** структура «8 категорий + cross-cutting probes + closing premortem» адаптируема. Категории на product / arch уровнях будут другие (декомпозиция, dependencies, roadmap, fitness function categories, и т.п.).
- **Inline vs cell branches:** ID присваивается ⇔ cell существует.
- **Park-and-continue:** оператор может оставить fork в `Открыто`, агент не deadlock'ится.
- **Self-assessment proposal format** (одинаковый для всех скиллов с переменным набором факторов).

---

## 4. Парковки feature-spec, требующие пересмотра

В сессии 5 (после боевого прогона на ERP) ревизия:

1. **Mermaid graph для feature-spec.** В arch-spec он будет ядром. Для консистентности семейства — стоит ли вернуть в feature-spec. Решение естественно принимать после arch-spec design.
2. **Non-functional forks как отдельная категория.** Пограничный вопрос: где живут — product / feature / arch. Решение зависит от того, как arch-spec их формализует.
3. **Temporal step-by-step decomposition (Cockburn extensions).** Удобно для surface forks между шагами user flow в feature-spec. Может оказаться полезным и в arch-spec для component-level extensions.
4. **Out-of-scope как явный probe.** Сейчас inline в Цели / Контракте выхода. Возможно выделение в отдельную категорию даёт лучшую surface для review.

---

## 5. Методология design-сессии (что переиспользовать)

Из этой сессии работает хорошо:

- **superpowers:brainstorming** для design'а. С двумя дополнениями: research-субагенты на ключевые вопросы (frameworks существующие в индустрии + competitive scan), real example во время design для stress-test формата.
- **Build → spec compliance review → behavioral validation** последовательность. Behavioral validation особенно ценна — surface'ит instructions ambiguities, которые spec compliance review пропускает.
- **Subagent-driven implementation с прагматичной адаптацией:** для документационной работы (markdown skill files) объединять последовательные задачи в одного субагента, не по 3 dispatch'а на каждую. Quality gate сохраняется через spec compliance + behavioral review между группами.
- **Writing-plans skill** даёт хороший каркас implementation plan, даже если TDD неприменим (для skill — заменяется structural validation + behavioral validation через subagent simulation).

---

## 6. Открытые вопросы для следующих сессий

### Для product-spec:

- Как формализовать **декомпозицию scope в фичи** — adhoc или есть deterministic procedure? (Возможно, аналог HAZOP guidewords, но для product capabilities.)
- **Roadmap section format:** простой список или нужны зависимости / приоритеты?
- **Cross-feature dependencies:** notation? (Граф? Таблица?)
- **Probing taxonomy на product-уровне:** какие категории заменяют 8 feature-level категорий? Кандидаты: scope boundaries, capability decomposition, user types, integration points, rollout strategy, success metrics, non-functional baselines, risk areas.
- **Self-assessment factors:** какие сигналы триггерят brainstorm vs direct на product-уровне?

### Для arch-spec:

- **Fitness functions specification format** в спеке: декларативный (yaml-like) или прозой? Маппинг на конкретные tools (dep-cruiser для TS, ArchUnit для Java) — на каком этапе?
- **Mermaid graph conventions:** какие nodes (модули? функции?), какие edges (deps? dataflow?), какие boundaries (hexagonal? layers?), какой scope per граф (вся фича? один компонент?).
- **Summary section structure:** список принципов? Описание паттернов? Trade-offs?
- **Phase 3 escalation criteria** — как формализовать «объективно влияет на UX/безопасность/стоимость/поддержку»? Чеклист? Эвристики? Критерии в reference к категориям?
- **Связь с существующим скиллом `architecture`** (управляет ARCHITECTURE.md). arch-spec обновляет ARCHITECTURE.md по ходу или после? Module Map синхронизация?
- **Stack-specificity:** arch-spec language-agnostic? Параметризуется через `~/.claude/architecture/stacks/<stack>.md`?
- **Probing taxonomy на arch-уровне:** boundaries, dependencies, fitness function categories, deployment topology, observability hooks, failure modes, scaling concerns, security boundaries.

---

## 7. План на следующие сессии

1. **Сессия 2 (next):** design `hi_flow:product-spec`. Использовать **этот hand-off** + design spec feature-spec (как образец паттерна) + brainstorming skill.
2. **Сессия 3:** design `hi_flow:arch-spec`. К моменту начала уже есть product-spec design. Здесь снимаются Mermaid и non-functional парковки.
3. **Сессия 4:** боевой прогон на ERP-микрофиче через все три скилла → имплементация → отчёт.
4. **Сессия 5:** ревизия парковок (feature-spec и возможно других) в свете cross-family консистентности и боевого опыта.

---

## 8. Что НЕ парковать на следующие сессии

- **Критические находки боевого прогона** — фиксим сразу, не откладывая.
- **Inter-skill контракт breakage** — если в arch-spec design станет ясно, что feature-spec не даёт достаточно input — фиксим feature-spec, не парковаем.

---

**Свежей сессии:** прочитать этот hand-off + design spec feature-spec + ARCHITECTURE.md + PROJECT_META.md этого проекта. Этого достаточно, чтобы начать.
