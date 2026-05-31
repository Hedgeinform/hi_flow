# Implementation Report: shared graph-core (arch-spec block C upstream dependency)

**Spec:** `docs/superpowers/specs/2026-05-31-hi_flow-arch-spec-design.md` (§5, §16) + D21 dependency clause (principle 10 blocker)
**Date:** 2026-05-31
**Status:** completed

## What was done

- Created `hi_flow/skills/arch-audit/core/graph-core.ts` — single source of truth for pure graph algorithms over a declarative `DepGraph` (module → imported modules):
  - `reachableFrom(graph, start)` — reachability (DFS incl. start; shared primitive, also backs NCCD).
  - `computeNCCD(graph)` — now built on `reachableFrom`. (The file's relocation from `helpers/compute-nccd.ts` predates this change — `core/graph-core.ts` already existed in HEAD; this changeset extends it.)
  - `computeCoupling(graph)` — **Ca/Ce as in/out-degree** of the deduplicated graph (excludes self-loops + duplicate module-pair edges, matching depcruise parse semantics). Lifts the formula that was previously fused into the depcruise parse loop.
  - `instability(ca, ce)` — **I = Ce/(Ca+Ce)** formula, lifted from the inline expression in `report-builder.ts`.
  - `findCycles(graph)` — **new** graph-traversal (iterative Tarjan SCC) returning cyclic groups (SCC size ≥ 2, or single node with self-loop), deterministically sorted. This is the piece that cannot be imported from depcruise (depcruise scans real files; block C's hypothetical graph has no code yet).
- Refactored arch-audit runtime to consume graph-core (SSoT, principle 4):
  - `helpers/parse-depcruise-output.ts` — drops inline `ca++/ce++`; derives Ca/Ce via `computeCoupling(dep_graph)` after building the dedup graph. `per_module_raw` return shape unchanged (`{ca, ce, loc}`) → zero blast radius on the adapter's god-object/hub/high-fanout detection.
  - `core/report-builder.ts` — replaces the inline `ce/(ca+ce)` with `instability()`; imports `computeNCCD` from graph-core.
- Tests (vitest, declarative-graph fixtures with known cycles/metrics): `tests/core/graph-core.test.ts` — 31 tests (5 relocated NCCD + 26 new for reachability, coupling, instability, cycle detection incl. DAG / 2-cycle / 3-cycle / self-loop / disjoint cycles / feeders / nested SCC / acyclic prefix).
- Updated `hi_flow/skills/arch-spec/SKILL.md` (Block C SSoT note + References): replaced "separate upstream task / references graph-core as a tool" with the concrete path `hi_flow/skills/arch-audit/core/graph-core.ts` and the exported function names; marked BUILT.

## Verification

- `tsc --noEmit` — exit 0.
- Unit/component suite (`tests/core tests/helpers tests/adapters`) — **129/129 green**, incl. graph-core (31), parse-depcruise Ca/Ce assertions, report-builder pipeline, adapter god-object/hub.
- Refactor proven behavior-preserving: Ca/Ce are mathematically the in/out-degree of the deduplicated dep_graph, identical to the previous fused computation; the existing parse-depcruise + adapter tests assert the concrete values and stay green. The `god-object-project` integration test (full pipeline with real depcruise + refactored Ca/Ce → god-object detection on Ca>10 ∧ Ce>10) passed when the depcruise binary resolved.

## Deviations from spec

- None in scope. The `compute-nccd.ts` → `core/graph-core.ts` relocation predates this change (already in HEAD); this changeset **extends** graph-core with new pure functions (reachability, coupling, instability, cycle detection) and **lifts** the Ca/Ce + instability formulas out of their inline call sites into it.

## Issues discovered

- **Integration tests require the `dependency-cruiser` binary at runtime** (`npx --no-install dependency-cruiser`), which is not a declared dependency of arch-audit and is absent/flaky in this dev environment. 3–4 integration tests (`barrel-project`, `cycle-project`, `layered-project`, and sometimes `god-object-project`) fail with `depcruise output is not valid JSON` — **pre-existing and environmental**, the failure is at the depcruise invocation, before any refactored logic. Not caused by this change. graph-core itself needs no binary (operates on declarative graphs). Flagging as a test-environment precondition worth recording.
- **Version drift:** `hi_flow/skills/arch-audit/package.json` is `0.3.0`; ARCHITECTURE.md Module Map / Current Status say arch-audit `v0.2.6`. Cosmetic, surfaced for sync.
- Integration tests write generated `audit-report.*` into committed `tests/fixtures/*/audit-report/` dirs — running the suite mutates tracked files (restored via `git checkout` here). Minor test-hygiene smell.

## Open items

- Boevoy run of arch-spec block C against the new graph-core (separate task — needs a real D8 snapshot + a feature-spec). graph-core is the imported tool; block C runtime/composition (delta build, new-cycle diff, threshold checks) is arch-spec's own future implementation.
- Operator decision whether the depcruise-binary test precondition and the version drift warrant active-issues entries.
