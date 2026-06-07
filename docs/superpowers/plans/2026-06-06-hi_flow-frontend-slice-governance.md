# План реализации — frontend-slice-governance (Часть 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать активацию frontend-профиля в arch-audit декларативной (`overrides.profile`), аддитивно к существующей литеральной эвристике — чтобы feature-sliced раскладки получали слоевой governance, а горизонтальные не регрессировали.

**Architecture:** Меняется одно условие активации в адаптере `typescript-depcruise` + одно новое поле в типе `ProjectRulesOverrides`. Маппинг слоёв (`layer_aliases`) и сами правила (`frontend-layered-respect` / `frontend-layer-cycle`) уже существуют и не трогаются. Плюс правки документации (canonical rule-doc, SKILL.md, coverage-manifest).

**Tech Stack:** TypeScript (Node), vitest, dependency-cruiser adapter. Рабочая директория для всех команд — `hi_flow/skills/arch-audit/`.

**Спека:** `docs/superpowers/specs/2026-06-06-hi_flow-frontend-slice-governance-amendment-design.md`

**Вне scope (в `docs/active-issues.md`, НЕ реализуем здесь):** Часть 2 (изоляция пиров / finer module resolution), arch-spec авто-эмиссия декларации, явный `layer_order`.

---

## Task 1: Декларативный гейт активации frontend-профиля

Ядро амендмента. Поле типа добавляем первым (иначе тест и адаптер не пройдут typecheck при чтении `overrides.profile`), затем red→green на поведении адаптера.

**Files:**
- Modify: `hi_flow/skills/arch-audit/core/types.ts:96-103` (интерфейс `ProjectRulesOverrides`)
- Modify: `hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts:209-210` (гейт `isFrontendProfile`)
- Test: `hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts` (новый describe-блок в конце файла)

- [ ] **Step 1: Добавить поле `profile` в тип `ProjectRulesOverrides`**

В `core/types.ts` в интерфейс `ProjectRulesOverrides` (после `nccd_threshold`) добавить строку:

```ts
export interface ProjectRulesOverrides {
  nccd_threshold?: number
  profile?: 'frontend' | 'backend'
  layer_aliases?: Record<string, string>
  baseline_disables?: { rule_id: string; comment: string }[]
  severity_overrides?: { rule_id: string; severity: Severity }[]
  channel_sdk_extras?: string[]
  module_pattern?: string
}
```

- [ ] **Step 2: Написать падающие тесты на поведение гейта**

В конец `tests/adapters/typescript-depcruise.test.ts` добавить новый describe-блок:

```ts
describe('typescript-depcruise adapter — declarative frontend profile', () => {
  const run = (
    depGraph: Record<string, string[]>,
    names: string[],
    overrides?: Record<string, unknown>,
  ) => {
    const perModuleRaw: Record<string, { ca: number; ce: number; loc: number }> = {}
    for (const n of names) perModuleRaw[n] = { ca: 1, ce: 1, loc: 50 }
    return createTypescriptDepcruiseAdapter().detectStructural({
      projectPath: '/tmp/x',
      depGraph,
      perModuleRaw,
      projectRules: { forbidden: [], required: [], ...(overrides ? { overrides } : {}) },
    })
  }

  it('activates on a feature-sliced layout when profile:frontend is declared', async () => {
    // Кастомные фиче-имена, ноль литеральных signal-dirs; layer_aliases маппят на fe-слои.
    // comm=data-access(5) импортирует shell=pages(1): 5>1 -> вверх -> frontend-layered-respect.
    const findings = await run(
      { comm: ['shell'], shell: [] },
      ['comm', 'shell'],
      { profile: 'frontend', layer_aliases: { comm: 'data-access', shell: 'pages' } },
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect'
      && f.source.module === 'comm' && f.target?.module === 'shell')).toBe(true)
    expect(findings.some(f => f.rule_id === 'layered-respect')).toBe(false)
  })

  it('does NOT activate on a feature-sliced layout without declaration (no auto-detect)', async () => {
    const findings = await run(
      { comm: ['shell'], shell: [] },
      ['comm', 'shell'],
      { layer_aliases: { comm: 'data-access', shell: 'pages' } }, // алиасы есть, profile нет
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })

  it('honors profile:backend as an escape hatch despite frontend-looking dirs', async () => {
    // components+pages+hooks = 3 литеральных signal-dir -> одна эвристика активировала бы FE.
    // profile:backend принудительно выключает.
    const findings = await run(
      { components: ['pages'], pages: [], hooks: [] },
      ['components', 'pages', 'hooks'],
      { profile: 'backend' },
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect')).toBe(false)
  })

  it('regression: horizontal layout (zhenka-web shape) still activates via literals, no declaration', async () => {
    // components+hooks+pages+features = 4 литеральных signal-dir, profile нет -> FE активен.
    const findings = await run(
      { components: ['pages'], pages: [], hooks: [], features: [], lib: [], contexts: [] },
      ['components', 'pages', 'hooks', 'features', 'lib', 'contexts'],
    )
    expect(findings.some(f => f.rule_id === 'frontend-layered-respect'
      && f.source.module === 'components' && f.target?.module === 'pages')).toBe(true)
  })
})
```

