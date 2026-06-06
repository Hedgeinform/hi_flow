# hi_flow — Fullstack-aware arch-spec (дизайн)

**Дата:** 2026-06-06 (rev. 4 — заземлено на реальный output-контракт arch-spec после трёх изолированных ревью; язык: русский для операторского ревью, правки SKILL.md/шаблона на импле — English)
**Статус:** дизайн — ждёт ревью оператора
**Владельцы scope:** `hi_flow:arch-spec` (fullstack под-флоу + output-шаблон + per-tree rules-patch) + `hi_flow:bootstrap` (guidance «раздельные пакеты»)
**Downstream-потребитель:** `superpowers:writing-plans`

> **Почему rev.4.** Rev.1 (merge-инструмент в arch-audit) и два главных фикса rev.3 были убиты изолированным ревью. Повторяющийся провал — я специфицировал интеграционные контракты, которые не читал. Rev.4 написана **после чтения реальных контрактов** (`arch-spec-template.md`, `rules-patch-template.yaml`, модель голых имён модулей в адаптере). Оба блокера rev.3 закрыты в корне: **имена модулей остаются голыми; «дерево» — это routing-метка, а не префикс узла** (наложение и инвариант §381 держатся), а **rules-patch разбивается по деревьям с обычными путями `^src/<module>/`** (без смены формата). Правка output-шаблона теперь покрывает **каждый** single-snapshot слот реального шаблона (§1 snapshot+mode, §4, §5.1, §6, §8/patch, §9), а не только §1+§6. См. changelog §9.

---

## 1. Контекст / проблема (живая боль)

Имплементатор посреди реализации **фронтовой части фуллстек-фичи** (Reh_Erp) уперся в необходимость поправить спеку фичи — а это эффективно только при **корректном архитектурном аудите**. arch-audit работает per-package (один прогон = одно дерево `src/` = один профиль); блок C arch-spec (интеграция) потребляет **один** снапшот. Фуллстек-фича задевает **оба** дерева → один снапшот ослепляет блок C на второй половине. Это вскрыл D27.

**Цель:** arch-spec на фуллстек-фиче обеспечивает свежий аудит **по каждому задетому дереву**, прогоняет блок C по каждому и выдаёт **per-tree** анализ интеграции + per-tree rules-patch — управляемый собственными инструкциями arch-spec, с громким сигналом по любому дереву, которое он не смог покрыть.

## 2. Заземляющие факты

**Reh_Erp** (`C:\Users\Vegr\Projects\Reh_Erp`): pnpm-workspace (`pnpm-workspace.yaml`: `packages: ["apps/*","packages/*"]`); корни `apps/api`, `apps/web`, у каждого свой `src/`+`package.json`; `packages/` объявлен, но на диске отсутствует. Графы **дизъюнктны в обе стороны** (web↔api по HTTP/JSON, типы переобъявлены; ноль кросс-пакетных TS-импортов; нет кросс-пакетных tsconfig-алиасов).

**Именование модулей (решающее, проверено):** ключи `per_module`/`dep_graph` в снапшоте — это **голые имена папок верхнего уровня** (`components`, `services`; адаптер `identifyModules` + `fileToModule` → `parts[srcIdx+1]`; `defaultModulePattern: 'src/*/'`). Шаблон arch-spec §5.1 уже объявляет модули ровно на этой голой гранулярности `src/<module>/`, а §381 требует, чтобы гранулярность модулей фичи **совпадала со снапшотом** — иначе наложение не держится. ⇒ имя модуля фичи всегда голое; пакет/дерево — отдельная метаданная, никогда не часть имени узла.

## 3. Дизайн — fullstack под-флоу arch-spec

Правка инструкций `arch-spec/SKILL.md` + его output-шаблона `references/arch-spec-template.md` + per-tree rules-patch. Без кода arch-audit, без правки D8-схемы.

### 3.1 Детект + дерево как routing-метка (голые имена)
- **Задет фронт** — основной сигнал: секция **«Поверхности (UX)»** в feature-spec непуста (D25; conditional — есть только у user-facing фич, это и есть сигнал).
- **Задет бэк** — блок B (§5.1) объявляет бэкенд-модули.
- **Метка дерева, НЕ префикс имени (закрывает BLOCKER-1 rev.3).** В монорепо модуль живёт под `apps/<tree>/src/<module>/`. Фича объявляет каждый модуль с **меткой дерева** (`web` / `api`) как метаданной, но **имя модуля остаётся голым** (`<module>`), совпадающим с ключами снапшота этого дерева. Блок C накладывает модуль на снапшот **своего** дерева по голому имени → инвариант §381 держится, оторванных островов нет. **Никакого namespacing имён** в вычислении нет — дерево только маршрутизирует, к какому снапшоту/патчу относится модуль. (Прежнее противоречие §3.1↔§3.3 снято: голые имена, дерево — метка.)
- ≥2 деревьев задето ⇒ фуллстек-фича ⇒ под-флоу ниже. Однодеревные фичи — без изменений (без метки, один снапшот).

