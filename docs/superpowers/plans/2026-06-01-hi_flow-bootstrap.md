# hi_flow:bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать скилл `hi_flow:bootstrap` (SKILL.md + references) — project-level владелец технического фундамента, закрывающий находку A (нет владельца app-stack fixation).

**Architecture:** Markdown-скилл (P2 — не код). Атом-ось (probe→scaffold→wire) + два враппера-режима (init/incremental). Таксономия инфра-осей = рабочий словарь; coverage-gated probing поверх явного coverage-manifest (SSoT покрытия). Create flow ARCHITECTURE.md (Вариант 1, KD2). Источник содержания всех секций — **design-спека** `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design.md` (§-ссылки в задачах).

**Tech Stack:** Markdown (`SKILL.md` + `references/`). Формат скилла — Claude Code plugin skill (frontmatter `name`/`description` + body). Образец формата/стиля — соседний `hi_flow/skills/arch-spec/SKILL.md`.

**Validation-модель (P2 — TDD неприменим, заменяется):**
- **Structural validation:** frontmatter присутствует и валиден; обязательные секции на месте; формат соответствует образцу arch-spec; plain Russian в operator-facing блоках (P1).
- **Behavioral validation:** subagent-симуляция сценариев (init greenfield с/без product-spec; incremental REH frontend) на черновике SKILL.md — проверка, что инструкции ведут к корректному поведению (coverage-gated, классификация осей, режимы, coverage-honesty на частичном покрытии).
- **Spec compliance review:** subagent сверяет готовый SKILL.md + references со спекой §1-17.

**Sequencing-зависимости:**
- coverage-manifest + axis-taxonomy (Task 1) — фундамент-словарь, на который ссылается SKILL.md → раньше SKILL.md.
- SKILL.md (Tasks 2-5) — ядро.
- scaffold-templates (Task 6) — могут идти параллельно/после.
- Registration (Task 7) — после готового SKILL.md.
- Validation (Task 8) — последняя.
- **NB:** Ф3a relocation (baselines+CI+`stacks/` внутрь плагина) — pre-condition *работы* (apply), НЕ написания этого скилла. Скилл пишется сейчас; coverage-manifest ссылается на будущие plugin-internal пути (помечаются как pending-Ф3a). Реальный прогон на проекте — после Ф3a.

**Commit-политика:** коммиты — решение оператора (standing-правило). Шаги «Commit» ниже — точки фиксации; исполнитель предлагает коммит, не коммитит без согласия. Версия плагина — bump в обоих манифестах синхронно (D16) на финальном шаге.

---

### Task 1: Coverage-manifest + axis-taxonomy (references)

**Files:**
- Create: `hi_flow/skills/bootstrap/references/coverage-manifest.md`
- Create: `hi_flow/skills/bootstrap/references/axis-taxonomy.md`

**Источник содержания:** спека §4 (таксономия, операциональный критерий, оси≠toolchain), §5 (coverage-manifest структура, coverage-honesty, частичное покрытие), §6 (probe-class).

- [ ] **Step 1: Создать `axis-taxonomy.md`.**
  Содержит: 8 инфра-осей в plain Russian (язык и среда выполнения / база данных / интерфейс-фронтенд / файловое хранилище / планировщик задач / очереди сообщений / кэш / поиск) — каждая с инженерным термином в скобках. Операциональный критерий нарезки осей (§4: одна ось = одна тех-категория со scaffold-template + coverage + tooling-wire). Разъяснение «оси ≠ toolchain-компоненты» (§4): линтер/форматтер/тест-раннер/CI/audit-config — под-шаги wire, не оси. probe-class по оси: buy-in (язык, фронтенд, БД, файловое хранилище) / silent-baseline (toolchain-компоненты) / buy-in lite (планировщик/очереди/кэш/поиск). Классификация прогона: forced-now / delegated / not-touched.

- [ ] **Step 2: Создать `coverage-manifest.md`.**
  Структура (§5): группировка по осям; строка = `ось → технология → { stack-file, baseline, audit-adapter, scaffold-template, probe-class }`. Заполнить текущее покрытие (≈ TypeScript): `runtime` → TypeScript/Node (покрыт); `база данных` → Postgres (частично — пометить); `интерфейс/фронтенд` → пусто/частично (пометить — coverage-gap). Пути stack-file/baseline помечать как **pending-Ф3a** (сейчас в `~/.claude/architecture/...`, после Ф3a — plugin-internal). Зафиксировать правило: coverage читается динамически, не хардкод; частично покрытая ось = НЕ покрыта → coverage-honesty (§5).

