# Implementation Report: hi_flow:product-spec v0.6.2 — Feature-spec Compatibility Patch (Group F minimal start)

**Type:** Combined design rationale + implementation report (no separate design spec для small focused patch).
**Date:** 2026-05-27
**Status:** completed
**Predecessor:** v0.6.1 terminology cleanup design spec (`docs/superpowers/specs/2026-05-27-hi_flow-product-spec-v0.6.1-terminology-cleanup-design.md`) — patch fixes implementation bug в v0.6.1 bundle-template usage hint.

---

## Context

**Discovered mid-session 2026-05-27** после release v0.6.1: implementation bug в bundle-template.md usage hint. Я (Claude) написал self-contradicting guidance:

- **Earlier в той же session conversation** (правильно): «feature-spec на cluster работает как aggregate — spec на одну feature с 5 capability sub-elements (что есть legitimate large feature). 8 probe categories масштабируются на cluster-level scope».
- **Потом в v0.6.1 design spec и implementation** (неправильно): «при запуске feature-spec session: указать одну функцию из списка как target в operator-dump. Для всей фичи целиком — N feature-spec sessions per N capabilities». Implemented в bundle-template usage hint header.

Operator caught contradiction перед feature-spec прогоном (не было factual damage — фактически feature-spec session not yet started). Operator phrasing: «Я был уверен, что в фича-спек добавили функциональность, которая объясняет, как работать с бандлом в целом. Просто иначе я откровенно не понимаю, как работать с отдельной функцией, например, внутри Enabler'а. Любого Enabler'а.»

**Root cause анализ:**

Operator's point semantically correct: для enabler фичи (типа `accounts` = 6 capabilities — auth, user mgmt, password reset, RBAC, org structure, assignments), spec'ать одну capability изолированно — бессмысленно. Capabilities внутри фичи tightly coupled, atomic spec теряет context. Aggregate feature spec — natural unit.

Why v0.6.1 implementation introduced wrong guidance:
- v0.6.1 design spec'е я написал narrow workaround «just in case», думая что это safer fallback.
- На самом деле workaround **противоречил** operator's mental model (фича = aggregate, feature-spec session = whole feature spec) и semantically wrong для аggregate features.
- Self-contradiction caught operator'ом перед implementation в feature-spec session.

## Design rationale (inline, без separate spec)

**Correct workflow** для bundle → feature-spec:

- Bundle описывает **фичу целиком** (aggregate of N capabilities).
- Operator attaches bundle файл как input к feature-spec session.
- Feature-spec работает с фичей как единый scope — 8 probe categories масштабируются.
- Output — один `feature-spec.md` на всю фичу с hierarchical развилками (F1 / F1.3 / F1.3.2 Cockburn-style) per capability area.
- **Одна фича = одна feature-spec session = один feature-spec.md output.**

**Когда extraction отдельной capability в свою фичу oправдан:** если конкретная capability ultra-complex (требует specialized analysis, например, payment processing с тяжёлыми edge cases) → semantically это уже не «capability внутри aggregate», а самостоятельная фича. Operator extract'ит её через update mode product-spec'а (split фичи). Не narrow capability-spec session в составе большой фичи.

**Feature-spec SKILL.md structurally support'ит aggregate scope** — 8 probe categories масштабируются on feature-level:

- **Input space** — across all capability entry points
- **Boundary HAZOP** — per capability surface
- **Lifecycle** — per state transitions внутри фичи
- **Cross-feature integration** — через upstream/downstream contracts (bundle file)
- **Hard policies / CC** — inheritance из bundle verbatim
- **Disambiguation** — между similar capabilities внутри фичи
- **Invalid combinations** — across capabilities
- **User reactions** — per output

Direct path criterion clarification: «isolated feature; ≤3-4 forks; low-stakes» — applicable когда фича = single capability с minimal forks. Aggregate фичи (≥3 capabilities) — default brainstorm path.

## What was done

