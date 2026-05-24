# Operation Empathy Implementation Roadmap

## Summary

Operation Empathy is an internal decision-support dashboard for reviewing imported public pain-point examples, classifying opportunity fit, drafting safe helpful replies, and requiring human review before any response is used.

The project must remain a prototype until explicitly approved otherwise. The current version uses manual CSV/JSON imports, Reddit Listing JSON imports, read-only Reddit `.json` fetches when enabled, multi-platform read-only public-source intake, local deterministic safety logic, optional OpenRouter analysis, internal-only persistence, and internal report outputs. It does not connect to production systems, payment, shipping, CRM, customer databases, posting workflows, or direct-message workflows.

## Current Direction

- Hosting: internal VPS with Docker Compose. Cloudflare terminates public HTTPS and forwards to the app on origin HTTP port `8080`; protect access with Cloudflare Access, VPN, firewall allowlists, or equivalent controls.
- App: Next.js, TypeScript, Tailwind CSS, and Vitest.
- Data sources: manual public-example imports, Reddit Listing JSON imports, read-only Reddit `.json` fetches when enabled, and analyst-provided public-source evidence records.
- Persistence: PostgreSQL in VPS mode, with a file fallback for local server tests.
- Safety flags: `OUTREACH_WRITE_ENABLED=false`; read-only Reddit and OpenRouter analysis are separately gated by `REDDIT_READ_ONLY_ENABLED` and `LLM_ENABLED`.

## Phase 1: Production-Shaped Internal Demo

- Keep the dashboard working with an empty default queue and imported public examples.
- Maintain Docker, Compose, Cloudflare origin, and environment documentation.
- Preserve GitHub Actions checks: tests, lint, and build.
- Keep GitHub Pages static export available for browser-local usage.

## Phase 2: Persistent Review Workflow (Completed)

- [x] Persist review statuses, resource status, edited drafts, imported examples, and audit events using granular PostgreSQL tables.
- [x] Keep all actions human-triggered: approve, edit draft, reject, Do Not Engage, Needs Compliance Review, and Needs Marketing Review.
- [x] Ensure high-risk medical cases and failed compliance drafts cannot be approved.
- [x] Keep the persistence path separate from static GitHub Pages mode.
- [x] Implemented transactional integrity for multi-table updates.

## Phase 3: Manual Import (Completed)

- [x] Support CSV/JSON import for manually collected public examples.
- [x] Validate required fields, duplicate IDs, file size, and private-data patterns.
- [x] Track imported examples separately from empty seed state.
- [x] Keep the default review queue empty until import or read-only fetch.

## Phase 4: Safety And Compliance Hardening

- Expand classification coverage for relevance, helpfulness, buying signal, medical risk, promotion risk, and reply suitability.
- Expand compliance checks for links, DM requests, affiliate language, discount codes, medical claims, hidden advertising, and repetitive wording.
- Allow copy-to-clipboard only after approval.
- Do not add posting, DM, account farming, scraping, or browser automation.

## Phase 5: Optional Real AI (Completed)

- [x] Add OpenRouter classification and drafting behind `LLM_ENABLED=true`.
- [x] Implemented server-side `/api/ai/analyze` endpoint to handle AI logic securely.
- [x] Keep deterministic fallback logic for tests and demos.
- [x] Store prompt versions and model outputs (via audit events) for auditability.
- [x] Ensure safety by not sending private customer data to the LLM.

## Phase 6: Read-Only Reddit Research Gate (Completed)

Only after separate written approval:

- [x] Use Reddit `.json` Listing endpoints as read-only public data sources.
- [x] Do not request posting or DM permissions.
- [x] Do not add account farming, account rotation, or spam optimization.
- [x] Store only minimal public metadata needed for internal review.
- [x] Keep `OUTREACH_WRITE_ENABLED=false`.

## Phase 7: Source Intake And Report Outputs (Completed)

- [x] Add report outputs for CSV, JSON, Markdown evidence packets, and Markdown summary reports.
- [x] Add multi-platform source intake for manual URLs, RSS/feed items, open-web results, reputation scanner results, deep-web public pages, and explicitly allowlisted onion evidence.
- [x] Normalize source records into the existing review queue schema so classification, human review, audit, and exports work consistently.
- [x] Reject private-data patterns, payment/card-like numbers, transaction or outreach language, unsupported URL protocols, and non-allowlisted onion hosts.
- [x] Keep all source connectors read-only with no login, form submission, marketplace action, outreach workflow, browser automation, or account automation.

## Acceptance Checks

- Tests, lint, normal build, and GitHub Pages static export build pass.
- Internal server `/api/health` returns `ok: true`.
- Review state survives browser refresh in server mode.
- Manual import accepts public examples and rejects blocking private data.
- Multi-platform source intake accepts valid public-source evidence and rejects private data, transaction/outreach language, unsupported URL protocols, and non-allowlisted onion hosts.
- Report outputs generate CSV, JSON, evidence packet, and summary report files without network outreach.
- High medical risk cannot be approved.
- Risky draft wording fails compliance.
- Approved drafts do not trigger any network outreach.
- Audit log records review actions.
