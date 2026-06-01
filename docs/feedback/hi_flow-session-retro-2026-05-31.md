# hi_flow — Session Retro: arch-spec → writing-plans (2026-05-31)

**Что за сессия:** первый боевой прогон `hi_flow:arch-spec` на подписанной feature-spec (audit, REH ERP итерация 1), с продолжением в `superpowers:writing-plans` до готового implementation-плана первого слайса. Green field — кода в проекте не было вообще.

**Статус:** консолидированный фидбэк по всей сессии. Детальный per-skill фидбэк arch-spec — в `hi_flow-arch-spec-feedback.md` (3 пункта). Этот документ собирает картину целиком + поднимает chain-level находки, которые не принадлежат одному скиллу. Оператор дорабатывает.

---

## 1. Что отработало хорошо (чтобы не потерять в потоке замечаний)

**arch-spec:**
- Extract-before-probing: первым шагом вытащил готовые решения из feature-spec, не переспрашивал.
- Density-factor self-assessment корректно оценил, что фича плотно решена (рекомендовал direct; brainstorm прошёл по запросу оператора — для наблюдения, не по нужде).
- Green-field block-C skip отработал по дизайну; forward-контракты ушли в инварианты + rules-patch.
- Probing-таксономия: floor 1-4 + сработавшие ceiling + **корректный анти-триггер ACL** (не паддил пустую категорию).
- Two-level operability triage, изолированный self-review субагентом (поймал MED + 7 LOW), backlog-sync с idempotency-чеком (не задублировал 11 пунктов feature-spec).
- **Эмиссия sync-in-txn**: скилл корректно вывел, что глобальный принцип 7 здесь не нарушается (single-DB fate-sharing) — без ложной эскалации.

**writing-plans:**
- **Корректно отказался галлюцинировать** план на пустом репо — вскрыл реальный gap вместо фабрикации. Это правильное поведение.
- После фиксации стека выдал конкретный TDD-план без плейсхолдеров; self-review поймал forward-reference в харнессе.

**Мета:** одно из моих наблюдений (green-field cross-cutting «слепое пятно block C») оказалось **ложным** — снято при ревью оператором. Скилл этот кейс обрабатывает правильно (rules-patch — слот для forward-контрактов). Зафиксировано как урок: не выдумывать проблему там, где механизм есть.

---

## 2. Per-skill находки (детали — в отдельных файлах)

**arch-spec** → `hi_flow-arch-spec-feedback.md`:
- #1 (High) — фиксация стека на первом arch-spec не оговорена + нет таксономии инфра-осей. **Подтверждено downstream: блокирует writing-plans.**
- #2 (High) — §10 смешивает code-sight forks и deployment-bound bindings (разные потребители: writing-plans vs deployment-решение).
- #3 (Low-Med) — rules-patch «только X→Y» не предусматривает composition-root exemption.

---

## 3. ГЛАВНАЯ chain-level находка: нет владельца фиксации app-stack / project-bootstrap

**Симптом:** цепочка `feature-spec → arch-spec → writing-plans` на greenfield-проекте **встала** на стыке arch-spec → writing-plans. arch-spec зафиксировал только то, что форсировала фича (Postgres). Остальной app-stack (язык, фреймворк, тест-раннер, ORM, scaffolding, toolchain) не зафиксирован **никем**. writing-plans по дизайну рассчитан на «existing codebase, follow established patterns» — а codebase'а нет. План строить не на чем.

**Корень:** в методологии нет шага «project bootstrap / fix app-stack / scaffold», который логически предшествует implementation **первой** фичи. Каждый из существующих шагов справедливо его не делает:
- feature-spec — продуктовое поведение, не инфраструктура.
- arch-spec — фиксирует только то, что форсирует **фича** (feature-level), а стек — **project-level**.
- writing-plans — предполагает, что codebase уже есть.

Это **не баг одного скилла, а дыра в цепочке.** Проявляется ровно один раз на проект (на первой фиче greenfield), но проявляется жёстко — блокирует весь implementation.

**Открытый вопрос (оператор отметил «решать надо, но непонятно где»):** где живёт это решение? Кандидаты:

