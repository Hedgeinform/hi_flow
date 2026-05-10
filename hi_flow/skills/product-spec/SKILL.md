---
name: product-spec
description: Use when operator says «продуктовая спека», «спека продукта X», «продуктовая декомпозиция», «давай продумаем продукт X», «product-spec для X», «новая итерация продукта», or English equivalents («product spec», «product decomposition», «next iteration of <product>»). Produces product-spec.md + product-backlog.md.
---

# `hi_flow:product-spec` — Product-Level Decomposition Skill

Помоги оператору превратить продуктовую идею (или новую итерацию существующего продукта) в замороженный `product-spec.md` для одной отгружаемой итерации плюс живой `product-backlog.md`, который накапливает реестр функций между итерациями.

Скилл системно вытаскивает пользовательские (domain) функции и производные поддерживающие (enabler) функции через структурированный опрос на продуктовом языке (top-down per D9), классифицирует стратегические развилки по тесту границ D5, управляет памятью между итерациями через бэклог с асимметричной дисциплиной размера записей.

## Out of scope

- Углубление в одну фичу — отдельный скилл `hi_flow:feature-spec`.
- Архитектурные решения — `hi_flow:arch-spec` (выводит архитектуру из готовых product-spec + feature-spec).
- Implementation planning — `hi_flow:impl-plan` припаркован; покрывается Superpowers TDD methodology.
- Auto-invoking следующей фазы — оператор инициирует переход вручную.

## Output

**Два артефакта:**

1. **product-spec.md** — замороженная запись процесса дизайна одной итерации. Default location: `<project>/docs/specs/YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md` (configurable per OQ15).

2. **product-backlog.md** — реестр функций, живущий через все итерации одного продукта. Default location: `<project>/docs/specs/<product-slug>-product-backlog.md` (configurable). Создаётся при первой итерации, обновляется в каждой последующей.

## Anti-triggers (do NOT auto-activate)

- «спека на фичу X», «продуктовый дизайн фичи X» — это уровень feature-spec, не product-spec. Предложить правильный скилл, не запускать product-spec.
- «давай добавим функцию Y в продукт» — может быть либо feature-spec (если продукт уже существует), либо update mode product-spec (если меняем scope текущей итерации). Уточнить у оператора, не запускать автоматически.
- «спроектируй архитектуру для X» — территория arch-spec.
- «реализуй X», «напиши код» — фаза имплементации.
- «расскажи про методологию» — research / explanation, не запуск скилла.

## Mode

Скилл работает **только через brainstorm path**. Direct path не применяется на product-уровне — продукт по природе многофункциональный, многосегментный, и top-down вывод поддерживающих функций (D9) теряется при пропуске опроса.

**Никаких self-assessment proposals оператору на старте сессии.** Скилл сразу переходит к Process flow.

Если оператор явно скажет «direct» / «без проб» — отказать с ссылкой на D13 и предложить short-path brainstorm: тривиальные шаги в простых продуктах пробегаются быстро, но проходятся все.

## Process flow

Сессия проходит через четыре фазы:

1. **Session setup** — определение active spec и загрузка backlog'а.
2. **Operator dump** — открытое описание продукта оператором без структурирования.
3. **Agent probing** — двенадцатишаговая таксономия (см. ниже), последовательно. Сквозные проверки активны параллельно.
4. **Closure** — Шаг 12 (scope confirmation + integrity validation + closure migration) + завершающий премортем + таблица открытых вопросов.

После closure — User Review Gate, потом передача в feature-spec (если оператор инициирует) или закрытие сессии.

### Session setup

При активации скилла:

1. **Glob check** в configured location (default `<project>/docs/specs/`):
   - `*product-spec.md` — существующие product-spec файлы.
   - `<product-slug>-product-backlog.md` — backlog текущего продукта.

2. **Identify active spec** среди найденных. Active = поле `status` в metadata ∈ {draft, signed}. Frozen = `status: shipped`.

3. **Branch по результату:**
   - **Active spec найдена** → предложить update mode: «Найдена active spec [path], status [status]. Продолжаем работу над ней?». Default — да; оператор может override («закрой active, начнём новую»).
   - **Specs нет** → first iteration product, from-scratch без override.
   - **Только frozen specs** → предложить новую spec для следующей итерации: «Найдены frozen specs [list]. Стартуем новую итерацию?». Default — да.
   - **Запрос override frozen invariant** («открой повторно X для дополнения») → отказать: «Frozen specs не редактируются (D18 frozen invariant). Если решение из iter1 нужно пересмотреть — это новое решение в новой spec'е, latest wins».

