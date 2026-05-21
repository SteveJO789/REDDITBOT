# VPS Deployment

This deployment shape is for an internal staging dashboard. Cloudflare terminates public HTTPS and forwards traffic to the VPS origin on HTTP port `8080`. PostgreSQL persists review state.

## Minimum VPS

- Ubuntu 24.04 LTS
- 2 vCPU, 2-4 GB RAM, 40 GB SSD
- Docker and Docker Compose
- UFW allowing `22` and origin port `8080` from trusted networks or Cloudflare IP ranges
- Cloudflare Access, Tailscale, WireGuard, or another access-control layer for team access
- Daily PostgreSQL backup to encrypted off-server storage

## Setup

1. Copy `.env.example` to `.env` and replace every placeholder secret.
2. Set `APP_BASE_URL` to the HTTPS domain, for example `https://dashboard.example.com`.
3. Configure Cloudflare DNS for the staging domain to proxy traffic to the VPS origin.
4. Configure Cloudflare to forward the origin request to port `8080`.
5. Keep these flags false for v1:

```env
OUTREACH_WRITE_ENABLED=false
REDDIT_READ_ONLY_ENABLED=false
LLM_ENABLED=false
```

6. Validate the environment before starting the stack:

```bash
npm run validate:env
```

7. Start the stack:

```bash
docker compose up -d --build
```

The request path is:

```text
Cloudflare HTTPS -> VPS origin http://<server-ip>:8080 -> Next.js app port 3000
```

For a local VPS-shape verification, run:

```bash
npm run verify:docker
```

This builds `postgres` and `app`, confirms `/api/health` reports PostgreSQL storage, writes a review-state payload, and verifies the row directly in PostgreSQL.

Create a database backup after the first successful deploy and before risky upgrades:

```bash
npm run backup:db
```

Restore a backup only after confirming the target database and taking a fresh backup:

```bash
npm run restore:db -- backups/operation_empathy-example.sql --yes
```

## Manual Acceptance Checks

- `https://your-domain.example/api/health` returns `"ok":true` and reports `postgres` storage when `DATABASE_URL` is reachable.
- `http://127.0.0.1:8080/api/health` returns `"ok":true` on the VPS.
- The site requires Cloudflare Access, VPN access, firewall allowlists, or equivalent protection before the dashboard is visible.
- Manual CSV/JSON import accepts only public examples.
- High medical risk posts cannot be approved.
- Drafts with links, DM requests, medical claims, discount codes, or affiliate language fail compliance.
- A changed review status survives a browser refresh through server persistence.
- Approved drafts can be copied, but the app has no posting or DM integration.
- Audit entries are recorded for review actions in the UI and are included in persisted dashboard state.
- `npm run backup:db` writes a SQL backup under `backups/`.
- `npm run restore:db -- <backup.sql> --yes` has been tested against the intended database before relying on backups.

Useful VPS checks:

```bash
docker compose config --quiet
docker compose ps
docker compose logs --tail=100 app postgres
curl -i http://127.0.0.1:8080/api/health
curl -i https://your-domain.example/api/health
```

## Safety Boundary

Do not add real Reddit API, LLM API, CRM, payment, shipping, customer database, posting, or DM workflows until there is a separate written approval.
