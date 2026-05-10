# `hi_flow:product-spec` — Design Spec (work-in-progress)

**Status:** brainstorm in progress
**Started:** 2026-05-10
**Method:** superpowers:brainstorming поверх handoff'а `docs/handoffs/2026-04-27-product-arch-spec-handoff.md`
**Trigger:** оператор запускает новый ERP-проект (демо + коммуникационный модуль), product-spec нужен в скилл-форме как top step плагина перед боевым прогоном.

---

## Назначение документа

Растущая база зафиксированных решений по дизайну скилла. Дополняется по ходу брейнсторма. К концу сессии становится финальным design-spec'ом, после чего инвоукается `superpowers:writing-plans` для имплементационного плана.

Решения нумеруются (D1, D2, ...) для traceability и cross-references из других секций. Каждая запись — **What** + **Why** + **How to apply / Examples** где полезно.

---

## Inherited (handoff 2026-04-27)

Кратко то, что зафиксировано до этой сессии и не пересматривается:

- **Уровень декомпозиции:** product → features (один скилл-уровень над feature-spec). Внутри уточняется в D3.
- **Self-assessment direct/brainstorm pattern** (как у feature-spec, факторы адаптировать).
- **Cell format / Cockburn IDs / Status & Cardinality tags / Cross-cutting policies (CC) / Reusable sub-policies (P-NAME)** — переиспользуются без изменений.
- **Plain language principle** — аудитория артефакта продуктолог, не инженер; engineer-only жаргон переводится.
- **Coverage-based closure criterion** — все Mandatory категории + premortem + contradiction detection чисты.
- **Self-Review через subagent с isolated context** (фикс confirmation bias основного агента).
- **User Review Gate** перед transition'ом к следующей фазе.
- **PRD-as-standalone:** product-spec.md self-sufficient для product context; ARCHITECTURE.md читается отдельно для архитектурного контекста.
- **Output:** `<project>/docs/specs/YYYY-MM-DD-<product-slug>-product-spec.md` (default; configurable).
- **Не вызывает feature-spec автоматически** — оператор инициирует переход.

Полный список — handoff §2.1 и §3.

---

## Принципы и терминология

### D1. Three-layer feature taxonomy: domain / enabler / scaffolding

**What.** Любая работа в продукте классифицируется на три слоя:

| Слой | Определение | В product-spec? |
|------|-------------|-----------------|
| **Domain feature** | User-facing value (двусторонние email-разговоры, sales pipeline, inventory tracking) | Да |
| **Enabler feature** | Поддерживает domain features, **есть продуктовые решения** (auth method, permissions model, tenancy model, notifications infra) | Да |
| **Scaffolding** | Чисто инженерные решения без продуктовых развилок (db schema, CI/CD, hosting, dev environment) | Нет — материал arch-spec / impl-plan |

**Why.** Без этого различения product-spec раздувается до «всё, что нужно для запуска проекта», теряя продуктовый фокус. С ним — границы артефакта управляемые: документируются только решения с продуктовым смыслом.

**Эвристика.** Если фича порождает strategic forks (см. D7) — она в product-spec (domain или enabler в зависимости от того, кому даёт value). Если все решения чисто инженерные — scaffolding, не наша зона ответственности.

**Industry roots.** Domain/enabler split — близок к **SAFe Enabler features** (Scaled Agile Framework, Dean Leffingwell): SAFe эксплицитно различает business features (прямой value) и enabler features (поддерживают разработку business features, четыре типа: architecture / infrastructure / exploration / compliance). Scaffolding — расширенная интерпретация термина «project scaffolding» (boilerplate setup) до «всё инженерное без продуктовых решений». Связанные концепты: «architectural runway» (Leffingwell), «walking skeleton» (Cockburn), «tracer bullet» (Pragmatic Programmer), «job-to-be-done» (Christensen).

---

### D2. Feature — definition

**What.** Фича = минимальный самодостаточный кусок user-perceivable value, который может быть отгружен независимо и даёт пользователю целостную возможность, которой у него до этого не было.

**Three-test gate.** Любой провал → не фича:

1. **Independent shippability.** Если отгрузить только это — будет ли value? «Приём сообщений» один — нет (висит мёртвый input). «Двусторонний email-разговор» — да. Тест режет искусственное дробление атомарной функциональности.
2. **Atomic user job.** Один user job-to-be-done на фичу. «Вести email-переговоры с клиентом» — один job. «Управлять входящими в любом канале с маршрутизацией» — другой job. Тест режет раздутие: если внутри одной «фичи» три разных user job — это псевдо-модуль, не фича.
3. **Negotiability of inclusion.** «Делаем ли X?» — осмысленный продуктовый вопрос. «Делаем ли отправку без приёма?» — бессмыслен. Финальное сито: фича — то, что product owner может реально включить или исключить из scope.

**Why.** Без чёткого определения фичи дизайн скилла плывёт между «слишком крупно» (фича = модуль, теряем грануляцию) и «слишком мелко» (фича = task, разбиваем атомарную функциональность).

**Sub-feature / enhancement.** Расширение существующей фичи (например, «email-conv v1 без attachments» → «email-conv v1.1 с attachments»). Проходит тесты 1 и 3, тест 2 «тот же job, расширение возможностей внутри». Считаем отдельной фичей-enhancement'ом — позволяет инкрементальный roadmap.

---

### D3. Module — definition

**What.** Модуль / capability area = когерентная группа фич, привязанная к одному доменному пространству или ментальной модели пользователя. Обычно мапится на: top-level навигационный таб, бизнес-домен (Communication / Inventory / Sales / HR в ERP), одну major роль или зону ответственности юзера.

**Не является уровнем декомпозиции.** Модуль — это **ярлык-кластер** в графе фич, не отдельный уровень иерархии. Декомпозиция идёт product → features напрямую, модули — организационная группировка для удобства навигации в артефакте.

**Why.** Альтернатива «модуль как уровень» создаёт жёсткую иерархию product → modules → features, которая ломается на cross-module зависимостях (см. D4). Модуль-как-кластер — гибкая структура без потери семантики.

**Examples.**
- Module **Communication**: email-conversations, telegram-conversations, multi-channel inbox, templates, auto-classification.
- Module **Identity & Access** (foundation): user CRUD, permissions model, multi-tenancy, registration flow.
- Module **Sales**: deal management, pipeline visualization, quotation generation.

Cross-cutting фичи (audit log, notifications, search, export) — могут жить в отдельном модуле «Platform» или в «cross-cutting policies» секции product-spec (открытый вопрос, см. Open Questions).

---

### D4. Topology: DAG, not hierarchy

**What.** Реальная топология фич в продукте — direct acyclic graph (DAG). Каждая фича — узел, зависимости между фичами — стрелки, модули — кластеры в этом графе. **Ordering** в roadmap = топологический сорт DAG'а, не порядок модулей.

**Why.** Иерархическое мышление product → modules → features ломается на cross-module зависимостях. Practically-важный кейс: «фича из Communication требует фичу из Identity». В дереве это ломает структуру, в DAG — обычная стрелка.

**Implication.** MVP-срез — это «вертикальный путь от корней DAG'а до первой user-facing domain-фичи, которая даёт value», не «модуль 1 целиком, потом модуль 2». Корни — обычно enabler-фичи (foundation), листья — domain-фичи (user-facing).

**Example.**

```
[Identity: user CRUD] → [Identity: permissions] → [Communication: email-conv]
                                                → [Communication: templates]
                                                → [Sales: deal-management]
```

MVP может быть = `user CRUD + permissions + email-conv` (один срез до первой user-facing domain-фичи). Потом waves добавляют параллельно остальное.

---

## Boundary: product-spec vs feature-spec

### D5. Test для размещения развилки

**What.** Развилка идёт в product-spec, если её ветки порождают **разные наборы фич** или **разные связи между фичами**. Если меняется только behavior внутри одной фичи без сдвига feature list — развилка в feature-spec.

**Two-test gate (применяются последовательно):**

1. **Меняет ли feature list?** Если ветки развилки приводят к разным спискам фич в roadmap'е — product-spec.
2. **Меняет ли cross-feature deps?** Если ветки развилки реорганизуют DAG (новые зависимости, новые корни) — product-spec.
3. Иначе — feature-spec.

