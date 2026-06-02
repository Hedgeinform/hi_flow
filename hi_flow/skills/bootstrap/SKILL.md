---
name: bootstrap
description: Use when operator says «init проекта», «заведи проект», «зафиксируй стек», «зафиксируй фронтенд-стек», «настрой фундамент проекта», or English equivalents («project bootstrap», «setup project foundation», «fix the stack»). Input — project class (backend-service / frontend / CLI / library / fullstack) + an optional product-spec; output — a ready technical foundation (configs, scaffold, arch-audit-config, CI/gates) plus a created ARCHITECTURE.md with a projected `## Stack`. Brings the repo to the state where patterns are already established, then `superpowers:writing-plans` starts normally.
---

# bootstrap

## Overview

bootstrap is the **project-level owner of the technical foundation** in the hi_flow family — everything that must exist **before** the first feature goes into implementation. It closes finding A from the first live run of arch-spec: on a green field, the chain `product-spec → feature-spec → arch-spec → writing-plans` stalls at the arch-spec → writing-plans seam, because nobody fixes the app-stack (language, framework, test-runner, ORM, scaffolding, CI), yet `superpowers:writing-plans` is built for "existing codebase, follow established patterns".

bootstrap fills that gap: it brings the repo to the state where the patterns are **already established**, after which writing-plans starts normally.

**Place in the chain.** bootstrap sits at the foundation seam — on a green field, between the product vision and the first implementation; recurrently, every time a new feature forces a new infrastructure axis.

```
product-spec → feature-spec → arch-spec → [ bootstrap: foundation ready ] → writing-plans
                                  │
                                  └─ signals "axis X not fixed → bootstrap"  (operator launches; see incremental)
```

It does five jobs, one atom (probe → scaffold → wire) reused by two modes (init / incremental).

## When to use

The operator wants the project's technical foundation fixed before implementation — the stack chosen and scaffolded, hygiene/audit/CI wired, ARCHITECTURE.md created (init) — or wants one new infrastructure axis fixed because a feature forces it (incremental). After bootstrap, writing-plans can produce an implementation plan over an established codebase.

## Anti-triggers (do NOT auto-activate)

- «arch-spec для фичи X», «спроектируй архитектуру фичи X» — that is `hi_flow:arch-spec`: **which** modules a feature has, contracts, fitness invariants (feature-level). bootstrap fixes only **how** a module is built in this project (project-level convention).
- «продуктовая спека», «давай продумаем фичу X» — product/feature behavior is `hi_flow:feature-spec` / `hi_flow:product-spec`. bootstrap does not touch behavior.
- «напиши план», «implementation plan» — that is `superpowers:writing-plans`. bootstrap stops at "repo is ready to accept a plan".
- «обнови архитектуру», «найди drift» — maintaining the living ARCHITECTURE.md after creation is `living-architecture`. bootstrap **creates** the document and fixes the stack; maintenance is downstream (see Boundary with living-architecture, KD2).

## Scope

bootstrap owns:

1. **Create flow for `ARCHITECTURE.md`** — a self-contained port of Function 1 of the operator-personal `architecture` skill: create the document from template, format-validate, init the Topic Index, lay a minimal Module Map skeleton, project `## Stack` from the configs.
2. **App-stack fixation** — probing + fixing technologies per infrastructure axis (the atom, below).
3. **Scaffolding** — a green skeleton + one convention reference pattern (generic, non-domain).
4. **Wiring the arch-audit tooling** — depcruise-config, rules baseline.
5. **Wiring the L3-hygiene harness (Function 3a)** — laying the CI workflow + linter/formatter baseline + gates aggregate **delivered by Function 3a** into the project. bootstrap is the **consumer** of these templates, not the owner of their design (ownership stays with Function 3a).

**Out of scope:** hooks / enforcement (Function 3b) — deferred to a research-trigger (decision 2026-06-01: a quality CI is enough; revisit hooks only if CI proves insufficient).

## Boundaries (what bootstrap does NOT do)

| Neighbour | Boundary |
|---|---|
| **arch-spec** | module breakdown of a feature, contracts, fitness invariants — feature-level "WHICH modules". bootstrap sets only "HOW a module is built in this project" (project-level convention). |
| **feature-spec / product-spec** | what belongs to the product and the feature (behavior). bootstrap does not touch behavior. |
| **living-architecture** | *maintains* the living ARCHITECTURE.md after creation (events, drift, audit). bootstrap *creates* the document and fixes the stack; maintenance is downstream. See Boundary with living-architecture + KD2. |
| **writing-plans** | the feature's implementation plan. bootstrap stops at "repo is ready to accept a plan". |

