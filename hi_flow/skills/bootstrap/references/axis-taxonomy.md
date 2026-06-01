# bootstrap — Axis Taxonomy

The working vocabulary of `bootstrap`. An **axis** is one infrastructure leaf the skill probes, scaffolds, and wires. This file fixes the fixed set of axes, how they are sliced, what is explicitly *not* an axis, and how each is classified per run.

Operator-facing options are rendered at runtime in the operator's language. This source file is English; engineering terms appear in parentheses where the plain name differs.

---

## The 8 infrastructure axes

| Axis (plain) | Engineering term |
|---|---|
| language & runtime | runtime |
| database | relational / primary state store |
| interface / frontend | UI |
| file storage | object storage / blob |
| task scheduler | scheduler |
| message queues | messaging |
| cache | cache |
| search | search |

This set is **fixed in the coverage-manifest**. A new axis appears only when a technology category with its own scaffold appears — not before. What grows over time is *coverage within an axis*, not the number of axes.

---

## Operational slicing criterion

**One axis = one technology category with one scaffold-template + one coverage set + one tooling-wire.**

Axes are sliced by "does it need its own scaffold and coverage", not by conceptual umbrellas. Consequence:

- `database` (e.g. Postgres) and `file storage` (e.g. S3) are **separate leaf-axes** — different technologies, different scaffolds, different coverage rows. They are not collapsed into a shared `persistence` umbrella.
- The axis name is a concrete leaf in plain language, not an abstract category.

A new axis enters the set only when a tech-category with its own scaffold-template arises. Until then, the set above is exhaustive.

---

## Axes ≠ toolchain components (critical)

The 8 leaves above are the only things with their own scaffold-template + coverage row, and the only things probed as axes.

**Toolchain components** — linter, formatter, test-runner, CI, arch-audit-config — are **wire sub-steps** bound to the `language & runtime` axis (delivered by Function 3). They are NOT standalone axes:

- they have no scaffold-template and no coverage row of their own;
- they are not probed as axes;
- they are configured from a baseline at the **wire** step of the runtime axis.

Where other docs mention "product-independent axes", that means the runtime axis + its toolchain-wire — one infrastructure axis plus its wiring, not a separate set of axes.

`probe-class` (below) is a property applicable to both axes and toolchain components, but an "axis" in the atom sense is only an infrastructure leaf.

---

## probe-class per axis

`probe-class` governs how the skill proposes a technology for the axis.

| probe-class | Axes / components | probe behaviour |
|---|---|---|
| **buy-in** | language & runtime, interface / frontend, database, file storage | recommended default + translation into product consequences + operator confirmation |
| **buy-in lite** | task scheduler, message queues, cache, search | product/cost consequences exist but surface rarely — lighter confirmation |
| **silent-baseline** | toolchain components (linter, formatter, test-runner, CI, arch-audit-config) | fixed silently from baseline; operator may contest. Applies only on **full** coverage — a partial/missing baseline raises a loud signal, never silence |

**buy-in degeneration at coverage = 1:** while an axis has only one covered technology (currently `language & runtime` = TypeScript only), buy-in collapses to an *informing confirmation* — there is no choice, only "here is what the plugin delivers end-to-end, ok?". Real choice with product translation activates once coverage for the axis exceeds 1. Do not fake a choice that does not exist.

---

## Run classification

For a given run, every axis is classified explicitly — no padding, but no silence either:

- **forced-now** — fixed in this run (probe → scaffold → wire).
- **delegated** — the runtime is fixed, but the concrete binding is deferred (until a deployment model is fixed). Self-sufficient meaning until the infra/deployment-bound consumer exists.
- **not-touched** — not needed; skipped explicitly. Never invented ("probably needs a DB") — that violates the no-silent-fallback principle.