**Why.** Без чёткого теста граница плывёт; в одних кейсах развилка попадает в product-spec, в других «такая же по смыслу» — в feature-spec, и оба артефакта теряют согласованность.

**Calibration table** (накопительная — добавлять новые кейсы по ходу):

| Развилка | Меняет feature list? | Меняет deps? | Уровень |
|----------|----------------------|--------------|---------|
| Self-registration vs invite-only | Да (разные наборы фич: registration form vs admin invite flow) | Да | **Product-spec** |
| Email-conv с attachments или без | Нет (scope cut внутри фичи) | Нет | Feature-spec |
| Email-conv с threading или без | Нет | Нет | Feature-spec |
| Email-only vs email + Telegram в v1 | Да (TG-conversations — отдельная фича) | Да | **Product-spec** |
| Soft delete vs hard delete | Если «корзина» с UI — да (новая фича); иначе — внутренний флаг | Возможно | Серая зона, оператор решает явно |
| Single-tenant vs multi-tenant | Да (tenancy enabler появляется только в multi) | Да | **Product-spec** |
| Multi-language UI yes/no | Да (translations enabler если yes) | Да | **Product-spec** |
| Email-conv inbound (notifier) vs inbound+outbound (conv) | Да — это разные фичи с разными именами | Да | **Product-spec** |
| RBAC: simple roles vs hierarchical | Нет (одна permissions feature, разный внутренний контракт) | Нет | Feature-spec |
| RBAC vs ABAC | Зависит — ABAC требует policy engine как отдельный enabler | Зависит | Серая зона |
| Mobile app есть в v1 / нет | Да (mobile-app — отдельный канал-фича) | Да | **Product-spec** |
| Notifications email-only vs email + SMS + push | Да (SMS- и push-каналы — отдельные enabler'ы) | Да | **Product-spec** |

**How to apply.** В серых зонах не настаиваем на алгоритмическом ответе — оператор решает явно («это будет product-spec fork» / «это уйдёт в feature-spec»). Скилл подсвечивает серую зону, не выбирает за оператора.

---

### D6. Per-feature granularity в product-spec

> **Updated by D16/D17:** значения `Status` field упрощены — было `MVP / v1.1 / v2 / parked / out-of-scope`, стало **`in-scope / parked / out-of-scope`** (multi-wave убран). Backlog parked entries дополнительно имеют `level: detailed / partial / note / fragment` (см. D17).

**What.** Каждая фича в product-spec записана как карточка из 5-8 строк. Не больше.

**Card format:**

```markdown
### F-comm-1. Двусторонние email-разговоры

**Type:** domain
**Status:** in-scope | parked | out-of-scope
**Scope:** Оператор поддержки получает входящие email на унифицированный адрес,
          отвечает с корректным threading. Один оператор — один inbox.
**In:** receive, reply, threading, отображение attachments.
**Out (this feature):** template responses, auto-classification, multi-channel inbox,
          composing attachments — отдельные фичи в roadmap'е.
**Depends on:** F-id-1, F-id-2.
```

**Что НЕ входит в карточку (это feature-spec):**

- Sample dialogs
- Input space probes (HAZOP guidewords)
- Invalid combinations
- User reactions (accept / reject / abandon / change)
- Lifecycle questions
- Hard policies
- Disambiguation
- Внутренние forks с branches и resolutions

**Эвристика для оператора:**

> Если в product-spec нужно расписать фичу больше 5-8 строк, чтобы решить «включаем в MVP» — детализация ушла глубоко. Поднимайся обратно до scope cut. Дальше — feature-spec.

**Why.** Без разграничения детализации product-spec и feature-spec дублируют контент, оба становятся длинными. С разграничением: product-spec — навигационная карта продукта (можно прочесть за 10-15 минут), feature-spec — глубокий анализ одной фичи (час+ чтения).

---

### D7. Two types of forks в product-spec

**What.** В product-spec два типа развилок, не конфликтующих:

1. **Strategic forks** — между альтернативными конфигурациями продукта (self-reg vs invite-only, email-only vs email+TG в MVP, single-tenant vs multi-tenant). Влияют на состав фич. Живут в отдельной секции `## Strategic forks`. Применяется D5 (test 1 и 2).

2. **Scope cuts per feature** — какие куски внутри фичи **в** или **вне** этой фичи (поля **In** / **Out** в карточке D6). Не альтернативы, а явные границы. Внутренние альтернативы внутри scope — feature-spec.

**Relation.** Strategic forks могут переопределять scope cuts (выбор «email + TG» добавляет фичу TG-conversations с её собственными scope cuts). Scope cuts не могут переопределять strategic forks.

**Why.** Объединение в один тип развилок смешивает уровни абстракции и затрудняет ревью. Разделение даёт оператору два чётких ментальных слота: «какие фичи делаем» (strategic) и «что в каждой фиче» (scope cuts).

---

### D8. Feedback loop product-spec ↔ feature-spec

> **Updated by D16/D17:** living document principle разделяется по артефактам. **Spec — living внутри одной итерации** (mid-design feedback от feature-spec через update mode), frozen на closure. **Backlog — living across iterations** (накопительный per-product). Между итерациями каждая получает новый spec, не апдейтит предыдущий. Старая формулировка ниже сохранена как контекст происхождения decision'а.

**What.** product-spec.md — **живой документ относительно сессий feature-spec**, не запечатанный артефакт. Возврат и обновление — штатный путь.

**Разрешённые сценарии:**

- Sub-fork в feature-spec оказывается independent feature по трём тестам D2 → split. Оператор решает: продолжаем над одной фичей, остальные → product-spec roadmap. Или возврат к product-spec для переразложения.
- «Фича» в feature-spec оказывается несуществующей независимо (тест 1 не проходит) → merge с другой или drop. Обновление product-spec.

**Why.** Real-life продуктовое мышление итеративно: углубление в одну фичу часто вскрывает соседей. Запрет на feedback loop приводит либо к плохим решениям («впихнём в текущую фичу, чтобы не возвращаться»), либо к скрытым обходным путям («сделаю side-doc, потом синхронизирую»).

**Mechanics в скилле feature-spec.** Когда feature-spec обнаруживает split-кейс, эскалирует оператору. Оператор принимает решение. Если решение требует обновления product-spec — feature-spec выходит, обновляется product-spec, потом feature-spec возобновляется (или начинается новая сессия для одной из split-фич).

**Implication для дизайна product-spec.** Должен поддерживать **incremental update mode** — открытие существующего product-spec.md, добавление/изменение фич, перерасчёт зависимостей и roadmap'а. Не только generation-from-scratch.

---

## Top-down mechanism

### D9. Enabler features выводятся через probes, не enumerируются

**What.** Скилл идёт сверху вниз. Продуктолог называет user-facing domain features. Скилл задаёт **продуктовые** вопросы, из которых выводит необходимые enabler features. Продуктолог не должен upfront знать «нужен auth, нужны роли, нужна tenancy» — это выводится скиллом из его ответов на продуктовые вопросы.

**Why.** Bottom-up enumeration требует от продуктолога инженерной экспертизы (auth, RBAC, multi-tenancy) — нарушает принцип «аудитория = продуктолог, не инженер» (P1 проекта). Top-down с переводом языка — работает в продуктовой ментальной модели.

**Probe translation table:**

| Engineer-only вопрос     | Продуктовый эквивалент (его задаёт скилл)         | Enabler, который выводится |
|--------------------------|---------------------------------------------------|----------------------------|
| Нужен ли auth?           | Один тип юзера или разные роли?                   | User CRUD                  |
| Какой auth method?       | Самостоятельная регистрация или invite-only?      | Registration flow variant  |
| RBAC или ABAC?           | Все админы равны или есть градации прав?          | Permissions model          |
| Multi-tenancy?           | Несколько изолированных компаний делят инстанс?   | Tenancy model (если да)    |
| Какой password reset?    | Юзер может забыть креды и восстановить сам?       | Password reset flow        |
| Нотификации?             | Юзер хочет узнавать о событиях когда не в системе?| Notifications channel(s)   |
| Search infra?            | Юзеру нужно найти запись среди многих?            | Search enabler             |
| Audit log?               | Нужно знать, кто что когда сделал (compliance / debug)? | Audit log enabler    |

**How to apply.** Реализуется через шаг 5 (Вывод поддерживающих функций) в Probing taxonomy D11. Глубина шагов 1-3 в той же таксономии адаптируется к типу проекта (личный / стартап-MVP / коммерческий и т.п.) — это часть D11.

---

### D10. (REMOVED 2026-05-10)

Был «Pitch плагина: top-down от user-facing value». Удалён как corollary D9 + market-positioning формулировка, не design decision. Содержал устаревшие отсылки к MVP/roadmap, не вписывающиеся в D16/D17 модель.

---

## Probing taxonomy

### D11. Adaptive single-skill design + полный список шагов опроса

**What.** Один скилл `hi_flow:product-spec` покрывает весь спектр контекстов — от личного продукта до коммерческой разработки под заказчика. Бифуркация на отдельные скиллы (personal/commercial) отвергнута. Адаптация к контексту делается через **глубину** отдельных шагов опроса, не через смену структуры.

**Why.** Спектр контекстов непрерывен (личный → open-source → стартап-MVP → внутренний инструмент → коммерческая разработка → платформенный продукт), бинарная бифуркация artificially не покрывает hybrid-кейсы. Структурное ядро таксономии (шаги 4-6 + условные + сквозные) одинаково в любом контексте — раздельные скиллы означали бы дублирование ядра и drift risk. Family minimalism: каждый дополнительный скилл — отдельная design-сессия, отдельный SKILL.md, отдельная mental model. YAGNI пока bifurcation не доказана необходимой реальными прогонами.

**Verification note.** Полнота этой taxonomy не верифицируема в design-сессии — требует первых боевых прогонов (личный продукт + коммерческий продукт минимум). Принимается как стартовая, ревизия после прогонов.

**Migration plan если adaptive depth не сработает.** Если на боевых прогонах окажется, что коммерческий и личный режимы принципиально расходятся по выходным артефактам (например, коммерческий требует buyer-facing summary / ROI estimate / milestone plan как отдельные секции), мигрируем в bifurcated design (опция B из обсуждения 2026-05-10) — формальные modes self-driven / negotiation. Это не закрытое решение.

---

### Полный список шагов опроса

#### Обязательные шаги (применяются всегда; глубина адаптируется к типу проекта)

**Шаг 1. Описание продукта.**

- 1.1. Что это за продукт — одна фраза.
- 1.2. Тип проекта: личный / open-source для понимаемой ниши / стартап-MVP с гипотетической аудиторией / внутренний инструмент компании / коммерческая разработка под заказчика.
- 1.3. *Если проект не личный:* кто заказчик (платит) и кто пользователь (использует) — это разные роли.
- 1.4. *Если коммерческая разработка или внутренний инструмент:* какие бизнес-цели у заказчика. Это драйверы приоритизации, не сами функции продукта.
- 1.5. *Если стартап-MVP или open-source:* гипотетические типы пользователей с обоснованием.

**Шаг 2. Группы пользователей.**

- 2.1. Перечислить группы или роли пользователей.
  - Личный продукт: 1 группа (фиксируем явно, даже если очевидно).
  - Стартап-MVP / open-source: 2-4 гипотетические персоны.
  - Коммерческий / внутренний: 3-7+ реальных ролей внутри организации заказчика.
- 2.2. Для каждой группы — описание роли и основная цель использования продукта.

**Шаг 3. Задачи каждой группы.**

- 3.1. Для каждой группы — список задач, которые её пользователи хотят решать через продукт.
- 3.2. *Если групп больше одной:* пересечения задач между группами (где одна группа создаёт что-то, другая потребляет).
- 3.3. *Если коммерческая разработка:* связь задач пользователей с бизнес-целями заказчика — какие задачи продвигают какие бизнес-цели (для приоритизации).

**Шаг 4. Перечисление пользовательских функций.**

> **Updated by D17:** добавлен auto-suggestion check — после описания operator'ом кандидата domain feature skill сканирует parked backlog на семантическое пересечение. Match → flag оператору (pull / merge / держать отдельно). См. D17 § Auto-suggestion.

Пользовательская функция = то, что юзер видит и использует, что само по себе даёт ему ценность.

- Каждая задача → кандидат в пользовательскую функцию.
- Применить три теста D2 (отгружается отдельно с пользой / решает одну атомарную задачу / можно осознанно включить или исключить из продукта).
- Кандидат, не прошедший хотя бы один тест → переразложить (раздробить, объединить, отбросить).
- Результат: список пользовательских функций с одной строкой описания на каждую.

**Шаг 5. Вывод поддерживающих функций (сверху вниз).**

> **Updated by D17:** добавлены два check'а перед созданием новой enabler карточки:
> 1. **Shipped backlog check.** Skill сначала проверяет shipped backlog на match (по pointer'у — Входит / Не входит). Цепочка решений: match → reuse без новой карточки (связь через `Зависит от: F-X`); partial match → propose extension (новая card F-X-ext); mismatch → propose новая card; ambiguous → read originating spec on-demand.
> 2. **Parked backlog check** (если shipped check no match). Skill сканирует parked на семантическое совпадение — match → propose pull / merge / держать отдельно.
>
> См. D17 § Cross-iteration enabler reuse и § Auto-suggestion.

Поддерживающая функция = то, что нужно, чтобы пользовательские функции работали (учётная запись, права, восстановление пароля, нотификации, поиск, журнал действий, экспорт). У них тоже есть продуктовые решения, поэтому они в продуктовой спеке.

- Для каждой пользовательской функции — пройти список вопросов в продуктовом языке (таблица из D9): «один тип юзера или разные роли?», «нужно ли юзеру восстанавливать пароль самому?», «несколько изолированных компаний делят инстанс?», и т.д.
- Каждое продуктовое «да» порождает поддерживающую функцию.
- Результат: список поддерживающих функций с зависимостями обратно к пользовательским, которым они служат.

**Шаг 6. Границы каждой функции.**

> **Updated by D17:** при обсуждении «выносим в parking» skill сканирует parked backlog на семантическое пересечение. Match → flag оператору «уже было запарковано похожее, слить или держать отдельно». См. D17 § Auto-suggestion.

Для каждой функции (пользовательской и поддерживающей) заполнить:

- **Входит:** что включаем в эту функцию в этой версии.
- **Не входит (но это отдельная функция):** что вынесено в другую функцию роадмапа.
- **Не делаем вообще:** что отрезано на уровне продукта.

Уточняющие вопросы: какой минимально полезный кусок этой функции? Где её разумная граница? Что точно не делаем в этом продукте?

#### Условные шаги (запускаются при срабатывании триггера)

**Шаг 7. Сквозные политики (cross-cutting policies) — inheritance-aware.**

Триггер: ≥2 in-scope features в этой итерации **ИЛИ** новый feature вводит cross-cutting concern (audit log, notifications, search, export, file storage и т.п.), которого не было в предыдущих итерациях.

**Sub-steps:**

- 7.1. Skill читает backlog § Standing policies + spec'и предыдущих итераций — список применимых уже-известных политик.
- 7.2. Для каждой in-scope feature этой итерации skill проверяет: попадает ли под существующие standing policies? Если да — feature **inherits policy** (в карточке D6 добавляется поле `Inherits: CC-X from <previous spec>`).
- 7.3. Если в текущей итерации появляются новые cross-cutting concerns, **не покрытые** existing policies — probe оператору («единый audit log поверх всех функций или у каждой свой?», «общая система нотификаций или каждая функция шлёт свои?», и т.п.). Output: новая CC policy в spec § Cross-cutting policies этой итерации, потенциально новая поддерживающая функция (общий сервис журнала / общий узел нотификаций).

**Если все cross-cutting concerns этой итерации покрыты existing standing policies — Шаг даёт result «inherited only, нет новых policies в spec'е».** Это валидное завершение, не пропуск.

**Шаг 8. Жизненный цикл данных — inheritance-aware.**

Триггер: in-scope feature этой итерации хранит persistent data **И** либо нет existing lifecycle policies (первая такая feature в продукте), либо новый feature вводит lifecycle aspect, не покрытый существующими.

**Sub-steps:**

- 8.1. Skill читает existing lifecycle policies (если есть в backlog или prior specs).
- 8.2. Для каждой in-scope feature, которая хранит persistent data — проверка: существующие retention / GDPR / migration policies покрывают?
- 8.3. Если новая feature вводит новый data lifecycle aspect — probe («что происходит с данными юзера, когда он уходит?», «как долго хранить логи?», «нужны ли право на забвение и экспорт?», «soft vs hard delete?»). Output: новая lifecycle policy в spec этой итерации, возможно новая поддерживающая функция (data retention service, GDPR export), стратегические развилки.

**Если все lifecycle aspects покрыты existing policies — Шаг даёт result «inherited only».** Аналогично Шагу 7.

**Шаг 9. Взаимодействия между группами пользователей.** Триггер: групп больше одной.

Вопросы: какие сценарии требуют участия двух и более групп? Кто видит данные кого? Какие функции доступны только определённым группам?

Результат: ограничения доступа в карточках функций (поле «Доступно группам»), развилки в межгрупповых сценариях.

#### Опциональные шаги (только при явном основании)

**Шаг 10. Соответствие нормативным требованиям.** Триггер: домен подлежит регулированию.

Сферы: медицина, финансы, образование, обработка персональных данных (GDPR), доступность (WCAG).

Вопросы: какие требования законов или стандартов применимы? Кого они затрагивают? Какие функции продукта обязаны им соответствовать?

Результат: жёсткие политики в секции сквозных. **Не выдумывать требования для нейтральных доменов.**

**Шаг 11. Базовые требования к нагрузке и доступности.** Триггер: оператор поднимает явно либо домен высокоставочный.

Вопросы: порядок числа пользователей? Ожидания по скорости отклика? Гарантии доступности? Объём данных? Работа без интернета или только онлайн?

Результат: короткая секция базовых требований. В продуктовую спеку попадает только то, что заказчик / оператор осознанно выбирает как продуктовое решение (например: «обязательно работает офлайн»). Конкретные числа нагрузки — материал арх-спеки.

**Шаг 12 (финальный обязательный). Scope confirmation + integrity validation + closure migration.**

Запускается после Шагов 4-11 (всё содержание итерации зафиксировано). Sub-steps:

- 12.1. **Scope confirmation.** Skill показывает оператору финальный сводный list: in-scope features (carded), parked-this-iteration (с level), deferred forks, rejected. Operator подтверждает или правит.
- 12.2. **Integrity validation** (skill автоматически):
  - **Orphan check** — enabler в in-scope, ни одна domain-функция от него не зависит → flag («F-X в scope, никто не использует — точно нужен?»).
  - **Broken closure** — domain-функция в in-scope, её enabler в parked / out-of-scope → flag («F-Y зависит от F-Z, который parked — резолви»).
  - **Cyclic deps** — цикл в графе → блокирующая ошибка с требованием резолва.
- 12.3. **Closure migration** per D17 § Closure flow:
  - in-scope → backlog § Shipped (asymmetric pointers).
  - parked-this-iteration → backlog § Parked (full content).
  - deferred forks → backlog § Deferred (full content).
  - rejected → backlog § Out-of-scope (one-liner).
  - resolved forks остаются в spec.
  - Iteration index в backlog обновляется.
- 12.4. **Status transition** per D18. Operator confirmation → spec status переходит `draft` → `signed` (готов к feature-spec / impl). Переход на `shipped` — позже, по явному подтверждению что итерация отгружена в production.

Результат: spec готова к user review gate, backlog обновлён, frozen invariant сохраняется.

#### Сквозные проверки (постоянно активны во время всей сессии)

**Сквозная проверка 1. Выявление неявных критериев.** Если в ответе оператора всплывает расплывчатое слово (быстро, часто, много, опасный, похоже, естественно) — задать уточняющий вопрос: переводим в число, в правило-чеклист, или принимаем как принципиально нечёткое и закрепляем якорным примером.

**Сквозная проверка 2. Проверка на противоречия.** После каждого нового ответа сверять с уже записанной структурой. Если новый ответ противоречит чему-то — поднять конфликт оператору, не записывать молча.

**Сквозная проверка 3. Классификация стратегических развилок.** Когда в ответах всплывает развилка-кандидат — применять тест D5 (меняет ли она состав функций или связи между ними?). Стратегические развилки → секция «Стратегические развилки» спеки. Feature-уровень развилки → не записываются в продуктовую спеку, пойдут дальше в feature-spec. Перед завершением сессии — отдельный проход по всем накопленным развилкам для подтверждения корректной классификации.

> **Updated by D17:** при возникновении candidate fork — после применения теста D5 — также проверка пересечения с deferred forks из backlog'а. Match → flag оператору «связано с deferred Sf-Y из iterN, резолвить сейчас или продолжать как отдельный fork?». См. D17 § Auto-check deferred forks.

#### Завершающая проверка

**Разбор «что может пойти не так».** В конце сессии задать вопрос:

> «Представь — продукт запущен, прошло 6 месяцев. Что пошло не так? Сценарии: пользователи не пришли / пришли но ушли / конкурент съел рынок / технический долг сломал скорость разработки / сам оператор отказался поддерживать продукт.»

Каждое представимое осложнение → потенциально новая функция, стратегическая развилка или граница, которую упустили.

#### Условие завершения сессии

Перейти к закрытию можно только когда:

- Все обязательные шаги (1-6, 12) дали результат.
- Все условные шаги (7-9) с сработавшими триггерами дали результат либо явно помечены «не применимо».
- Сквозная проверка 3 прошла финальный проход.
- Сквозная проверка 2 — нет открытых конфликтов.
- Разбор «что может пойти не так» проведён.

**Всего:** 7 обязательных (1-6 + финальный 12) + 3 условных + 2 опциональных + 3 сквозных + 1 завершающая.

---

## Output structure

### D12. Полный скелет product-spec.md

**What.** Артефакт `product-spec.md` имеет фиксированную секционную структуру (12 секций). Mermaid-диаграмма зависимостей в Секции 4 — обязательна (derived projection из карточек, поле `Зависит от` остаётся SSoT). Секция 10 — навигационные ссылки на backlog для items, перенесённых при closure (полные карточки живут в backlog'е per D17, не дублируются в spec).

**Why.** Фиксированная структура → consistency артефактов между проектами + предсказуемый input для downstream'а (feature-spec, arch-spec). Mandatory Mermaid → ценность визуализации scales positively даже на маленьких продуктах, generation автоматический. Pointer-based Секция 10 → spec не дублирует backlog контент, остаётся фокусированным per итерация.

**Closes:** OQ3 (waves убраны per D16, Секция 10 — навигация), OQ4 (depends_on SSoT + Mermaid mandatory), OQ5 (sample journeys conditional), OQ7 (cross-cutting функции = enabler features в Секции 4, правила = CC-политики в Секции 6), OQ9 (полный скелет).

---

### Полный скелет

```markdown
# <Название продукта>

[Метаданные: дата, статус (draft / signed / shipped — см. D18), версия, автор]

## 1. Описание продукта
[результат Шага 1]

- Что это — одна фраза
- Тип проекта (личный / стартап-MVP / open-source / внутренний инструмент / коммерческий)
- Заказчик ↔ пользователь (если различаются)
- Бизнес-цели заказчика (если коммерческий или внутренний)
- Гипотетические персоны с обоснованием (если стартап-MVP / open-source)

## 2. Группы пользователей
[результат Шага 2]

Список ролей. Per group — название, описание, основная цель использования продукта.

## 3. Задачи пользователей
[результат Шага 3]

- Multi-segment / коммерческий: matrix «группа × задачи».
- Single-segment / личный: линейный список задач.

## 4. Модули и функции
[результат Шагов 4-6, сгруппировано по модулям]

**Mermaid-диаграмма зависимостей (mandatory).** Авто-генерируется из поля `Зависит от` карточек. Узлы — функции, стрелки — deps, цвет / форма — тип (domain vs enabler).

### Модуль: <Name>

#### F-<slug>-N. <Название функции>

**Тип:** пользовательская | поддерживающая
**Статус:** in-scope | parked | out-of-scope
**Назначение:** 1-2 строки, что делает для юзера.
**Входит:** что включаем в эту версию функции.
**Не входит (это отдельная функция):** ссылки на соседние F-...
**Не делаем вообще:** опционально, если есть явные out-of-scope cuts.
**Зависит от:** F-..., F-... (поддерживающие, от которых нужна работа)
**Доступно группам:** если Шаг 9 сработал и группы различаются.
**Inherits:** опционально — CC-X from <previous spec> (если standing policy применима, см. Шаг 7).

## 5. Стратегические развилки
[результат Сквозной проверки 3]

Cell-формат как у feature-spec, с явной фиксацией impact на состав функций.

### Sf1. <название> [decision: что решаем] [status: RESOLVED | OUT-OF-SCOPE]

**Resolution:** ответ + reasoning
**Branches [XOR | OR | OPT]:**
- Sf1.1 — <label> → impact: <какие функции добавляются / удаляются / меняют scope>
- Sf1.2 — <label> → impact: ...
**Связи:** ссылки на F-...
**Examples:** опциональные конкретные сценарии

(DEFERRED forks при closure мигрируют в backlog § Deferred forks per D17, в spec'е после closure не остаются. OPEN forks недопустимы при closure — должны быть либо RESOLVED, либо DEFERRED, либо OUT-OF-SCOPE.)

## 6. Сквозные политики
[результат Шагов 7, 8, 10 — только новые в этой итерации; standing policies из предыдущих spec'ов inherited через поле `Inherits` в карточках Section 4, см. D17]

### CC1. <название>
**Применяется к:** F-..., F-... | всем функциям
**Resolution:** что именно правило диктует
**Pattern:** «Если <условие> → <действие>» — для жёстких политик

## 7. Переиспользуемые подполитики
[P-NAME-блоки если применимо — алгоритм / правило, на которое ссылаются ≥2 функции]

### P-<UPPER-CASE-WITH-DASHES>
[блок, описывающий поведение]
**Used in:** F-..., F-..., CC...

## 8. Базовые требования к нагрузке и доступности
[результат Шага 11, если применимо]

Только то, что осознанно выбрано как продуктовое решение.

## 9. Примерные сценарии работы
[опционально: включается если коммерческий / multi-segment контекст или явный запрос оператора]

### Сценарий: <название>
3-5 строк narrative с явными ссылками на F-...

## 10. Ссылки на парковку
[skill-generated при closure — навигационные pointers на backlog]

Из этой спеки в backlog перенесены:
- **F-comm-X** (auto-classification) → parked (level: detailed). См. `<product-slug>-product-backlog.md` § Parked features.
- **Sf-Y** (email vs email + TG) → deferred. См. backlog § Deferred forks.
- **F-Z** (mobile app native) → rejected. См. backlog § Out-of-scope.

Полные карточки и причины — в backlog. Эта секция — навигация.

## 11. Что может пойти не так
[результат завершающей проверки — premortem-сценарии и порождённые ими функции / развилки / границы]

## 12. Открытые вопросы на момент закрытия сессии
[skill-generated]

| ID | Тип | Описание | Likely blocker / nice-to-have / уточнить |
|----|-----|----------|------------------------------------------|
| F-X | OPEN flag в функции (Resolution не зафиксирован) | ... | likely blocker / nice-to-have |
| Sf-Y | DEFERRED fork (мигрирует в backlog) | ... | nice-to-have для следующих итераций |
```

---

### Sub-resolutions

**OQ3 — формат Секции 10.** Section 10 = «Ссылки на парковку» — навигационные pointers на backlog для items, перенесённых при closure. Без дат, без волн, только references. Полные карточки и причины — в backlog (per D17). Closure mechanics (что мигрирует куда) — в D17 § Closure flow.

**OQ4 — нотация зависимостей.** Поле `Зависит от` в карточке = SSoT. Mermaid в начале Секции 4 — mandatory derived projection.

**OQ5 — sample user journeys.** Conditional: коммерческий / multi-segment контекст или явный запрос оператора. Формат — короткий narrative (3-5 строк) с явными ссылками на F-..., не диалог.

**OQ7 — cross-cutting функции.** Сами сервисы (audit log, нотификационный hub, поиск) = enabler features в карточках Секции 4 (модуль «Platform» или распределение по уместным модулям). Правила применения = сквозные политики в Секции 6. Разные ID-префиксы (F-... vs CC...), разные секции.

---

## Mode and update mechanics

### D13. Brainstorm-only mode (no direct path)

**What.** product-spec работает **только через brainstorm path**. Direct path (как у feature-spec) не применяется. Self-assessment bifurcation на «direct vs brainstorm» отсутствует.

**Why.** Продукт inherently multi-feature, multi-segment (в нетривиальных кейсах), enabler features inherently прячутся за product-language probe'ами per D9. Top-down enabler derivation теряется при skip — это основная value-add скилла. Operator, который может всё перечислить upfront, скиллу не нужен.

Edge case'ы (личный продукт с чёткой картиной, тривиальный 2-функциональный продукт, эксперт с большим стажем) не оправдывают direct: probes коллапсируют до быстрых ответов в trivial случаях, но catch'ат forgotten enabler'ы даже у экспертов.

**Closes** OQ2.

---

### D14. Update mode mechanics — LLM-driven, no structured parsing

**What.** Update mode (модификация existing artifact) работает через **Read + LLM-понимание + Edit**, без regex parsing, без helper scripts, без runtime infrastructure.

- **Read tool** загружает файл целиком в контекст.
- **LLM-понимание** парсит содержание семантически (карточки, deps, forks, waves).
- **Edit tool** делает surgical changes (одна карточка / один блок).
- **Integrity checks** — LLM перечитывает после изменений, валидирует логически.
- **Mermaid регенерация** — LLM перечитывает все `Зависит от` и переcоставляет блок (helper script alternative parked в OQ14).

**Why.** Per P2 проекта (Skill = LLM instructions в markdown, не код), скилл — не runtime. Structured parsing создаёт maintenance burden (отдельный код, dependency, sync drift) без значимой выгоды (LLM надёжно работает с одним markdown файлом).

**Diff representation:** через Edit «было/стало» по конкретной карточке или блоку. Narrative summary в дополнение для крупных изменений.

**Confirmation gate:** per логическая операция (split feature / move в другую wave / re-scope cuts — каждая = один confirmation point).

**Версионность и rollback:** через git, скилл не дублирует. Если файл не в git — скилл предупреждает оператора как best practice, не блокирует работу.

**Расширено D17/D18:** update mode применяется к **обоим артефактам** — spec и backlog. Mermaid регенерация — для in-scope features текущей spec'и (не для всего backlog'а).

**Closes** OQ10.2-OQ10.6.

---

### D15. Update mode triggering — always-check + inform

**What.** При активации скилла:

1. **Glob check** в configured location на паттерн `*product-spec.md` и `*product-backlog.md`.
2. **Branch по результату:**
   - **Spec'и нет** — first iteration, from-scratch без override.
   - **Spec найден (один или несколько)** — show оператору список + spec metadata (date, status, slug).
3. **Identify active spec** per D18 (status ∈ {draft, signed} = active; status=shipped = frozen).
4. **Propose action:**
   - Если active найдена → дефолт **update mode** на ней (D14 mechanics).
   - Если active нет, есть только frozen → дефолт **new spec** для следующей итерации.
   - Operator может override любой default («закрой active, начнём новую» / «открой повторно frozen для дополнения» — последнее skill отказывает per D18 frozen invariant).
5. **Backlog (если найден)** → loaded в context для cross-iteration enabler reuse и auto-suggestion из parked.

**Inferred default по invocation phrasing:**
- «обнови спеку» / «вернёмся к product-spec» → дефолт (a) update active.
- «новая product-spec» / «начнём с нуля» → дефолт (c) new spec; warning «но есть active X — точно archive?».
- Ambiguous → all options shown без default'а.

**Default file location** — configurable; конкретный default определяется в **OQ15** (file location convention для семейства hi_flow). До решения OQ15 — оба артефакта (spec + backlog) считаются living в одной configurable директории.

**Why.** Always-check защищает от кейса «оператор забыл что spec уже была» (продукт лежал на паузе долго, операторская память не надёжна). Operator's invocation phrasing рекомендует, но не bypass'ит check.

**Closes** OQ10.1. **Расширено D18** (multi-spec mechanics через status field).

---

## Iteration model and backlog

### D16. One spec = one iteration

**What.** product-spec покрывает **одну итерацию** (один shippable cut продукта), не весь продукт через все версии. Концепция multi-wave roadmap (MVP / v1.1 / v2 / Parked в одной спеке) **отвергнута**. Будущие итерации = новые spec sessions. Парковка между итерациями живёт в backlog (см. D17).

**Why.** Multi-wave модель в одной спеке порождает каскад проблем: unbounded document growth, mixing «что делаем сейчас» с «что давно отгрузили» с «что ещё рассматриваем», unclear closure semantics (документ никогда не закрывается), сложная update mode mechanics на больших документах. Этот сценарий уже произошёл с архитектурным документом нашего проекта (раздулся до 25K+ токенов, перестал читаться) — повторять не хочется.

One-spec-one-iteration даёт:
- Сфокусированный артефакт фиксированного размера.
- Чёткий closure semantic (spec frozen при shipping итерации).
- Соответствие agile / iterative product practice.
- Дисциплину scope (нельзя навалить «v3 parked» в текущую спеку).

**Iteration naming.** Семантический slug в имени файла: `2026-05-10-erp-mvp-product-spec.md`, `2026-08-15-erp-multichannel-product-spec.md`. Не номер итерации (iter1/iter2), не привязка к версии (v1/v2) — что итерация делает.

**Cross-iteration evolution.** Каждая новая итерация = новая spec session. Backlog обеспечивает memory между итерациями.

**Closes** OQ8 (parking forks между сессиями — растворяется в новой модели). **Cascading updates** документированы как supersession notes в D6 / D8 / D11 / D12 / D14 / D15.

---

### D17. Spec + Backlog two-doc system

**What.** Артефакты разделены на два с чётко разными ролями:

**Spec (per iteration)** — frozen process record своей итерации после closure. Содержит **полный контент**:
- in-scope features (карточки, designed в session).
- resolved strategic forks (полные cells с reasoning).
- premortem findings.
- sample user journeys (если включены).
- open items at closure.
- cross-cutting policies, **введённые** в этой итерации.
- Section 10 «Ссылки на парковку» — pointers на backlog (навигация, не контент).

**Backlog (per product)** — feature ledger living through all iterations:
- Iteration index (one-liner на итерацию + pointer на spec).
- Shipped features (pointers, см. asymmetric discipline).
- Parked features (full content, varying detail levels).
- Deferred strategic forks (full content).
- Out-of-scope rejected (one-liner + причина).
- Standing cross-cutting policies (pointers).

**Why.** Backlog без spec — теряем frozen process record («что и почему было решено в iter2») и focused input для downstream'а (feature-spec / arch-spec). Spec без backlog — теряем cross-iteration memory (enabler reuse, parked carry-over). Оба нужны, разные роли, разделены чисто.

---

#### Asymmetric size discipline (защита от раздувания)

| Тип entry | Формат | Размер |
|-----------|--------|--------|
| Shipped enabler pointer | ID + Name + Module + Type + Назначение + Входит + Не входит + spec ref | 5-6 строк |
| Shipped domain pointer | ID + Name + Module + Type + Назначение + spec ref | 3 строки |
| Parked feature (любой Type) | Полный контент + level (detailed / partial / note / fragment) + reason for parking | varies |
| Deferred fork | Полный cell + reason for deferring | varies |
| Out-of-scope rejected | One-liner + причина | 1 строка |
| Iteration index entry | Дата + slug + статус + spec ref | 1 строка |
| Standing policy pointer | ID + Name + spec ref | 1 строка |

**Rationale для asymmetric.** Shipped растёт **линейно во времени без верхней границы** (каждая итерация добавляет, ничего не убывает) → должны быть pointers. Parked / deferred — **bounded by intent** (поглощаются в новых итерациях по мере резолва) → могут быть full content. Domain shipped vs enabler shipped — enabler reuse требует scope match (нужны Входит / Не входит для match'а), domain reuse чаще решается на name-level → asymmetric pointer formats.

Размер на 100 features (70 domain + 30 enabler): ~360-390 строк shipped section. Backlog в целом для mature продукта: ~700-900 строк / 15-20K токенов. На 200+ features — открытый вопрос (per-iteration archiving — OQ для будущего).

---

#### Backlog skeleton

```markdown
# <Product> — Backlog

[Метаданные: дата создания, дата последнего обновления, версия структуры]

## Iteration index

| Дата | Slug | Статус | Spec |
|------|------|--------|------|
| 2026-05-10 | erp-mvp | shipped (2026-07-15) | docs/specs/2026-05-10-erp-mvp-product-spec.md |
| 2026-08-15 | erp-multichannel | in-progress | docs/specs/2026-08-15-erp-multichannel-product-spec.md |

## Shipped features

[Asymmetric pointers — см. форматы ниже. Сгруппированы по модулям для читаемости.]

### Module: Identity
[shipped enabler / domain pointers]

### Module: Communication
[shipped enabler / domain pointers]

## Parked features

[Полный контент. Каждая запись имеет level — см. определение уровней ниже.]

### F-comm-X. Auto-classification (level: detailed)
[full card как была на момент парковки + reason for parking + originating spec]

### Reporting subsystem (level: note)
Нужно подумать про reporting — операторы хотят статистику по разговорам. Не разбирался ещё. Возможно отдельный модуль.

### Webhook integration (level: fragment)
Webhook integration?

## Deferred strategic forks

### Sf-Y. Email vs email + Telegram
[full cell + reason for deferring + originating spec]

## Out-of-scope (rejected)

- F-Z. Mobile app native — отвергнуто iter1, причина: scope MVP не выдерживает; альтернатива — responsive web.

## Standing cross-cutting policies

- CC1. Все действия пишутся в audit log → spec docs/specs/2026-05-10-erp-mvp-product-spec.md § CC1.
```

#### Parked level definitions

| Level | Контент | Когда использовать |
|-------|---------|--------------------|
| `detailed` | Полная карточка D6 (все поля заполнены), reasoning'и проработаны | Operator проработал фичу полностью в session, но решил парковать (например, не вписывается в budget итерации) |
| `partial` | Часть полей карточки заполнена (Назначение + 1-2 других), остальное TBD | Operator начал прорабатывать, но столкнулся с blocker'ом (нужны данные / clarification) и парковал в полу-проработанном виде |
| `note` | 2-5 строк свободного текста с описанием идеи | Operator выкинул идею в стороне от основной работы, без формальной структуры |
| `fragment` | 1 строка — keyword или вопрос | Fast capture в session — «вспомнил, надо подумать», без time'а на обработку |

Operator сам решает level при парковке (skill спросит: «насколько детально хочешь сохранить?»). Skill при auto-suggestion из parked показывает level — operator понимает, насколько готова к pull в новый scope.

#### Standing cross-cutting policies trigger

CC становится «standing» (мигрирует в backlog § Standing policies как pointer) когда:
- В iter2 spec вводится **та же** policy (по смыслу), что была в iter1 → skill flag'ит «эта policy переезжает в standing, дублировать в каждой spec'е не имеет смысла».
- Operator явно помечает CC как «cross-iteration policy» при введении в первой spec'е.

Standing policy в backlog'е — pointer (1 строка + spec ref на originating). Spec последующих итераций ссылается на backlog § Standing policies через краткую секцию «Inherited policies» в Section 6, не дублирует контент.

#### Pointer formats — конкретные примеры

**Shipped enabler:**

```markdown
### F-id-2. Permissions [shipped iter1: erp-mvp]
**Module:** Identity
**Type:** enabler
**Назначение:** базовая модель прав доступа на уровне ресурсов
**Входит:** flat-роли (admin/user/viewer); per-resource permissions; assign/revoke/list
**Не входит:** иерархические роли с inheritance; ABAC; audit log
**Spec:** docs/specs/2026-05-10-erp-mvp-product-spec.md § F-id-2
```

**Shipped domain:**

```markdown
### F-comm-1. Email-conv [shipped iter1: erp-mvp]
**Module:** Communication
**Type:** domain
**Назначение:** двусторонние email-разговоры оператора с клиентами с threading
**Spec:** docs/specs/2026-05-10-erp-mvp-product-spec.md § F-comm-1
```

---

#### Closure flow

При closure итерации skill автоматически:

1. **In-scope features** → migration в backlog как **shipped** (pointer per asymmetric format; full card остаётся в spec frozen).
2. **Parked-this-iteration** → migration в backlog как **parked** (full content).
3. **Deferred strategic forks** → migration в backlog как **deferred** (full content).
4. **Out-of-scope (rejected)** → migration в backlog как **rejected** (one-liner с причиной).
5. **Resolved strategic forks** — остаются **только в spec** (process record, не carry-over).
6. **Iteration index** в backlog обновляется новой записью.
7. **Standing cross-cutting policies** — если введены в этой итерации впервые, добавляется pointer в backlog § Standing policies.

После closure spec не модифицируется (frozen invariant). Backlog обновляется через update mode (D14, D15).

---

#### Cross-iteration enabler reuse

Skill при Шаге 5 (Enabler derivation) для нового domain feature:

1. Operator отвечает «да» на probe-вопрос (например, «нужны ли роли пользователей?»).
2. Skill **сначала проверяет shipped backlog** на match (по pointer'у — Входит / Не входит для enabler'ов).
3. Цепочка решений:
   - **Match (Входит покрывает нужное)** → propose **reuse** без новой карточки. Связь устанавливается через `Зависит от: F-X` в новой domain'ой карточке.
   - **Partial match (Входит покрывает основное, но нужно добавить)** → propose **extension** (новая card F-X-ext в текущей spec, depends on F-X).
   - **Mismatch (Не входит явно содержит нужное)** → propose **новая card** F-Y, отдельная от существующей.
   - **Ambiguous (pointer недостаточен)** → skill **читает originating spec on-demand** для полной картины.
4. Operator подтверждает / правит выбор.

Для domain shipped (минимальный pointer) — обычно name-level dedup в Шаге 4. При scope inquiry — spec read on-demand (редкий кейс).

---

#### Auto-suggestion из parked backlog

Skill сканирует parked backlog на семантическое пересечение во время:

- **Шаг 4 (Domain feature enumeration):** после описания operator'ом кандидата → match → flag «уже parked F-X с детальной проработкой из iterN; pull / merge / держать отдельно».
- **Шаг 5 (Enabler derivation):** после кандидата enabler — после check'а shipped (если no match) → check parked → match → flag.
- **Шаг 6 (Scope cuts):** при обсуждении «выносим в parking» → match → flag «уже было запарковано похожее, слить или держать отдельно».

Match heuristic — semantic (LLM judgment), не regex / индекс. Признаки совпадения: близкие names, перекрывающиеся scopes (Назначение / Входит), одинаковые upstream deps.

False positives / negatives — operator корректирует устной фразой («нет, другая фича»), не блокирует процесс.

---

#### Auto-check deferred forks

Сквозная проверка 3 (Strategic fork classification) при возникновении candidate fork:

1. Применяется D5 test (меняет feature list / deps?).
2. **Также** проверка пересечения с deferred forks в backlog'е.
3. Match → flag «связано с deferred Sf-Y из iterN, резолвить сейчас или продолжать как отдельный fork?».

---

#### Extensions

Расширение существующей shipped feature **= новая card в новой spec**, не модификация existing. Iter1 spec остаётся frozen. Iter3 spec содержит **F-X-ext** (или F-X-v2) с `Зависит от: F-X`. Backlog имеет обе записи как separate shipped entries.

При cross-iteration query «нужны иерархические роли»:
- `F-id-2 [shipped iter1]` — `Не входит: иерархические роли` → mismatch.
- `F-id-2-ext [shipped iter3]` — `Входит: hierarchical roles + inheritance` → match.

Skill предлагает F-id-2-ext.

---

#### Skill behavior summary

**При старте сессии (расширение D15):**
1. Glob check на existing product-spec.md.
2. Glob check на existing product-backlog.md.
3. Если spec найден → ветвление per D15 (update / new / archive+new).
4. Если backlog найден → loaded в context (для cross-iteration enabler reuse + auto-suggestion из parked).
5. Если ни spec'а ни backlog'а — first iteration product, from-scratch без cross-iteration memory.

**При работе:** taxonomy D11 с adaptations:
- Шаг 5 проверяет shipped backlog первым делом для enabler reuse.
- Шаги 4-6 + Сквозная проверка 3 проверяют parked / deferred backlog для auto-suggestion.

**При closure:** migration per workflow выше; backlog обновляется (создаётся если не было), spec frozen.

---

### D18. Active spec identification + freeze semantics

**What.** В любой момент времени для продукта существует **≤1 active spec** — текущая итерация в дизайне или в process исполнения, но ещё не shipped. Все остальные spec'и для этого продукта — **frozen** (соответствуют shipped iterations, не редактируются никогда).

**Status field в metadata спеки** — расширяется тремя значениями:
- `draft` — спека в дизайне (operator работает в текущей session)
- `signed` — дизайн закрыт, перешли к feature-spec / impl
- `shipped` — итерация отгружена, spec **frozen**, не редактируется

Active = `draft` или `signed`. Frozen = `shipped`.

**Triggers.**

**Update existing active spec** (D14 mechanics) когда:
- Mid-design pivot в текущей итерации
- Feature-spec feedback loop (D8) на active spec'у
- Implementation discovery до shipping
- Operator явно говорит «обнови product-spec» при наличии active spec'и

**Create new spec** когда:
- Active spec'и нет (последняя `shipped` / frozen)
- Operator стартует новую итерацию
- Operator явно говорит «новая итерация»

**Frozen invariant.** `shipped` spec **не модифицируется никогда**. Если в iter3 нужно «поправить» решение из iter1 — это **новое решение в iter3 spec**, которое переопределяет (по date, latest wins). Backlog может flag'нуть конфликт между iter1 и iter3 решениями, но iter1 spec остаётся как был. Git history даёт audit trail.

**Skill behavior at session start (extension of D15):**

1. Glob existing product-spec.md files в configured location.
2. По status field в metadata определить active (status ∈ {draft, signed}) или frozen (shipped).
3. Случаи:
   - **Active найдена** → propose update mode для неё (D14 mechanics). Operator может override: «закрой active, начнём новую» — skill переводит active → status: `signed` (или `shipped` если operator подтверждает что итерация отгружена) и создаёт new draft.
   - **Active нет, есть frozen** → propose new spec для следующей итерации. Operator может override: «открой повторно X для дополнения» — **skill отказывает** (frozen invariant), предлагает override решений в новой spec'е.
   - **Specs нет** → first iteration, from-scratch.
4. Backlog (если есть) loaded в context для cross-iteration enabler reuse и auto-suggestion из parked.

**Status transitions.**
- draft → signed: operator завершает design session («дизайн закрыт, перехожу к feature-spec»). Может откатываться в draft при mid-design feedback.
- signed → shipped: operator подтверждает что итерация отгружена в production. **Необратимый переход** (frozen invariant).
- shipped → anything: запрещено.

Skill автоматически меняет статус только в очевидных случаях (например, draft → signed при closure session). Переход в shipped — только по явному operator confirmation.

**Closes** Update mode неопределённость в D14/D15 после введения multi-spec модели per D16/D17.

---

## Open questions (TBD в этой сессии)

Список вопросов, на которые ответы ещё не зафиксированы. Будут переноситься в Active Decisions по мере брейнсторма.

- ~~**OQ1.** Probing taxonomy categories~~ → **закрыт D11** (полный список шагов опроса).
- ~~**OQ2.** Self-assessment factors~~ → **закрыт D13** (product-spec — brainstorm-only, no direct path; self-assessment bifurcation не нужна, structurally direct path не имеет смысла на product-уровне).
- ~~**OQ3.** Roadmap section format~~ → **закрыт D12** (waves без дат, семантические метки, топология строгая).
- ~~**OQ4.** Cross-feature deps notation~~ → **закрыт D12** (depends_on = SSoT, Mermaid mandatory derived projection).
- ~~**OQ5.** Sample user journeys~~ → **закрыт D12** (conditional: коммерческий / multi-segment, формат narrative 3-5 строк).
- ~~**OQ6.** Premortem на product-уровне~~ → **закрыт D11** (завершающая проверка «что может пойти не так» с горизонтом 6 месяцев и пятью сценариями).
- ~~**OQ7.** Cross-cutting фичи~~ → **закрыт D12** (сами сервисы = enabler features в Секции 4; правила применения = CC-политики в Секции 6).
- ~~**OQ8.** Handling of in-progress fork resolution между сессиями~~ → **закрыт D16** (растворяется в one-spec-one-iteration модели — все unresolved forks при closure либо resolved, либо мигрируют в backlog как deferred для будущих итераций; нет multi-wave blocking).
- ~~**OQ9.** Output structure full skeleton~~ → **закрыт D12**.
- **OQ13.** Mermaid readability на больших продуктах (50+ функций). Кандидаты: per-module sub-diagrams + один high-level overview, либо collapsing по in-scope items только (skip parked/shipped в текущей итерации view). Не блокер сейчас, разрешать по результатам первого боевого прогона на нетривиальном продукте.
- **OQ14.** Mermaid generation — LLM-driven vs helper script (parked 2026-05-10 при принятии D14). Стартуем с LLM-driven подхода. Если на боевых прогонах окажется ненадёжно для больших графов (drift между depends_on и Mermaid, или генерация падает) — пересмотреть в пользу helper script (Node.js или Python, парсит карточки, выдаёт Mermaid-блок). Trade-off: P2 (skill = markdown, не код) против reliability на edge cases.
- **OQ15.** File location convention для семейства hi_flow. Кандидаты: (a) `<project>/docs/specs/hi_flow/` namespace под семейство; (b) `<project>/docs/specs/` flat (текущая конвенция feature-spec); (c) per-product subfolder `<project>/docs/specs/<product-slug>/`; (d) configurable с дефолтом. Affects: feature-spec v0.1.0 (миграция тривиальна), arch-spec (future), product-spec (текущий дизайн), **product-backlog.md** (новый артефакт per D17 — живёт там же, где product-spec'и). Не affects: arch-redesign / arch-audit (используют `docs/superpowers/specs/` для дизайн-спек). К решению — отдельная микро-сессия после OQ8 либо при первом боевом прогоне. До решения — оба артефакта (spec + backlog) считаются living в **одной configurable директории** (skill принимает default путь как параметр).
- ~~**OQ10.** Incremental update mode~~ → **закрыт D14 + D15** (D14 — mechanics через LLM-driven Read+Edit без structured parsing; D15 — triggering через always-check + inform). Sub-вопросы 10.1-10.6 покрыты, 10.7 (concurrent updates) deferred как single-operator assumption.
- **OQ11.** Boundary с arch-spec. product-spec выдаёт фичи + deps + scope cuts. arch-spec потом получит этот input. Граница между «scope cut в product-spec» и «архитектурное решение» нуждается в калибровке аналогично D5.
- **OQ12.** Feature-spec наследование product-context (новый — surface'нул на 2026-05-10). Если product-spec различает типы проектов (личный / коммерческий / etc.), то feature-spec тоже релевантно: sample dialogs в коммерческом случае должны быть per-segment, в личном — линейные. Self-assessment factors также могут зависеть. К ревизии feature-spec после первого боевого прогона (не блокер сейчас).

---

## Decision log (chronological)

- **D1** (2026-05-10): three-layer feature taxonomy (domain / enabler / scaffolding)
- **D2** (2026-05-10): feature definition (3 tests: independent shippability, atomic user job, negotiability)
- **D3** (2026-05-10): module = cluster label, не уровень декомпозиции
- **D4** (2026-05-10): топология DAG, не дерево; ordering = топосорт
- **D5** (2026-05-10): boundary test (fork = product-level если меняет feature list или deps)
- **D6** (2026-05-10): per-feature granularity = карточка 5-8 строк
- **D7** (2026-05-10): два типа forks в product-spec (strategic forks + scope cuts per feature)
- **D8** (2026-05-10): feedback loop product-spec ↔ feature-spec — product-spec.md is living document
- **D9** (2026-05-10): enabler features выводятся через probes из domain features, не enumerируются
- **D10** (2026-05-10): ~~pitch плагина — top-down от user-facing value~~ → **REMOVED 2026-05-10** (corollary D9 + market-positioning, не design decision; содержал устаревшие отсылки к MVP/roadmap, не вписывающиеся в D16/D17)
- **D11** (2026-05-10, обновлён D17/D18): adaptive single-skill design + полный список шагов опроса (7 обязательных включая финальный Шаг 12 «scope confirmation + integrity validation + closure migration» + 3 условных + 2 опциональных + 3 сквозных + 1 завершающая); закрывает OQ1 и OQ6; bifurcation на отдельные скиллы отвергнута, но migration plan на bifurcated design сохранён как fallback
- **D12** (2026-05-10): полный скелет product-spec.md (12 секций) + Mermaid mandatory в Секции 4 (derived projection, depends_on остаётся SSoT) + Section 10 — навигационные ссылки на backlog; закрывает OQ3, OQ4, OQ5, OQ7, OQ9; surface'нул новый OQ13 (Mermaid readability на больших продуктах)
- **D13** (2026-05-10): product-spec — brainstorm-only, без direct path; self-assessment bifurcation не применяется; асимметрия с feature-spec оправдана (продукт inherently multi-feature/multi-segment, top-down enabler derivation теряется при skip); закрывает OQ2
- **D14** (2026-05-10, extended by D17): update mode mechanics — LLM-driven Read + Edit без structured parsing/regex; Mermaid регенерация LLM'ом (helper script alternative parked в OQ14); diff representation через Edit «было/стало»; confirmation gate per логическая операция; версионность и rollback через git, не дублируем; **применяется к обоим артефактам — spec и backlog**; closes OQ10.2-10.6
- **D15** (2026-05-10, extended by D18): update mode triggering — always-check на наличие existing product-spec.md в default location + inform оператора с тремя опциями (update / new в том же проекте / archive+from-scratch); inferred default по invocation phrasing; default file location configurable, конкретный default — в OQ15; closes OQ10.1; OQ10.7 (concurrent updates) deferred. **Multi-spec mechanics определены в D18** (active spec identification по status field).
- **D16** (2026-05-10): one spec = one iteration. Multi-wave roadmap concept в спеке отвергнут. Каждая product-spec покрывает одну итерацию (один shippable cut продукта). Iteration naming — семантический slug. Closes OQ8. Cascading supersession в D6 / D8 / D11 Шаг 12 / D12 Section 10 / D14 / D15.
- **D17** (2026-05-10): spec + backlog two-doc system. Spec — frozen process record per iteration (full content). Backlog — feature ledger living across iterations (asymmetric size discipline: shipped enabler 5-6 строк + Входит/Не входит pointer; shipped domain 3 строки минимальный pointer; parked / deferred — full content; rejected — one-liner). Pointer-not-content для shipped защищает от unbounded growth (bloat lesson из архитектурного документа). Cross-iteration enabler reuse через backlog query + spec read on-demand при ambiguity. Auto-suggestion из parked при Шагах 4-6. Auto-check deferred forks в CCP3. Extensions = новые cards (frozen-spec invariant). Closure flow: in-scope → shipped pointers, parked-this-iteration → backlog full, deferred forks → backlog full, rejected → backlog one-liner, resolved forks → остаются в spec.
- **D18** (2026-05-10): active spec identification + freeze semantics. ≤1 active spec per product (status ∈ {draft, signed}); frozen specs (status: shipped) не редактируются. Status transitions: draft ↔ signed, signed → shipped (необратимый). Skill определяет active vs frozen по status field в metadata; update mode только на active; new spec при отсутствии active. Override frozen — запрещено, переопределение через новую spec'у (latest wins). Closes update mode неопределённость в D14/D15 после multi-spec модели per D16/D17.

---

## Notes for future sessions

Если эта сессия прерывается до завершения:

- Список зафиксированных решений выше — не пересматривать без явного триггера.
- Open questions — точка возобновления. Идти по порядку OQ1 → OQ11, но допустимо менять порядок если нужен контекст из последующих.
- При завершении брейнсторма документ переименовывается из WIP в финальный design-spec, статус меняется на «design complete», вызывается `superpowers:writing-plans`.
- Git: документ создан, **не закоммичен**. Коммит — по явному запросу оператора.
