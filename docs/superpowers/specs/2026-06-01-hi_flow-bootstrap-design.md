# hi_flow:bootstrap — Design

**Date:** 2026-06-01
**Status:** draft
**Скилл:** `hi_flow:bootstrap` (Phase 2, project-level foundation)
**Закрывает:** находку A (нет владельца app-stack fixation) первого боевого прогона arch-spec — `docs/handoffs/2026-06-01-arch-spec-feedback-roadmap-handoff.md`.
**Реализует:** D20 Функция 1 (порт Create flow operator-personal `architecture`), расширенную требованиями находки A.
**Grounding-кейс:** дофиксация frontend-стека в REH ERP (Slice 2 `audit-ui`) — incremental-режим.

---

## 1. Идентичность и место в цепочке

`bootstrap` — project-level скилл-владелец **технического фундамента** проекта: всего, что должно существовать **до** того, как первая фича пойдёт в имплементацию.

Находка A: цепочка `product-spec → feature-spec → arch-spec → writing-plans` на greenfield встаёт на стыке arch-spec → writing-plans — никто не фиксирует app-stack (язык, фреймворк, тест-раннер, ORM, scaffolding, CI), а writing-plans рассчитан на «existing codebase, follow established patterns». bootstrap закрывает этот разрыв: доводит репо до состояния, где паттерны **уже established**, после чего writing-plans стартует штатно.

**Место в цепочке:** bootstrap снимает блокер фундамента. На greenfield — между продуктовым видением и первой имплементацией. Рекуррентно — каждый раз, когда новая фича форсирует новую инфра-ось (incremental).

## 2. Scope

bootstrap владеет:

1. **Create flow `ARCHITECTURE.md`** — порт Функции 1 operator-personal `architecture` (создание документа, шаблон, format validation, Topic Index init, Module Map skeleton, проекция `## Stack`).
2. **App-stack fixation** — probing + фиксация технологий по инфра-осям.
3. **Scaffolding** — green skeleton + один convention-референс-паттерн.
4. **Wiring arch-audit-тулинга** — depcruise-config, rules baseline.
5. **Wiring L3-hygiene обвязки (Ф3a)** — раскладывает в проекте CI workflow + linter/formatter baseline + gates aggregate, **поставляемые Функцией 3a** (relocation baselines внутрь плагина). bootstrap — *потребитель* шаблонов, не владелец их дизайна (владение — Ф3a). **Хуки/enforcement (Ф3b) — вне scope:** выведены в research-trigger (решение 2026-06-01 — качественного CI достаточно; к хукам вернуться, только если CI окажется недостаточен). См. §14.

## 3. Границы (чего bootstrap НЕ делает)

| Сосед | Граница |
|---|---|
| **arch-spec** | module breakdown фичи, контракты, fitness-инварианты (feature-level «КАКИЕ модули»). bootstrap задаёт только «КАК устроен модуль в этом проекте» (project-level convention). |
| **feature-spec / product-spec** | что входит в продукт и фичу (поведение). bootstrap не трогает. |
| **living-architecture** | *поддержка* живого ARCHITECTURE.md после создания (события, drift, audit). bootstrap *создаёт* документ и фиксирует стек; дальше ведёт living-architecture. См. §9, KD2. |
| **writing-plans** | implementation-план фичи. bootstrap останавливается на «репо готово принять план». |

**Высотный принцип (сквозной):** bootstrap = project-level (toolchain, conventions, foundation). Всё feature-level остаётся выше по цепочке. Это системное разрешение границы A↔C: таксономия инфра-осей (находка C) живёт в bootstrap как его рабочий словарь, а arch-spec лишь **сигналит** «ось не зафиксирована → bootstrap» (не решает её — см. §13).

## 4. Модель «ось»

**Атом — одна инфра-ось.** Базовая операция, переиспользуемая обоими режимами. Три шага:

