# Handoff: arch-spec feedback roadmap (первый боевой прогон, REH ERP 2026-05-31)

**Date:** 2026-06-01
**Source session:** консолидация фидбека после первого боевого прогона цепочки `feature-spec → arch-spec → writing-plans → impl` на REH ERP (audit-фича, итерация 1, green field).
**Audience:** будущие design-сессии по доработке семейства hi_flow. Self-contained — не предполагает доступа к транскрипту source-сессии.

**Назначение:** разнести 7 находок (A–G) боевого прогона по приоритету, типу и зависимостям; зафиксировать рекомендованный порядок сессий и scope каждой; защитить от повторного открытия уже решённого и от «починки» того, что отработало правильно.

**Первоисточники (в этом же репо):**
- `docs/feedback/hi_flow-arch-spec-feedback.md` — per-skill фидбек arch-spec (3 пункта).
- `docs/feedback/hi_flow-session-retro-2026-05-31.md` — консолидат по всей цепочке (chain-level находки).

> **UPDATE 2026-06-01 — порядок изменён (A-first), bootstrap спроектирован.** Оператор выбрал начать с находки A. `hi_flow:bootstrap` **спроектирован** (design-ready) — `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design.md`. По ходу: Ф3 расщеплена на Ф3a (relocation baselines+CI, лёгкое) и Ф3b (хуки → research-trigger, D10 amendment); граница A↔C разрешена системно (таксономия инфра-осей живёт в bootstrap, arch-spec C → сигнал); приняты P7 (coverage-honesty), P8 (разграничение высот). **Актуальный порядок сессий:** (1) Ф3a relocation → (2) bootstrap impl → (3) apply на REH_ERP frontend (incremental, grounding-кейс); arch-spec amendment (B+C+D, §4 Сессия 1 ниже) — параллельно/после, его C-часть упростится после bootstrap. §4 ниже отражает исходный план (arch-spec-first) — переопределён этим UPDATE.

---

## 1. Что произошло в source-сессии

Первый боевой прогон `hi_flow:arch-spec` на подписанной feature-spec (REH ERP audit, итерация 1 comm-core-plus-demos), с продолжением в `superpowers:writing-plans` до готового implementation-плана + исполнением Slice 1 параллельной сессией.

**Это закрывает pending «боевой прогон arch-spec / block C» из Current Status** — он состоялся 2026-05-31. Green field: кода в проекте не было вообще, Module Map пуст, стек не зафиксирован.

**Результат цепочки — работающий софт.** Slice 1 (bootstrap + write-path): `test` 14/14, `typecheck` clean, `audit:dep` no violations (15 модулей), независимо verified ревьюером. То есть методология (OQ1) на backend-слайсе **прошла end-to-end**. Частичный ответ OQ1 — да (с оговоркой: frontend-слайс заблокирован, см. находку A).

Прогон выявил 7 находок (A–G) разной природы и зрелости. Все 7 сверены с актуальным текстом `hi_flow/skills/arch-spec/SKILL.md` в source-сессии (2026-06-01) — это не пересказ по памяти, фидбек точен.

---

## 2. Что отработало правильно — НЕ трогать, не «улучшать»

Критично зафиксировать, потому что находки ниже могут спровоцировать желание переписать соседние механизмы. Боевой прогон **подтвердил** корректность:

- **Extract-before-probing** — первым шагом вытащил готовые решения из feature-spec, не переспрашивал. Operational rule 1 работает.
- **Density-factor self-assessment** — корректно оценил плотно-решённую фичу как `direct` (brainstorm прошёл по запросу оператора для наблюдения, не по нужде).
- **Green-field block-C skip** — отработал по дизайну; forward-контракты ушли в инварианты + rules-patch.
- **Probing-таксономия** — floor 1-4 + сработавшие ceiling + **корректный анти-триггер ACL** (не паддил пустую категорию). Anti-pattern «padding ceiling categories» соблюдён.
- **Two-level operability triage**, изолированный self-review субагентом (поймал MED + 7 LOW), backlog-sync с idempotency-чеком (не задублировал 11 пунктов feature-spec).
- **Эмиссия sync-in-txn** — скилл корректно вывел, что глобальный принцип 7 здесь НЕ нарушается (single-DB fate-sharing), без ложной эскалации.

