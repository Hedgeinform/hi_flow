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

**Status: covered** (full set — frontend horizontal layered governance + scaffold-template, both built 2026-06-05). React row added 2026-06-02.

| Field | Value |
|---|---|
| technology | React (Vite SPA, React 19 / TypeScript) |
| stack-file | `~/.claude/architecture/stacks/react.md` **[pending-Ф3a]** |
| baseline | `~/.claude/architecture/stacks/references/react-baseline.md` **[pending-Ф3a]** |
| audit-adapter | **present** — typescript-depcruise (scan glob includes `.tsx`) + `frontend-layered-respect` (MEDIUM) / `frontend-layer-cycle` (CRITICAL) baseline conditional rules: layered governance (pages→features→components→hooks→data-access→lib), run-level frontend profile. **Активация:** объявленный `overrides.profile: frontend` **или** литеральная эвристика (горизонтальные раскладки) — feature-sliced раскладки требуют декларации (+ `layer_aliases`), иначе только универсалии. Feature isolation (vertical-slice) deferred — see active-issues. Render/hooks layer out of module-graph scope, covered by `eslint-plugin-react-hooks` (react.md). |
| scaffold-template | **present** — `references/scaffold-templates/react/` (components/hooks/lib green skeleton, co-located tests, downward imports) |
| probe-class | buy-in |

**Covered (2026-06-05, активация уточнена 2026-06-06).** stack-file + baseline (delta-on-top of `typescript.md`) wire lint/format/gates/CI; the audit-adapter delivers layered governance via `frontend-layered-respect` / `frontend-layer-cycle` (backend layered rules skipped to avoid `api`/`app`/`services` false positives); the scaffold-template lays a green components/hooks/lib skeleton. **`covered` распространяется на горизонтальные раскладки (стандартные имена → литеральная активация) и на feature-sliced раскладки, объявившие `overrides.profile: frontend` + `layer_aliases`.** Feature-sliced БЕЗ декларации получает только универсалии (циклы/barrel/god-object), не слоевой governance — это не «covered молча», а сигнал задекларировать раскладку (см. arch-audit `overrides.profile`). **Deferred, not blocking `covered`:** feature isolation (vertical-slice) needs a finer module-granularity change — logged in `docs/active-issues.md`; the render/hooks tree has no component-graph adapter (handled by `eslint-plugin-react-hooks`). Spec: `docs/superpowers/specs/2026-06-05-hi_flow-frontend-coverage-completion-design.md`.

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
| interface / frontend | covered (React) |
| file storage | not covered |
| task scheduler | not covered |
| message queues | not covered |
| cache | not covered |
| search | not covered |

`language & runtime` (TypeScript/Node) and `interface / frontend` (React) are fully covered today. Everything else is honest empty or partial — the plugin promises turnkey hygiene only where it can deliver it.