### 3.2 Обеспечить свежий снапшот по каждому задетому дереву (новая ответственность, признаётся)
**Действительно новая** ответственность: сегодня arch-spec — чистый *потребитель* готового снапшота (§44; при отсутствии/устаревании аудита он *инструктирует оператора* запустить arch-audit, §59). Под-флоу заставляет arch-spec **вызывать** arch-audit per-package. Это **invoke, не duplicate** (§412 не нарушен — вызывает CLI, не переписывает логику аудита).

- **Вызов (исправлено, BLOCKER-2a):** `arch-audit` — это триггер-фраза скилла, не бинарь. Реальный вызов per-package: `npx tsx hi_flow/skills/arch-audit/helpers/cli-run-audit.ts <package-root>` (напр. `apps/api`, затем `apps/web`); опциональный позиционный `d9-md-path` дефолтит на встроенный D9 (можно опустить). Каждый пишет в свой `outDir = <package-root>/audit-report/audit-report.json` — две отдельные директории, без коллизии; arch-spec читает оба оттуда.
- **Per-package preconditions (закрывает HIGH-3).** Перед вызовом проверить, что у каждого корня пакета есть `tsconfig.json` **и** `src/` (без них адаптер hard-fail'ит детект стека / `identifyModules`). Нет → громкий сигнал по дереву (принцип 5): «у `web` нет `tsconfig.json` в `apps/web` — не могу проаудировать; почини пакет либо пропусти блок C по фронту с залогированной причиной». Не только кейс отсутствия depcruise-бинаря.
- **«Three situations» становятся per-tree вектором (закрывает H3 + green/brown кросс-продукт MEDIUM-5).** §51-59 — на один снапшот; фуллстек-фича — это **green | brown+fresh | brown+no/stale по каждому задетому дереву** (напр. `api` brown+fresh, а `web` green-field — первая фронтовая фича). Оцениваем по дереву; громкий сигнал + skip-с-залогированной-причиной срабатывают по каждому непокрытому дереву; покрытое дерево блок C всё равно прогоняет. Арифметика свежести не меняется (один репо → один HEAD; `audit_sha` каждого снапшота против HEAD).
- **Self-assessment (direct/brainstorm, §75-85)** остаётся **одним** решением уровня фичи, но читает per-tree вектор: любое дерево с brown-field проблемами рядом склоняет к brainstorm.

### 3.3 Блок C по снапшоту (два прохода, голые имена)
Графы дизъюнктны ⇒ блок C прогоняется **по разу на дерево**: агент строит graph delta (его шаг **наложения**, §221 — «delta» это действие агента, не функция graph-core) голо-именованных модулей фичи этого дерева на снапшот этого дерева, затем гоняет `findCycles`/`computeNCCD`/`computeCoupling` из graph-core (чистые функции над переданным графом) на дельте этого дерева. Независимо; сшивать нечего.

### 3.4 Output-шаблон — каждый single-snapshot слот становится per-tree (полностью закрывает B1)
Реальный `arch-spec-template.md` имеет **больше** single-snapshot слотов, чем покрывали rev.2/3. Все они меняются для фуллстек-фичи (однодеревный output байт-в-байт как сегодня):
- **§1 Header — строка `Audit snapshot`** → **N строк**, по одной на задетое дерево (`tree · path · audit_sha · freshness`). Поле **`Mode`** → **per-tree** (`web: green field · api: brown field`).
- **§4 Starting state** → per-tree пометка (зелёное дерево → «clean field for `web`»).
- **§5.1 Module breakdown** → каждый модуль с **меткой дерева** (голое имя + `tree: web|api`). §5.11 (Presentation/UI) — уже фронтовый блок surface'ов, его модули несут метку `web`.
- **§6 Impact** → **per-tree под-секции** («Integration — `api`» / «Integration — `web`»), у каждой свои Graph delta + Degradation check. Гейт «Brown field only» — **per-tree** (зелёное дерево → «not applicable for `web`»). `Signal up` остаётся одним общим bullet'ом (маршрутизирует фичу целиком).
- **§8 Fitness invariants** → каждый graph-инвариант несёт своё дерево **inline в ячейке Invariant** (напр. `<statement> [tree: web]`), **НЕ 5-я колонка** — таблица остаётся 4-колоночной (та же дисциплина, что у security-tag, шаблон §92). Это маршрутизирует инвариант в патч своего дерева (§3.5).
- **§9 Dependency graph** → **два ego-subgraph'а в одном Mermaid-блоке** (`FEATURE-web` + соседи web, `FEATURE-api` + соседи api) — дизъюнктны, поэтому два subgraph'а без кросс-рёбер; в пределах node-бюджета ego-графа.

SKILL.md (§265 описание header, §6/§9 проза) и `arch-spec-template.md` меняются в lockstep.

### 3.5 Rules-patch по дереву (закрывает BLOCKER-2b — без смены формата)
Пути rules-patch — `^src/<module>/` **относительно корня пакета**, где лежит `.audit-rules.yaml` (`rules-patch-template.yaml` строки 11, 53-56). Для фуллстек-фичи graph-инварианты делятся по деревьям (инвариант `web` ограничивает web-модули под `apps/web/src/`, инвариант `api` — под `apps/api/src/`). ⇒ выдаём **один патч на задетое дерево** — `<feature-slug>-web-rules-patch.yaml` → применяется к `apps/web/.audit-rules.yaml`; `<feature-slug>-api-rules-patch.yaml` → `apps/api/.audit-rules.yaml`. Пути остаются **голыми `^src/<module>/`** (корректно внутри каждого пакета); composition-root exemption — per-package baseline. Метаблок каждого per-tree патча несёт **свою** строку `Source audit: <audit-report dir этого дерева>; audit_sha=<sha этого дерева>` (per-patch метаданная из шаблона патча). **Без смены формата путей** — только «один патч на задетое дерево» вместо «один патч на фичу». (Старый контракт: один патч на фичу, project-root `.audit-rules.yaml`. Новый: на задетое дерево, package-root `.audit-rules.yaml`.)

## 4. Компонент 2 — bootstrap guidance (раздельные пакеты, мягко)

Мягко (по аналогии с P7). На fullstack-классе bootstrap **рекомендует** раздельно-пакетную раскладку (каждый runtime — свой пакет + `src/`) и **громко предупреждает** при смешанном `src/` («вся гигиена/аудит — per-package; смешанный `src/` деградирует arch-audit до best-effort и ломает fullstack под-флоу»), и **записывает конвенцию** в `ARCHITECTURE.md` скаффолженного проекта — in-mechanism (Create flow bootstrap уже владеет этой записью, §163). **Только guidance** — без мультипакетного скаффолдинга (net-new, вне scope; запрос оператора был «явно дать понять, не валить в один src»).

## 5. Чего это НЕ делает

- Без кода arch-audit, без правки D8-схемы, без merge-инструмента, без namespacing имён узлов.
- Без аудита монорепо одной командой как runtime-инструмента (оркестрация per-package прогонов силами arch-spec — это И ЕСТЬ автоматизация). Будущее удобство «аудит всего монорепо одним вызовом» (требует расщепления `buildReportData` на compute/persist) отложено.
- Без мультипакетного скаффолдинга в bootstrap (Компонент 2 — только guidance).

## 6. Отложено / Open Question

- **Subtree-осознанность для смешанного `src/`** — один `src/` с обоими деревьями требует настоящего per-subtree профилирования (отложенный эпик, родственник vertical-slice). Смягчено Компонентом 2 для управляемых проектов; неуправляемый legacy — best-effort.
- **Shared-пакет** (`packages/shared`, импортируемый обоими) — сегодня отсутствует. Если появится — графы перестают быть дизъюнктными, и независимость блока C по деревьям + разбиение патча по деревьям надо пересмотреть. **Триггер пересмотра:** первый реальный пакет под `packages/`.
- Фиксируется как Open Question, связки: D27, active-issues vertical-slice, эта спека.

## 7. Scope / sequencing

Компонент 1 (arch-spec под-флоу + шаблон + per-tree патч) и Компонент 2 (bootstrap guidance) независимы, параллелятся. Оба — правки инструкций скиллов (markdown), валидируются **поведенчески** (P2), не кодом. Внутри Компонента 1 SKILL.md + шаблон + rules-patch-template меняются как один lockstep-юнит (общий output-контракт).

## 8. Done-критерии

- `arch-spec/SKILL.md`: детектит ≥2 задетых дерева («Поверхности (UX)» + бэкенд-модули §5.1); объявляет каждый модуль с **меткой дерева, голым именем**; обеспечивает свежий снапшот по каждому дереву через вызов `cli-run-audit.ts <package-root>` per-package с проверкой per-package preconditions (tsconfig + src) и per-tree громким fallback'ом; «three situations» — per-tree; блок C — по снапшоту; per-tree интеграция синтезирована.
- `arch-spec/references/arch-spec-template.md`: §1 (N снапшотов + per-tree Mode), §4 (per-tree), §5.1 (метка дерева), §6 (per-tree под-секции + per-tree brown-гейт), §8 (inline-метка дерева в ячейке Invariant, 4 колонки), §9 (два ego-subgraph'а) — всё per-tree для фуллстека; **однодеревный output байт-в-байт как сегодня**.
- `arch-spec/references/rules-patch-template.yaml` (+ проза SKILL.md §10/rules-patch): один патч на задетое дерево, голые `^src/<module>/`, на `.audit-rules.yaml` каждого пакета, per-patch `Source audit`; однодеревная фича → один патч как сегодня.
- `bootstrap/SKILL.md`: fullstack-класс рекомендует раздельные пакеты + предупреждает о смешанном `src/` + пишет конвенцию в ARCHITECTURE.md проекта (только guidance).
- Валидация: structural + **поведенческая субагент-симуляция** (фуллстек-фича: оба дерева проаудированы → per-tree блок C + per-tree патч; одно дерево green-field → per-tree mode + §6 «not applicable»; одно дерево неаудируемо → громкий сигнал + skip-залогирован) + spec-compliance review (P2). Кода нет → юнит-тестов нет.
- ARCHITECTURE.md: D-entry (fullstack-aware arch-spec) + Open Question.

## 9. Changelog

- **rev.1→2:** убран merge-инструмент arch-audit / схема 1.2 (нереализуемо); оркестрация → инструкции arch-spec; per-tree блок C вместо merge (дизъюнктные графы).
- **rev.2→3:** добавлен output-шаблон + per-tree header/§6; признана ответственность «триггерить аудиты»; per-tree three-situations; (дефектное) правило package-qualified имён.
- **rev.3→4 (эта, заземлено после чтения реальных контрактов):** **имена остаются голыми, дерево — routing-метка** — снимает поломку наложения/§381 (BLOCKER-1 rev.3) и противоречие §3.1↔§3.3; **rules-patch разбит по деревьям с обычными путями `^src/<module>/`** — снимает поломку патча (BLOCKER-2b) без смены формата; **per-package preconditions** (tsconfig+src), не только бинарь (HIGH-3); **исправлен вызов CLI** на `npx tsx cli-run-audit.ts <root>` (BLOCKER-2a); **охват шаблона расширен** на каждый реальный single-snapshot слот — §1 snapshot+Mode, §4, §5.1 метка, §6, §8 (inline-метка, 4 колонки), §9 mermaid (MEDIUM-4); **green/brown кросс-продукт** через per-tree mode-вектор + одна self-assessment (MEDIUM-5); per-patch `Source audit` (LOW).

## 10. References

- `hi_flow/skills/arch-spec/SKILL.md` — input artifacts (§40-49), three situations + freshness/schema (§51-73), self-assessment (§75-85), блок C / graph delta (§180-221), module granularity (§189-193), §1 header (§265), rules-patch (§323-327).
- `hi_flow/skills/arch-spec/references/arch-spec-template.md` — output SSoT (§1 snapshot+Mode, §4, §5.1 гранулярность `src/<module>/`, §5.11 UI, §6 brown-only, §8 invariants, §9 ego-граф) — каждая per-tree правка целит в реальный слот.
- `hi_flow/skills/arch-spec/references/rules-patch-template.yaml` — пути `^src/<module>/` относительно package-root `.audit-rules.yaml`; один-патч-на-фичу → один-на-дерево.
- `hi_flow/skills/arch-audit/helpers/cli-run-audit.ts` — `npx tsx ... <project-root> [d9-md-path]`, дефолтный outDir `<root>/audit-report/`.
- `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts` (`identifyModules`, голые имена) + `helpers/parse-depcruise-output.ts` (`fileToModule` → голый top-level) — почему имена голые.
- `hi_flow/skills/arch-audit/core/graph-core.ts` — чистые `findCycles`/`computeNCCD`/`computeCoupling` по снапшоту.
- `hi_flow/skills/feature-spec/SKILL.md` — «Поверхности (UX)» (conditional, D25), фронтовый сигнал.
- `hi_flow/skills/bootstrap/SKILL.md` — fullstack-класс; Create flow пишет ARCHITECTURE.md (§163).
- `C:\Users\Vegr\Projects\Reh_Erp` — заземление (pnpm-workspace, apps/api + apps/web, дизъюнктны).
- `docs/superpowers/specs/2026-06-05-hi_flow-frontend-coverage-completion-design.md` — D27; active-issues vertical-slice.
