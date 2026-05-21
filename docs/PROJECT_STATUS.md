# Project Status

Last updated: 2026-05-21

## Current Snapshot

- Product: internal Operation Empathy review dashboard for imported public examples and read-only social listening.
- Primary modes: browser-local state for static usage, file-backed local dev, and server persistence for VPS mode.
- Runtime: Next.js app with a custom Node review server in `server/review-server.mjs`.
- Data sources: manual CSV/JSON import, Reddit `Listing` JSON import, and direct read-only Reddit `.json` endpoints when `REDDIT_READ_ONLY_ENABLED=true`.
- Seed data: no seeded mock posts are shown by default; the dashboard starts empty until data is imported or fetched.
- AI: optional OpenRouter-powered Analyze flow behind `LLM_ENABLED=true` and `OPENROUTER_API_KEY`.
- Deployment targets: GitHub Pages static export for browser-local usage, or an internal VPS behind access controls.

## Current Code State

- Dashboard UI includes summary cards, review queue filters, detail panel, expanded original-post reader, draft editor, compliance checks, resource status, audit log, and analytics.
- Manual CSV/JSON import supports public examples and Reddit `Listing` JSON.
- Read-only Reddit search maps `.json` Listing responses into the same review queue schema.
- The Analyze button calls `/api/ai/analyze`, classifies the selected post, drafts a safe reply, refreshes compliance, and still requires human review.
- Review actions are human-triggered only: approve, edit draft, reject, Do Not Engage, Needs Compliance Review, and Needs Marketing Review.
- Safety checks block risky approvals and flag medical, promotion, spam, and disclosure issues.
- Local dev uses file persistence by default through `npm run dev`; Docker/PostgreSQL testing uses `npm run dev:db`.

## Safety Status

- `OUTREACH_WRITE_ENABLED=false`
- `REDDIT_READ_ONLY_ENABLED=true` enables read-only Reddit data retrieval only.
- `LLM_ENABLED=true` enables analysis/drafting only when a valid OpenRouter key is configured.
- No posting, DM, payment, shipping, CRM, or production customer-data integration is active.
- No account farming, browser automation, or outreach write workflow is implemented.

## Verification

- `npm.cmd run lint` passes.
- `npm.cmd test` passes with 22 tests.
- `npm.cmd run build` passes.
- Local `/api/health` has been verified with file persistence, read-only Reddit enabled, and OpenRouter enabled.
- Local `/api/review-state` has been reset to an empty queue.

## Operational Notes

- Access control for any VPS deployment should be enforced with Cloudflare Access, VPN, firewall allowlists, or an equivalent layer.
- Use `npm run dev` for local file-backed testing without Docker.
- Use `docker compose up -d postgres` and `npm run dev:db` when testing the PostgreSQL path.
- Keep `OUTREACH_WRITE_ENABLED=false` unless a separate production safety review explicitly approves a write workflow.
- Use `README.md` and `SAFE_IMPLEMENTATION_PLAN.md` as the source of truth for the internal-only scope.
