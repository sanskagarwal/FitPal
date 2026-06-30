# Self-hosting FitPal

For setup steps (Docker, env vars, updates) see the [README](../README.md).
This guide covers the things worth knowing once you have it running.

## 1. Set a strong JWT secret

This is the only required security step. `JWT_SECRET` signs the auth cookie - if
it is weak or left as the example default, anyone who knows it can log in as any user.

The server refuses to start if the value is missing, under 16 characters, or
still set to the placeholder from `.env.example`. Generate a real one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `.env`. Never commit `.env` to version control (it is already
in `.gitignore`). Changing `JWT_SECRET` later logs everyone out - useful for
revoking all sessions in an emergency.

## 2. Put it behind a reverse proxy with TLS

For anything outside your home network, run FitPal behind a reverse proxy that
handles HTTPS. The simplest option is Caddy, which gets and renews a certificate
automatically:

```caddyfile
fitpal.example.com {
    reverse_proxy localhost:3001
}
```

For nginx, see the [nginx TLS docs](https://nginx.org/en/docs/http/configuring_https_servers.html).

> The server already ships security headers (CSP, HSTS, X-Frame-Options, etc.)
> via helmet. You do not need to configure these at the proxy.

## 3. Enable push notifications (optional)

Push notifications let FitPal remind users to log meals even when the app is
closed. They require three extra env vars — if any are absent the scheduler
simply stays off and everything else works normally.

**Generate a VAPID key pair** (one-time, per deployment):

```bash
node --input-type=module -e "
import w from 'web-push';
const k = w.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=' + k.publicKey);
console.log('VAPID_PRIVATE_KEY=' + k.privateKey);
"
```

Add the output plus a contact address to your `.env`:

```
VAPID_PUBLIC_KEY=<output from above>
VAPID_PRIVATE_KEY=<output from above>
VAPID_MAILTO=mailto:you@example.com
```

> **HTTPS required.** Browsers only allow push subscriptions on secure origins.
> A Caddy or nginx reverse-proxy with TLS (see section 2) satisfies this
> automatically. `localhost` is treated as secure for local development.

> **Key rotation.** If you change `VAPID_PUBLIC_KEY`, existing subscribers must
> re-enable notifications in the app because their push subscriptions are tied
> to the old key.

## 4. Keep your AI key private

`AI_API_KEY` is read only by the backend and never sent to the browser. Since
you pay per AI call, consider a provider that lets you set a hard spending limit.
To cut AI costs entirely, use a local model with Ollama or vLLM - set
`AI_BASE_URL=http://localhost:11434/v1` and any non-empty `AI_API_KEY`.

## 5. Back up your data

Everything lives in one SQLite file. Copy it while the app is idle:

```bash
docker compose cp fitpal:/app/data/fitpal.db ./fitpal-backup.db
```

Restore by putting the file back before starting the app. Store backups
encrypted if the file contains sensitive health data.

## 6. Keep it updated

```bash
docker compose pull && docker compose up -d
```

Building from source? Run `npm audit` in the root and `server/` directories
periodically to catch dependency vulnerabilities.

---

## Optional hardening

These are not required for a typical home or small-group deployment, but worth
doing if the instance is publicly accessible.

### Rate limit the login endpoint

FitPal does not throttle login attempts internally. If you want brute-force
protection, add a rate limit rule at the proxy.

**Caddy** (needs the [caddy-ratelimit](https://github.com/mholt/caddy-ratelimit) plugin):
```caddyfile
rate_limit {
    zone auth_zone {
        match path /api/auth/login /api/auth/register
        key {remote_host}
        events 10
        window 1m
    }
}
```

**nginx** (`ngx_http_limit_req_module` is included in most builds):
```nginx
limit_req_zone $binary_remote_addr zone=fitpal_auth:10m rate=10r/m;

location ~ ^/api/auth/(login|register) {
    limit_req zone=fitpal_auth burst=5 nodelay;
    proxy_pass http://localhost:3001;
}
```

### Run the container as a non-root user

The Docker image runs as root by default. You can drop privileges without
rebuilding by adding `user:` to your compose file:

```yaml
services:
  fitpal:
    user: "1000:1000"   # replace with the UID that owns your data volume
```

### Restrict network access

For a small trusted group, an identity proxy (Authelia, Authentik) or a
private network (Tailscale, WireGuard) means only enrolled users can reach
the login page at all.

---

## Privacy

FitPal sends no telemetry. The only data that leaves your server is what you send to your AI provider when using an AI feature.
Pick a provider whose data policy you trust, or run a local model so nothing leaves your machine.
