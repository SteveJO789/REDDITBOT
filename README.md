# Operation Empathy Dashboard

Operation Empathy Dashboard is an internal read-only social-listening and human-review prototype for showing how AI could support sales growth without touching production systems. It reviews imported public conversations, scores opportunity fit, detects safety and promotion risks, drafts non-promotional public replies, and requires a human decision before anything could be used.

## Current Status

- Internal dashboard prototype, not a production outreach system.
- The dashboard starts empty; data comes from manual imports or approved read-only Reddit `.json` endpoints.
- Manual CSV/JSON imports and Reddit `Listing` JSON imports are supported.
- Browser-local state works for static usage.
- VPS/server mode persists review state through the internal API and PostgreSQL.
- Optional OpenRouter analysis and draft generation exist behind `LLM_ENABLED=true` and `OPENROUTER_API_KEY`.
- Safety and compliance checks are built into the review flow.

## What This Prototype Demonstrates

- A Next.js, TypeScript, and Tailwind CSS internal dashboard.
- Import-only review queue with no seeded mock posts by default.
- Manual CSV/JSON import, including raw Reddit `Listing` JSON.
- Read-only Reddit `.json` search/import when `REDDIT_READ_ONLY_ENABLED=true`.
- Local deterministic classification for relevance, helpfulness opportunity, medical risk, promotion risk, and reply suitability.
- Optional OpenRouter Analyze button that classifies a selected post, drafts a reply, and refreshes compliance.
- Safe draft generation that avoids product links, affiliate links, discount codes, auto-DMs, and medical treatment claims.
- A local compliance checker for spam risk, health claim risk, disclosure review, issues, and required edits.
- Human review actions: approve, edit draft, reject, and mark Do Not Engage.
- Human review escalation actions: Needs Compliance Review and Needs Marketing Review.
- Manual CSV/JSON import validation for public examples.
- Server-side review-state persistence for VPS/internal server mode.
- Simple analytics for subreddit mix, risk levels, buying signals, review status, pain points, and resource request opportunities.

## Intentionally Not Included Yet

- No Reddit posting, commenting, or DM connection.
- No real customer data.
- No connection to the company website, order system, payment system, shipping system, CRM, or production APIs.
- GitHub Pages remains browser-local only; VPS/server mode persists review state through the internal API.
- No auto-posting.
- No auto-DM.
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

The persistence path uses PostgreSQL when `DATABASE_URL` is available. If PostgreSQL is unavailable, the server falls back to `.data/review-state.json` for local server tests. In Docker/VPS mode, `REQUIRE_POSTGRES=true` makes the app fail fast instead of silently falling back to file storage.

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
7. Phase 7: Consider company website or CRM integration only after a separate production safety review.

Out of scope unless explicitly approved later:

- Account farming, aged-account management, karma farming, or account rotation.
- Auto-posting, auto-commenting, auto-DM, or browser automation for outreach.
- First-reply affiliate links, discount codes, product links, or hidden commercial intent.
- Reddit posting, commenting, DM, or account-management access during the prototype stage.
- Production customer data, payment systems, shipping systems, or ordering systems.

## Project Structure

```text
src/app/          Next.js app routes and dashboard UI
src/lib/          Import parsing, classification, draft, compliance, and analytics logic
tests/            Unit tests for import, review-state, and safety logic
deploy/           PostgreSQL schema and legacy reverse proxy config
docs/             Deployment and operational documentation
```
