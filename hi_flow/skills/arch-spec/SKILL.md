---
name: arch-spec
description: Use when operator says «архитектурная спека», «arch-spec для фичи X», «спроектируй архитектуру фичи X», «технический дизайн фичи X», or English equivalents («arch-spec», «architecture spec for feature X», «design the architecture of feature X»). Consumes a signed feature-spec + arch-audit D8 snapshot; produces an arch-spec.md design doc plus a rules-patch. Downstream consumer — `superpowers:writing-plans`.
---

# arch-spec

## Overview

arch-spec is the **per-feature architectural design spec** of the hi_flow family — the bridge between Phase 1 (behavioral `feature-spec`) and Phase 3 (implementation via `superpowers:writing-plans`). In plain superpowers, the role of "technical design doc" before writing-plans is played by ad-hoc brainstorming. hi_flow replaces that with a structured chain: feature-spec (what, product-level) → arch-spec (how, architecture-level) → writing-plans (implementation plan). arch-spec is a **full architectural design doc** for the feature, not a checklist.

It does four jobs, none of which is the single defining one:

1. **Derives architecture from the product** — architectural decisions follow from the feature-spec, they are not invented in parallel.
2. **Designs the feature's internal structure** — modules, contracts between them, data schema, integration points.
3. **Checks integration into the existing architecture** — does the feature spawn cycles, blur boundaries, turn a neighbour into a God object, pull dependencies the wrong way? Prophylaxis of architectural violations at the moment a feature is added (so arch-redesign is not needed later to cure them).
4. **Declares invariants** — for correct implementation (prophylaxis) and protection against regression as the architecture evolves.

Integration-check (3) is **one of four**, not the whole point. On a green field (first feature) job (3) does not apply, yet the skill still fully does (1)(2)(4) — it produces a design spec. So the skill is needed **always**, not only when degradation is at risk.

Output: an `arch-spec.md` design doc consumed by `superpowers:writing-plans`, plus a rules-patch consumed by `hi_flow:arch-audit` via explicit operator apply (D11), plus backlog candidates for `product-backlog`.

## When to use

The operator has a signed feature-spec and wants the feature's architecture designed before implementation — module breakdown, contracts, data ownership, integration impact, invariants — so that writing-plans can produce an implementation plan without re-opening architectural decisions.

## Anti-triggers (do NOT auto-activate)

- «давай проверим архитектуру», «запусти аудит» — that's `hi_flow:arch-audit`.
- «давай сделаем редизайн», «спроектируем фикс долга» — remediation of accumulated debt is `hi_flow:arch-redesign`, not per-feature design.
- «давай продумаем фичу X», «продуктовая спека на X» — product-level behavioral design is `hi_flow:feature-spec`.
- «сделай рефакторинг X», «реализуй X» — direct execution, not architectural design.

arch-spec is feature-level **prophylactic** design. arch-audit/redesign deal with debt that already exists; feature-spec decides product behavior, not structure.

Per D14 (complementary layers): arch-spec does **not** duplicate implementation methodology (TDD, plan execution, code review, verification) — that stays in superpowers. arch-spec gives the WHAT (feature architecture); `writing-plans` gives the plan for HOW.

## Pre-conditions

### Input artifacts

| Artifact | Required | Role |
|---|---|---|
| `feature-spec.md` of the feature | **Yes** | Feature contract. Source of ready-made architectural decisions (schema, policies, emission points are already there) + product rationale |
| `audit-report.json` (D8) | Conditional — see three situations | Snapshot of current architecture, needed for block C (integration) |
| `ARCHITECTURE.md` Module Map | If present | Map of existing modules, boundaries, known problems |
| `hi_flow/references/architectural-principles.md` (D9) | Yes (read-only) | Principle catalog for delta-checking + invariant references |

The audit's role here is **narrower** than in arch-redesign: it is needed **only for block C** (integration). Blocks A/B/D/E are derived from the feature-spec and do not depend on the audit. The strictness differs accordingly.

### Three situations by audit

Determine the mode from the Module Map + git history first:

| Situation | Behavior |
|---|---|
| **Green field** (first feature, no code / empty Module Map) | Block C legitimately does not apply. Work without an audit, mark the spec "green field". This is the first live-run mode |
| **Brown field + fresh audit** | Full mode. Block C works |
| **Brown field + no audit / stale** | **Loud signal, not silent degradation** (principle 5). Tell the operator: «Code exists, no audit snapshot. Block C — the main value — runs blind without it. Options: (a) run `arch-audit` [recommended]; (b) proceed without integration analysis deliberately — block C is marked "skipped, no snapshot", reason logged.» |

