---
name: arch-redesign
description: Use when operator says «давай сделаем редизайн / спроектируем фикс архитектурного долга / let's redesign / design refactor for these findings». Produces a campaign roadmap or a refactor plan with rules-patch from a D8 audit-report.
---

# arch-redesign

## Overview

Help the operator turn accumulated architectural debt into an actionable refactor plan. Two modes: triage (transforms all audit findings into a campaign roadmap with priorities and dependencies) and cluster-mode (for one cluster, produces a refactor plan with architectural choice, target state, fitness checkpoints, plus a rules-patch — candidate project rules to harden the architecture).

Corrective design skill of the hi_flow family. Refactor plan is consumed downstream by `superpowers:writing-plans`. Rules-patch is consumed by `hi_flow:arch-audit` via explicit operator apply.

## When to use

The operator brought an audit-report of architectural violations and wants to design a remediation strategy — which problems to solve together, in which order, through which architectural changes.

## Anti-triggers (do NOT auto-activate)

- «давай проверим архитектуру», «запусти аудит» — that's `hi_flow:arch-audit`, not redesign.
- «найди архитектурные проблемы», «что у нас с кодом» — research / debugging, not redesign.
- «сделай рефакторинг X» — direct execution request, not architectural design.
- «давай спроектируем фичу X» — feature-level prophylactic, `arch-spec` or `feature-spec`.

## Pre-condition: D8-valid audit-report

The skill works only with structured findings in D8 format. Without this, clustering hallucinates.

Before continuing, validate input through three checks.

### Existence check (hard fail)

If audit-report is not found at the path:

> Audit-report не найден по пути `<path>`. Без structured findings скилл будет галлюцинировать кластеризацию. Запусти `arch-audit` или положи audit-report в формате D8 schema по этому пути.

Stop. Do not proceed.

### Schema check (hard fail)

If the file is found but violates D8 schema (missing reason fields, missing `audit_sha`, missing library references):

> Audit-report найден, но `<конкретное нарушение>`. См. schema в `hi_flow/skills/arch-audit/references/d8-schema.md`. Перезапусти arch-audit или дополни вручную.

Stop. Operator override is not available — bullshit output is worse than no output.

### Freshness check (soft ask + override)

Compare `audit_sha` from metadata with `git rev-parse HEAD`:

- Match → proceed silently.
- Differ → soft ask:
  > Audit на коммите `<audit_sha>`, текущий HEAD `<current_sha>`, прошло N коммитов. Запустить `arch-audit` заново или продолжить с этим?

  Operator decides. If "continue" — log the reason in session log.

If not a git repository → skip freshness check, show warning «freshness check пропущен — проект не под git'ом».

## Mode selection

The skill always executes when activated. It only decides the mode: triage or cluster-mode.

Read the audit-report, check signals, give recommendation to the operator.

**Triage signals:**
- 10+ findings.
- 3+ distinct reasons.
- 3+ potential clusters (auto-grouping by reason).
- > 10% unmapped findings.
- Has CRITICAL severity.
- Cross-cluster signals (module overlaps with different reasons).

**Direct cluster-mode signals:**
- 1-2 findings.
- One reason for all.
- Single cluster of 3-7 violations.
- Only MEDIUM/LOW severity.
- No cross-cluster overlaps.

When signals conflict, triage signals prevail (conservative default).

Show the operator the recommendation with reasoning:

> Вижу N findings, M разных reason'ов, X CRITICAL — рекомендую `<triage / direct cluster-mode>`.

Operator override always works. If override contradicts the recommendation, log the reason in session log on one line.

## Common Rationalizations

| Thought | Reality |
|---|---|
| "Audit is small, I'll jump straight to cluster-mode" | If 3+ distinct reasons exist, violations are likely NOT in one cluster. Use triage. |
| "I know what to fix, no triage needed" | Triage surfaces cross-cluster dependencies you don't notice. If after triage you decide you knew everything — ten minutes lost; if you skip — risk of suboptimal sequence. |
| "No fresh audit, but I know what to fix" | Without reason fields, clustering is hallucinatory (D8). Run arch-audit. Pre-condition is not bypassable. |

---

## Triage mode

Transform a set of architectural violations into a campaign roadmap.

### Session intro (display, not probe)

Show audit statistics: total finding count, severity breakdown, unmapped count, cluster count after auto-grouping by reason.

### Step 1 — Cluster shape refinement

Show the auto-grouping table. Raise questions **only** where you see a fork:

- Merge two clusters if root causes coincide.
- Split a cluster if it contains two distinct problems.
- Sub-probe for unmapped findings: mini-cluster, distribute across existing, merge unmapped together.

For other clusters — state without questions.

After this step, the cluster shape is settled.

### Step 2 — Cluster fate assignment

For each cluster, three mutually exclusive options:

- **In campaign** (default).
- **Accept as drift** — goes into Known Drift via the `architecture` skill.
- **Defer** — to the next campaign.

Recommend based on severity + size + cascade effect; operator confirms or overrides.

### Step 3 — Identify dependencies between campaign clusters

Only for clusters in campaign. Propose dependencies based on signals:

