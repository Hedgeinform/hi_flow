# Active Issues

Баги и архитектурные долги, в плане на исправление.
Закрытие — удалением записи (история в `git log -- docs/active-issues.md`).

---

## CRITICAL

(none)

---

## HIGH

### arch-spec amendment (B+C+D) — находки первого боевого прогона REH ERP

**Локация:** `hi_flow/skills/arch-spec/SKILL.md` + `references/rules-patch-template.yaml`.

**Источник:** первый боевой прогон arch-spec (REH ERP audit, green field, 2026-05-31). Фидбек: `docs/feedback/hi_flow-arch-spec-feedback.md` + `docs/feedback/hi_flow-session-retro-2026-05-31.md`. Полный roadmap: `docs/handoffs/2026-06-01-arch-spec-feedback-roadmap-handoff.md`.

**План (три правки, design-сессия = одна, P4):**
- **B (High)** — §10 «Delegated to implementation» развести на (а) code-sight forks → writing-plans; (б) infra/deployment-bound bindings → отдельный канал (рекомендованный дефолт + констрейнт + «разблокируется при фиксации deployment-модели»). Тест: «разрешается ли решение разглядыванием кода?».
- **C (High, мостовой)** — green-field-ветка Pre-conditions: первый arch-spec фиксирует минимально-необходимое подмножество стека (feature-forced), помечая project-level + сигнал оператору; + таксономия инфра-осей (persistence/blob/scheduler/messaging/cache/search/runtime/presentation → forced-now/delegated/not-touched). Мост сознательно временный — упростится после bootstrap (см. находку A).
- **D (Low-Med)** — rules-patch type-1 правила «только X→Y» пред-закладывают composition-root exemption (`src/main.ts`/`src/bootstrap/`/`src/composition/`) в `from.pathNot`. Уже примирён руками в REH_ERP (depcruise .yaml+.cjs) — есть готовый паттерн для образца.

**Trigger:** ближайшая доработка семейства hi_flow (сессия 1 в roadmap-handoff §4). B и D зрелы и независимы; C — в мостовом варианте. Implementation amendment'а — отдельная сессия (P2/P5) при необходимости.

**Связи:** D11 (rules-patch контракт), D14 (boundary с superpowers — для E), D20/OQ6 (находка A → bootstrap, определяет границу C), D21 (arch-spec). Находка E (security trust-chain review) — развилка §7 handoff'а, частично вне scope hi_flow.

---

## MEDIUM

### tsconfig preflight check в arch-audit runtime

**Локация:** `hi_flow/skills/arch-audit/` (runtime), новый helper рядом с существующим depcruise version preflight'ом.

**Источник:** D13 (2026-04-29) — фиксирует контракт «что требуется от TS-проекта», но `Where checked` явно помечен как «preflight check planned, не реализован». Эмпирический trigger — zhenka 0.2.3 кейс с false findings из-за отсутствия `allowImportingTsExtensions`.

**План:**
1. Реализовать helper по образцу commit `f5ede31` (Q-1.5 depcruise version preflight). Валидирует 5 обязательных tsconfig-опций из `~/.claude/architecture/stacks/typescript.md` § Cross-tool contracts.
2. Сообщения warning'ов попадают в `metadata.warnings[]` audit-report'а. Если поле в D8 schema отсутствует — добавить (минимальный schema bump).
3. Fixtures: TS-проект с намеренно сломанным tsconfig (нет `allowImportingTsExtensions` при `.ts`-imports, как zhenka 0.2.3) → ожидаем warning. Зелёная fixture — корректный tsconfig.
4. SKILL.md arch-audit упоминает preflight в разделе про preconditions, ссылается на canonical контракт в stack-файле, не дублирует список.
5. Severity warning'а: не failure (audit продолжается), но видим в metadata + краткая шапка в `audit-report.md`.

**Связи:** D13 (контракт), commit `f5ede31` (паттерн для образца), D14 (часть hi_flow infrastructure layer).

### baseline rollout в arch-audit как TS-подпроекте

**Локация:** `hi_flow/skills/arch-audit/` (TS-подпроект внутри hi_flow).

**Источник:** Empirical check 2026-04-29 показал, что arch-audit'а package.json содержит только `test` + `typecheck`. Нет lint скрипта, нет biome (или иного линтера) в devDependencies, нет `gates` aggregate script, нет CI workflow в `.github/`, нет `biome.json`. Это нарушение self-referential consistency: hi_flow в составе D10 amendment + scope expansion обещает шипить hygiene baseline другим проектам, но сам по этому baseline не живёт.

**План:**
1. Установить biome (`npm install --save-dev --save-exact @biomejs/biome`).
2. Создать `hi_flow/skills/arch-audit/biome.json` по канону из `~/.claude/architecture/stacks/references/typescript-baseline.md` § 3.
3. Расширить `package.json` scripts: `lint`, `lint:fix`, `audit`, `gates` aggregate (`npm run typecheck && npm run lint && npm run test && npm run audit`).
4. Адаптировать `tsconfig.json` под канон baseline § 2 (если уже не соответствует — проверить опции strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, allowImportingTsExtensions).
5. Создать CI workflow `.github/workflows/ci.yml` per baseline § 6 (Node-вариант, поскольку arch-audit на Node, не Bun).
6. Прогнать `npm run gates` локально, починить всё, что вылезет.

**Связи:** D10 amendment (scope включает hygiene baseline distribution), D14 (self-consistency как infrastructure layer), `~/.claude/architecture/stacks/references/typescript-baseline.md` (canonical reference). Опосредованно — это OQ6 critical path подход (когда baseline переедет внутрь плагина, надо чтобы сам плагин ему соответствовал).