- [ ] **Step 3: Structural check.**
  Проверить: оба файла существуют; axis-taxonomy перечисляет ровно 8 осей plain Russian; coverage-manifest имеет все 5 полей в строке; coverage-gap по presentation помечен явно. Никаких выдуманных «покрытых» технологий сверх реального состояния (coverage-honesty на самом манифесте).

- [ ] **Step 4: Commit** (предложить оператору): `docs(bootstrap): coverage-manifest + axis-taxonomy references`.

---

### Task 2: SKILL.md — frontmatter + Overview + scope + границы

**Files:**
- Create: `hi_flow/skills/bootstrap/SKILL.md`

**Источник:** спека §1 (идентичность, место в цепочке), §2 (scope), §3 (границы, высотный принцип). Образец формата — `hi_flow/skills/arch-spec/SKILL.md` (frontmatter + Overview + When to use + Anti-triggers).

- [ ] **Step 1: Frontmatter.**
  `name: bootstrap`; `description:` — триггеры запуска (RU+EN): «init проекта / заведи проект / зафиксируй стек / зафиксируй фронтенд-стек / project bootstrap / setup project foundation»; одна строка про вход (класс проекта, опц. product-spec) и выход (готовый фундамент + ARCHITECTURE.md). Anti-triggers: не arch-spec (module breakdown фичи), не feature-spec (поведение), не writing-plans (impl-план).

- [ ] **Step 2: Overview + место в цепочке.**
  Из §1: project-level владелец технического фундамента; конец цепочки product/feature/arch-spec → bootstrap → writing-plans на «existing codebase»; закрывает находку A.

- [ ] **Step 3: Scope + границы.**
  Из §2: 5 пунктов scope (Create flow ARCHITECTURE.md / app-stack probing / scaffolding / wiring arch-audit-тулинга / wiring L3-обвязки Ф3a). Из §3: таблица границ (arch-spec=КАКИЕ модули; feature/product-spec=поведение; living-architecture=ведёт документ после создания; writing-plans=impl-план) + высотный принцип P8 (bootstrap=КАК, arch-spec=КАКИЕ).

- [ ] **Step 4: Structural check.** Frontmatter валиден (name+description); секции Overview/Scope/Границы присутствуют; границы перечисляют всех 4 соседей; plain Russian в operator-facing формулировках.

- [ ] **Step 5: Commit** (предложить): `feat(bootstrap): SKILL.md frontmatter + overview + scope`.

---

### Task 3: SKILL.md — модель оси + probing-дисциплина

**Files:**
- Modify: `hi_flow/skills/bootstrap/SKILL.md`

**Источник:** спека §4 (атом, таксономия, критерий нарезки), §5 (coverage-manifest, coverage-gated, частичное покрытие, поведение на непокрытом), §6 (α-дифференцированно, перевод в продуктовые термины, вырождение buy-in при coverage=1).

- [ ] **Step 1: Секция «Модель оси».**
  Атом probe→scaffold→wire (§4). Ссылка на `references/axis-taxonomy.md` (не дублировать таксономию — pointer). Критерий нарезки + оси≠toolchain.

- [ ] **Step 2: Секция «Coverage».**
  Coverage-gated probing (§5): читать `references/coverage-manifest.md`, предлагать только полностью покрытое. coverage-honesty. Поведение на непокрытом: degrade «unmanaged» + громкий сигнал (принцип 5). Частично покрытая ось = НЕ покрыта → громкий сигнал.

- [ ] **Step 3: Секция «Probing-дисциплина».**
  α по probe-class (§6): buy-in оси → рекомендованный дефолт + перевод в продуктовые последствия + подтверждение оператора; silent-baseline → молча по baseline. Вырождение buy-in при coverage=1 (информирующее подтверждение). Plain Russian в опциях (P1).

- [ ] **Step 4: Structural check.** Три секции на месте; coverage-manifest и axis-taxonomy упомянуты как pointers (не дублированы — size discipline); принцип 5 (громкий сигнал) явно для непокрытого/частичного.

- [ ] **Step 5: Commit** (предложить): `feat(bootstrap): axis model + coverage + probing discipline`.

---

### Task 4: SKILL.md — режимы init/incremental + flow + граница living-architecture

**Files:**
- Modify: `hi_flow/skills/bootstrap/SKILL.md`

**Источник:** спека §7 (init flow, product-spec опционален, класс проекта, fallback), §8 (incremental flow, триггер=оператор запускает), §9 (граница living-architecture cat-10).

