# Backlog Integration — hi_flow Shared Mechanism

**Version:** v1
**Last updated:** 2026-05-31
**Owner:** `hi_flow:product-spec` (steward of the product-backlog per D17 — creates it, owns its structure/template).
**Consumers:** `hi_flow:feature-spec` (bottom-up harvest of its deferred / parked items), `hi_flow:arch-spec` (closure backlog-sync). Consumer-agnostic — any downstream skill that needs to contribute deferred items to a product-backlog follows this mechanism **by name**.

Generic mechanism for contributing deferred / parked / rejected items into a product-level backlog at a skill's closure. It defines **how** a downstream skill detects, dedups and patches the backlog — **not** what counts as deferred (that is the consumer's harvest sources) and **not** the record format (that is `product-backlog-template.md`, owned by product-spec).

This reference is the single home of the contribution *algorithm* (Approach B, D22). Consumers reference it by name and supply only their own harvest sources; they do not restate the algorithm.

---

## Scope and boundaries

- **This reference owns** the contribution *algorithm*: detect → harvest contract → dedup / merge → idempotency → classify → patch + approval → create-if-missing → iteration-index discipline.
- **The consumer owns** its harvest sources (which structural anchors mark deferred items in its artifact), slug derivation, and the scan-validate scope. See the consumer skill's "Backlog sync at closure" section.
- **`product-backlog-template.md` owns** the record format of each backlog section. This mechanism reads it as the format authority; it never duplicates field definitions as normative.

**SSoT (global principle 4):** the decision detail stays in exactly one place — the consumer's spec (the originating fork / decision). The backlog gets a pointer-with-summary via `Originating analysis`. No third copy, no separate register section in the spec.

---

## The harvest contract (what a consumer supplies)

A consumer plugs into this mechanism by supplying four things:

1. **A harvest set** — a list of backlog-bound items collected from the consumer's own structural anchors. Each item:

   ```
   {
     local_ref,            // local pointer to the originating node: "§ <fork-id>" or a normalized name
     classification,       // parked | deferred-fork | rejected  (consumer hint → target section)
     name,                 // short feature/item name
     proposed_level?,      // detailed | partial | note | fragment  (parked only)
     proposed_reason?,     // reason for parking / deferring / rejecting
     proposed_carry_over?, // carry-over target (e.g. "iter2+", "post-conversion")
     description?          // optional, for note/partial level
   }
   ```

   The fields after `classification` are **proposals**: the operator confirms or edits them at approval (step 7). They are **not** required to be present inline in the consumer's artifact — only the structural anchor (the find-er) must be inline. This keeps rigid backlog syntax out of the operator's natural authoring style.

2. **The final spec path** — the written path of the consumer's artifact, for the `Originating analysis` pointer. Known only after the artifact is written (hence backlog-sync runs at the end of closure).

3. **Slug derivation** — consumer-specific. Used for the record ID (`F-<slug>-X-<suffix>`) and the no-backlog filename. No guessing — the operator confirms at approval.

4. **(Optional) a scan-validate scope** — which operator-content sections of its artifact to fuzzy-scan for unmarked deferral prose, and what to exclude (always at least fenced code blocks). The hybrid safety net (step 2).

---

## Algorithm

Run at the **very end** of the consumer's closure — **after** the artifact is written, self-reviewed, and approved by the operator (User Review Gate). Rationale: the deferred set is stable and the final spec path is known (needed for the pointer).

1. **Harvest** (consumer-supplied). Collect the harvest set from the consumer's anchors. **Sub-node rule:** harvest only the marked node itself; do not recurse into children. A marked container fork (e.g. `F1` with `F1.1`–`F1.6`) migrates as **one** item — children are not multiplied into separate records. If a specific child is marked separately (e.g. `F4.5`), migrate that child. **List-anchor cardinality:** when the anchor is a bulleted list (e.g. a `**Backlog:**` block), **each bullet is one record** — a 3-bullet block yields 3 records (real case: F4.2's block → `F-audit-X-category-filter` + a second item). This is distinct from the sub-node rule (which concerns nested forks, not list items).

2. **Scan-validate** (safety net, consumer-scoped). Fuzzy-scan the consumer's operator-content for deferral prose ("backlog" / "отложен") with **no** structural anchor → surface discrepancies to the operator: «F5 mentions backlog in its Resolution but isn't marked — add to the transfer?». Operator decides per item. **Exclude fenced code blocks of any fence form** — bare ` ``` ` and info-string fences alike (e.g. ` ```markdown `) — so example / template prose that contains the word "backlog" does not produce false hits. For newly authored artifacts the scan is insurance; for legacy artifacts (written before structural markers existed) it is the main path for unmarked prose.

3. **Dedup / merge.** One item may surface from two anchors at once (real case: a feature that is both a `DEFERRED` fork **and** an `Out of scope` line — the same feature). Merge duplicates by key `(local_ref OR normalized name)` into one record before classification — otherwise the backlog gets two records for one feature. **Name normalization:** match names case-insensitively and trimmed of surrounding whitespace. **Ref precedence on merge:** if one occurrence carries a fork-id `local_ref` (e.g. `§ F4.5`) and another only a name, the merged record keeps the **fork-id** ref — the canonical idempotency key (step 6) must be fork-id-based, not name-based. Cross-language or non-obvious name matches (e.g. "Export CSV" vs "Экспорт CSV") are **not** auto-merged — surface them to the operator at approval (step 7).

4. **Classify.** `parked` capability → **Parked features**; `deferred-fork` → **Deferred strategic forks**; `rejected` (consumer tagged it as a hard rejection with an explicit reason) → **Out-of-scope (rejected)**. A bare scope boundary with no tag is **not** transferred — it is just a boundary, not backlog-bound.

