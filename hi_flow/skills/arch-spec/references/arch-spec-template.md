# Template: arch-spec.md

Output structure for `hi_flow:arch-spec`. The agent fills this in; the consumer is `superpowers:writing-plans`.

**Cleanliness rule:** decisions as facts + at most one line of invariant rationale. NO history of rejected alternatives, NO reasoning trace, NO escalation log. The body must be cleaner than a feature-spec (its reader is an agent, not the operator).

**Illustrative examples in this template are inside fenced blocks** so the closure backlog-scan does not pick them up. Replace `<...>` placeholders; delete example comments.

Section numbers below match SKILL.md exactly (10 sections). They map to analysis blocks A-E: A = §1,3,4 · B = §5 · C = §6 · D = §7,8,10 · E = §2,9.

---

```markdown
# <Feature name> — Architecture Spec

## 1. Header

**Feature-spec:** <path to the signed feature-spec.md>
**Audit snapshot:** <path to audit-report.json> · audit_sha=<...> · freshness: <fresh | N commits behind | none>
<!-- Fullstack: one **Audit snapshot:** line PER touched tree, prefixed `(<tree>)` — e.g. `**Audit snapshot (api):** ...` and `**Audit snapshot (web):** ...` -->
**Date:** YYYY-MM-DD
**Status:** draft | signed
**Mode:** green field | brown field
<!-- Fullstack: per-tree — e.g. `**Mode:** api: brown field · web: green field` -->

## 2. Summary

<Plain-language anchor for the operator (P1) — 1-2 paragraphs. The architectural shape of the feature in product terms: what modules appear, how they connect, the one or two invariants that matter most. The operator reads THIS, not the whole spec. No engineering jargon left unexplained. Written last by the agent — distills §4-§8.>

## 3. Goal and boundaries

- **Decided at the architectural level:** <one line each>
- **Platform ports (cross-cutting capabilities owned here):** <port name — capability — consumers-per-roadmap (feature X, Y); contract designed one notch wider than single-consumer YAGNI. Include ONLY when a floor-2 port triggered the shared-capability lookahead (roadmap/backlog names other consumers / ARCHITECTURE infra-constant / orthogonal to domain); omit the bullet entirely otherwise. Awareness marker — no registry (D26).>
- **Delegated to implementation:** <forks left for writing-plans — see §10>
- **Deferred (→ product-backlog):** <pointer; full items synced to backlog at closure, not listed here>

## 4. Starting state

<What was read: feature-spec, audit snapshot, Module Map, D9. What matters for integration: neighbouring modules, boundaries, known problems nearby.>

> Green field → "Clean field — no existing architecture to embed into; block C (§6) not applicable."
<!-- Fullstack: note per tree — e.g. "web: clean field; api: brown — neighbours X, Y." -->

## 5. Target feature structure

### 5.1 Module breakdown
<Modules the feature splits into, by responsibility. Granularity = `per_module` of the audit snapshot (directory-module, `src/<module>/`). Green field: no snapshot — use the `src/<module>/` directory-module level directly. Fullstack: tag each module with its tree (bare name + `tree: web|api`).>

### 5.2 Contracts between modules
<For each module: input / output / side effects / error handling.>

### 5.3 Data and state
<Schema (DDL where applicable). Where state lives. Single owner (SSoT).>

### 5.4 Integration points
<Where the feature attaches to existing code.>

<!-- Conditional ceiling sub-sections — include ONLY those the feature triggers, drop the rest: -->
### 5.5 Failure modes & resilience    <!-- trigger: external dependency / error-prone path -->
### 5.6 Load & scale                  <!-- trigger: growing volume / hot path -->
### 5.7 Security & data boundaries     <!-- trigger: secrets / PII / access control -->
### 5.8 Translation boundary (ACL)     <!-- trigger: semantic mismatch with foreign/legacy subsystem -->
### 5.9 Consistency & idempotency       <!-- trigger: multiple stores / repeatable ops / concurrency -->
### 5.10 Contract/schema evolution      <!-- trigger: changes a shared consumed contract -->
### 5.11 Presentation / UI architecture    <!-- trigger: user-facing surface -->
<!-- Component/state architecture of the surfaces, derived from the feature-spec «Поверхности (UX)» section (UX layers 1-2): component/module breakdown per surface, state-management structure, surfaces → modules mapping.
Boundary: this does NOT redefine the UX (layers 1-2 are consumed as a given — two-designers test, D25); visual style (pixels/components-look) is the designer's job downstream, NOT fixed here. -->

## 6. Impact on architecture

> Brown field only. Green field → "Not applicable — clean field."

- **Graph delta:** <new modules, new edges, shifted boundaries vs the snapshot>
- **Degradation check (against D9 principles):** <per predicted violation — new cycles? boundary blur? dependency direction? God object? duplication?>
- **Signal up (if it does not sit cleanly):** <simplify product → feature-spec | refactor environment → arch-redesign | accept debt → Known Drift>

<!-- Fullstack: split into per-tree sub-sections — `### Integration — api` and `### Integration — web`, each with its own Graph delta + Degradation check (the "Brown field only" gate is per-tree: a green tree → "Not applicable — clean field for <tree>"). `Signal up` stays ONE shared bullet for the whole feature. -->

