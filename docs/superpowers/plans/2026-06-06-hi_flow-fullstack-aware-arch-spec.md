# Fullstack-aware arch-spec — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Teach `hi_flow:arch-spec` to handle a fullstack feature by auditing each touched package-tree, running block C per snapshot (disjoint graphs → two independent passes), and emitting per-tree output + per-tree rules-patch; plus a soft bootstrap "separate packages" guidance.

**Architecture:** Pure **skill-instruction** changes (markdown), no code. arch-spec orchestrates per-package `arch-audit` runs via instructions; module names stay **bare** (tree is a routing tag, not a node prefix), so the existing block-C overlay + `§381` invariant hold; the output template and rules-patch gain per-tree structure.

**Tech Stack:** Markdown skill files. Validation = structural + **behavioral subagent simulation** (P2), NOT unit tests (no code is written).

**Spec:** `docs/superpowers/specs/2026-06-06-hi_flow-fullstack-audit-design.md` (rev.4, RU).
**Lang:** plan + edited content = English (agent-facing, per `feedback_l2_plain_language`). The reviewed spec is Russian.

**No-test note:** this is instruction work — there is no failing-test/passing-test cycle. Each task = precise edits + a read-back consistency check; the behavioral validation is a dedicated final task (Task 6). Single-tree behavior must stay **byte-identical** — every fullstack addition is gated on "≥2 trees touched".

---

## Task 1: arch-spec SKILL.md — fullstack detection + tree-tag + per-tree audit-ensure

**Files:**
- Modify: `hi_flow/skills/arch-spec/SKILL.md` — Input artifacts (~§40-49), Three situations (~§51-59), Block C module-level definition (~§189-193).

- [ ] **Step 1: Add a "Fullstack features (≥2 trees)" subsection right after "Three situations by audit" (after the §59-61 loud-signal paragraphs).**

Insert this block:

```markdown
### Fullstack features (≥2 trees) — per-tree audit

**Detection.** A feature is **fullstack** when it touches ≥2 package-trees:
- **frontend touched** — the feature-spec's «Поверхности (UX)» section is non-empty (D25; conditional — present only for user-facing features);
- **backend touched** — block B (§5) declares backend modules.
Single-tree features ignore everything below (output byte-identical to today).

**Tree is a routing tag, names stay bare.** In a monorepo a module lives under `apps/<tree>/src/<module>/`. Declare each feature module with its **tree tag** (`web` / `api`) as metadata, but the **module name stays bare** (`<module>`) — it must match that tree's snapshot `per_module` keys (which are bare top-level dir names; see §189-193). The tree only routes which snapshot/patch a module belongs to; there is NO name prefix anywhere in the computation.

**Ensure a fresh snapshot per touched tree.** arch-spec **invokes** arch-audit per package (invoke, not duplicate — it does not reimplement audit logic):
- Discover package roots from `pnpm-workspace.yaml` (or the repo layout / ARCHITECTURE.md § Stack).
- Per-package precondition check **before** invoking: the package root must have `tsconfig.json` AND `src/` (without them the adapter hard-fails). Missing → loud signal per tree (principle 5): «`<tree>` has no `tsconfig.json` at `<root>` — cannot audit it; fix the package or skip block C for that tree with a logged reason.»
- Invoke: `npx tsx hi_flow/skills/arch-audit/helpers/cli-run-audit.ts <package-root>` (the optional `d9-md-path` positional defaults to the bundled D9 — omit). Each writes `<package-root>/audit-report/audit-report.json` (separate dirs, no collision); read both there.

**"Three situations" become a per-tree vector.** Evaluate green / brown+fresh / brown+no-or-stale **per touched tree** (e.g. `api` brown+fresh while `web` is green-field — the first frontend feature). The loud-signal + skip-with-logged-reason fire **per uncovered tree**; a covered tree's block C still runs. Freshness is unchanged (one repo → one HEAD; each snapshot's `audit_sha` vs HEAD).
```

- [ ] **Step 2: Extend the Input artifacts table (~§45) — the `audit-report.json` row.**

