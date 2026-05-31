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
**Date:** YYYY-MM-DD
**Status:** draft | signed
**Mode:** green field | brown field

## 2. Summary

<Plain-language anchor for the operator (P1) — 1-2 paragraphs. The architectural shape of the feature in product terms: what modules appear, how they connect, the one or two invariants that matter most. The operator reads THIS, not the whole spec. No engineering jargon left unexplained. Written last by the agent — distills §4-§8.>

## 3. Goal and boundaries

- **Decided at the architectural level:** <one line each>
- **Delegated to implementation:** <forks left for writing-plans — see §10>
- **Deferred (→ product-backlog):** <pointer; full items synced to backlog at closure, not listed here>

## 4. Starting state

<What was read: feature-spec, audit snapshot, Module Map, D9. What matters for integration: neighbouring modules, boundaries, known problems nearby.>

> Green field → "Clean field — no existing architecture to embed into; block C (§6) not applicable."

## 5. Target feature structure

### 5.1 Module breakdown
<Modules the feature splits into, by responsibility. Granularity = `per_module` of the audit snapshot (directory-module, `src/<module>/`). Green field: no snapshot — use the `src/<module>/` directory-module level directly.>

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

## 6. Impact on architecture

> Brown field only. Green field → "Not applicable — clean field."

- **Graph delta:** <new modules, new edges, shifted boundaries vs the snapshot>
- **Degradation check (against D9 principles):** <per predicted violation — new cycles? boundary blur? dependency direction? God object? duplication?>
- **Signal up (if it does not sit cleanly):** <simplify product → feature-spec | refactor environment → arch-redesign | accept debt → Known Drift>

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

> Graph-formalizable invariants (mechanism = graph) are additionally exported to `<feature-slug>-rules-patch.yaml`.
> **D9 reference is mandatory only for type-1 (graph).** D9 is a static/structural library; type-2 (code/schema, e.g. table immutability, secret-filtering) and type-3 leave it `—` unless a principle genuinely fits. Do not cargo-cult an ill-fitting id.

## 9. Dependency graph

<Ego-graph: the feature + modules it directly borders (radius 1-2). New nodes/edges highlighted, existing greyed. Regenerate strictly from §5 text on any change.>

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

<Explicit forks left for writing-plans. For each: "Choose <X> having seen the code; mind <constraint Y>." Instructions to the implementer, not unresolved gaps.>

<!-- OPTIONAL, only for a non-trivial multi-module flow — append after §10, no separate number: -->
## Key-flow trace (optional)

<A short trace showing the architecture in action, e.g.: action → bottleneck → store → overflow/retention → UI. Skip for simple features.>
```

---

## Filling notes (not part of the output)

- **No "open questions" section** in the output. An open question is either resolved in-session (→ a fact above) or deferred (→ product-backlog via closure backlog-sync).
- **rules-patch is a separate file** (`<feature-slug>-rules-patch.yaml`), not embedded. §8 lists all invariants; the patch carries only the graph-formalizable subset.
- **Ego-graph, not the whole product graph.** Past ~30 nodes Mermaid degrades; show only the neighbourhood. The full graph is arch-audit's concern.
