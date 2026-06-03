---
name: feature-spec
description: Use when operator says «продуктовая спека», «спека на фичу X», «продуктовый дизайн фичи X», «анализ нашей фичи X», «давай продумаем фичу X», or English equivalents. Produces feature-spec.md.
---

# `hi_flow:feature-spec` — Feature-Level Product Spec Skill

Help the operator turn a feature request into a signed `feature-spec.md` that (1) gives the operator a focused artifact for deep review, and (2) gives the next phase (`hi_flow:arch-spec`) an unambiguous foundation for architectural design.

Systematically surface hierarchical product forks — concrete behavioral decisions, edge cases, hard policies, criteria distinguishing similar situations — through structured operator dialogue.

## Out of scope

- Product-level decomposition (separate skill `hi_flow:product-spec`).
- Architectural / technical decisions (`hi_flow:arch-spec`, `hi_flow:impl-plan`).
- Visual layout / components / style (UI layer 3) → `hi_flow:arch-spec` (see "UX/UI boundary principle").
- Auto-invoking the next phase — operator initiates.

## Output

A single `feature-spec.md`. Default location: `<project>/docs/specs/YYYY-MM-DD-<feature-slug>-feature-spec.md` (configurable).

## Feature scope clarification (post product-spec v0.6.1 / D19 terminology alignment)

«Feature» в этом скилле = **фича** в product-spec terminology (D19 in `ARCHITECTURE.md` of consuming project, либо canonical pair в product-spec Operational Rule 11) — группа связанных функций (capabilities), представляющая блок функциональности продукта. **НЕ atomic capability** (это отдельный концепт «функция» per D2 atomicity gate).

Скилл structurally поддерживает **aggregate feature scope** — 8 probe categories масштабируются на whole feature:

