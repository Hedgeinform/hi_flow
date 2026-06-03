# Implementation Report: hi_flow:ops — Design Spec

**Spec:** `docs/superpowers/specs/2026-06-03-hi_flow-ops-design.md`
**Plan:** `docs/superpowers/plans/2026-06-03-hi_flow-ops.md`
**Date:** 2026-06-03
**Status:** completed

## What was done

The `hi_flow:ops` skill (last-mile delivery — "profile + render") was built end-to-end via subagent-driven development (one implementer per task + spec-compliance / quality review per task, behavioral + spec-compliance validation at the end).

**References (Task 1):**
- `hi_flow/skills/ops/references/profile-schema.md` — delivery-profile field schema (15 fields, typed `[render-var]`/`[note]` with value-shapes), the `fix-profile` read-only inspection checklist, a sanitized filled-profile skeleton (placeholders only). R3 (operator-personal) fixed.
- `hi_flow/skills/ops/references/template-manifest.md` — SSoT of the covered template set (9 rows, `template → form → source-of-truth`), the ops-analog of bootstrap's coverage-manifest. `ci.yml`-is-bootstrap exclusion fixed; covered set = `{container, static}`; grows-by-row rule (§10).

**Templates (Tasks 2-3)** — all parameterized from the live `Hedgeinform/zhenka` monorepo (local files + `gh api`), no leaked literals/secrets:
- `templates/container/`: `Dockerfile`, `docker-compose.yml`, `deploy-staging.yml`, `deploy-prod.yml`, `vector.yml` (optional observability).
- `templates/static/`: `deploy-web-staging.yml`, `deploy-web-prod.yml`.
- `templates/shared/`: `configure-env.yml`, `vhost-snippet.md` (proxy + static-root variants), `.env.example`, `docs-ops-runbook.md` (host-bring-up vs per-project split).

**SKILL.md (Tasks 4-8)** — 13 sections covering spec §1-§10 + `## References`: frontmatter (RU+EN triggers + 4 anti-triggers), Overview (scope-line / place-in-chain / terminal-in-DAG / artifact-nature), Two operations, Onboarding atom (shape→render→wire→verify + form-detection + secrets ordering), Five delivery concerns (profile/project split + `/health` contract + port allocation), Coverage model (covered/best-effort + two caveats + bootstrap contrast), Co-tenant safety (R7), What it produces (SSoT map + R5), Boundaries (bootstrap/D14/writing-plans/living-architecture + two seams), the best-effort open seam (OQ-ops-7), Extensibility (three axes), Entry/triggers, Done criterion, Failure/abort/rollback, Idempotent re-onboard, Anti-patterns.

**Registration + version (Task 9):** registration is auto-discovery (plugin.json does not enumerate skills, matching bootstrap/arch-spec). Version bumped `0.7.2 → 0.8.0` synchronously in `hi_flow/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` (D16); marketplace description updated "Six → Seven skills" with the ops descriptor added.

**Validation (Task 10):**
- Structural: per-section controller check during authoring; frontmatter valid; pointers (profile-schema/template-manifest) correct; zero dangling forward-references (the bracketed placeholders left during incremental authoring were all resolved); plain-language discipline; size discipline (profile/manifest pointed-to, not duplicated); no leaked literals across templates.
- Behavioral: fresh subagent simulated all 6 scenarios (fix-profile; onboard container covered; onboard static covered; onboard off-profile best-effort; co-tenant port-collision + `nginx -t`; re-onboard idempotency). Held up; 5 findings fixed (below).
- Spec compliance: fresh isolated subagent verified SKILL.md + references against spec §1-§13 → **COMPLIANT**. All 6 critical fidelity checks passed (best-effort honesty / narrowed closure / ops-creates-CD / R5 no-third-writer / cross-cutting co-tenant / scope-line). No contradictions, no scope creep.

## Deviations from spec

