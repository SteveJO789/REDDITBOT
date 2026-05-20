# Operation Empathy Implementation Roadmap

## Summary

Operation Empathy is an internal decision-support dashboard for reviewing public or mock pain-point examples, classifying opportunity fit, drafting safe helpful replies, and requiring human review before any response is used.

The project must remain a prototype until explicitly approved otherwise. Version 1 uses mock data, manual CSV/JSON imports, local mock AI logic, and internal-only persistence. It does not connect to Reddit, production systems, payment, shipping, CRM, customer databases, posting workflows, or direct-message workflows.

## Current Direction

- Hosting: internal VPS with Docker Compose. Cloudflare terminates public HTTPS and forwards to the app on origin HTTP port `8080`; protect access with Cloudflare Access, VPN, firewall allowlists, or equivalent controls.
- App: Next.js, TypeScript, Tailwind CSS, and Vitest.
- Data sources: mock seed data and manual public-example imports only.
- Persistence: PostgreSQL in VPS mode, with a file fallback for local server tests.
- Safety flags: `OUTREACH_WRITE_ENABLED=false`, `REDDIT_READ_ONLY_ENABLED=false`, and `LLM_ENABLED=false` for v1.

## Phase 1: Production-Shaped Internal Demo

- Keep the existing dashboard behavior working with mock data.
- Maintain Docker, Compose, Cloudflare origin, and environment documentation.
- Preserve GitHub Actions checks: tests, lint, and build.
- Keep GitHub Pages static export available for mock-only public demo hosting.

## Phase 2: Persistent Review Workflow (Completed)

- [x] Persist review statuses, resource status, edited drafts, imported examples, and audit events using granular PostgreSQL tables.
- [x] Keep all actions human-triggered: approve, edit draft, reject, Do Not Engage, Needs Compliance Review, and Needs Marketing Review.
- [x] Ensure high-risk medical cases and failed compliance drafts cannot be approved.
- [x] Keep the persistence path separate from static GitHub Pages mode.
- [x] Implemented transactional integrity for multi-table updates.

## Phase 3: Manual Import

- Support CSV/JSON import for manually collected public examples.
- Validate required fields, duplicate IDs, file size, and private-data patterns.
- Track imported examples separately from mock seed data.
- Keep mock seed data available for local development and demos.

## Phase 4: Safety And Compliance Hardening

- Expand classification coverage for relevance, helpfulness, buying signal, medical risk, promotion risk, and reply suitability.
- Expand compliance checks for links, DM requests, affiliate language, discount codes, medical claims, hidden advertising, and repetitive wording.
- Allow copy-to-clipboard only after approval.
- Do not add posting, DM, account farming, scraping, or browser automation.

## Phase 5: Optional Real AI (Completed)

- [x] Add LLM classification and drafting behind `LLM_ENABLED=true` using Gemini 1.5 Flash.
- [x] Implemented server-side `/api/ai` endpoints to handle AI logic securely.
- [x] Keep deterministic fallback logic for tests and demos.
- [x] Store prompt versions and model outputs (via audit events) for auditability.
- [x] Ensure safety by not sending private customer data to the LLM.

## Phase 6: Future Read-Only Reddit Research Gate

Only after separate written approval:

- Use an approved public data source or official Reddit API read-only scopes.
- Do not request posting or DM permissions.
- Do not add account farming, account rotation, or spam optimization.
- Store only minimal public metadata needed for internal review.
- Keep `OUTREACH_WRITE_ENABLED=false`.

## Acceptance Checks

- Tests, lint, normal build, and GitHub Pages static export build pass.
- Internal server `/api/health` returns `ok: true`.
- Review state survives browser refresh in server mode.
- Manual import accepts public/mock examples and rejects private data.
- High medical risk cannot be approved.
- Risky draft wording fails compliance.
- Approved drafts do not trigger any network outreach.
- Audit log records review actions.