Change the `audit-report.json (D8)` row's Role cell to note multiplicity. Replace its Role text with:
`Snapshot of current architecture, needed for block C. **Fullstack feature → one snapshot per touched tree** (per-tree audit, see "Fullstack features").`

- [ ] **Step 3: Extend the module-level operational definition (~§193).**

After the sentence ending "...block C is not run anyway.", append:
`**Fullstack feature:** each module additionally carries a **tree tag** (`web`/`api`) routing it to its package-tree's snapshot; the module name itself stays bare at `src/<module>/` granularity (the tag is NOT part of the name — see "Fullstack features"). A `web` module overlays onto the `web` snapshot, an `api` module onto the `api` snapshot.`

- [ ] **Step 4: Read-back consistency check.**

Re-read the three edited regions. Confirm: detection signals match §3.1 of the spec; the bare-name/tree-tag rule is stated consistently in both the new subsection and §193; the loud-signal wording uses "principle 5" like the existing §59.

- [ ] **Step 5: Commit.**

```bash
git add hi_flow/skills/arch-spec/SKILL.md
git commit -m "feat(arch-spec): fullstack detection + per-tree audit-ensure (tree-tag, bare names)"
```

---

## Task 2: arch-spec SKILL.md — per-tree block C + per-tree output + per-tree rules-patch

**Files:**
- Modify: `hi_flow/skills/arch-spec/SKILL.md` — Block C process (~§219-227), Output structure (~§263-296), Fitness invariants / rules-patch (~§298-327).

- [ ] **Step 1: Block C — per-snapshot pass (after the §219-227 "Process (4 steps)").**

Append:

```markdown
**Fullstack feature — block C runs once per tree.** Graphs are disjoint (back/front communicate over HTTP, not TS imports), so there is nothing to merge. For each touched tree: overlay that tree's bare-named feature modules onto that tree's snapshot (step 1), run the future graph through the principles (step 2) using graph-core's `findCycles`/`computeNCCD`/`computeCoupling` over that tree's `dep_graph` + the feature's edges, classify (step 3). Synthesize one §6 with per-tree sub-results (§6 below). A tree with no snapshot (per the per-tree situation vector) → its block C is "skipped, no snapshot, reason logged" (principle 5); the covered tree still runs.
```

- [ ] **Step 2: Output structure — make §1 / §4 / §5.1 / §6 / §8 / §9 per-tree (edit the §263-296 "Structure — 10 sections").**

After the 10-section list (after §282 "No open questions section"), add a "Fullstack output (per-tree)" note:

```markdown
### Fullstack output (per-tree)

For a fullstack feature the single-snapshot slots become per-tree (single-tree output unchanged):
- **§1 Header** — the `Audit snapshot` line becomes **N lines**, one per touched tree (`tree · path · audit_sha · freshness`); the `Mode` field becomes **per-tree** (`web: green field · api: brown field`).
- **§4 Starting state** — per-tree note (a green tree → "clean field for `<tree>`").
- **§5.1 Module breakdown** — each module annotated with its **tree tag** (bare name + `tree: web|api`); §5.11 (Presentation/UI) modules carry `web`.
- **§6 Impact** — **per-tree sub-sections** ("Integration — `api`" / "Integration — `web`"), each with its own Graph delta + Degradation check; the "Brown field only" gate is per-tree; `Signal up` stays one shared bullet.
- **§8 Fitness invariants** — each graph-type invariant carries its tree **inline in the Invariant cell** (`<statement> [tree: web]`), NOT a 5th column (same discipline as the security-tag).
- **§9 Dependency graph** — two ego-subgraphs in one Mermaid block (`FEATURE-web` + web neighbours, `FEATURE-api` + api neighbours); disjoint, so no cross-edges.
```

- [ ] **Step 3: rules-patch — per tree (edit the §323-327 "rules-patch format" subsection).**

After §327 (composition-root exemption), append:

