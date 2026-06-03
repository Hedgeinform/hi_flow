# Shared form (container + static) — nginx vhost snippet

**Source of truth:** the live `zhenka` nginx vhost in `Hedgeinform/zhenka`'s
substrate (captured read-only by inspection), generalized. The live box runs
**host-level nginx**, one vhost per (sub)domain, TLS via Let's Encrypt (certbot),
certs under `/etc/letsencrypt/live/<DOMAIN>/`, auto-renewed.

**Profile note (OQ-ops-5):** the runbook source (`vps-setup.md`) was written for
**Caddy**, but the live substrate uses **host-nginx**. The delivery profile fixes
the fact = nginx (`reverse-proxy.kind: host-nginx`), so this template targets
nginx. The Caddy divergence is profile-dependent and is NOT carried here as if it
were the truth — see `docs-ops-runbook.md` § "Reverse proxy".

Two variants. **Pick by packaging form:**

- **(a) proxy** — *container form*. The app runs as a service on a localhost port
  (`<PORT>`); nginx reverse-proxies to it.
- **(b) static-root** — *static form*. A built SPA lives under `<STATIC_ROOT>`;
  nginx serves it directly with SPA fallback. (This is the live `zhenka` shape.)

Render tokens (both variants):
`<DOMAIN>` · `<PORT>` (the app's localhost port — `<PORT_PROD>`/`<PORT_STAGING>`
per environment; proxy variant only) · `<STATIC_ROOT>` (static variant only).

---

## Applying the vhost (BOTH variants)

1. Drop the file into `/etc/nginx/sites-available/<DOMAIN>`.
2. Symlink it active: `ln -s /etc/nginx/sites-available/<DOMAIN> /etc/nginx/sites-enabled/<DOMAIN>`
3. **`nginx -t` BEFORE `reload`** — co-tenant safety. The box hosts other vhosts;
   a syntax error in `reload` would take **all** of them down. Validate first:
   ```bash
   nginx -t && systemctl reload nginx
   ```
   If `nginx -t` fails, fix the config — do NOT reload.
4. Issue/extend the TLS cert (first time, before the 443 block resolves):
   ```bash
   certbot --nginx -d <DOMAIN>
   ```
   certbot writes the `ssl_certificate*` lines and the HTTP→HTTPS 301 block for
   you; the blocks below show the end state it converges to.

---

## (a) Proxy variant — container form

App is a service on `http://localhost:<PORT>`; nginx fronts it with TLS.

```nginx
# HTTPS server — terminates TLS, proxies to the app on localhost:<PORT>.
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name <DOMAIN>;

    location / {
        proxy_pass http://localhost:<PORT>;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # WebSocket / SSE upgrade support (harmless if unused):
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }

    access_log /var/log/nginx/<DOMAIN>.access.log;
    error_log  /var/log/nginx/<DOMAIN>.error.log;

    # --- Let's Encrypt (managed by certbot) ---
    ssl_certificate     /etc/letsencrypt/live/<DOMAIN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<DOMAIN>/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP → HTTPS redirect.
server {
    listen 80;
    listen [::]:80;
    server_name <DOMAIN>;
    return 301 https://$host$request_uri;
}
```

---

## (b) Static-root variant — static form

Built SPA under `<STATIC_ROOT>`; nginx serves it directly with `try_files`
SPA fallback to `/index.html`. (Generalized from the live `zhenka` vhost.)

```nginx
# HTTPS server — serves the built SPA from <STATIC_ROOT> with SPA fallback.
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name <DOMAIN>;

    root  <STATIC_ROOT>;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Never cache the service worker (so PWA updates land):
    location = /sw.js {
        add_header Cache-Control "no-cache";
    }

    access_log /var/log/nginx/<DOMAIN>.access.log;
    error_log  /var/log/nginx/<DOMAIN>.error.log;

    # --- Let's Encrypt (managed by certbot) ---
    ssl_certificate     /etc/letsencrypt/live/<DOMAIN>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<DOMAIN>/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP → HTTPS redirect.
server {
    listen 80;
    listen [::]:80;
    server_name <DOMAIN>;
    return 301 https://$host$request_uri;
}
```

> The `<STATIC_ROOT>` here is the same path the static `deploy-web-*` workflow
> rsyncs `dist/` into. Keep them in sync (same `<STATIC_ROOT>` token from the
> profile) or the served files and the deployed files diverge.