**Ложная находка (снята при ревью оператором) — урок против выдумывания проблем:** «green-field cross-cutting слепое пятно block C» оказалось выдумкой. Слот под forward-integration контракты существует (type-1 инварианты → rules-patch), скилл его явно описывает (D11 cumulative cycle), шаблон rules-patch демонстрирует ровно этот кейс. **Не открывать заново.** Порядок «audit до инструментируемых фич» — сознательный выбор product-spec, не edge case.

---

## 3. Находки A–G: приоритет, тип, целевой артефакт, зависимости

| # | Находка | Тип | Приоритет | Целевой артефакт | Зависимость |
|---|---------|-----|-----------|------------------|-------------|
| **A** | Нет владельца фиксации app-stack / project-bootstrap (рекуррентно: backend + frontend) | chain / методология | **High** | `hi_flow:bootstrap` (D20, ещё не спроектирован) | определяет границу для C; сам не блокирован |
| **B** | §10 смешивает code-sight forks и infra/deployment-bound bindings (разные потребители) | правка arch-spec | **High** | arch-spec SKILL.md §10 + «Sorting deferred items» | независим |
| **C** | Нет green-field-ветки про фиксацию стека + нет таксономии инфра-осей | правка arch-spec | **High** (мостовой) | arch-spec Pre-conditions + новая таблица инфра-осей | граница с A; мостовой вариант независим |
| **D** | rules-patch «только X→Y» без composition-root exemption | правка arch-spec | **Low-Med** | arch-spec rules-patch gen + `references/rules-patch-template.yaml` | независим; уже примирён руками в REH_ERP |
| **E** | Security-инвариант требует trust-chain review; «matches spec» недостаточно при кривом референс-коде плана | process / D14 boundary | **Medium** | развилка: arch-spec §8 пометка vs superpowers methodology | частично вне scope hi_flow |
| **F** | Denylist секретов принципиально неполон (compromised path) | проектная REH_ERP | **Medium** | НЕ скилл (REH_ERP); опц. урок для security-инвариантов | вне scope hi_flow |
| **G** | Plan-баги: secret-filter arrays + conds:never[] | impl REH_ERP | — | backported в план REH_ERP | действий не требует |

### A — нет владельца фиксации app-stack / project-bootstrap

**Симптом.** Цепочка `feature-spec → arch-spec → writing-plans` на greenfield встала на стыке arch-spec → writing-plans. arch-spec зафиксировал только то, что форсировала фича (Postgres). Остальной app-stack (язык, фреймворк, тест-раннер, ORM, scaffolding, toolchain) не зафиксирован **никем**. writing-plans по дизайну рассчитан на «existing codebase, follow established patterns» — а codebase'а нет.

**Корень.** В методологии нет шага «project bootstrap / fix app-stack / scaffold», логически предшествующего implementation **первой** фичи. Каждый существующий шаг справедливо его НЕ делает: feature-spec — продуктовое поведение; arch-spec — только feature-forced (feature-level); writing-plans — предполагает готовый codebase. Это не баг одного скилла, а дыра в цепочке.

**Рекуррентность подтверждена.** Slice 2 (`audit-ui`) заблокирован тем же — frontend-стек не зафиксирован (meta-фреймворк отложен «до первой UI-фичи»). Находка повторяется на frontend ровно как предсказано. `audit-query` (read-backend поверх готового store) — НЕ заблокирован.

**Ключевое: это уже в roadmap.** `D20` + Current Status планируют `hi_flow:bootstrap` (working name) как «project init wizard + **stack selection** + initial macro-arch probing + **folder skeleton**». Это вариант (a) из ретро §3. Фидбек **не открывает новую дыру — он эмпирически подтверждает приоритет bootstrap и наполняет его требованиями.** Открытый вопрос ретро «где это живёт?» в значительной мере отвечен — в bootstrap.

**Что фидбек добавляет к D20-bootstrap (требования к будущей design-сессии):**
- Выход bootstrap должен включать **зафиксированный app-stack** (язык / фреймворк / тест-раннер / ORM / scaffolding / CI / wiring arch-audit-тулинга) + **заскаффолженный репо**, такой, что `writing-plans` может стартовать. D20-формулировка («folder skeleton») это подразумевает, но не была проверена на достаточность для writing-plans — теперь проверена эмпирически (недостаточна без app-stack fixation).
- bootstrap обрабатывает **и frontend-стек** (рекуррентность Slice 2), либо отдельной веткой «UI-foundation при первой UI-фиче».

