# Implementation Report: Fullstack-aware arch-spec

**Spec:** `docs/superpowers/specs/2026-06-06-hi_flow-fullstack-audit-design.md` (rev.4)
**Plan:** `docs/superpowers/plans/2026-06-06-hi_flow-fullstack-aware-arch-spec.md`
**Date:** 2026-06-06
**Status:** completed (на ветке `feat/fullstack-aware-arch-spec`, не вмёржена — ждёт операторского решения)

## What was done

Чистые правки инструкций скиллов (markdown, без кода — P2). 9 коммитов на ветке:

- **arch-spec/SKILL.md** — fullstack под-флоу: детект ≥2 деревьев («Поверхности (UX)» + бэк-модули блока B); per-package audit-ensure (вызов `cli-run-audit.ts <package-root>` с проверкой preconditions + per-tree loud fallback); «three situations» как per-tree вектор; блок C по снапшоту (дизъюнктные графы → два прохода, голые имена); per-tree output + per-tree rules-patch. Имена модулей голые, дерево — routing-метка.
- **arch-spec-template.md** — per-tree слоты: §1 (N снапшотов + per-tree Mode), §4, §5.1 (метка дерева), §6 (per-tree под-секции + per-tree brown-гейт), §8 (inline-метка дерева, 4 колонки), §9 (два ego-subgraph'а). Однодеревный output байт-в-байт прежний (все правки — comments / conditional-варианты).
- **rules-patch-template.yaml** — один патч на задетое дерево, голые `^src/<module>/`, на `.audit-rules.yaml` каждого пакета, per-patch `Source audit`.
- **bootstrap/SKILL.md** — soft guidance «раздельные пакеты, не смешанный src» + запись конвенции в ARCHITECTURE.md проекта (только guidance, без скаффолдинга).

**Валидация (P2 — поведенческая, не код):** три независимых субагента — (1) симуляция фуллстек-фичи (оба дерева brown), (2) green/brown кросс-продукт, (3) spec-compliance.
- **Spec-compliance: COMPLIANT** — имплементация точно соответствует спеке rev.4 (голые имена, нет 5-й колонки, код не тронут, single-tree байт-в-байт).
- Поведенческие симуляции нашли дефекты инструкций (см. Issues discovered) — все закрыты коммитом `dfe5bda`.

## Deviations from spec

Материальных отклонений нет — spec-compliance подтвердил соответствие rev.4 verbatim. Правки коммита `dfe5bda` — это **уточнения** дизайна, обнаруженные поведенческой валидацией (см. ниже), а не отступления от спеки. Спеку rev.4 заново не правил (подписанный design-контракт); рефлексия дизайна — здесь, в отчёте (петля проектирование↔реализация).

## Issues discovered

Поведенческая валидация (которую spec-compliance не ловит — она проверяет соответствие спеке, а дыры были в самой спеке) вскрыла и закрыла:

1. **[HIGH] green-field дерево.** Шаг audit-ensure не имел green-field-guard → scaffold'ный green-field фронт проходил precondition и аудировался впустую (пустой снапшот), а §245 валил green-field в loud-signal-ветку, противореча §6 «not applicable». **Фикс:** green-field дерево не аудитится (блок C неприменим, тихо); громкий сигнал — только для brown-дерева без свежего снапшота.
2. **[MEDIUM] frontend granularity trap.** Surface фичи (`AuditTable`) часто лежит *ниже* `per_module` (внутри `components/`) → overlay не добавляет узла → вырожденный web-блок C. **Фикс:** инструкция велит записать «no module-level delta on `<tree>`» явно и НЕ выдумывать суб-`per_module` узел.
3. **[MEDIUM] precondition неточен.** `detect()` требует package.json+tsconfig (detect-miss, не hard-fail); `src/` hard-fail'ит в `identifyModules`. **Фикс:** переформулировано точно.
4. **[LOW] §1 header формат** SKILL↔template расходился; **детект** провизорен до блока B; **self-assessment** фразинг — все закрыты.

## Open items

- **Боевого прогона нет.** Fullstack под-флоу ещё не гонялся на реальной фиче (Reh_Erp). Первый боевой прогон подтвердит end-to-end (в частности green-field-путь и granularity-caveat на практике) — это снимает живую боль, с которой началась задача.
- **«Аудит монорепо одной командой»** (оркестрация-надстройка в arch-audit, требует расщепления `buildReportData` compute/persist) — отложено, кандидат в OQ/бэклог.
- **Mixed-`src/` subtree-эпик** + **shared-пакет триггер** (`packages/shared`) — OQ (D28).
- **Ветка не вмёржена** — ждёт операторского решения.
