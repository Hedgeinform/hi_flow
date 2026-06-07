# Implementation Report: frontend-slice-governance amendment (Часть 1)

**Spec:** `docs/superpowers/specs/2026-06-06-hi_flow-frontend-slice-governance-amendment-design.md`
**Plan:** `docs/superpowers/plans/2026-06-06-hi_flow-frontend-slice-governance.md`
**Date:** 2026-06-07
**Status:** completed

## What was done

Декларативная активация frontend-профиля в arch-audit (Часть 1 брифа), аддитивно к литеральной эвристике.

- **Код (commit `21f100f`):** поле `profile?: 'frontend' | 'backend'` в `ProjectRulesOverrides` (`core/types.ts`); гейт `isFrontendProfile` в `adapters/typescript-depcruise.ts` переписан на `profile==='frontend' || (profile!=='backend' && литеральная_эвристика)`. Маппинг слоёв (`layer_aliases`) и rule-блоки не тронуты.
- **Тесты (commit `21f100f` + `e343b88`):** 4 теста адаптера (активация по декларации / не-активация без неё / escape hatch `backend` / регресс горизонтали) + 1 guard-тест pass-through лоадера.
- **Doc-sync комментария (commit `04358dd`):** комментарий над гейтом приведён в соответствие с декларативной активацией (принцип 9; находка code-review).
- **Документация (commits `8997cd0`, `fcb9e7c`, `90d08e3`):** `references/baseline-rules.md` §frontend-layered-respect (активация = декларация-или-литералы + escape hatch), `SKILL.md` (абзац про `overrides.profile`), `bootstrap/references/coverage-manifest.md` (честность статуса: `covered` для горизонтальных + объявленных feature-sliced, иначе только универсалии).

**Валидация:**
- `npm run typecheck` — чисто.
- Тесты: **138 passed / 143** (включая 4 адаптера + 1 лоадер). 5 падений — все в integration-тестах (`depcruise output is not valid JSON`), причина — `dependency-cruiser` не установлен (pre-existing LOW active-issue), не связано с амендментом.
- Spec-compliance review (код) — ✅. Code-quality review — Approve (без Critical/Important). Spec+consistency review (docs) — ✅, все 4 источника (код + 3 дока) описывают активацию идентично.

## Deviations from spec

- **Добавлен doc-sync комментария** (`04358dd`) сверх перечисленных в плане файлов — по находке code-review (item 2, принцип 9). В рамках scope (тот же файл адаптера).
- **Выполнен `npm install`** в `hi_flow/skills/arch-audit` (с подтверждением оператора) — у скилла вообще не было `node_modules`, без них не прогнать typecheck/тесты. Не deviation логики, а разблокировка верификации.

## Issues discovered

- **arch-audit не был provisioned** (`node_modules` отсутствовал) — давний долг (MEDIUM active-issue «baseline rollout»). Закрыт `npm install` declared-зависимостей.
- **Integration-тесты падают на отсутствии `dependency-cruiser`** — pre-existing LOW active-issue (не в devDeps). Не чинилось здесь (вне scope).
- **Нет runtime-валидации значений `overrides`** — опечатка в `profile` молча уходит в эвристику (нарушение global принципа 5). Залогировано новым LOW active-issue. Касается всех overrides-полей, не только `profile` → holistic-фикс.
- **Стейл-факт в Part-2 active-issue** (zhenka `src/tools/<feature>/`) — исправлен в фазе дизайна (сверено: тулы Женьки — плоские файлы).

## Open items

- **Часть 2** (изоляция пиров / finer module resolution) — MEDIUM active-issue. Живой тест-кейс пиров = reh-erp apps/web, ещё не построен.
- **arch-spec авто-эмиссия `profile` в rules-patch** — MEDIUM active-issue (вариант B), зависит от Части 1 (принцип 10).
- **Валидация overrides** — новый LOW active-issue.
- **Релиз (D16)** — version bump (`plugin.json` + `marketplace.json` синхронно) + `git fetch && git merge --ff-only` в marketplace-кэше. За оператором.
- **Незакоммичено** (за оператором): дизайн-доки (спека/план/этот отчёт), правки `docs/active-issues.md`, бриф в `docs/feedback/`, `package-lock.json` (изменён `npm install`).
