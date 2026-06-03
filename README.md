# Operation Empathy Dashboard

Operation Empathy Dashboard is an internal read-only social-listening and human-review prototype for showing how AI could support sales growth without touching production systems. It reviews imported public conversations, scores opportunity fit, detects safety and promotion risks, drafts non-promotional public replies, and requires a human decision before anything could be used.

## Current Status

- Internal dashboard prototype, not a production outreach system.
- AI Content Company OS mode is available for planning and tracking the agent-run content factory.
- `docs/AI_AGENT_COMPANY_PLAN.md` contains the current operating plan for daily AI-made videos.
- `docs/PSYCHEDELIC_HARM_REDUCTION_CHANNEL.md` defines the first configured client/channel and points to the 30-day CSV seed calendar.
- Agent Company mode includes a browser-local daily content queue with the psychedelic harm-reduction seed calendar, per-item workflow status, and active-client CSV import.
- Daily content queue items can generate local script drafts, run rule-based harm-reduction policy reviews, and require explicit human script approval before queue approval.
- Human-approved and policy-passed queue items can generate draft-only platform packages, brief-only video asset briefs, and draft generated asset manifests; no automatic publishing path is active.
- The dashboard starts empty; data comes from manual imports, approved read-only Reddit `.json` endpoints, or read-only public-source evidence intake.
- Manual CSV/JSON imports and Reddit `Listing` JSON imports are supported.
- Multi-platform source intake is supported for analyst-provided public-source JSON records.
- CSV, JSON, evidence-packet, and summary-report exports are supported.
- Browser-local state works for static usage.
- VPS/server mode persists review state through the internal API and PostgreSQL.
- Agent operations tracking persists audit events, agent status, daily budgets, and API fetch history.
- Optional OpenRouter analysis and draft generation exist behind `LLM_ENABLED=true` and `OPENROUTER_API_KEY`.
- Safety and compliance checks are built into the review flow.

## What This Prototype Demonstrates

- A Next.js, TypeScript, and Tailwind CSS internal dashboard.
- A browser-local AI agent company tracker with roadmap statuses, daily production pipeline, platform lanes, agent roster, Codex task commands, and a progress log.
- Configured Agent Company client/channel profiles, including the psychedelic harm-reduction channel seeded from the 30-day calendar.
- Typed content-calendar parsing and queue tracking for production calendar rows.
- Local script draft generation and policy review workflow for queued content items.
- Draft-only platform package generation for approved content.
- Brief-only asset brief generation for approved content, including deliverables, visual prompts, voiceover, captions, license notes, and prohibited visuals.
- Draft generated asset manifests for approved asset briefs, including visual prompt assets, text cards, b-roll needs, voiceover script, caption file, license checklist, and render QA checks.
- Database-backed agent operations tracking for audit events, agent status, daily budgets, and API fetch history, with file fallback in local dev.
- Import-only review queue with no seeded mock posts by default.
- Manual CSV/JSON import, including raw Reddit `Listing` JSON.
- Read-only Reddit `.json` search/import when `REDDIT_READ_ONLY_ENABLED=true`.
- Multi-platform public-source intake for manual URLs, RSS/feed items, open-web results, reputation scanner results, deep-web public pages, and explicitly allowlisted onion evidence.
- Local deterministic classification for relevance, helpfulness opportunity, medical risk, promotion risk, and reply suitability.
- Optional OpenRouter Analyze button that classifies a selected post, drafts a reply, and refreshes compliance.
- Safe draft generation that avoids product links, affiliate links, discount codes, auto-DMs, and medical treatment claims.
- A local compliance checker for spam risk, health claim risk, disclosure review, issues, and required edits.
- Human review actions: approve, edit draft, reject, and mark Do Not Engage.
- Human review escalation actions: Needs Compliance Review and Needs Marketing Review.
- Manual CSV/JSON import validation for public examples.
- Report outputs for CSV, JSON, Markdown evidence packets, and Markdown summary reports.
- Server-side review-state persistence for VPS/internal server mode.
- Simple analytics for subreddit mix, risk levels, buying signals, review status, pain points, and resource request opportunities.

## Intentionally Not Included Yet