4. **Backlog загружается в контекст** для cross-iteration enabler reuse и автоподсказок из parked.

5. **Operator confirmation** (явный или через продолжение работы) → переход в Operator dump phase.

### Operator dump

Открыть единым широким вопросом:

> *«Расскажи про продукт. Что это, для кого, какие задачи решает. Дамп всё, что в голове.»*

Если active spec / update mode — формулировка адаптируется:

> *«Что меняется в этой итерации продукта по сравнению с уже зафиксированным? Что нужно добавить, что убрать, что переосмыслить?»*

Скилл слушает, не задаёт probe'ов. Оператор может быть кратким или подробным — обе ситуации валидны.

Дамп может быть пустым («хочу X, ничего пока не думал») — переходим к опросу без задержки.

## Probing Taxonomy

Floor checklist для brainstorm path: **7 обязательных шагов (1-6 + финальный 12) + 3 условных + 2 опциональных + 3 сквозных + 1 завершающая**.

### Universal rule

Пройти все категории, но **не обязательно** генерировать output в каждой условной/опциональной — explicit N/A допустим для тех, у которых триггер не сработал. Обязательные шаги дают output всегда.

**Адаптивная глубина** — глубина шагов 1-3 варьируется по типу проекта (личный / стартап-MVP / open-source / внутренний инструмент / коммерческий). Шаги 4-12 одинаковы независимо от типа.

Каждый шаг имеет процедуру (вход → алгоритм → выход). Адаптивные probes допускаются как **дополнение** к процедуре, не замена.

### Обязательные шаги

#### Шаг 1. Описание продукта

**Процедура:**
- 1.1. Спросить: «Что это за продукт — одной фразой?»
- 1.2. Уточнить тип проекта: личный / open-source / стартап-MVP / внутренний инструмент / коммерческая разработка под заказчика.
- 1.3. *Если проект не личный:* «Кто заказчик (платит) и кто пользователь (использует)? Это разные роли?»
- 1.4. *Если коммерческий или внутренний:* «Какие бизнес-цели у заказчика?» — это драйверы приоритизации, не сами функции.
- 1.5. *Если стартап-MVP или open-source:* «Какие гипотетические типы пользователей? Обоснуй.»

**Output anchor:** Section 1 (Описание продукта) спеки.

#### Шаг 2. Группы пользователей

**Процедура:**
- 2.1. Перечислить группы или роли пользователей.
  - Личный продукт: 1 группа (фиксируем явно, даже если очевидно).
  - Стартап-MVP / open-source: 2-4 гипотетические персоны.
  - Коммерческий / внутренний: 3-7+ реальных ролей внутри организации заказчика.
- 2.2. Для каждой группы — описание роли и основная цель использования продукта.

**Output anchor:** Section 2 (Группы пользователей).

#### Шаг 3. Задачи каждой группы

**Процедура:**
- 3.1. Для каждой группы — список задач, которые её пользователи хотят решать через продукт.
- 3.2. *Если групп больше одной:* пересечения задач между группами (где одна группа создаёт что-то, другая потребляет).
- 3.3. *Если коммерческая разработка:* связь задач пользователей с бизнес-целями заказчика — какие задачи продвигают какие бизнес-цели (для приоритизации).

**Output anchor:** Section 3 (Задачи пользователей).

#### Шаг 4. Перечисление пользовательских функций

Пользовательская функция = то, что юзер видит и использует, что само по себе даёт ему ценность.

**Процедура:**
1. Каждая задача из Шага 3 → кандидат в пользовательскую функцию.
2. Применить три теста D2:
   - **Independent shippability** — отгрузить только это, будет ли value? Если ответ «нет» — не фича, переразложить.
   - **Atomic user job** — один user job-to-be-done на функцию? Если внутри три разных job — псевдо-модуль, разбить.
   - **Negotiability of inclusion** — «делаем ли X?» осмысленный продуктовый вопрос?
3. Кандидат, не прошедший хотя бы один тест → переразложить (раздробить, объединить, отбросить).
4. **Auto-suggestion check parked backlog.** После описания operator'ом каждого кандидата — скилл сканирует parked backlog на семантическое пересечение. Match → flag оператору: «уже было запарковано похожее F-X из iterN, level [level]. Pull / merge / держать отдельно?». Match heuristic — semantic (LLM judgment), не regex. Признаки совпадения: близкие names, перекрывающиеся scopes (Назначение / Входит), одинаковые upstream deps.
5. Результат: список пользовательских функций с одной строкой описания на каждую.

**Output anchor:** Section 4, карточки с `Тип: пользовательская`.

