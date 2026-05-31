# hi_flow:arch-spec — Implementation Plan (lightweight, P5)

**Date:** 2026-05-31
**Spec:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-design.md`
**Status:** in progress
**Природа:** markdown skill (LLM instructions), не код. По P2 — TDD неприменим, заменяется structural + behavioral validation. Это **лёгкий** план (батчи + selective review), не полноценный TDD-план.

---

## Validation strategy (вместо TDD, по P2/P5)

- **Structural validation** — все секции SKILL.md на месте, frontmatter валиден, references существуют и непусты, output path конвенция соблюдена.
- **Spec compliance review** — субагент сверяет готовый SKILL.md против design-спеки (все решения перенесены, нет искажений). После завершения батчей SKILL.md.
- **Behavioral validation** — субагент проигрывает инструкции arch-spec на реальной фиче (REH ERP audit feature-spec), surface ambiguities в инструкциях. После complete skill.

Quality gate сохраняется (P5), dispatch count снижен батчингом.

---

## Зависимости (named, принцип 10)

| Зависимость | Статус | Влияние на этот план |
|---|---|---|
| **Shared graph-core** (формулы метрик + новый graph-traversal циклов) — TS-код в arch-audit | НЕ начата (отдельная upstream-задача) | Блокер **боевой работы блока C**, НЕ написания SKILL.md. SKILL.md описывает, как использовать graph-core (ссылается на него как на инструмент). Реализация graph-core — отдельный трек (код + тесты по образцу arch-audit), вне этого плана |
| **backlog-integration** (общесемейный механизм) — в main-ветке | design в main, impl pending | Closure backlog-sync секция SKILL.md ссылается на него. При написании — сверить с актуальным состоянием в main |
| **Коллизия D20** | open | Развести при финальной фиксации ARCHITECTURE.md |

**Граница плана:** этот план покрывает **markdown-артефакт** (SKILL.md + references). graph-core (код) — отдельная задача.

---

## Batches

### SKILL.md (5 батчей, по образцу arch-audit/arch-redesign structure)

**Batch 1 — каркас + вход.** Frontmatter (name, description с RU+EN триггерами), Overview, When to use, Anti-triggers, Pre-conditions (три ситуации green/brown+freshness через audit_sha + schema check для блока C). Source: design §1, §2, §15.

**Batch 2 — flow + probing.** Self-assessment (skip/direct/brainstorm, факторы арх-уровня), нелинейный flow (заворот на feature-spec/redesign), probing taxonomy (floor 4 + ceiling 6 с триггерами + сквозные 4 + закрывающий). Принцип «сначала извлечь из feature-spec, копать дыры». Source: design §3, §4, §13.

**Batch 3 — блок C + границы.** Блок C algorithm (4 шага, модульный уровень, операц. определение модуля, гибрид код/LLM с вход/выход LLM-проверок, ссылка на shared graph-core). Границы работоспособности (двухуровневая инвентаризация). Source: design §5, §6.

**Batch 4 — output + fitness + closure.** Output document (10 секций, блоки A-E маппинг, чистота = решения как факты + 1 строка rationale, sample dialog опционален). Fitness-инварианты (первичный потребитель — реализация; классификация по механизму; rules-patch формат D11). Эскалация (механика сессии). Связь с living-architecture (вариант 2 decoupling). Closure backlog-sync (сверить с main). Source: design §7-§12.

**Batch 5 — operational + self-review + anti-patterns.** Operational rules, Self-review checklist (изолированный субагент), Anti-patterns, References. Source: design §14, §15.

→ **Spec compliance review** (субагент) после Batch 5: SKILL.md vs design, без искажений.

### References (2 батча)

**Batch 6 — arch-spec-template.md.** Шаблон выходного arch-spec.md: 10 секций с placeholder'ами + примеры внутри fenced-блоков (чтобы не ловились scan'ом). Mermaid ego-граф skeleton.

**Batch 7 — self-review-checklist.md + rules-patch-template.** Чеклист для изолированного субагента (из design §14). rules-patch-template — переиспользовать у arch-redesign (D11 общий формат), не изобретать. Пример выходной спеки — **отложен до боевого прогона** (не synthetic).

→ **Spec compliance review** после references.

### Behavioral validation

**Batch 8 — simulation.** Субагент получает SKILL.md arch-spec + REH ERP audit feature-spec, проигрывает сценарий (greenfield, т.к. audit — первая фича): извлекает арх-решения из feature-spec, проходит probing, формирует выходную структуру. Цель — surface ambiguities в инструкциях, не финальный артефакт. Findings → правки SKILL.md.

---

## Post-implementation

- **Implementation report** рядом со спекой (`...-design-report.md`) — CLAUDE.md стандарт.
- **Финальная фиксация ARCHITECTURE.md** (через скилл architecture, «было→стало»): D-запись arch-spec design; Module Map → arch-spec design ready; OQ4 (Mermaid — закрыт ego-графом) / OQ5 (связь architecture — закрыта decoupling вариант 2); коллизия D20; History.
- **Version bump** — `.claude-plugin/plugin.json` (D16 release flow) — при готовности к релизу.

---

## Out of scope (этот план)

- **Shared graph-core** (код) — отдельная upstream-задача в arch-audit.
- **Пример выходной спеки** в references — после боевого прогона (не synthetic).
- **graph-core реализация блока C в бою** — markdown описывает, код приходит отдельно.
- Version bump механика.