- **Dockerfile generalized Bun → Node.** The live zhenka Dockerfile uses Bun; the spec/manifest label the template "Dockerfile (Node/TS service)" and bootstrap's covered runtime is Node/TS, so the template targets Node/npm for cross-skill consistency. Multi-stage structure preserved; header documents swapping the package manager. (Reviewer: justified.)
- **prod workflows normalized to `workflow_dispatch` + minimal delta.** The live `deploy-prod.yml` / `deploy-web-prod.yml` auto-trigger on `push:[main]` with richer tagging; the templates collapse prod to the staging skeleton with only the environment+tag+(port|static-root) delta, per the plan's structural check and spec §9 ("prod never auto — gated by the `production` GH Environment, not the trigger"). "Prod never auto" is honored more strictly, not less.
- **configure-env parameterized by environment (validation Fix 1, beyond a literal port).** The source `configure-bot-env.yml` is prod-only; the spec's own done-criterion makes `configure-env` a precondition of the first *staging* deploy. The template was generalized with an `<ENV>` token so it can seed `.env.staging` / restart the staging service. This realizes spec intent the prod-only source did not expose — see Issues.

## Issues discovered

- **Spec done-criterion vs prod-only secret transport (resolved, Fix 1).** Spec §9 names `configure-env` as the staging-deploy precondition, but the reference source workflow is prod-only and container staging relies on `.env.staging` being pre-placed (deploy-staging only `pull`+`up`). The template needed environment-parameterization to satisfy the spec. Worth a spec footnote: the secrets precondition is **per-environment**.
- **Coverage model is per-form; real projects can be covered-app + uncovered-component (resolved, Fix 2).** Spec §6 frames coverage at the packaging-form level. A covered container app that also needs an uncovered on-box component (Postgres/Redis/object-store) had no routing rule, risking a silent-turnkey improvisation. A per-component coverage rule was added to the Coverage model (render the app turnkey; route each uncovered co-component through best-effort with the loud signal + promotion proposal). **This extends the coverage model beyond the literal spec — flagged for operator awareness.**
- **Runbook per-project commands were first-run-only (resolved, Fix 3).** `ln -s`, `docker network create`, `certbot` error on re-run, contradicting the SKILL.md "re-onboard is safe" contract. Made idempotent (`ln -sf`, `… || true`, cert-exists guard) + a re-run-safe note.
- Minor (resolved): trigger «зафиксируй сервер» vs anti-trigger «зафиксируй стек» disambiguation line (Fix 4); routine port-occupancy → advance-to-next-free vs stop-and-signal-on-conflict reconciliation (Fix 5).

## Open items

- **OQ-ops-1** (distributable probe-to-fill mechanics) — open; the seam is documented (Extensibility axis 3).
- **OQ-ops-2** (multi-profile selection UX) — open; deferred until a second target exists.
- **OQ-ops-3** (observability depth beyond the floor) — open; floor set (healthcheck/restart/log-rotation/uptime).
- **OQ-ops-4** (best-effort → covered promotion mechanics) — referenced in the Coverage model; full mechanism open.
- **OQ-ops-5** (runbook Caddy-vs-nginx drift reconciliation) — profile fixes the fact (nginx); the templates/runbook note the divergence as profile-dependent; reconciliation open.
- **OQ-ops-6** (always-shippable / continuous-deploy + throwaway-staging as a mode) — not addressed; open for a future iteration.
- **OQ-ops-7** (best-effort execution seam — non-deterministic config-authoring with no execution owner) — honestly open in SKILL.md (`## The best-effort open seam`); covered path is deterministic, best-effort is not, and the skill says so.
- **Per-component coverage rule (Fix 2)** — added beyond the literal spec; consider folding back into the spec / a future amendment.
- **ARCHITECTURE.md fixations** (spec §11) — proposed through the `architecture` skill proposal-flow (operator confirmation): D23 close, D14 amendment, D20 clarification, Module Map ops=BUILT, Topic Index candidates, bootstrap-CD-stub amendment (open).
- **Commit** — pending operator decision (standing rule; nothing committed by the implementation).