### `hi_flow/skills/product-spec/references/bundle-template.md`

- Заменён usage hint header с **неверного per-function workflow** на **правильный aggregate workflow**.
- New hint содержит: explicit aggregate scope explanation + 8 probes масштабирование на feature-level (с per-probe explanation что каждая делает в aggregate context) + output format description (один feature-spec.md, hierarchical развилки per capability area, sample dialogs covering ключевые user paths) + guideline «одна фича = одна session = один output» + when extraction в separate фичу oправдан.

### 13 REH-ERP existing bundles cleanup

Generated в v0.6.0 до hint header был добавлен в template — изначально не содержали hint. v0.6.1 не trogal existing bundles. V0.6.2 добавил corrected hint header в каждый:

- Files: `bundle-accounts.md`, `bundle-audit.md`, `bundle-comm.md`, `bundle-contracts.md`, `bundle-crm.md`, `bundle-notif.md`, `bundle-objects.md`, `bundle-pipeline.md`, `bundle-portal.md`, `bundle-soft-builder.md`, `bundle-soft-flow.md`, `bundle-tasks.md`, `bundle-tickets.md`.
- Insertion method: perl multiline regex match `(\*\*Исходная спека:\*\* [^\n]+\n\n---\n\n)` → `$1<hint content>\n\n` (вставка hint между metadata-block divider и first content section).
- Plus cleanup extra blank lines в 3 bundles (accounts, soft-builder, soft-flow) с «Происхождение фичи» content following the hint.

### `hi_flow/skills/feature-spec/SKILL.md`

- Добавлена новая section «**Feature scope clarification (post product-spec v0.6.1 / D19 terminology alignment)**» — после Output section, перед Anti-triggers.
- Content: explicit aggregate scope explanation aligned с D19 terminology («feature» в feature-spec = фича в product-spec terminology, не atomic capability) + 8 probe categories масштабирование на feature-level (per-probe applicability) + bundle input pattern (operator attaches `bundle-<feature-slug>.md` from product-spec decomposition output) + extraction guidance для ultra-complex capabilities (signal к update mode split в product-spec, не narrow capability-spec session) + Direct path criterion clarification (single-capability applicable; aggregate default brainstorm path).

### `ARCHITECTURE.md`

- Module Map `hi_flow/skills/product-spec/` — status BUILT v0.6.1 → BUILT v0.6.2 + purpose paragraph extended с v0.6.2 note про bundle hint correction.
- Module Map `hi_flow/skills/feature-spec/` — status note про v0.6.2 clarification added + purpose paragraph extended с aggregate scope note.
- History entry для 2026-05-27 v0.6.2 added.
- No new D-N entry (patch fix to existing D19 implementation, не new architectural decision).

### `hi_flow/.claude-plugin/plugin.json`

- Version 0.6.1 → 0.6.2.

### Handoff rename + scope shift

- `docs/handoffs/2026-05-27-product-spec-v0.6.2+-amendments-design-handoff.md` → renamed via `git mv` к `2026-05-27-product-spec-v0.6.3+-amendments-design-handoff.md`.
- Internal references bulk update: `v0.6.2` → `v0.6.3` в всех текстовых mentions (sed pass — 23 replacements).
- Section 1 «Что произошло» extended с v0.6.2 paragraph (post-release fix + Group F minimal start).
- Note on filename updated: «v0.6.1+ → v0.6.2+ → v0.6.3+; v0.6.1 was terminology cleanup, v0.6.2 was feature-spec compatibility patch; defer scope для Group A-E + остаток Group F → v0.6.3+».
- Group F description rewrote — теперь reflects partial v0.6.2 completion + remaining items для v0.6.3+.

### Forward-looking refs update

- `hi_flow/skills/product-spec/SKILL.md`, `ARCHITECTURE.md`, `hi_flow/skills/product-spec/references/roadmap-template.md` — bulk sed `v0.6.2+ → v0.6.3+` (forward-looking «defer scope» mentions for future hard enforcement, status callback, Mermaid in roadmap, re-decomposition).