**Altitude principle (P8, cross-cutting).** bootstrap = project-level (HOW a module is built in this project: toolchain, conventions, scaffold-convention). arch-spec = feature-level (WHICH modules a feature has). project-foundation does not predict feature structure; feature-design does not fix the project stack. This is the systemic resolution of the A↔C boundary: the infrastructure-axis taxonomy (finding C) lives in bootstrap as its working vocabulary, while arch-spec only **signals** "axis not fixed → bootstrap" and does not decide it.

## The axis atom

**The atom is one infrastructure axis.** It is the base operation, reused by both modes. Three steps:

1. **probe** — choose a technology for the axis (coverage-gated + differentiated by probe-class; see Coverage and Probing discipline).
2. **scaffold** — lay the skeleton for the chosen technology, from the axis's scaffold-template.
3. **wire** — connect the axis tooling: baseline (linter/formatter), arch-audit-adapter (depcruise-config), gates, CI step.

**Slicing criterion (brief):** one axis = one technology category with one scaffold-template + one coverage set + one tooling-wire. Axes are sliced by "does it need its own scaffold and coverage", not by conceptual umbrellas — so `database` (Postgres) and `file storage` (S3) are separate leaf-axes, not a shared `persistence` umbrella.

**Axes ≠ toolchain components.** The infrastructure leaves are the only things probed as axes. Toolchain components (linter, formatter, test-runner, CI, arch-audit-config) are **wire sub-steps** bound to the runtime axis — no scaffold-template, no coverage row of their own, not probed as axes; they are configured from a baseline at the wire step.

Do **not** restate the taxonomy here — read `references/axis-taxonomy.md` for the fixed set of 8 axes, the slicing rule, the axes-vs-toolchain split, and the per-axis probe-class.

## Coverage

**Coverage-gated probing (coverage-honesty).** bootstrap proposes only what the plugin can **deliver end-to-end** (baseline + audit + gates + scaffold). The whole of hi_flow is tied to concrete stacks (L3 baselines, the deterministic depcruise graph, stack-files are all technology-specific). Proposing an uncovered component = promising turnkey hygiene that will not exist.

The `references/coverage-manifest.md` is the **SSoT of coverage** (principle 4). bootstrap reads it dynamically — nothing about coverage is hardcoded. Do **not** restate the rows here; read the manifest for what is currently covered (today: only `language & runtime` = TypeScript/Node is fully covered).

**Behavior on uncovered (principle 5 — no silent fallback):**