- **Shared modules.** Clusters touching the same modules are likely sequential.
- **Technical blockers.** Checkpoint A is unreachable until B is done.

Operator confirms or corrects.

### Step 4 — Prioritization

Propose ordering: severity (CRITICAL first) + cascade effect (unblocking ones earlier) + size (compromise by context). Operator corrects.

### Step 5 — Sanity check

Verify:
- **Coverage:** every finding has a judgment (in campaign / accepted as drift / deferred / part of unmapped).
- **Connectivity:** the dependency graph between campaign clusters is not cyclic.
- **Sizes:** campaign clusters of 10+ — justification or split required.

### Output: campaign roadmap

Write campaign roadmap to `docs/superpowers/specs/<date>-arch-redesign-campaign.md`. Exact structure — in `references/campaign-roadmap-template.md`. Includes:

- Campaign cluster list (name + cause + findings + size + priority).
- Lists of accepted drifts and deferred clusters.
- Dependency table.
- Mermaid dependency diagram.
- **Expected post-campaign state** — which principles should disappear from the audit, direction of NCCD change.

**Mermaid regen rule.** Source of truth — the text table. After any change to the table, regenerate Mermaid strictly from the table.

### Self-Review (via isolated subagent)

Pass the subagent the path to roadmap + checklist. **Conversation history is NOT passed.**

Self-Review checklist:
- Placeholder scan: no TBD, vague formulations, clusters without name.
- Internal consistency: fates do not contradict prioritization, graph ↔ table.
- Scope check: artifact has not slipped into cluster-mode design.
- Ambiguity check: cluster names and dependencies are unambiguous.
- Format compliance: each cluster has name + cause + findings + size + priority.
- Mermaid regeneration: diagram is generated from the dependency table (source of truth = table); no drift.
- Coverage: every finding has judgment.

Apply fixes inline. **No re-review** — fix and move on.

### User Review Gate

Show operator:

> Campaign roadmap записан в `<path>`. Прочитай и дай знать, если хочешь правки до cluster-mode сессий.

Wait for response. If changes — apply + re-run Self-Review. Only after approval — closure.

### Transition offer (after approval)

Offer three options:

> Что дальше:
> 1. Запустить cluster-mode для кластера `<highest-priority>`.
> 2. Выбрать другой кластер из roadmap.
> 3. Остановиться, вернёмся позже.

By choice:
- **1 or 2** → invoke cluster-mode for the chosen cluster, passing cluster scope from the roadmap.
- **3** → close the session.

Do not chain automatically. Wait for operator's choice.

---

## Cluster mode

Design a refactor plan for one cluster.

### Session intro (display, not probe)

Show cluster scope: list of violations, root cause from audit reason fields (via the principles library at `hi_flow/references/architectural-principles.md`), relations to other clusters from the roadmap.

**Do not re-confirm root cause** — that's audit's territory (D8). Operator override goes through the override path, not through a probe.

### Step 1 — Surface architectural alternatives

Pull typical alternatives for the named principle from the principles library. Show 2-3 alternatives with short pros and cons.

**If the operator passed context about a previous attempt** (for example, «мы пробовали extract transport/, на impl-сессии вылезла скрытая зависимость X») — exclude failed alternatives from display, explicitly factor the discovered constraint into the formulation of remaining ones.

### Step 2 — Select alternative

Operator selects. Record in fork cell (feature-spec format): `### Rx [decision: ...] / Альтернативы / Решение / Связи`.

### Step 3 — Target state + ordered fitness checkpoints + rules-patch

Formulate target state at module level, not code level. For example: «модуль `transport/` существует, send-path-логика живёт там».

List of fitness checkpoints — ordered architectural invariants in audit's language. For example: «нет ребра `dispatcher → pipeline`».

**Checkpoints are scoped to this cluster only.** If there is overlap with another cluster — note in step 4 (dependencies), not in checkpoints.

**Rules-patch generation.** After checkpoints are settled, deterministically convert each one into a depcruise rule (provisional format — see `references/rules-patch-template.yaml`). Patch is a separate YAML file alongside the refactor plan, one patch per cluster. Each rule MUST have a `principle` field referencing a canonical id from the D9 library — this is the D8 contract applied to rules. Rule names match checkpoint names for traceability.

**Patch is not applied automatically.** It is a candidate output. Apply is an explicit operator action via `arch-audit apply-patch <path>` or via interactive prompt at the next audit run (per D11).

### Step 4 — Hidden dependencies + cluster-cluster relations

Closed checklist (not open premortem):
- Runtime dependencies (config-load order, lazy imports, dynamic dispatch).
- Test infrastructure (mocks tied to module structure).
- Data migrations.
- External consumers.
- Configuration / ENV.
- Cluster-cluster relations (this is blocked by another / blocks another).

### Cross-cutting checks

- **Coverage:** all cluster violations are covered by the chosen alternative and checkpoints. If a finding remains outside the fix — cluster is mis-grouped (escape valve).
- **Architectural-level discipline:** artifact stays at module level, not code level.
- **Plain language:** artifact is readable by a product manager.

### Session-level escape valve