**Green field + app-stack / infra-axis not yet fixed: bootstrap's territory, not arch-spec's.** If the feature forces an infra-axis the project has not fixed, that is project-foundation work, not feature-design. Loud signal (principle 5): «The feature forces an infra-axis (DB / blob / scheduler / ...) that the project has not fixed. Run `hi_flow:bootstrap` first — it owns app-stack fixation + the infra-axis taxonomy (`bootstrap/references/axis-taxonomy.md`). arch-spec does NOT fix the stack and does NOT duplicate the taxonomy (P8 — altitude: project-foundation ≠ feature-design).» Cross-ref D20, P8.

### Freshness check (when a snapshot exists)

Identical to arch-redesign — family consistency. Compare `audit_sha` from snapshot metadata with `git rev-parse HEAD`:

- Match → proceed silently.
- Differ → soft ask: «Audit at commit `<audit_sha>`, HEAD `<current_sha>`, N commits passed. Re-run `arch-audit` or proceed?» Operator decides; if "proceed", log the reason.
- Not a git repository → skip freshness check with warning.

### Schema check (when a snapshot exists)

If the snapshot is found but broken (no reason fields, no `audit_sha`, no D9 references), block C cannot be built on garbage. **Hard fail scoped to block C only** — the rest of the skill works. Identical to arch-redesign schema check, narrower scope.

## Self-assessment (skip / direct / brainstorm)

Same pattern as feature-spec. Factors tuned to the architectural level:

- **direct** (propose skipping brainstorm, produce the spec straight away): simple feature, 1-2 modules, green field or green audit, few ceiling triggers.
- **brainstorm** (conservative default): many touched modules, brown-field code with known problems nearby, several ceiling triggers, signals of possible degradation.
- **skip**: operator explicitly declines (takes responsibility).

**Density factor (overrides naive module-count).** Weigh how much of the feature-spec is already RESOLVED-with-mechanism. A densely-resolved feature-spec (most forks RESOLVED, schema + policies + integration points already given) leans **direct** even with many touched modules — there is little left to probe, a brainstorm would run empty. A cross-cutting feature that touches many modules is **not** automatically brainstorm if its architecture is already settled upstream. Brainstorm earns its keep when real architectural gaps remain, not when module count is merely high.

Show the operator the proposal with reasoning and factors, in feature-spec format (informative, editable). Run only after confirmation. When in doubt with genuine gaps, choose brainstorm.

### Common Rationalizations

| Thought | Reality |
|---|---|
| "Green field, no audit, I'll just design freely" | Green field is the *normal* mode for the first feature — block C is skipped, but (1)(2)(4) still run. Do not skip the skill; do skip block C. |
| "feature-spec already lists the modules, I'll go direct" | feature-spec lists product capabilities, not module breakdown, contracts, or data ownership. Those are architectural decisions block B must make. |
| "Code exists but no fresh audit — I know the structure" | Without a D8 snapshot, block C's delta-graph reasoning is hallucinatory. Either run arch-audit, or skip block C *loudly* with a logged reason. Never silently. |
| "The feature is small, I'll skip integration check" | "Small" is a feeling, not a check. Run the integration-risk triage; if it touches nothing, that's a recorded result, not a skipped step. |
| "Green field, no stack — I'll just fix it in the spec" | Stack fixation is project-level (bootstrap, D20/P8). arch-spec signals, does not fix. |

## Flow (not linear)

```
(feature-spec  ∥  fresh arch-audit snapshot)   ← both independent in data
                    │
              self-assessment (skip / direct / brainstorm)
                    │
                arch-spec
                    │
          ┌─────────┴──────────┐
   sits cleanly          does not sit (environment is wrong)
          │                     │
   writing-plans      ┌─────────┼──────────┐
   (impl plan)    simplify   refactor   accept debt
                  product    environment  (Known Drift,
                  (back to   (arch-redesign deliberate)
                  feature-   before feature)
                  spec)
```

arch-spec is not only a designer but also a **route fork**: it can send the operator back to feature-spec (simplify the product) or sideways to arch-redesign (clean the environment) before letting the feature into implementation (Phase 2 → Phase 1 feedback loop).

The order of feature-spec ↔ arch-audit between themselves does not matter (independent in data: feature-spec is about the product, audit about existing code). What matters: both ready by the time arch-spec runs, snapshot fresh.

## Probing taxonomy

### Derivation principle