- [ ] **Step 3: Прогнать тесты — убедиться, что нужные падают**

Run: `npx vitest run tests/adapters/typescript-depcruise.test.ts -t "declarative frontend profile"`
Expected: FAIL — тесты `profile:frontend` (ожидает finding, но гейт игнорирует декларацию → FE не активен → finding'а нет) и `profile:backend` (ожидает отсутствие finding'а, но литералы активируют FE → finding есть). Тесты `without declaration` и `regression` — PASS уже сейчас.

- [ ] **Step 4: Реализовать декларативный гейт**

В `adapters/typescript-depcruise.ts` заменить строки 209-210:

```ts
      const FRONTEND_SIGNAL_DIRS = ['components', 'hooks', 'pages', 'features']
      const isFrontendProfile = modules.filter(m => FRONTEND_SIGNAL_DIRS.includes(m)).length >= 2
```

на:

```ts
      const FRONTEND_SIGNAL_DIRS = ['components', 'hooks', 'pages', 'features']
      const declaredProfile = projectRules.overrides?.profile
      const literalFrontendSignal = modules.filter(m => FRONTEND_SIGNAL_DIRS.includes(m)).length >= 2
      const isFrontendProfile =
        declaredProfile === 'frontend' ||
        (declaredProfile !== 'backend' && literalFrontendSignal)
```

(Маппинг слоёв на `:270` — `feAlias = { ...frontendLayerMap, ...layer_aliases }` — НЕ трогать, он уже honorит кастомные имена.)

- [ ] **Step 5: Прогнать новый блок — убедиться, что зелёный**

Run: `npx vitest run tests/adapters/typescript-depcruise.test.ts -t "declarative frontend profile"`
Expected: PASS (все 4 теста).

- [ ] **Step 6: Прогнать ВЕСЬ файл адаптера — регресс существующих frontend/backend тестов**

Run: `npx vitest run tests/adapters/typescript-depcruise.test.ts`
Expected: PASS. Особенно существующий блок `frontend layered detection` (горизонтальные раскладки по литералам) и `leaves a backend project on the backend layered rule` — доказательство аддитивности (поведение без декларации не изменилось).

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: без ошибок (поле `profile` типизировано, `declaredProfile` сравнивается со строковыми литералами).

- [ ] **Step 8: Commit**

```bash
git add hi_flow/skills/arch-audit/core/types.ts hi_flow/skills/arch-audit/adapters/typescript-depcruise.ts hi_flow/skills/arch-audit/tests/adapters/typescript-depcruise.test.ts
git commit -m "feat(arch-audit): declarative frontend-profile activation (overrides.profile)"
```