- **Default:** do not propose an uncovered technology.
- **If the operator insists:** do not block (the operator owns it) — but **degrade with a loud warning**: "axis outside plugin coverage — hygiene/audit/gates won't wire, marking unmanaged". No silent promises.
- **Partially covered axis = NOT covered.** Each of the 5 fields (`stack-file`, `baseline`, `audit-adapter`, `scaffold-template`, `probe-class`) is **present**, **absent (pending)** — applicable but not yet built — or **N/A by design** — conceptually inapplicable to the axis. An axis is **covered** when every field is *present or N/A*; any **absent-pending** field falls under coverage-honesty → a loud signal: "axis X covered partially — have Y, missing Z; fixing the covered part, the rest is `unmanaged`". An **N/A** field does NOT count as missing (it must never trap an axis in permanent partial — see the manifest's field-states rule). (Postgres and the frontend axis are absent-pending cases today — frontend reaches `covered` once boundary-rules + scaffold-template are built, neither is N/A; the grounding case REH ERP frontend exposes this live.)

**A `forced-now` axis that is uncovered / partial — the resolution.** A product-forced axis can be uncovered (e.g. the frontend in the grounding case): the product needs it, but the plugin cannot deliver it turnkey. Do **not** let "forced-now → run the atom" and "uncovered → loud signal" contradict each other. The rule:

1. Run the atom only for the **covered sub-part** of the axis (if any) — scaffold/wire steps need a `scaffold-template` and `baseline`; for a fully empty axis there is nothing to scaffold, so those steps are skipped.
2. Mark the axis **`unmanaged`** and emit the loud coverage-honesty signal — that signal **is the deliverable** for this axis (not a silent framework pick).
3. **The `unmanaged` axis is excluded from the done-gates** (it has no gates to be green — see Output & done). The run is "done" with the axis recorded as `unmanaged`, not blocked.
4. If the operator insists on an uncovered technology (the "If the operator insists" branch above), proceed with the `unmanaged` degrade — still no hygiene/audit/gates wired, still loud.

## Probing discipline

α is differentiated by **probe-class** (a property of the axis in the manifest), because the operator is a product owner, not an engineer (P1/P6):

| probe-class | Behavior |
|---|---|
| **buy-in** (language & runtime, interface/frontend, database, file storage) | recommended default + **translation into product consequences** + operator confirmation |
| **buy-in lite** (task scheduler, message queues, cache, search) | product/cost consequences exist but surface rarely — lighter confirmation |
| **silent-baseline** (toolchain components: linter, formatter, test-runner, CI, arch-audit-config) | fixed silently from baseline; the operator may contest. Applies **only on full coverage** — a partial/missing baseline raises a loud signal, never silence |

**Translation into product terms (P1).** For buy-in axes, do not say "Fastify vs Express" — say "more ready-made components / easier to hire for / faster start". Options stay in plain language; no engineering jargon in operator-facing choices (engineering term in parentheses where it helps).

**buy-in degenerates at coverage = 1.** While an axis has only one covered technology (currently `language & runtime` = TypeScript only), buy-in collapses into an **informing confirmation**: there is no choice, only "here is what the plugin delivers end-to-end, ok?". Real choice with product translation activates once coverage for the axis exceeds 1. **Do not fake a choice that does not exist.**

## init mode (new project)

product-spec is **optional** (an enrichment, not a base): init can run before a product-spec exists. The minimal required input is the **project class** — backend-service / frontend / CLI / library / **fullstack**. For `fullstack`, the runtime splits into **multiple runtime axes** (front + back), each its own atom with its own scaffold; "one question → one runtime" applies to single-runtime classes.

7-step flow:

1. **Macro-probing of the profile** (extract-before-probing — the family pattern): if a product-spec exists, extract hints about product-dependent axes and close gaps with questions. The project class is a **hard prerequisite** (one probing question, needed to pick runtime + scaffold form) — if it is unknown, ask the operator before any axis work; do not infer it from the repo.
2. **Classify axes** by the taxonomy — `forced-now` / `delegated` / `not-touched`, explicitly per axis (no padding, no silence).
3. **For each `forced-now` axis → the atom** (probe → scaffold → wire).
4. **Create flow for ARCHITECTURE.md** (port of Function 1): create the document, project `## Stack` from the configs, init the Topic Index, lay a **minimal Module Map skeleton** (section headers only, filled later by feature arch-specs — features ≠ code-modules, D19).
5. **Green skeleton + one convention reference pattern.** One module of the form `src/<example>/` (index + one unit test) demonstrating the project convention — layout, naming, test co-location, import/export form. **No domain logic.** Test of "convention, not feature": the pattern shows *how any module is built* and can be removed without losing the project's meaning. Anti-example: do **not** create a domain module (`src/users/`, `src/audit/`) — that is "WHICH modules", arch-spec territory.
6. **CI / gates wiring.**
7. **Done** (see Output & done).

**Fallback without a product-spec:** init fixes only the **toolchain-foundation** (the runtime axis + its toolchain-wire). Product-dependent axes (database, file storage, interface, queues, cache, search) → explicitly **not-touched now**; they get pulled in via incremental when a feature forces them. **No guessing** (principle 5) — bootstrap never invents "probably needs a DB".

init-without-product-spec + later incremental runs = the same result as init-with-product-spec, spread over time. The product-spec only decides *how many axes* one init run fixes. init and incremental are points on one scale (number of forced axes at run time), not different things.

## incremental mode (fixing one missing axis)

5-step flow:

1. **Trigger:** the operator explicitly («зафиксируй фронтенд-стек») OR an upstream signal (feature-spec/arch-spec: "feature forces axis X, not fixed"). **Detection ≠ decision ≠ auto-launch:** the upstream skill only *signals*; **the OPERATOR launches bootstrap** (detection is deterministic, but the decision to fix an axis is a product call, P6). bootstrap never auto-launches itself.
2. **The one missing axis** (usually one).
3. **The atom for that axis** (probe coverage-gated → scaffold → wire). This is where the real coverage-gap surfaces (REH ERP frontend → the `interface / frontend` axis). If the axis is uncovered/partial, apply the forced-now ∩ uncovered resolution (see Coverage): loud signal + `unmanaged`, and the "If the operator insists" branch governs whether to proceed unmanaged or stop after the signal.
4. **Append to `## Stack`** (a projection) + the Module Map if needed.
5. **Done:** the repo still compiles + gates green with the new axis + CI updated.

**The same atom is reused by both modes.** init runs it N times + Create flow + macro-probing; incremental runs it once + appends `## Stack`. No duplicated atom logic.

## Boundary with living-architecture

- **bootstrap incremental** = actively **choose (probe) + scaffold + fix** an axis. Active foundation-building; bootstrap itself writes `## Stack` (Variant 1, see Ownership / KD2).
- **living-architecture event cat-10 ("Stack changed")** = passively **document an already-accepted stack change spotted in conversation** outside bootstrap (e.g. the operator changed a config by hand). Passive detect + record.
- Different triggers → no duplication. The double-touch of `## Stack` is the accepted KD2 gap: in a bootstrap episode, bootstrap owns the write; living-architecture does not duplicate it.

## Output & done

**Output:**

- **Physical foundation:** `package.json` / configs / lockfile (the stack = truth), scaffold (green skeleton + convention reference pattern), arch-audit-config, CI / gates.
- **ARCHITECTURE.md** — init creates it; incremental appends `## Stack`.

**Done criterion (enumerable gates):**

- repo compiles, AND
- gates green for the **managed (covered) axes** — typecheck + lint + arch-audit no-violations + the reference test passes, AND
- CI present, AND
- ARCHITECTURE.md exists with a `## Stack` section.

An axis marked **`unmanaged`** (forced-now but uncovered — see Coverage) has no gates and is **excluded** from this criterion: its deliverable is the loud coverage-honesty signal recorded in `## Stack`, not green gates. "Gates green with the new axis" (incremental step 5) means green for the axis's covered part; a fully `unmanaged` axis does not block done.

**Transition.** init complete → the chain (product/feature/arch-spec → writing-plans) proceeds over the ready foundation. incremental complete → the unblocked slice (e.g. REH ERP frontend Slice 2) → `superpowers:writing-plans`.

## Decoupling / market-ready & ARCHITECTURE.md ownership

**Self-contained.** The Create flow is ported **inside** the plugin (Function 1) — it does not depend on the operator-personal `architecture` skill. living-architecture (Function 2) may be absent for a market-ready user → bootstrap creates the document, and the operator maintains it manually thereafter (the same decoupled logic arch-spec uses). The coverage-manifest, baselines, and adapters all live inside the plugin (dependency on Function 3a relocation).

**ARCHITECTURE.md ownership — Variant 1 + accepted break (KD2).** bootstrap **creates** ARCHITECTURE.md (the Create flow). The single-ownership break is accepted: one document, two owners across life phases (bootstrap creates; living-architecture maintains).

**The break does not touch code-is-truth.** The stack truth lives in the configs (`package.json` / `tsconfig` / lockfile); `## Stack` is a **projection** of those configs. bootstrap writes Stack as a projection of the real repo, never as the source of truth. The break concerns only ownership of the projection document — see **KD2**.

## Anti-patterns

- **Predicting feature modules.** bootstrap lays a generic convention pattern and a Module Map *skeleton* (headers). It does not create domain modules or decide which modules a feature has — that is arch-spec territory (the altitude boundary, P8).
- **Guessing product axes without a product-spec.** Without a product-spec, product-dependent axes are explicitly `not-touched now`, not invented. No "probably needs a DB" (principle 5).
- **Proposing uncovered tech silently.** Uncovered / partially-covered axes get a loud signal + `unmanaged` degrade, never a silent proposal (principle 5, coverage-honesty).
- **Faking a choice at coverage = 1.** When an axis has one covered technology, buy-in is an informing confirmation, not a fake menu.
- **Auto-launching incremental.** An upstream signal is not a launch. The operator decides to fix an axis (P6).
- **Writing the stack as source of truth.** `## Stack` is a projection of the configs; the configs are truth (KD2).
- **"Fixing" neighbour mechanisms confirmed by the live run.** Do not invent problems in already-confirmed mechanisms: extract-before-probing, density-factor, ACL anti-trigger, sync-in-txn rationale, green-field block-C skip. The lesson of the false finding: do not manufacture a problem where the mechanism already exists.

## References

- `references/axis-taxonomy.md` — the working vocabulary: the fixed set of 8 infrastructure axes, the slicing criterion, axes ≠ toolchain components, and the per-axis probe-class. Pointer, not duplicated here.
- `references/coverage-manifest.md` — the SSoT of coverage (`axis → technology → { stack-file, baseline, audit-adapter, scaffold-template, probe-class }`). Read dynamically; coverage-gated probing reads it. Pointer, not duplicated here.
- `references/scaffold-templates/` — the green-skeleton + convention reference patterns per technology (owned by other bootstrap tasks). The atom's scaffold step lays the template named for the chosen technology in the coverage-manifest.
- `docs/superpowers/specs/2026-06-01-hi_flow-bootstrap-design.md` — the design spec this skill implements (D20 Function 1, extended by finding A).
