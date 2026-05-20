# Project Status

Last updated: 2026-05-21

## Current Deployment

- Public URL: `https://ai-sale.tiangnatech.com`
- Origin URL on VPS: `http://127.0.0.1:8080`
- Runtime: Docker Compose
- Services: `app`, `postgres`
- Persistence: Granular PostgreSQL (Structured tables + Legacy JSON blob sync)
- AI Engine: Gemini 1.5 Flash (via `@google/generative-ai`)

## Verified

- `docker compose config --quiet` passes.
- Next.js production build passes during Docker build.
- App health check is healthy.
- PostgreSQL container is healthy.
- Persistence: Migrated to granular tables (`posts`, `classifications`, `review_states`, `audit_events`).
- AI Integration: Real AI endpoints `/api/ai/classify` and `/api/ai/draft` implemented and guarded by `LLM_ENABLED`.
- UI: Added AI-assisted classification and drafting buttons in the review console.
...
- Backward compatibility: Reconstructs state from granular tables; falls back to legacy `dashboard_state_snapshots` if empty.
- Multi-table transactions implemented for state saving.
...

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
