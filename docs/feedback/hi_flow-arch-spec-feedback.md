# Скилл-фидбек: hi_flow:arch-spec v0.6.4

**Сессия:** 2026-05-31, первый боевой прогон arch-spec в REH ERP (audit-фича, итерация 1 comm-core-plus-demos).
**Контекст:** arch-spec по signed feature-spec `docs/specs/2026-05-28-reh-erp-audit-feature-spec.md`. Первый arch-spec в проекте вообще — green field, кода нет, Module Map пуст, стек не зафиксирован.

Накопленные замечания за сессию. Дополняется по ходу.

---

## 1. Фиксация стека на первом arch-spec — неоговорённая ответственность + нет рамки декомпозиции инфра-осей

**Проблема А (бремя фиксации стека).** ARCHITECTURE.md проекта явно гласит «стек не зафиксирован, появится при первом arch-spec». Это первый arch-spec. Значит он обязан кристаллизовать стек (как минимум БД-класс + object storage backend) — иначе §5.3 (data & state, DDL) писать не на чем.

Но решение о стеке — **проектного уровня, а не уровня фичи**. Модель скилла «decisions as facts, derivable from feature-spec» + derivability-gate (non-domain + structural + critical) покрывает это неловко: выбор БД деривируется не из audit-фичи, а из проектных констант (D7 object storage, требование партиционирования). Фича лишь первой форсирует решение. Скилл нигде не упоминает это бремя и не говорит, куда писать решение (в ARCHITECTURE.md скилл не пишет — decoupled; в spec — но это не feature-decision).

**Проблема Б (нет рамки «какие инфра-оси фича форсирует»).** При фиксации стека пришлось вручную строить декомпозицию: какие инфра-оси audit-фича реально форсирует (реляционная БД — жёстко; object storage — порт), какие делегирует (scheduler, конкретный blob-backend), какие вообще не трогает (язык/рантайм, UI-фреймворк, message queue, cache/search). Скилл не даёт никакого чек-листа или таксономии инфра-осей — агент изобретает её на ходу, рискуя пропустить ось или, наоборот, преждевременно зафиксировать ненужное.

**Предлагаемая правка:** (1) в pre-conditions/green-field-ветку — пункт «если стек проекта не зафиксирован, первый arch-spec фиксирует минимально-необходимое подмножество, помечая как project-level, и сигналит оператору что это шире фичи»; (2) дать краткую таксономию инфра-осей (persistence / blob / scheduler / messaging / cache / search / runtime / presentation) как чек-лист — по каждой явно классифицировать forced-now / delegated / not-touched.

**Подтверждено downstream (та же сессия):** при попытке запустить `superpowers:writing-plans` на подписанной arch-spec скилл **уперся в пустой репозиторий** — arch-spec зафиксировал только Postgres (то, что форсировала фича), а app-stack (язык/фреймворк/тест-раннер/scaffolding) не зафиксирован никем в цепочке. writing-plans по дизайну рассчитан на «existing codebase» → не на чем строить план. Пришлось провести **отдельную project-level stack-сессию** (TS/Fastify/Drizzle/Vitest/pnpm + dev-Supabase/prod-plain Postgres) перед тем как план стал возможен. То есть это не теоретический gap — он **блокирует весь implementation** greenfield-проекта на стыке arch-spec → writing-plans. Усиливает приоритет: фактически в цепочке нет шага «project bootstrap / fix app-stack», который логически предшествует implementation первой фичи.

**Приоритет: Medium → High** (с учётом подтверждённого блокирования writing-plans на greenfield).

---

## 3. rules-patch «только X импортирует Y» не предусматривает composition-root exemption