| Вариант | Плюс | Минус |
|---|---|---|
| **(a) Новый шаг hi_flow: «project-bootstrap / foundation-spec»** — раз на проект, до первой имплементации. Владеет: язык/фреймворк/scaffolding/тест-харнесс/CI/wiring arch-audit-тулинга. Выход: заскаффолженный репо + stack-решение. | Чистая высота (project-level, одноразовый), снимает блокер системно | Новый артефакт/скилл в семействе |
| **(b) product-spec расширяется на «tech foundation»** | Уже самый project-level артефакт hi_flow | product-spec — про продукт, не про стек; смешение |
| **(c) Первый arch-spec несёт это бремя** (текущая формулировка замечания #1) | Без нового шага | Неверная высота: feature-level скилл тащит project-level решение |
| **(d) Вне hi_flow** — ручной одноразовый setup; hi_flow предполагает готовый codebase (как и superpowers writing-plans) | Не раздувает hi_flow | Никто не напоминает; на greenfield забывается ровно до блокера |

**Мой лин:** (a) — отдельный bootstrap-шаг. Стек+scaffolding — это genuinely project-level одноразовый концерн, отличный и от feature-design, и от implementation-плана. Но это **открытый вопрос для оператора**, не решённое замечание.

**Практически в этой сессии:** пришлось провести stack-решение «вручную» как отдельную мини-сессию внутри основной (TS/Fastify/Drizzle/Vitest/pnpm + dev-Supabase/prod-plain Postgres), записать в ARCHITECTURE.md (D14). Это сработало, но это был ad-hoc обход дыры, а не штатный шаг.

---

## 4. Вторичная chain-находка: §10 как канал двух разных делегаций

(Дубль #2 из arch-spec-файла, но это chain-level, повторяю для полноты картины сессии.) Развилки, которые arch-spec кладёт в «delegated to implementation», бывают двух несовместимых типов: (а) code-sight forks → потребитель writing-plans; (б) deployment-bound bindings (scheduler, blob-backend) → потребитель = deployment-решение, НЕ writing-plans. Поймано на вопросе оператора «справится ли writing-plans с „придумай шедулер“». Развязка — port-adapter (пинить порт+дефолт, биндинг отложить к deployment-модели).

---

## 5. Третичная находка: composition-root vs строгие graph-инварианты

rules-patch «только X→Y» (эмиссия только через bottleneck; store инкапсулирован) не оставляет места центральному wiring-слою. Всплыло при проектировании плана. Слайс обошёл (emitter — только в тестах; main.ts → только db), exemption заложен в depcruise-конфиг. Дешевле закладывать exemption в rules-patch сразу.

---

## 6. Фаза имплементации (Slice 1) — результаты + находки

Slice 1 (bootstrap + write-path) исполнен параллельной сессией (subagent-driven, двухстадийное ревью включая adversarial-проход). Код на ветке `feat/audit-write-path-slice1`, 12+2 коммита. **Verified ревьюером независимо:** `test` 14/14, `typecheck` clean, `audit:dep` no violations (15 модулей). Цепочка дала **работающий софт**. Детали — `audit-write-path-impl-feedback.md` (отчёт имплементатора) + ревью в чате.

**Главная находка фазы:** adversarial-ревью (трассировал trust-chain за границу диффа: emitter → redactSecrets) поймал **реальный security-баг, внесённый на шаге writing-plans** — secret-filter не рекурсил в массивы → секреты текли в `payload_json` и offload-blob при shape `{changes:[{token:...}]}`. Нарушение §8 #5 (один из «важнее всех»). **Урок:** «matches the spec» недостаточно, когда референс-код спеки сам неверен; для security-инвариантов нужно ревью, прослеживающее trust-chain, а не дифф-локальное. arch-spec был корректен (инвариант верен) — баг был в **референс-реализации плана** (writing-plans-фаза).

**Баги плана (оба зафиксированы back в план ревьюером):**
- secret-filter array-recursion (security, §8 #5) — backported в Task 6 + тест.
- `const conds = []` → `never[]` strict-mode (typecheck-блокер) — backported в Tasks 4-5.

**Environment-трения (не логическая вина плана — version drift, но план/бриф должны упоминать):**
- pnpm 11 блокирует postinstall build-scripts по умолчанию; allowlist `onlyBuiltDependencies` идёт в `pnpm-workspace.yaml`, НЕ в package.json (pnpm 11 молча игнорит package.json-поле). Имплементатор словил sticky-state ловушку (esbuild работал только из global store; fresh clone бы упал).
- pnpm не предустановлен → corepack. Node **v24** (не LTS, план говорил LTS) — без проблем по факту, но deviation.

**Дополнительные находки ревьюера (сверх отчёта имплементатора):**
- **Denylist секретов неполон** (`access_key`, `pwd`, `bearer`, `jwt` пропускаются). Для security-инварианта denylist принципиально хрупок → compromised path, нужен follow-up (расширить / typed-marker). Помечено в плане комментарием.
- **SSoT-дрейф rules-patch** (depcruise .cjs имел composition-root exemption, .yaml — нет) — **примирён** ревьюером (exemption внесён в yaml). Закрывает фидбэк #3.
- `purge` раздаётся всем импортёрам store (interface segregation закрыла бы §8 #4 на уровне типов) — defer. `main.ts` side-effect-on-import — minor smell.

**Stack-проблема рекуррентна:** Slice 2 (`audit-ui`) заблокирован тем же — **frontend-стек не зафиксирован** (meta-фреймворк отложен «до первой UI-фичи», это она) + admin-RBAC зависит от будущей accounts-фичи. То есть находка #A (нет владельца фиксации стека) повторяется на frontend ровно как предсказано. `audit-query` (read-backend) — НЕ заблокирован, делается поверх готового store.

---

## Сводная таблица приоритетов (вся сессия)

| # | Находка | Уровень | Приоритет | Статус / где |
|---|---------|---------|-----------|-----------|
| A | Нет владельца фиксации app-stack / project-bootstrap (рекуррентно: backend + frontend) | chain / методология | **High (открытый вопрос «где»)** | §3, §6; на доработку |
| B | §10 смешивает code-sight forks и deployment-bound bindings | arch-spec / chain | **High** | arch-spec #2 |
| C | Фиксация стека на первом arch-spec + таксономия инфра-осей | arch-spec | **High** | arch-spec #1 |
| D | rules-patch без composition-root exemption | arch-spec | **Low-Med** | **примирён** (exemption внесён в yaml + .cjs) |
| E | Security-инвариант требует trust-chain ревью; «matches spec» недостаточно при кривом референс-коде плана | writing-plans / process | **Medium** | §6 |
| F | Denylist секретов принципиально неполон (compromised path) | writing-plans / impl | **Medium (security follow-up)** | §6; помечено в плане |
| G | Plan-баги: secret-filter arrays (sec) + conds:never[] (typecheck) | writing-plans | — (backported) | план Tasks 4-6 |

> A и C — две стороны одной проблемы (стек никто не фиксирует). C — как arch-spec мог бы её частично закрыть; A — более широкий вопрос «а вообще где это место». Оператор разводит/сводит при доработке.

## Открытые вопросы для оператора (на доработку)

1. **Где живёт project-bootstrap / stack-решение?** (§3, варианты a-d). Главный. Подтверждено рекуррентным: всплывёт снова на frontend-стеке для `audit-ui` (Slice 2).
2. Стоит ли arch-spec пред-закладывать composition-root exemption в rules-patch? (В этой сессии примирено руками — фидбэк #3.) Рекомендация: да, пред-закладывать.
3. ~~Подтвердит ли имплементация, что план рабочий?~~ **Да** — 14/14, typecheck+dep-audit clean, цепочка дала работающий софт. Закрыто.
4. **Security-инварианты и writing-plans:** референс-код плана может содержать security-баг (как secret-filter arrays). Нужен ли в цепочке обязательный adversarial trust-chain ревью для security-помеченных инвариантов §8, а не только дифф-ревью? (§6, находка E.)