1. **probe** — выбрать технологию для оси (coverage-gated + дифференцированно, §6).
2. **scaffold** — разложить каркас под выбранную технологию (по scaffold-template из coverage-manifest).
3. **wire** — подключить тулинг оси: baseline (linter/formatter), arch-audit-adapter (depcruise-config), gates, CI-шаг.

**Таксономия осей** (operator-facing, plain Russian — инженерный термин в скобках):

- **язык и среда выполнения** (runtime)
- **база данных** (реляционное/основное хранилище состояния)
- **интерфейс / фронтенд** (UI)
- **файловое хранилище** (object storage / blob)
- **планировщик задач** (scheduler)
- **очереди сообщений** (messaging)
- **кэш** (cache)
- **поиск** (search)

Для конкретного прогона каждая ось классифицируется: **forced-now** (фиксируем) / **delegated** (порт зафиксирован, привязка отложена) / **not-touched** (не нужна — пропускаем явно, не паддим, но и не молчим). Потребитель `delegated`-осей — infra/deployment-bound канал §10 arch-spec (**forward-зависимость от amendment B**, ещё не реализован). До него bootstrap определяет `delegated` самодостаточно: «порт зафиксирован, конкретная привязка отложена до фиксации deployment-модели».

**Операциональный критерий нарезки осей:** одна ось = **одна технологическая категория с одним scaffold-template + одним coverage-набором + одним tooling-wire**. Оси режутся по «нужен ли отдельный каркас и покрытие», не по концептуальным зонтикам. Поэтому «база данных» (Postgres) и «файловое хранилище» (S3) — разные оси-листья (разные технологии/scaffold), а не общий зонтик `persistence`. Имя оси — конкретный лист в plain-языке. Новая ось появляется, когда возникает тех-категория со своим scaffold, не раньше → набор осей фиксирован в манифесте, расширяется *покрытие внутри оси*.

**Оси ≠ toolchain-компоненты (критично для атома).** Инфра-оси (8 листьев выше) — то, что имеет собственный scaffold-template + coverage-строку. **Toolchain-компоненты** (линтер, форматтер, тест-раннер, CI, arch-audit-config) — это **под-шаги wire**, привязанные к runtime-оси (и поставляемые Функцией 3), а НЕ самостоятельные оси: у них нет своего scaffold и своей coverage-строки, они не probe'ятся как оси, а настраиваются по baseline на шаге wire. Где ниже встречается «product-independent оси» — это runtime-ось + её toolchain-wire, не отдельные оси. `probe-class` (§6) — свойство, применимое и к осям, и к toolchain-компонентам, но «ось» в смысле атома §4 — только инфра-лист.

## 5. Coverage

**Принцип coverage-honesty (кандидат в project-specific принцип, §15):** bootstrap предлагает только то, что плагин **довезёт до конца** (baseline + audit + gates + scaffold). Весь hi_flow привязан к конкретным стекам, потому что L3-baselines, детерминированные графы (arch-audit через depcruise) и stack-файлы — все конкретны под технологию. Предложить непокрытый компонент = пообещать turnkey-hygiene, которой не будет.

**Coverage-manifest — SSoT покрытия** (принцип 4). Явный артефакт в плагине. Строки сгруппированы по осям (таксономия = измерение манифеста):

```
ось → технология → { stack-file, baseline, audit-adapter, scaffold-template, probe-class }
```

`probe-class` ∈ {buy-in, silent-baseline} — см. §6.

Текущее состояние (≈ только TypeScript-экосистема): `runtime` → TypeScript/Node покрыт; `база данных` → Postgres (частично); `интерфейс/фронтенд` → **пусто/частично** (grounding-кейс REH ERP frontend вскроет реальный gap по этой оси). Не хардкодим TS — читаем из манифеста динамически; coverage растёт = дописали строку (+ соответствующие baseline/adapter/template).

**Coverage-gated probing:** bootstrap читает манифест и предлагает по оси только полностью покрытые технологии.

**Поведение на непокрытом** (принцип 5, silent fallback запрещён): дефолт — не предлагать. Если оператор настаивает — не блокировать (он хозяин), но **degrade с громким предупреждением**: «ось вне coverage плагина — hygiene/audit/gates не подключатся, помечаю unmanaged». Никаких молчаливых обещаний.

