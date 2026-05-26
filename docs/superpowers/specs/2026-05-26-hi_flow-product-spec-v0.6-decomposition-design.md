# `hi_flow:product-spec` v0.6.0 — Decomposition Phase Design

**Status:** draft
**Date:** 2026-05-26
**Type:** major version bump к design spec 2026-05-10 (amendment-style, focused на новой phase)
**Source handoff:** `docs/handoffs/2026-05-26-product-spec-v0.6-decomposition-design-handoff.md`
**Original design spec:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`
**Previous amendment:** `docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment.md`
**ARCHITECTURE anchor:** D17 (decomposition phase = closure phase product-spec'а, not отдельный скилл)

---

## Context

В retrospective session 2026-05-25 (REH-ERP first iteration, 33 функции / 13 модулей) обнаружен структурный gap между двумя скиллами семейства:

- **product-spec output** — замороженная спека на N функций с dependency graph через поле `Зависит от`.
- **feature-spec input** — одна функция или кластер с локальным контекстом (upstream / downstream, CC, Sf).

Между ними отсутствует механизм (а) кластеризации функций в feature-spec sessions, (б) топологического sort'а по DAG'у, (в) передачи релевантного контекста (CC, Sf, upstream / downstream, parked refs) в feature-spec на вход.

D17 фиксирует архитектурное решение: decomposition phase = closure-phase product-spec скилла, не отдельный скилл семейства. Эта спека определяет **mechanics** того, как decomposition phase работает.

### Scope decisions (зафиксированы в дизайн-сессии)

1. **Session modes:** Fresh + Update (без new iteration mode).
2. **Decomposition modes:** только initial decomposition (без re-decomposition при изменениях спеки).
3. **Версия:** v0.6.0 (major bump — новая phase это значительное расширение).
4. **Формат спеки:** amendment-style focused design (как v0.5.0 amendment), не full re-design.

Эти decisions — итог dialogue в дизайн-сессии. См. Open Questions в конце спеки про обоснования каждого.

---

## Out of scope

Зафиксировано как out of scope v0.6.0, идёт в amendments v0.6.1+ или v0.7:

- **Re-decomposition mechanism** при изменениях active спеки (добавил / удалил / разделил / слил функции после первоначальной decomposition). Workaround v0.6.0 — manual delete plan directory + re-trigger Entry B.
- **New iteration mode** + committed pointers в bundle reuse cross-iteration (handoff §6 Q7 resolution — N/A в v0.6.0, так как new iteration mode целиком out of scope). Идёт следом за full new iteration mode support — определит, ссылается ли bundle reference на `backlog § F-X` или на оригинальную spec для committed predecessors.
- **feature-spec companion update** (handoff §6 Q6 resolution) — чтобы feature-spec auto-читал bundle как input. v0.6.0 — operator manually прикрепляет bundle файл к feature-spec session. Auto-read — отдельная сессия amendment'а feature-spec'а после v0.6.0.
- **arch-spec scope** — не трогаем, ещё не реализован.
- **Migration mechanism для legacy backlog terminology** (Shipped → Committed find-replace в существующих backlog'ах) — отложено до v0.7+. v0.6.0 backlog не читает committed pointers (нет new iteration mode), backlog terminology resilience не требуется.
- **Full standing-policy mechanism (pt 11 retrospective improvements list — см. v0.7 design handoff)** — в v0.6.0 только минимальный flag-кандидат, full auto-detection / migration в v0.7.
- **Hard enforcement frozen invariant** для plan directory (файловая защита от edits) — soft guideline в v0.6.0, hard enforce в v0.6.1+.
- **Status auto-update в roadmap** через feature-spec → roadmap callback. v0.6.0 — manual operator update. Auto — v0.6.1+ через feature-spec amendment.

---

## A1. Trigger logic — два entry points

### Проблема

Decomposition phase должна стартовать в двух контекстах:

1. **Fresh mode closure** — спека только что прошла полное Closure (Шаг 12), статус flipped `draft → signed`. Естественная точка triggering — сразу после flip'а.
2. **Update mode initial decomposition** — спека была подписана ранее (например, до v0.6.0 implementation), плана нет. Оператор хочет сгенерить план на существующей спеке. Триггер — на старте сессии.

Один универсальный auto-trigger не подходит — нарушает visibility (тот же урок что и v0.5.0 silent defaults). Нужен explicit gate в обоих контекстах.

### Дизайн

Два entry points + spec metadata marker.

**Entry A — explicit gate в Шаге 12.4 (после status flip).**

Сразу после `draft → signed` flip'а в Шаге 12.4 скилл говорит оператору:

> *«Спека подписана. Готов перейти к фазе разбиения на блоки — сгенерирую план реализации и контекстные пакеты для feature-spec сессий по каждой группе функций. Запустить сейчас?*
>
> *1. Да — генерирую план и пакеты, потом сессия закрыта.*
> *2. Отложу — план не делаем сейчас, потом сам запущу (новой сессией на эту же спеку).*
> *3. Не нужно — план не требуется для этой спеки (например, single-cluster продукт, разбивать нечего)».*

**Поведение по ответу:**

- `1` (да) → переход в decomposition phase (A2-A5 mechanics).
- `2` (отложу) → end session, маркер не пишется. Entry B при следующей сессии естественно detect'нёт «signed + no plan» и предложит снова.
- `3` (не нужно) → write маркер `decomposition: skipped` в metadata спеки. Entry B видит маркер и не auto-prompt'ит. Operator может override: удалить маркер вручную из метаданных, либо сказать «запусти decomposition phase» в новой сессии (skipping detection).

**Entry B — session setup detection (initial decomposition в update mode).**

Расширение существующего `### Session setup` block'а SKILL.md. После Glob-проверки в `<project>/docs/specs/`, если найдена `signed` спека:

1. Проверить существование `<slug>-iteration-<N>-plan/` directory рядом со спекой.
2. Проверить отсутствие маркера `decomposition: skipped` в metadata спеки.
3. Если **плана нет И маркера нет** → предложить:

> *«Найдена подписанная спека [path]. Плана разбиения нет. Что делаем?*
>
> *1. Запустить фазу разбиения сейчас — сгенерирую план и контекстные пакеты по группам функций.*
> *2. Открыть update-режим — править саму спеку (добавлять / удалять функции, обновлять scope cuts).*
> *3. Закрыть сессию».*

**Поведение по ответу:**