1. **Categories = architectural decisions that must be made** to fill the output document's blocks. Not an abstract textbook list of "-ilities".
2. **First EXTRACT ready-made decisions from the feature-spec, then dig only the architectural layer.** Critical: otherwise the skill re-asks what the feature-spec already answered. The first step of a session is not "ask questions" but "read the feature-spec and pull out ready-made architectural decisions" (data schema, emission points, policies are already there), and only then probe the gaps.

**Reading feature-spec statuses (extract vs probe vs backlog):**
- `RESOLVED` with a mechanism → **extract** as a fact into the matching section.
- `RESOLVED-direction` (direction fixed, implementation deferred — e.g. F9 GDPR redact) → **extract the direction** (→ §10.1 delegated if it needs code-sight, or §3 if no code-sight needed); the implementation goes to backlog. Do not re-probe a fixed direction.
- `DEFERRED` / `OPEN` → **backlog** via closure backlog-sync, unless marked blocker-for-arch-spec (then close it here).
- An extracted **ceiling** decision (e.g. indexes F10.1, secret-filtering CC2) still lands as a fact in the matching §5.x sub-section — not skipped, not re-probed.

   **Operational test (extract vs probe):** a feature-spec item is **extracted** (not re-probed) if it is RESOLVED *with concrete mechanism* (schema fields, named emission points, a stated policy). It is a **gap to probe** if it is a RESOLVED *direction without mechanism*, an open item, or a floor category no fork covers. Items the feature-spec explicitly marks "blocker for arch-spec" (e.g. in its Open items table) **must** be closed in this spec — not delegated, not deferred.

Floor + ceiling structure (arc42 "pick only what matters", ATAM "importance × risk"): probe only the relevant qualities, not all. Each category must yield a **checkable** decision/invariant, never an abstract label.

### Floor — always, statically detectable (structural base)

1. **Module breakdown** — by which responsibilities the feature splits.
2. **Dependencies and boundaries** — links between the feature's modules and existing ones; direction, no cycles, whose interface.
3. **Data and state** — schema, where state lives, single owner (SSoT). *Partly semantic: "who owns" is a judgment, outside D9 static scope.*
4. **Integration points** — where the feature attaches to existing code.

### Ceiling — by trigger, top-3 relevant (runtime/semantic)

5. **Failure modes and resilience** — trigger: external dependency / error-prone path.
6. **Load and scale** — trigger: growing data volume / hot path.
7. **Security and data boundaries** — trigger: secrets / PII / access control.
8. **Translation boundary (Anti-Corruption Layer)** — trigger: semantic mismatch with a foreign/legacy subsystem. Anti-trigger: no meaningful semantic difference. *Distinct from "integration points": points = WHERE we attach; translation boundary = WHETHER an adapter is needed so foreign semantics don't leak into the feature's model (DDD/Azure ACL).*
9. **Consistency and idempotency** — trigger: write to multiple stores / repeatable operations / concurrent writes.
10. **Contract/schema evolution** — trigger: the feature changes a shared contract/schema that someone consumes.

### Cross-cutting checks (per decision)

- **Delta impact on the graph** — bind to a concrete module/edge (Risk Storming: localize risk to an element).
- **Derivability from the product** — gate "is this architecture or product?": non-domain design consideration **and** affects structure **and** critical for success (three-criteria filter, Richards & Ford). Cuts off re-opening product decisions the feature-spec already made.
- **Contradictions** — as in feature-spec.
- **Inherited cross-cutting policies** — which system policies (logging/observability, error-handling, auth, secret-mgmt) the feature instantiates (arc42 §8). **observability** lives here — via global principle 5 (silent fallback forbidden → visible logging) it applies always, but as an inherited policy, not a separate structural floor category.

### Derived

- **Fitness invariants** — not a separate probe but assembled from floor + ceiling + inherited policies (see Fitness invariants below).

### D9 alignment

The probing categories map onto the D9 principle library, so block C's principle-run *is* a run over D9: floor 1-2 (modules, dependencies/boundaries) ↔ D9 groups 1-2 (module-level SOLID + Package Principles) + structural classics; floor 4 + ceiling 8 (integration points, translation boundary) ↔ group 3 (Hexagonal/Boundaries). Drift to note: SSoT (floor 3) is semantic — outside D9 static scope, so data/state probing partly exceeds pure static detection (a judgment, not a grep).

### Closing step

- **Limits inventory** (two-level, see Operability limits below) — replaces an architectural premortem. Premortem fits uncertainty (product); code is a formal domain — limits are derived, not imagined.

