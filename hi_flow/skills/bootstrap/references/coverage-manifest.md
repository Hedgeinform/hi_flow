# bootstrap — Coverage Manifest

**SSoT of coverage** (architectural principle 4 — single source of truth). This file is the canonical record of what the plugin can actually deliver end-to-end (baseline + audit + gates + scaffold) per infrastructure axis. Nothing about coverage is hardcoded elsewhere — `bootstrap` reads this manifest dynamically.

Dimension = the axis taxonomy (`references/axis-taxonomy.md`). Each covered technology is one row:

```
axis → technology → { stack-file, baseline, audit-adapter, scaffold-template, probe-class }
```

---

## Rules

- **Read dynamically, never hardcoded.** `bootstrap` proposes only technologies present in this manifest with a **full** field set. Coverage grows by adding a row here — plus the corresponding baseline, audit-adapter, and scaffold-template behind it.
- **Partially covered axis = NOT covered.** A row missing any of the 5 fields falls under coverage-honesty → it triggers a **loud signal** (principle 5: no silent fallback), never a silent proposal. The skill fixes the covered part and marks the rest `unmanaged`.
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

**Status: EMPTY / PARTIAL → coverage-gap (explicit).**

| Field | Value |
|---|---|
| technology | — (none fully covered) |
| stack-file | absent |
| baseline | absent |
| audit-adapter | absent |
| scaffold-template | absent |
| probe-class | buy-in |

This is a known coverage-gap. The grounding case (REH ERP frontend, incremental run) will expose it live. Until a frontend technology row exists with a full field set, this axis raises a loud signal rather than a silent proposal.

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
| interface / frontend | empty / partial → coverage-gap |
| file storage | not covered |
| task scheduler | not covered |
| message queues | not covered |
| cache | not covered |
| search | not covered |

Only `language & runtime` (TypeScript/Node) is fully covered today. Everything else is honest empty or partial — the plugin promises turnkey hygiene only where it can deliver it.