- `1` → переход в decomposition phase сразу, пропуская Operator dump / Probing / Шаг 12 closure (Closure уже было сделано когда-то ранее).
- `2` → нормальный update mode на спеке (существующий D14 flow).
- `3` → end session, маркер не пишется.

**Spec metadata marker.**

В existing frontmatter спеки (`status: signed`) добавляется опциональное поле:

```yaml
decomposition: skipped   # либо отсутствует, либо "skipped"
```

Два состояния: маркер есть (skipped) или его нет. State «план существует» определяется existence'ом directory, не metadata — single source of truth (D17 spirit, P4 ARCHITECTURE).

`deferred` маркер **не пишем** сознательно: Entry B каждый раз свежо detect'нёт ситуацию и предложит запустить. Если оператор хочет отложить навсегда — выбирает `skipped`.

**Constraint: маркер может ставиться только на `signed` спеке.** Shipped спеки frozen per D18 — добавление маркера к shipped запрещено (no use case: shipped means iteration already in production, decomposition уже либо была сделана, либо не нужна). Если оператор уже flip'нул спеку → `shipped` без decomposition и без маркера — manual workaround: либо пройти весь iteration без plan'а, либо downgrade spec обратно в `signed` (operator manual через правку metadata, скилл не инициирует).

### Затрагивает D-решения

- **Шаг 12.4 (D14 close flow) — extension.** Добавляется gate'ный шаг после status flip'а.
- **Session setup (D15 update mode trigger) — extension.** Новая branch detection «signed + no plan».
- **Spec metadata schema — extension.** Опциональное поле `decomposition`.

### Implementation impact

- `SKILL.md` Шаг 12.4 — добавить gate-block после status flip.
- `SKILL.md` Session setup — добавить detection branch для «signed + no plan + no marker».
- `references/product-spec-template.md` — добавить optional `decomposition: skipped` в описание frontmatter schema.

---

## A2. Cluster boundary dialog

### Проблема

После trigger'а decomposition phase нужно определить кластеры — группы функций для feature-spec sessions. Простой default «один module = один cluster» работает в большинстве случаев, но есть edge cases:

- **Большой module** (≥5 функций) с качественно разными internal patterns — может потребовать split.
- **Cross-module lifecycle** — функции из разных модулей образуют единый блок реализации.

Silent autoclustering — повторение урока v0.5.0 silent defaults (Шаг 5 visibility gap). Cluster boundary — продуктовое решение, не агентское (P6 ARCHITECTURE).

### Дизайн

Default «один module = один cluster» + LLM/deterministic detection split/merge candidates + structured dialog с оператором + batch recovery loop.

**Sub-step 1 — Build default cluster map.**

Для каждого module в `product-spec.md § Section 4` — cluster с тем же slug. Cluster содержит все функции этого module.

**Sub-step 2 — Detect split candidates (LLM-suggestion).**

Per cluster проверка:

- Модуль с ≥5 функциями, И
- Функции внутри образуют ≥2 качественно разные подгруппы по семантике (lifecycle phases типа inbound/outbound; templates vs execution; разные user groups served).

Detection — LLM-suggestion на основе текста карточек (Назначение + Входит + Доступно группам). Не regex, не keyword match.

**Sub-step 3 — Detect merge candidates (deterministic + LLM).**

Per pair of clusters:

- Cross-module dependency density ≥3 deps между парой modules (deterministic count из `Зависит от` карточек), ИЛИ
- Оператор в Operator dump'е или Probing'е явно упомянул cross-module lifecycle (LLM-detection из session conversation).

**Sub-step 4 — Presentation (единая таблица).**

```
Карта групп функций (по умолчанию — один модуль = одна группа):

| # | Группа | Функции | Кандидат к ревью |
|---|--------|---------|-------------------|
| 1 | id | F-id-1..4 (4) | — |
| 2 | org | F-org-1..2 (2) | — |
| 3 | tickets | F-tickets-1..5 (5) | разбить? lifecycle: подача (1+2) vs исполнение (3+4+5) |
| 4 | soft | F-soft-1..5 (5) | разбить? шаблоны (1+4+5) vs выполнение (2+3) |
| 5 | tasks | F-tasks-1..3 (3) | — |
| 6 | crm | F-crm-1..3 (3) | — |
| ... | | | |
| 13 | notif | F-notif-1 (1) | — |

Кросс-блочные связи:
- tickets ↔ comm: 4 зависимости между F-tickets-* и F-comm-2. 
  Объединить как один блок жизненного цикла «заявка + переписка»?

По каждой строке твоё решение: подтвердить / разбить / слить с другой / переименовать / отменить разбиение.
```

**Sub-step 5 — Recovery loop на действия оператора.**

Поддерживаемые операции:

- **Разбить** — операнд: исходный cluster + распределение функций по новым подгруппам. Скилл создаёт новые slug'и (например, `tickets-intake` + `tickets-execution`), распределяет функции, перерисовывает таблицу. Оператор задаёт slug'и (скилл предлагает defaults типа `<orig>-A` / `<orig>-B`, оператор переопределяет на семантически осмысленные).
- **Слить с другой** — операнд: ≥2 кластера + new slug. Создаёт merged cluster, удаляет исходные.
- **Переименовать** — операнд: cluster + new slug. Update без перераспределения функций.
- **Отменить разбиение** — отказ от flagged candidate, остаётся default boundary.
- **Подтвердить** — кластер остаётся как есть (default).

**Batch operations.** Оператор может сказать «разбить tickets как предложено и слить org с tasks» одной репликой → скилл применяет всё атомарно, потом одна обновлённая таблица с финальным состоянием.

**Sub-step 6 — Finalization.**

Оператор: «подтверждаю» / «финально» / «всё ок» → cluster map locked. Переход к A3 (topological sort).

### Затрагивает D-решения

- **Module assignment (D3 module = кластер) — preserved.** Module assignment в Шагах 4-6 остаётся как есть; cluster boundary — отдельный концепт поверх module assignment, активируется только в decomposition phase.
- **Operator escalation discipline (P6) — обязательное соблюдение.** Cluster boundary — продуктовое решение, не агентское. Silent autoclustering запрещён.
- **Visibility принцип (расширение v0.5.0 lesson) — extension.** Все split/merge candidates показываются явно в таблице с reasoning'ом.

### Implementation impact

- `SKILL.md` новый раздел `## Decomposition phase` — sub-section `### Cluster boundary dialog` с детальными процедурами sub-step 1-6 + dialog patterns.

---

## A3. Topological sort + cluster-level cycle handling

### Проблема

