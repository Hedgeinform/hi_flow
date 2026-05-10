# Implementation Report: hi_flow:product-spec design

**Spec:** docs/superpowers/specs/2026-05-10-hi_flow-product-spec-design.md
**Plan:** docs/superpowers/plans/2026-05-10-hi_flow-product-spec.md
**Date:** 2026-05-10 (дизайн + имплементация)
**Status:** completed

## What was done

- Implemented `hi_flow/skills/product-spec/SKILL.md` (~600 строк) per design spec D1-D9 + D11-D18.
- Created three reference files:
  - `references/product-spec-template.md` (skeleton 12 секций per D12)
  - `references/product-backlog-template.md` (skeleton per D17)
  - `references/example-contact-tracker-mvp.md` (worked example: spec + backlog для small CRM)
- Updated `.claude-plugin/marketplace.json` description — product-spec вынесен из «parked for future» в active skills.
- Updated `ARCHITECTURE.md` Module Map: product-spec PLANNED → BUILT v0.1.0.
- Spec compliance review (subagent) — нашёл D1/D3/D4/D16 concept gaps + plain language clusters; зафиксировано (коммит faf0e52, добавлен Concepts section + ~30 кластеров переведено в русский).
- Behavioral validation (subagent simulation) — нашёл несколько критичных workflow gaps:
  - Slug + project root + module assignment derivation процедуры отсутствовали → добавлен sub-step «Метаданные сессии» + 4-step Module assignment procedure.
  - Empty-backlog branches (first iteration) не задокументированы → добавлены skip notes в 3 местах.
  - Premortem ↔ Шаг 12 sequence contradiction → переставлено: Premortem перед Шагом 12 с delta loop.
  - Hybrid project type (demo + commercial) не покрыт → добавлен в Шаг 1.2.
  - Mode self-assessment ↔ Session setup ask противоречие → разрешено clarification'ом.
  - Probe-table selectivity, 3-7+ floor softening, non-user actors, recovery loop после integrity check — добавлены.
  Всё зафиксировано (коммит 48973d1).
- Новый project-specific принцип P6 (operator escalation discipline) — добавлен в ARCHITECTURE.md в этой же сессии (до имплементации скилла, как trigger от обсуждения по mode design'а).

## Deviations from spec

- В backlog template: исходный D17 skeleton содержал «example entries» (F-comm-X etc.). Имплементация заменила их на empty-state placeholders с условиями появления — это template для нового бэклога, не пример заполненного. Семантика format'а сохранена (HTML comments документируют форматы).
- Worked example (Task 8) имеет outer ` ```` ` (4-backticks) wrapper для двух частей (spec + backlog) — это позволяет вкладывать Mermaid 3-tick fences без поломки рендера.
- D13 «brainstorm-only» — в SKILL.md уточнено, что Session setup нормально задаёт операционные вопросы (project root, slugs, active spec identification), это не self-assessment.

## Issues discovered during implementation

- В spec есть скрытое противоречие: «Шаг 12 после Шагов 4-11» + «Премортем в конце сессии» + «Условие завершения требует и того, и другого». Resolved во время behavioral validation: премортем перед Шагом 12 с возможным delta loop.
- В spec не задокументирован module assignment workflow — feature ID требует module-slug, но процедура назначения модулей функциям отсутствовала. Resolved добавлением 4-step Module assignment procedure после Шага 4.
- Hybrid project types не покрыты дискретной типологией Шага 1.2 — реальный кейс (демо для будущих заказчиков под конкретного первого клиента) не вписывается ни в один из 5 типов чисто. Resolved «доминирующий тип + parenthesis annotation» подходом.
- Probe-table селективность не явная: spec говорит «пройди список вопросов», но без указания «фильтруй по релевантности». Resolved явным selectivity note.

Эти issues добавляются в design doc как [новые OQ или закрытие старых через implementation feedback — TBD if next session does design doc update].

## Open items

- OQ11 (boundary с arch-spec) — отложено до arch-spec design.
- OQ12 (feature-spec наследование product-context) — отложено до review feature-spec после первого боевого прогона.
- OQ13 (Mermaid readability на больших продуктах) — отложено до боевого прогона на нетривиальном продукте.
- OQ14 (Mermaid helper script alternative) — parked, пересмотр при reliability issues.
- OQ15 (file location convention для семейства) — отдельная микро-сессия.
- **OQ16 (новый):** боевой прогон скилла на ERP-проекте оператора (per OQ1 в ARCHITECTURE.md). После прогона — feedback в скилл (если выявятся gaps) либо переход к design `arch-spec`. Это primary next step.

## Next step

Боевой прогон `hi_flow:product-spec` на ERP-проекте оператора. Это и closure OQ1 из ARCHITECTURE.md, и первая реальная валидация всего плагина end-to-end (от product-spec → feature-spec → impl). После прогона — design arch-spec.
