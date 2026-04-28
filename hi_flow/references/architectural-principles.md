# Architectural Principles — hi_flow Reference Library

**Version:** v1
**Last updated:** 2026-04-28
**Owner:** `hi_flow:arch-audit` (curates content); read-only for `hi_flow:arch-redesign` and `hi_flow:arch-spec`.

Industry-imported library of statically-detectable architectural principles. Used by:

- **`hi_flow:arch-audit`** — validation that `principle:` field in rules references a known id; cited in audit-report findings.
- **`hi_flow:arch-redesign`** — cluster-mode step 1 reads typical fix alternatives.
- **`hi_flow:arch-spec`** (planned) — cites canonical ids in fitness function declarations.

---

## Scope

This library contains architectural principles **statically detectable** through dependency graph and coupling metrics. Principles requiring semantic analysis (OCP, LSP, CCP, REP, single-source-of-truth, silent-fallback-prohibition, и т.п.) — каноничные и важные — **out of scope**. Для семантических аспектов используй code review (с человеком или AI-агентом), специализированные сканеры, runtime-инструменты.

This is **not an exhaustive catalog** of all industry architectural principles — it covers the static-detection portion of widely accepted canons (SOLID, Martin's Package Principles, Hexagonal Architecture, structural classics, Law of Demeter). Paradigm-specific principles (DDD, microservices, event-driven) добавляются эмпирически when the need arises.

---

## How to use

**For agents.** Each rule in project rules-файл (или baseline) reference a principle by canonical id (`principle:` field). Cross-reference here for short formulation, detection mode, and typical fix alternatives.

**For engineers.** При написании project rules — используй canonical id из этого справочника. См. **Index by id** для быстрого lookup'а.

**Auto-generated companion.** `architectural-principles-index.json` — machine-readable list of `{id, formulation, fix_alternatives}` для validators. Регенерируется helper-скриптом `hi_flow/skills/arch-audit/helpers/regenerate-principles-index.js` после каждого обновления этого markdown.

---

## Index by id (alphabetical)

- [`acyclic-dependencies`](#acyclic-dependencies-adp) — Martin's Package Principles
- [`channel-agnosticism`](#channel-agnosticism) — Hexagonal / Boundaries
- [`common-reuse`](#common-reuse-crp) — Martin's Package Principles
- [`dead-code-elimination`](#dead-code-elimination) — Structural Classics
- [`dependency-inversion`](#dependency-inversion) — SOLID
- [`god-object-prohibition`](#god-object-prohibition) — Structural Classics
- [`hub-like-dependency`](#hub-like-dependency) — Structural Classics
- [`interface-segregation`](#interface-segregation) — SOLID
- [`law-of-demeter`](#law-of-demeter) — Structural Classics
- [`layered-architecture-respect`](#layered-architecture-respect) — Hexagonal / Boundaries
- [`module-boundary-awareness`](#module-boundary-awareness) — Structural Classics
- [`no-test-prod-coupling`](#no-test-prod-coupling) — Structural Classics
- [`port-adapter-separation`](#port-adapter-separation) — Hexagonal / Boundaries
- [`single-responsibility-module`](#single-responsibility-module) — SOLID
- [`stable-abstractions`](#stable-abstractions-sap) — Martin's Package Principles
- [`stable-dependencies`](#stable-dependencies-sdp) — Martin's Package Principles
- [`vertical-slice-cohesion`](#vertical-slice-cohesion) — Structural Classics

**17 principles total.**

---

## Group 1 — SOLID на module-level

### single-responsibility-module

- **Source:** Martin, *Clean Architecture* (2017), SRP.
- **Formulation:** Модуль должен иметь только одну причину для изменения; одну архитектурную ответственность.
- **Why:** Если модуль меняется по разным несвязанным причинам — смешаны ответственности. Изменение по одной причине задевает код другой; понять, что модуль делает «на самом деле», становится невозможно.
- **Detection:** Static partial (через метрики Ce, размер модуля) + Semantic (что модуль концептуально делает — нужен смысл).
- **Fix alternatives:**
  1. Split module — разделить на N модулей по выявленным ответственностям.
  2. Extract feature — вынести одну ответственность в отдельный слой/фичу.
  3. Identify hidden abstraction — за двумя ответственностями может стоять общая третья.
- **Related:** `god-object-prohibition`, `common-reuse`.

### interface-segregation

- **Source:** Martin, *Clean Architecture* (2017), ISP.
- **Formulation:** Клиенты не должны зависеть от методов, которые они не используют. Тонкие, специфичные интерфейсы лучше толстых, общих.
- **Why:** Толстый interface заставляет клиента «знать» о всех методах, даже неиспользуемых. При изменении неиспользуемого метода — клиент пересобирается, тестируется, релизится впустую. Связи получаются ложные.
- **Detection:** Static partial (можно посчитать, какие методы interface'а реально используются клиентами; неиспользуемые — кандидаты в split).
- **Fix alternatives:**
  1. Split fat interface — разделить на role-based interfaces (Reader / Writer вместо ReaderWriter).
  2. Adapter pattern — адаптировать клиента к толстому interface через тонкий adapter.
  3. Role-based extraction — выделить методы используемые группой клиентов в отдельный sub-interface.
- **Related:** `single-responsibility-module`.

### dependency-inversion

- **Source:** Martin, *Clean Architecture* (2017), DIP.
- **Formulation:** High-level модули не должны зависеть от low-level. Оба должны зависеть от абстракций. Абстракции не зависят от деталей; детали зависят от абстракций.
- **Why:** Прямая зависимость high-level (бизнес-логика) от low-level (БД, HTTP) делает невозможной замену low-level без переписывания high-level. Через абстракцию high-level стабилен, low-level становится легко заменяемой деталью.
- **Detection:** Static (через граф зависимостей — направление вызовов между слоями).
- **Fix alternatives:**
  1. Introduce interface in high-level — high-level объявляет interface, low-level его реализует.
  2. Move dependency to constructor (DI) — инжекция зависимости извне вместо `new`-create внутри.
  3. Replace concrete reference with abstract — сменить тип параметра/поля с конкретного на interface.
- **Related:** `port-adapter-separation`, `layered-architecture-respect`.

---

## Group 2 — Martin's Package Principles

### acyclic-dependencies (ADP)

- **Source:** Martin, *Agile Software Development* (2002), ADP.
- **Formulation:** Граф зависимостей между пакетами (модулями) не должен содержать циклов.
- **Why:** Циклы превращают участников в неотделимое целое — невозможно тестировать в изоляции, версионировать независимо, переиспользовать. Морфирующий «hairball» — следствие отсутствия дисциплины ADP.
- **Detection:** Static (граф зависимостей, tarjan/SCC).
- **Fix alternatives:**
  1. Extract third package — общая часть в отдельный пакет, оба ссылаются на него.
  2. Dependency Inversion — interface в одном пакете, реализация в другом, поток инвертирован.
  3. Merge — слить если разделение искусственное.
- **Related:** `stable-dependencies`, `single-responsibility-module`.

### stable-dependencies (SDP)

- **Source:** Martin, *Agile Software Development* (2002), SDP.
- **Formulation:** Зависимости должны указывать в сторону стабильности. Пакет должен зависеть только от пакетов более стабильных, чем он сам.
- **Why:** Если стабильный пакет зависит от нестабильного — изменения нестабильного каскадятся в стабильный. Стабильный по определению не должен меняться часто; зависимость от часто меняющегося нарушает это свойство.
- **Detection:** Static (через метрики Ca/Ce/I — стабильность = 1 − I).
- **Fix alternatives:**
  1. Invert dependency — нестабильный пакет зависит от interface стабильного, не наоборот.
  2. Move volatile code — выделить нестабильную часть в отдельный пакет.
  3. Stabilize the dependency — рефактор, чтобы пакет стал стабильнее (меньше Ce, больше абстракций).
- **Related:** `stable-abstractions`, `dependency-inversion`.

### stable-abstractions (SAP)

- **Source:** Martin, *Agile Software Development* (2002), SAP.
- **Formulation:** Стабильные пакеты должны быть абстрактными. Нестабильные — конкретными. Стабильность пакета пропорциональна его абстрактности.
- **Why:** Стабильный пакет, содержащий конкретные реализации, не может быть расширен без модификации. SAP — пара к SDP: SDP говорит куда указывают зависимости, SAP — каким должен быть пакет, на который указывают.
- **Detection:** Static (метрика A — abstractness, считается через ratio абстрактных классов/interfaces; combined с I даёт distance from main sequence D = |A + I − 1|).
- **Fix alternatives:**
  1. Extract interfaces — добавить абстракции в стабильный пакет.
  2. Move concrete to volatile package — конкретные реализации в нестабильный пакет.
  3. Identify exceptions — некоторые stable-concrete пакеты допустимы (например, утилиты вроде String) — задокументировать и не трогать.
- **Related:** `stable-dependencies`.

### common-reuse (CRP)

- **Source:** Martin, *Agile Software Development* (2002), CRP.
- **Formulation:** Классы (модули), используемые вместе, должны быть упакованы вместе. Если ты вынужден импортировать пакет ради одной мелочи — это плохой пакет.
- **Why:** Если потребитель зависит от пакета ради 1 класса из 10 — он несёт overhead остальных 9 (rebuild при их изменении, тесты, dependencies). CRP — обратная сторона CCP: CCP про «изменяющиеся вместе вместе», CRP про «используемые вместе вместе».
- **Detection:** Static (анализ usage patterns — какие части пакета реально используются клиентами).
- **Fix alternatives:**
  1. Split by client groups — разделить пакет по группам клиентов, использующих разные подмножества.
  2. Extract used subset — вынести часто-используемую часть в отдельный пакет.
  3. Inline rare usage — если редко-используемое можно безболезненно встроить в потребитель — встроить.
- **Related:** `interface-segregation`, `single-responsibility-module`.

---

## Group 3 — Hexagonal / Boundaries

### port-adapter-separation

- **Source:** Cockburn (2005), Hexagonal Architecture; Vernon, *Implementing Domain-Driven Design* (2013).
- **Formulation:** Бизнес-логика взаимодействует с внешним миром только через явные ports (интерфейсы); реализации (adapters) живут в отдельном слое.
- **Why:** Прямая зависимость бизнес-логики от инфраструктуры (БД, HTTP, очереди) делает невозможным замену инфраструктуры без переписывания core. Через ports core стабилен, инфраструктура — заменяемая деталь.
- **Detection:** Static partial (через граф зависимостей: domain не должен импортировать infrastructure modules) + Semantic (что считать «портом» в данном контексте).
- **Fix alternatives:**
  1. Extract port — определить interface в domain слое, переместить existing implementation в отдельный adapter модуль.
  2. Introduce adapter — wrap существующий infrastructure-call в adapter, реализующий port.
  3. Dependency injection at boundary — adapter инжектится в core через конструктор/factory, не импортируется напрямую.
- **Related:** `dependency-inversion`, `layered-architecture-respect`, `channel-agnosticism`.

### channel-agnosticism

- **Source:** Industry pattern (no canonical single source); часто упоминается в context Telegram bots, Discord bots, multi-channel systems. Family-imported из Zhenka audit-report.
- **Formulation:** Бизнес-слой не должен знать о канале коммуникации (Telegram, HTTP, CLI, email). Channel-specific детали изолированы в transport слое.
- **Why:** Прямая привязка бизнес-логики к каналу делает невозможным добавление второго канала без дублирования. Также нарушает testability — для тестов бизнес-логики приходится мокать channel SDK.
- **Detection:** Static (бизнес-модули не должны импортировать channel SDK типа `node-telegram-bot-api`, `discord.js`, `express`).
- **Fix alternatives:**
  1. Extract transport layer — channel-specific код в отдельный модуль `transport/`, бизнес-логика работает с channel-agnostic типами (Message, Reply).
  2. Adapter per channel — для каждого канала отдельный adapter, реализующий общий interface.
  3. DI of channel context — channel context (chat_id, user_id) передаётся в бизнес-логику как opaque parameter, без channel-specific семантики.
- **Related:** `port-adapter-separation`, `layered-architecture-respect`.

### layered-architecture-respect

- **Source:** Layered Architecture pattern; Fowler, *Patterns of Enterprise Application Architecture* (2002).
- **Formulation:** Слои зависят только сверху вниз (presentation → application → domain → infrastructure). Никаких импортов снизу вверх или через слой.
- **Why:** Нарушение направления зависимостей превращает слои из «уровней абстракции» в «случайные группы файлов». Меняешь нижний слой — задеваешь верхние; меняешь верхний — задеваешь нижние через обратные импорты.
- **Detection:** Static (граф зависимостей, проверка что imports соответствуют layer order).
- **Fix alternatives:**
  1. Invert dependency — нижний слой объявляет interface, верхний реализует (DIP применённый к слоям).
  2. Move logic to correct layer — найти где логика должна жить по своей природе (бизнес-правило → domain, не application).
  3. Extract intermediate layer — если прямой layered подход не работает (например, application зависит от domain через service) — добавить explicit application service.
- **Related:** `dependency-inversion`, `port-adapter-separation`.

---

## Group 4 — Structural Classics

### god-object-prohibition

- **Source:** Riel, *Object-Oriented Design Heuristics* (1996); Fowler, *Refactoring* (1999) — «Large Class» smell. Также — глобальный принцип №1 в `~/.claude/CLAUDE.md` оператора.
- **Formulation:** Модуль не должен одновременно зависеть от многих и быть зависимостью многих, ни накапливать множество разнородных ответственностей.
- **Why:** God-object концентрирует риск изменения — каждое изменение в нём задевает половину проекта. Тестирование требует mock'ать пол-системы. Понимание становится невозможным — слишком много обязанностей в одном месте.
- **Detection:** Static (метрики Ca + Ce одновременно высокие; размер файла/модуля > threshold).
- **Fix alternatives:**
  1. Split by responsibility — выделить разные ответственности в отдельные модули (применение SRP).
  2. Extract façade — оставить тонкий координирующий модуль, всю логику вынести в специализированные.
  3. Identify domain concepts — за god-object часто прячутся 2-3 неназванных domain-концепта; назвать их и выделить в типы.
- **Related:** `single-responsibility-module`.

### hub-like-dependency

- **Source:** Lakos, *Large-Scale C++ Software Design* (1996), package design metrics; Riel, *Object-Oriented Design Heuristics* (1996), heuristic про concentration of dependencies.
- **Formulation:** Модуль не должен иметь непропорционально большого числа зависящих от него модулей (Ca), даже если он внутренне честный SRP-модуль с низким Ce. Hub концентрирует риск изменения.
- **Why:** Модуль может быть focused (одна ответственность), но всё равно становится pivot — изменение его API заденет половину проекта. Это **отдельный smell** от god-object: god-object имеет AND-связи (Ca AND Ce высокие, накапливает ответственности), hub имеет только Ca высокий (его все используют, сам ничего не делает кроме одной вещи). Hub-like — концентратор blast radius при изменениях.
- **Detection:** Static — Ca > threshold (например, > 20% от total project modules).
- **Fix alternatives:**
  1. Stabilize the hub — повысить абстрактность модуля (interfaces вместо concrete types), снизить частоту изменений.
  2. Split hub by client groups — если разные группы клиентов используют разные подмножества — выделить sub-modules per group.
  3. Introduce intermediate layer — если hub неизбежен, обернуть в более абстрактный API, прятать конкретику.
- **Related:** `god-object-prohibition`, `stable-dependencies`, `single-responsibility-module`.

### no-test-prod-coupling

- **Source:** Industry consensus; формализовано в depcruise rule `not-to-test-from-prod`.
- **Formulation:** Production-код не импортирует тестовый код. Тестовая инфраструктура — отдельный слой, не часть прода.
- **Why:** Импорт теста в прод утаскивает тестовые зависимости (mock libraries, fixtures) в production bundle — лишний размер, лишние security surface, риск тестовой логики случайно сработать в проде.
- **Detection:** Static (depcruise: from `^src/(?!.*\.test\.)` to `^src/.*\.test\.`).
- **Fix alternatives:**
  1. Move shared test utilities — общий тестовый код в `test/` или `__tests__/` директорию, не импортировать в prod.
  2. Extract production helpers — если test и prod нуждаются в общем helper'е — выделить его в production-safe модуль.
  3. Inline test data — fixtures/mocks не импортируют production logic; production logic не импортирует fixtures.
- **Related:** `layered-architecture-respect`.

### dead-code-elimination

- **Source:** Industry consensus; формализовано в depcruise rule `no-orphans`.
- **Formulation:** Каждый модуль должен иметь явное использование (импорт из другого модуля) или быть entry point. Осиротевшие модули — мёртвый код.
- **Why:** Мёртвый код накапливает обслуживающую нагрузку (читать, тестировать, поддерживать) без отдачи. Создаёт false impression о системе («раз код есть, он используется» → нет, не используется). Прячет настоящую логику среди мусора.
- **Detection:** Static (граф зависимостей: модули с нулевым in-degree, не являющиеся entry points).
- **Fix alternatives:**
  1. Delete — если модуль действительно мёртв, удалить (история в git).
  2. Wire up — если был забыт wiring (модуль написан но не подключён) — подключить.
  3. Mark as entry point — если это новая entry point (CLI command, lambda handler), explicitly зарегистрировать.
- **Related:** `common-reuse`.

### module-boundary-awareness

- **Source:** Family-imported из соглашений модульного проектирования; informal industry convention.
- **Formulation:** Cross-import между top-level директориями (модулями) — это осознанный выбор, не accident. Каждый cross-import — кандидат для рассмотрения как boundary violation.
- **Why:** Без awareness каждый разработчик импортирует «удобно» — со временем границы между модулями размываются, превращая модульную структуру в спагетти. Эксплицитный сигнал на cross-import заставляет каждый раз делать осознанное решение.
- **Detection:** Static (любой импорт через границу top-level директории под `src/`).
- **Fix alternatives:**
  1. Move usage to within module — если импортируемое реально нужно «дома», передвинуть.
  2. Extract shared subsystem — если общая логика нужна нескольким модулям — выделить в `shared/` или `common/`.
  3. Document as accepted boundary — если cross-import оправдан архитектурно, задокументировать в project rules как exception.
- **Related:** `common-reuse`, `single-responsibility-module`.

### law-of-demeter

- **Source:** Demeter Project, Northeastern University (1987); популяризировано в *The Pragmatic Programmer* (Hunt & Thomas, 1999).
- **Formulation:** Объект (модуль) должен общаться только с непосредственными «знакомыми» — не с «знакомыми знакомых». Никаких цепочек `a.b().c().d()` или транзитивных импортов через посредника.
- **Why:** Длинные цепочки делают код хрупким — изменение в C ломает A, хотя A напрямую с C не общался. Отношение через посредника становится скрытой связью; encapsulation посредника нарушается.
- **Detection:** Static — chain length analysis на code-level (3+ dot chains = candidate); на module-level — модуль импортирует X, X импортирует Y, модуль не должен напрямую импортировать Y (нарушение encapsulation X'а).
- **Fix alternatives:**
  1. Tell-don't-ask delegation — попросить B сделать что нужно с C, не вытаскивать C через B.
  2. Wrap exposed structure — B возвращает façade, не raw C.
  3. Re-think dependency direction — если A нужен C, может быть он должен импортировать C напрямую, а не через B.
- **Related:** `dependency-inversion`, `port-adapter-separation`, `module-boundary-awareness`.

### vertical-slice-cohesion

- **Source:** Vertical Slice Architecture (Jimmy Bogard, ~2018); pattern language-agnostic.
- **Formulation:** Каждая фича — независимый вертикальный слайс. Файлы внутри одного feature-folder не должны импортировать из соседних feature-folder'ов; общая логика выделяется в `shared/` (или эквивалент).
- **Why:** Cross-imports между features превращают независимые слайсы в спагетти — изменение в одной фиче задевает другую через скрытые связи. Принцип защищает feature isolation: можно изменять/удалять/переписывать фичу, не задевая соседей.
- **Detection:** Static — наличие feature-folder структуры (`src/features/<name>/` или `src/tools/<name>/`) + проверка, что imports между sub-folder'ами одного parent'а проходят только через `shared/` / `common/`.
- **Fix alternatives:**
  1. Move shared logic to shared subfolder — общая часть в `<parent>/shared/`, обе features импортируют оттуда.
  2. Inline duplication — если общее небольшое и редко меняется, дублировать (DRY violation предпочтительнее cross-feature coupling).
  3. Extract upper-level service — если общая логика complex, выделить в отдельный модуль уровнем выше features.
- **Related:** `single-responsibility-module`, `module-boundary-awareness`, `common-reuse`.

---

## Maintenance

This file is the **single source of truth** for principle definitions. To add a new principle:

1. Add entry following the format (`### id` heading + Source / Formulation / Why / Detection / Fix alternatives / Related fields).
2. Add to **Index by id** alphabetically.
3. Если новая группа — добавить раздел `## Group N — <name>`.
4. Re-run `regenerate-principles-index.js` to update `architectural-principles-index.json`.
5. Update related entries in this file (cross-references in `Related` fields).

**Removal of an existing principle requires migration of all references** (project rules, baseline rules в arch-audit, citing rules in patches). Coordinate as architectural change in `ARCHITECTURE.md`.
