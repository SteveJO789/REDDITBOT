# Operation Empathy Safe Implementation Plan

## Positioning

Operation Empathy is an internal social-listening and human-review prototype for the US and Canada market.

The system helps the team identify public pain points, classify opportunity fit, assess risk, draft safe helpful replies, and track outcomes. It must not operate as an automated sales bot.

Correct flow:

```text
Listen -> Classify -> Assess Risk -> Draft Helpful Reply -> Human Review -> Approve/Edit/Reject -> Track Outcome
```

Incorrect flow:

```text
Bot finds post -> Bot comments link -> Bot sends DM -> Bot sells product
```

## Scorecard For The Previous Plan

The previous plan had useful ideas around social listening, intent analysis, dashboarding, and human review. It also included unsafe pieces that should not be implemented:

- Account farming or aged-account preparation.
- Bot-controlled posting.
- Soft-selling disguised as helpful conversation.
- Early real API connection.
- Agentic autonomy for outreach decisions.
- CTR or conversion optimization that could incentivize spam volume.

Revised score after safety correction target: 8/10.

## Phase 1: Safe Prototype Foundation

Timeline: Week 1-2

Goal: Create a clear internal demo using only mock data and local state, deployable to an internal VPS.

Deliverables:

- Next.js, TypeScript, and Tailwind dashboard.
- Mock post review queue.
- Summary cards and simple analytics.
- Local mock classification.
- Local compliance checker.
- Safe draft reply generator.
- Human review controls.
- Docker Compose staging stack with Next.js, PostgreSQL, and HTTPS reverse proxy.
- Basic auth or VPN access before the dashboard is visible.

Hard limits:

- No real Reddit API.
- No real customer data.
- No database unless local-only storage is needed.
- PostgreSQL is allowed only for internal review state, classifications, drafts, compliance results, import batches, and audit events.
- No auto-posting.
- No auto-DM.
- No account farming.

## Phase 2: Classification And Compliance

Timeline: Week 3-4

Goal: Make the prototype useful for internal review and manager demos.

Classification should return:

- Relevance score.
- Helpfulness opportunity.
- Buying signal score.
- Medical risk.
- Promotion risk.
- Should reply.
- Reason.
- Recommended response angle.
- Red flags detected.

Compliance checking should block:

- Medical claims.
- Cure, treat, heal, fix, guaranteed, or clinically proven wording.
- Affiliate links.
- Discount codes.
- First-reply product links.
- DM requests.
- Hidden advertising.
- Repetitive or bot-like wording.

Draft replies should follow this structure:

1. Acknowledge the situation.
2. Give two or three practical free suggestions.
3. Mention professional help when symptoms are severe or persistent.
4. Optionally offer a checklist or resource.

Allowed CTA:

```text
I can share a checklist/resource if useful.
```

Forbidden CTA:

```text
DM me and I will send you the product.
```

## Phase 3: Human Review Workflow

Timeline: Week 5-6

Goal: Make it obvious that AI assists humans and never makes final outreach decisions.

Supported review actions:

- Approve.
- Edit draft.
- Reject.
- Do Not Engage.
- Needs Compliance Review.
- Needs Marketing Review.

Approval must remain a human-only review decision. High-risk medical cases and failed compliance drafts cannot be approved in the prototype.

## Phase 3A: Manual Import And Persistence

Goal: Replace ad hoc local examples with traceable manual imports and persistent internal review state.

Allowed v1 input:

- Manual CSV import.
- Manual JSON import.
- Mock seed data for local development and demos.

Import validation must reject:

- Missing required fields.
- Duplicate post ids.
- Private customer data.
- Files larger than the configured import size.

Persistence targets:

- Imported posts.
- Classification results.
- Draft replies.
- Compliance results.
- Review status.
- Resource status.
- Audit log entries.

Approval means a human may decide what to do outside the system. It does not mean the app posts to Reddit.

## Phase 4: Read-Only Research Mode

Timeline: Only after explicit approval.

Goal: Explore whether an approved public data source can improve discovery while keeping the system non-automated.

Requirements before this phase:

- Policy review.
- Clear approved API scope.
- Read-only access only.
- No posting permission.
- No DM permission.
- No account farming or account rotation.
- No production customer data.

If a real Reddit integration is approved, it should start as read-only import into the review queue. Human users still decide whether and how to respond manually.

## Phase 5: AI Upgrade

Timeline: Only after the mock workflow is stable.

Goal: Replace local mock AI logic with real AI assistance while preserving the same safety boundaries.

Allowed AI tasks:

- Classify intent.
- Summarize posts.
- Detect risk.
- Draft safe public replies.
- Suggest response angles.
- Suggest resource type after a user voluntarily asks for more information.

Disallowed AI tasks:

- Autonomous posting.
- Autonomous DMs.
- Account selection.
- Outreach scheduling.
- Spam optimization.
- Medical advice.
- Product claims about curing, treating, fixing, or preventing conditions.

## Phase 6: Analytics

Goal: Help the team learn, not increase spam volume.

Recommended metrics:

- Total opportunities found.
- High-relevance opportunities.
- High-risk cases.
- Approved replies.
- Rejected replies.
- Do Not Engage count.
- Resource request opportunities.
- Posts by subreddit or channel.
- Top pain points.
- Top objections.
- Compliance failure reasons.

Avoid optimizing primarily for:

- Comment volume.
- DM volume.
- Link clicks from first replies.
- Account throughput.
- Conversion by subreddit without safety context.

## Phase 7: Production Review Gate

No production connection should be added without a separate review.

Production-risk systems include:

- Company website workflows.
- Ordering.
- Payment.
- Shipping.
- CRM.
- Customer database.
- Social media posting.
- Real account management.

Any future production integration needs a new written plan, risk review, and explicit approval.

## Operating Principle

The product should make humans faster and more careful. It should not make automated outreach easier.
