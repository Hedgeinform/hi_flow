# Implementation Report: распространение backbone-конвенции модульного монолита

**Spec:** `docs/superpowers/specs/2026-06-08-hi_flow-backbone-propagation-design.md`
**Date:** 2026-06-08
**Status:** completed (реализация + RED→GREEN→REFACTOR пройдены; остаётся release-шаг D16 + фиксация в ARCHITECTURE.md — оба operator-gated)

## What was done

**Артефакты (4):**

1. **Создан** `hi_flow/references/feature-backbone-convention.md` (owner — bootstrap, read-only для arch-spec). Содержит: двухосевую рамку, scope/honesty (модульный монолит = covered-стиль, intra-codebase, не cross-service; другие стили unmanaged через P7), канонический seed-блок принципа (verbatim, layout-agnostic), машинную форму narrow-entry, consumer-контракт (bootstrap/arch-spec), связь со scaffold-конвенцией, легальные вариации.
2. **Правлен** `hi_flow/skills/bootstrap/SKILL.md`: Create flow явно создаёт/владеет секцией `## Project-specific принципы` (+ флажок pre-existing template-зависимости OQ6/Ф3a, принцип 5); подсекция «Feature-backbone seeding» (backend-service/fullstack only, informing confirmation, layout-agnostic stance, P-номер, store=структурный слот, copy-on-seed, не для frontend/CLI/library); Scope п.1; References (+2); Anti-patterns (+2).
3. **Правлен** `hi_flow/skills/arch-spec/SKILL.md`: D-i (floor-1 «Module breakdown» дополнение + Operational rule 11 + pre-conditions row); D-ii (Fitness invariants → «Narrow public entry» абзац + связка с Shared-capability lookahead D26 + allowlist≡§5); anti-pattern «declared-not-shape»; self-review checklist item; References (+1).
4. **Правлен** `hi_flow/skills/arch-spec/references/rules-patch-template.yaml`: канонический закомментированный пример `<feature>-narrow-public-entry` (форма `to.pathNot`-allowlist) + комментарий о согласованности allowlist≡§5 и резолве read-model.

**Валидация (writing-skills RED→GREEN→REFACTOR, изолированные субагенты, judged by артефактам):**

- **RED (до правок):** greenfield backend-service `taskhub`/`labels`, скиллы AS-IS → **BACKBONE ARTIFACTS ABSENT** (bootstrap не сеет принцип — секция пустой placeholder; arch-spec не потребляет стандарт, не эмитит narrow-entry; ни одной citable-инструкции). Пробел подтверждён вербатим. Заодно валидирован блокер из self-review (bootstrap не владеет секцией принципов активно).
- **GREEN (после правок):** тот же greenfield, seed принят → **BACKBONE ARTIFACTS PRESENT (skill-driven)** — bootstrap засеял P1; arch-spec задекларировал поверхность `{labels-shared, labels-read-model, labels-api}` + эмитил `labels-narrow-public-entry`, всё с цитатами инструкций.
- **Graceful (требование 2):** brownfield без декларации стандарта → **INERT — graceful OK** (нет narrow-entry, нет форсинга поверхности, нормальная деривация; block C и прочие блоки не задеты).
- **REFACTOR:** закрыты 5 лазеек из GREEN/graceful (см. ниже). Ре-тест на фиче без projection (`audit-trail`) → **LOOPHOLES CLOSED** (C1–C5 PASS).

## Deviations from spec

- **REFACTOR добавил 5 hardening-правок сверх §4-списка спеки** (это штатная REFACTOR-фаза writing-skills — закрытие лазеек, найденных тестами, не отход от замысла):
  1. allowlist в rules-patch ОБЯЗАН равняться §5-декларации поверхности (инструкция + self-review item) — была сильнейшая лазейка (могли разъехаться).
  2. allowlist использует РЕАЛЬНЫЕ имена модулей; `read-model` placeholder резолвится/удаляется (фича без projection → нет токена).
  3. `store = SSoT` уточнён: структурный слот ≠ лицензия проектировать персистентность на незафиксированной DB-оси (infra-axis сигнал SKILL.md:61 остаётся).
  4. направление/ацикличность — на существующих whole-graph проверках arch-audit, не bespoke per-feature шаблоны (убрана over-promise в convention-тексте).
  5. anti-pattern «эмитить backbone из формы фичи (выглядит как slice) / из D9-библиотеки, а не из ДЕКЛАРАЦИИ».
- **§4.5 version bump НЕ выполнен** — release (commit/push/fetch-ff) operator-gated (CLAUDE.md: коммит только по команде). Остаётся как release-шаг.

## Issues discovered

- **bootstrap не self-contained по ARCHITECTURE.md-шаблону** — Create flow декларирует «self-contained port», но шаблон тянет из operator-personal `architecture`. Pre-existing (OQ6 / D20-Ф3a relocation), НЕ решён здесь (был бы scope creep); флажок добавлен в bootstrap SKILL.md (принцип 5), правка делает Create flow явно строящим секцию принципов. Двигает к self-containedness для одной нужной секции.
- **Язык seed-блока на greenfield не определён** (minor) — convention говорит «rendered in the project's document language; Russian original», но greenfield doc-язык не зафиксирован. Дефолт — язык оператора (русский). Ниже YAGNI-порога, не правил.

## Open items

- **Release (D16):** синхронный bump `hi_flow/.claude-plugin/plugin.json` + запись `hi_flow` в корневом `.claude-plugin/marketplace.json` (0.8.5 → minor) → commit → push → **manual fetch+ff** `~/.claude/plugins/marketplaces/hi_flow-marketplace/`. Без последнего Reh_Erp и будущие проекты обновления не увидят. **Operator-gated.**
- **Фиксация в ARCHITECTURE.md:** новый D (backbone propagation: bootstrap сеет → arch-spec потребляет+эмитит) + Module Map (новый reference, ссылки в bootstrap/arch-spec) + Topic Index (концепты `feature-backbone` / `narrow-public-entry` / `public surface`). Через скилл `architecture`, operator-gated (D-entry = Active Decision, требует confirmation).
- **README/дистрибуция-честность** про ориентацию на модульный монолит — deferred к market-ready треку (OQ9/OQ11).
- **Боевой прогон** — первый реальный greenfield-проект через цепочку (валидация сверх симуляции), аналог OQ-style live-run.