If during steps 3-4 a signal surfaces that "a finding does not fit the chosen alternative / cluster is mis-grouped" — interrupt cluster-mode and return the operator to triage. Log the reason for the abort in session log.

### Output: refactor plan + rules-patch

Cluster-mode produces **two artifacts**:

**Refactor plan** — `docs/superpowers/specs/<date>-arch-redesign-<cluster-name>.md`. Exact structure — in `references/refactor-plan-template.md`. Contains:

- **Goal line** — single sentence (what we are fixing).
- **Tech Stack line** — project's stack.
- **Refactor framing note** — type=refactor, behavior preservation critical.
- Cluster scope, fork cells, target state, success criteria (fitness checkpoints), stop conditions (bail for class A), hidden deps, cluster-cluster relations.
- **Rules-patch reference** — path to patch file, list of rules in it, apply instructions.

**Rules-patch** — `docs/superpowers/specs/<date>-arch-redesign-<cluster-name>-rules-patch.yaml`. Exact structure — in `references/rules-patch-template.yaml`. Contains:

- `forbidden:` array — forbidden module-edge rules, one per "no edge X → Y" checkpoint.
- `required:` array — structural invariants, one per "module exists / X always passes through Y" checkpoint.
- Every rule has `name` (matching its checkpoint), `severity`, `principle` (canonical id from D9 library).

### Self-Review (via isolated subagent)

Pass the subagent **both paths** (refactor plan + rules-patch) + checklist. **Conversation history is NOT passed.** Without the patch path the subagent cannot verify the «Rules-patch generation» checklist item.

Self-Review checklist:
- Placeholder scan: no TBD, fitness checkpoints without explicit conditions.
- Internal consistency: alternative → target state → checkpoints are aligned.
- Scope check: artifact at module level, not code level.
- Ambiguity check: cells with explicit status, alternatives, decision, rationale; checkpoints in audit's language.
- Format compliance: cells in feature-spec format, target state at module level, checkpoints ordered, hidden deps closed checklist.
- Coverage: all violations covered by chosen alternative and checkpoints.
- Rules-patch generation: every fitness checkpoint has a corresponding rule in the patch file; patch is syntactically valid YAML; rule names match checkpoint names (traceability); every rule has a `principle` field referencing a canonical id from the D9 library.

Apply fixes inline. **No re-review.**

### User Review Gate

Show operator:

> Refactor plan и rules-patch для кластера `<cluster-name>` записаны:
> - План: `<plan-path>`
> - Rules-patch: `<patch-path>` (не applied)
>
> Прочитай и дай знать, если хочешь правки до передачи в Phase 3.

Wait for response. If changes — apply + re-run Self-Review. Only after approval — closure.

### Transition offer (after approval)

Tell operator about patch apply timing + offer three options. Before showing the message, check whether `hi_flow:arch-audit` is available in the loaded skill list — if not, swap the apply phrasing accordingly.

**If arch-audit is available:**

> Patch применишь когда захочешь: `arch-audit apply-patch <patch-path>` — рекомендуется до Phase 3, чтобы прогресс был виден в audit'ах. Либо дождись следующего полного audit прогона — он сам спросит про un-applied patches.
>
> Что дальше:
> 1. Перейти к следующему кластеру по roadmap (`<next-cluster-name>`).
> 2. Передать план к имплементации (рекомендуем `superpowers:writing-plans`).
> 3. Остановиться.

**If arch-audit is not available** (still planned / not installed):

> Patch сохранён в `<patch-path>`. Apply через `arch-audit apply-patch` будет доступен, когда `hi_flow:arch-audit` станет установлен. До тех пор — patch ждёт, либо вмешивайся в project rules-файл руками.
>
> Что дальше:
> 1. Перейти к следующему кластеру по roadmap (`<next-cluster-name>`).
> 2. Передать план к имплементации (рекомендуем `superpowers:writing-plans`).
> 3. Остановиться.

By choice:

- **1** → invoke cluster-mode for the next cluster.
- **2** → check whether `superpowers:writing-plans` is available in the loaded skill list:
  - **Available** → invoke it with the refactor plan as input spec.
  - **Unavailable** → notify operator:
    > Refactor plan записан в `<path>`. `superpowers:writing-plans` не найден в текущем окружении. Передай план в свой impl-toolchain руками, или установи плагин superpowers для chain'а.

    Close session without invoke.
- **3** → close session.

Do not chain automatically. Do not auto-invoke `arch-audit apply-patch` — apply is an explicit operator action (D11).

---

## References

- `references/refactor-plan-template.md` — refactor plan output structure.
- `references/rules-patch-template.yaml` — rules-patch output structure (cluster-mode second artifact, per D11).
- `references/campaign-roadmap-template.md` — campaign roadmap output structure.
- `references/d8-schema.md` — pointer stub → canonical location: `hi_flow/skills/arch-audit/references/d8-schema.md` (markdown spec) + `hi_flow/skills/arch-audit/references/d8-schema.json` (JSON Schema for validators).
- `hi_flow/references/architectural-principles.md` — shared D9 library (catalog of principles with typical fix alternatives; owner — arch-audit).
