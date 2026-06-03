# ops — Template Manifest

The **registry of delivery templates** ops renders — the ops-analog of bootstrap's `coverage-manifest.md`. It maps each scaffold template to its **packaging form** and to its **source-of-truth file** in the `Hedgeinform/zhenka` monorepo.

This is the **covered set**: the set of forms for which ops has a vetted, turnkey template (decision R4 — covered renders+wires+verifies turnkey; best-effort is configured ad-hoc with a loud signal and is **not** listed here). Listing only real, covered rows is coverage-honesty applied to the manifest itself.

```
template → form (container / static / both) → source-of-truth (zhenka file)
```

The manifest is read **dynamically** by the render step; nothing about which templates exist is hardcoded in `SKILL.md`. The templates themselves live alongside it under `references/templates/`.

---

## Rules

- **Read dynamically, never hardcoded.** ops renders only templates present here. The SSoT of each template is its corresponding file in the `Hedgeinform/zhenka` monorepo (spec §13) — the manifest points at that file, it does not duplicate it.
- **Grows by row, not by rewrite (spec §10).** A new packaging form or runtime = **a new row + a new template file**, never a rewrite of the onboarding atom. This is the second axis of growth: more covered forms = more rows, the `shape → render → wire → verify` atom is unchanged.
- **Covered-set honesty (R4).** Only forms with a vetted template appear here. Best-effort (ad-hoc, no vetted template) is **not** a row — it is rendered with a loud "best-effort, guarantees weaker" signal and, if it proves out, **promoted into a row** (promotion path, spec §6 / OQ-ops-4). Do not invent covered rows.

---

## The covered set today = { container, static }

Two packaging forms are covered. `both` means the template applies to either form.

| Template | Form | Source of truth (`Hedgeinform/zhenka`) |
|---|---|---|
| `Dockerfile` (Node/TS service) | container | `zhenka-bot/Dockerfile` |
| `docker-compose.yml` (service: image / restart / ports / `env_file` / healthcheck) | container | `zhenka-bot/docs/ops/docker-compose-template.yml` |
| `deploy-{staging,prod}.yml` (test → build-push → ssh pull+up) | container | `.github/workflows/deploy-{staging,prod}.yml` |
| `deploy-web-{staging,prod}.yml` (npm ci → build → rsync) | static | `.github/workflows/deploy-web-{staging,prod}.yml` |
| `configure-env.yml` (gh-secrets → ssh-upsert → `.env`) | both | `.github/workflows/configure-bot-env.yml` |
| vhost / proxy snippet (`proxy_pass` / static-root + LE block) | both | nginx vhost `zhenka` (+ runbook caddyfile-snippet) |
| `.env.example` (key **names** only) | both | from the real `.env` set (names, not values) |
| `docs/ops/`-runbook | both | `zhenka-bot/docs/ops/vps-setup.md` |
| Vector config (optional, logs) | container | `zhenka-bot/config/vector.yml` |

The Vector config is **optional** within the container form (logs are wired only if needed — spec §6, project-level observability).

---

## `ci.yml` is NOT an ops artifact

`ci.yml` is a **bootstrap artifact**, not ops. The CI workflow is produced by bootstrap (its Scope §5 / Output). ops **reuses** it (`needs: test` in the deploy workflows) and **adds only** the deploy / configure workflows on top. There are no two writers of `ci.yml` — it has no row in this manifest by design.

---

## Where rendered artifacts land

For reference (the render/wire step decides placement; full map in spec §7):

- **Into the project repo** (repo-safe — these reference GitHub secrets, not raw infra facts): `Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy-*` + `configure-env.yml`, `.env.example`, `docs/ops/`-runbook (+ vhost snippet, Vector config when needed).
- **Operator-personal** — the delivery profile (see `profile-schema.md`); not a template output.
- **GitHub side** — repo secrets + GH Environments; ops emits the list + ready `gh secret set` commands, it does **not** set secret values.
- **On the server** (once per project) — `/srv/<proj>` dir, docker-network membership, vhost (`nginx -t && reload`), LE cert.

---

## See also

- `profile-schema.md` — the profile whose `[render-var]` fields supply the render tokens (`<PROJECT>`, `<GHCR_OWNER>`, `<DOMAIN>`, `<PORT_STAGING>` / `<PORT_PROD>`, `<SERVER_DIR>`, `<STATIC_ROOT>`, `<ENV_KEYS>`, `<HEALTH_PATH>`) these templates consume.
- `references/templates/` — the template files themselves, named per the rows above.