## Deviations from spec

### None — no separate design spec for this patch

Per CLAUDE.md discipline, small focused patch без separate design spec — combined design+report inline rationalized:
- Scope мал и focused (bundle hint fix + feature-spec note + ARCHITECTURE updates).
- Root cause empirically discovered (self-contradiction в моём v0.6.1 implementation), не product question.
- Operator already confirmed approach в conversation, no second sign-off needed.
- Separate design spec для 3-file fix = overhead без proportional value.

Trade-off: lose some traceability (no design spec file для future cross-reference). Mitigation: report contains «Design rationale» section с full reasoning + Context section с root cause analysis. ARCHITECTURE.md History entry references report.

## Issues discovered

### Self-contradiction в v0.6.1 implementation — meta-process issue

Real bug — I provided conflicting guidance about feature-spec workflow в two different artefacts:
- Conversation message earlier in session: «aggregate scope works»
- v0.6.1 spec narrowing workaround: «per-function workflow»

Caught by operator, fixed in v0.6.2. **Lesson:** when introducing «just in case» workarounds в spec, verify they don't contradict earlier conversation. Subagent self-review для v0.6.1 spec did не catch это — possibly because subagent context isolation prevented cross-checking conversation history.

### Pre-existing housekeeping items remain

Same as v0.6.1 — not v0.6.2 scope:
- `hi_flow-product-spec-feedback.md` (root) — v0.5 feedback file pending decision.
- `docs/superpowers/plans/2026-04-28-arch-audit-barrel-detection.md` — untracked old plan.
- `hi_flow/skills/feature-spec/SKILL.md.backup` — backup junk.
- `hi_flow/skills/feature-spec/references/product-spec-template.md` — pre-existing deleted file (unstaged).

## Open items

### Empirical signal needed для Group F completion

V0.6.2 = Group F minimal start. Full Group F (auto-read bundle, formal aggregate mode flag, capability-spec consideration, cross-skill terminology expansion) — pending real feature-spec session на REH-ERP bundle:

- **Expected test:** operator attach'ит bundle-tickets.md (5 capabilities) или bundle-accounts.md (6 capabilities) к новой feature-spec session, посмотрит как работает workflow.
- **Findings → priority decision** для v0.6.3+ Group F items.
- **Risks к detection:** operator может найти что feature-spec output на aggregate gets unwieldy (large hierarchical tree); или 8 probes не масштабируются gracefully на aggregate (some probes feel forced); или bundle context (8 elements) gets cumbersome для feature-spec при aggregate scope. Любой of these → Group F priorities.

### v0.6.3+ amendments scope

Per renamed handoff `docs/handoffs/2026-05-27-product-spec-v0.6.3+-amendments-design-handoff.md`:
- Group A — Re-decomposition mechanism (update mode amendments).
- Group B — New iteration mode handling.
- Group C — Hard enforcement frozen invariant.
- Group D — Status auto-update via feature-spec callback.
- Group E — Visualization (optional Mermaid в roadmap при large feature counts).
- Group F — remaining items (auto-read bundle, formal aggregate mode, etc).

## Verification

- bundle-template.md hint correct (aggregate workflow) ✓
- 13 REH-ERP bundles contain new hint header (perl verification по `head -25` first bundle confirmed) ✓
- feature-spec SKILL.md «Feature scope clarification» section present ✓
- ARCHITECTURE.md Module Map status BUILT v0.6.2; History 2026-05-27 v0.6.2 entry; D19 не trogan (consistent) ✓
- plugin.json version 0.6.2 ✓
- handoff renamed v0.6.2+ → v0.6.3+, internal references updated ✓
- Forward-looking refs (SKILL.md, ARCHITECTURE.md, roadmap-template.md) updated v0.6.2+ → v0.6.3+ ✓
- Subagent self-review — **skipped** для small focused mechanical patch (combined design+report inline, low risk of structural issues).