**Развилка ретро §3 (a–d) — для bootstrap design-сессии, не для этой:**
- (a) Отдельный bootstrap-шаг — лин автора ретро; совпадает с D20.
- (b) product-spec расширяется на tech foundation — минус: смешение продукта и стека.
- (c) Первый arch-spec несёт бремя — минус: неверная высота (feature-level тащит project-level).
- (d) Вне hi_flow (ручной setup) — минус: на greenfield забывается до блокера.

**В этой сессии (REH_ERP) обошли ad-hoc:** провели stack-решение вручную как мини-сессию (TS/Fastify/Drizzle/Vitest/pnpm + dev-Supabase/prod-plain Postgres), записали в REH_ERP ARCHITECTURE.md (D14 проекта). Сработало, но это обход дыры, не штатный шаг.

### B — §10 смешивает два типа делегаций

**Симптом.** Контракт §10 arch-spec — *«choose having seen the code, mind the constraint»* → потребитель `superpowers:writing-plans`. Но при разборе всплыли решения, которые этот тест НЕ проходят, хотя по наивности летят в §10:
- выбор **scheduler** (для retention purge) — решается знанием deployment/infra-модели, не кодом;
- выбор конкретного **object-storage backend** (S3 / MinIO / свой) — то же, deployment-bound.

Это infra-решения, заблокированные на другом ещё-не-принятом арх-решении (deployment-модель), а не code-sight implementation-forks. Если отдать writing-plans — он либо спунтует (выбор всплывёт ad-hoc на execution → cargo-cult, нарушение «never delegate understanding» + «фиксация решений в момент принятия»), либо угадает без контекста.

**Подтверждено сверкой с SKILL.md (2026-06-01):** §10 описан исключительно как code-sight forks; «Sorting feature-spec deferred items» даёт только развилку §10 (code-sight) vs §3 (deferred-pointer). Третьего канала — рекомендованный дефолт + констрейнт + «разблокируется при фиксации deployment-модели» — нет.

**Развязка REH_ERP (port-adapter):** пинить **порт/контракт** сейчас (`audit-retention.purge()` как чистая идемпотентная SQL-логика; `audit-overflow` против S3-совместимого порта), а привязку к инфре — либо с рекомендованным дефолтом (pg_cron, раз БД уже Postgres и джоба — чистый SQL), либо как deployment-bound deferred-item (НЕ в writing-plans). Раз порты запинены, writing-plans не заблокирован и не изобретает инфру.

**Предлагаемая правка (направление):** развести §10 на два под-раздела с разными потребителями:
- (а) **code-sight forks** → writing-plans (как сейчас);
- (б) **infra/deployment-bound bindings** → отдельный канал: рекомендованный дефолт + констрейнт + явная отметка «разблокируется при фиксации deployment-модели», НЕ в writing-plans как открытый выбор.

Тест разведения: «разрешается ли решение разглядыванием кода?» Нет → это не §10-для-writing-plans.

### C — green-field stack fixation + таксономия инфра-осей

**Симптом А (бремя фиксации стека).** REH_ERP ARCHITECTURE.md гласил «стек не зафиксирован, появится при первом arch-spec». Это первый arch-spec → он обязан кристаллизовать минимально-необходимое подмножество (БД-класс + object storage backend) — иначе §5.3 (data & state, DDL) писать не на чем. Но решение о стеке — **проектного уровня, не уровня фичи**. derivability-gate (non-domain + structural + critical) покрывает это неловко: выбор БД деривируется из проектных констант, не из audit-фичи; фича лишь первой форсирует. Скилл нигде не упоминает это бремя.

**Симптом Б (нет рамки декомпозиции инфра-осей).** При фиксации пришлось вручную строить декомпозицию: какие инфра-оси фича форсирует (реляционная БД — жёстко; object storage — порт), какие делегирует (scheduler, конкретный blob-backend), какие не трогает (язык/рантайм, UI, message queue, cache/search). Скилл не даёт чек-листа или таксономии — агент изобретает на ходу, рискуя пропустить ось или преждевременно зафиксировать ненужное.

**Подтверждено сверкой с SKILL.md:** green-field-ветка в Pre-conditions есть, но только про block C (integration) — не про фиксацию стека. Таксономии инфра-осей нет.