- No Reddit posting, commenting, or DM connection.
- No real customer data.
- No connection to the company website, order system, payment system, shipping system, CRM, or production APIs.
- GitHub Pages remains browser-local only; VPS/server mode persists review state through the internal API.
- No auto-posting.
- No auto-DM.
- No source-connector login, form submission, marketplace actions, transaction support, or contact workflow.
- No affiliate links or product recommendations in first public replies.
- No medical treatment claims or claims that any product cures burnout, numbness, brain fog, wrist pain, or carpal tunnel.
- No AI calls unless `LLM_ENABLED=true` and `OPENROUTER_API_KEY` are set in an internal environment.

## How To Run Locally

Install dependencies:

```bash
npm install
```

Start the local development server with file-backed local state:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

To run the dashboard with a local Pixel Agents overlay, clone and build Pixel Agents beside this project, then start both processes:

```bash
git clone https://github.com/pixel-agents-hq/pixel-agents ../pixel-agents
cd ../pixel-agents
npm install
npm run build
cd ../REDDITBOT
npm run dev:with-agents
```

Pixel Agents starts at:

```text
http://localhost:3100
```

The runner uses the current Redditbot project as Pixel Agents' working directory so local Claude Code sessions for this repo can appear in the Pixel Agents UI. This is development visualization only; it does not add posting, DM, account automation, or any outreach-write capability to the dashboard. If Pixel Agents is cloned elsewhere, set `PIXEL_AGENTS_DIR=/absolute/path/to/pixel-agents`. You can also set `PIXEL_AGENTS_HOST` or `PIXEL_AGENTS_PORT`, or pass Pixel Agents CLI flags after `--`.

To assign a local Codex task and show it as an agent in Pixel Agents:

```bash
npm run dev:agents
npm run codex:agent -- "inspect the dashboard and summarize the safest next implementation task"
```

`codex:agent` runs `codex exec` in this repository and reports start/stop status to Pixel Agents. It defaults to `CODEX_AGENT_SANDBOX=workspace-write`; set `CODEX_AGENT_SANDBOX=read-only` for analysis-only tasks. Each run also updates `/api/agent-ops/agent-status`, writes start/finish audit events, and saves output files under `.data/agent-runs/`.

To test with Docker/PostgreSQL instead of file-backed local state:

```bash
docker compose up -d postgres
npm run dev:db
```

Build check:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Run On An Internal VPS

The default build now runs as a normal Next.js server for Docker/VPS hosting. GitHub Pages static export is still available only when `GITHUB_PAGES=true`.

Required files:

- `.env.example` for required staging environment variables.
- `Dockerfile` for the Next.js app container.
- `docker-compose.yml` for the app and PostgreSQL.
- `deploy/postgres/schema.sql` for the planned persistent review workflow.
- `docs/VPS_DEPLOYMENT.md` for setup and acceptance checks.

Generate `.env`, fill real secrets, then run the preflight check:

```bash
npm run validate:env
```

Start the VPS stack:

```bash
docker compose up -d --build
```

The VPS Compose stack publishes the Next.js server on origin HTTP port `8080`:

```text
Cloudflare HTTPS -> VPS origin http://<server-ip>:8080 -> Next.js app port 3000
```

Cloudflare handles public HTTPS for `APP_BASE_URL`. Keep the dashboard internal with Cloudflare Access, firewall allowlists, VPN, or an equivalent access-control layer.

Verify the app and PostgreSQL persistence path:

```bash
npm run verify:docker
```

Create an on-demand PostgreSQL backup:

```bash
npm run backup:db
```

Restore a backup only after confirming the target database:

```bash
npm run restore:db -- backups/operation_empathy-example.sql --yes
```

In VPS mode, `npm run start` runs `server/review-server.mjs`. The server exposes:

- `GET /api/health` for a basic runtime and persistence check.
- `GET /api/review-state` to load the saved dashboard state.
- `PUT /api/review-state` to save review statuses, edited drafts, imported examples, resource status, and audit events.
- `GET /api/agent-ops` to load agent status, daily budgets, audit events, and API fetch history.
- `POST /api/agent-ops/agent-status` to upsert the current status of an agent.
- `POST /api/agent-ops/daily-budget` to upsert a daily budget record.
- `POST /api/agent-ops/audit-event` to append an audit event.
- `POST /api/agent-ops/api-fetch` to append an API fetch history record.