После cluster map locked нужно определить порядок реализации. Алгоритм детерминистский — топологический sort по cluster-level dependency graph.

**Важный нюанс:** cluster-level dependency graph отличается от function-level. Function-level deps могут быть ацикличными (поймано Шагом 12.2), но при aggregation до cluster-level могут появиться cluster-level cycles (bidirectional deps между двумя clusters через разные функции в каждом направлении).

Пример: `F-a-1 → F-b-2` и `F-b-3 → F-a-4`. Function-level — ациклично (разные функции в каждом направлении). Cluster-level — cluster-a ↔ cluster-b (cycle).

Cluster-level cycle — genuine new finding, со своим набором резолюций (не сводится к Шагу 12.2 один-к-одному).

### Дизайн

**Sub-step 1 — Build cluster-level dependency graph.**

Алгоритм аналогичен module-level Mermaid algorithm в v0.5.0 Operational Rule 8, но на cluster-level:

1. Для каждой пары кластеров (A, B), A ≠ B: проверить, есть ли в spec'е ≥1 функция кластера A с `Зависит от` ≥1 функции кластера B.
2. Если да → добавить edge `A → B` в граф (один на пару, дедуплицируется до cluster-level).

**Sub-step 2 — Topological sort (Kahn's algorithm).**

1. Start с кластеров без incoming edges (нет upstream deps).
2. Если в одном «уровне» ≥2 кластеров — alphabetical order (стабильно для diff).
3. Remove processed nodes; repeat с newly-eligible.
4. Output: ordered list of clusters + per cluster upstream/downstream/peer lists.

**Sub-step 3 — Tie-breaking visibility.**

Если ≥2 кластера в одном «уровне» (нет относительной зависимости между ними) — отметка **«взаимозаменяемый порядок»** в roadmap.md для каждого из этих кластеров. Field `Взаимозаменяем с:` появляется только при tie-break, иначе omit.

Visibility принцип: оператор видит, что эти кластеры можно реализовывать в любом порядке или параллельно.

**Sub-step 4 — Cluster-level cycle handling.**

При detect'е cluster-level цикла скилл предлагает оператору **три варианта резолва**:

#### Variant 1 — Объединить циклические кластеры

A↔B → один merged cluster. Скилл предлагает new slug (или operator-suggested), оператор подтверждает. Cluster boundary меняется только для участников цикла, остальные кластеры не трогаются. Cycle устранён by definition (один cluster — нет inter-cluster deps между ним и собой).

Подходит когда: bidirectional deps указывают на tight coupling — A и B архитектурно один блок реализации.

Не требует правки спеки. Возврат к Sub-step 2 (topo sort повтор).

#### Variant 2 — Изменить границы кластеров (move function)

Operator: «переместить F-a-3 из cluster A в cluster B». Скилл сначала предлагает кандидатов перемещения — функции, чьи deps участвуют в цикле (например, F-a-3 имеет F-b-2 как upstream — кандидат к перемещению в B). Operator выбирает.

После перемещения — re-build cluster dep graph → re-run topo sort. Если цикл остался — repeat dialog.

Не требует правки спеки, только cluster boundary. Возврат к Sub-step 1 (re-build graph).

#### Variant 3 — Fix underlying function-level dep (focused mini-12.2)

Operator: «зависимость в спеке неправильная, надо править саму спеку».

Скилл запускает **focused Шаг 12.2 recovery loop**, ограниченный участниками цикла:

1. Показать full dep chain: `F-a-1 → F-b-2 → F-a-4 → F-b-3 → F-a-1`.
2. Operator выбирает резолв per existing 12.2 опции:
   - Убрать одну зависимость (указать какую — какая карточка, какой edge).
   - Объединить две функции в одну.
   - Extract общую часть в третью функцию-предка.
3. Скилл применяет правку — Edit tool на spec file (карточка функции в `## Модули и функции`). Перед apply показывает «было → стало» по затронутой карточке. Operator confirm.
4. Скилл пере-прогоняет **полный** Шаг 12.2 на всём function-level графе (не только участниках цикла — правка может создать новые проблемы):
   - Проверка-сирота
   - Разорванная замкнутость
   - Циклические зависимости
5. Если passing → re-build cluster-level graph → re-run topo sort → если clean → continue decomposition.
6. Если 12.2 failing после правки → стандартный 12.2 recovery loop (operator резолвит, может потребоваться несколько правок).

**Visibility constraints:**

- Спека остаётся `signed`, но содержимое изменилось. Скилл явно говорит: *«правка применена к карточке F-a-1, спека остаётся signed».*
- Это inline update mode под капотом, но не объявляется как полноценный update mode (не предлагает другие update операции типа split/merge функций — focused на резолв конкретного цикла).
- Edit `decomposition: skipped` marker не trigger'ит — мы внутри active decomposition phase.

**Relation к D14 / D18 invariants:** `signed` status allows content edits per D14 update mode mechanics. D18 frozen invariant применяется только к `shipped` спеком (после реальной отгрузки в production). Variant 3 — constrained slice of D14 mechanics (только one specific edit for cycle resolution), не violation D18.

**Detect dialog format (единый для всех трёх вариантов):**

```
Найден цикл на уровне групп функций: cluster-A ↔ cluster-B.

Цепочка зависимостей-участников:
  F-a-1 (<Name>) → F-b-2 (<Name>)
  F-b-3 (<Name>) → F-a-4 (<Name>)

(на уровне функций граф ацикличен — разные функции в каждом направлении.
Цикл появился при aggregation до кластеров: A и B имеют bidirectional связи.)

Варианты резолва:
  1. Объединить кластеры A и B в один.
     Подходит если они — единый блок жизненного цикла, разводить нет смысла.
  2. Переместить функцию через границу. Кандидаты:
     - F-a-3 → cluster-B (зависит от F-b-2, можно перенести)
     - F-b-1 → cluster-A (зависит от F-a-4, можно перенести)
     Подходит если одна функция архитектурно ближе к соседнему блоку.
  3. Изменить зависимость в спеке (focused recovery Шага 12.2).
     Подходит если связь по факту ошибочная.

Что выбираешь?
```

После apply'я любого варианта — re-run topo sort. Если новый цикл всплыл — повторение dialog'а.

### Затрагивает D-решения

- **D4 (graph DAG) — extension на cluster-level.** DAG concept расширяется с function-level (D4 original) на cluster-level (новое v0.6.0).
- **Шаг 12.2 (integrity check) — reuse через focused recovery.** Variant 3 использует существующий 12.2 mechanism, focused на участниках цикла.
- **P6 (operator escalation) — обязательное соблюдение.** Cycle resolution — продуктовое решение, не агентское. Три варианта — operator's choice, не автоматический выбор.

### Implementation impact

- `SKILL.md` новый раздел `## Decomposition phase` — sub-section `### Topological sort` с algorithm + sub-section `### Cluster-level cycle handling` с три варианта резолва + dialog patterns + focused 12.2 recovery flow.

---

## A4. Bundle generation per cluster

### Проблема

Для каждого cluster в топологическом порядке — сгенерить **bundle file** с контекстом для feature-spec session. Bundle должен быть self-contained: оператор кидает один файл как input в feature-spec, и feature-spec получает полную картину контекста.

Bundle = pointers + verbatim для коротких items (D17 spirit — асимметричная дисциплина размера записей). 8 элементов фиксированы handoff §4.2.

### Дизайн

**Bundle composition — 8 элементов, derivation per element:**

| # | Элемент | Источник в спеке | Filter | Формат записи |
|---|---------|------------------|--------|---------------|
| 1 | Функции кластера | cluster membership (A2) | — | F-id (Name) + § F-id ref + 1-line из Назначение |
| 2 | Upstream contracts (working pre-conditions) | `Зависит от` функций кластера | функции **вне** кластера | F-id (Name) + § ref + 1-line summary + ссылка на upstream cluster slug |
| 3 | Downstream consumers | reverse pass: кто зависит от наших функций | функции **вне** кластера | то же что upstream + ссылка на downstream cluster slug |
| 4 | CC inheritance (relevant) | § Сквозные политики + `Применяется к` | CC где `Применяется к` includes ≥1 cluster function ИЛИ «всем функциям» | **verbatim** full CC entry |
| 5 | Strategic forks resolved (relevant) | § Стратегические развилки + `Связи:` | Sf где `Связи:` mentions ≥1 cluster function (только RESOLVED, DEFERRED migrated в backlog) | **verbatim** full Sf entry |
| 6 | Backlog parked references | cluster cards' `Не делаем вообще` + backlog § Parked | пытается resolve text → backlog entry; if no match — verbatim phrase без backlog ref | F-id (Name) + § backlog ref + 1-line reason, ИЛИ verbatim text-only |
| 7 | User groups (relevant) | § Section 2 + `Доступно группам` функций кластера | groups mentioned by ≥1 cluster function | **verbatim** group definition |
| 8 | Relevant scenarios | § Section 9 + scenario references | scenarios mentioning ≥1 cluster function | **verbatim** scenario text |

### Принципы derivation

**1. Pointer для длинных, verbatim для коротких.**

Function cards (длинные, 5-10 строк each) — pointers. CC/Sf/groups/scenarios (короткие, 3-8 строк each) — verbatim. Дублирование function content в bundle создало бы SSoT violation; verbatim коротких — economy of context для feature-spec session, не нужно прыгать к спеке.

**2. Filter strictly by reference.**

Bundle включает только то, что explicitly связано с функциями кластера через formal fields:
- `Зависит от` (upstream/downstream)
- `Применяется к` (CC)
- `Связи:` (Sf)
- `Доступно группам` (user groups)
- References в `Не делаем вообще` (parked)
- F-id references в scenarios

Скилл не пытается «прогадать relevance» по семантике текста. Это deterministic filter, не LLM-suggestion.

**3. Empty section visibility.**

Если элемент пустой (например, у личного продукта без user groups — Section 7 пуст для всех bundles) — секция всё равно присутствует в bundle с короткой строкой типа `(нет — функции этого блока не упоминаются в группах пользователей)`. Visibility принцип: оператор видит что скилл проверил, а не молча omit'нул.

**4. CC «всем функциям» — обязательно включается.**

Если CC помечена `Применяется к: всем функциям` — включается в каждый bundle (relevant к любому cluster).

**5. Sf со status DEFERRED — не включается.**

DEFERRED Sf'ы мигрированы в backlog § Deferred при Шаге 12.3. Bundle reading спеки не reads backlog deferred section в v0.6.0. Если deferred Sf нужен для контекста — operator manually добавляет ссылку.

**6. Parked references — edge case резолва.**

Если cluster card упомянул в `Не делаем вообще` фразу типа `auto-classification` — это может или не может resolve'иться в конкретную backlog entry (parked features). Скилл пытается match (semantic LLM-suggestion на name / Назначение parked entries) → если match → pointer на backlog § Parked. Если не match → verbatim phrase из карточки без backlog ref. Operator видит обе ситуации distinct.

**Visibility marker для matched parked refs.** Когда semantic match выбран — bundle показывает entry в формате `**F-X** (Name) — parked, level: detailed. Reason: <reason>. **[matched semantically from carded phrase «<original text»]**`. Это audit trail для оператора — он видит, какая фраза в карточке кластера привела к этому pointer'у, и может проверить корректность match'а при review bundle файла.

**7. Plain language pass.**

После bundle сгенерён — скилл проводит гештальт-проверку по Operational Rule 11 (A7). Pointer'ы (`§ F-id-1`, `§ Section 4`) — стабильные идентификаторы, не переводятся. Free text inside bundle (1-line summaries, edge case explanations) — на plain Russian.

### Размер per bundle

Типичный: 30-60 строк per bundle. Распределение для REH-ERP cluster-tickets:
- Functions list: 5 lines (5 функций × 1 line)
- Upstream contracts: ~4 lines (~4 upstream functions)
- Downstream consumers: ~2 lines
- CC inheritance: ~10 lines (2-3 CC × 3-4 lines verbatim)
- Strategic forks: ~5 lines (1-2 Sf × 3-5 lines verbatim)
- Backlog parked refs: ~2 lines
- User groups: ~6 lines (2-3 groups × 2-3 lines verbatim)
- Scenarios: ~10 lines (1-2 scenarios × 5-8 lines verbatim)
- Empty section placeholders + headings: ~5 lines

Total: ~50 lines, в expected range.

Для REH-ERP при 10-13 кластерах → 10-13 bundle файлов × 30-60 lines каждый ≈ 400-800 lines total bundle content. Manageable для file-based artefact.

### Затрагивает D-решения

- **D17 (asymmetric pointers в backlog) — extension на bundle.** Тот же принцип: pointer для часто-роста / large items, verbatim для bounded / small items. В bundle: function cards (большие, дублирование = SSoT violation) — pointers; CC/Sf/groups/scenarios (короткие, bounded) — verbatim.
- **D4 (plain language) — applies через Rule 11.** Bundle artefact operator-facing.

### Implementation impact

- `SKILL.md` новый раздел `## Decomposition phase` — sub-section `### Bundle generation` с derivation table + принципы + dialog about empty sections.
- Новый reference: `references/bundle-template.md` — pre-baked skeleton bundle файла с placeholders.

---

## A5. Output artefacts — directory structure + frozen invariant

### Проблема

Decomposition phase производит multi-file output: roadmap (для оператора как navigation) + N bundle файлов (per cluster, как feature-spec input). Нужна clear file structure + naming convention + frozen invariant для предотвращения accidental edits.

Single-file output (roadmap + bundles в одном файле) — проигрывает в operator workflow: при подготовке к feature-spec session оператор должен находить нужный cluster в большом файле и copy section, vs просто attach bundle file path. Multi-file → каждый bundle = self-contained file path для attach.

Multi-file output flat в `docs/specs/` — clutter (после 3-5 итераций directory забивается 30-50 файлами). Subdirectory per iteration — правильное grouping.

### Дизайн

**Directory structure.**

```
<project>/docs/specs/
  YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md
  <product-slug>-product-backlog.md
  <product-slug>-iteration-<N>-plan/
    roadmap.md
    bundle-<cluster-slug-1>.md
    bundle-<cluster-slug-2>.md
    ...
```

**Naming conventions:**

- Subdirectory: `<product-slug>-iteration-<N>-plan/`. `<N>` — порядковый номер итерации продукта (из Iteration index бэклога).
- Inside subdirectory: bundle файлы без iteration prefix — контекст задаёт directory. `roadmap.md` — без префикса по аналогии.

**roadmap.md template.**

```markdown
# <Product> — План реализации (итерация <N>)

**Дата создания:** YYYY-MM-DD
**Статус:** signed (план зафиксирован) | shipped (итерация отгружена)
**Исходная спека:** ../YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md
**Всего блоков:** N
**Всего функций:** M

---

## Последовательность реализации

Порядок блоков с учётом межблочных зависимостей. Каждый блок реализуется после своих предшественников. Блоки без относительной зависимости («взаимозаменяемый порядок») можно делать в любом порядке или параллельно.

### 1. <Human name блока> (<slug>)
**Назначение:** 1-2 plain-language строки, что блок делает в продукте.
**Функции:** F-..., F-... (N штук).
**Реализуем после:** <upstream cluster names>, или «ничего (это первый блок)».
**Дальше используется в:** <downstream cluster names>, или «нигде».
**Взаимозаменяем с:** <peer cluster names> — поле появляется ТОЛЬКО при tie-break, иначе omit.
**Статус:** запланирован | в работе | готов.
**Контекст для feature-spec:** [bundle-<slug>.md](./bundle-<slug>.md)

### 2. ...
```

**Поле `Взаимозаменяем с:`** — visibility tie-break (A3 sub-step 3). Появляется только когда topo sort'у пришлось делать выбор между равноценными альтернативами. Иначе omit (нет шума в roadmap).

**Поле `Статус`** — manual operator update в v0.6.0. Auto-callback от feature-spec → v0.6.1+. Initial value при generation — все «запланирован».

**Поле `Назначение` (cluster-level) — derivation rule.** Скилл генерирует 1-2 строки plain-language summary на основе aggregation Назначений функций кластера + cluster slug semantics. LLM-suggestion. **Operator review мандаторен** — после generation скилл показывает proposed cluster Назначения в одной таблице, оператор подтверждает или переписывает per cluster. Это продуктовое решение (как блок видится оператору-управленцу), не агентское autoselection.

**Mermaid в roadmap.md — out of scope v0.6.0.** Cluster-level dependency graph есть в Sub-step 1 A3 (для topological sort), но визуализация в Mermaid не генерируется в roadmap'е. Ordered list + per-cluster upstream/downstream fields достаточны для navigation. Optional Mermaid visualization (по аналогии с module-level Mermaid v0.5.0) — amendment v0.6.1+ при empirical signal что text-only sequence неудобен при ≥10 кластерах.

**bundle-`<slug>`.md template.**

```markdown
# Контекст для feature-spec: <Human name> (<slug>)

**Итерация:** <N>
**Исходная спека:** ../../YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md

---

## Функции этого блока
- **F-...** (Name) — § F-... в спеке. Назначение: <1-line>.

## Зависим от (working pre-conditions)
- **F-...** (Name) — § F-... Назначение. Из блока: <upstream slug>.

(если пусто — «Блок не зависит от других в этой итерации.»)

## Используется (downstream consumers)
- **F-...** (Name) — § F-... Назначение. Из блока: <downstream slug>.

(если пусто — «Блок не имеет потребителей в этой итерации.»)

## Сквозные политики, применимые к блоку (verbatim из спеки)
### CC1. <Name>
**Применяется к:** F-..., F-... | всем функциям
**Resolution:** <verbatim>
**Pattern:** <verbatim, если есть>

(если пусто — «Сквозные политики не применяются к функциям блока.»)

## Стратегические развилки, упоминающие функции блока (verbatim)
### Sf2. <Name> [decision: ...] [status: RESOLVED]
**Resolution:** <verbatim>
**Branches [XOR]:** ...
**Связи:** F-..., F-...

(если пусто — «Развилки итерации не упоминают функции блока.»)

## Из бэклога — отброшенное / отложенное
- **F-...** — parked, level: detailed. Причина: <reason>. См. backlog § Parked.
- «<verbatim фраза из «Не делаем вообще» карточки, не resolved'и в backlog>».

(если пусто — «Карточки блока не ссылаются на отложенное.»)

## Группы пользователей, использующие функции блока (verbatim)
### <Group name>
<verbatim из § Section 2>

(если пусто — «Функции блока без group-specific access.»)

## Сценарии работы, упоминающие функции блока (verbatim из § Section 9)
### Сценарий: <название>
<verbatim narrative>

(если пусто — «В § Section 9 нет сценариев с функциями блока.»)
```

### Frozen invariant

После generation plan'а (как часть Entry A flow, либо отдельный confirm в Entry B flow) — план **frozen**:

**Mutable в v0.6.0:**
- Поле `Статус` в каждом cluster entry roadmap'а (manual progress tracking).

**Immutable в v0.6.0:**
- Content roadmap'а (sequence, dependencies, descriptions, function lists).
- Все bundle файлы (целиком).
- Названия cluster slug'ов.

**Plan status:**
- `signed` — установлен при generation. Соответствует `signed` status спеки.
- `shipped` — flip синхронно со спекой (когда оператор говорит «iter X отгружена» — flip и спеки, и плана).

**Soft enforcement в v0.6.0.** Скилл не блокирует edits (нет файловой защиты — markdown файлы свободно edit'абельны). Frozen invariant фиксируется:
- В SKILL.md как guideline в `## Decomposition phase` секции.
- В roadmap.md frontmatter как декларация status.

Hard enforcement (file-level guard rails, валидация при re-read) — v0.6.1+.

### Workaround для cluster boundary change в v0.6.0

Re-decomposition mechanism не реализован в v0.6.0. Если оператор хочет другие границы кластеров после sign-off:

1. **Manual delete plan directory** (`rm -rf <slug>-iteration-<N>-plan/`).
2. **Re-trigger Entry B** новой сессией → видит «спека signed + плана нет» → предлагает generate заново.
3. Decomposition phase runs from scratch на current spec state.

Это explicit hack, не silent flow. Operator знает что делает. Re-decomposition mechanism как proper UX feature — v0.6.1+.

### Затрагивает D-решения

- **Output artefact count — extension.** D16 / Output Format фиксирует «два артефакта» (spec + backlog). В v0.6.0 добавляется третий тип артефакта (plan directory). SKILL.md `## Output` обновляется.
- **D18 (frozen invariant для shipped спек) — extension на plan.** Тот же принцип immutability для plan'а после generation, кроме одного field (Статус).

### Implementation impact

- `SKILL.md` `## Output` — обновить «два артефакта» на «три типа артефактов» с описанием directory structure.
- `SKILL.md` `## Format Rules` — добавить naming convention для subdirectory + frozen invariant statement.
- `SKILL.md` новый раздел `## Decomposition phase` — sub-section `### Output artefacts` с full templates + frozen invariant + workaround note.
- `references/roadmap-template.md` — новый файл, skeleton roadmap.md.
- `references/bundle-template.md` — новый файл, skeleton bundle.md (упомянут в A4).

---

## A6. Standing-policy candidate flag (pt 11 retrospective accommodation)

### Проблема

Retrospective пункт 11 v0.7 — full standing-policy checker mechanism (auto-detection кандидатов в standing при Шаге 12, migration в backlog § Standing, cross-iteration inheritance tracking). Full mechanism deferred в v0.7 (parallel design handoff exists at `docs/handoffs/2026-05-26-product-spec-v0.7-retrospective-improvements-design-handoff.md`; design + implementation deferred до next product-spec trigger event).

В v0.6.0 decomposition phase — natural place для minimum flag: closure уже произошёл, скилл проходит по спеке для bundle generation, может попутно scan'ить CC и flag'ить кандидатов.

Minimum accommodation в v0.6.0 — single flag-block в roadmap'е, без mechanism. Full mechanism — v0.7.

### Дизайн

**После generation bundle файлов, перед написанием roadmap.md** — single scan:

1. Скан `§ Сквозные политики` спеки.
2. Per CC проверка:
   - Помечена ли как `Inherits: CC-X from <previous spec>` → уже standing inherited, пропускаем.
   - Если **нет** Inherits — проверка content (Resolution + Pattern) на indicators cross-iteration характера:
     - LLM-suggestion на основе текста типа «применяется ко всем функциям системы», «обязательно для всех future features», «во всех итерациях продукта», «глобальное правило».
3. CCs без Inherits и с indicators → **кандидаты в standing**.

**Если кандидаты есть** → блок в конце roadmap.md:

```markdown
## Кандидаты в standing policies (опционально)

Эти сквозные политики потенциально применимы ко всем будущим итерациям продукта. Можно явно зафиксировать как standing в backlog § Standing cross-cutting policies — это сэкономит дублирование в спеках следующих итераций.

- **CC1.** Tenant data isolation.
- **CC3.** SLA timer.

Полный mechanism standing-policy auto-detection и migration — дизайн v0.7. Здесь — только flagging. Зафиксировать сейчас можно вручную в backlog.
```

**Если кандидатов нет** → секция полностью omitted из roadmap.md. Не пишем «нет кандидатов» — это случается часто (single-iteration продукты, узкие CC scope), нет нужды захламлять roadmap.

### Затрагивает D-решения

- **CC inheritance (existing concept) — extension на standing detection.** Existing Inherits mechanism preserved, добавляется detection layer.
- **v0.7 design dependency.** v0.6.0 не conflict'ит с v0.7 full mechanism — flag-блок легко заменим / extendible когда v0.7 implement'нётся.

### Implementation impact

- `SKILL.md` `## Decomposition phase` — sub-section `### Standing-policy candidates (pt 11 minimum)` с алгоритмом scan + format flag-блока.
- `references/roadmap-template.md` — секция «Кандидаты в standing policies» как optional при rendering.

---

## A7. Operational Rule 11 extension — plain language для новых артефактов

### Проблема

v0.5.0 amendment ввёл Operational Rule 11 (Jargon translation) с таблицей перевода internal terms → operator-facing. Decomposition phase в v0.6.0 вводит новые внутренние термины: cluster, bundle, upstream/downstream cluster, topological sort, roadmap, decomposition phase, и т.д. Rule 11 нужно расширить — иначе новые англицизмы протекут в roadmap.md / bundle файлы / operator dialog.

Плюс: оба новых артефакта (roadmap, bundle) — operator-facing. Особенно roadmap — это «обзорная панель» для управленца / продуктолога, максимальная plain-language readability.

### Дизайн

**Extension translation table v0.5.0 на новые v0.6.0 термины:**

| Внутреннее | Operator-facing |
|---|---|
| **Decomposition concepts** | |
| cluster | группа функций / блок функций |
| bundle | контекст для feature-spec |
| upstream cluster | блок, от которого зависим / реализуется раньше |
| downstream cluster | блок, который от нас зависит / реализуется позже |
| peer cluster | взаимозаменяемый блок (можно делать в любом порядке) |
| topological sort | порядок реализации с учётом зависимостей |
| roadmap | план реализации |
| decomposition phase | фаза разбиения на блоки |
| inter-cluster dependency | межблочная зависимость |
| cluster boundary | граница группы функций |
| initial decomposition | первая декомпозиция (этой спеки) |
| re-decomposition | повторная декомпозиция |
| cluster-level cycle | цикл между группами функций |
| **Trigger concepts** | |
| Entry A / Entry B | (не использовать в operator-facing — это internal labels; вместо них «после подписания спеки» / «при открытии сессии на подписанной спеке без плана») |

**Plain language guarantee для новых артефактов.**

К Operational Rule 11 добавляется явное правило для decomposition phase output'а:

> *Bundle и roadmap файлы — operator-facing артефакты. Roadmap — особенно (это «обзорная панель» для управленца / продуктолога; максимум plain-language readability). Bundle — operator-facing, но с большей структурностью где нужно для feature-spec input.*
>
> *После generation каждого файла — гештальт-проверка по тому же стандарту что для product-spec.md и backlog'а. Если кластеризуются ≥2 англицизмов в одном предложении при наличии русских эквивалентов — переписать.*
>
> *Slug'и (cluster slug'и типа `tickets`, `id`, `comm`, F-ID функций типа `F-tickets-1`) — стабильные идентификаторы, не переводятся.*

**Pointer'ы (`§ F-id-1`, `§ Section 4`, `[bundle-id.md](./bundle-id.md)`)** — stable identifiers / navigation references, не subject to plain language pass.

### Затрагивает D-решения

- **Operational Rule 11 (D4 / P1 extension в v0.5.0) — extension table + plain language guarantee для новых артефактов.**

### Implementation impact

- `SKILL.md` Operational Rule 11 — расширить translation table (12 новых entries + extension paragraph про bundle/roadmap plain language guarantee).

---

## Implementation Checklist (для Фазы 2)

После approval'а design'а (User Review Gate) — последовательность точечных правок:

### SKILL.md `hi_flow/skills/product-spec/SKILL.md`

**Top-level structure:**
- [ ] `## Output` — обновить «два артефакта» на «три типа артефактов» (spec + backlog + plan directory). Описание directory structure.
- [ ] `## Process flow` — extend Phase 4 (Closure) description: после Шага 12 включается decomposition phase per A1-A5. Decomposition — **sub-phase внутри Closure** (per D17 «closure-phase product-spec'а»), не отдельная Phase 5.

**Session setup (A1 Entry B):**
- [ ] Добавить detection branch «signed + no plan + no marker» с tri-option dialog.

**Шаг 12.4 (A1 Entry A):**
- [ ] После status flip — добавить gate с tri-option dialog (запустить / отложить / не нужно).

**Новый top-level раздел `## Decomposition phase`** (sub-sections в порядке execution):
- [ ] `### Trigger logic` — Entry A + Entry B summary + metadata marker convention.
- [ ] `### Cluster boundary dialog` — sub-step 1-6 (default map, split/merge detect, presentation, recovery loop, finalization). **Execution order: 1-я sub-phase после triggering.**
- [ ] `### Topological sort` — sub-step 1-3 (build graph, Kahn algorithm, tie-breaking visibility). **Execution order: 2-я sub-phase, после cluster boundary finalization.**
- [ ] `### Cluster-level cycle handling` — три варианта резолва (merge / move function / focused 12.2) + dialog format + visibility constraints. **Запускается inline при detect'е цикла в topological sort, возврат в topo sort после resolution.**
- [ ] `### Bundle generation` — derivation table 8 элементов + принципы + dialog about empty sections. **Execution order: 3-я sub-phase, после topo sort + cycle-free.**
- [ ] `### Standing-policy candidates (pt 11 minimum)` — scan algorithm + flag block format. **Execution order: 4-я sub-phase, после bundle generation, перед roadmap write.**
- [ ] `### Output artefacts` — directory structure + roadmap template + bundle template + frozen invariant + workaround note. **Execution order: 5-я sub-phase — write all files atomically; roadmap включает standing-policy flag-блок если есть кандидаты.**

**Format Rules:**
- [ ] Добавить naming convention для subdirectory `<slug>-iteration-<N>-plan/`.
- [ ] Добавить frozen invariant statement для plan content (mutable = только Статус field).

**Operational Rule 11 (A7):**
- [ ] Расширить translation table на 12 v0.6.0 terms.
- [ ] Добавить extension paragraph про bundle/roadmap plain language guarantee.

### Templates

**`references/product-spec-template.md`:**
- [ ] Frontmatter description — добавить optional `decomposition: skipped` поле.

**Новый файл `references/roadmap-template.md`:**
- [ ] Skeleton roadmap.md с placeholders (header, sequence section, conditional standing policy candidates section).
- [ ] Inline comments для агента про заполнение (как в product-spec-template.md Mermaid skeleton).

**Новый файл `references/bundle-template.md`:**
- [ ] Skeleton bundle.md с placeholders (header, 8 секций с conditional empty placeholders).
- [ ] Inline comments про derivation rules per section.

**`references/product-backlog-template.md`:**
- [ ] Не затрагивается в v0.6.0.

**`references/example-contact-tracker-mvp.md`:**
- [ ] Опционально — расширить с примером decomposition phase output (короткий roadmap + 2-3 bundles). Можно отложить (operator decision при implementation).

### ARCHITECTURE.md проекта

- [ ] Module Map: status update `hi_flow/skills/product-spec/` → BUILT v0.6.0.
- [ ] **Update D17 wording.** Existing D17 описывает output как single file `<product-slug>-iteration-<N>-plan.md`. v0.6.0 implementation вводит **subdirectory** `<product-slug>-iteration-<N>-plan/` с `roadmap.md` + `bundle-<cluster>.md` × N (per OQ-v6-3 design decision). Заменить wording D17 или добавить new D-N с явной нотой «supersedes D17 output file format».
- [ ] Новый D-N entry (next free после D17) фиксирующий decomposition phase implementation mechanics. ID присваивается при apply в Фазе 3.
- [ ] History entry для v0.6.0 implementation.

### Active issues (`docs/active-issues.md`)

- [ ] v0.7.0 retrospective improvements active issue **остаётся** — pt 11 (standing-policy checker) имеет только minimal accommodation в v0.6.0, full mechanism всё ещё в scope v0.7. Backlog terminology resilience (не numbered в v0.7 list, отдельная отложенная задача) — также остаётся в scope v0.7+.

### Implementation report

- [ ] `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.6-decomposition-design-report.md` — после implementation в Фазе 2.

### Post-implementation manual operator action

- [ ] **Pre-боевой прогон REH-ERP fix** — manual rename `Shipped` → `Committed` + `[shipped iterN]` → `[committed iterN]` в `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/reh-erp-product-backlog.md` (перед запуском decomposition на REH-ERP). Migration mechanism как фичу — v0.7+. Manual fix только для существующего REH-ERP backlog'а.

---

## Open Questions (амендмент-уровень)

Зафиксированы в дизайн-сессии — это **closed** open questions, для traceability:

- **OQ-v6-1. Scope сессии design vs implementation.** Operator decision: только design в этой сессии, implementation — отдельная сессия после sign-off. Обоснование — соблюдение P4 ARCHITECTURE (one skill per design session) и anti-pattern #8 из handoff'а (output design-сессии — spec, не SKILL.md update).
- **OQ-v6-2. Session modes scope в v0.6.0.** Operator decision: Fresh + Update session modes, только initial decomposition. Re-decomposition при изменениях функций и new iteration mode — defer в v0.6.1+ / v0.7. Обоснование — покрывает REH-ERP first iteration use case (update mode + initial decomposition) и любой fresh product через единый mechanism. Re-decomposition требует более сложного diff/affected cluster detection — это amendment surface.
- **OQ-v6-3. Storage layout — single file vs per-cluster files.** Operator decision: multi-file (roadmap + bundle-`<slug>`.md × N в subdirectory). Обоснование — boundary файла = boundary feature-spec session; manual attach `bundle-<slug>.md` к feature-spec проще чем scroll + copy section из единого файла; per-cluster файлы готовы для будущего feature-spec auto-read amendment в v0.6.1+.
- **OQ-v6-4. Cluster-level cycle handling.** Operator decision: 3 варианта резолва (merge / move function / focused 12.2 recovery), не «разреши вручную» escalation. Обоснование — cluster-level cycles — genuine new finding (function-level Шаг 12.2 не ловит), нужны cluster-specific resolution options + reuse Шаг 12.2 mechanism для function-level fix path (Variant 3). Soundлess escalation «разреши» — нарушение P6 escalation discipline.
- **OQ-v6-5. Plain language guarantee для новых артефактов.** Operator decision: roadmap.md — максимум plain-language readability для управленца / продуктолога; bundle.md — operator-facing с большей структурностью где нужно для feature-spec input. Гештальт-проверка по Rule 11 стандарту после generation.

### Handoff §6 question mapping

| Handoff §6 Q | Resolution в v0.6.0 |
|---|---|
| Q1 — trigger decomposition phase auto vs operator-gated | **A1** — operator-gated explicit gate в Шаге 12.4 (Entry A) + session setup detection (Entry B). Закрывает silent transition риск. |
| Q2 — cluster boundary heuristic | **A2** — module-level default + LLM/deterministic detection split/merge candidates + structured dialog с operator. |
| Q3 — bundle output format (single file vs section vs per-cluster) | **A5** — subdirectory + roadmap.md + per-cluster bundle файлы. Per OQ-v6-3. |
| Q4 — plan-файл metadata (only ordering vs richer) | **A5 + A4** — minimal (ordering + cluster-to-cluster deps + bundle refs + per-cluster status field). Complexity estimates omitted (YAGNI v0.6.0). |
| Q5 — update mode handling в v0.6.0 | Per OQ-v6-2 — only initial decomposition in v0.6.0. Re-decomposition при изменениях функций в update mode — defer в v0.6.1+. |
| Q6 — companion update feature-spec'а | **Out of scope** — manual bundle attach к feature-spec session в v0.6.0; auto-read — отдельная сессия amendment'а feature-spec'а после v0.6.0. |
| Q7 — aliasing committed-functions из backlog в bundles | **Out of scope в v0.6.0** — new iteration mode целиком defer. Resolution только при implementation new iteration mode (определит, ссылается ли bundle на `backlog § F-X` или на оригинальную spec для committed predecessors). |

### Genuine open questions (для возможного follow-up)

- **OQ-v6-6.** Empty section visibility в bundle — universal или conditional (некоторые секции omit'ятся всегда если пусто)? **Resolution в design'е:** universal (все 8 секций всегда присутствуют, пустые — короткая placeholder фраза). Если в боевом прогоне это окажется noisy для real-world продуктов — amendment в v0.6.1.
- **OQ-v6-7.** Cluster slug naming при split — default scheme (`<orig>-A` / `<orig>-B`) vs operator-mandatory rename. **Resolution в design'е:** скилл предлагает default suffix, оператор переопределяет на semantic slug (`tickets-intake` / `tickets-execution`). Хорошие defaults — convenience; rename — quality push.
- **OQ-v6-8.** Что делать если в Variant 3 cycle resolution focused 12.2 reveal'ит cascading issues (правка создала 3 новых finding'а)? **Resolution в design'е:** стандартный 12.2 recovery loop (не focused) запускается на всех finding'ах. Может потребоваться несколько правок iteratively. Operator stays in control.

---

## References

- **Original design spec:** `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`
- **v0.5.0 amendment:** `docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment.md`
- **v0.5.0 amendment report:** `docs/superpowers/specs/2026-05-25-hi_flow-product-spec-v0.5.0-amendment-report.md`
- **Source handoff:** `docs/handoffs/2026-05-26-product-spec-v0.6-decomposition-design-handoff.md`
- **Parallel v0.7 design handoff** (retrospective improvements, implementation deferred): `docs/handoffs/2026-05-26-product-spec-v0.7-retrospective-improvements-design-handoff.md`
- **Current SKILL.md:** `hi_flow/skills/product-spec/SKILL.md`
- **Current templates:**
  - `hi_flow/skills/product-spec/references/product-spec-template.md`
  - `hi_flow/skills/product-spec/references/product-backlog-template.md`
  - `hi_flow/skills/product-spec/references/example-contact-tracker-mvp.md`
- **New templates (v0.6.0, создаются в Фазе 2 implementation):**
  - `hi_flow/skills/product-spec/references/roadmap-template.md` — skeleton для `roadmap.md` (A5).
  - `hi_flow/skills/product-spec/references/bundle-template.md` — skeleton для `bundle-<cluster>.md` (A4, A5).
- **Sibling feature-spec SKILL.md** (для понимания, что bundle на вход должен подавать): `hi_flow/skills/feature-spec/SKILL.md`
- **REH-ERP real-world example** (33 функции / 13 модулей):
  - Spec: `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/2026-05-25-reh-erp-comm-core-plus-demos-product-spec.md`
  - Backlog: `C:/Users/Vegr/Projects/Reh_Erp/docs/specs/reh-erp-product-backlog.md` (legacy Shipped terminology — pre-rename)
- **ARCHITECTURE.md проекта** — D17 (decomposition phase scope), D15 (v0.5.0 amendment), D14 (hi_flow ↔ superpowers boundary), P4 (one skill per design session), P6 (operator escalation discipline)