#### Шаг 5. Вывод поддерживающих функций (сверху вниз)

Поддерживающая функция = то, что нужно, чтобы пользовательские функции работали (учётная запись, права, восстановление пароля, нотификации, поиск, журнал действий, экспорт). У них тоже есть продуктовые решения, поэтому они в продуктовой спеке.

**Процедура:**
1. Для каждой пользовательской функции — пройти список вопросов в продуктовом языке (probe table per D9):

| Инженерный вопрос (НЕ задавать) | Продуктовый эквивалент (задавать оператору) | Поддерживающая функция, которая выводится |
|---|---|---|
| Нужен ли auth? | Один тип юзера или разные роли? | User CRUD |
| Какой auth method? | Самостоятельная регистрация или invite-only? | Registration flow |
| RBAC или ABAC? | Все админы равны или есть градации прав? | Permissions model |
| Multi-tenancy? | Несколько изолированных компаний делят инстанс? | Tenancy model |
| Какой password reset? | Юзер может забыть пароль и восстановить сам? | Password reset flow |
| Нотификации? | Юзер хочет узнавать о событиях, когда он не в системе? | Notifications channel(s) |
| Search infra? | Юзеру нужно найти запись среди многих? | Search enabler |
| Audit log? | Нужно знать, кто что когда сделал? | Audit log enabler |

2. Каждое продуктовое «да» порождает кандидата на поддерживающую функцию.

3. **Shipped backlog check (cross-iteration enabler reuse).** Перед созданием новой enabler карточки скилл проверяет shipped backlog на match по pointer'у (Входит / Не входит). Дерево решений:
   - **Match (Входит покрывает нужное)** → propose **reuse**: «У тебя F-id-2 (Permissions) shipped. Покрывает flat-роли admin/user, что нужно. Используем без новой карточки?». Operator подтверждает → новая domain card получает `Зависит от: F-id-2`, новая enabler не создаётся.
   - **Partial match (Входит покрывает основное, но нужно добавить)** → propose **extension**: «F-id-2 покрывает flat-роли, но не иерархические. Создаём F-id-2-ext в этой итерации?». Operator подтверждает → новая card F-id-2-ext, depends on F-id-2.
   - **Mismatch (Не входит явно содержит нужное)** → propose **новая card**: «F-id-2 не покрывает ABAC. Создаём F-id-3 (ABAC permissions)?».
   - **Ambiguous (pointer недостаточен)** → скилл **читает originating spec on-demand** для полной карточки enabler'а, делает финальное решение.

4. **Auto-suggestion check parked backlog** (если shipped check no match). Скилл сканирует parked backlog на семантическое совпадение — match → flag оператору, как в Шаге 4.

5. Результат: список поддерживающих функций с зависимостями обратно к пользовательским, которым они служат.

**Output anchor:** Section 4, карточки с `Тип: поддерживающая`.

#### Шаг 6. Границы каждой функции

Для каждой функции (пользовательской и поддерживающей) заполнить три поля:

- **Входит:** что включаем в эту функцию в этой версии.
- **Не входит (но это отдельная функция):** что вынесено в другую функцию роадмапа.
- **Не делаем вообще:** что отрезано на уровне продукта.

**Процедура:**
1. Уточняющие вопросы оператору: «Какой минимально полезный кусок этой функции? Где её разумная граница? Что точно не делаем в этом продукте?»
2. **Parking match flag.** При обсуждении «выносим в parking» — скилл сканирует parked backlog на семантическое пересечение. Match → flag: «уже было запарковано похожее F-X из iterN, слить или держать отдельно?».
3. Heuristic для оператора: если в product-spec нужно расписать функцию больше 5-8 строк, чтобы решить «включаем в MVP» — детализация ушла глубоко. Подняться обратно до scope cut. Дальнейшее — feature-spec.

**Output anchor:** Section 4 карточки, поля Входит / Не входит / Не делаем вообще.

### Условные шаги (запускаются при срабатывании триггера)

#### Шаг 7. Сквозные политики — inheritance-aware

**Триггер:** ≥2 in-scope features в этой итерации **ИЛИ** новая функция вводит cross-cutting concern (audit log, нотификации, search, export, file storage и т.п.), которого не было в предыдущих итерациях.

