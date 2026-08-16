# ArchAudit Standalone Runtime Bug-Fix Plan

> **For agentic workers:** REQUIRED IMPLEMENTATION DISCIPLINE: use `superpowers:test-driven-development` for production code changes, `superpowers:requesting-code-review` before completion, and `superpowers:verification-before-completion` before claiming completion.

**Issue / Active Issue:** not pre-existing
**Accepted contract:** `hi_flow/skills/arch-audit/SKILL.md` sections `Tool availability` and `Deployment`: the installed skill owns a self-contained runtime and must not depend on the audited project's tooling.
**Current failure:** marketplace installation delivers package manifests and source files but no nested `node_modules`; the mandatory `npm run depcruise:version` preflight fails before Phase 1.
**Expected accepted behavior:** a freshly installed hi_flow plugin can run the ArchAudit preflight and audit from its shipped files without installing packages into the plugin cache.
**Bug-fix classification:** implementation deviation
**Not a feature because:** the skill already promises a self-contained runtime; this change restores that published contract without changing audit findings or operator-facing policy.
**Tech Stack:** Node.js 20+, TypeScript, esbuild, dependency-cruiser, Vitest, Codex/Claude Code/Cursor plugin manifests

## Global Constraints

- Preserve audit behavior, D8 artifacts, and the two-phase flow.
- Keep one shared runtime under `hi_flow/skills/arch-audit`; do not fork implementation by host platform.
- Do not install dependencies into an installed plugin cache or audited project.
- Do not vendor `node_modules` or add a network-dependent first-run bootstrap.
- Release the repair as hi_flow `0.15.2` and keep all platform manifests synchronized.

## Contract and Harness Impact

**Behavior Registry:** not affected; accepted behavior is already stated in `SKILL.md`.
**Runner command:** `npm test`, plus clean-package distribution smoke.
**Architecture contract:** existing self-contained-runtime boundary is preserved; no rules-patch change.
**Active Issue handling:** no pre-existing row. If execution ends partial or blocked, add a focused Active Issue before close-out.

| Contract ID | Source | Expected | Current failure | Executable proof | Plan action |
|---|---|---|---|---|---|
| arch-audit/self-contained-runtime | `hi_flow/skills/arch-audit/SKILL.md` | Installed runtime works without cache-local package installation | `tsx` and dependency-cruiser resolve only through missing `node_modules` | `tests/distribution/standalone-runtime.test.ts` | add RED, ship autonomous build artifacts, verify clean copy |

## File Structure

- Create: `hi_flow/skills/arch-audit/scripts/build-runtime.mjs` - deterministic multi-entry runtime builder and freshness check.
- Create: `hi_flow/skills/arch-audit/dist/*.mjs` - checked-in platform-neutral runtime artifacts.
- Create: `hi_flow/skills/arch-audit/tests/distribution/standalone-runtime.test.ts` - clean installed-plugin regression proof.
- Modify: `hi_flow/skills/arch-audit/package.json` and lock - build scripts and direct Node runtime commands.
- Modify: `hi_flow/skills/arch-audit/core/depcruise-runtime.ts` - resolve the shipped dependency-cruiser bundle.
- Modify: `hi_flow/skills/arch-audit/SKILL.md` - describe the actual autonomous runtime contract.
- Modify: platform/plugin manifests, `PROJECT_STATE.md`, and relevant release documentation - version and verified state.

---

### Task 1: Reproduce the installed-package failure

**Covers:** `arch-audit/self-contained-runtime`

- [ ] Add one distribution test that copies the shipped plugin/runtime without `node_modules`, runs the real version preflight, then audits a fixture project.
- [ ] Run focused RED and confirm failure is caused by the missing installed runtime, not test setup.

### Task 2: Ship the minimal autonomous runtime

**Covers:** `arch-audit/self-contained-runtime`

- [ ] Add a deterministic build that bundles the four ArchAudit CLI entrypoints and the dependency-cruiser CLI into `dist/`.
- [ ] Point package scripts and runtime resolution at shipped `dist/*.mjs` artifacts.
- [ ] Keep source execution, typecheck, and tests as development concerns; installed execution must require only Node.js and shipped files.
- [ ] Add a freshness check so source/build drift fails verification.
- [ ] Run focused GREEN and the full ArchAudit suite.

### Task 3: Synchronize instructions and release metadata

- [ ] Replace cache-local `node_modules` requirements in `SKILL.md` with the shipped-runtime contract and commands.
- [ ] Verify the revised skill against the clean-install scenario used for RED.
- [ ] Bump internal runtime package and all Claude Code, Codex, Cursor, and marketplace manifests consistently for hi_flow `0.15.2`.
- [ ] Update `PROJECT_STATE.md`; remove only Active Issue entries already conclusively closed by verified current state.

## Completion Protocol

- [ ] Write `docs/superpowers/plans/2026-08-16-arch-audit-standalone-runtime-bug-fix-report.md` with status, evidence, deviations, and open items.
- [ ] Run focused distribution regression, runtime freshness check, `npm test`, `npm run typecheck`, plugin manifest validation, and `git diff --check`.
- [ ] Confirm a copied plugin tree with no `node_modules` produces real D8 audit artifacts.
- [ ] Complete isolated code review and resolve Critical/Important findings.
- [ ] Skip a new arch-audit of this repository only if the distribution repair does not change dependency boundaries visible in audited project code; record the reason in the report.
- [ ] Create a PR against `master`, wait for required checks, merge only after review and green verification, then verify `origin/master` and release metadata are ready for plugin refresh.
