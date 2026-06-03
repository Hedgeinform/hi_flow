# Ops Runbook — host bring-up + per-project onboarding

Source of truth: `zhenka-bot/docs/ops/vps-setup.md` (Hedgeinform/zhenka),
generalized into a per-profile runbook. Two clearly separated phases:

- **Part A — host bring-up:** run **once per box**. Establishes the shared
  substrate (firewall, SSH hardening, Docker, reverse proxy, registry auth, log
  rotation, auto-updates). Independent of any single project.
- **Part B — per-project onboarding:** run **once per project** added to an
  already-brought-up box (directory, network, vhost, env, first deploy).

**Reverse proxy = nginx (profile-dependent).** The source runbook used **Caddy**;
the live substrate uses **host-level nginx**. The delivery profile fixes the fact
(`reverse-proxy.kind`). This runbook targets **nginx** to match the live profile.
A Caddy-based profile would swap Part A §5 and Part B §3 for Caddy equivalents —
that divergence is profile-dependent (OQ-ops-5), not carried silently.

Render tokens used below: `<PROJECT>` · `<DOMAIN>` · `<SERVER_DIR>` ·
`<STATIC_ROOT>` · `<GHCR_OWNER>` · `<DOCKER_NET>` · `<HEALTH_PATH>`.

---

# Part A — Host bring-up (once per box)

Prerequisites: Ubuntu 22.04+, root or sudo over SSH.

## A1. UFW firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

## A2. SSH hardening

```bash
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
# Verify — both must return exactly one line:
grep 'PermitRootLogin no' /etc/ssh/sshd_config
grep 'PasswordAuthentication no' /etc/ssh/sshd_config
```

## A3. fail2ban

```bash
apt install fail2ban -y
systemctl enable fail2ban && systemctl start fail2ban
```

## A4. Docker (container-form hosts)

```bash
curl -fsSL https://get.docker.com | sh
# Create a non-root deploy user first: adduser <deploy-user> && usermod -aG sudo <deploy-user>
DEPLOY_USER=<deploy-user>
usermod -aG docker $DEPLOY_USER
docker compose version   # verify v2+
```

## A5. Reverse proxy — nginx + Let's Encrypt

> Profile = host-nginx. (Caddy-profile alternative noted at the top of this file.)

```bash
apt install -y nginx
systemctl enable nginx && systemctl start nginx

# certbot for TLS (Let's Encrypt), via snap:
apt install -y snapd
snap install core && snap refresh core
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot
```

Per-domain vhosts are added in Part B §3 (one vhost per (sub)domain). certbot
installs a renewal timer automatically; verify with `systemctl list-timers | grep certbot`.

## A6. GHCR auth (container-form hosts)

```bash
# GitHub PAT with read:packages scope. The PAT is piped in, never echoed.
echo "$GHCR_PAT" | docker login ghcr.io -u <github-username> --password-stdin
```

## A7. Docker log rotation (global, container-form hosts)

```bash
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
systemctl restart docker
```

## A8. Unattended security upgrades

```bash
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades
```

---

# Part B — Per-project onboarding (once per project)

The box is already brought up (Part A). Add one project.

> These steps are re-run-safe (idempotent): on a re-onboard they detect-and-update
> rather than duplicate, matching the skill's Idempotent re-onboard contract.

## B1. Project directory

```bash
# Container form:
mkdir -p <SERVER_DIR>/config
cd <SERVER_DIR>
# scp in the rendered artifacts:
#   docker-compose.yml  (GHCR_OWNER already rendered)
#   config/vector.yml   (optional — only if logs are wired)
# Create .env.prod (and .env.staging if running both side-by-side) from
# .env.example — fill real values, then lock down:
chmod 600 .env.prod

# Static form:
mkdir -p <STATIC_ROOT>            # the rsync destination for the built SPA
```

## B2. Docker network (container form, only if the profile uses a shared net)

```bash
# Idempotent: no-op if the network already exists (re-onboard safe).
docker network create <DOCKER_NET> 2>/dev/null || true
```
Skip this if the reverse proxy reaches the container over published host ports
instead of a shared docker network (then drop the `networks:` blocks from
`docker-compose.yml` too).

## B3. nginx vhost for this project

Render `vhost-snippet.md` for `<DOMAIN>` (proxy variant for container form,
static-root variant for static form), then:

```bash
# 1. place + symlink (ln -sf: force, so re-symlink on a re-onboard is a no-op)
cp <DOMAIN>.conf /etc/nginx/sites-available/<DOMAIN>
ln -sf /etc/nginx/sites-available/<DOMAIN> /etc/nginx/sites-enabled/<DOMAIN>

# 2. VALIDATE before reload — co-tenant safety: a bad config would take down
#    every other vhost on this box. Never reload on a failed test.
nginx -t && systemctl reload nginx

# 3. issue the TLS cert (writes the 443 block + HTTP→HTTPS 301 for you).
#    Idempotent: skip if the cert was already issued — only run on first issuance.
[ -d /etc/letsencrypt/live/<DOMAIN> ] || certbot --nginx -d <DOMAIN>
```

## B4. Environment (secrets)

```bash
# Container form: push runtime env onto the server .env.prod via the
#   configure-env.yml workflow (gh-secrets → ssh-upsert → chmod 600 → restart).
# Static form: build-time VITE_* keys are baked in by deploy-web-*.yml from
#   GH secrets — usually nothing to place on the server.
```
Set the GH repo secrets first (ops emits the `gh secret set` list). GitHub
Environments: `staging` (no approval gate) / `production` (require 1 reviewer).

## B5. First deploy

```bash
# Container form — trigger the deploy-{staging,prod}.yml workflow, then:
cd <SERVER_DIR>
docker compose ps
curl -fsS http://localhost:3000<HEALTH_PATH>   # expect 200 / health body

# Static form — trigger deploy-web-{staging,prod}.yml, then:
curl -fsS -o /dev/null -w "%{http_code}\n" "https://<DOMAIN>/"   # expect 200
```

## B6. Monitoring (optional)

Add an external uptime monitor (e.g. UptimeRobot) on
`https://<DOMAIN><HEALTH_PATH>` (container) or `https://<DOMAIN>/` (static),
5-min interval, alert after 2 consecutive failures, route alerts to the operator.

---

## GitHub secrets baseline (shared by all profiles)

| Secret | Value |
|---|---|
| `VPS_HOST` | server IP or hostname |
| `VPS_USER` | non-root SSH deploy user |
| `VPS_SSH_KEY` | private deploy key: `ssh-keygen -t ed25519 -N "" -f ~/.ssh/<PROJECT>_deploy` |

Per-project runtime/build keys are added on top (see `.env.example` for the
NAMES; values are set as same-named GH secrets).