- [ ] **Step 1: Секция «Режим init».**
  7-шаговый flow (§7): макро-probing профиля (extract-before-probing; product-spec опционален; мин. вход = класс проекта; fullstack → несколько runtime-осей) → классификация осей → атом×N forced-now → Create flow ARCHITECTURE.md (минимальный Module Map skeleton) → green skeleton + convention-референс-паттерн → CI/gates wiring → done. Fallback без product-spec: только toolchain-foundation, продуктовые оси not-touched (не гадать, принцип 5).

- [ ] **Step 2: Секция «Режим incremental».**
  5-шаговый flow (§8): триггер (оператор явно ИЛИ upstream-сигнал; **оператор запускает, не автозапуск**, P6) → одна недостающая ось → атом (coverage-gated) → дописать `## Stack` (проекция) → done. Общий атом переиспользуется обоими режимами.

- [ ] **Step 3: Секция «Граница с living-architecture».**
  Из §9: bootstrap incremental = активно выбрать+заскаффолдить+зафиксировать (пишет `## Stack`); living-architecture cat-10 = пассивно задокументировать уже принятую смену; разные триггеры; двойное касание `## Stack` = принятый KD2 (в эпизоде bootstrap владеет записью).

- [ ] **Step 4: Структурный + convention-демонстратор check.** Оба режима используют один атом (нет дублирования логики); init-шаг scaffold ссылается на convention-критерий (§7.5: generic, не доменный); триггер incremental явно «оператор запускает».

- [ ] **Step 5: Commit** (предложить): `feat(bootstrap): init + incremental modes + living-architecture boundary`.

---

### Task 5: SKILL.md — выход/done + decoupling + ownership + anti-patterns

**Files:**
- Modify: `hi_flow/skills/bootstrap/SKILL.md`

**Источник:** спека §10 (выход, done-критерий, transition), §11 (decoupling/market-ready), §12 (ARCHITECTURE.md ownership, Вариант 1, KD2, code-is-truth), §17 (что не трогать).

- [ ] **Step 1: Секция «Выход и done».**
  Выход (§10): физический фундамент (configs=truth, scaffold, arch-audit-config, CI) + ARCHITECTURE.md. Done-критерий: репо компилится + gates зелёные (typecheck+lint+audit+референс-тест) + CI + ARCHITECTURE.md со Stack. Transition к writing-plans.

- [ ] **Step 2: Секция «Decoupling / market-ready + ARCHITECTURE.md ownership».**
  §11: self-contained Create flow; living-architecture опционален (если нет — оператор ведёт вручную). §12: bootstrap создаёт ARCHITECTURE.md (Вариант 1); `## Stack` = проекция конфигов (code-is-truth цел); разрыв single-ownership принят (ссылка на KD2).

- [ ] **Step 3: Секция «Anti-patterns».**
  Из §3/§17: не предугадывать feature-модули (territory arch-spec); не гадать продуктовые оси без product-spec; не предлагать непокрытое молча; не «чинить» подтверждённые боевым прогоном механизмы соседей.

- [ ] **Step 4: Structural check.** Done-критерий конкретен (перечислимые gates); ownership-секция ссылается на KD2; anti-patterns покрывают высотную границу.

- [ ] **Step 5: Commit** (предложить): `feat(bootstrap): output/done + decoupling + ownership + anti-patterns`.

---

### Task 6: Scaffold-templates (минимальный TS convention-паттерн)

**Files:**
- Create: `hi_flow/skills/bootstrap/references/scaffold-templates/` (минимум — TS convention-паттерн)

**Источник:** спека §7.5 (convention-референс-паттерн: generic, не доменный), §16 #3 (форма — гибрид файлы+инструкция).

