# arch-spec — Self-Review Checklist

For an **isolated subagent** (Agent tool), no conversation history. The main agent spent the whole session immersed in the design and is subject to confirmation bias; a fresh reader is more objective.

**Pass the subagent:** the arch-spec.md path + the rules-patch path + this checklist. **Task:** find problems, do NOT fix. Return a structured verdict.

---

## Coverage

- [ ] Floor categories (1-4) covered: module breakdown, dependencies & boundaries, data & state (SSoT), integration points.
- [ ] Ceiling sub-sections present for **every triggered** condition — and absent for untouched ones (no padding). Each present one names its trigger.
- [ ] If brown field + fresh snapshot: block C (Impact on architecture) is filled. If green field: block C explicitly marked "not applicable — green field". If brown field + no snapshot: block C marked "skipped, no snapshot" with a logged reason (never silently empty).

## Derivation & cleanliness

- [ ] Every architectural decision is **derivable from the feature-spec** (three-criteria gate: non-domain + structural + critical). No invented architecture without a product root.
- [ ] No product decisions re-opened that the feature-spec already answered.
- [ ] Spec body carries **decisions as facts** + at most one line of invariant rationale. No history of rejected alternatives, no escalation log, no reasoning trace.
- [ ] **No "open questions" section.** Deferred items went to product-backlog (closure backlog-sync), not into the spec.

## Block C — integration analysis

- [ ] Block order respected: B (structure) precedes C (impact).
- [ ] Delta reasoning is at **module level**, modules declared at the snapshot's `per_module` granularity.
- [ ] Predicted violations are **classified**: avoidable by feature redesign / unavoidable without environment refactor / deliberately accepted (Known Drift).
- [ ] Formal checks (cycles, direction/SDP, NCCD, thresholds, known-rule violation) vs LLM checks (boundaries at new seams, duplication, outcome classification) are separated; LLM verdicts bound to a concrete edge/node.

## Fitness invariants

- [ ] Invariants are **actionable / checkable**, not abstract labels.
- [ ] Each invariant has a **stated check mechanism** (graph→rules-patch / code-schema→test|lint|migration check / dynamic→monitoring text).
- [ ] Each **type-1 (graph)** invariant references a **D9 canonical principle id** (mandatory — it goes to the rules-patch). Type-2/type-3 reference a D9 id **only if one genuinely fits** (D9 is static/structural; `—` is correct for table immutability, secret-filtering, etc. — no cargo-culting an ill-fitting id).
- [ ] Graph-formalizable invariants are **additionally** exported to the rules-patch.

## Operability limits

- [ ] Limits recorded only for decisions that **passed the risk triage** (no fabricated limits for stable decisions).
- [ ] For each recorded limit: limit-assumption → in the spec; monitoring trigger + next step → product-backlog (not the spec).

## rules-patch validity

- [ ] D11 format (forbidden / required; name, severity from the normalized enum, from/to or description, principle).
- [ ] Every `principle` reference **exists** in the D9 library.
- [ ] Rule `name`s **trace** to fitness invariants in the spec.
- [ ] Only type-1 (graph) invariants are in the patch; type-2/3 are not.

## Presentation

- [ ] **Summary** is plain language (P1) — operator-facing anchor, no engineering jargon left unexplained.
- [ ] Mermaid is an **ego-graph** (feature + radius 1-2 neighbours, delta highlighted), regenerated from the block B text (source of truth = text; no drift).

---

**Output format:** for each failed item — section + what is wrong + severity (LOW/MED/HIGH). Safe-to-autofix → the main agent applies inline. Human-required → flag to the operator. No re-review.