**Процедура:**
- 7.1. Скилл читает backlog § Standing policies + спеки предыдущих итераций — список применимых уже-известных политик.
- 7.2. Для каждой in-scope функции этой итерации скилл проверяет: попадает ли под существующие standing policies? Если да — функция **наследует политику** (в карточке добавляется поле `Inherits: CC-X from <previous spec>`).
- 7.3. Если в текущей итерации появляются новые cross-cutting concerns, **не покрытые** существующими политиками — задать вопрос оператору («Единый audit log поверх всех функций или у каждой свой?», «Общая система нотификаций или каждая функция шлёт свои?»). Output: новая CC policy в spec § Сквозные политики, потенциально новая поддерживающая функция (общий сервис журнала / общий узел нотификаций).

**Если все cross-cutting concerns этой итерации покрыты existing standing policies — Шаг даёт результат «inherited only, новых policies в spec'е нет».** Это валидное завершение, не пропуск.

**Output anchor:** Section 6 (Сквозные политики).

#### Шаг 8. Жизненный цикл данных — inheritance-aware

**Триггер:** in-scope функция этой итерации хранит persistent data **И** либо нет existing lifecycle policies (первая такая функция в продукте), либо новая функция вводит lifecycle aspect, не покрытый существующими.

**Процедура:**
- 8.1. Скилл читает существующие lifecycle policies (если есть в backlog или предыдущих spec'ах).
- 8.2. Для каждой in-scope функции, которая хранит persistent data — проверка: существующие retention / GDPR / migration policies покрывают?
- 8.3. Если новая функция вводит новый data lifecycle aspect — задать вопрос («Что происходит с данными юзера, когда он уходит?», «Как долго хранить логи?», «Нужны ли право на забвение и экспорт?», «Soft vs hard delete?»). Output: новая lifecycle policy в spec этой итерации, возможно новая поддерживающая функция (data retention service, GDPR export), стратегические развилки.

**Если все lifecycle aspects покрыты existing policies — Шаг даёт результат «inherited only».** Аналогично Шагу 7.

**Output anchor:** Section 6 (Сквозные политики), часть про lifecycle.

#### Шаг 9. Взаимодействия между группами пользователей

**Триггер:** групп больше одной (Шаг 2 даёт ≥2).

**Процедура:** задать оператору: «Какие сценарии требуют участия двух и более групп? Кто видит данные кого? Какие функции доступны только определённым группам?»

**Output anchor:** Поле `Доступно группам` в карточках Section 4; развилки в межгрупповых сценариях — Section 5.

### Опциональные шаги (только при явном основании)

#### Шаг 10. Соответствие нормативным требованиям

**Триггер:** домен подлежит регулированию (медицина, финансы, образование, обработка персональных данных GDPR, доступность WCAG).

**Процедура:** задать оператору: «Какие требования законов или стандартов применимы? Кого они затрагивают? Какие функции продукта обязаны им соответствовать?»

**Не выдумывать требования для нейтральных доменов.** Если триггер не сработал — explicit N/A.

**Output anchor:** Жёсткие политики в Section 6.

#### Шаг 11. Базовые требования к нагрузке и доступности

**Триггер:** оператор поднимает явно либо домен высокоставочный.

**Процедура:** задать оператору: «Порядок числа пользователей? Ожидания по скорости отклика? Гарантии доступности? Объём данных? Работа без интернета или только онлайн?»

В продуктовую спеку попадает только то, что заказчик / оператор осознанно выбирает как продуктовое решение (например: «обязательно работает офлайн»). Конкретные числа нагрузки — материал арх-спеки.

**Output anchor:** Section 8 (Базовые требования к нагрузке и доступности).

### Финальный обязательный шаг

#### Шаг 12. Scope confirmation + integrity validation + closure migration

Запускается после Шагов 4-11 (всё содержание итерации зафиксировано).

**Процедура:**

- **12.1. Scope confirmation.** Скилл показывает оператору финальный сводный список: in-scope features (с карточками), parked-this-iteration (с level), deferred forks, rejected. Оператор подтверждает или правит.

- **12.2. Integrity validation** (скилл выполняет автоматически):
  - **Orphan check** — enabler в in-scope, ни одна domain-функция от него не зависит → flag: «F-X в scope, никто не использует — точно нужен?».
  - **Broken closure** — domain-функция в in-scope, её enabler в parked / out-of-scope → flag: «F-Y зависит от F-Z, который parked — резолви».
  - **Cyclic deps** — цикл в графе зависимостей → блокирующая ошибка с требованием резолва.

- **12.3. Closure migration** в backlog:
  - in-scope → backlog § Shipped (asymmetric pointers per Type — см. Backlog mechanics ниже).
  - parked-this-iteration → backlog § Parked (full content + поле level).
  - deferred forks → backlog § Deferred (full content).
  - rejected → backlog § Out-of-scope (one-liner).
  - resolved forks остаются в spec § Стратегические развилки.
  - Iteration index в backlog обновляется новой записью.

- **12.4. Status transition.** При подтверждении оператора — статус спеки автоматически переходит `draft` → `signed` (готов к feature-spec). Переход `signed → shipped` — позже, по явной команде оператора («iter X отгружена / iter X в production»). Скилл применяет переходы детерминированно, без эскалации (см. Operational Rules).

**Output:** spec готова к User Review Gate, backlog обновлён, frozen invariant сохраняется.

### Сквозные проверки (постоянно активны во время всей сессии)

#### CCP1. Выявление неявных критериев

Если в ответе оператора всплывает расплывчатое слово (быстро, часто, много, опасный, похоже, естественно) — задать уточняющий вопрос: переводим в число, в правило-чеклист, или принимаем как принципиально нечёткое и закрепляем якорным примером.

#### CCP2. Проверка на противоречия

После каждого нового ответа сверять с уже записанной структурой. Если новый ответ противоречит чему-то — поднять конфликт оператору, не записывать молча:

> *«В Шаге 4 ты сказал X, в текущем ответе предполагается Y. Конфликт. Какое решение верно / нужно ли пересмотр?»*

#### CCP3. Классификация стратегических развилок

Когда в ответах всплывает развилка-кандидат — применять **тест D5**:

1. Меняет ли feature list? Ветки развилки приводят к разным спискам функций в роадмапе?
2. Меняет ли cross-feature deps? Ветки реорганизуют граф зависимостей (новые связи, новые корни)?

Любое «да» → стратегическая развилка → секция 5 спеки. Если оба «нет» — feature-уровень, не записывается в продуктовую спеку, пойдёт в feature-spec.

В серых зонах оператор решает явно («это будет product-spec fork» / «это уйдёт в feature-spec»). Скилл подсвечивает серую зону, не выбирает за оператора.

**Auto-check deferred forks.** Также проверка пересечения candidate fork с deferred forks из backlog'а. Match → flag оператору: «связано с deferred Sf-Y из iterN, резолвить сейчас или продолжать как отдельный fork?».

Перед завершением сессии — отдельный финальный проход по всем накопленным развилкам для подтверждения корректной классификации.

### Завершающая проверка — премортем на 6 месяцев

В конце сессии задать вопрос:

> «Представь — продукт запущен, прошло 6 месяцев. Что пошло не так? Сценарии: пользователи не пришли / пришли но ушли / конкурент съел рынок / технический долг сломал скорость разработки / сам оператор отказался поддерживать продукт.»

Каждое представимое осложнение → потенциально новая функция, стратегическая развилка или граница, которую упустили.

**Output anchor:** Section 11 (Что может пойти не так).

### Условие завершения сессии

Перейти к закрытию можно только когда:

- Все обязательные шаги (1-6, 12) дали результат.
- Все условные шаги (7-9) с сработавшими триггерами дали результат либо явно помечены «не применимо».
- CCP3 прошла финальный проход.
- CCP2 — нет открытых конфликтов.
- Премортем проведён.

## Backlog mechanics

Бэклог хранит реестр функций, живущий через все итерации продукта, с **асимметричной дисциплиной размера записей** (защита от неограниченного роста по уроку из архитектурного документа проекта).

### Содержание backlog'а по типам записи

**Iteration index** — таблица с одной строкой на итерацию:

| Дата | Slug | Status | Spec |
|------|------|--------|------|
| 2026-05-10 | erp-mvp | shipped (2026-07-15) | docs/specs/2026-05-10-erp-mvp-product-spec.md |

**Shipped enabler pointer** (5-6 строк):

```markdown
### F-id-2. Permissions [shipped iter1: erp-mvp]
**Module:** Identity
**Type:** enabler
**Назначение:** базовая модель прав доступа на уровне ресурсов
**Входит:** flat-роли (admin/user/viewer); per-resource permissions; assign/revoke/list
**Не входит:** иерархические роли с inheritance; ABAC; audit log
**Spec:** docs/specs/2026-05-10-erp-mvp-product-spec.md § F-id-2
```

**Shipped domain pointer** (3 строки):

```markdown
### F-comm-1. Email-conv [shipped iter1: erp-mvp]
**Module:** Communication
**Type:** domain
**Назначение:** двусторонние email-разговоры оператора с клиентами с threading
**Spec:** docs/specs/2026-05-10-erp-mvp-product-spec.md § F-comm-1
```

**Parked feature** (full content + поле level):

```markdown
### F-comm-X. Auto-classification (level: detailed)
**Status:** parked
**Originating analysis:** docs/specs/2026-08-15-erp-multichannel-product-spec.md (Секция 4)
**Reason for parking:** ML-стоимость не вписалась в бюджет iter2
**Carry-over candidate for:** iter3+
[full card content]
```

Уровни parked: `detailed / partial / note / fragment`. Operator выбирает level при парковке (скилл спросит: «насколько детально хочешь сохранить?»).

**Deferred fork** — full cell как было в spec'е + reason for deferring + originating spec ref.

**Out-of-scope (rejected)** — one-liner: `F-Z. Mobile app native — отвергнуто iter1, причина: scope MVP не выдерживает; альтернатива — responsive web.`

**Standing cross-cutting policies** — pointer (1 строка + spec ref на originating).

### Asymmetric pointer discipline — обоснование

| Тип записи | Формат | Размер |
|---|---|---|
| Shipped enabler pointer | ID + Name + Module + Type + Назначение + Входит + Не входит + spec ref | 5-6 строк |
| Shipped domain pointer | ID + Name + Module + Type + Назначение + spec ref | 3 строки |
| Parked feature (любой Type) | Полный контент + level + reason | varies |
| Deferred fork | Полный cell + reason for deferring | varies |
| Out-of-scope rejected | One-liner + причина | 1 строка |
| Iteration index entry | Дата + slug + статус + spec ref | 1 строка |
| Standing policy pointer | ID + Name + spec ref | 1 строка |

**Почему асимметрия.** Shipped растёт линейно во времени без верхней границы (каждая итерация добавляет, ничего не убывает) → должны быть pointers. Parked / deferred — bounded by intent (поглощаются в новых итерациях по мере резолва) → могут быть full content. Domain shipped vs enabler shipped: enabler reuse требует scope match (нужны Входит / Не входит), domain reuse чаще решается на name-level → asymmetric pointer formats.

### Closure flow (operational)

При Шаге 12.3:

1. Если backlog не существует — создать с шапкой по skeleton'у `references/product-backlog-template.md`:

```markdown
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
```

2. Migration items в соответствующие секции (per § Closure migration в Шаге 12.3).
3. Iteration index обновляется новой записью в табличной форме.
4. Standing CC policies — only for newly-introduced. Скилл flag'ит «новая CC, добавить в standing?» при closure если в spec'е есть CC, ещё не помеченная как inherited. Триггер автоматического перевода в standing: в iter2 spec вводится та же policy (по смыслу), что была в iter1 — скилл предложит «эта policy переезжает в standing, дублировать в каждой spec'е не имеет смысла».

После closure spec не модифицируется (frozen invariant). Backlog обновляется через update mode.

### Cross-iteration enabler reuse (Шаг 5 detail)

Расширенное дерево решений для каждого нового domain feature на Шаге 5 — см. Шаг 5 § 3 выше.

Domain shipped pointer (минимальный) обычно используется только для name-level dedup в Шаге 4. При scope inquiry — spec read on-demand (редкий кейс).

### Auto-suggestion из parked backlog

Скилл сканирует parked backlog на семантическое пересечение в трёх местах:
- **Шаг 4** — после описания operator'ом domain feature кандидата.
- **Шаг 5** — после кандидата enabler, если shipped check no match.
- **Шаг 6** — при обсуждении «выносим в parking».

Match heuristic — semantic (LLM judgment), не regex. Признаки совпадения: близкие names, перекрывающиеся scopes, одинаковые upstream deps.

False positives / negatives — operator корректирует устной фразой («нет, другая фича»), не блокирует процесс.

Аналогично для **deferred forks** в CCP3 — match → flag «связано с deferred Sf-Y из iterN, резолвить сейчас или продолжать как отдельный fork?».

### Update mode (D14 mechanics)

Если на Session setup определена active spec → update mode применяется к текущему spec и backlog.

**Поддерживаемые операции:**

- **Add feature** (новый F-X): probe Шаги 4-6 для новой; Шаг 5 enabler closure; spec update.
- **Remove feature**: проверка downstream deps (никто не зависит?); если зависят — резолвить.
- **Split feature** (X → A + B): add A + add B; remove X; reroute deps; integrity revalidate.
- **Merge features** (A + B → C): add merged; remove обе; reroute deps.
- **Update scope cuts**: edit карточки (поля Входит / Не входит), без cascade.
- **Add / edit CC policy**: новая или обновлённая запись в Section 6.
- **Resolve OPEN strategic fork**: apply changes per выбранной ветке (add/remove features); обновление feature list.

**Mechanics:**
- Read tool загружает spec + backlog в контекст.
- LLM понимает структуру семантически, edit'ит точечно через Edit tool.
- Integrity check после каждой операции (orphan / broken closure / cycles).
- Mermaid в Section 4 регенерируется LLM'ом при изменении deps.
- Diff representation — через «было/стало» в proposal оператору перед apply.
- Confirmation gate — per логическая операция (split = один confirmation, не три отдельных).

**Без structured parsing.** Скилл работает с markdown как с текстом. Mermaid helper script alternative припаркован в OQ14 (если LLM-генерация Mermaid окажется ненадёжной на больших графах — пересмотрим).

**Frozen invariant** — shipped specs не редактируются (D18). Если оператор пытается «открыть frozen spec для дополнения» — отказать: «Frozen invariant. Если решение из iter1 нужно пересмотреть — это новое решение в новой spec'е, latest wins».

### Spec status field (D18)

Метаданные спеки содержат поле `status` с тремя значениями:

- `draft` — спека в дизайне (operator работает в текущей сессии).
- `signed` — дизайн закрыт, перешли к feature-spec / impl. Active spec, можно редактировать.
- `shipped` — итерация отгружена, spec **frozen**, не редактируется.

**Переходы статуса** (детерминированные действия скилла, без эскалации оператору):

- `draft → signed` — автоматически по completion Шага 12 + User Review Gate.
- `signed → shipped` — по явной команде оператора «iter X отгружена / iter X в production». Скилл применяет детерминированно.
- `shipped → anything` — запрещено. Скилл блокирует попытки edit.
- `signed → draft` — оператор может вручную через edit metadata, если решает переоткрыть design (скилл не борется, но и не инициирует).

Active = `draft` или `signed`. Frozen = `shipped`.

**Связь с дисциплиной P6 ARCHITECTURE.md.** Status transitions, integrity checks, format validations и closure migration — детерминированные действия. Скилл выполняет их без вопросов оператору. Эскалация — только для продуктовых решений (что включаем, как режем scope, как резолвим конфликт).

## Output Format

### File locations

- Spec: `<project>/docs/specs/YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md`
- Backlog: `<project>/docs/specs/<product-slug>-product-backlog.md`

(Конкретный default location зависит от OQ15 file convention для семейства hi_flow — на момент imp v0.1.0 default — flat `docs/specs/`.)

### Skeleton

Полный skeleton спеки — `references/product-spec-template.md`. Полный skeleton backlog'а — `references/product-backlog-template.md`. Worked example — `references/example-contact-tracker-mvp.md`. Скилл читает эти три файла на старте сессии для anchoring формата output'а.

### PRD-as-standalone principle

Spec self-sufficient для контекста итерации. Backlog читается отдельно для cross-iteration памяти. ARCHITECTURE.md проекта читается отдельно для архитектурного контекста — не дублируется.

### Plain language principle

Spec и backlog адресованы продуктологу, не разработчику. Default — продуктовый русский. Англицизм допустим только если выполняется один из трёх критериев (см. memory `feedback_plain_language_conditional.md`):

1. Устоявшийся термин в индустрии (MVP, KPI, API, UX, ROI), у которого нет распространённого русского аналога.
2. Объективно компактнее или точнее русского при том же смысле, без потери нюанса.
3. Игра слов или специфический жаргон, теряющий смысл при переводе.

Engineer-only жаргон (extract-all, payload, throughput, idempotency, fallback) — переводится или раскрывается. Plain product naming для переменных (target_weight, current_weight) — нормально как структурные идентификаторы.

Контроль — гештальт-просмотр готового текста: читается ли это как русский с редкими оправданными вкраплениями, или как англо-русская мешанина? Опасная зона — кластеризация двух+ англицизмов в одном предложении при наличии русских эквивалентов.

### Adaptive depth

Шаги 1-3 (Описание → Группы → Задачи) адаптируют глубину по типу проекта из Шага 1.2:
- Личный продукт: 1 segment, тривиальный jobs list.
- Стартап-MVP / open-source: 2-4 гипотетические персоны, гипотетические jobs.
- Внутренний инструмент / коммерческий: 3-7+ реальных ролей, jobs matrix segment × jobs, **buyer outcomes** в Шаге 1.4.

## Operational Rules — что скилл обеспечивает

1. **Top-down probing only.** Шаг 5 (вывод поддерживающих функций) идёт **из** пользовательских функций через продуктовый язык probe-таблицы D9, не через инженерный «нужен ли auth?». Скилл переводит инженерный вопрос в продуктовый эквивалент перед задаванием оператору.

2. **D2 three-test gate для каждой функции-кандидата.** Independent shippability + atomic user job + negotiability. Провал любого теста → переразложить (split / merge / drop), не пускать в feature list.

3. **D5 boundary test для каждой развилки-кандидата.** Меняет состав функций или связи между ними? → стратегическая развилка (Section 5). Иначе — feature-уровень, не записывается (пойдёт в feature-spec).

4. **D17 asymmetric pointer discipline в backlog'е.** Shipped enabler 5-6 строк (Входит/Не входит), shipped domain 3 строки, parked full content (любой Type), deferred full content, rejected one-liner.

5. **D18 frozen invariant для shipped спецификаций.** Никаких edits. Override через новую spec'у, latest wins.

6. **Operator escalation discipline (P6).** Не задавать оператору вопросы по детерминированным действиям (status transitions, integrity checks, format validations, миграция в backlog) — выполнять без вопроса. Не принимать решения за оператора в продуктовых вопросах — эскалировать.

7. **Closure требует резолва всех strategic forks.** OPEN forks недопустимы при closure — должны быть либо RESOLVED, либо DEFERRED (мигрируют в backlog), либо OUT-OF-SCOPE.

8. **Mermaid mandatory в Section 4.** Регенерация LLM'ом при каждом изменении поля `Зависит от` в карточках. Source of truth — поле `Зависит от` в карточках.

9. **Living document scope.** Spec — living **внутри** одной итерации (mid-design feedback от feature-spec → update mode). Backlog — living **через** итерации.

10. **Escalation rule.** При неоднозначности, неразрешимой из доступных данных — эскалировать оператору, не рестартовать upstream skill.

## Format Rules

1. **Hierarchical IDs (Cockburn-style).** Features: `F-<module-slug>-N` (например, F-id-1, F-comm-1, F-sales-2). Strategic forks: `Sf1, Sf2 ...`. Cross-cutting policies: `CC1, CC2 ...`. Reusable sub-policies: `P-<UPPER-CASE-WITH-DASHES>`.

2. **ID assigned ⇔ entry exists.** Нет dangling IDs без карточек. Нет карточек без ID.

3. **Поля `Status` и `Тип` обязательны на каждой feature card.** Status ∈ {in-scope, parked, out-of-scope}. Тип ∈ {пользовательская, поддерживающая}.

4. **Cardinality tag (XOR / OR / OPT)** обязателен на стратегических развилках с branches.

5. **`Зависит от`** — обязательное поле для **всех** функций (для domain-функций часто пусто или ссылки на enabler'ы; для enabler'ов часто пусто или ссылки на другие enabler'ы). Mermaid строится по нему.

6. **`Inherits`** — опциональное поле в карточке для standing CC policies из предыдущих итераций.

7. **`Доступно группам`** — обязательное если Шаг 9 сработал и группы различаются. Иначе omit.

8. **Все strategic forks при closure** — RESOLVED / DEFERRED / OUT-OF-SCOPE. OPEN forks при closure — блокирующая ошибка.

9. **Нет summary в конце спеки** — оператор читает в полном объёме per PRD-as-standalone.

10. **Backlog file naming** — `<product-slug>-product-backlog.md` (без даты, один на продукт).

11. **Spec file naming** — `YYYY-MM-DD-<product-slug>-<iteration-slug>-product-spec.md`.

## References

- **Product-spec template** with placeholders: `references/product-spec-template.md`. Используется как стартовая структура при write'е спеки.
- **Product-backlog template** with placeholders: `references/product-backlog-template.md`. Используется при создании backlog'а для нового продукта или при дополнении существующего.
- **Reference example** (worked product-spec + backlog для small contact tracker): `references/example-contact-tracker-mvp.md`. Read on session start для anchoring формата.
- **Design spec** для глубокого rationale всех D-decisions: `docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md`. Не читается на каждой сессии, ссылка для случаев когда поднимается архитектурный вопрос про сам скилл.

## Implementation Notes

- На старте сессии читать reference files (template'ы + example) для anchoring формата output'а.
- При first iteration product (нет existing backlog'а) — создать backlog по skeleton'у `product-backlog-template.md`. При update mode — load existing backlog в контекст.
- При новой strategic fork — применять D5 test на всё, что выглядит как развилка. Если меняет feature list / deps → strategic fork в Section 5. Иначе — отбросить (feature-уровень, пойдёт в feature-spec, в product-spec не записываем).
- При completing Шаг 12 — детерминированно перевести status `draft` → `signed` (без вопроса оператору).
- Никаких self-assessment proposals на старте (D13). Если оператор просит direct — вежливо отказать и предложить short brainstorm path.