**Частично покрытая ось** (не полный набор `{stack-file, baseline, audit-adapter, scaffold-template, probe-class}`) трактуется как **НЕ полностью покрытая** → подпадает под coverage-honesty: громкий сигнал «ось X покрыта частично — есть Y, нет Z; фиксирую покрытую часть, остальное unmanaged». silent-baseline (§6) молча фиксирует toolchain-компонент только при его **полном** покрытии; частичный/отсутствующий baseline → громкий сигнал, не молчание. Текущие `Postgres (частично)` и `UI (пусто/частично)` попадают именно сюда — grounding-кейс REH ERP frontend вскроет это поведение живьём.

**forced-now ∩ uncovered — разрешение (backport из impl 2026-06-01, поймано behavioral validation).** Ось, форсированная продуктом, может быть непокрыта (напр. фронтенд в grounding-кейсе): продукт её требует, плагин turnkey не довезёт. Чтобы «forced-now → запусти атом» и «uncovered → громкий сигнал» не противоречили:
1. Атом запускается только для **покрытой под-части** оси (если есть); для пустой оси scaffold/wire пропускаются (нечего раскладывать).
2. Ось помечается **`unmanaged`** + громкий coverage-honesty сигнал — этот сигнал **и есть deliverable** для оси (не молчаливый выбор технологии).
3. `unmanaged`-ось **исключена из done-gates** (у неё нет gates — см. §10). Прогон «done» с осью как `unmanaged`, не заблокирован.
4. Если оператор настаивает на непокрытой технологии — proceed с `unmanaged` degrade, всё ещё без hygiene/audit/gates, всё ещё громко.

## 6. Probing-дисциплина

**α — дифференцированно по типу оси** (P1/P6: оператор — продуктолог, не инженер). Класс probe — свойство оси в манифесте (`probe-class`):

| Класс | Оси | Поведение probe |
|---|---|---|
| **operator buy-in** | язык/среда, интерфейс/фронтенд, база данных, файловое хранилище | рекомендованный дефолт + **перевод в продуктовые последствия** + подтверждение оператора |
| **silent-baseline** | линтер, форматтер, тест-раннер, CI-шаблон, arch-audit-config | скилл фиксирует сам по baseline, молча; оператор может оспорить |

Промежуточные (планировщик, очереди, кэш, поиск) — buy-in lite: продуктовые/стоимостные последствия есть, но всплывают реже.

(Строка silent-baseline перечисляет **toolchain-компоненты** wire-шага, не инфра-оси — см. §4 «Оси ≠ toolchain-компоненты». `probe-class` — общее свойство осей и toolchain-компонентов.)

**Перевод в продуктовые термины** (P1) для buy-in осей: не «Fastify vs Express», а «больше готовых компонентов / легче найти разработчика / быстрее старт». Опции и таксономия — plain Russian.

**Вырождение buy-in при coverage=1:** пока coverage по оси = одна технология (сейчас runtime = только TS), buy-in вырождается в **информирующее подтверждение** — выбора нет, есть «вот что плагин довезёт, ок?». Реальный выбор с продуктовым переводом включается при coverage по оси > 1. Не делаем вид, что есть выбор, когда его нет.

## 7. Режим init (новый проект)

**product-spec — опционален (дополнение), НЕ основа.** init можно запускать до product-spec. Источник классификации осей — два класса:

- **Product-independent** (toolchain-foundation): runtime-ось (язык/среда) + её toolchain-wire (линтер, форматтер, тест-раннер, CI, gates, arch-audit-config — поставляются Функцией 3). Источник — класс проекта + coverage-manifest. (Это одна инфра-ось + wire, не набор осей — см. §4.)
- **Product-dependent оси**: база данных, файловое хранилище, интерфейс, очереди, кэш, поиск. Форсирует продукт.

**Flow:**