```markdown
**Fullstack feature — one patch per touched tree.** The graph invariants split by tree (a `web` invariant constrains `apps/web/src/` modules, an `api` invariant `apps/api/src/`). Emit **one patch per touched tree** — `<feature-slug>-<tree>-rules-patch.yaml` — applied to that package's `<package-root>/.audit-rules.yaml` (the project-rules loader reads `<root>/.audit-rules.yaml`; run apply with `<package-root>` as project-root). Paths stay **bare** `^src/<module>/` (correct within each package); the composition-root exemption is the per-package baseline. Each patch's metadata block carries **its own** `Source audit: <that tree's audit-report dir>; audit_sha=<that tree's sha>`. (Single-tree feature → one patch as today.)
```

- [ ] **Step 4: Read-back consistency check.** Confirm the per-tree output note matches spec §3.4 exactly (slots, inline §8 tag, two subgraphs) and the rules-patch note matches §3.5 (bare paths, per-package `.audit-rules.yaml`, per-patch Source audit).

- [ ] **Step 5: Commit.**

```bash
git add hi_flow/skills/arch-spec/SKILL.md
git commit -m "feat(arch-spec): per-tree block C, output sections, and rules-patch"
```

---

## Task 3: arch-spec-template.md — per-tree slots

**Files:**
- Modify: `hi_flow/skills/arch-spec/references/arch-spec-template.md` — §1 header (lines 16-22), §4 (35-39), §5.1 (43-44), §6 (66-72), §8 (81-92), §9 (94-115).

- [ ] **Step 1: §1 Header — N snapshots + per-tree Mode.** Under the `**Audit snapshot:**` line (line 19) add a fullstack variant comment, and make `**Mode:**` per-tree-capable:

```markdown
**Audit snapshot:** <path to audit-report.json> · audit_sha=<...> · freshness: <fresh | N commits behind | none>
<!-- Fullstack: one **Audit snapshot:** line PER touched tree, prefixed `<tree>:` — e.g. `**Audit snapshot (api):** ... ` / `**Audit snapshot (web):** ...` -->
**Date:** YYYY-MM-DD
**Status:** draft | signed
**Mode:** green field | brown field
<!-- Fullstack: per-tree — e.g. `**Mode:** api: brown field · web: green field` -->
```

- [ ] **Step 2: §4 Starting state — per-tree green note.** After the existing green-field blockquote (line 39) add:
`<!-- Fullstack: note per tree — e.g. "web: clean field; api: brown — neighbours X, Y". -->`

- [ ] **Step 3: §5.1 Module breakdown — tree tag.** Change the §5.1 description (line 44) to add: `Fullstack: tag each module with its tree (bare name + `tree: web|api`).`

- [ ] **Step 4: §6 Impact — per-tree sub-sections.** Replace the §6 body (lines 70-72) so it carries a per-tree variant:

```markdown
- **Graph delta:** <new modules, new edges, shifted boundaries vs the snapshot>
- **Degradation check (against D9 principles):** <per predicted violation — new cycles? boundary blur? dependency direction? God object? duplication?>
- **Signal up (if it does not sit cleanly):** <simplify product → feature-spec | refactor environment → arch-redesign | accept debt → Known Drift>

<!-- Fullstack: split into per-tree sub-sections — `### Integration — api` / `### Integration — web`, each with its own Graph delta + Degradation check (the "Brown field only" gate is per-tree: a green tree → "Not applicable — clean field for <tree>"). `Signal up` stays one shared bullet for the whole feature. -->
```

- [ ] **Step 5: §8 Fitness invariants — inline tree tag.** After the §92 security-tag note add:
`> **Tree tag (fullstack).** A graph-type (type-1) invariant carries its tree INLINE in the Invariant cell — e.g. `<statement> [tree: web]` — like the security tag. The table stays 4 columns; do NOT add a Tree column. The tag routes the invariant to its tree's rules-patch.`

- [ ] **Step 6: §9 Dependency graph — two subgraphs.** After the §96 ego-graph note add:
`<!-- Fullstack: two ego-subgraphs in ONE mermaid block — `subgraph FEATURE-web` and `subgraph FEATURE-api`, each with its tree's new + neighbour nodes. Disjoint, so no edges cross between them. Stay within the ~30-node ego budget per tree. -->`

