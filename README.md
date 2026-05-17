# Operation Empathy Dashboard

Operation Empathy Dashboard is an internal mock-data prototype for showing how AI could support sales growth without touching production systems. It reviews simulated public conversations, scores opportunity fit, detects safety and promotion risks, drafts non-promotional public replies, and requires a human decision before anything could be used.

## What This Prototype Demonstrates

- A Next.js, TypeScript, and Tailwind CSS internal dashboard.
- Local mock posts across work-from-home, productivity, college, study, gaming, and ergonomics communities.
- Keyword-based mock classification for relevance, helpfulness opportunity, medical risk, promotion risk, and reply suitability.
- Safe draft generation that avoids product links, affiliate links, discount codes, auto-DMs, and medical treatment claims.
- A local compliance checker for spam risk, health claim risk, disclosure review, issues, and required edits.
- Human review actions: approve, edit draft, reject, and mark Do Not Engage.
- Simple analytics for subreddit mix, risk levels, review status, average relevance score, and resource request opportunities.

## Intentionally Not Included Yet

- No real Reddit API connection.
- No real customer data.
- No connection to the company website, order system, payment system, shipping system, CRM, or production APIs.
- No database.
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

Build check:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Safety Principles

- Mock data only until an approved public data source is connected.
- All generated replies require human review before use.
- First public replies should be helpful, educational, and non-promotional.
- Product or resource sharing should happen only after the user voluntarily asks for it.
- High medical risk posts should be treated safety-first and can be marked Do Not Engage.
- The prototype should never post, DM, collect private customer data, or write to production systems.

## Future Integration Plan

1. Phase 1: Mock data dashboard.
2. Phase 2: Connect approved public data source or Reddit API safely.
3. Phase 3: Add real AI classification and draft generation.
4. Phase 4: Add human approval workflow.
5. Phase 5: Add analytics and resource request tracking.
6. Phase 6: Integrate with the company website or CRM only after approval.

## Project Structure

```text
src/app/          Next.js app routes and dashboard UI
src/lib/          Mock data, classification, draft, compliance, and analytics logic
tests/            Unit tests for local mock AI safety logic
assets/           Future static or generated assets
docs/             Future contributor-facing documentation
```
