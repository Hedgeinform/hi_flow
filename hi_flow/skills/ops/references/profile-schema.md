# ops — Delivery Profile Schema

The **contract / schema** of a *delivery profile* — the small declarative descriptor of one delivery target (a server, a customer box). This file defines **what fields a profile has** and **how to capture them**; it is **not** a profile itself.

**Where the profile lives.** A filled profile lives in the **operator-personal area** (e.g. `~/.claude/.../ops-profiles/<name>.md`), **not** in a project repo and **not** in the plugin (decision R3 — raw infrastructure facts stay personal; rendered artifacts reference GitHub secrets and are repo-safe). The profile is read **dynamically**: adding a target = adding a profile file, never editing the skill (SSoT, architectural principle 4).

**Field typing.**

- `[render-var]` — the value is substituted into templates at render time (it is the source of a parameterization token — see `template-manifest.md`).
- `[note]` — operator-facing documentation / procedure, **not** a substitution variable.

---

## Profile fields

The value-shape column shows *what a value looks like* (illustrative shapes from the live `zhenka-vps` target, mirroring spec §5); it is the schema's documentation of value form, not a filled profile. A filled profile lives personal (skeleton below).

| Field | Type | Value-shape (what the value looks like) |
|---|---|---|
| `identity.alias` | `[render-var]` | profile name slug, e.g. `<alias>` |
| `identity.ssh` | `[render-var]` | host + user + **key-ref** (a path/reference to the key, **never the key itself**), e.g. host `<ip>`, user `<user>`, key-ref `~/.ssh/<key>` |
| `reverse-proxy.kind` | `[render-var]` | proxy flavour — selects the vhost template, e.g. `host-nginx` |
| `reverse-proxy.vhost-apply` | `[note]` | the apply procedure: drop the vhost into `sites-available`, symlink into `sites-enabled`, then `nginx -t && reload` |
| `reverse-proxy.static-root` | `[render-var]` | static-root path convention, e.g. `/home/<user>/<proj>-site[-<env>]/` |
| `tls.mechanism` | `[render-var]` | TLS mechanism — selects the vhost-template TLS block, e.g. `letsencrypt` (certbot) |
| `tls.cert-path` | `[render-var]` | live-cert path convention, e.g. `/etc/letsencrypt/live/<domain>/` |
| `registry.owner` | `[render-var]` | container-registry owner (the `<GHCR_OWNER>` token, lowercased), e.g. `ghcr.io/<owner>` |
| `secret-transport.kind` | `[render-var]` | secret-transport flavour — selects the `configure-env` template, e.g. `gh-secrets→ssh-upsert→server-.env` |
| `env-model.environments` | `[render-var]` | environment set + gate model, e.g. `staging` (no-gate) / `prod` (1 reviewer approval) |
| `env-model.port-convention` | `[render-var]` | port-range convention → internal port, e.g. `31xx`=staging / `32xx`=prod → internal `3000` |
| `deploy-transport` | `[render-var]` | deploy transport + trigger, e.g. `appleboy/ssh-action`, trigger `workflow_dispatch` |
| `server-layout.project-dir` | `[render-var]` | per-project directory convention (the `<SERVER_DIR>` token), e.g. `/srv/<proj>` |
| `server-layout.docker-network` | `[render-var]` | docker network name (if any) |
| `observability.wired` | `[note]` | what is wired (e.g. UptimeRobot `/health`, Vector, docker log rotation) **and where the holes are** |

**Render-var fields are the source of the render tokens** the templates consume: `<PROJECT>`, `<GHCR_OWNER>`, `<DOMAIN>`, `<PORT_STAGING>` / `<PORT_PROD>`, `<SERVER_DIR>`, `<STATIC_ROOT>`, `<ENV_KEYS>`, `<HEALTH_PATH>`. `[note]` fields are read by the operator/skill as procedure, not bound to a token.

---

## fix-profile inspection checklist

`fix-profile` captures the substrate by **reading current state, not guessing** (architectural principle 9). Every command below is **read-only**; the profile records a fact, never a guess. **Operator confirmation is mandatory** before the profile is fixed.