### Adaptive depth

Depth by feature type: dig where the feature has weight, skip the empty. Taxonomy completeness is verified empirically on the first live-run; the composition may be adjusted by the result.

## Block C — integration analysis (the skill's core)

### Key insight: delta is a forecast, not a measurement

The feature is not yet in the code. "Impact on architecture" cannot be measured — only predicted: "if implemented as designed in block B, the graph changes thus." Consequences:

- **Block order is strict: B → C.** You cannot predict impact without designing the structure.
- arch-spec builds a **hypothetical graph** = current (from snapshot) + the feature's nodes/edges (from block B).

### Module level (not file level)

At the **file** level the task is nearly impossible (predicting non-existent imports). At the **module** level it is manageable: the current module graph is already in the snapshot (`per_module` metrics + `dep_graph`), the feature's module graph is block B's declaration, the merge is trivial (dozens of nodes, not hundreds).

**Operational definition of "module":** the feature's modules are declared **at the same granularity as `per_module` in the D8 snapshot** (in arch-audit, a directory-module at the `src/<module>/` level). This is mandatory for the merge: a new feature module = a new directory-module at the same level; a "feature-module → existing-module" dependency = an edge between nodes at that granularity. The implementer does not guess unit correspondence. **On green field (no snapshot to anchor to), use the directory-module level directly** (`src/<module>/`) — there is no `per_module` to match, and block C is not run anyway.

### Hybrid: code for structure, LLM for semantics (principle 2)

| Check | By | Type |
|---|---|---|
| New cycles | Graph traversal | Code |
| Dependency direction (SDP) | Recompute instability with new edges | Code |
| Coupling growth (NCCD) | Recompute, compare to current | Code |
| God object / hub thresholds | Threshold exceedance on links | Code |
| Violation of an existing fitness rule | New edge checked against forbidden list | Code |
| Boundaries at new seams | "Does it reach past the interface" — semantic judgment | LLM |
| Responsibility duplication | Graph can't see the feature does the same thing | LLM |
| Classifying a violation's outcome | Redo feature / refactor environment / accept debt | LLM |

**LLM-check input/output (no "magic here"):** input — the feature's module contracts from block B (responsibility, what it exports, what it depends on) + reason fields and labels of neighbour nodes from the D8 snapshot (what those modules are). Output — a verdict bound to a concrete edge/node of the hypothetical graph, in the **same form as an arch-audit finding** (violation type + reason + source/target). This keeps the LLM part in the same format as the formal part and operator-checkable.

**SSoT requirement (principle 4) — with the real state of arch-audit in mind:**

- **Metric formulas** (NCCD, Ca/Ce, instability) live in `hi_flow/skills/arch-audit/core/graph-core.ts` as pure functions and are **imported** from arch-audit, not rewritten. One metric, one formula.
- **Cycle detection is written anew, NOT imported from depcruise.** In arch-audit, cycles come from external depcruise output (`helpers/parse-depcruise-output.ts`, field `v.cycle`), which scans real files — it cannot run on the feature's hypothetical graph (no code yet). The delta graph uses a **new traversal algorithm** (`findCycles`, Tarjan SCC) in graph-core, over the snapshot's `dep_graph` + the feature's edges. New development, not extraction.

Concrete implementation: the **shared graph-core module** `hi_flow/skills/arch-audit/core/graph-core.ts` (BUILT, owner arch-audit per D7) — pure metric formulas (`computeNCCD`, `computeCoupling` for Ca/Ce, `instability` for I) + graph-traversal (`reachableFrom`, `findCycles`) over a declarative graph, imported by both skills. This was the upstream blocker per principle 10 (arch-spec block C live computation could not start until it merged). arch-spec imports graph-core as a tool; it does not reimplement it.

Honest cost of module level: boundaries are caught more weakly than a file-level audit (depcruise sees exact imports on files). "Violation of a known rule" is formal; "new suspicious seam" is LLM.

### Process (4 steps — a cycle, not a single pass)

1. **Build the graph delta** — overlay the feature's modules/edges (block B) onto the snapshot.
2. **Run the future graph through the principles** — cycles / boundaries / direction / God object / duplication.
3. **Classify each predicted violation:**
   - avoidable by redesigning the feature → back into block B (preferred);
   - unavoidable without refactoring the environment → signal up;
   - deliberately accepted → Known Drift (rare, on the record).
4. **Signal up (if step 3 hits a wall)** — simplify the product / arch-redesign the environment / accept debt.

