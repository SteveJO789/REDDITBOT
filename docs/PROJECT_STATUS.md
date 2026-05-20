# Project Status

Last updated: 2026-05-20

## Current Snapshot

- Product: internal Operation Empathy review dashboard for mock or manually imported public examples.
- Primary modes: browser-local state for static/demo usage and server persistence for VPS mode.
- Runtime: Next.js app with Docker Compose support and a Node review server in `server/review-server.mjs`.
- Persistence: localStorage fallback in the browser; server mode loads and saves review state through `/api/review-state`.
- AI: optional server-side `/api/ai/classify` and `/api/ai/draft` endpoints exist, but they are disabled unless `LLM_ENABLED=true`.
- Deployment targets: GitHub Pages static export for mock-only hosting, or an internal VPS behind access controls.

## Current Code State

- Dashboard UI includes summary cards, review queue filters, detail panel, draft editor, compliance checks, resource status, audit log, and analytics.
- Manual CSV/JSON import is supported for public or mock examples.
- Review actions are human-triggered only: approve, edit draft, reject, Do Not Engage, Needs Compliance Review, and Needs Marketing Review.
- Safety checks block risky approvals and flag medical, promotion, spam, and disclosure issues.
- The codebase includes test coverage for the mock AI and review-state flow.

## Safety Status

- `OUTREACH_WRITE_ENABLED=false`
- `REDDIT_READ_ONLY_ENABLED=false`
- `LLM_ENABLED=false`
- No real Reddit API is connected by default.
- No posting, DM, payment, shipping, CRM, or production customer-data integration is active.

## Operational Notes

- Access control for any VPS deployment should be enforced with Cloudflare Access, VPN, firewall allowlists, or an equivalent layer.
- Keep the domain routed to the VPS origin on port `8080` when proxying through Cloudflare.
- Use the repo docs in `README.md` and `SAFE_IMPLEMENTATION_PLAN.md` as the source of truth for the current internal-only scope.
