# arch-spec amendment — shared-capability lookahead (platform-port probe, variant A+)

**Date:** 2026-06-04
**Skill:** `hi_flow:arch-spec`
**Type:** amendment (probing taxonomy + output template + self-review checklist)
**Decision:** D26
**Source brief:** `docs/feedback/hi_flow-platform-architecture-gap-brief.md`
**Status:** implemented (this session)

## Problem (summary — full analysis in the source brief)

hi_flow is emergent-per-feature: arch-spec designs each feature from the *current snapshot* (block C), not from the roadmap. So the **first** feature that needs a cross-cutting infrastructure capability (object storage, channels, scheduler, auth, event bus, observability, file storage, idempotency, secret-manager) defines its port **narrowly under itself** — a locally-correct YAGNI call. The second consumer re-opens the same capability as a generic port → duplication → Known Drift → backlog → `arch-redesign` reconciles after the fact.

Live case (REH ERP, brief §«Реальный кейс»): `audit-overflow` → `object-storage` (the same capability defined twice), and `comm-channels` is about to repeat the pattern a third time — predictably, since notif / tickets / portal are already known roadmap consumers.

Not a defect of any single arch-spec — each is locally correct. The gap is *between* steps: nothing recognises a capability as cross-cutting **before** the first feature defines it.

## Decision: variant A+ (awareness probe), not a registry

Per D26, the gap is resolved **at the current stage** by a lightweight awareness probe inside arch-spec, NOT by a platform-capabilities registry (variants B/C rejected for now).

Rationale (D26): the debt is **visible** (self-files as Known Drift), **payable** (arch-redesign exists), **linear** in flow length, and **localised in user projects**, not in hi_flow itself. A registry (variant B) additionally (a) conflicts with arch-spec's deliberate decoupling from `ARCHITECTURE.md` (variant 2 / OQ6, stated in D21 — arch-spec does not write to it), and (b) is entangled with the not-yet-built `living-architecture` (D20). A+ buys the cheap, predictable case (capabilities whose cross-cutting nature is obvious from the roadmap) at the price of one probe, touching none of that.

### In scope (A+)

- One **cross-cutting check** in arch-spec's probing taxonomy — "Shared-capability lookahead" — fired when a floor-2 decision introduces a **port / adapter boundary** (not a domain module).
- Detection by three signals (any one suffices): (a) backlog / roadmap names other consumers of the capability; (b) `ARCHITECTURE.md` flags it as an infrastructure constant; (c) the capability is orthogonal to the feature's domain logic.
- Action on trigger: design the port contract **one notch wider** than single-consumer YAGNI (generic key / payload, not the first caller's narrow shape) **and** record it in §3 as a **platform port** (owner = this feature; consumers-per-roadmap listed) — not as a module-of-this-feature.

### Out of scope (this would be variant B — explicitly NOT done)

- No platform-capabilities registry (no new artifact, anywhere).
- No registry read in block A, no closure registry-patch.
- No product-spec section.
- No new event category in the `architecture` skill.
- No cross-skill write — arch-spec's decoupling (variant 2 / OQ6) is untouched.

## Changes

1. **`hi_flow/skills/arch-spec/SKILL.md`**
   - Probing taxonomy → *Cross-cutting checks (per decision)*: add **Shared-capability lookahead** (trigger, three signals, action, an explicit *awareness-only* bound so future readers do not escalate it to a registry, cross-ref D26).
   - *Operational rules*: add rule 10 — a terse enforcement pointer to the check.
2. **`hi_flow/skills/arch-spec/references/arch-spec-template.md`**
   - §3 Goal and boundaries: add an **optional** "Platform ports" bullet (present only when the lookahead triggered; omitted otherwise).
3. **`hi_flow/skills/arch-spec/references/self-review-checklist.md`**
   - Coverage: one bullet verifying the lookahead was applied to every floor-2 port.

## Placement rationale

The check is a **cross-cutting check (per decision)**, not a new floor or ceiling category:

- It is **triggered**, not always-on — domain features are vertical slices and almost never introduce a cross-cutting port (brief §«Зазор затрагивает … shared capabilities»). Floor is "always, structural base" (categories 1-4); this does not belong there.
- It is a **lens applied to a floor-2 decision** (dependencies & boundaries — exactly where ports are defined), structurally identical to how "Derivability from the product" is a gate applied per decision. The cross-cutting-checks block is therefore its natural home, with the lowest structural disturbance to the taxonomy.

## Re-review trigger (→ variant B)

Per D26: a real flow of **4+ consumers of one capability** on a live project, where arch-redesign reconciliation becomes materially costlier than prevention. At that point the registry returns — but anchored in the **backlog-integration mechanism** (D22, already built; not in `ARCHITECTURE.md`, so decoupling holds) with the **detector in product-spec decomposition** (it sees the whole feature graph; arch-spec sees only the snapshot). A+ does not preclude B; it is the cheap first layer, and the door stays open with this explicit trigger.

## Validation

- Structural: three files edited, internally consistent (probe ↔ template output location ↔ checklist verification).
- Behavioral: deferred to the next arch-spec live run that introduces a port — candidate is comm `comm-channels`, the predicted third repeat (P3 — end-to-end validation through the real pipeline, not isolated unit checks).
- Isolated review: fresh-context subagent over the three changed files (P5).