**Проблема:** Сгенерированный rules-patch содержит правила вида «только bottlenecks импортируют `audit-emitter`» (#1) и «только emitter/query/retention импортируют `audit-store`» (#3) — строгие negative-lookahead `from`-паттерны. При переходе к implementation (writing-plans, Slice 1) всплыло: такие правила **не оставляют легального места для центрального composition-root** (app-entry/wiring-слой), который по природе импортирует много модулей чтобы их связать. depcruise зафлагует composition-root как нарушителя.

В этой сессии слайс это **обошёл** (emitter дёргается только тестами, `src/main.ts` импортирует лишь `src/db`), но при интеграции первого bottleneck'а / при необходимости shared-singleton emitter'а exemption понадобится явно.

**Предлагаемая правка:** arch-spec при генерации type-1 правил «только X→Y» должен **пред-предусматривать composition-root exemption** (`src/main.ts` / `src/bootstrap/` / `src/composition/`) в `from.pathNot`, а не оставлять это всплывать при первой реализации. Либо — явная заметка в §10/§8, что эти правила требуют composition-root исключения при wiring.

**Приоритет: Low-Medium.** Не блокер (обходится), но это предсказуемый нюанс, который дешевле заложить в rules-patch сразу, чем ловить на каждом проекте при первой врезке.

---

## 2. §10 «Delegated to implementation» смешивает два типа делегаций с разными потребителями

**Проблема:** Контракт §10 у скилла — «choose **having seen the code**, mind the constraint». Это тест: туда попадают решения, разрешаемые при виде реального кода → потребитель `superpowers:writing-plans` (секвенсор реализации).

Но при разборе всплыли решения, которые этот тест **не проходят**, хотя по наивности летят в §10:
- **выбор scheduler** (для retention purge) — решается не кодом, а знанием deployment/infra-модели;
- **выбор конкретного object-storage backend** (S3 / MinIO / свой) — то же самое, deployment-bound.

Это **infra-решения, заблокированные на другом ещё-не-принятом арх-решении (deployment-модель)**, а не code-sight implementation-forks. Если их отдать writing-plans, он либо спунтует (выбор всплывёт ad-hoc на execution → cargo-cult, нарушение «never delegate understanding» + «фиксация решений в момент принятия»), либо угадает без контекста.

Скилл валит оба типа в один бакет «delegated to implementation», отправляя infra-решения туда, где их некому корректно принять.

**Развязка, применённая в этой сессии (port-adapter):** пинить **порт/контракт** сейчас (`audit-retention.purge()` как чистая идемпотентная SQL-логика; `audit-overflow` против S3-совместимого порта), а конкретную привязку к инфре — либо с рекомендованным дефолтом (pg_cron, раз БД уже Postgres и джоба — чистый SQL), либо как deployment-bound deferred-item (НЕ в writing-plans). Раз порты запинены, writing-plans не заблокирован и не изобретает инфру — строит логику против интерфейсов.

**Предлагаемая правка:** в §10 развести два под-раздела с разными потребителями:
- **(а) code-sight forks** → writing-plans (как сейчас);
- **(б) infra/deployment-bound bindings** → отдельный канал: рекомендованный дефолт + констрейнт + явная отметка «разблокируется при фиксации deployment-модели», НЕ в writing-plans как открытый выбор.

Тест на разведение: «разрешается ли решение разглядыванием кода?» Нет → это не §10-для-writing-plans.

**Приоритет: High.** Бьёт по корректности всего downstream-хэндоффа arch-spec → writing-plans. В отличие от #1 (проявляется раз на проект), это срабатывает на **любой** фиче с инфра-зависимостью и недетерминированным deployment.

---

## Снятые замечания (для истории)

- **Green-field cross-cutting «слепое пятно block C»** — снято при ревью с оператором. Ошибка анализа: слот под forward-integration контракты существует (type-1 инварианты → rules-patch), скилл его явно описывает (D11 cumulative cycle), а шаблон rules-patch демонстрирует ровно этот кейс (`no-feature-code-to-audit-emitter`). Проблема была выдумана. Порядок «audit до инструментируемых фич» — сознательный выбор product-spec, не edge case.

---

## Сводка приоритетов правок

| # | Правка | Приоритет |
|---|--------|-----------|
| 1 | Фиксация стека на первом arch-spec + таксономия инфра-осей (подтверждённо блокирует writing-plans на greenfield) | **High** |
| 2 | §10 смешивает code-sight forks и infra/deployment-bound bindings — разные потребители | **High** |
| 3 | rules-patch «только X→Y» не предусматривает composition-root exemption | **Low-Medium** |
