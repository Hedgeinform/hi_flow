---
name: ops
description: Use when operator says «настрой доставку проекта X», «выкати X на VPS», «подключи проект к серверу», «настрой CD для X», «зафиксируй мой сервер», «настрой deployment-профиль», «опиши таргет доставки», or English equivalents («set up delivery for X», «deploy X to VPS», «set up CD for X», «fix my server profile»). Input — a ready project that already works on your machine (project class / `## Stack` fixed by bootstrap) + a delivery profile; output — a CD workflow (deploy + configure-env) plus compose/Dockerfile (container form) or build+rsync (static form), a `docs/ops` deployment record, and a first green staging deploy. ops is the last mile: it ships a built product onto a machine that is not yours.
---

# ops

## Overview

ops is the **owner of the last mile** in the hi_flow family — making a built product run on a machine that is **not yours** (production / a customer's box). It is the height-paired sibling of bootstrap: bootstrap builds the foundation (stack, scaffold, CI gates), ops ships the result onto someone else's iron.

**Scope line — "your machine vs not yours."** A local preview (`vite dev` against a local backend) = "your machine" = **outside ops**, already covered by the bootstrap scaffold. ops begins exactly where the artifact must be relocated onto someone else's iron and made to live there.

**Place in the chain.**

```
… arch-spec → bootstrap (foundation) → writing-plans (feature impl)
      → [feature works on YOUR machine] → ops (delivery onto a NOT-yours machine)
```

**ops is terminal in the plugin DAG.** Its output (Dockerfile, CD workflow, deploy) is consumed by nothing downstream in the chain — unlike bootstrap, whose artifacts feed arch-audit. This is a central property: ops adds no link the rest of the plugin reads, so its coverage model and boundaries differ from bootstrap's accordingly.

**Artifact nature.** ops is a **markdown skill + scaffold-templates**, like bootstrap — **not** a code skill with a runtime. "Render" = the agent instantiating the templates per the SKILL.md instructions, not a TS engine. Consequence: OQ11 (packaging a code skill for public release) does **not** apply to ops.

## Anti-triggers (do NOT auto-activate)

- «напиши план фичи», «implementation plan» — that is `superpowers:writing-plans`: the implementation plan for a **feature** over a ready codebase. ops is the last mile, orthogonal to feature planning.
- «настрой фундамент», «зафиксируй стек» — that is `hi_flow:bootstrap`: the project's technical **foundation** (stack, scaffold, CI gates). bootstrap builds; ops delivers. (Note: «зафиксируй **сервер** / профиль» → ops; «зафиксируй **стек** / фундамент» → bootstrap — the object noun disambiguates.)
- «обнови архитектуру» — that is `living-architecture`: maintaining the living **document**. ops does not write ARCHITECTURE.md (decoupled); a deployment may be recorded there by living-architecture's own event, not by ops.
- «посмотреть фронт локально», local preview — **not ops** ("your machine"). Local preview is outside the scope line, already covered by the bootstrap scaffold.

## Two operations

ops has exactly two operations. They differ in cadence and in unit:

- **`fix-profile`** — **rare**, run per box/target. It captures the delivery substrate (the server, its reverse-proxy, TLS, registry owner, server layout, env/secret transport, observability) into a reusable, **operator-personal** *delivery profile*. The operator has one profile today = `zhenka-vps`. The mechanic is a **read-only inspection checklist** (read current state, principle 9 — not a blind interview). Do **not** restate the profile fields or the inspection commands here — read `references/profile-schema.md` for the field schema, the typing (`[render-var]` / `[note]`), and the per-field read-only probe; operator confirmation is mandatory before a profile is fixed.

- **`onboard <project>`** — **frequent**, run per project. It renders the proven templates for a given **(project × profile)** pair, wires the project to the profile's CD machinery, and does a first staging deploy. This is the operation that runs the onboarding atom below.

The profile is read **dynamically** (adding a target = adding a profile file, never editing the skill). The two operations compose: `fix-profile` makes a substrate known once; `onboard` consumes that known substrate many times.

## Onboarding atom — shape → render → wire → verify

`onboard` runs one atom, the ops-analog of bootstrap's probe → scaffold → wire. The **same four steps are reused by both packaging forms** (container / static); a `fullstack` project runs the atom twice (front = static, back = container), each with its own facts. Four steps:

1. **shape** — fix the packaging form and collect the project-local facts.
   - **Form-detection rule:** the form is **taken from the project class / `## Stack` fixed by bootstrap — not guessed from the repo.** `frontend` (Vite SPA, a static build with no server runtime) → **static**; `backend-service` / bot / any long-running process with a server port → **container**; `fullstack` → **both** forms (front = static, back = container), each its own atom. If the class is genuinely ambiguous, **ask the operator** in plain product terms (P6) — do not infer it from the repository.
   - **Project-local facts:** name, (sub)domain, port, the needed env-key **names** (not values). These are project-level — the infrastructure is the *profile*, already known — so probing here is degenerate (allocation rules: see **Five delivery concerns → Port allocation**). This step gathers only what is specific to *this* project on the *already-known* box.

2. **render** — instantiate the templates for the chosen form. Do **not** copy the template registry here — read `references/template-manifest.md` for the covered set (`template → form → source-of-truth`) and the render tokens; the render step reads it dynamically and lays the rows named for the form (container vs static).

3. **wire** — connect the project to the profile's machinery: GHCR owner; GitHub repo secrets / Environments (staging without a gate, prod behind an approval); the server project directory + docker network; the vhost applied via `nginx -t && reload`; the LE cert. **The CD workflow is created by ops** — ops owns the deploy / CD templates (R6). If a CD stub already happens to exist in the project, ops **completes** it without duplicating; the base case is that ops creates it.
   - **Secrets ordering:** before the first deploy, ops runs the `configure-env` workflow (or asks the operator when the values are not yet set). **"Secrets present on the box" is a precondition** of the staging deploy — configure-env precedes the first deploy, never trails it.

4. **verify** — the first staging deploy is **green** + the healthcheck passes (the done criterion — see the **Done criterion** section). **prod is never automatic.** On a red deploy → abort / rollback so the box is never left half-wired — the abort/rollback details live in the **Failure / abort / rollback** section; this step only references them.

**R6 boundary (for the wire step):** ops owns the deploy / CD templates and the wiring; `superpowers` is the methodology for implementing **new project code**. The standard Dockerfile rendered from a template is an **ops render**, not a superpowers artifact.

## Five delivery concerns

Delivery has **five concerns** — a **working checklist**, not a closed taxonomy. Unlike bootstrap's 8 infrastructure axes (a set checked for exhaustiveness), this set was **not** verified for completeness and **may grow** as new delivery substrates appear (a growth axis, §10). The profile **fixes** them once per box; `onboard` **distributes** them per project.

| Concern | Profile-level (once per box) | Project-level (per project) |
|---|---|---|
| **host / runtime** | the box itself + its shape (Docker, host daemons under systemd) | — (the runtime lives in the profile) |
| **packaging + CD** | the deploy / CD machinery the profile owns | the `onboard` render + the deploy workflow for *this* project |
| **secrets** | the profile's secret transport (e.g. GH secrets → `.env`) | this project's key **names** |
| **network** | the profile's reverse-proxy | this project's vhost + (sub)domain + cert |
| **observability + recovery** | profile-level monitoring (uptime account, log rotation) | this project's `/health` contract + healthcheck + per-project monitor |

**Two levels — host-bring-up vs per-project.**

- **Profile-level = host-bring-up (once per box).** docker log rotation, the uptime-monitor account, host daemons under systemd, registry auth, the docker network, host-hardening (firewall / SSH / fail2ban, from the runbook). On a live box this is **usually already done** (the box is alive — customer demos run on it); `fix-profile` *captures* it (read-only inspection, principle 9), and `onboard` **never repeats** it.
- **Project-level (per project).** the healthcheck in compose, the `/health` endpoint, a log shipper if logs are wanted, the uptime monitor pointed at this project's `/health`, the vhost, the cert.

Do **not** restate the profile fields here — `references/profile-schema.md` is the field schema for the profile-level column.

**The `/health` contract (what the done-gate checks).** Minimum: HTTP `200` on `GET /health` (a body is optional; if present, a short `ok` marker for the uptime keyword-check). The static form's analogue: `200` on the root `index.html`. This contract is an **obligation of the project toward ops** — it is provided by the bootstrap scaffold / the feature implementation, **not** by ops. ops only **consumes** it (the verify step depends on it); ops does not implement `/health`.

**Port allocation.** ops scans the profile's port-convention range (`31xx / 32xx`), takes the **next free** port (the occupancy check is part of the co-tenant pre-checks, R7 — see below), and records the chosen port in the project's `docs/ops/`. This is the resolution of the "shape" step's port-allocation forward-reference: the infrastructure is the *profile* and is already known, so this is allocation, not a probe.

## Coverage model

Coverage is **the key difference from bootstrap** — and it carries a different load.

**Why bootstrap's coverage is a hard gate (binary).** bootstrap's covered entities **feed other plugin skills**: arch-audit will not run without a stack-file / adapter / baseline. So bootstrap's coverage is **chain-integrity** — covered or `unmanaged`, binary, because a missing link breaks a downstream skill.

**Why ops differs (two levels).** ops is **terminal in the plugin DAG** — its output is consumed by nothing downstream (a new runtime shipped via ops touches no other skill). So coverage degrades **softer**, into two levels:

- **covered** — a polished template exists → **turnkey** render + wire + verify.
- **best-effort** — no template, but ops can configure it **ad-hoc** → it tries, with two caveats below.

Do **not** restate the template registry here — `references/template-manifest.md` is the SSoT of what is currently covered; the render step reads it dynamically.

**Two caveats** (they preserve what coverage-honesty is *for*):

1. **Transparency of the guarantee (principle 5).** A polished template carries baked-in correctness — healthcheck, restart policy, secret transport, hardening, observability. best-effort is presented **as** best-effort, in plain terms where the operator hears it: *"configured in place, not from a proven template — recovery / secrets / observability may have come out weaker, check X / Y / Z."* It is **never** passed off silently as turnkey.
2. **Promotion path.** A best-effort setup that proved itself is **promoted to covered** (a template + a row in the template-manifest) — growth axis #2 (§10). This keeps one-off setups from piling up as un-polished drift. Full promotion mechanics — **OQ-ops-4**.

**Coverage is judged per packaging form AND per required component.** A project may be **covered for its app form while requiring an uncovered co-component** on the box (a database / cache / object store — e.g. Postgres-on-the-box). In that case: render the app **turnkey** (covered) and route each uncovered co-component through the **best-effort path** — its own loud signal + promotion proposal (principle 5). **Never fold an uncovered component silently into the covered render** — that is the silent-turnkey anti-pattern, and it would pass an unproven setup off as turnkey.

**The conceptual difference, stated plainly.** For bootstrap, "coverage" = **chain integrity** (its covered entities feed other skills). For ops, "coverage" = **trust / quality for the operator + safety of the shared substrate** (ops is terminal in the DAG, so the load shifts off "downstream skills" entirely). One word, two different load-bearing meanings.

**Probing is degenerate.** The profile is known and the only one — there is no infrastructure menu. `onboard` merely **confirms the form** and collects project-local parameters (the ops analogue of bootstrap's buy-in at coverage = 1: **do not fake a choice** that does not exist).

## Co-tenant safety (R7)

ops is terminal **in the plugin**, but **not isolated on the substrate**: the VPS hosts **live customer demos**. This is what, for ops, **replaces "downstream skills"** as the real coupling it must respect — the coupling is lateral (co-tenants on the box), not downstream (skills in the chain).

A bad `onboard` can hit the neighbours — a port collision, a broken vhost on `nginx -s reload`, a resource hog. The discipline:

- **idempotent, co-tenant-aware operations** — re-running `onboard` must not double-wire or clobber a neighbour;
- **verify-before-done** — `nginx -t` **before** reload, a port-occupancy check before allocation, `compose config` validation **before** `up`;
- **abort / rollback on failure** — so the box is never left half-wired (the detailed abort/rollback mechanics live in the **Failure / abort / rollback** section — this section only references them).

**Cross-cutting, not a coverage level.** Co-tenant safety applies **equally** to covered and best-effort. It is not a tier of coverage — it is a substrate property that holds for every `onboard`, turnkey or ad-hoc alike.

## What it produces and where it writes

ops writes into **four distinct landing places**, each the canonical home for one kind of fact. The artifacts are organised by *where they land*, not by what step emits them.

| Landing place | Artifacts |
|---|---|
| **Project repo** (repo-safe — these reference GH secrets, never raw infra facts) | `Dockerfile` + `docker-compose.yml` (container form); `.github/workflows/deploy-*` + `configure-env.yml`; `.env.example`; the `docs/ops/` runbook (plus a vhost template / Vector config where needed). |
| **Operator-personal area** | the delivery profile `<name>.md` — created / updated by `fix-profile`. |
| **GitHub side** | repo secrets + GH Environments. ops does **not** set the secret *values* (the operator does, via `gh secret set`) — ops emits the **list of keys + ready-to-run commands**. |
| **Server** (once per project) | the `/srv/<proj>` directory, docker-network membership, the vhost (applied via `nginx -t && reload`), the LE cert. (GHCR auth / log rotation / the network itself are **profile-level**, once per box — not re-emitted per project.) |

Do **not** restate the template registry here — `references/template-manifest.md` is the SSoT of *which* templates land in the repo (`template → form → source-of-truth`); this section says *where the four classes of output live*, not which rows exist.

**SSoT map (each fact has exactly one canonical home — principle 4).**

| Fact | Canonical source | Projection |
|---|---|---|
| **deploy mechanics** | the workflow / compose / Dockerfile in the **project repo** | — |
| **box facts** (runtime, reverse-proxy, transports) | the **profile** (operator-personal) | — |
| **secret values** | **GH secrets** | projected into the server-side `.env` |
| **deploy-binding record** (profile, domain, port, form, env-keys, URL) | the project's **`docs/ops/`** | — |

The server-side `.env` is a **projection** of GH secrets, never an independent source — the same SSoT-as-projection discipline bootstrap applies to `## Stack` (a projection of the configs).

**ops does NOT write ARCHITECTURE.md (R5).** ops is **decoupled** from the living document — exactly like `arch-spec` (D21). This matters for **distributable / market-ready** (OQ6): a market-ready user may have no living-architecture skill, and the document must not depend on ops to stay correct. If a `## Deployment` pointer is wanted in ARCHITECTURE.md, that is **living-architecture's** work via its own event — not ops's. ops is the **second** owner (after arch-spec) that deliberately does not write the document; we **avoid a third writer** of ARCHITECTURE.md, so KD2 (the accepted two-owner break: bootstrap creates, living-architecture maintains) is **not extended** by ops.

## Boundaries (what ops does NOT do)

| Neighbour | Boundary |
|---|---|
| **bootstrap** | "envelope early, machinery late" — see below. bootstrap fixes the code-abstraction + read-convention + CI-gates + the `delegated`-axis classification early (the foundation); ops fixes the concrete deploy / CD machinery + profile binding late (at shipping). |
| **D14 (R6)** | ops owns the deploy / CD templates + wiring; `superpowers` is the methodology for implementing **new project code**. A Dockerfile/CD for a covered form is **template instantiation owned by ops**, not free-hand execution. |
| **writing-plans** | plans a feature over a ready codebase; ops is the **last mile**, orthogonal. ops does **not** need writing-plans for its own work on the covered path (render + wire is deterministic, like a bootstrap scaffold). |
| **living-architecture** | decoupled (R5). A deployment may be documented by living-architecture's own event; ops does not touch the document. |

**ops ↔ bootstrap — "envelope early, machinery late."**

- **bootstrap fixes early** (the foundation): the code-abstraction, CI-gates, and the classification of axes as `delegated` — the "envelope".
- **ops fixes late** (at shipping): the machinery — the concrete deploy / CD plus the profile binding. **The CD workflow is ops's property (R6): ops creates it.** (Note: the old "adopt an orphan `cd.yml`" framing came from a hand-made artifact in the REH repo; bootstrap, by the current spec, lays **no** CD stub. If we later decide bootstrap should leave a stub for ops, that is a bootstrap **amendment**, §11. For now: ops **creates** the workflow, and **completes** a pre-existing stub if one happens to be there.)

**Two precise seams** (the general boundary persists even where a specific profile collapses it):

1. **Secrets.** The read-convention (one config module, nothing hardcoded, read from env) = **bootstrap**. Where the store physically lives (GH secrets → server-side `.env`) = **ops**.
2. **Deployment-bound axes (DB / storage).** The adapter API / library (code speaks the Supabase / S3 API) = bootstrap's **code-abstraction**. The concrete endpoint / provider (the Supabase URL, MinIO-on-VPS vs AWS-S3) = ops's **binding**. On the `zhenka-vps` profile this is mostly "point env at the managed endpoint" → it **collapses into ops's secrets + network concerns**. The **general boundary still holds** — a profile with self-hosted storage **reactivates** this binding as a distinct seam.

**D14 refinement (R6).** D23 said "the concrete Dockerfile / CD = superpowers". Grounding changes that: a Dockerfile / CD for the **covered form** is the **instantiation of a template ops owns**, not free-hand execution. The boundary: **ops owns the deploy / CD templates + wiring; superpowers is the methodology for implementing the project's new code.**

## The best-effort open seam (OQ-ops-7)

The claim "render + wire is deterministic, so writing-plans is not needed" is true **only for the covered path**. It must not be over-generalised.

On **best-effort**, ops "configures ad-hoc" — and that **is** the non-deterministic config-authoring that finding #5 of the handoff warned about. At the same time, **superpowers has no deployment skill**. So for the best-effort path there remains an **unclosed execution seam**: neither template determinism **nor** an explicit execution owner. This is recorded **honestly as an open question (OQ-ops-7)** — it is **not** passed off as solved. The covered path is deterministic and ownerless-by-design (the template *is* the owner); the best-effort path is neither, and we say so.

## Extensibility — grows by data, not by rewriting

A deliberate design principle (the family pattern, principle 4). ops grows along **three axes, all of them "data / extension", never a rewrite of the atom**:

1. **More profiles.** A second server / target = **add a profile file**, without touching the skill.
2. **More covered packaging forms.** A third form (a worker, a different runtime) = **add a template + one row in the template-manifest**, without rewriting the onboarding atom.
3. **Distributable as a future mode.** The **profile is the seam** that turns distributable into an *extension*, not a rewrite. Personal mode = "one profile filled in advance"; distributable later = "**probe the target → fill the profile** (probe-to-fill)" in front of the **same** `profile + render` core. personal-first **closes nothing** — it simply does not yet implement the second filler.

The **profile is the distributable seam**: the same core consumes a profile whether it was filled by `fix-profile` today or by a future probe-to-fill.

## Entry and triggers

**Who runs it — only the operator, never auto (P6).** ops does **not** launch itself. An upstream signal (a feature landing green on your machine, a CI pass) may **hint** that delivery is now possible — it does **not** launch ops. The decision to ship onto a shared, customer-facing box is **product-and-timing**, and it belongs to the operator alone.

**Triggers.**

- **`fix-profile`** — «зафиксируй мой сервер», «настрой deployment-профиль», «опиши таргет доставки» / "fix my server profile", "set up the delivery profile", "describe the delivery target".
- **`onboard <project>`** — «настрой доставку проекта X», «выкати X на VPS», «подключи проект к серверу», «настрой CD для X» / "set up delivery for X", "deploy X to VPS", "connect the project to the server", "set up CD for X".

**Anti-triggers** (these are *not* ops — see also the Anti-triggers section near the top):

- «напиши план фичи» / "implementation plan" → `superpowers:writing-plans`.
- «настрой фундамент», «зафиксируй стек» / "set up the foundation", "fix the stack" → `hi_flow:bootstrap`.
- «обнови архитектуру» / "update the architecture" → `living-architecture`.
- «посмотреть фронт локально» / local preview → **not ops** ("your machine") — outside the scope line, already covered by the bootstrap scaffold.

## Done criterion

Done is an **enumerable set of gates**, like bootstrap's. The two coverage levels (covered vs best-effort) reach done **differently**.

**Covered onboarding — the gates, in order:**

1. **CI gate green.**
2. **Secrets present on the box** (`configure-env` has run) — this is a **precondition** of the next gate, not an afterthought (secrets ordering, the "wire" step).
3. **First staging deploy succeeded** — the image built + pushed and the service is up (container form), or the static build is built + rsync'd (static form).
4. **Healthcheck green** — `GET /health` returns `200` (container), or the static `index.html` is served (static). The `/health` contract is an obligation of the *project* toward ops, consumed here (see **Five delivery concerns → The `/health` contract**).
5. **Reverse-proxy serves the (sub)domain over TLS** — `nginx -t` clean **and** the LE cert in place.
6. **Co-tenant safety verified** — no port collision, the nginx config is valid, neighbours untouched (R7).
7. **The deploy is recorded in `docs/ops/`** — the deploy-binding record (profile, domain, port, form, env-keys, URL).

**prod is a separate, gated step — never automatic.** prod sits behind a GitHub Environment approval and is rolled out by the operator. **Done for covered onboarding = staging provably alive + prod wired-and-gated.** An actual prod deploy is **not** required for done — the wiring and the approval gate being in place is the deliverable.

**Best-effort onboarding — a different deliverable.** It is **not** held to the turnkey gates above (the same way a bootstrap `unmanaged` axis is excluded from bootstrap's done criterion). For best-effort, done =

- the path is **configured in place**, AND
- a **loud signal** is raised — *"best-effort, not from a proven template; recovery / secrets / observability may be weaker, check X / Y / Z"* (principle 5), AND
- a **promotion proposal** is offered (promote-to-covered → a template + a manifest row, growth axis #2).

Best-effort is not failure — it is a weaker, honestly-labelled guarantee. It is simply not measured against gates it was never meant to meet.

## Failure / abort / rollback

The done gates run **in order**. On **red at any gate**, ops **aborts and rolls back to the pre-step state** — the box is **never** left half-wired (R7, co-tenant-critical). The rollback is **logged, not silent** (principle 5).

- **vhost not valid** (`nginx -t` red) → do **not** run `reload`; **remove the config that was added**. The reverse-proxy is left exactly as it was for the neighbours.
- **staging deploy red / healthcheck not green** within `start_period + retries` → `docker compose down <svc>` for the **new** service, **free the port** — **do not touch neighbours**. Only the service this `onboard` introduced is torn down.
- **a step that would hit a neighbour** (an occupied port, a domain conflict) → **stop before the step** and **signal the operator**. ops does not push through a collision.

**Port occupancy is not, by itself, an abort.** Routine in-range occupancy → **advance to the next free port** in the convention range (normal allocation — see **Five delivery concerns → Port allocation** — not a failure). Escalate with **stop + signal** only when the port-convention range is **exhausted**, or when a **domain conflict** or an **explicitly-requested specific port** is occupied.

**Neighbours are never touched on rollback.** The rollback scope is exactly the artifacts *this* `onboard` introduced — never a co-tenant's service, port, or vhost. Every abort is written to the deploy log so the operator can see what was undone and why.

## Idempotent re-onboard

`onboard X` on a project that is **already connected** is an **update, not a collision**. ops **detects** the existing vhost, port, server directory, and CD workflow, and **updates them in place** — it does **not** create a duplicate (the same way `upsert_env` is idempotent rather than appending). A **re-run is safe**: the substrate is "moving onto a live box", so repeats are expected and must be harmless.

## Anti-patterns

- **Auto-launching ops.** An upstream signal is **not** a launch. The operator decides to ship onto the shared box (P6).
- **Passing best-effort off as turnkey.** A best-effort setup is **always** labelled best-effort, loudly, where the operator hears it — never presented silently as a proven template (principle 5).
- **Writing ARCHITECTURE.md.** ops is decoupled from the living document (R5). A `## Deployment` pointer, if wanted, is **living-architecture's** work via its own event — never ops's.
- **Touching neighbours.** No port clobber, no neighbour's vhost edited, no co-tenant service torn down — every `onboard` and every rollback respects the co-tenants on the box (R7).
- **Hardcoding box facts.** The runtime, reverse-proxy, transports, and ports live in the **profile** (read dynamically), never baked into the skill or a template. Adding a target = adding a profile file.
- **Faking a probing choice.** The profile is known and the only one — there is no infrastructure menu. `onboard` **confirms the form** and collects project-local parameters; it does **not** stage a fake choice that does not exist (the ops analogue of bootstrap's buy-in at coverage = 1).

## References

- `references/profile-schema.md` — the delivery-profile field schema (`[render-var]` / `[note]` typing + value-shapes) + the `fix-profile` read-only inspection checklist. Pointer for the "Two operations" and profile-level content; not duplicated in the body.
- `references/template-manifest.md` — the SSoT of the covered template set (`template → form → source-of-truth`), the ops-analog of bootstrap's coverage-manifest. The render step reads it dynamically; a new form/runtime = a new row + file (§10), not a rewrite.
- `references/templates/{container,static,shared}/` — the render targets instantiated per (project × form): container (`Dockerfile`, `docker-compose.yml`, `deploy-{staging,prod}.yml`, optional `vector.yml`), static (`deploy-web-{staging,prod}.yml`), shared (`configure-env.yml`, `vhost-snippet.md`, `.env.example`, `docs-ops-runbook.md`). Parameterized by the profile's render-vars; `ci.yml` is a bootstrap artifact, reused via `needs: test`, never emitted by ops.
- `docs/superpowers/specs/2026-06-03-hi_flow-ops-design.md` — the design spec this skill implements (closes D23; refines D14 / D20).
