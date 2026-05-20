# VPS Deployment

This deployment shape is for an internal staging dashboard. It keeps the prototype behind HTTPS and basic auth, with PostgreSQL prepared for persistent review state.

## Minimum VPS

- Ubuntu 24.04 LTS
- 2 vCPU, 2-4 GB RAM, 40 GB SSD
- Docker and Docker Compose
- UFW allowing only `22`, `80`, and `443`
- Tailscale or WireGuard for team access
- Daily PostgreSQL backup to encrypted off-server storage

## Setup

1. Copy `.env.example` to `.env` and replace every placeholder secret.
2. Generate a Caddy bcrypt password hash:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'replace-this-password'
```

3. Set `APP_BASE_URL` to the HTTPS domain.
4. Keep these flags false for v1:

```env
OUTREACH_WRITE_ENABLED=false
REDDIT_READ_ONLY_ENABLED=false
LLM_ENABLED=false
```

5. Start the stack:

```bash
docker compose up -d --build
```

## Manual Acceptance Checks

- `https://your-domain.example/api/health` returns `"ok":true` and reports `postgres` storage when `DATABASE_URL` is reachable.
- The site requires VPN access or basic auth before the dashboard is visible.
- Manual CSV/JSON import accepts only public/mock examples.
- High medical risk posts cannot be approved.
- Drafts with links, DM requests, medical claims, discount codes, or affiliate language fail compliance.
- A changed review status survives a browser refresh through server persistence.
- Approved drafts can be copied, but the app has no posting or DM integration.
- Audit entries are recorded for review actions in the UI and are included in persisted dashboard state.

## Safety Boundary

Do not add real Reddit API, LLM API, CRM, payment, shipping, customer database, posting, or DM workflows until there is a separate written approval.