---

## Task 2: Контракт-тест — `overrides.profile` переживает загрузку правил

`loadProjectRules` field-agnostic (`overrides: parsed.overrides` — отдаёт объект as-is), поэтому тест **зелёный сразу** — это намеренный guard контракта, не red-first. Фиксирует, что лоадер доносит `profile` до адаптера.

**Files:**
- Test: `hi_flow/skills/arch-audit/tests/core/project-rules.test.ts` (новый `it` внутри существующего `describe('project-rules', …)`)

- [ ] **Step 1: Добавить тест pass-through**

В `tests/core/project-rules.test.ts` внутри `describe('project-rules', …)` добавить:

```ts
  it('carries overrides.profile through load (frontend-slice-governance)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr-'))
    await writeFile(
      join(dir, '.audit-rules.yaml'),
      `forbidden: []\nrequired: []\noverrides:\n  profile: frontend\n  layer_aliases:\n    comm: data-access\n`,
      'utf-8',
    )
    const rules = await loadProjectRules(dir)
    expect(rules.overrides?.profile).toBe('frontend')
    expect(rules.overrides?.layer_aliases?.['comm']).toBe('data-access')
    await rm(dir, { recursive: true })
  })
```

- [ ] **Step 2: Прогнать — убедиться, что зелёный (green-on-arrival, ожидаемо)**

Run: `npx vitest run tests/core/project-rules.test.ts -t "carries overrides.profile"`
Expected: PASS. (Если FAIL — значит лоадер где-то фильтрует overrides по полям; тогда чинить лоадер, но по текущему коду он generic.)

- [ ] **Step 3: Commit**

```bash
git add hi_flow/skills/arch-audit/tests/core/project-rules.test.ts
git commit -m "test(arch-audit): guard overrides.profile load pass-through"
```

---

## Task 3: Документация — canonical rule-doc активации

`references/baseline-rules.md` §156-167 — единственный user-facing документ, описывающий активацию правил `frontend-layered-respect`. Сейчас он фиксирует «литералы-only» → разойдётся с кодом, если не поправить.

**Files:**
- Modify: `hi_flow/skills/arch-audit/references/baseline-rules.md` (строка с `**Detection:**` под `### frontend-layered-respect`, ~:158)

- [ ] **Step 1: Обновить описание активации**

Заменить строку:

```markdown
- **Detection:** custom (адаптер) — applies, когда прогон **frontend-profiled** (≥2 из `components/`, `hooks/`, `pages/`, `features/`). Frontend layer order (сверху вниз, импорт разрешён вниз): `pages → features → components → hooks → (api/services = data-access) → lib`. Алиасы: `routes→pages`, `app→pages` (только frontend-профиль), `store→hooks`, `shared`/`utils→lib`.
```

на:

```markdown
- **Detection:** custom (адаптер) — applies, когда прогон **frontend-profiled**. Активация: явная декларация `overrides.profile: frontend` в `.audit-rules.yaml` **или** (fallback) литеральная эвристика — ≥2 из `components/`, `hooks/`, `pages/`, `features/`. `overrides.profile: backend` принудительно отключает frontend-профиль даже при наличии этих папок (escape hatch). Для feature-sliced раскладок с кастомными именами слоёв декларация обязательна — без неё литералы не совпадут и слоевой governance не активируется (только универсалии). Frontend layer order (сверху вниз, импорт разрешён вниз): `pages → features → components → hooks → (api/services = data-access) → lib`. Кастомные имена слоёв задаются через `overrides.layer_aliases`. Встроенные алиасы: `routes→pages`, `app→pages` (только frontend-профиль), `store→hooks`, `shared`/`utils→lib`.
```

- [ ] **Step 2: Проверить — открыть файл и убедиться, что описание совпадает с гейтом из Task 1 Step 4**

