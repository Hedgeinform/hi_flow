# Active Issues

Баги и архитектурные долги, в плане на исправление.
Закрытие — удалением записи (история в `git log -- docs/active-issues.md`).

---

## CRITICAL

(none)

---

## HIGH

### `fast-uri` в production-графе arch-audit уязвим к path traversal и host confusion

**Локация:** `hi_flow/skills/arch-audit/package-lock.json` — транзитивная зависимость AJV, зафиксирована версия `fast-uri@3.1.0`.

**Источник:** `npm audit --omit=dev` от 2026-07-17 — GHSA-q3j6-qgpj-74h6 и GHSA-v39h-62p7-jpjc; уязвимы версии `<=3.1.1`. Долг существовал до добавления `ajv-formats`.

**План:** обновить AJV/lock-файл до графа с непоражённой версией `fast-uri`, затем прогнать полный ArchAudit suite и `npm audit --omit=dev`. Не применять `npm audit fix` без проверки diff.

**Связи:** `hi_flow/skills/arch-audit/package.json`, D8 schema validation runtime.

### arch-spec amendment (B + C + D + E) — находки первого боевого прогона REH ERP

**Status:** implemented 2026-06-03 (B+C+D+E в SKILL.md + 3 references; isolated review PASS; report `...-amendment-design-report.md`). Остался release (version bump + commit, D16). Запись удаляется после release.

**Локация:** `hi_flow/skills/arch-spec/SKILL.md` + `references/rules-patch-template.yaml`.

**Источник:** первый боевой прогон arch-spec (REH ERP audit, green field, 2026-05-31). Фидбек: `docs/feedback/hi_flow-arch-spec-feedback.md` + `docs/feedback/hi_flow-session-retro-2026-05-31.md`. Roadmap: `docs/handoffs/2026-06-01-arch-spec-feedback-roadmap-handoff.md`.

**Scope finalized 2026-06-02** (после impl bootstrap — C переоценён, B/D scope уточнён):

- **B (High)** — §10 «Delegated to implementation» развести: (а) code-sight forks → writing-plans; (б) **deployment-bound bindings → отдельный канал** (рекомендованный дефолт + констрейнт + «разблокируется при фиксации deployment-модели»). **Граница после bootstrap:** §10-(б) = deployment-bound привязки ВНУТРИ зафиксированной оси (конкретный scheduler, blob-backend AWS-S3/MinIO), НЕ фиксация самой оси (та теперь в bootstrap). Тест: «разрешается ли разглядыванием кода?». Независим, зрелый, главный.
- **C (Low — схлопнулся после bootstrap)** — bootstrap забрал app-stack fixation + таксономию инфра-осей (живёт в `hi_flow/skills/bootstrap/references/axis-taxonomy.md`). arch-spec C сводится к **чистому сигналу**: «фича форсирует инфра-ось, не зафиксирована → запусти bootstrap». НЕ фиксирует стек, НЕ дублирует таксономию. Мостовое бремя снято. Из High-мостовой → Low-сигнал.
- **D (Low-Med, scope уточнён)** — composition-root exemption логичнее в **baseline depcruise-config** (project-level — bootstrap-wired / typescript-baseline), + arch-spec rules-patch gen aware (не генерит «только X→Y», ломающие composition-root `src/main.ts`/`src/bootstrap/`). REH решил на baseline-уровне (.yaml+.cjs) — образец есть.
- **E (Medium, OQ12) — развилка** — пометка security-critical инвариантов §8 «trust-chain review required» vs D14 boundary-clause (review methodology = superpowers). Не зависит от bootstrap.

**Trigger:** отдельная arch-spec amendment сессия (P4). Объём меньше изначального — C схлопнулся (тривиальный сигнал), B главный, D частично baseline-territory. Implementation — отдельная сессия (P2/P5).

**Связи:** D11 (rules-patch контракт), D14 (boundary с superpowers — для E), D20 (bootstrap забрал C-территорию), D21 (arch-spec), OQ12 (E).

---

## MEDIUM

### `js-yaml@4.1.1` в production-зависимостях arch-audit уязвим к quadratic-complexity DoS