- [ ] **Step 7: Read-back + commit.** Confirm every per-tree slot from spec §3.4 is reflected (§1 snapshot+Mode, §4, §5.1, §6, §8, §9) and single-tree usage is unchanged (all additions are comments / conditional variants).

```bash
git add hi_flow/skills/arch-spec/references/arch-spec-template.md
git commit -m "feat(arch-spec): per-tree output template slots"
```

---

## Task 4: rules-patch-template.yaml — per-tree note

**Files:**
- Modify: `hi_flow/skills/arch-spec/references/rules-patch-template.yaml` — header notes (lines 11-14) + metadata block (line 42).

- [ ] **Step 1: Granularity note.** After line 14 (`# Granularity: one patch per feature ...`) add:

```yaml
# Fullstack feature: one patch PER TOUCHED TREE — `<feature-slug>-<tree>-rules-patch.yaml`,
# applied to that package's `<package-root>/.audit-rules.yaml` (apply with <package-root>
# as project-root). Paths stay bare `^src/<module>/` (correct within each package);
# composition-root exemption is the per-package baseline.
```

- [ ] **Step 2: Source-audit per patch.** Confirm the metadata block (line 42 `# Source audit: <path>; audit_sha=<...>`) already reads per-patch; add a clarifying inline:
`# Source audit: <path to audit-report dir>; audit_sha=<...>   # the snapshot block C ran on (fullstack: THIS tree's snapshot)`

- [ ] **Step 3: Commit.**

```bash
git add hi_flow/skills/arch-spec/references/rules-patch-template.yaml
git commit -m "feat(arch-spec): per-tree rules-patch note"
```

---

## Task 5: bootstrap SKILL.md — separate-packages guidance (soft)

**Files:**
- Modify: `hi_flow/skills/bootstrap/SKILL.md` — fullstack handling (~§107 init mode) + a note in the Create-flow ARCHITECTURE.md write (~§114).

- [ ] **Step 1: Add the guidance to the fullstack-class handling (~§107).**

After the sentence about fullstack splitting into multiple runtime axes, add:

```markdown
**Fullstack layout convention (soft, P7-style — recommend + warn, never block).** A fullstack project uses **separate packages**, each its own package + `src/` (e.g. `apps/web` + `apps/api`), **NOT one mixed `src/`** — the whole hygiene/audit toolchain is per-package; a mixed `src/` degrades arch-audit to best-effort and breaks the fullstack audit sub-flow (arch-spec audits per package). Recommend the separate-packages layout; if the operator insists on a mixed `src/`, proceed with a loud warning (unmanaged-style), not a block. Record the convention in the project's `ARCHITECTURE.md` (Create flow already owns that write) so future project agents keep the separation.
```

- [ ] **Step 2: Read-back + commit.** Confirm the guidance is soft (recommend + warn, no hard block), names the per-package reason, and points at the existing ARCHITECTURE.md Create-flow write (no new scaffolding capability claimed).

```bash
git add hi_flow/skills/bootstrap/SKILL.md
git commit -m "feat(bootstrap): fullstack separate-packages guidance (soft)"
```

---

## Task 6: Behavioral validation (subagent simulation) — P2

**Files:** none (validation only).