**C и A — две стороны одной проблемы.** C — как arch-spec мог бы частично закрыть; A — системный владелец. Граница (развилка для arch-spec amendment сессии): см. §7.

**Предлагаемая правка (направление):**
1. green-field-ветка Pre-conditions — пункт «если стек проекта не зафиксирован, первый arch-spec фиксирует минимально-необходимое подмножество, помечая project-level, и сигналит оператору, что это шире фичи».
2. краткая таксономия инфра-осей (persistence / blob / scheduler / messaging / cache / search / runtime / presentation) как чек-лист — по каждой явно классифицировать forced-now / delegated / not-touched.

### D — composition-root exemption в rules-patch

**Симптом.** Сгенерированный rules-patch содержит правила вида «только bottlenecks импортируют `audit-emitter`», «только emitter/query/retention импортируют `audit-store`» — строгие negative-lookahead `from`-паттерны. Такие правила **не оставляют легального места central composition-root** (app-entry/wiring-слой), который по природе импортирует много модулей чтобы их связать. depcruise зафлагует composition-root как нарушителя.

**Статус: уже примирён руками в REH_ERP** (exemption внесён в depcruise .yaml + .cjs ревьюером, закрывает фидбек #3 на уровне проекта). В сам скилл правка НЕ внесена — есть готовый паттерн для образца.

**Подтверждено сверкой:** в SKILL.md fitness invariants type-1 → rules-patch с `from`/`to`; упоминания composition-root exemption нет; `references/rules-patch-template.yaml` его не демонстрирует.

**Предлагаемая правка (направление):** arch-spec при генерации type-1 правил «только X→Y» **пред-предусматривает** composition-root exemption (`src/main.ts` / `src/bootstrap/` / `src/composition/`) в `from.pathNot`. Либо явная заметка в §8/§10, что эти правила требуют composition-root исключения при wiring. Рекомендация автора фидбека: да, пред-закладывать.

### E — security-инвариант требует trust-chain review

**Симптом.** Adversarial-ревью (трассировал trust-chain за границу диффа: emitter → redactSecrets) поймал реальный security-баг, внесённый на шаге **writing-plans**: secret-filter не рекурсил в массивы → секреты текли в `payload_json` и offload-blob при shape `{changes:[{token:...}]}`. Нарушение §8 #5 (один из «важнее всех»). arch-spec был **корректен** (инвариант верен) — баг был в референс-реализации плана.

**Урок.** «matches the spec» недостаточно, когда референс-код спеки сам неверен; для security-инвариантов нужно ревью, прослеживающее trust-chain, а не дифф-локальное.

**Граница (D14).** Review methodology — это `superpowers`, не hi_flow. В scope hi_flow — максимум **пометка** security-critical инвариантов в §8 arch-spec тегом «требует trust-chain review downstream, не дифф-локальный». Сам review остаётся за superpowers. Развилка — см. §7.

### F — denylist секретов неполон (проектная)

Denylist (`access_key`, `pwd`, `bearer`, `jwt` пропускаются) для security-инварианта принципиально хрупок → compromised path. **Это находка REH_ERP-проекта, не скилла** — помечена в плане REH_ERP. Опциональный урок для arch-spec/feature-spec: при генерации security-инвариантов предпочитать typed-marker / allowlist подход denylist'у, явно помечать denylist как compromised path. Marginal; приклеить к E или оставить вне scope.

### G — plan-баги (action: none)

secret-filter array-recursion (security, §8 #5) + `const conds = []` → `never[]` strict-mode (typecheck-блокер). Оба backported в план REH_ERP ревьюером. Действий по скиллам не требуют.

---

## 4. Рекомендованный порядок сессий

Принцип P4 (каждый скилл — дедикейтная design-сессия) + global принцип 10 (sequential по dependency graph). Три будущие сессии:

### Сессия 1 — arch-spec amendment (B + D + C-bridge) [рекомендована первой]

**Почему первой:** B и D полностью независимы и зрелы (направление из фидбека ясное, образец — product-spec v0.5.0 amendment, D уже примирён руками — есть готовый паттерн). C в **мостовом** варианте (фиксация feature-forced подмножества + сигнал «project-level» + таксономия инфра-осей) не блокируется bootstrap'ом и нужен в любом случае — market-ready юзер может bootstrap не поставить, а green-field stack-сигнал в arch-spec должен быть всегда.

**Scope:** правки `hi_flow/skills/arch-spec/SKILL.md` + `references/rules-patch-template.yaml`. Версия — amendment (incremental). Output — design-спека amendment'а + report.

**Не в scope:** системное владение app-stack (это A → bootstrap); review methodology (E → superpowers); implementation amendment'а (отдельная сессия по P2/P5, если решим).

### Сессия 2 — bootstrap design (A) [отдельная, P4]

**Почему отдельной:** новый скилл, не amendment. Большая, менее изолированная работа. Заберёт системное владение app-stack fixation. Уже в roadmap (D20 Функция 1, после arch-spec боевого прогона → bootstrap → living-architecture → L3). Фидбек повышает приоритет (подтверждённый блокер greenfield).

**Scope:** design `hi_flow:bootstrap` с требованиями из находки A (см. §3.A). Включает соотношение с D20 Функцией 1 (порт operator-personal architecture Create flow): bootstrap = Create flow ARCHITECTURE.md + app-stack fixation + scaffolding + folder skeleton + wiring arch-audit-тулинга.

**После сессии 2 — возможный micro-amendment arch-spec по C:** убрать мост, оставить чистый сигнал «app-stack не зафиксирован → запусти bootstrap». Зависит от того, как bootstrap определит границу (см. §7).

### Сессия 3 — E (security trust-chain review boundary) [малая, можно слить с сессией 1]

**Scope:** решить развилку §7 по E. Если ответ — «пометка инвариантов в arch-spec §8» — приклеить к сессии 1 (это одна строка в §8 + self-review-checklist). Если «boundary clarification D14» — отдельная микро-фиксация в ARCHITECTURE.md без правки скиллов.

---

## 5. Что уже зафиксировано / вне scope (не переоткрываем)

- **A в D20.** bootstrap уже в roadmap. Фидбек наполняет требования, не открывает новую сущность. Не переоткрывать вопрос «нужен ли bootstrap».
- **D примирён руками в REH_ERP.** Exemption в depcruise .yaml+.cjs. Правка скилла — чтобы будущие проекты не ловили это заново; на REH_ERP уже закрыто.
- **F — проектная REH_ERP.** Не скилл. В hi_flow — максимум опциональный урок (denylist = compromised path).
- **G — backported.** Закрыто в плане REH_ERP.
- **OQ1 частично закрыт.** Backend Slice 1 прошёл end-to-end (работающий софт). Frontend заблокирован stack-проблемой (= находка A). Не объявлять OQ1 полностью закрытым.
- **Раздел §2 этого handoff'а** — что отработало правильно. НЕ «улучшать» соседние механизмы при правках.

---

## 6. Read-list перед каждой будущей сессией

**Общий (все сессии):**
1. `ARCHITECTURE.md` — D7 (Phase 2 split), D11 (rules-patch контракт), D14 (hi_flow ↔ superpowers boundary), D20 (порт architecture, bootstrap), D21 (arch-spec), P4, P6, OQ6.
2. `docs/feedback/hi_flow-arch-spec-feedback.md` + `docs/feedback/hi_flow-session-retro-2026-05-31.md` — первоисточники.
3. Этот handoff.

**Сессия 1 (arch-spec amendment) дополнительно:**
4. `hi_flow/skills/arch-spec/SKILL.md` — целиком (правки layered поверх). Особенно §10 (Output structure), «Sorting feature-spec deferred items», Fitness invariants type-1, Pre-conditions «Three situations by audit».
5. `hi_flow/skills/arch-spec/references/arch-spec-template.md` — §10/§3/§5 структура.
6. `hi_flow/skills/arch-spec/references/rules-patch-template.yaml` — для D (composition-root exemption).
7. `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-design.md` — original design rationale (§10 контракт, derivability-gate).
8. REH_ERP: `Reh_Erp/docs/specs/2026-05-31-*-arch-spec.md` + сгенерированный rules-patch + примирённые depcruise .yaml/.cjs — grounding для B/C/D на реальном артефакте.

**Сессия 2 (bootstrap) дополнительно:**
4. `~/.claude/skills/architecture/SKILL.md` — Create flow + template + format validation + Topic Index init (Функция 1 порта по D20).
5. `~/.claude/skills/architecture/references/template.md` — шаблон ARCHITECTURE.md.
6. `docs/handoffs/2026-04-29-l3-hygiene-and-active-issues-handoff.md` — L3 hygiene + relocation (Функция 3), связано с wiring tooling.
7. REH_ERP ARCHITECTURE.md D14 (проекта) — пример ad-hoc app-stack fixation, который bootstrap должен сделать штатно.

---

## 7. Открытые вопросы / развилки (для соответствующих сессий)

1. **[Сессия 1] Граница A↔C.** В мостовом варианте C: фиксирует ли arch-spec feature-forced подмножество стека сам, или только сигналит «беги в bootstrap»? Лин: мостовой — фиксирует feature-forced + помечает project-level + таксономия; после bootstrap (сессия 2) деградирует до сигнала. То есть amendment пишет мост сознательно как временный, с пометкой «упростится после bootstrap».
2. **[Сессия 1] §10-(б) — где физически живёт infra/deployment-bound канал?** Новый под-раздел §10, или новая §11, или расширение §3 (Goal and boundaries / delegated)? Рекомендация: под-раздел §10 (рядом с code-sight forks, разные потребители явно противопоставлены).
3. **[Сессия 1/3] E — пометка vs boundary.** Помечать security-critical инварианты в §8 arch-spec тегом «trust-chain review required» (в scope hi_flow) ИЛИ ограничиться D14 boundary-clause «security review methodology = superpowers» (вне scope)? Рекомендация: лёгкая пометка в §8 + self-review-checklist (дёшево, не дублирует superpowers methodology, лишь сигналит downstream).
4. **[Сессия 2] bootstrap scope vs D20 Функция 1.** D20 описывает bootstrap как порт Create flow (ARCHITECTURE.md). Находка A требует ещё и app-stack fixation + scaffolding. Это расширение D20-bootstrap или bootstrap = надмножество (Create flow ∪ app-stack ∪ scaffold)? Рекомендация: надмножество — одна project-init сессия логически владеет всем «project foundation».
5. **[Сессия 2] frontend-стек.** Отдельная ветка bootstrap «UI-foundation при первой UI-фиче» или единый bootstrap фиксирует full-stack сразу? Рекуррентность Slice 2 — аргумент за «фиксировать оси по мере форсирования», что ближе к таксономии C. Связать с решением C.

---

## 8. Anti-patterns / gotchas

1. **Не объединять сессии 1 и 2 в одну.** P4 — каждый скилл/major-design в своей сессии. arch-spec amendment ≠ bootstrap design.
2. **Сессии 1/2 — про SKILL.md / references / design, не code.** Markdown. Implementation amendment'а (если потребуется) — отдельная сессия (P2: skill = LLM instructions, P5: subagent-driven batched).
3. **C-мост — сознательно временный.** Писать с пометкой «упростится после bootstrap», не как вечную ответственность arch-spec (иначе зафиксируем неверную высоту, противоречие принципу разведения уровней).
4. **Не выдумывать проблему там, где механизм есть** (урок ложной находки, §2). Перед «новой дырой» проверить, не покрыта ли она существующим слотом (rules-patch / backlog / §10).
5. **Не «чинить» §2-механизмы.** extract-before-probing, density-factor, ACL анти-триггер, sync-in-txn rationale — подтверждены боевым прогоном.
6. **Subagent self-review для design-спек** (P5 + brainstorming Spec Self-Review через изолированного субагента — глобальная инструкция).
7. **Plain language conditional** (P1): operator-facing блоки спек — plain Russian; инженерные internal-формулировки — инженерный OK.
8. **Stale-protection.** При старте каждой сессии — короткий pass: «handoff написан 2026-06-01 по REH_ERP-прогону; обстоятельства не изменились? новые наблюдения с тех пор?».

---

## 9. После завершения каждой сессии

Стандарт CLAUDE.md:
1. **Design report** рядом со спекой (`{spec}-report.md`).
2. **Update active-issues.md** — entry «arch-spec v-next amendment (B+C+D)» → pointer на готовый design / статус.
3. **ARCHITECTURE.md update** — proposal через скилл `architecture` (Active Decisions / Module Map статусы). Сессия 1 → новый D по разведению §10 + green-field stack. Сессия 2 → bootstrap из TO DESIGN в BUILT/design-ready, обновить D20.
4. **PROJECT_META.md** — decision atoms.

---

**Конец hand-off.**