- **Input space** — across all capability entry points фичи
- **Boundary HAZOP** — per capability surface
- **Lifecycle** — per state transitions внутри фичи
- **Cross-feature integration** — через upstream / downstream contracts (из bundle file если product-spec'у предшествовала decomposition phase)
- **Hard policies / CC** — inheritance из bundle verbatim
- **Disambiguation** — между similar capabilities внутри фичи
- **Invalid combinations** — across capabilities
- **User reactions** — per output

### Two input modes (product-spec is optional)

feature-spec runs in either mode; **both** must support backlog-sync at closure.

- **After product-spec** — the operator attaches a `bundle-<feature-slug>.md` file (product-spec decomposition phase output, v0.6.0+). The bundle describes the whole feature — feature-spec works with it as a single scope. A product-backlog almost certainly already exists (product-spec created it).
- **Standalone** — the operator arrives with a ready feature idea for an **existing** product, without a product-spec and without a bundle. A backlog may exist (accumulated by earlier feature-spec sessions or by hand) or may be absent.

Either way, the output is one `feature-spec.md` for the whole feature with hierarchical forks (F1 / F1.3 / F1.3.2 Cockburn-style per capability area).

**Hard requirement:** closure backlog-sync depends only on the presence / absence of a `*backlog*.md` file, **not** on any product-spec artifact (no `product-spec.md`, no bundle required). See "Backlog sync at closure".

**Когда spec'ать одну capability изолированно бывает оправдано:** если capability ultra-complex (требует ultra-deep specialized analysis — например, payment processing с тяжёлыми edge cases) — это сигнал к extraction её в свою отдельную фичу через update mode product-spec'а (один capability = одна фича в этом частном случае). Не narrow capability-spec session в составе большой фичи — context теряется без surrounding capabilities.

**Direct path criterion clarification:** «isolated feature; ≤3-4 forks; low-stakes» — applicable когда фича = single capability с minimal forks. Aggregate фичи из bundle (≥3 capabilities) — default brainstorm path; aggregate scope требует probing taxonomy для proper coverage.

## Anti-triggers (do NOT auto-activate)

- Bare feature-shape request («хочу добавить X», «давай добавим tool Z») — could be research / chatter / arch request. Clarify or propose the skill, do not run it.
- «собери информацию про X» / «исследуй X» / «анализ конкурента» — research, not feature spec.
- «реализуй X» / «нужна архитектура для X» — territory of sibling skills.

## Mode selection

Once activated, decide which path: **direct** or **brainstorm**.

- **Direct path** — produce the spec from operator input alone, without probing dialogue. Allowed only when **all** hold: operator input is explicit and lists forks; scope is small (≤ 3-4 forks); domain is low-stakes; high similarity to an existing pattern; isolated feature.
- **Brainstorm path** — full dialogue with probing taxonomy. **Default.**

**Default: brainstorm. When in doubt, choose brainstorm.**

### Common Rationalizations

| Thought | Reality |
|---|---|
| "Operator's input looks complete, direct should be enough" | Direct path missing forks → architectural debt. Cost of false negative ≫ cost of false positive. Choose brainstorm. |
| "Scope feels small, why bother probing" | "Feels small" is a feeling, not a check against the 5-condition gate. Run the gate. |

### Proposal format

```
[Self-assessment: hi_flow:feature-spec]

Предлагаю: brainstorm / direct
Причина: <одно-два предложения>
Факторы:
- Input completeness: high / medium / low
- Scope: small / medium / large
- Stakes: low / high
- Similarity: new / template available
- Cross-feature touches: isolated / many

Подтверди / измени.
```

Operator may override or specify a path directly («запусти brainstorm под X», «direct по моему input'у»). Run only after confirmation — every transition gives the operator a moment to consent or override.

## Process flow

After confirmation, follow one of two paths.

### Direct path

Read operator input, structure it into `feature-spec.md` per the format below, show the final draft, operator approves or requests edits. Minimum dialogue.

**On direct path, keep:** Sample dialogs (mandatory — operator still needs concrete user paths) and the base format scaffolding (Контракт входа/выхода, Развилки cell format). **Premortem** is optional — ask the operator whether to run it.

### Brainstorm path

Three sub-phases: operator-dump → agent probing → closure.

### Operator-dump

Open with a single broad question:

> *«Расскажи, что у тебя уже есть про эту фичу — цели, поведение, развилки, ограничения. Дамп всё, что в голове.»*

In parallel, if the project has `ARCHITECTURE.md`, read its Module Map and Active Decisions — needed for the Cross-feature integration probe.

The dump may be empty («хочу X, ничего пока не думал») — proceed to probing without it.

### Agent probing

Walk the **8 probe categories** (Probing Taxonomy below) as a floor checklist. Add adaptive probes by context.

Iterative: question → operator answer → write into a new or existing fork cell → next probe.

**Park-and-continue:** if operator says «не знаю» / «позже» — record under `Открыто` and move on. No deadlocks.

**Cross-cutting probes (always active):**
- *Make implicit criteria explicit* — when a vague phrasing appears.
- *Contradiction detection* — after each new fork answer, cross-check against recorded forks.

**Closing probe (mandatory at end):**
- *Premortem* — *«представь, фича запущена, через 3 месяца идут жалобы. Какие?»*

### Closure

After the coverage-based closure criterion is met, enumerate all open items:

- Forks without `Resolution` — likely blocker for the next phase.
- Non-empty `Открыто` fields — sub-questions, usually not blockers.
- Parked items.

Flag each item: **likely blocker / nice-to-have / уточнить**. (The Open items at closure table uses the same vocabulary — see Output Format.)

Operator decides per item: **resolve now / leave for next phase / out of scope**.

Then write the final `feature-spec.md` to the configured location.

### Self-Review (via subagent with isolated context)

After writing, dispatch a fresh subagent (Agent tool) to review the spec with isolated context. The main agent has spent the entire brainstorm immersed in this content and is subject to confirmation bias — a fresh-context subagent gives a more reliable read.

Pass to the subagent: the spec file path + the checklist below. No conversation history, no prior context.

Checks the subagent runs:

1. **Placeholder scan.** Any `<placeholder>` tags, vague Resolutions, `OPEN` forks without reasoning, missing `Examples` where Resolution would benefit from anchoring? Flag for fix.
2. **Internal consistency.** Do forks contradict each other (e.g., F1.3 says X, F2.4 implies not-X)? Does Контракт выхода cover side effects implied by all Resolutions? Do Sample dialogs match the forks tree (sample dialog cohesion check at the artifact level)?
3. **Scope check.** Is the spec focused on a single feature, or has it slipped into product-level decomposition (multiple features, roadmap, cross-feature deps)? If decomposition slipped — flag for split.
4. **Ambiguity check.** Status tags consistent with Resolution content (`RESOLVED` forks have non-empty Resolution; `OPEN` forks explicitly say so)? Cardinality tags match branch semantics? Any Resolution wording that could be interpreted two different ways?
5. **Format compliance.** All forks have status + cardinality tags. Inline-vs-cell branches follow the rule (ID ⇔ cell). Cross-cutting forks live in CC section, not nested. Reusable sub-policies properly factored as P-NAME blocks.

Subagent returns findings. **Fix issues inline. No need to re-review** — just fix and move on.

### User Review Gate

After self-review fixes are applied, present the spec to the operator:

> «Spec written to `<path>`. Please review it and let me know if you want any changes before we move to the next phase.»

Wait for the operator's response. If they request changes, apply them and re-run Self-Review. Only proceed once the operator approves. Once approved, run **Backlog sync at closure** (below) as the final closure sub-phase before any transition to the next phase.

### Backlog sync at closure

After the operator approves the spec (User Review Gate), run backlog-sync as the **final** closure sub-phase. Deliberately deferred items live scattered across the spec — a parked sub-function, a deferred fork, an out-of-scope line; the **product-backlog** is their single aggregation home. This sub-phase harvests them and offers a patch to the backlog.

**Mechanism:** the shared family **backlog-integration** mechanism — `hi_flow/references/backlog-integration.md`. feature-spec follows it **by name** as a bottom-up contributor; it does not reinvent the algorithm. Read that reference for the generic flow (detect `*backlog*.md` → dedup/merge → idempotency by `Originating analysis` (exact key for downstream records; name-fallback surfacing for product-spec's pathless records — see the mechanism) → classify → patch + approval → create-from-template if missing → iteration index untouched). This section supplies only feature-spec's part of the harvest contract.

**When it runs:** at the very end of closure — after the spec is written, self-reviewed, and operator-approved. The deferred set is then stable and the final spec path is known (needed for the `Originating analysis` pointer).

**feature-spec harvest sources (the structural anchors):**

1. A fork with `[status: DEFERRED]` — the whole fork is deferred → `parked`.
2. A `**Backlog:**` block (bullets) under any fork — the organic convention; the listed sub-points of a RESOLVED fork are → `parked`, **one parked record per bullet**.
3. `Sf-` forks (deferred strategic forks), if the spec uses them → `deferred-fork`.
4. `Out of scope` lines (in Цель) and `Premortem findings` items with a light tag: `→ backlog` → `parked`, or `→ rejected: <reason>` → `rejected`. An untagged line is a plain scope boundary / an absorbed finding — **not** backlog-bound.

For each harvested item, supply the mechanism's harvest contract (`local_ref`, `classification`, `name`, plus proposed `level` / `reason` / `carry-over` — proposed, finalized at approval).

**Scan-validate scope (the hybrid safety net):** fuzzy-scan only operator-content sections — `Развилки`, `Цель`, `Premortem findings` — for deferral prose ("backlog" / "отложен") that carries no structural anchor, and surface each discrepancy to the operator per item. **Exclude fenced code blocks** (` ``` `) — they may contain the word "backlog" from template examples copied into the spec, and must not produce false hits.

**Slug derivation:** if a bundle exists (after product-spec) → slug from it; standalone → from the spec filename (`YYYY-MM-DD-<feature-slug>-feature-spec.md` → `<feature-slug>`). The operator confirms at approval. No guessing.

**Marking discipline (during the session, not only at closure):** when you defer something, place the structural anchor **in place** at that moment — `[status: DEFERRED]` on the fork, a `**Backlog:**` bullet under a RESOLVED fork, or a `→ backlog` / `→ rejected` tag on an out-of-scope / premortem line. These are find-ers only; `level` / `carry-over` / `reason` are proposed and finalized at approval and are **not** required inline. Marking as you go makes the closure harvest deterministic instead of a fuzzy re-scan.

**No separate register section** in the spec — deferred items stay in their natural places (the fork / out-of-scope / premortem), marked structurally; the backlog is the only aggregation home (SSoT, principle 4). The decision detail stays in the fork; the backlog gets the `Originating analysis` pointer-with-summary. This is a different axis from "Open items at closure" (unresolved items, kept in the spec) — the two lists do not merge.

### Coverage-based closure criterion

Move to Closure only when all hold:

- All Mandatory categories yielded forks or an explicit N/A.
- All Conditional categories whose preconditions hold yielded forks or an explicit N/A.
- Structural probe (Surfaces & UX-structure) ran if the feature is user-facing (or an explicit N/A).
- Premortem closing probe ran.
- Contradiction detection has no open conflicts.

Until then, keep probing.

### Escalation rule

When ambiguity arises that cannot be resolved from available data, escalate to the operator. Do **not** restart the previous phase (e.g. a product-level skill that ran upstream).

## Probing Taxonomy

Floor checklist for the brainstorm path: **8 probe categories + 1 structural probe (conditional) + 1 cross-cutting probe + 1 cross-cutting check + 1 closing probe + 1 closure criterion**.

### Universal rule

Walk through every category, but you are **not required** to generate forks in each. An empty category is a normal result if the feature genuinely has no decisions there. **Do not pad** — that path leads to hallucinations.

Each category has an explicit Procedure (input → algorithm → output). Adaptive probes are allowed as a **supplement** to the procedure, not a replacement.

### 1. Input space [Mandatory]

**Procedure:**
- Ask: «какие поля есть у фичи?»
- Per field: «откуда берётся (user input / context / system)? обязательно? есть default?»
- Iterate until no new fields surface.
- For user-input fields: «какие формы пользовательского ввода (raw forms — числа, даты, неточные ссылки, дельты, проценты)?»

**Note:** channels (Telegram, email, web-push) may appear here as input / context fields — do **not** conflate them with surfaces (see surface ≠ channel in the Structural probe).

**Output:** field list with metadata.

### 2. Boundary [Mandatory]

**Procedure:** for each field, run the **HAZOP guidewords**:
- *No* — field absent
- *More* — value larger than expected
- *Less* — value smaller
- *As Well As* — and something else too
- *Part Of* — partial value
- *Reverse* — opposite meaning
- *Other Than* — unexpected form

Each guideword → one probe «как бот реагирует на это?». Skip irrelevant guidewords explicitly.

**Output:** forks for non-trivial reactions.

### 3. Invalid combinations [Conditional: ≥2 interacting fields]

**Procedure:**
- Identify all pairs / triples / N-tuples of fields with logical interaction (one parameter depends on / contradicts / strengthens / weakens another).
- Per group: «есть ли запрещённая или проблематичная комбинация? Какое правило?»
- Record as a regular fork **or** decision table (when ≥3 independent boolean conditions with don't-care, or 2 boolean conditions yield 4 simple outcomes).

**Decision table format** (inside a fork cell, replacing Branches):

```markdown
**Branches [XOR]** (decision table):

| field_a | field_b | branch | действие                            |
|---------|---------|--------|--------------------------------------|
| -       | -       | —      | <inline action>. END.                |
| +       | -       | F1.1   | <action или → see F1.1>              |
| -       | +       | F1.2   | <action или → see F1.2>              |
| +       | +       | F1.3   | <action или → see F1.3>              |
```

Notation: `+` = present/true, `-` = absent/false, `*` = don't-care. Branch column is `—` for inline branches without a cell.

**Output:** combination forks / decision tables.

### 4. User reactions [Conditional: feature has user-visible output]

**Procedure:** per user-visible output, walk the **5 standard user reactions**:
- *Accept* — user agrees
- *Reject* — refuses
- *Partial-accept* — agrees with part
- *Abandon* — does not respond
- *Change* — comes back to modify

Each → probe «как бот реагирует?».

**Output:** forks per (output, reaction).

### 5. Hard policies [Optional]

**Procedure:** triggers when the domain has ethical / safety / medical / legal risk.

- Walk Boundary findings — per extremum: «триггерит ли concern?»
- For high-stakes domains, walk standard sensitive areas (privacy, finance, age, vulnerability, harm).
- Each policy follows the pattern: *«Если <условие>, то отказ / требование / лог <действие>»*.

**Important:** **do not fabricate** policies for neutral features. If there is no risk, skip the category without recording.

**Output:** policy forks. They go into the Cross-cutting policies section, not the main tree.

### 6. Disambiguation [Optional]

**Procedure:** triggers when ≥2 outwardly similar situations exist.

- Pairwise pass over forks: «выглядят похоже извне (для пользователя), но требуют разной реакции?»
- Highlight near-misses to the operator.
- Criterion is usually examples + checklist, not a formula.

**Important:** **do not invent** pseudo-disambiguation to fill the category. If there are no real near-misses, skip it.

**Output:** disambiguation forks with criteria + examples.

### 7. Lifecycle [Conditional: feature has state persisting after the initial action]

**Procedure:** per state-change in Контракт выхода — **5 lifecycle questions**:

- *Expire* — when does state stop being relevant?
- *Change* — user wants to modify?
- *Abandon* — user dropped it, what does the bot do?
- *Repeat* — repeated action after some time?
- *Override* — what if new input overrides the old?

**Output:** lifecycle forks.

### 8. Cross-feature integration [Conditional: project has existing features]

**Procedure:**
- Read Module Map from `ARCHITECTURE.md` (if present).
- Per module/feature: «наша фича взаимодействует? Как — read / write / trigger / depend on?»

**Output:** integration forks.

### Structural probe — Surfaces & UX-structure [Conditional: feature has a user-facing surface]

A **structural** probe, **not** a 9th fork-category. Surfaces are structure, not decisions — its output goes to the **"Поверхности (UX)"** section, **not** the forks-tree. (Precedent: Hard policies route their output to the Cross-cutting section, not the main tree — a probe is free to write to a non-forks home.)

**Procedure** (UX layers 1-2 only — see "UX/UI boundary principle"):

- Elicit the **surfaces**: «с каких поверхностей человек работает с фичей?» (веб-inbox, Telegram-бот, мобильное приложение, ...).
- Per surface: **назначение** (what user job it serves), **функциональный состав** (which capabilities / data / actions live here — *functional*, not visual), **ключевые состояния** (empty / loading / error / populated, etc.).
- **Навигация:** how the person moves between surfaces.
- Apply the **two-designers test** as altitude calibration — if it starts dictating visuals (layer 3), stop and leave that to arch-spec.

**Output:** the "Поверхности (UX)" section — **not** forks.

**Rule — surface ≠ channel:**

- **Surface** — where the person works (web inbox, Telegram bot, mobile app).
- **Channel** — the transport of a message (Telegram, email, web-push).
- One surface shows many channels; one channel reaches many surfaces. **Error:** listing a channel (email) as a separate surface. **Correct:** email surfaces *inside* the web inbox as a conversation tagged by channel.

### Cross-cutting probe — Make implicit criteria explicit [Always active]

When a vague phrasing appears, classify its flavor:

- **Hidden number** (быстро / часто / много / низкий темп) → quantify into a value.
- **Hidden criterion** (опасный / настойчивый / нереалистичный) → operationalize into a rule / checklist.
- **Genuinely fuzzy** (похоже / естественно / уместно) → accept fuzziness, give the LLM anchor examples.

### Cross-cutting check — Contradiction detection [Always active]

After each new fork answer, cross-check against recorded forks. On contradiction, flag the operator explicitly:

> *«В F1.3 ты сказал X, в текущем F2.4 — предполагается Y. Конфликт. Какое решение верно / нужно ли пересмотр?»*

### Closing probe — Premortem [Mandatory at end]

After the 8 categories + cross-cutting checks:

> *«Представь, что фича запущена и через 3 месяца идут жалобы пользователей. Какие жалобы?»*

Each imagined complaint → potential new fork.

## Output Format — feature-spec.md

### File location

`<project>/docs/specs/YYYY-MM-DD-<feature-slug>-feature-spec.md` (default; configurable).

### PRD-as-standalone principle

The spec is self-sufficient for feature context. The next phase (arch-spec) reads it for product understanding plus `ARCHITECTURE.md` for architectural context — no overlap.

### Plain language principle

`feature-spec.md` is addressed to the product-operator, not a developer. Default — product Russian. English jargon is allowed when:

- (a) it objectively simplifies comprehension (shorter and more precise than the Russian equivalent), or
- (b) it is widely known professionally (MVP, KPI, UX, ИМТ, BMI, ROI, etc.).

Engineer-only jargon (extract-all, payload, throughput, idempotency, fallback, etc.) — translate or unpack in product language.

### UX/UI boundary principle

For a feature with a user-facing surface, the frontend splits across three layers. The boundary runs **inside** a screen, not between "has a screen / has none":

| Layer | What | Owner |
|---|---|---|
| **1. UX behavior / logic** | what is possible, what happens, rules, states, flows | **feature-spec** |
| **2. UX structure / IA** | which surfaces/screens exist, why each, navigation, *functional* composition of a screen, key states | **feature-spec** |
| **3. UI / visual** | layout, components, control types, visual hierarchy, style | **arch-spec** (architecture of layer 3) / designer (pixels) |

**Stop-line:** feature-spec owns layers 1-2 (the "Поверхности (UX)" section). It does **not** describe layer 3 — visual layout / components / style go to `hi_flow:arch-spec`. The default mistake is letting layer 2 drift into arch-spec alongside layer 3; layer 2 is product (feature-spec).

**Two-designers test (altitude calibration):** «can two designers produce visually very different screens, both satisfying the spec?» Yes → the spec is at UX altitude (layers 1-2, describes *what*, not *how it looks*) — correct. No → it dictates visuals → it has reached into layer 3 → that belongs to arch-spec.

Cross-ref: P8 (altitude), D14 (complementary layers), D25 (this boundary decision).

### Top-level structure

```markdown
# <Feature name>

## Sample dialogs
### Happy path
[concrete dialog]

### Corrected path
[concrete dialog]

### Refused / Edge path
[concrete dialog]

## Цель
[1-3 предложения; out of scope inline если есть явные исключения]

## Контракт входа

### От пользователя (raw)
- field: формы

### Из контекста
- field: тип, источник, обязательность, default

## Контракт выхода
- Запись: ...
- Возврат пользователю: ...
- Side effects: ...

## Поверхности (UX)
[conditional — only if the feature has a user-facing surface; covers UX layers 1-2, NOT layer 3]
- перечень поверхностей
- per surface: назначение / функциональный состав (что на ней функционально, НЕ визуал) / ключевые состояния
- навигация между поверхностями

## Развилки
[hierarchical decision tree]

## Cross-cutting policies
[orthogonal forks]

## Reusable sub-policies
[named blocks referenced from forks]

## Premortem findings (closing probe absorbed)
[absorbed concerns]

## Open items at closure
[skill-generated table]
```

### Sample dialogs

Three concrete user paths in dialogue form:

- **Happy path** — everything went smoothly.
- **Corrected path** — required a correction, still closed.
- **Refused path** — bot refused. If a refuse scenario does not apply, replace with **Edge path**.

Anchor for the operator and for the next phase.

### Поверхности (UX) section

**Conditional** — include only if the feature has a user-facing surface. Covers UX **layers 1-2** (structure / IA), **not** layer 3 (visual layout / components / style → arch-spec). See "UX/UI boundary principle".

Per surface:

- **Назначение** — what the surface is for (the user job it serves).
- **Функциональный состав** — what is functionally on the surface (which capabilities / data / actions live here), **not** how it looks.
- **Ключевые состояния** — the surface's key states (empty / loading / error / populated, etc., at the functional level).

Plus **навигация** — how the person moves between surfaces.

**Altitude calibration (two-designers test):** if two designers could produce visually very different screens both satisfying this section, the altitude is correct (it describes *what*, not *how it looks*). If it dictates visuals, it has slipped into layer 3 → arch-spec.

### Cell format

```markdown
### F1.3.2. <название> [decision: что решаем] [status: OPEN | RESOLVED | OUT-OF-SCOPE | DEFERRED]

**Resolution:** <ответ + одна фраза reasoning'а> | OPEN — нужно решение

**Branches [XOR | OR | OPT]:**
- F1.3.2.1 — <branch label> → <inline action OR see deeper>
- F1.3.2.2 — <branch label> → see CC1 / see P-NAME

**Открыто:** <sub-questions, опционально>
**Связи:** <cross-references, опционально>
**Examples:** <конкретные сценарии, опционально>
```

**Cardinality tags:**
- `[XOR]` — exactly one branch fires
- `[OR]` — branches may fire simultaneously
- `[OPT]` — optional branch

**Status tags:**
- `RESOLVED` — decision made
- `OPEN` — needs decision, blocker for next phase
- `OUT-OF-SCOPE` — explicitly excluded
- `DEFERRED` — postponed, not a blocker

**Terminal markers:**
- `END.` — branch terminates with this action
- `→ see Fx.y.z` — expanded deeper
- `→ see CC1` / `→ see P-NAME` — jump to cross-cutting / sub-policy

**Resolution-first:** Resolution is always the first line after the header.

### Cross-cutting policies — orthogonal forks

```markdown
### CC1. <название>
**Pre-empts:** F1.3.*, F1.1
**Resolution:** ...
**Pattern:** *Если <событие> → отказ / требование / лог <действие>*
```

### Reusable sub-policies — DAG factoring

```markdown
### P-INSIST-HANDLING
[блок, описывающий поведение]
**Used in:** F1.3.2.2, F2.5.1, F4.2
```

## Operational Rules — what the skill enforces

1. **Happy path first.** Run the happy path end-to-end before allowing branching. Reviewer always has a cohesive narrative spine.

2. **Sample dialog cohesion check.** When writing sample dialogs, verify each bot turn is consistent with the preceding user input. If the bot says / asks something that does not follow from current state — that is a missing fork signal. Raise the question to the operator and record the fork in the tree before continuing the dialog. Sample dialogs are an integrative test for the forks tree, a second safety net after coverage-based closure.

3. **Depth budget — cap 3-4 levels.** On overflow, propose extracting the sub-tree into a named P-policy.

4. **Cross-cutting detection.** If a rule (a) **pre-empts** the main flow regardless of branch (e.g. a medical refusal applies on any F1.x branch), OR (b) repeats in ≥2 branches — suggest moving it to the Cross-cutting section. Hard policies always go to CC by criterion (a).

5. **Reusable block extraction.** Suggest factoring into a P-policy when: (a) the sub-tree is logically identical to another fork's, OR (b) the block describes an algorithm / rule referenced by ≥2 forks (like input-format normalization), OR (c) the block is substantively self-contained (a full procedure with internal logic, not reducible to a one-line reasoning).

6. **Decision tables instead of 2^N branches.** When a fork depends on N independent boolean flags, propose a table with don't-care.

7. **Out-of-scope inline.** Not a separate section. Describe explicit exclusions inline in Цель or Контракт выхода.

8. **Escalation, not restart.** When ambiguity cannot be resolved from data, escalate to the operator — do not restart an upstream skill.

## Format Rules

1. **Hierarchical IDs (Cockburn-style).** Main forks tree: F1, F1.3, F1.3.2.1. Semantic prefixes for probing categories:
   - **Lifecycle forks** — `F-life-N` (F-life-1, F-life-2, ...).
   - **Disambiguation forks** — `F-disamb-N`.
   - **Cross-feature integration forks** — `F-integ-N`.
   - **Cross-cutting policies** — `CC1, CC2, CC3, ...`.
   - **Reusable sub-policies** — `P-NAME` (e.g. P-NORMALIZATION-DEADLINE, P-INSIST-HANDLING — UPPER_CASE-WITH-DASHES).
2. **ID assigned ⇔ cell exists.** No dangling IDs without cells. No cells without IDs. Trivial terminal branches stay inline in the parent without an ID.
3. **Resolution-first** in every cell.
4. **Cardinality tag** required on forks with branches.
5. **Status tag** required on every fork.
6. **`Открыто`, `Связи`, `Examples`** — optional. If empty, omit the line.
7. **`END.`** on terminal branches.
8. **No summary** at the end of the spec. Operator reads in full.
9. **`**Backlog:**` block (organic convention).** Under a RESOLVED fork whose sub-functions are partly deferred, list the deferred sub-points as bullets under a bold `**Backlog:**` label. This is a harvest anchor (anchor 2 in "Backlog sync at closure") — the listed items are parked at closure. Do **not** introduce a conflicting single-line `**Backlog:** level: ... | ...` form; the block-of-bullets convention is canonical (it already exists in real specs).
10. **Deferral tags on one-liners.** `Out of scope` (in Цель) and `Premortem findings` lines may carry a light tag: `→ backlog` (parked → Parked features) or `→ rejected: <reason>[; альтернатива <...>]` (hard rejection → Out-of-scope (rejected)). An untagged line is a plain scope boundary / absorbed finding and is **not** transferred. Tags are harvest anchor 4.

## References

- **Reference example** of a completed feature-spec.md: `references/example-goal-setting.md`. Read this when generating output to anchor format and style.
- **Feature-spec template** with placeholders: `references/feature-spec-template.md`. Use as the starting structure when writing.
- **Self-assessment proposal template:** `references/self-assessment-template.md`.
- **Backlog integration mechanism (shared, family):** `hi_flow/references/backlog-integration.md`. The generic backlog-contribution algorithm feature-spec follows by name at closure (detect → dedup → idempotency → patch + approval → create-if-missing). Read it before running backlog-sync.
- **Product-backlog template (format authority):** `hi_flow/skills/product-spec/references/product-backlog-template.md`. The single source of backlog record format (Parked features / Deferred strategic forks / Out-of-scope (rejected)). Read-only for feature-spec — owned by product-spec.

## Implementation Notes

- On skill start, read the reference files first to anchor output format.
- Generate the self-assessment proposal using `self-assessment-template.md`.
- When writing `feature-spec.md`, use `feature-spec-template.md` as the skeleton and fill it from brainstorm results.