- [ ] **Step 1: Решить форму (§16 #3).** Гибрид: минимальные файлы-шаблоны (например, `ts-skeleton/` с `src/<example>/index.ts` + `<example>.test.ts` + комментарии-конвенции) + инструкция в SKILL.md, как их раскладывать и параметризовать. Зафиксировать выбор в коротком `references/scaffold-templates/README.md`.

- [ ] **Step 2: Создать TS convention-паттерн.** Один generic модуль: layout (`src/<module>/index.ts`), co-located тест, форма импорта/экспорта. **Без доменной логики** (анти-пример §7.5: не `users`/`audit`). Демонстрирует «КАК устроен модуль», удаляется без потери смысла проекта.

- [ ] **Step 3: Structural check.** Паттерн generic (не доменный); тест co-located; нет фича-специфики; SKILL.md ссылается на templates как на источник scaffold.

- [ ] **Step 4: Commit** (предложить): `feat(bootstrap): scaffold-templates (TS convention pattern)`.

---

### Task 7: Plugin registration + version bump

**Files:**
- Modify: `hi_flow/.claude-plugin/plugin.json` (зарегистрировать skill bootstrap, если требуется явная декларация)
- Modify: `.claude-plugin/marketplace.json` (version bump — синхронно с plugin.json, D16)

**Источник:** D16 (release flow — bump в обоих манифестах синхронно), структура плагина (D6).

- [ ] **Step 1: Проверить механизм регистрации скилла.** Скиллы в `hi_flow/skills/<name>/SKILL.md` авто-обнаруживаются или требуют декларации в plugin.json? Свериться с существующими скиллами (arch-spec и т.д. — есть ли они в plugin.json). Действовать по факту.

- [ ] **Step 2: Version bump (D16).** Поднять версию в `hi_flow/.claude-plugin/plugin.json` И в записи `hi_flow` в корневом `.claude-plugin/marketplace.json` — **синхронно** (одинаковое значение). Текущая — 0.6.4 → 0.7.0 (новый скилл = minor).

- [ ] **Step 3: Structural check.** Версии в обоих манифестах совпадают; bootstrap-скилл обнаруживается.

- [ ] **Step 4: Commit** (предложить): `chore(bootstrap): register skill + bump plugin 0.7.0`. NB оператору: после push — manual `git fetch && git merge --ff-only` в marketplace cache (D16).

---

### Task 8: Validation (structural + behavioral + spec compliance)

**Files:**
- (без изменений артефактов; правки по находкам — inline)

**Источник:** P2 (validation-модель), P5 (subagent self-review), спека §1-17 (compliance), спека §17 (не «чинить» соседей).

- [ ] **Step 1: Structural validation pass.** Frontmatter валиден; все секции §1-17 покрыты; pointers (manifest/taxonomy/templates) корректны; plain Russian в operator-facing; size discipline (нет дублирования таксономии/манифеста в SKILL.md).

- [ ] **Step 2: Behavioral validation (dispatch fresh subagent).** Прогнать на черновике SKILL.md 3 сценария: (a) init greenfield БЕЗ product-spec (ожидаем: класс проекта спрошен, зафиксирован только toolchain, продуктовые оси not-touched); (b) init С product-spec (ожидаем: extract намёков на оси, классификация); (c) incremental REH frontend (ожидаем: одна ось «интерфейс/фронтенд», coverage-gated упирается в частичное покрытие → громкий сигнал, НЕ молчаливое предложение). Субагент возвращает: ведут ли инструкции к корректному поведению; где двусмысленность.

- [ ] **Step 3: Spec compliance review (dispatch fresh subagent, изолированный контекст).** Сверить SKILL.md + references со спекой §1-17. Особо: высотная граница (не залезает в arch-spec), coverage-honesty, KD2-ownership, режимы используют общий атом.

- [ ] **Step 4: Apply safe fixes inline; human-required findings → оператору.** Без повторного полного review (P5: apply + move on).

- [ ] **Step 5: Implementation report.** Создать `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design-report.md` (стандарт CLAUDE.md): what was done / deviations / issues discovered / open items.

- [ ] **Step 6: ARCHITECTURE.md update (через скилл `architecture`).** Module Map bootstrap: DESIGN-READY → BUILT. Предложить оператору (proposal-flow).

- [ ] **Step 7: Commit** (предложить): `test(bootstrap): structural+behavioral+compliance validation + report`.

---

## Self-Review (выполнено при написании плана)

**Spec coverage:** §1-3 → Task 2; §4-6 → Task 3 + Task 1 (references); §7-9 → Task 4; §10-12 → Task 5; §13 (находки A/C) → отражено в Overview/границах Task 2; §14 (зависимости) → sequencing-преамбула + Task 1 pending-Ф3a пометки; §15 (принципы P7/P8) → уже в ARCHITECTURE, не impl-задача; §16 (delegated) → #2 Task 1 (формат manifest), #3 Task 6 (scaffold форма), #4 sequencing-преамбула; §17 → Task 5 anti-patterns + Task 8 (не чинить соседей). Gap: нет.

**Placeholder scan:** содержание секций задаётся через §-ссылки на детальную спеку + ключевые пункты — это structural contract markdown-скилла, не «add appropriate X». Код-плейсхолдеров нет (markdown-скилл).

**Type consistency:** имена артефактов (`coverage-manifest.md`, `axis-taxonomy.md`, `scaffold-templates/`) консистентны между Task 1 (создание) и Tasks 3-6 (ссылки). Термины (атом-ось, probe-class, forced-now/delegated/not-touched, Ф3a) — из спеки, единообразны.