## 7. Operability limits

<Only decisions that passed the risk triage. For each:>
- **<decision>:** valid up to <limit-assumption>. <one line>

> Monitoring triggers and next steps (partitioning, sharding, ...) → product-backlog, NOT here.

## 8. Fitness invariants

| # | Invariant | Mechanism | D9 principle |
|---|---|---|---|
| 1 | <statement> | graph (→ rules-patch) | <principle-id> (mandatory) |
| 2 | <statement> | code/schema (test / lint / migration check) | <principle-id or —> |
| 3 | <statement> | dynamic (monitoring, no enforcement) | — |
| 4 | <security-critical statement> `[trust-chain review required — not diff-local]` | code/schema (test / lint) | <principle-id or —> |

> Graph-formalizable invariants (mechanism = graph) are additionally exported to `<feature-slug>-rules-patch.yaml`.
> **D9 reference is mandatory only for type-1 (graph).** D9 is a static/structural library; type-2 (code/schema, e.g. table immutability, secret-filtering) and type-3 leave it `—` unless a principle genuinely fits. Do not cargo-cult an ill-fitting id.
> **Security-critical tag.** Append the inline literal `[trust-chain review required — not diff-local]` to the invariant statement (inside the `Invariant` cell — the table stays 4 columns, do NOT add a column) when the invariant is security-critical: secrets / PII / trust boundary (§5.7 triggers). It is a downstream signal to writing-plans / reviewer — "matches the spec" is insufficient; the invariant needs adversarial review tracing the data flow past the diff boundary. The tag is a SIGNAL only, not a review implementation: the review methodology lives in superpowers (D14), not hi_flow.
> **Tree tag (fullstack).** A graph-type (type-1) invariant carries its tree INLINE in the Invariant cell — e.g. `<statement> [tree: web]` — like the security tag. The table stays 4 columns; do NOT add a Tree column. The tag routes the invariant to its tree's rules-patch.

## 9. Dependency graph

<Ego-graph: the feature + modules it directly borders (radius 1-2). New nodes/edges highlighted, existing greyed. Regenerate strictly from §5 text on any change.>

<!-- Fullstack: two ego-subgraphs in ONE mermaid block — `subgraph FEATURE-web` and `subgraph FEATURE-api`, each with its tree's new + neighbour nodes. Disjoint, so no edges cross between them. Stay within the ~30-node ego budget per tree. -->

​```mermaid
graph TD
    subgraph FEATURE["<feature-name> (new)"]
        FM1["<feature-module-1>"]
        FM2["<feature-module-2>"]
    end
    EX1["<existing-neighbour-1>"]
    EX2["<existing-neighbour-2>"]

    FM1 --> EX1
    EX2 --> FM1
    FM1 --> FM2

    classDef new fill:#d4f8d4,stroke:#22aa22,stroke-width:2px;
    classDef existing fill:#eeeeee,stroke:#999999;
    class FM1,FM2 new;
    class EX1,EX2 existing;
​```

## 10. Delegated to implementation

### 10.1 Code-sight forks

<Explicit forks left for writing-plans. For each: "Choose <X> having seen the code; mind <constraint Y>." Instructions to the implementer, not unresolved gaps. These are resolvable by reading the code.>

### 10.2 Deployment-bound bindings

<Bindings inside an already-fixed infra axis (concrete scheduler, concrete blob-backend) that depend on the deployment model, NOT on reading the code. For each: recommended default + constraint + "unblocks when the deployment model is fixed." NOT an open choice for writing-plans — a recommendation with an explicit unblock condition, not a fork.>

<!-- OPTIONAL, only for a non-trivial multi-module flow — append after §10, no separate number: -->
## Key-flow trace (optional)

<A short trace showing the architecture in action, e.g.: action → bottleneck → store → overflow/retention → UI. Skip for simple features.>
```

---

## Filling notes (not part of the output)

- **No "open questions" section** in the output. An open question is either resolved in-session (→ a fact above) or deferred (→ product-backlog via closure backlog-sync).
- **rules-patch is a separate file** (`<feature-slug>-rules-patch.yaml`), not embedded. §8 lists all invariants; the patch carries only the graph-formalizable subset.
- **Ego-graph, not the whole product graph.** Past ~30 nodes Mermaid degrades; show only the neighbourhood. The full graph is arch-audit's concern.
- **§10 split — separation test.** Routing a delegated item to §10.1 vs §10.2: "Resolvable by reading the code? No → §10.2 (deployment-bound), not §10.1." Code-sight forks (choose having seen the code) → §10.1. Deployment-bound bindings (resolved by knowing the deployment model) → §10.2. **Post-bootstrap boundary:** §10.2 covers bindings *inside an already-fixed axis* (concrete scheduler, concrete blob-backend) — NOT fixing the axis itself. Fixing an infra axis is bootstrap's job (D20, P8); do not confuse "binding within an axis" with "fixing an axis."