### v0.7.0 product-spec retrospective improvements — implementation deferred до next product-spec trigger event

**Локация:** `hi_flow/skills/product-spec/SKILL.md` + dependent `references/product-spec-template.md`.

**Источник:** retrospective REH-ERP сессии 2026-05-25 + integrated analysis 2026-05-26 (см. History 2026-05-26).

**План:** design v0.7.0 пишется немедленно в `docs/superpowers/specs/2026-05-26-hi_flow-product-spec-v0.7-retrospective-improvements-design.md` для preserving retrospective context. 13 пунктов:

1. Probe-iteration always per module (не per function) + coverage matrix `function × probe`.
2. CCP2 self-application — перед closure Шага 5 и перед Шагом 12 скилл re-reads свои earlier closure decisions.
3. Architectural axes checkpoint после Module assignment — «есть ли product axes (org, geographic, multi-language) требующие отдельных модулей помимо probe-detectable enablers?».
4. Module-card revisit после module map pivots — обязательный re-pass карточек.
5. Pre-baked Mermaid skeleton в template (готовый блок subgraph + classDef + linkStyle, копировать as-is).
6. Описания модулей перед карточками функций — 1-2 строки per модуль.
7. CC naming convention enforcement — sequential CC1, CC2..., no placeholder X/Y.
8. Section 2/3 — explicit permission на адаптивные форматы (flat / matrix / hierarchy-by-context).
9. Premortem сценарии tagging — `[delta → ...]` или `[no delta, mitigation external/post-conversion/process]`.
10. Reason for parking — обязательная строка в backlog parked entries.
11. Standing-policy checker при Шаге 12 — кандидаты в backlog § Standing.
12. Multi-message dump pattern — explicit advance signal от оператора.
13. Sf-ID gap пометки в спеке — placeholder для deferred Sf'ов вместо silent skip.

Implementation deferred до **trigger event = «следующая реальная product-spec session со scope, активирующим affected pathways» (probe-iteration на >1 модуле, premortem с дельтой, multi-module pivots; не trivial single-module spec).** При наступлении trigger — **review pass design'а v0.7** перед implementation для stale-protection.

**Связи:** D17 (parallel scope расширение в v0.6.0), D15 (предыдущий iteration feedback v0.5.0 — часть retrospective findings уже закрыта в v0.5.0, design v0.7 reflectет actual delta), v0.6.0 decomposition design (некоторые пункты — 11, 14 — частично включены в v0.6 как технически необходимое для closure phase shape).

---

## LOW

### bootstrap: scope-narrowing doc-discipline (фидбек первого боевого прогона)

**Локация:** `hi_flow/skills/bootstrap/SKILL.md` (init/incremental flow + Create flow / wire).

**Источник:** первый боевой прогон bootstrap incremental (REH ERP frontend, 2026-06-02). Оператор выбрал суженный scope (web-first; portal + shared-types + ui отложены) — bootstrap **корректно эскалировал** scope-выбор (P6 ✓). Но записал **forward-ссылки на отложенные сущности**: `biome.json` override на несуществующий `apps/portal/**`; D16/Stack-формулировки не различали scaffolded (web) vs planned (portal). → doc-ahead-of-code drift (нарушает code-is-truth, который сам bootstrap обязан соблюдать — `## Stack` = проекция реального репо).

**План:** в SKILL.md flow зафиксировать: при суженном scope писать в ARCHITECTURE/конфиги **только заскаффолженное**; отложенное помечать `planned`, не как существующее; избегать forward-провижна конфигов на несуществующие пути (или явно `planned`). Stack-проекция = только реальный код.

**Связи:** KD2 (code-is-truth), P8 (высоты), coverage-honesty. Прогон в остальном успешен — coverage-honesty → Known Drift в REH сработал как спроектировано.

### Integration-тесты arch-audit мутируют трекаемые фикстуры

**Локация:** `hi_flow/skills/arch-audit/tests/integration/*` → пишут `audit-report.*` в `tests/fixtures/*/audit-report/`.

**Источник:** graph-core code review 2026-05-31 — прогон integration-сьюта изменяет/удаляет трекаемые файлы фикстур, после прогона нужен `git checkout tests/fixtures/`. Test-hygiene smell.

**План:** генерировать артефакты integration-тестов в tmp/gitignored директорию, не в трекаемые `tests/fixtures/*/audit-report/`.

### dependency-cruiser не объявлен в devDependencies arch-audit

**Локация:** `hi_flow/skills/arch-audit/package.json`.

**Источник:** graph-core code review 2026-05-31 — integration-тесты требуют `dependency-cruiser` через `npx --no-install` в runtime, но он не в devDependencies и отсутствует в окружении → 3 integration-теста (`cycle/barrel/layered-project`) падают на `depcruise output is not valid JSON` (environmental, не регрессия). graph-core сам бинарь не требует.

**План:** добавить `dependency-cruiser` в devDependencies arch-audit (через `npm install --save-dev`, ask-операция) для воспроизводимости integration. Скоординировать с issue «baseline rollout» (там же установка biome + gates).

### Version drift arch-audit: package.json 0.3.0 vs ARCHITECTURE Module Map v0.2.6

**Локация:** `hi_flow/skills/arch-audit/package.json` (0.3.0) vs `ARCHITECTURE.md` Module Map / Current Status (v0.2.6).

**Источник:** graph-core code review 2026-05-31. package.json bump'нулся до 0.3.0 (barrel detection), Module Map не синхронизирован.

**План:** синхронизировать счётчик версии в ARCHITECTURE.md Module Map arch-audit (v0.2.6 → 0.3.0). Тривиально, при следующем касании ARCHITECTURE.md.