**Локация:** `hi_flow/skills/arch-audit/package.json`, `hi_flow/skills/arch-audit/package-lock.json`.

**Источник:** `npm audit --omit=dev` от 2026-07-17 — GHSA-h67p-54hq-rp68; уязвим диапазон `>=4.0.0 <=4.1.1`. Долг существовал до текущего исправления.

**План:** обновить `js-yaml` до непоражённой версии, проверить совместимость загрузки YAML-правил, прогнать полный ArchAudit suite и повторный production audit.

**Связи:** `.audit-rules.yaml`, D9 loader/runtime YAML parsing.

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

### `vertical-slice-respect` — правило-призрак: объявлено в baseline, не эмитится ни на одном дереве

**Локация:** `hi_flow/skills/arch-audit/core/baseline-rules.ts:115` (запись реестра) + `references/baseline-rules.md` §150-154 (док) vs `adapters/typescript-depcruise.ts → detectStructural()` (нет эмиссии) + `helpers/parse-depcruise-output.ts:32-43` (`fileToModule`).

**Источник:** изолированный spec-review frontend-coverage 2026-06-05 (subagent), верифицировано вручную. Правило есть в реестре, доке и severity-counts, но **ни одна строка кода не эмитит `vertical-slice-respect` finding**. Это silent-failure объявленной возможности (нарушение global принципа 5 — no silent fallback): аудит-репорт декларирует покрытие vertical-slice-cohesion, фактически изоляция фич не проверяется нигде.

**Корневая причина — granularity модели модулей.** `fileToModule` резолвит модуль как единственный top-level сегмент под `src/` (`parts[srcIdx+1]`). Значит `src/features/A/...` и `src/features/B/...` оба схлопываются в модуль `features`, кросс-импорт `A→B` выглядит как внутренний `features→features` — невидим. (Backend-аналог был бы `src/tools/<feature>/`, но **сверено 2026-06-06**: в zhenka-bot тулы — плоские файлы `src/tools/*.ts`, не подпапки, дробить нечего; живой кейс пиров — `inbox/conversation/groups` в reh-erp apps/web, ещё не построен. См. бриф `docs/feedback/hi_flow-frontend-slice-governance-brief.md`.) Правило непредставимо при текущей плоской модели — нужна суб-модульная резолюция для feature-folder структур.

**План:**
1. Ввести finer module resolution для feature-folder контейнеров (`features/`, `tools/`, конфигурируемо): для путей `src/<container>/<feature>/...` модуль = `<container>/<feature>`, а не `<container>`.
2. Реализовать эмиссию в `detectStructural` по `feature_folders_detected`: кросс-импорты между sub-feature модулями одного контейнера → finding, кроме импортов через `shared/`/`common/`.
3. Проверить, что метрики (Ca/Ce/NCCD, dep_graph) не ломаются от изменения гранулярности — либо granularity локализована в detection, либо метрики осознанно мигрируют.
4. Fixtures: feature-folder проект с чистым кейсом + кросс-feature нарушением + импортом через shared (разрешён).
5. Behavior-change flag: после фикса существующие проекты с **вложенными** feature-folders (`src/<container>/<feature>/`) получат ранее отсутствовавшие MEDIUM findings + пересчёт метрик (Ca/Ce/NCCD) на более дробном наборе модулей — корректное поведение, но прогнать на реальном проекте перед релизом. **Сверено 2026-06-06:** zhenka-bot `src/tools/` — плоские файлы (не триггерит); zhenka-web `src/features/` — одна фича `theme` (пиров нет); живого кейса пиров пока нет (ждёт reh-erp apps/web). Перед релизом Части 2 нужен реальный feature-sliced прогон.

**Связи:** baseline-rules.md §150-154 (контракт), D12 (последнее касание baseline rule set), frontend-coverage-completion spec 2026-06-05 (вскрыто там; frontend horizontal layered rule НЕ зависит от этого — изоляция фич отложена из scope осознанно), global принцип 5. **Брифом 2026-06-06 (frontend-slice-governance) переоценён вверх:** реальный кейс пиров — reh-erp apps/web; Часть 1 (декларативный гейт активации фронт-профиля) делается отдельно и от этого НЕ зависит.