Per field:

| Field area | Read-only probe |
|---|---|
| host / runtime | `uname`, `os-release`, `docker --version`, `docker compose version` |
| reverse-proxy | proxy processes (`nginx` / `caddy` / …), `sites-enabled`, any containerised proxies |
| TLS | `which certbot` / `which acme.sh`, `/etc/letsencrypt/live` |
| registry | `~/.docker/config.json` — **the fact of login only, never its contents** |
| server-layout | `/srv`, `/home/<user>`, where compose-projects live |
| env / secrets | presence of `.env*` — **by NAME, never by CONTENT** — and `env_file` entries in compose |
| observability | observability containers (`grafana` / `uptime` / `vector` / `portainer` / …), `which netdata`, `/etc/docker/daemon.json` (log-opts) |

**Discipline:**

- Read-only throughout — inspection captures facts, it does not mutate the box.
- Secrets are touched by **name/presence only**: registry login is a *fact* (`config.json` exists), `.env*` files are listed by **name**, never opened. No secret value enters the profile (the profile is repo-adjacent-personal, but still: facts, not secrets).
- **Operator confirmation is mandatory** — the profile fixes a confirmed fact, not the skill's inference. No silent capture.

---

## Sanitized filled-profile skeleton

A filled profile uses these fields with the operator's real target facts. The skeleton below is **placeholders only** — no real IP, domain, or key. The real filled profile lives personal (R3); this is the shape it takes.

```yaml
# ops-profile: <alias>            # operator-personal, e.g. ~/.claude/.../ops-profiles/<alias>.md

identity:
  alias: <alias>                  # [render-var]
  ssh:                            # [render-var]
    host: <SERVER_IP_OR_HOST>
    user: <SSH_USER>
    key-ref: <PATH_TO_KEY>        # a reference, NOT the key material

reverse-proxy:
  kind: <PROXY_KIND>              # [render-var]  e.g. host-nginx — selects vhost template
  vhost-apply: |                  # [note]  procedure, not a variable
    drop vhost into sites-available → symlink sites-enabled → `nginx -t && reload`
  static-root: <STATIC_ROOT>      # [render-var]  e.g. /home/<user>/<proj>-site[-<env>]/

tls:
  mechanism: <TLS_MECHANISM>      # [render-var]  e.g. letsencrypt — selects vhost TLS block
  cert-path: <CERT_PATH>          # [render-var]  e.g. /etc/letsencrypt/live/<DOMAIN>/

registry:
  owner: <GHCR_OWNER>             # [render-var]  e.g. ghcr.io/<owner> (lowercased)

secret-transport:
  kind: <SECRET_TRANSPORT>        # [render-var]  selects configure-env template

env-model:
  environments: <ENV_SET>         # [render-var]  e.g. staging (no-gate) / prod (1 reviewer)
  port-convention: <PORT_RANGES>  # [render-var]  e.g. 31xx=staging / 32xx=prod → internal 3000

deploy-transport: <DEPLOY_TRANSPORT>  # [render-var]  e.g. appleboy/ssh-action, trigger workflow_dispatch

server-layout:
  project-dir: <SERVER_DIR>       # [render-var]  e.g. /srv/<PROJECT>
  docker-network: <DOCKER_NET>    # [render-var]  network name, if any

observability:
  wired: |                        # [note]  what is wired + where the holes are
    <e.g. UptimeRobot /health, Vector logs, docker log rotation — and the known gaps>
```

---

## Growth (spec §10)

The profile is the unit of growth, not a thing to rewrite:

- **More targets** — a second server/target = **add a profile file**, the skill is untouched.
- **Distributable later** — the profile is the seam that turns distributable into an extension, not a rewrite: personal-first = one pre-filled profile; distributable later = `probe-to-fill` (interview an unknown target → fill the same schema) before the same `profile + render` core.

---

## See also

- `template-manifest.md` — the registry of templates the render-var fields feed into.
