# Implementation Report: hi_flow:feature-spec — Backlog Integration at Closure

**Spec:** `docs/superpowers/specs/2026-05-29-hi_flow-feature-spec-backlog-integration-design.md`
**Date:** 2026-05-31
**Status:** completed

## What was done

Implemented the full Change surface of the design (Approach B — mechanism in a shared reference).

- **NEW `hi_flow/references/backlog-integration.md`** — the generic, consumer-agnostic shared mechanism. Owner: product-spec; consumers: feature-spec + arch-spec. Bodies of the design's «Closure backlog-sync algorithm», «Backlog entry mapping», and «No-backlog flow» migrated here and reframed as a consumer-agnostic contract: a **harvest contract** (what a consumer supplies) + a 9-step algorithm (detect → scan-validate → dedup/merge → classify → detect backlog → idempotency by `Originating analysis: <spec> § <id>` → patch + approval → create-if-missing → iteration-index untouched) + entry mapping + No-backlog creation flow + invariants (SSoT, no silent writes, format-not-duplicated, idempotent, iteration-index is product-spec's).

- **`hi_flow/skills/feature-spec/SKILL.md`:**
  - "Feature scope clarification" rewritten with a **"Two input modes"** subsection — product-spec is now explicitly optional (after-product-spec with bundle / standalone). Hard requirement stated: closure backlog-sync depends only on `*backlog*.md` presence, not on product-spec artifacts.
  - New **"Backlog sync at closure"** section: calls the shared mechanism **by name**, defines feature-spec's harvest sources (anchors 1-4: `[status: DEFERRED]` forks, `**Backlog:**` blocks, `Sf-` forks, `→ backlog` / `→ rejected` tags on Out-of-scope/Premortem one-liners), the scan-validate scope (operator-content only, fenced blocks excluded), slug derivation, marking discipline, and the SSoT note that it is a separate axis from "Open items at closure".
  - Wiring: backlog-sync runs after the User Review Gate (wiring line added to the Gate; section placed immediately after it).
  - Format Rules 9-10 added: the `**Backlog:**` block convention and the `→ backlog` / `→ rejected` tags.
  - References += `backlog-integration.md` (mechanism) + `product-backlog-template.md` (format authority).

- **`hi_flow/skills/feature-spec/references/feature-spec-template.md`** — fenced illustrative examples of the `**Backlog:**` block (under Развилки), the `→ backlog` / `→ rejected` tags (under Цель/Out of scope), and a `→ backlog` Premortem tag. All inside fenced code blocks so the closure scan-validation cannot catch them (S2). No separate register section. "Open items at closure" untouched.

- **`hi_flow/skills/arch-spec/SKILL.md`** (optional cleanup, done) — the inline mechanism enumeration in "Closure backlog-sync" collapsed into a pointer to the shared reference (SSoT; arch-spec already cites it by name and at References). The arch-spec graceful-degradation fallback and the "re-sync with main at implementation time" note were left intact (correct until the mechanism is merged to main).

- **Version bump** `.claude-plugin/plugin.json` `0.6.2 → 0.6.3` (see Deviations re: number choice). D16 release flow reminder: after commit + push, run `git fetch && git merge --ff-only origin/master` in `~/.claude/plugins/marketplaces/hi_flow-marketplace/` or the new version is invisible in Claude Code.

- **Validation** (P2: markdown instructions, TDD/worktree inapplicable):
  - *Structural* — all sections/format verified; template fences balanced; "Open items at closure" preserved.
  - *Behavioral* — a fresh-context subagent simulated a standalone closure scenario (DEFERRED fork + `**Backlog:**` block + a duplicate Export CSV across two anchors + a `→ rejected` line + an untagged line + a Premortem tag + a fenced "backlog" example + a pre-existing backlog record for idempotency). Verdict: **PASS-WITH-NITS**; the agent harvested correctly, merged the duplicate, skipped the idempotent item, ignored the fenced example, routed rejected vs parked correctly, and honored SSoT. The three nits were fixed (see Issues discovered).

## Deviations from spec

- **product-backlog-template.md amended (not in the original Change surface).** The design assumed `product-backlog-template.md` already authoritatively defined the backlog record format (Decisions §4/§6: "механизм читает … как авторитет формата, не дублирует его"). Behavioral validation found the template's "Parked features" entry was only a prose placeholder inside an HTML comment — it did **not** define the named fields (`**Originating analysis:**`, `**Status:** parked`, `**Reason for parking:**`, `**Carry-over candidate for:**`) that the mechanism's idempotency key and entry mapping rely on, even though the real artifact (`Reh_Erp/docs/specs/reh-erp-product-backlog.md`) uses them. Left unfixed, the shared reference would claim "the template owns the format" while itself defining the fields — the exact SSoT violation the design tries to avoid. Fixed by formalizing the template's Parked-features entry with the named fields (a deterministic format-alignment to the canonical real artifact + the design's mapping; zero behavior change for product-spec). This **completes** the design's assumption rather than departing from it.
- **Version number `0.6.3` (patch), not a minor bump.** Semver would suggest a minor bump for a new cross-skill capability, but `ARCHITECTURE.md` reserves "v0.7.0" for product-spec's deferred retrospective improvements, and D18 reserves "v0.6.3+" semantics for product-spec — these are skill-internal version axes, not the plugin version. Chose the patch `0.6.3` to avoid consuming the reserved `0.7.0` label. The change is additive markdown-instructions. Flagged for operator override before commit.

## Issues discovered

Three nits surfaced by behavioral validation, all fixed (documentation/authority, not flow-logic):

1. **Format-authority gap (most serious)** — `Originating analysis` and the other Parked-features fields were absent from the format-authority template. Fixed by amending `product-backlog-template.md` (see Deviations).
2. **Under-specified dedup** — "normalized name" had no rule, and which `local_ref` survives a merge was unstated (could silently produce duplicate records once feature names aren't byte-identical). Fixed in mechanism step 3: name match is case-insensitive + trimmed; on merge the **fork-id ref wins** (canonical key is fork-id-based); cross-language / non-obvious matches are surfaced to the operator, not auto-merged.
3. **ID convention drift** — mechanism required `-<suffix>`, but the real artifact uses it optionally (`F-objects-X` vs `F-audit-X-export`). Reconciled to `F-<feature-slug>-X[-<suffix>]` (suffix optional) in both the mechanism and the template.
   - Minor clarifications also applied: scan-validate excludes fenced blocks **of any fence form** (incl. info-string fences like ` ```markdown `); backlog detection **counts total matches across all search paths** (not first-hit-wins).

## Open items

- **arch-spec dependency unblocked, pending merge.** Implementing the shared mechanism closes arch-spec's principle-10 dependency (D21). arch-spec's Module Map note and its closure-fallback correctly say "executable after merge" — they become true once this branch is committed + pushed to `main`. arch-spec's inline fallback was intentionally not rewritten (it re-syncs with main at its own implementation time).
- **ARCHITECTURE.md status updates pending operator confirmation** — D22 "designed, impl pending" → BUILT; Module Map feature-spec + `hi_flow/references/backlog-integration.md` (Planned → BUILT); History append. Proposed via the `architecture` skill (Active Decision change requires "было→стало" confirmation).
- **Release tail (D16):** commit + push + manual `fetch && merge --ff-only` in the marketplace cache directory. Operator's call (commits are not made by the agent).
- **OQ10** remains open (bidirectional reconciliation / format divergence) — out of scope of this design, untouched.
