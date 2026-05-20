# Operation Empathy Dashboard

Operation Empathy Dashboard is an internal mock-data prototype for showing how AI could support sales growth without touching production systems. It reviews simulated public conversations, scores opportunity fit, detects safety and promotion risks, drafts non-promotional public replies, and requires a human decision before anything could be used.

## What This Prototype Demonstrates

- A Next.js, TypeScript, and Tailwind CSS internal dashboard.
- Local mock posts across work-from-home, productivity, college, study, gaming, and ergonomics communities.
- Keyword-based mock classification for relevance, helpfulness opportunity, medical risk, promotion risk, and reply suitability.
- Safe draft generation that avoids product links, affiliate links, discount codes, auto-DMs, and medical treatment claims.
- A local compliance checker for spam risk, health claim risk, disclosure review, issues, and required edits.
- Human review actions: approve, edit draft, reject, and mark Do Not Engage.
- Human review escalation actions: Needs Compliance Review and Needs Marketing Review.
- Manual CSV/JSON import validation for public/mock examples.
- Server-side review-state persistence for VPS/internal server mode.
- Simple analytics for subreddit mix, risk levels, buying signals, review status, pain points, and resource request opportunities.

## Intentionally Not Included Yet

- No real Reddit API connection.
- No real customer data.
- No connection to the company website, order system, payment system, shipping system, CRM, or production APIs.
- GitHub Pages remains browser-local only; VPS/server mode persists review state through the internal API.
- No auto-posting.
- No auto-DM.
- No affiliate links or product recommendations in first public replies.
- No medical treatment claims or claims that any product cures burnout, numbness, brain fog, wrist pain, or carpal tunnel.
- No real AI API calls.

## How To Run Locally

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Then open the local URL printed by Next.js, usually:

```text
http://localhost:3000
```

Development mode uses browser local state unless the custom server is running. To test the persistence API locally after a build:

```bash
npm run build
npm run start
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
- `docker-compose.yml` for app, PostgreSQL, and Caddy.
- `deploy/Caddyfile` for HTTPS reverse proxy and basic auth.
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

Keep these flags false for v1:

```env
OUTREACH_WRITE_ENABLED=false
REDDIT_READ_ONLY_ENABLED=false
LLM_ENABLED=false
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

- Mock data only until an approved public data source is connected.
- All generated replies require human review before use.
- First public replies should be helpful, educational, and non-promotional.
- Product or resource sharing should happen only after the user voluntarily asks for it.
- High medical risk posts should be treated safety-first and can be marked Do Not Engage.
- The prototype should never post, DM, collect private customer data, or write to production systems.

## Safe Execution Plan

The working direction is an internal decision-support dashboard, not an automated Reddit sales bot.

1. Phase 1: Build and demo the mock-data dashboard.
2. Phase 2: Strengthen local classification, compliance checking, draft generation, and review status tracking.
3. Phase 3: Add real AI classification and draft generation only after local safety tests are stable.
4. Phase 4: Improve the human review workflow with explicit approve, edit, reject, Do Not Engage, and compliance review actions.
5. Phase 5: Add learning-focused analytics for pain points, risk levels, approval quality, objections, and resource-request opportunities.
6. Phase 6: Consider read-only public data research only after policy review and explicit approval.
7. Phase 7: Consider company website or CRM integration only after a separate production safety review.

Out of scope unless explicitly approved later:

- Account farming, aged-account management, karma farming, or account rotation.
- Auto-posting, auto-commenting, auto-DM, or browser automation for outreach.
- First-reply affiliate links, discount codes, product links, or hidden commercial intent.
- Real Reddit API access during the prototype stage.
- Production customer data, payment systems, shipping systems, or ordering systems.

## Project Structure

```text
src/app/          Next.js app routes and dashboard UI
src/lib/          Mock data, classification, draft, compliance, and analytics logic
tests/            Unit tests for local mock AI safety logic
deploy/           VPS reverse proxy and PostgreSQL schema
docs/             Deployment and operational documentation
```
