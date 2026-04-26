# as_flow — методология Three-Phase Flow для solo+AI разработки

Семейство Claude Code skill'ов, реализующих структурированную методологию разработки product → architecture → implementation для solo founder с AI-агентом.

## Skills в семействе

### as_flow:feature-spec — продуктовая спека одной фичи [READY]

Активация: «продуктовая спека [для X]», «спека на фичу X», «давай продумаем фичу X», и др. (полный список см. в SKILL.md).

Запуск: оператор пишет trigger phrase. Skill генерирует self-assessment proposal, далее по утверждённому пути.

Output: `<project>/docs/specs/YYYY-MM-DD-<feature-slug>-product-spec.md`.

### Other skills [PARKED]

- `as_flow:product-spec` — декомпозиция крупного продукта (Phase 1, product-level).
- `as_flow:arch-spec` — архитектурная спека фичи (Phase 2).
- `as_flow:impl-plan` — план реализации (Phase 3).
- `as_flow:fitness` — architectural fitness functions.
- `as_flow:sanity-check`, `as_flow:handoff`.

## Install

[Документировать после первого распространения]

## Background

- Design spec: `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design.md`
- Reference example: `as_flow/skills/feature-spec/references/example-goal-setting.md`
- Implementation report: `docs/superpowers/specs/2026-04-26-as_flow-feature-spec-design-report.md`
