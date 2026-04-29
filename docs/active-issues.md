# Active Issues

Баги и архитектурные долги, в плане на исправление.
Закрытие — удалением записи (история в `git log -- docs/active-issues.md`).

---

## CRITICAL

(none)

---

## HIGH

(none)

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

---

## LOW

(none)