5. **Detect backlog.** Glob `*backlog*.md` across the project — collect matches from `docs/specs/`, `docs/`, and the project root (paths overridable by config if the consumer/project sets one), then count the **total**. 1 match → use it; ≥2 → ask the operator which one (do not guess); 0 → No-backlog flow (step 8). The path list is for coverage, not first-hit-wins.

6. **Idempotency check.** Before rendering the patch, compare harvest items against existing backlog records.
   - **Exact key** — `Originating analysis: <spec-path> § <local_ref>`. Reliably present in downstream-contributor records, so a re-run over the same closed spec matches its own prior records and **skips** them (no duplicate). Content differs on an exact match → propose updating that record.
   - **Pathless / freeform records** — roughly half of real backlog records are product-spec's own parked items whose `Originating analysis` has **no** `<spec-path> § <ref>` shape (e.g. `§ F-pipeline-1 "..."`, or freeform `обсуждение в Шаге 3`, `Sf2 RESOLVED`). These never exact-match. For them, fall back to a **case-insensitive name** comparison and **surface** any potential cross-provenance duplicate to the operator at approval (step 7) — **never silent-skip, never silent-add**.
   This protects against duplicates on a re-run over an already-closed spec (likely after edits at the User Review Gate) without silently colliding with product-spec's pathless records.

7. **Build patch + approval.** Read `product-backlog-template.md` (product-spec catalog) as the format authority. For each new item, render the backlog record (see **Backlog entry mapping**), **proposing** level / carry-over / reason (the operator confirms or edits — these were not required inline). Show the patch: what gets appended and to which section. **Never write silently.** Approved → Edit the backlog (append into the right sections); edits → apply them; refusal → leave the deferred items in the spec as-is.

8. **No-backlog flow.** Report «backlog not found». Offer to create one from `product-backlog-template.md` (see **No-backlog flow**). Refusal → the deferred items stay in the spec; tell the operator they can be transferred later (via product-spec or manually).

9. **Iteration index untouched.** A downstream consumer does not own iterations: appending to an existing backlog never edits the Iteration index; on creation it stays empty per template (product-spec fills it on its first run).

**No in-spec breadcrumb.** The canonical link is `Originating analysis` in the backlog. A reverse spec→backlog link is **not** written (prone to going stale). Confirmation to the operator is in chat.

---

## Backlog entry mapping

Format authority: `product-backlog-template.md`. The shapes below illustrate the mapping; the template is the source of truth for exact fields.

A harvest item maps to a record in its target section:

**Parked feature** (flat records in "Parked features", no `### Фича:` grouping): render per the **"Parked features" entry in `product-backlog-template.md`** — that template is the single source of the field set (`Status` / `Originating analysis` / `Reason for parking` / `Carry-over candidate for` / `Описание`). Do not restate the fields here (SSoT, Approach B). The consumer-specific bits:

- **Pointer expansion.** The local `§ F4.5` from the marker expands to `Originating analysis: <final spec path> § F4.5`. The path is known at step 7 (the spec is already written).
- **ID convention.** `F-<feature-slug>-X[-<suffix>]` — `-X` marks parked (not committed); `-<suffix>` is an **optional** short kebab tag to disambiguate several parked items from one feature (`F-audit-X-export`, `F-audit-X-category-filter`); omit it when a feature parks a single item (`F-objects-X`). The skill proposes the ID; the operator edits. Matches `product-backlog-template.md`.
- **Reason fallback.** The record requires `Reason for parking`. If the harvest item has no explicit reason (typical — only Resolution prose exists) → fall back to the Resolution text / the `**Backlog:**` bullet prose; at approval the operator trims it to one or two phrases.
- **Asymmetric pointer (D17).** The decision detail stays in the consumer's spec; the record is a pointer-with-summary. The originating node is **not** edited after transfer — no duplication.

**Deferred strategic fork** → "Deferred strategic forks" (Sf-style: Branches + Reason for deferring + Originating analysis).

**Rejected** → "Out-of-scope (rejected)", one line:

```markdown
- <Name> — отвергнуто, причина: <phrase>; альтернатива — <if any>.
```

---

## No-backlog flow (creation)

If no `*backlog*.md` is found and the operator agrees to create one:

- **Path:** `<project>/docs/specs/<slug>-product-backlog.md` (propose it; allow override). `<slug>` — product-slug if known, else feature-slug.
- **Structure:** per `product-backlog-template.md`. "Parked features" / "Deferred strategic forks" / "Out-of-scope (rejected)" filled from harvest; "Committed features" and "Standing cross-cutting policies" empty per template; Iteration index empty.
- **Metadata:** creation date, structure version, and a note: **«owner — product-spec; создан <consumer> в standalone-flow»**. An explicit ownership marker so a future product-spec run knows it is extending an existing artifact rather than re-creating it.

---

## Invariants

- **SSoT (principle 4)** — the decision detail lives in exactly one place: the consumer's spec. The backlog holds a pointer-with-summary, never a copy. No separate register section in the spec.
- **No silent writes (principle 5)** — every backlog mutation goes through an operator-approved patch.
- **Format not duplicated** — `product-backlog-template.md` is the single source of record format. This mechanism reads it; it does not restate field semantics as normative.
- **Idempotent** — re-running over a closed spec produces no duplicates (step 6).
- **Iteration index is product-spec's** — never touched by a downstream contributor (step 9).
- **No guessing** — slug, IDs, and proposed fields are surfaced to the operator at approval; the operator owns product decisions (P6).