Read: `hi_flow/skills/arch-audit/references/baseline-rules.md` (§156-167)
Expected: текст активации = «декларация ИЛИ литералы», `backend` как escape hatch — согласовано с реализованным условием.

- [ ] **Step 3: Commit**

```bash
git add hi_flow/skills/arch-audit/references/baseline-rules.md
git commit -m "docs(arch-audit): baseline-rules frontend activation now declarative-or-literal"
```

---

## Task 4: Документация — поле `profile` в SKILL.md arch-audit

**Files:**
- Modify: `hi_flow/skills/arch-audit/SKILL.md` (рядом с описанием project rules / `<project>/.audit-rules.yaml`, контекст ~:128)

- [ ] **Step 1: Найти место и добавить документацию поля**

Read: `hi_flow/skills/arch-audit/SKILL.md` — найти раздел, где описываются project rules и `<project>/.audit-rules.yaml` `overrides` (около упоминания `generate-depcruise-config`, ~:128, либо раздел про project-rules contract).

Добавить туда абзац (дословно):

```markdown
**`overrides.profile` (frontend | backend) — optional.** Явно объявляет тип дерева для слоевого governance. `frontend` → активирует frontend layered-правила (`frontend-layered-respect` / `frontend-layer-cycle`), backend layered + port-adapter пропускаются. `backend` → принудительно backend-профиль даже при наличии папок `components`/`hooks` (escape hatch). Не указано → fallback на литеральную эвристику (≥2 из `components/hooks/pages/features`). Для feature-sliced раскладок с кастомными именами слоёв декларация обязательна (+ `overrides.layer_aliases` для маппинга имён на слои). Авто-детект раскладки сознательно не делается — «слой или слайс» статически неоднозначно. См. `docs/superpowers/specs/2026-06-06-hi_flow-frontend-slice-governance-amendment-design.md`.
```

- [ ] **Step 2: Проверить — открыть файл, убедиться, что абзац на месте и не противоречит окружающему тексту**

Read: `hi_flow/skills/arch-audit/SKILL.md` (изменённый раздел)
Expected: абзац про `profile` присутствует, описание трёх случаев согласовано с Task 1 / Task 3.

- [ ] **Step 3: Commit**

```bash
git add hi_flow/skills/arch-audit/SKILL.md
git commit -m "docs(arch-audit): document overrides.profile in SKILL.md"
```

---

## Task 5: Документация — честность coverage-manifest (bootstrap)

`coverage-manifest.md` строка `interface / frontend` стоит `covered` безусловно — оптимистично для feature-sliced без декларации (там только универсалии, не слоевой governance).

**Files:**
- Modify: `hi_flow/skills/bootstrap/references/coverage-manifest.md` (audit-adapter cell строки `interface / frontend`, ~:65; абзац «Covered (2026-06-05)», ~:69)

- [ ] **Step 1: Уточнить audit-adapter cell**

Заменить (в ячейке `audit-adapter` строки `interface / frontend`):

```markdown
| audit-adapter | **present** — typescript-depcruise (scan glob includes `.tsx`) + `frontend-layered-respect` (MEDIUM) / `frontend-layer-cycle` (CRITICAL) baseline conditional rules: horizontal layered governance (pages→features→components→hooks→data-access→lib), run-level frontend profile. Feature isolation (vertical-slice) deferred — see active-issues. Render/hooks layer out of module-graph scope, covered by `eslint-plugin-react-hooks` (react.md). |
```

на:

```markdown
| audit-adapter | **present** — typescript-depcruise (scan glob includes `.tsx`) + `frontend-layered-respect` (MEDIUM) / `frontend-layer-cycle` (CRITICAL) baseline conditional rules: layered governance (pages→features→components→hooks→data-access→lib), run-level frontend profile. **Активация:** объявленный `overrides.profile: frontend` **или** литеральная эвристика (горизонтальные раскладки) — feature-sliced раскладки требуют декларации (+ `layer_aliases`), иначе только универсалии. Feature isolation (vertical-slice) deferred — see active-issues. Render/hooks layer out of module-graph scope, covered by `eslint-plugin-react-hooks` (react.md). |
```

