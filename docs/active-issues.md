# Active Issues

Баги и архитектурные долги, в плане на исправление.
Закрытие — удалением записи (история в `git log -- docs/active-issues.md`).

---

## CRITICAL

(none)

---

## HIGH

(none)

## MEDIUM

### tsconfig preflight check в arch-audit runtime

**Локация:** `hi_flow/skills/arch-audit/` (runtime), новый helper рядом с существующим depcruise version preflight'ом.

**Источник:** D13 (2026-04-29) — фиксирует контракт «что требуется от TS-проекта», но `Where checked` явно помечен как «preflight check planned, не реализован». Эмпирический trigger — zhenka 0.2.3 кейс с false findings из-за отсутствия `allowImportingTsExtensions`.

**План:**
1. Реализовать helper по образцу commit `f5ede31` (Q-1.5 depcruise version preflight). Валидирует 5 обязательных tsconfig-опций из `hi_flow/references/stacks/typescript.md` § Cross-tool contracts.
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
2. Создать `hi_flow/skills/arch-audit/biome.json` по канону из `hi_flow/references/stacks/references/typescript-baseline.md` § 3.
3. Расширить `package.json` scripts: `lint`, `lint:fix`, `audit`, `gates` aggregate (`npm run typecheck && npm run lint && npm run test && npm run audit`).
4. Адаптировать `tsconfig.json` под канон baseline § 2 (если уже не соответствует — проверить опции strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, allowImportingTsExtensions).
5. Создать CI workflow `.github/workflows/ci.yml` per baseline § 6 (Node-вариант, поскольку arch-audit на Node, не Bun).
6. Прогнать `npm run gates` локально, починить всё, что вылезет.

**Связи:** D10 amendment (scope включает hygiene baseline distribution), D14 (self-consistency как infrastructure layer), `hi_flow/references/stacks/references/typescript-baseline.md` (canonical reference). Опосредованно — это OQ6 critical path подход (когда baseline переедет внутрь плагина, надо чтобы сам плагин ему соответствовал).

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

### Нет runtime-валидации overrides в `.audit-rules.yaml` (silent fallback на опечатку)

**Локация:** `hi_flow/skills/arch-audit/core/project-rules.ts:25-31` (`loadProjectRules` — `overrides: parsed.overrides` без проверки полей/значений).

**Источник:** code-review амендмента frontend-slice-governance 2026-06-06 (item 1). Значение `overrides.profile`, отличное от `frontend`/`backend` (опечатка `Frontend`/`front`/`fe`), молча уходит в эвристический fallback без диагностики — нарушение global принципа 5 (no silent fallback). Касается не только нового `profile`, но и существующих полей (`nccd_threshold`, `layer_aliases`, …) — ни одно не валидируется.

**План:** единый проход валидации overrides при загрузке (допустимые поля + enum-значения), warning в `metadata.warnings[]` при невалидном значении (тот же паттерн, что MEDIUM «tsconfig preflight»). НЕ точечная проверка только `profile` (была бы непоследовательна — отметил ревьюер).

**Связи:** global принцип 5, MEDIUM «tsconfig preflight check» (паттерн warning в metadata), frontend-slice-governance amendment (ввёл первый enum-field `profile`), D8 schema (`metadata.warnings`).


## Сохранённые открытые вопросы и триггеры

Перенесены из прежнего ARCHITECTURE.md при смене формата 2026-10-24. Это очередь
решений и проверок, а не утверждение о реализованной функциональности. Детальные
исторические предложения — в [архиве](architecture/history/2026-10-24-architecture-v2.md).

- **OQ8 — кампании аудита.** Не смешивать сохранённые initial/final snapshots,
  результаты редизайна и временный live output. Отдельная схема campaigns/roadmap
  остаётся предложением для дизайна, не новым обязательным форматом текущего runtime.
- **OQ1 — полный прогон ERP-фичи.** Backend Slice 1 проверен; bootstrap разблокировал
  frontend-фундамент. Полное закрытие требует подтверждённого прохождения audit-ui
  через arch-spec → план → реализацию. Наличие шаблонов или симуляции этого не доказывает.
- **OQ10 — согласованность backlog.** Вернуться к двунаправленной сверке при первом
  расхождении формата или заметном росте downstream-вкладов.
- **OQ11 — размер дистрибутива.** Тесты остаются внутри git-пакета. Вопрос их
  исключения не закрыт. Старое требование устанавливать runtime зависимости
  потребителю снято поставляемым dist; см. README и standalone-runtime report.
- **OQ13 — боевой прогон Ops.** Не выдавать старую симуляцию шести сценариев за
  проверенный запуск доставки. При следующем соответствующем onboarding сверить
  реальные результаты и обновить покрытие.
- **OQ14 — CD stub.** Сейчас Ops создаёт/достраивает CD. Автоматический stub из
  bootstrap не вводить без решения при реальном недостатке существующего пути.
- **OQ15 — fullstack.** Смешанное src требует отдельного решения о subtree audit;
  первый реальный shared package под packages/ — триггер пересмотра per-tree
  предположений. Аудит всего monorepo одной командой остаётся отдельным предложением.
- **Pending 2026-04-29 — проверяемость refactor-планов.** Каждый audit-шаг должен
  иметь конкретную команду и место проверки ожидаемого результата. Сверить при
  следующем изменении шаблона refactor-плана; общий implementation-plan уже требует
  точных команд. Старый прогноз «планировщик отсутствует» больше не актуален.

Закрыты как устаревшие основания: OQ9 «feature-spec ещё не прошёл реальный
прогон» — собственные отчёты и архив уже фиксируют прогон ERP; OQ6 перенос личных
stack-файлов — выполнен июльским изменением. Завершение снятия зависимости от
legacy skill отдельно отслеживается текущим планом и PROJECT_STATE.