The persistence path uses PostgreSQL when `DATABASE_URL` is available. If PostgreSQL is unavailable, the server falls back to `.data/review-state.json` for local server tests. In Docker/VPS mode, `REQUIRE_POSTGRES=true` makes the app fail fast instead of silently falling back to file storage.
Agent operations records use the same PostgreSQL connection when available and fall back to `.data/agent-ops.json` in local file mode.

Keep outreach writes disabled:

```env
OUTREACH_WRITE_ENABLED=false
```

Read-only and analysis features are controlled separately:

```env
REDDIT_READ_ONLY_ENABLED=true
LLM_ENABLED=true
OPENROUTER_API_KEY=your_openrouter_key
```

## Multi-Platform Source Intake

The dashboard includes a **Multi-Platform Source Intake** panel for importing analyst-provided public-source evidence records. It is not a live crawler or outreach tool. The supported source types are:

- Manual URL Evidence
- RSS / Atom Feed Item
- Open Web Result
- Reputation Scanner Result
- Deep Web Public Page
- Onion Allowlist Page

Example JSON item:

```json
{
  "title": "Public source item",
  "body": "Evidence text only.",
  "url": "https://example.com/item",
  "keyword": "risk signal",
  "sourceName": "Example Source"
}
```

The source intake validates records before importing them into the review queue. It rejects private-data patterns, payment/card-like numbers, transaction or outreach language, unsupported URL protocols, and onion URLs that are not explicitly allowlisted. Onion evidence remains read-only and must not involve login, forms, contact workflows, or transactions.

## Report Outputs

The dashboard includes a **Report Outputs** panel for exporting review data:

- CSV all / visible
- JSON all / visible
- Markdown evidence packet
- Markdown summary report

Exports are for internal review and evidence preservation only. They do not trigger any posting, messaging, or production system writes.

## Deploy To GitHub Pages

This app is configured for static export, so it can run on GitHub Pages without a server.

One-time GitHub setup:

1. Push this repository to GitHub.
2. Open the repository in GitHub.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `GitHub Actions`.
5. Push to the `main` branch or run the `Deploy to GitHub Pages` workflow manually.

The default repo-site URL will be:

```text
https://<github-username>.github.io/REDDITBOT/
```

The workflow runs tests, lint, and a static build, then deploys the generated `out/` folder.

## Safety Principles

- Import or fetch only public examples approved for internal review.
- Treat multi-platform source intake as read-only evidence intake only.
- All generated replies require human review before use.
- First public replies should be helpful, educational, and non-promotional.
- Product or resource sharing should happen only after the user voluntarily asks for it.
- High medical risk posts should be treated safety-first and can be marked Do Not Engage.
- The prototype should never post, DM, collect private customer data, or write to production systems.

## Safe Execution Plan

The working direction is an internal decision-support dashboard, not an automated Reddit sales bot.

1. Phase 1: Keep the import-only dashboard working in browser-local, local server, and VPS modes.
2. Phase 2: Strengthen local classification, compliance checking, draft generation, and review status tracking.
3. Phase 3: Use optional internal AI classification and draft generation only when the safety gate and environment flags are explicitly enabled.
4. Phase 4: Keep the human review workflow explicit with approve, edit, reject, Do Not Engage, and compliance review actions.
5. Phase 5: Expand learning-focused analytics for pain points, risk levels, approval quality, objections, and resource-request opportunities.
6. Phase 6: Use read-only public data research only with approved scopes and no outreach write access.
7. Phase 7: Add source-intake and report-output tooling for internal evidence review.
8. Phase 8: Consider company website or CRM integration only after a separate production safety review.

Out of scope unless explicitly approved later:

- Account farming, aged-account management, karma farming, or account rotation.
- Auto-posting, auto-commenting, auto-DM, or browser automation for outreach.
- First-reply affiliate links, discount codes, product links, or hidden commercial intent.
- Reddit posting, commenting, DM, or account-management access during the prototype stage.
- Production customer data, payment systems, shipping systems, or ordering systems.

## Project Structure

```text
src/app/          Next.js app routes and dashboard UI
src/lib/          Import parsing, source connectors, reports, classification, draft, compliance, and analytics logic
tests/            Unit tests for import, source connectors, reports, review-state, and safety logic
deploy/           PostgreSQL schema and legacy reverse proxy config
docs/             Deployment and operational documentation
```