- [ ] **Step 1: Dispatch a behavioral-simulation subagent** with the edited `arch-spec/SKILL.md` + template + a synthetic fullstack feature (touches `web` components + `api` services, Reh_Erp-shaped). Instruction: "simulate running arch-spec on this feature; show what you would do for the audit step, block C, the §6/§8/§9 output, and the rules-patch." Expected behavior to confirm:
  - detects fullstack (UX surfaces + backend modules);
  - ensures a snapshot per tree (invokes cli-run-audit per package; checks tsconfig+src; loud signal if a tree can't be audited);
  - runs block C per tree with **bare** module names (no `apps/web/src/` prefix in the overlay);
  - emits per-tree §6 sub-sections, inline §8 tree tags, two §9 subgraphs;
  - emits one rules-patch per tree with bare `^src/<module>/` paths.

- [ ] **Step 2: Dispatch a second subagent for the green/brown cross-product case** (web green-field, api brown+fresh): confirm per-tree Mode, §6 "not applicable for web", api block C runs, one self-assessment over the union.

- [ ] **Step 3: Spec-compliance review (subagent)** — diff the SKILL.md/template/patch changes against spec §3 + §8 done-criteria; confirm each criterion is met, single-tree output unchanged, no 5th column in §8, no node-name prefix anywhere.

- [ ] **Step 4:** Fix any gaps the simulations surface; re-run the failing simulation. Commit fixes if any.

---

## Task 7: ARCHITECTURE.md fixation

**Files:**
- Modify: `ARCHITECTURE.md` — Active Decisions + Open Questions.

- [ ] **Step 1: D-entry (Active Decisions, after D27), pointer format.**

```markdown
### D28. Fullstack-aware arch-spec — per-tree audit + per-tree output/rules-patch.

arch-spec на fullstack-фиче (≥2 дерева, детект по «Поверхности (UX)» + бэк-модулях) аудитит каждый пакет (invoke `cli-run-audit` per package), гоняет блок C по снапшоту (дизъюнктные графы → два прохода), выдаёт per-tree §1/§4/§5.1/§6/§8/§9 + один rules-patch на дерево. Имена модулей голые, дерево — routing-метка. bootstrap: soft guidance «раздельные пакеты». Без кода/схемы/merge.
**Spec:** `docs/superpowers/specs/2026-06-06-hi_flow-fullstack-audit-design.md`.
```

- [ ] **Step 2: Open Question (after the latest OQ).**

```markdown
### OQ-N. Fullstack audit — отложенные хвосты.

(1) Mixed-`src/` (всё в одном дереве) требует настоящей subtree-осознанности (эпик, родственник vertical-slice) — смягчено bootstrap-guidance (D28) для управляемых проектов, неуправляемый legacy best-effort. (2) Shared-пакет (`packages/shared`, импортируемый обоими) ломает дизъюнктность — **триггер пересмотра** D28: первый реальный пакет под `packages/`. Связки: D27, D28, active-issues vertical-slice.
```

- [ ] **Step 3: Commit.**

```bash
git add ARCHITECTURE.md docs/superpowers/specs/2026-06-06-hi_flow-fullstack-audit-design.md docs/superpowers/plans/2026-06-06-hi_flow-fullstack-aware-arch-spec.md
git commit -m "docs(arch): fixate fullstack-aware arch-spec (D28) + spec/plan"
```

---

## Self-review (plan vs spec)

- Spec §3.1 detection + tree-tag bare names → Task 1 (Steps 1, 3). ✓
- Spec §3.2 per-tree audit-ensure + preconditions + per-tree three-situations → Task 1 (Step 1). ✓
- Spec §3.3 per-tree block C → Task 2 (Step 1). ✓
- Spec §3.4 per-tree output (§1/§4/§5.1/§6/§8/§9) → Task 2 (Step 2, SKILL.md) + Task 3 (template). ✓
- Spec §3.5 per-tree rules-patch → Task 2 (Step 3, SKILL.md) + Task 4 (template). ✓
- Spec §4 bootstrap guidance → Task 5. ✓
- Spec §8 validation (behavioral simulation + spec-compliance) → Task 6. ✓
- Spec §8 ARCHITECTURE D-entry + Open Question → Task 7. ✓
- Spec §5 NOT-done (no code/schema/merge) → no task touches arch-audit code (correct). ✓
- Consistency: "tree tag, bare name" appears identically in Task 1/2/3; "per-package `.audit-rules.yaml`, bare `^src/`" in Task 2/4; inline §8 tag (no 5th column) in Task 2/3. ✓
- Single-tree byte-identical: every template change is a comment or conditional variant (Task 3); SKILL.md additions all gated on "≥2 trees" (Task 1). ✓