1. **Макро-probing профиля** (extract-before-probing — семейный паттерн): если есть product-spec — извлечь намёки на product-dependent оси; добить вопросами по gaps. Минимальный обязательный вход — **класс проекта** (бэкенд-сервис / фронтенд / CLI / библиотека / fullstack), один probing-вопрос, нужен для выбора runtime + scaffold-формы. Для `fullstack` runtime раскладывается на **несколько runtime-осей** (фронт + бэк), каждая — отдельный атом со своим scaffold; «один вопрос → один runtime» относится к single-runtime классам.
2. **Классификация осей** по таксономии: forced-now / delegated / not-touched. Явно по каждой.
3. **Для каждой forced-now оси → атом** (probe → scaffold → wire).
4. **Create flow ARCHITECTURE.md** (порт Ф1): создать документ, спроецировать `## Stack` из конфигов, Topic Index init, Module Map skeleton (минимальный — заголовки секций, наполняется arch-spec'ами фич; фичи ≠ code-модули, D19).
5. **Green skeleton + один convention-референс-паттерн.** Конкретно: один модуль вида `src/<example>/` (index + один unit-тест), демонстрирующий project-convention — layout, именование, расположение теста (`tests/` mirror зеркалит `src/` — по stack-файлу `typescript.md`, а не буквально co-located в той же директории), форму импорта/экспорта. **Без доменной логики.** Критерий «convention, не feature»: паттерн показывает *как устроен любой модуль*, и его можно удалить без потери смысла проекта. Анти-пример: НЕ создавать доменный модуль (`src/users/`, `src/audit/`) — это «КАКИЕ модули», территория arch-spec.
6. **CI / gates setup.**
7. **Done** (§10).

**Fallback при отсутствии product-spec:** init фиксирует только **toolchain-foundation** (product-independent оси). Product-dependent оси → явно **not-touched сейчас**, подтянутся через incremental, когда фича их форсирует. **Никакого гадания** (принцип 5) — bootstrap не выдумывает «наверное нужна БД».

**Вывод:** init-без-product-spec + последующие incremental = тот же результат, что init-с-product-spec, размазанный во времени. product-spec определяет лишь, *сколько осей* фиксируем за один init-прогон. init и incremental — точки на одной шкале (число форсированных осей на момент прогона), не разные сущности.

## 8. Режим incremental (дофиксация одной оси)

**Flow:**

1. **Триггер:** оператор явно («зафиксируй фронтенд-стек») ИЛИ upstream-сигнал (feature-spec/arch-spec: «фича форсирует ось X, не зафиксирована»). **Обнаружение ≠ решение, и ≠ автозапуск:** upstream-скилл лишь *сигналит*; **bootstrap запускает оператор** (обнаружение детерминированно, решение фиксировать ось — продуктовое, за оператором, P6).
2. **Одна недостающая ось** (обычно одна).
3. **Атом для оси** (probe coverage-gated → scaffold → wire). Здесь вскрывается реальный coverage-gap (REH ERP frontend → ось «интерфейс/фронтенд»). Если ось uncovered/partial — применить **forced-now ∩ uncovered resolution** (§5): громкий сигнал + `unmanaged`, ветка «оператор настаивает» решает, продолжать ли unmanaged degrade или остановиться на сигнале.
4. **Дописать `## Stack`** (проекция) + Module Map при необходимости.
5. **Done:** репо по-прежнему компилится + gates зелёные с новой осью + CI обновлён.

Общий атом-ось переиспользуется обоими режимами — init гоняет его N раз + Create flow + макро-probing; incremental — один раз + дописать Stack.

## 9. Граница с living-architecture (event cat-10 «Stack changed»)

- **bootstrap incremental** = ось надо **выбрать (probe) + заскаффолдить + зафиксировать**. Активное создание фундамента. bootstrap сам пишет `## Stack` (Вариант 1, §12 / KD2).
- **living-architecture cat-10** = задокументировать **уже принятую смену стека, замеченную в разговоре** вне bootstrap (например, оператор вручную поменял конфиг). Пассивный detect + запись.
- Разные триггеры → нет дублирования. Двойное касание `## Stack` — принятый разрыв KD2: в эпизоде, где ось фиксирует bootstrap, он владеет записью; living-architecture не дублирует.

## 10. Выход / done-критерий / transition

**Выход:**
- Физический фундамент: `package.json`/configs/lockfile (стек = truth), scaffold (green skeleton + convention-референс-паттерн), arch-audit-config, CI/gates.
- ARCHITECTURE.md (init создаёт; incremental дописывает `## Stack`).

**Done-критерий:** репо компилится + gates зелёные (typecheck + lint + audit no-violations + референс-тест проходит) + CI на месте + ARCHITECTURE.md со Stack.

**Transition:** init завершён → цепочка (product/feature/arch-spec → writing-plans) идёт по готовому фундаменту. incremental завершён → разблокированный слайс (REH ERP frontend Slice 2) → writing-plans.

## 11. Decoupling / market-ready

- bootstrap создаёт ARCHITECTURE.md (Вариант 1/KD2), но **self-contained**: Create flow портирован внутрь плагина (Ф1), не зависит от operator-personal `architecture`.
- living-architecture (Ф2) может быть не установлен у market-ready юзера → bootstrap создал документ, дальше оператор ведёт вручную (та же decoupled-логика, что у arch-spec).
- coverage-manifest + baselines + adapters живут внутри плагина (зависимость от Функции 3, §14).

## 12. ARCHITECTURE.md ownership — Вариант 1 + принятый разрыв (KD2)

Решение: **bootstrap создаёт ARCHITECTURE.md** (Create flow). Рассмотренная альтернатива (Вариант 2: bootstrap decoupled, весь документ — living-architecture) отклонена, потому что архитектурный стиль (ARCHITECTURE.md формат) портируется в hi_flow, и в рамках порта именно bootstrap создаёт этот файл (D20 Ф1).

**Принятый разрыв (KD2):** один документ — два владельца на разных фазах (bootstrap создаёт, living-architecture ведёт). Осознанное нарушение single-ownership, обусловленное декомпозицией порта D20.

**Смягчение:** **code is truth, document is projection** (global-принцип) НЕ нарушается — стек = truth в конфигах (`package.json`/`tsconfig`/lockfile), `## Stack` — проекция. bootstrap пишет Stack как проекцию реального репо, не как первоисточник. Разрыв касается только владения документом-проекцией, не владения стеком.

## 13. Связь с находками A / C (что закрывает)

- **Находка A** (нет владельца app-stack fixation) — закрыта: bootstrap владеет фундаментом, рекуррентность (backend init + frontend incremental) покрыта двумя режимами.
- **Находка C** (arch-spec несёт таксономию инфра-осей / решает БД) — разрешена системно: таксономия осей живёт в bootstrap как рабочий словарь; arch-spec **сигналит** «ось не зафиксирована → bootstrap», но не решает её. В REH ERP arch-spec зафиксировал Postgres вынужденно (bootstrap'а не было) — это и была «неверная высота». bootstrap снимает бремя.
  - **Переходный период (важно).** C-мост (active-issues, сессия 1) **сознательно временный**: пока bootstrap не построен, arch-spec продолжает фиксировать feature-forced подмножество стека (включая БД). Двойное покрытие оси «база данных» (arch-spec C-мост + будущий bootstrap) — известное **временное** перекрытие, не дрейф. После impl bootstrap C-мост деградирует до чистого сигнала. Конечное состояние «arch-spec лишь сигналит» достигается **после** impl bootstrap, не сразу.

## 14. Артефакты, декомпозиция, зависимости

**Артефакты** (P2: skill = markdown + references; один скилл, режимы — враппера, не под-скиллы):
- `hi_flow/skills/bootstrap/SKILL.md` — режимы init/incremental, атом-ось, probing-дисциплина, coverage-gating, flow, границы.
- `references/coverage-manifest.*` — SSoT покрытия.
- `references/axis-taxonomy.md` — 8 осей plain + probe-class (или встроить в манифест).
- `references/scaffold-templates/` — каркасы per технология.

**Зависимости (принцип 10 — sequential, для impl-планирования):**
- **Функция 3a (relocation baselines + CI + `stacks/` внутрь плагина, OQ6):** должны жить внутри плагина для **distributable** прогона (market-ready юзер без operator-personal baselines). **Уточнено impl 2026-06-01:** написание SKILL.md Ф3a НЕ требует; **операторский прогон тоже возможен сейчас** — у оператора baselines в `~/.claude/architecture/...`, coverage-manifest ссылается на них (пометки `pending-Ф3a`). То есть Ф3a = pre-condition **distributable** self-containedness, НЕ operator-apply (grounding-кейс REH ERP frontend можно прогнать без Ф3a). **Лёгкое** (перемещение + overlay). **Функция 3b (хуки enforcement) — НЕ зависимость bootstrap:** research-trigger (2026-06-01).
- **arch-audit packaging (OQ11):** bootstrap wired arch-audit-config; arch-audit (code-скилл) должен быть доступен.
- **coverage-manifest** наполняется тем, что плагин реально покрывает (сейчас TS) — зависит от наличия stack-file + baseline + adapter + scaffold-template по оси.

## 15. Принципы-кандидаты для ARCHITECTURE.md (фиксация в конце сессии)

- **Coverage-honesty / coverage-gated probing:** скилл предлагает только полностью покрытые плагином компоненты; непокрытое — громкий сигнал + degrade «unmanaged», не молчаливое предложение. (§5)
- **Высотный принцип bootstrap:** project-level foundation (bootstrap задаёт «КАК»), feature-level structure (arch-spec решает «КАКИЕ»). (§3)

## 16. Delegated-to-impl / open / resolved-minor

- **[delegated-to-impl] #2 coverage-manifest сериализация** — **структура задана** §5 (`ось → технология → {stack-file, baseline, audit-adapter, scaffold-template, probe-class}`); делегируется только форма сериализации (lean `.md` — consistency + LLM-читаемость). Схема зафиксирована, не дизайн-блокер.
- **[delegated-to-impl] #3 scaffold-templates представление** — **что входит** в scaffold задано критерием §4/§7.5 (convention-паттерн); делегируется только форма хранения (файлы-шаблоны vs генерация инструкцией). Lean гибрид.
- **[dependency] #4 Функция 3a relocation — pre-condition DISTRIBUTABLE прогона** (НЕ impl скилла, НЕ operator-apply — уточнено impl 2026-06-01; см. §14). **Лёгкое** (перемещение + overlay). Sequential per принцип 10. NB: Функция 3b (хуки) — research-trigger, НЕ блокер. Flag границы Ф1/Ф3 разрешён: bootstrap wires обвязку Ф3a, владение шаблонами — у Ф3a.
- **[resolved-minor] #5 Module Map skeleton** — init создаёт минимальный skeleton (заголовки секций), наполняется arch-spec'ами фич (фичи ≠ code-модули, D19). (§7)
- **[resolved] #1 naming** — `bootstrap` (рабочее имя принято финальным).
- **[resolved-by-impl] forced-now ∩ uncovered** — пробел спеки, пойман behavioral validation 2026-06-01, разрешён inline + backport в §5/§8 (covered под-часть + `unmanaged` + исключение из done-gates).
- **[resolved-by-impl] §7.5 расположение теста** — «co-located» уточнено: `tests/` mirror по stack-файлу `typescript.md` (authoritative convention). Backport в §7.5.

## 17. Что НЕ трогать (подтверждено боевым прогоном, §2 handoff'а)

Дизайн bootstrap не должен спровоцировать «починку» соседних механизмов, подтверждённых первым боевым прогоном arch-spec: extract-before-probing, density-factor, ACL анти-триггер, sync-in-txn rationale, green-field block-C skip. Урок ложной находки: не выдумывать проблему там, где механизм есть.

---

**Конец design-спеки.**