- [ ] **Step 2: Уточнить абзац «Covered»**

Заменить:

```markdown
**Covered (2026-06-05).** stack-file + baseline (delta-on-top of `typescript.md`) wire lint/format/gates/CI; the audit-adapter delivers horizontal layered governance via `frontend-layered-respect` / `frontend-layer-cycle` (run-level frontend profile; backend layered rules skipped to avoid `api`/`app`/`services` false positives); the scaffold-template lays a green components/hooks/lib skeleton.
```

на:

```markdown
**Covered (2026-06-05, активация уточнена 2026-06-06).** stack-file + baseline (delta-on-top of `typescript.md`) wire lint/format/gates/CI; the audit-adapter delivers layered governance via `frontend-layered-respect` / `frontend-layer-cycle` (backend layered rules skipped to avoid `api`/`app`/`services` false positives); the scaffold-template lays a green components/hooks/lib skeleton. **`covered` распространяется на горизонтальные раскладки (стандартные имена → литеральная активация) и на feature-sliced раскладки, объявившие `overrides.profile: frontend` + `layer_aliases`.** Feature-sliced БЕЗ декларации получает только универсалии (циклы/barrel/god-object), не слоевой governance — это не «covered молча», а сигнал задекларировать раскладку (см. arch-audit `overrides.profile`).
```

- [ ] **Step 3: Проверить — открыть файл, убедиться в согласованности**

Read: `hi_flow/skills/bootstrap/references/coverage-manifest.md` (строка `interface / frontend`)
Expected: формулировка честности согласована со спекой §4; «feature isolation deferred» сохранена.

- [ ] **Step 4: Commit**

```bash
git add hi_flow/skills/bootstrap/references/coverage-manifest.md
git commit -m "docs(bootstrap): coverage-manifest honesty — frontend covered iff declared/horizontal"
```

---

## Task 6: Финальная валидация

**Files:** (нет правок — только прогон)

- [ ] **Step 1: Полный typecheck + тесты arch-audit**

Run: `npm run typecheck`
Expected: без ошибок.

Run: `npm run test`
Expected: все unit/component-тесты зелёные (включая новые Task 1/2). Integration-тесты (cycle/barrel/layered-project) могут падать environmentally на отсутствии `dependency-cruiser` в node_modules — это **pre-existing** (LOW active-issue), не регресс этого амендмента; зафиксировать факт, не чинить здесь.

- [ ] **Step 2: Behavioral / consistency проверка (P2/P5)**

Сверить вручную (или субагентом с изоляцией контекста), что три документа описывают активацию **одинаково**: `adapters/typescript-depcruise.ts` (гейт), `references/baseline-rules.md` §158, `SKILL.md` (`profile`), `coverage-manifest.md`. Любое расхождение «литералы-only» vs «декларация-или-литералы» — баг документации.

- [ ] **Step 3: Отчёт о реализации**

Создать `docs/superpowers/specs/2026-06-06-hi_flow-frontend-slice-governance-amendment-design-report.md` по формату из global CLAUDE.md (What was done / Deviations / Issues discovered / Open items). Зафиксировать, что Часть 2 и arch-spec авто-эмиссия остаются в `active-issues.md`.

- [ ] **Step 4: Commit отчёта**

```bash
git add docs/superpowers/specs/2026-06-06-hi_flow-frontend-slice-governance-amendment-design-report.md
git commit -m "docs: frontend-slice-governance Part 1 implementation report"
```

---

## Релиз (после мёржа, отдельно)

Не часть impl-плана, но не потерять: bump версии плагина (D16 — синхронно `plugin.json` + `marketplace.json`) + `git fetch && git merge --ff-only` в marketplace-кэше, иначе изменение не доедет до пользователя. Решение о версии и коммите/мёрже — за оператором.
