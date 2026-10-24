# HiFlow architecture retirement implementation plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` for independent documentation batches and `superpowers:verification-before-completion`. HiFlow P2 replaces code TDD with structural validation, scenario simulation and isolated review. Do not change application code or install dependencies.

**Goal:** Завершить переход от operator-personal `architecture` к действующим источникам HiFlow без потери принятых обязательств.

**Spec:** `docs/superpowers/specs/2026-07-07-hi_flow-project-state-architecture-notes.md`; запрос оператора 2026-10-24 — сохранить историю и мигрировать существующие проекты, если переход не требует перепроектирования.

**Architecture:** Существующие Behavior Registry, архитектурные правила и компактный ARCHITECTURE.md сохраняют свои обязанности. Общий справочник уточняет чтение, обновление и миграцию снимка; новые реестры, скиллы, runtime, CI и обязательные манифесты не создаются. Незавершённое покрытие поведения обозначается явно; неподдерживаемый стек не получает фиктивного машинного контракта.

## Ограничения

- Сначала читать фактическую реализацию и действующие договорённости. Код показывает наблюдаемое состояние, но сам по себе не отменяет принятое требование.
- Исторические документы сохраняются. Каждая действующая норма получает текущий источник; архив служит происхождением, а не изменяемым нормативным документом.
- Подписанные спеки остаются источником принятых, ещё не перенесённых контрактов. Частичный Behavior Registry не отменяет их и не означает полной миграции поведения.
- Существующий рабочий проектный формат архитектурных правил сохраняется с явным путём и командой. Не подменять его `.audit-rules.yaml`, если потребитель читает другой файл.
- Список Active Issues остаётся единственным: допустим существующий внешний файл с указателем из ARCHITECTURE.md.
- Старые рабочие копии с незакоммиченными изменениями не переключать и не перезаписывать. Работать с чистой актуальной базой; локальные принятые дополнения сверять отдельно.
- Публикация и отключение legacy — после проверки конкретных изменений. Подготовка документов разных репозиториев может идти параллельно; не начинать зависимую реализацию приложения.

## Review focus

1. Частичный реестр не должен молча обесценивать ещё не перенесённые принятые требования.
2. Наблюдаемый код и отчёт аудита не должны изменять целевой контракт.
3. Принятые исключения и их условия пересмотра не должны исчезать при архивировании.
4. Закрытие реализации должно обновлять текущий снимок, не объявляя подписанную будущую архитектуру уже реализованной.
5. Нестандартные пути правил и внешний список проблем должны сохранять одного владельца, без параллельного источника истины.

## Task 1: Close the HiFlow snapshot lifecycle

**Files:** `hi_flow/references/architecture-snapshot.md` (new), `workflow-routing.md`, `target-architecture-contract.md`, `behavior-registry.md`, affected skill references and Completion Protocol templates, `hi_flow/README.md`.

- [x] Record the baseline gaps in reading/maintenance routing and completion obligations.
- [x] Define compact snapshot reading, current-source authority, phase-boundary maintenance, explicit refresh and lossless legacy migration in one shared reference.
- [x] Link consumers to this reference; do not duplicate its algorithm in every skill.
- [x] Keep runtime limitations and project-specific rule ownership explicit.
- [x] Validate frontmatter, local links, absence of contradictory routes and scenario behavior; obtain isolated review.

## Task 2: Migrate HiFlow's own documentation

**Files:** `ARCHITECTURE.md`, archived prior snapshot, `PROJECT_STATE.md`, current issue pointers, this plan and completion report.

- [x] Preserve the prior architecture document verbatim as historical evidence.
- [x] Retain project-specific principles and still-applicable obligations; distinguish package state from old skill-design history.
- [x] Update operational state from the actual release/branch; remove stale merge blockers and nonexistent registry pointers.
- [x] Record verification and any incomplete migration explicitly.

## Task 3: Prepare bounded consumer documentation migrations

**Scope:** Existing projects selected by the operator. Project-specific assessments and dirty-source evidence stay outside the public HiFlow distribution.

- [x] Fetch and identify each actual development base; do not mutate its dirty checkout.
- [x] Preserve committed architecture and relevant local additions with their provenance.
- [x] Produce compact topology/ownership/principles/exceptions and a current-source map using existing artifacts.
- [x] Update startup instructions and live references. Do not rewrite signed historical specs or change behavior tests/runtime/rules.
- [x] Write a migration report recording preserved obligations, verification, remaining coverage and exact base.
- [x] Review each project's diff against both the committed and locally accepted sources.

## Task 4: Retire the operator-personal route

**Scope:** The operator's global instructions and skill discovery settings, separately from the distributed plugin.

- [x] Prepare the global routing change and reversible skill deactivation; keep the old skill files as history.
- [x] Verify all selected project entry points resolve to current sources before activation.
- [x] Distinguish prepared branch changes, merged/released plugin, installed plugin and newly loaded chat context. Do not claim a deployment from a source edit.
- [ ] Activate only when the replacement is available to consumers; record any host that remains unchanged.

## Completion protocol

- [x] Isolated review of source authority, migration preservation and startup routing passes.
- [x] Required structural/scenario checks pass; application test suites are not claimed to have run for documentation-only changes.
- [x] Version metadata is synchronized if the plugin package changes.
- [x] Write `docs/superpowers/plans/2026-10-24-hi-flow-architecture-retirement-report.md` with completed/partial/blocked status, artifacts, checks and remaining activation work.
- [x] Update PROJECT_STATE.md with the actual state and next action.

## Execution notes

- 2026-10-24: HiFlow remote refreshed; base `656069aeeaf8e37b570c19bf444153efe18f55cf` (0.15.9), clean branch `codex/architecture-retirement`. The previous `codex/intake-skill` branch is retained.
- Read-only consumer assessments found existing behavior rails in the two larger projects. Targeted comparison resolved the apparent local decision conflicts without changing product decisions. Existing dirty checkouts remain untouched.
