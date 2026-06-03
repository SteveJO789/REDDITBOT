# Project Status

Last updated: 2026-05-24

## Current Snapshot

- Product: internal Operation Empathy review dashboard plus AI Content Company OS for tracking an agent-run daily video operation.
- Primary modes: browser-local state for static usage, file-backed local dev, and server persistence for VPS mode.
- Runtime: Next.js app with a custom Node review server in `server/review-server.mjs`.
- Developer overlay: optional Pixel Agents runner for local Claude Code session visualization.
- Agent company planning: `docs/AI_AGENT_COMPANY_PLAN.md` documents the operating model for Codex-powered agents, Pixel Agents monitoring, daily video production, and approval-gated publishing.
- Data sources: manual CSV/JSON import, Reddit `Listing` JSON import, direct read-only Reddit `.json` endpoints when `REDDIT_READ_ONLY_ENABLED=true`, and multi-platform public-source intake for analyst-provided evidence records.
- Seed data: no seeded mock posts are shown by default; the dashboard starts empty until data is imported or fetched.
- AI: optional OpenRouter-powered Analyze flow behind `LLM_ENABLED=true` and `OPENROUTER_API_KEY`.
- Deployment targets: GitHub Pages static export for browser-local usage, or an internal VPS behind access controls.

## Current Code State

- Dashboard UI includes summary cards, review queue filters, detail panel, expanded original-post reader, draft editor, compliance checks, resource status, audit log, analytics, source intake, and report outputs.
- AI Content Company OS mode includes roadmap status tracking, daily pipeline, platform lanes, configured client/channel profiles, agent roster, Codex task command examples, weekly video target tracking, and a browser-local progress log.
- The first configured client/channel is Psychedelic Harm Reduction, using `../psychedelic-harm-reduction-30-day-content-calendar-en.csv` as a 30-day safety-first content-calendar seed and `docs/PSYCHEDELIC_HARM_REDUCTION_CHANNEL.md` as its channel plan.
- The Agent Company OS now has a typed browser-local daily content queue with CSV parsing, the 30-row psychedelic harm-reduction seed calendar, per-item workflow status, and active-client CSV import.
- Daily content queue items can generate deterministic local script drafts, run a rule-based harm-reduction policy review, show required edits, and require explicit human script approval before queue approval.
- Human-approved and policy-passed queue items can generate draft-only platform packages for Instagram, LinkedIn, Facebook, Threads, Newsletter, and TikTok draft, plus brief-only video asset briefs and draft generated asset manifests for visual prompt assets, text cards, b-roll needs, voiceover scripts, caption files, license checklists, and render QA checks, with publishing still disabled.
- Agent operations tracking persists audit events, agent status, daily budgets, and API fetch history through `/api/agent-ops` with PostgreSQL when `DATABASE_URL` is available and file fallback for local dev.
- Manual CSV/JSON import supports public examples and Reddit `Listing` JSON.
- Read-only Reddit search maps `.json` Listing responses into the same review queue schema.
- Multi-platform source intake normalizes public-source records from manual URLs, RSS/feed items, open-web results, reputation scanner results, deep-web public pages, and explicitly allowlisted onion evidence into the same review queue schema.
- Report outputs support CSV, JSON, Markdown evidence packets, and Markdown summary reports for all or filtered/visible posts.
- Read-only API fetches can be recorded in `api_fetch_history`; Reddit read-only search logs success/failure metadata automatically.
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
- Multi-platform source intake is read-only evidence intake only. It rejects private-data patterns, payment/card-like numbers, transaction/outreach language, unsupported URL protocols, and non-allowlisted onion hosts.

## Verification

- `npm run lint` passes.
- `npm test` passes with 46 tests.
- `npm run build` passes.
- Local `/api/health` has been verified with file persistence, read-only Reddit enabled, and OpenRouter enabled.
- Local `/api/review-state` has been reset to an empty queue.

## Operational Notes

- Access control for any VPS deployment should be enforced with Cloudflare Access, VPN, firewall allowlists, or an equivalent layer.
- Use `npm run dev` for local file-backed testing without Docker.
- Use `npm run dev:with-agents` to run the local dashboard and Pixel Agents overlay together after building the sibling `../pixel-agents` clone.
- Use `docker compose up -d postgres` and `npm run dev:db` when testing the PostgreSQL path.
- Keep `OUTREACH_WRITE_ENABLED=false` unless a separate production safety review explicitly approves a write workflow.
- Use `README.md` and `SAFE_IMPLEMENTATION_PLAN.md` as the source of truth for the internal-only scope.