---

### arch-spec: авто-эмиссия frontend-профиля в rules-patch (follow-up Части 1 frontend-slice-governance)

**Локация:** `hi_flow/skills/arch-spec/SKILL.md` + `references/rules-patch-template.yaml` (генерация frontend rules-patch).

**Источник:** бриф `docs/feedback/hi_flow-frontend-slice-governance-brief.md` (2026-06-06). Часть 1 чинит arch-audit, чтобы фронт-профиль активировался по декларации (`overrides.profile` / `layer_aliases` в `.audit-rules.yaml`), но саму декларацию пока пишет оператор руками (как reh-erp в `comm-web-rules-patch.yaml`). Чтобы цепочка была turnkey, arch-spec при детекте не-горизонтального (feature-sliced) фронт-дерева должен эмитить декларацию в свой rules-patch.

**Зависит от:** Часть 1 (формат декларации фиксируется её design-докой) — не стартовать до мёржа Части 1 (принцип 10). bootstrap сюда НЕ входит: он скаффолдит стандартную горизонтальную раскладку (`components/hooks/lib`), которой декларация не нужна (активируется по литералам).

**План:** после Части 1 — отдельная arch-spec amendment-сессия (P4): rules-patch gen для frontend-дерева добавляет `overrides.profile: frontend` (+ обнаруженные `layer_aliases`), когда раскладка не горизонтальная.

**Связи:** Часть 1 design-дока (frontend-slice-governance amendment), D11 (rules-patch контракт), D21 (arch-spec), бриф 2026-06-06.

---

## LOW

### dependency-cruiser не объявлен в devDependencies arch-audit

**Локация:** `hi_flow/skills/arch-audit/package.json`.

**Источник:** graph-core code review 2026-05-31 — integration-тесты требуют `dependency-cruiser` через `npx --no-install` в runtime, но он не в devDependencies и отсутствует в окружении → 3 integration-теста (`cycle/barrel/layered-project`) падают на `depcruise output is not valid JSON` (environmental, не регрессия). graph-core сам бинарь не требует.

**План:** добавить `dependency-cruiser` в devDependencies arch-audit (через `npm install --save-dev`, ask-операция) для воспроизводимости integration. Скоординировать с issue «baseline rollout» (там же установка biome + gates).

### Version drift arch-audit: package.json 0.3.0 vs ARCHITECTURE Module Map v0.2.6

**Локация:** `hi_flow/skills/arch-audit/package.json` (0.3.0) vs `ARCHITECTURE.md` Module Map / Current Status (v0.2.6).

**Источник:** graph-core code review 2026-05-31. package.json bump'нулся до 0.3.0 (barrel detection), Module Map не синхронизирован.

**План:** синхронизировать счётчик версии в ARCHITECTURE.md Module Map arch-audit (v0.2.6 → 0.3.0). Тривиально, при следующем касании ARCHITECTURE.md.

### Нет runtime-валидации overrides в `.audit-rules.yaml` (silent fallback на опечатку)

**Локация:** `hi_flow/skills/arch-audit/core/project-rules.ts:25-31` (`loadProjectRules` — `overrides: parsed.overrides` без проверки полей/значений).

**Источник:** code-review амендмента frontend-slice-governance 2026-06-06 (item 1). Значение `overrides.profile`, отличное от `frontend`/`backend` (опечатка `Frontend`/`front`/`fe`), молча уходит в эвристический fallback без диагностики — нарушение global принципа 5 (no silent fallback). Касается не только нового `profile`, но и существующих полей (`nccd_threshold`, `layer_aliases`, …) — ни одно не валидируется.

**План:** единый проход валидации overrides при загрузке (допустимые поля + enum-значения), warning в `metadata.warnings[]` при невалидном значении (тот же паттерн, что MEDIUM «tsconfig preflight»). НЕ точечная проверка только `profile` (была бы непоследовательна — отметил ревьюер).

**Связи:** global принцип 5, MEDIUM «tsconfig preflight check» (паттерн warning в metadata), frontend-slice-governance amendment (ввёл первый enum-field `profile`), D8 schema (`metadata.warnings`).
