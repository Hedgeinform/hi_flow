# bootstrap — Coverage Manifest

**SSoT of coverage** (architectural principle 4 — single source of truth). This file is the canonical record of what the plugin can actually deliver end-to-end (baseline + audit + gates + scaffold) per infrastructure axis. Nothing about coverage is hardcoded elsewhere — `bootstrap` reads this manifest dynamically.

Dimension = the axis taxonomy (`references/axis-taxonomy.md`). Each covered technology is one row:

```
axis → technology → { stack-file, baseline, audit-adapter, scaffold-template, probe-class }
```

---

## Rules

- **Read dynamically, never hardcoded.** `bootstrap` proposes only technologies present in this manifest with a **full** field set. Coverage grows by adding a row here — plus the corresponding baseline, audit-adapter, and scaffold-template behind it.
- **Field states — present / absent-pending / N/A-by-design.** Each of the 5 fields is in exactly one state: **present** (exists); **absent (pending)** — applicable to this axis but not yet built, closeable; **N/A (by design)** — conceptually inapplicable to this axis/technology (e.g. a module-graph audit-adapter for an axis with no meaningful code graph), and therefore **not counted as missing**.
- **Covered criterion.** An axis/technology is **covered** when every field is *present* or *N/A*. Any **absent-pending** field → partial → NOT covered → coverage-honesty **loud signal** (principle 5: no silent fallback), never a silent proposal; the skill fixes the covered part and marks the rest `unmanaged`. N/A never traps an axis in permanent `partial` over a field that can never apply to it.
- **Coverage-honesty on the manifest itself.** This file lists only technologies the plugin genuinely covers today. No invented "covered" rows.

> **pending-Ф3a.** Paths marked `[pending-Ф3a]` currently live in the operator-personal area (`~/.claude/architecture/...`). Function 3a (relocation) will move baselines + CI + `stacks/` plugin-internal. Until that lands, these paths point outside the plugin and the rows are not yet self-contained.

---

## Coverage rows

### language & runtime (runtime)

**Status: covered** (full set exists).

| Field | Value |
|---|---|
| technology | TypeScript / Node (also Bun runtime) |
| stack-file | `~/.claude/architecture/stacks/typescript.md` **[pending-Ф3a]** |
| baseline | `~/.claude/architecture/stacks/references/typescript-baseline.md` **[pending-Ф3a]** |
| audit-adapter | typescript-depcruise (dependency-cruiser adapter, in `hi_flow` arch-audit) |
| scaffold-template | `references/scaffold-templates/typescript/` (owned by other bootstrap tasks) |
| probe-class | buy-in (degenerate at coverage = 1 → informing confirmation) |

Toolchain components (linter = Biome, formatter = Biome, test-runner = bun test / vitest, CI = GitHub Actions, arch-audit-config = depcruise) are **silent-baseline wire sub-steps** of this axis, configured from the baseline above. They are not separate rows — see `axis-taxonomy.md` (axes ≠ toolchain components).

### database (relational / primary state store)

**Status: PARTIAL → treated as NOT covered** (loud signal; not a full set).

| Field | Value |
|---|---|
| technology | Postgres |
| stack-file | partial — no dedicated Postgres stack-file yet **[pending-Ф3a]** |
| baseline | partial / absent |
| audit-adapter | absent |
| scaffold-template | absent |
| probe-class | buy-in |

Partial coverage falls under coverage-honesty: "axis covered partially — fixing the covered part, the rest is `unmanaged`."

### interface / frontend (UI)

**Status: PARTIAL → NOT covered** (loud signal; 2 **absent-pending** fields — audit boundary-rules + scaffold-template). React row added 2026-06-02. `covered` is reachable once both are built — neither is N/A.

| Field | Value |
|---|---|
| technology | React (Vite SPA, React 19 / TypeScript) |
| stack-file | `~/.claude/architecture/stacks/react.md` **[pending-Ф3a]** |
| baseline | `~/.claude/architecture/stacks/references/react-baseline.md` **[pending-Ф3a]** |
| audit-adapter | **absent (pending)** — typescript-depcruise *applies* to the frontend import-graph (cycles / barrel / coupling / boundaries on `.tsx`); what is missing is frontend-specific boundary-rules (depcruise config for frontend layers). The render/hooks layer is out of module-graph scope and covered by `eslint-plugin-react-hooks` (react.md). Closeable, **not N/A**. |
| scaffold-template | **absent (pending)** — `references/scaffold-templates/react/` not yet authored; use the Vite react-ts template (baseline §1) until then |
| probe-class | buy-in |

**Partial = "covered minus audit-rules + scaffold".** stack-file + baseline now exist (delta-on-top of `typescript.md`): bootstrap can wire lint/format/gates/CI and fix the React stack from the baseline. Two **absent-pending** fields: (1) **audit boundary-rules** — typescript-depcruise applies to the frontend import-graph (cycles / barrel / coupling on `.tsx`), but frontend-specific boundary-rules (which layers may not import which) are not written yet; the render/hooks layer is out of module-graph scope and handled by `eslint-plugin-react-hooks` (react.md); (2) **scaffold-template** — the green-skeleton template is not yet authored, so the atom's scaffold step has nothing to lay (use the Vite react-ts template per baseline §1 until it exists). Per coverage-honesty, emit the loud signal: "React frontend wired (lint/format/gates/CI from baseline); turnkey scaffold-template and frontend depcruise boundary-rules not available yet — fixing the covered part, the rest is `unmanaged`."

### file storage (object storage / blob)

**Status: not covered.** No rows. (e.g. S3 — not yet delivered end-to-end.)

### task scheduler (scheduler)

**Status: not covered.** No rows.

### message queues (messaging)

**Status: not covered.** No rows.

### cache (cache)

**Status: not covered.** No rows.

### search (search)

**Status: not covered.** No rows.

---

## Summary

| Axis | Coverage |
|---|---|
| language & runtime | covered |
| database | partial → not covered (loud signal) |
| interface / frontend | partial (React) → 2 absent-pending: audit boundary-rules + scaffold (loud signal) |
| file storage | not covered |
| task scheduler | not covered |
| message queues | not covered |
| cache | not covered |
| search | not covered |

Only `language & runtime` (TypeScript/Node) is fully covered today. Everything else is honest empty or partial — the plugin promises turnkey hygiene only where it can deliver it.