## Operability limits (two-level inventory)

Replaces a premortem. Two-level — so as not to compute limits where there are none (an `actor_label` format won't "hit a wall"; a million requests/sec is unreachable for an ERP).

**Level 1 — cheap triage.** Per significant decision, a quick yes/no: does it touch an axis with a potential limit? Risk signals: growing data volume / hot path / external dependency / concurrency / resource cap. No signal → "limit not applicable", dig no further. Instantly filters out most decisions.

**Level 2 — only for those passing the filter.** Record the operability limit.

**Distribution across artifacts:**

| Piece | Where | Why |
|---|---|---|
| Decision + limit-assumption ("no partitioning, valid up to 1 year") | **Into the spec**, one line | The frame in which writing-plans writes the plan. Prevents over-engineering |
| Monitoring trigger (at > Y we approach the limit) | **product-backlog** | Not needed by the current implementation |
| Next step (partitioning / sharding) | **product-backlog** | Future work, not this feature |

writing-plans sees only the limit-assumption (the frame). "What to do beyond the limit" is deferred work in the form "on reaching Z, develop W".

## Output document (`arch-spec.md`)

### Cleanliness — consumer is writing-plans (an agent), not the operator

The spec body must be **cleaner than feature-spec** (which the operator reads): result only, no history of forks. Decisions as facts + one line of invariant rationale (why the rule, so it isn't broken) — but NOT the history of the choice (what was rejected). Escalation stays in the session; only the accepted decision lands in the document.

### Analysis blocks A-E → document sections

| Block | What | Document sections |
|---|---|---|
| **A. Input and starting state** | What was read, what we embed into | 1 (header), 3 (goal/boundaries), 4 (starting state) |
| **B. Target feature structure** | Modules, contracts, data, integration points | 5 |
| **C. Impact on architecture** | Graph delta, degradation, signal up | 6 |
| **D. Protecting implementation from drift** | Fitness invariants + delegated forks | 7, 8, 10 |
| **E. Presentation for a human** | Summary + visualization | 2 (Summary), 9 (graph) |

### Structure — 10 sections

1. **Header** — link to feature-spec, audit snapshot (sha + freshness), date, status (draft/signed), mode (green field / brown field).
2. **Summary** — compact summary of the feature's architectural principles. Anchor for the operator, **plain language** (P1). Mandatory.
3. **Goal and boundaries** — what is decided at the architectural level, what is delegated to implementation, what goes to backlog.
4. **Starting state** (block A) — what was read + what matters for integration (neighbours, boundaries, known problems). Green field → note it.
5. **Target feature structure** (block B) — floor: modules / contracts / data+SSoT / integration points; + conditional ceiling sub-sections by trigger (only the ones touched).
6. **Impact on architecture** (block C) — graph delta / degradation check against principles / signal up.
7. **Operability limits** — limits inventory (limit-assumptions; triggers + next steps → backlog).
8. **Fitness invariants** — list classified by mechanism. The graph part additionally exported as a rules-patch file alongside.
9. **Dependency graph** — Mermaid ego-graph of the feature's neighbourhood with delta highlighting.
10. **Delegated to implementation** — two sub-channels with opposed consumers:
    - **§10.1 Code-sight forks** → `writing-plans`. Explicit forks resolvable by reading the code (with the instruction "choose having seen the code, mind the constraint"). An open choice the implementer makes having seen the code.
    - **§10.2 Deployment-bound bindings** → a separate channel: a recommended default + the constraint + an explicit note "unblocks when the deployment model is fixed". NOT an open choice for `writing-plans` — it is bound to the deployment model, not to the code.

    **Separation test:** *Resolvable by reading the code? No → §10.2 (deployment-bound), not §10.1.*

    **Post-bootstrap boundary note:** §10.2 = bindings *inside an already-fixed axis* (a concrete scheduler, a concrete blob-backend); fixing the axis itself is bootstrap's job (D20, P8). Do not conflate "binding inside an axis" with "fixing an axis".

**No "open questions" section.** An open question is either resolved in-session (→ a fact in the spec) or deferred (→ product-backlog). No third place — otherwise deferred items smear across N files (feature-spec feedback lesson).

### Dependency graph — ego-graph of the feature

Mermaid renders poorly past ~30 nodes (product-spec D15 precedent). So the visualization shows **not the whole graph but the feature's neighbourhood** — the feature itself + modules it directly borders (radius 1-2). Usually 5-10 nodes. Highlight the delta: new modules/links in colour, existing neighbours grey. The full product graph is arch-audit's concern; arch-spec does not duplicate it. If the neighbourhood is large (rare), degrade: group neighbours by layer in subgraphs / radius 1 / text + partial graph.

**Mermaid regen rule.** Source of truth = the block B module/contract text. After any change to it, regenerate the Mermaid strictly from the text.

### Sample dialog — optional

For features with a non-trivial multi-module flow, a short "trace of the key flow" (action → bottleneck → store → overflow/retention → UI) shows the architecture in action, complementing the static graph. For simple features it is redundant — skip it.

### Output path

`<project>/docs/specs/YYYY-MM-DD-<feature-slug>-arch-spec.md` + a rules-patch file alongside (`<feature-slug>-rules-patch.yaml` or analogous). Configurable.

## Fitness invariants

### Primary consumer is implementation, not audit

Fundamental priority: if invariants go only to arch-audit, prophylaxis becomes "cure a day late" (code is written not knowing the invariants → audit catches it after the fact). Prophylaxis = the invariant reaches writing-plans **before** the code is written.

| Consumer | When | Role |
|---|---|---|
| **writing-plans → implementation** | now, when writing the feature | **prophylaxis** — code straight to invariants. Primary |
| **arch-audit** | later, on evolution | **safety net + anti-regression** — catches violations outside the plan and old invariants broken by new features. Secondary |

### Classification by check mechanism

| Type | What | Where |
|---|---|---|
| **1. Graph-formalizable** | Module dependencies: who may import whom | Into the spec **+ additionally** a rules-patch for arch-audit (auto-check) |
| **2. Code-content / schema** | SQL operations, payload contents, DB migration | Into the spec as an invariant + the named mechanism (test / lint / migration check) → built by writing-plans |
| **3. Dynamic** | Latency, error rates | Text requirement to monitoring, no enforcement (out of scope now, like D9 static-only) |

Whether something is graph-formalizable is the LLM's call when formulating (about imports, or about SQL). All types → into the design spec as explicit invariants with a stated mechanism (primary path, prophylaxis). The graph part is **additionally** exported as a rules-patch (secondary path, anti-regression).

**D9 reference scope.** A `principle` reference is **mandatory only for type-1 (graph)** invariants — they go to the rules-patch, where the D8 reason-field contract requires it. For **type-2 (code/schema) and type-3 (dynamic)** a D9 reference is **optional**: D9 is a static/structural library (cycles, boundaries, direction) and has no canonical id for things like table immutability or secret-filtering. Do NOT cargo-cult an ill-fitting principle (principle 6) — leave it blank (`—`) when D9 does not cover the invariant.

**Security-critical tag.** A security-critical invariant (secrets / PII / trust boundary — §5.7 triggers) carries the inline marker `[trust-chain review required — not diff-local]` on its §8 statement. This is a downstream signal to `writing-plans` / the reviewer: "matches the spec" is insufficient; the invariant needs adversarial review tracing the data flow past the diff boundary. arch-spec only **TAGS** — the review methodology is superpowers (D14), not hi_flow. (Motivating case: a secret-filter that does not recurse into arrays passes a diff-local check yet leaks secrets — caught only by tracing the trust-chain past the diff.)

### rules-patch format = same as arch-redesign (D11)

One consumer (`arch-audit apply-patch`), shared D11 contract. arch-spec **does not invent** its own format: YAML dependency rules, each with `name` / `severity` / `from`/`to` (or `required` invariant) / a mandatory `principle` reference to a D9 canonical id. Apply is an **explicit operator action**, not automatic. Reuse `references/rules-patch-template.yaml` (same as arch-redesign) — do not create a new format.

**Composition-root exemption (generation rule).** When generating type-1 "only X→Y" rules (the `from.path` allowlist via negative-lookahead), include composition-root paths in a **separate** `from.pathNot` so the wiring layer is legal. The composition-root path set (`src/main.ts` / `src/bootstrap/` / `src/composition/`) is a project-level baseline constant — reference the baseline definition if present, else use the default list; do not invent it per-feature (P8). `from.pathNot` is orthogonal to the `from.path` allowlist (AND-combined by depcruise), NOT folded into the lookahead. Without the exemption depcruise flags the composition-root — which by nature imports many modules — as a violator.

### Source

CC (cross-cutting policies) and P- (reusable sub-policies) from the feature-spec are ready candidates for fitness invariants; arch-spec formalizes them. Plus block B decisions. Each feature adds its graph rules to the cumulative rules file → future arch-spec (block C, "violation of a known rule") and arch-audit runs honour them. Each feature hardens the next one's defense (D11 cumulative cycle).

## Escalation (session mechanics, not a document section)

Escalation discipline — "when to bother the operator" — lives **in the session**, not in the output spec.

- **Foreseen** (forks visible by closure): the decision is either made (→ a fact in the spec) or delegated to implementation (→ section 10, with an instruction — §10.1 code-sight or §10.2 deployment-bound per the separation test). Inherits severity marking from feature-spec Open items.
- **Unforeseen** (surfaces during implementation): the general objective-impact criterion (UX / security / cost / maintenance → escalate with rationale; otherwise → implementer decides). arch-spec does not reinvent this criterion — it is in P6 and superpowers. Not written into each spec.

**Goal — minimize escalations through spec completeness.** An escalation during implementation is a signal that the spec failed to close something. Aim for zero (a quality metric of the spec).

## living-architecture decoupling

arch-spec is **decoupled** (variant 2, OQ6): it emits a spec with decisions as facts, **does not write to ARCHITECTURE.md**, and **does not know about** the `architecture` / living-architecture skill. The only link is the artifact (the spec) — weak coupling. If living-architecture is installed, it extracts decisions via its own event detection; if not (market-ready), the operator does so manually. There is no dependency on an unknown skill.

The single obligation: provide a clear point **"spec signed = decisions are final"**, so any future consumer has a stable moment of pickup. Feature-level decisions go to the project's ARCHITECTURE.md (via living-architecture, not via this skill); decisions about hi_flow itself are a separate meta-session concern.

## Closure backlog-sync

Deferred items (next architectural steps from Operability limits, open questions for other/higher levels) go to **product-backlog** (an external file), **not into the spec**. At closure, arch-spec gathers the deferred items and **proposes adding them to product-backlog** (a patch for approval, not silently).

The mechanism is the shared family **backlog-integration** mechanism — `hi_flow/references/backlog-integration.md` (the same one feature-spec uses as a bottom-up contributor). arch-spec follows it **by name** and does not restate the algorithm; read that reference for the generic flow (detect → dedup → idempotency → patch + approval → create-if-missing).

**Dependency (satisfied, principle 10):** the backlog-integration mechanism is implemented as a shared family artifact at `hi_flow/references/backlog-integration.md` (D22). Read it as the source of truth for the generic flow — reference it by name; do not restate or fabricate its details.

### arch-spec harvest sources (what this skill supplies to the mechanism)

The mechanism is consumer-agnostic — arch-spec must declare its own structural anchors for backlog-bound items (just as feature-spec declares its DEFERRED forks / `**Backlog:**` blocks / tags). arch-spec's anchors:

1. **§7 Operability limits** — for each limit-assumption that passed triage, its monitoring trigger + next step ("on reaching Z, develop W") → `classification: parked`; `local_ref: §7 / <limit>`.
2. **§3 Goal and boundaries** — items explicitly marked deferred (open questions delegated to other / higher levels) → `parked`; `local_ref: §3 / <item>`.
3. **Inherited** — feature-spec "Open items" routed here by the severity sort below (the nice-to-have / operational / discipline rows).

**Slug derivation:** feature-slug from the spec filename (`YYYY-MM-DD-<feature-slug>-arch-spec.md` → `<feature-slug>`); the operator confirms. Same feature as feature-spec, so records group together in the backlog.

For each item supply the harvest contract (`local_ref`, `classification`, `name`, plus proposed `level` / `reason` / `carry-over` — finalized at approval). classification is predominantly `parked` (architectural next-steps); `rejected` / `deferred-fork` are atypical for arch-spec.

### Sorting feature-spec deferred items (severity → destination)

The feature-spec "Open items at closure" table mixes severities. Sort each row deterministically — do not decide ad-hoc:

- **blocker (for arch-spec)** → must be CLOSED in this spec (§5-8), never deferred.
- **желательно / RESOLVED-direction** → split by the separation test: code-sight fork → §10.1; deployment-bound binding → §10.2; else → §3 (deferred-pointer).
- **nice-to-have / operational / discipline** → product-backlog.

## Operational rules — what the skill enforces

1. **Extract before probing.** The first session step is reading the feature-spec and pulling out ready-made architectural decisions, not asking questions. Probe only the gaps in the architectural layer.
2. **B before C, always.** Never predict integration impact before the feature's structure is designed.
3. **Block C only on a fresh, schema-valid snapshot.** No snapshot / stale / broken on brown field → loud signal, never silent degradation (principle 5).
4. **Module granularity matches the snapshot.** Feature modules are declared at the same `per_module` granularity as the D8 snapshot, so the delta merge holds.
5. **Decisions as facts.** The spec body carries the result + one line of invariant rationale, never the history of rejected alternatives.
6. **Derivability gate on every decision.** Each architectural decision passes the three-criteria filter; product decisions belong in feature-spec, not here.
7. **Deferred goes to backlog, not the spec.** No "open questions" section; deferred items go to product-backlog via the backlog-integration mechanism.
8. **Escalation, not restart.** When ambiguity cannot be resolved from data, escalate to the operator — do not restart an upstream skill. Minimize escalations through completeness.
9. **rules-patch is a candidate, never auto-applied.** Apply is an explicit operator action via `arch-audit apply-patch` (D11).

## Self-Review (via isolated subagent, P5)

After writing, dispatch a fresh subagent (Agent tool) to review the spec with **isolated context** — no conversation history. The main agent spent the whole session immersed and is subject to confirmation bias. Pass the subagent the spec path + the rules-patch path + the checklist below.

Checklist:

- Floor categories (1-4) covered.
- Ceiling sub-sections present for every triggered condition.
- Fitness invariants are actionable (checkable), not abstract; each has a stated mechanism + a D9 reference.
- Delta (block C) checked against the principles; violations classified (redo feature / refactor environment / accept debt).
- Decisions are derivable from the feature-spec (no "invented" architecture without a product root) — three-criteria gate.
- No meta / reasoning history in the spec; decisions as facts + a rationale line.
- Operability limits recorded for those that passed triage; triggers + next steps went to backlog, not the spec.
- Summary is plain language (P1).
- rules-patch valid (D11 format; `principle` references exist in the D9 library; rule names trace to invariants).
- Mermaid ego-graph regenerated from the block B text (source of truth = text); no drift.

Apply safe fixes inline. Human-required findings → flag to the operator. **No re-review.**

After self-review fixes, present to the operator (User Review Gate): «Arch-spec written to `<path>`, rules-patch (not applied) to `<patch-path>`. Review and tell me if you want changes before we move to writing-plans.» If changes — apply + re-run Self-Review. Only after approval — closure and the transition offer to `superpowers:writing-plans`.

## Anti-patterns

- **Re-scanning the project graph.** arch-spec takes the ready D8 snapshot and reasons only about its feature's delta. It does not duplicate the audit machinery (audit looks at the whole existing graph; arch-spec overlays the feature onto the ready map).
- **Re-opening product decisions.** If the feature-spec already answered it, do not re-ask. Extract, then probe gaps only.
- **File-level integration analysis.** The hypothetical graph is module-level; file-level is unworkable (predicting non-existent imports).
- **Inventing architecture.** Every decision must pass the derivability gate. No structure without a product root.
- **Padding ceiling categories.** Probe only triggered qualities. An untouched category is a normal empty result, not a hole to fill — padding breeds hallucination.
- **Building enforcement.** arch-spec declares invariants and names the check mechanism; it does not build checks. rules-patch is applied by the operator (D11), tests by writing-plans, gates by L3 hygiene.
- **Writing to ARCHITECTURE.md.** Decoupled (variant 2). The spec is the only output; pickup into living docs is someone else's job.
- **Logging the reasoning in the document.** The spec is the result, not the process. Rejected alternatives and escalation history stay in the session.

## References

- `references/arch-spec-template.md` — arch-spec.md output structure (10 sections + ego-graph skeleton).
- `references/self-review-checklist.md` — checklist for the isolated review subagent.
- `references/rules-patch-template.yaml` — rules-patch output structure (reused from arch-redesign / D11 — same format, do not invent a new one).
- `hi_flow/references/architectural-principles.md` — shared D9 library (principle catalog; owner — arch-audit). Source of `principle` ids for invariants and rules-patch.
- `hi_flow/skills/arch-audit/references/d8-schema.md` — D8 snapshot schema (audit-report format consumed for block C).
- **Shared graph-core** — `hi_flow/skills/arch-audit/core/graph-core.ts` (BUILT, owner arch-audit per D7). Pure metric formulas (`computeNCCD`, `computeCoupling` for Ca/Ce, `instability` for I) + declarative-graph traversal (`reachableFrom`, `findCycles`). Block C imports these for its live delta computation; this skill does not reimplement them.
- **backlog-integration** (shared family mechanism, `hi_flow/references/backlog-integration.md`, D22) — closure backlog-sync follows it by name.
