# ArchAudit Cluster Mermaid Contract Bug-Fix Plan

> **For agentic workers:** use `superpowers:test-driven-development`, `superpowers:requesting-code-review`, and `superpowers:verification-before-completion`. Keep the implementation shared across Claude Code, Codex, and Cursor through the single checked-in runtime distribution.

**Issue / Active Issue:** not pre-existing; discovered by mandatory isolated self-review of the Zhenka `0.15.6` audit
**Accepted contract:** `hi_flow/skills/arch-audit/references/self-review-checklist.md`, Groups 3 and 6; `hi_flow/skills/arch-audit/SKILL.md`, Mermaid conventions and shared deployment contract
**Current failure:** cluster mini-graphs duplicate an ordered edge when boundary and cycle findings overlap, leave standalone HIGH/MEDIUM boundaries unstyled, omit the canonical hub class, and two baseline explanations contain prohibited hedging
**Expected accepted behavior:** every visible cluster edge is emitted once with the strongest applicable style, every visible hub module receives the canonical hub class, and baseline finding reasons remain deterministic
**Bug-fix classification:** implementation deviation
**Not a feature because:** style precedence, exact colors, hub class, deterministic reasons, and the shared runtime contract are already required by the accepted self-review checklist
**Tech Stack:** TypeScript, Node.js, Vitest, esbuild

## Global Constraints

- Preserve the D8 JSON contract and finding semantics.
- Do not change project rules, severities, clustering, or Zhenka source code.
- Keep one implementation and one generated `dist` for Claude Code, Codex, and Cursor.
- Do not add a new registry, harness, or infrastructure layer.

## Contract and Harness Impact

**Behavior Registry:** not used; focused generator regression tests are the executable proof
**Runner command:** `npx vitest run tests/helpers/generate-mermaid.test.ts tests/core/baseline-rules.test.ts tests/helpers/enrich-findings.test.ts`
**Architecture contract:** report presentation only; Target Architecture Contract is unchanged
**Active Issue handling:** no row needed if this plan completes; create a narrow row only if completion becomes partial or blocked

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| D8-MERMAID-CLUSTER | `references/self-review-checklist.md` Group 3 | one strongest style per logical edge; canonical hub class | duplicate/plain edge and missing hub class | `tests/helpers/generate-mermaid.test.ts` | add RED coverage, fix, rebuild, verify |
| D8-REASON-DETERMINISM | `references/self-review-checklist.md` Group 6 | no prohibited hedging in finding reasons | two baseline explanations contain `likely` | `tests/core/baseline-rules.test.ts`, `tests/helpers/enrich-findings.test.ts` | add RED coverage, make explanations factual, rebuild, verify |

## File Structure

- Modify: `hi_flow/skills/arch-audit/helpers/generate-mermaid.ts` - logical edge deduplication, style precedence, cluster hub classes
- Modify: `hi_flow/skills/arch-audit/tests/helpers/generate-mermaid.test.ts` - focused regressions
- Modify: `hi_flow/skills/arch-audit/core/baseline-rules.ts` - deterministic no-orphans and high-fanout explanations
- Modify: `hi_flow/skills/arch-audit/tests/core/baseline-rules.test.ts`, `tests/helpers/enrich-findings.test.ts` - prohibited-hedging and interpolated-output coverage
- Regenerate: `hi_flow/skills/arch-audit/dist/cli-{run-audit,render-md}.mjs` - shared runtime
- Modify: plugin manifests, marketplace metadata, and `arch-audit` package metadata - patch release `0.15.7` / `0.3.7`
- Update: `PROJECT_STATE.md` and this plan's implementation report

---

### Task 1: Reproduce the accepted-contract failure

**Covers:** D8-MERMAID-CLUSTER

- [x] Add a test where a HIGH boundary and a cycle share `tools -> dispatcher`; require one cycle-styled edge.
- [x] Add a standalone HIGH boundary test requiring the orange style.
- [x] Add a visible dependency-hub test requiring the canonical hub class.
- [x] Run focused RED: three new tests fail for the three missing behaviors while seven existing tests pass.
- [x] Add a baseline-wide prohibited-hedging test and observe RED on the two `likely` explanations.

### Task 2: Implement the minimal contract-preserving fix

**Covers:** D8-MERMAID-CLUSTER

- [x] Key cluster edges by ordered module pair instead of rendered Mermaid syntax.
- [x] Apply precedence `cycle > critical > HIGH/MEDIUM boundary > default`.
- [x] Apply the global hub set to every cluster where a hub node is visible.
- [x] Run focused GREEN: 10/10 tests pass.
- [x] Expand the executable proof after code review to cover CRITICAL, MEDIUM, default, full precedence, and hub propagation into a foreign cluster.
- [x] Replace the two hedged explanations with graph-derived factual statements and synchronize the interpolation test.
- [x] Rebuild the checked-in runtime and run focused plus full gates.
- [x] Run the full real Zhenka audit with the rebuilt runtime and repeat isolated self-review.

### Task 3: Publish the patch release

- [x] Synchronize Claude Code, Codex, Cursor, marketplace, and internal package versions.
- [x] Create the implementation report and update `PROJECT_STATE.md`.
- [x] Complete final isolated code review and verification-before-completion.
- [ ] Commit, push, and open a narrow PR; do not merge it without the operator.

## Completion Protocol

- [x] Implementation report exists at `docs/superpowers/plans/2026-08-29-arch-audit-cluster-mermaid-contract-bug-fix-report.md`.
- [x] Focused tests, full tests, typecheck, build:check, plugin validation, skill validation, and `git diff --check` pass.
- [x] Real Zhenka full output has no duplicate logical edge, correct styles/classes, deterministic reasons, and isolated self-review PASS with the recorded `mmdc` limitation.
- [x] Full `hi_flow:arch-audit` smoke runs from the exact published branch commit; it validates the renderer and Phase 1 reason generation without changing Zhenka's Target Architecture Contract.
- [x] `PROJECT_STATE.md` reflects the verified release state and next action.
