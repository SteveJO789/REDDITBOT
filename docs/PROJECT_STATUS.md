# Project Status

Last updated: 2026-05-20

## Current Deployment

- Public URL: `https://ai-sale.tiangnatech.com`
- Origin URL on VPS: `http://127.0.0.1:8080`
- Runtime: Docker Compose
- Services: `app`, `postgres`
- Removed from active stack: `caddy`
- HTTPS: terminated by Cloudflare
- Origin traffic: Cloudflare forwards to HTTP port `8080`
- App container mapping: `0.0.0.0:8080 -> 3000`
- Persistence: PostgreSQL

## Verified

- `docker compose config --quiet` passes.
- Next.js production build passes during Docker build.
- App health check is healthy.
- PostgreSQL container is healthy.
- Local origin health check returns `200`:

```text
http://127.0.0.1:8080/api/health
```

- Public Cloudflare URL returns `200`:

```text
https://ai-sale.tiangnatech.com/api/health
```

## Safety Status

- `OUTREACH_WRITE_ENABLED=false`
- `REDDIT_READ_ONLY_ENABLED=false`
- `LLM_ENABLED=false`
- No real Reddit API is connected.
- No posting, DM, payment, shipping, CRM, or production customer-data integration is active.

## Operational Notes

- The dashboard is no longer protected by Caddy basic auth.
- Access control should be enforced with Cloudflare Access, VPN, firewall allowlists, or an equivalent layer.
- If Cloudflare proxy is enabled, keep the domain routed to the VPS and make sure origin traffic reaches port `8080`.
