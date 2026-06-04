# Implementation Report: arch-spec shared-capability lookahead (A+)

**Spec:** `docs/superpowers/specs/2026-06-04-hi_flow-arch-spec-platform-port-probe-amendment-design.md`
**Date:** 2026-06-04
**Status:** completed

## What was done

- `hi_flow/skills/arch-spec/SKILL.md` — added cross-cutting check **Shared-capability lookahead** (trigger = floor-2 port; three signals — roadmap/backlog consumers / ARCHITECTURE infra-constant / orthogonal-to-domain; action = contract one notch wider than YAGNI + §3 platform-port marking; explicit *awareness-only* bound + D26 cross-ref). Added **Operational Rule 10** (terse enforcement pointer).
- `hi_flow/skills/arch-spec/references/arch-spec-template.md` — optional **Platform ports** bullet in §3 (present only when the lookahead triggered).
- `hi_flow/skills/arch-spec/references/self-review-checklist.md` — Coverage bullet verifying the lookahead per floor-2 port, with a guard so the reviewer does not flag the (deliberately) absent registry as a gap.
- `ARCHITECTURE.md` — D26 in Active Decisions + History entry; Current Status + Module Map § arch-spec updated.
- Source brief promoted from the marketplace cache into the repo `docs/feedback/` (it was cache-only; D26 and the uiux precedent expect it in-repo).

## Deviations from spec

- None in scope. Wording fixes applied after the isolated review (see Issues).

## Issues discovered

- **Isolated review** (fresh-context subagent, P5) returned **PASS-WITH-NITS**. Hardest axis (scope correctness — the awareness-only bound) was airtight.
  - **MED, fixed:** the probe cited **"R5"** for arch-spec's decoupling, but R5 is an **ops-local** rule label — arch-spec's own term is **"variant 2 / OQ6"**. Dangling reference inside arch-spec. Corrected in SKILL.md, in D26, and in the design spec.
  - **LOW, applied:** generalized the "one notch wider" calibration beyond storage (`generic key/payload`) to also cover delivery ports (`channel/recipient abstraction`) — the predicted `comm-channels` case, which the storage-only example did not map onto.
  - **LOW, applied:** dropped "/ adapter" from the trigger wording to avoid terminological collision with ceiling-8 (Translation boundary / ACL), which reserves "adapter".
  - **LOW, not shipped (design-doc only):** a D21-vs-decoupling attribution nuance — addressed by the same "variant 2 / OQ6" correction.

## Open items

- **Behavioral validation deferred** to the next arch-spec live run that introduces a port — candidate `comm-channels` (comm, REH ERP), the predicted third repeat. Per P3 (end-to-end validation through the real pipeline, not isolated unit checks).
- **Door to variant B stays open** with the D26 re-review trigger: 4+ consumers of one capability on a live project → registry anchored in backlog-integration (D22) + detector in product-spec decomposition.
