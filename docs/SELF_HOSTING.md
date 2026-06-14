# Self-hosting FitPal securely

This guide covers running FitPal safely. For setup (Docker, env vars, updates)
see the [README](../README.md); this focuses on hardening and operations.

## Set a strong JWT secret

`JWT_SECRET` signs the auth cookie (min 16 chars, or the server refuses to
start). Generate one and keep it in `.env` (already gitignored):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Changing it later logs everyone out - a quick way to revoke all sessions.

## Keep your AI key private

`AI_API_KEY` is read only by the backend. Since you pay
per AI call, consider a provider that supports a hard spending limit.

## Reverse proxy with TLS

For anything beyond your local network, terminate TLS at a reverse proxy and
forward to the container. Caddy gives automatic HTTPS:

```caddyfile
fitpal.example.com {
    reverse_proxy localhost:3001
}
```

## Same-origin vs split deployments

The default single-process deployment serves the frontend and API from one
origin; the built-in CSP and permissive CORS assume this. If you split them via
`VITE_API_URL`, the CSP `connect-src 'self'` blocks the cross-origin API calls -
extend `connect-src` in [`server/app.ts`](../server/app.ts) to your API origin
and tighten CORS. Staying single-origin avoids all of this.

## No built-in login rate limiting

FitPal targets one person or a small, trusted group, so it does not throttle
login attempts. If you expose it publicly, gate it at the proxy (basic auth, an
SSO/identity proxy, a VPN/Tailscale network, or a rate-limit rule on the login
route).

## Back up your data

All data lives in one SQLite file: the `fitpal-data` volume at `/app/data` under
Docker, or `server/data` from source (override with `DATA_DIR`). Back it up while
the app is idle and store it encrypted:

```bash
docker compose cp fitpal:/app/data/fitpal.db ./fitpal-backup.db
```

Restore by putting the file back before starting the app.

## Keep it updated

```bash
docker compose pull && docker compose up -d
```

Building from source? Run `npm audit` in both the root and `server/` directories
periodically and keep dependencies current.

## Privacy

FitPal sends no telemetry. The only data leaving your server is what you send to
your configured AI provider when using an AI feature. Pick a provider whose data
policy you trust, or run a local model (Ollama, vLLM) so nothing leaves your
machine.
