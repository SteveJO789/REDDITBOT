# AGENTS.md

## Project Name

Operation Empathy Dashboard

## Project Purpose

This project is an internal AI-assisted sales-growth prototype.

The goal is to demonstrate how AI can help the company identify relevant customer pain points, classify sales opportunities, generate safe draft replies, and support human decision-making.

This project must be treated as a prototype first. It must not connect to production systems, payment systems, shipping systems, customer databases, or real social media posting workflows unless explicitly requested later.

The system should help humans work faster. It must not behave like an automated sales bot.

---

## Business Context

The company already has existing systems, including:

- Website
- Ordering flow
- Payment system
- Shipping system

The AI Developer’s role is to explore how AI can increase sales by supporting the current workflow without disrupting existing operations.

The first prototype should focus on:

- Lead listening
- Pain point detection
- Buying signal detection
- Intent classification
- Risk and compliance checking
- Safe draft reply generation
- Human review workflow
- Resource request tracking
- Simple analytics

---

## Core Principle

The correct system flow is:

Listen → Classify → Assess Risk → Draft Helpful Reply → Human Review → Approve/Edit/Reject → Track Outcome

The system must not be designed as:

Bot finds post → Bot comments link → Bot sends DM → Bot sells product

---

## Safety Rules

Always follow these rules:

1. Do not build auto-posting.
2. Do not build auto-DM.
3. Do not add affiliate links to first public replies.
4. Do not generate aggressive sales messages.
5. Do not imply that a product cures, treats, prevents, diagnoses, fixes, or heals any condition.
6. Do not make medical claims.
7. Do not suggest that supplements can solve burnout, numbness, wrist pain, brain fog, carpal tunnel, anxiety, depression, or any disease.
8. Do not hide commercial intent.
9. Do not bypass human review.
10. Do not connect to real APIs unless a task explicitly asks for it.
11. Do not touch production systems.
12. Do not store sensitive personal data.
13. Do not create browser automation for mass outreach.
14. Do not create account rotation, spam, scraping, or karma-farming features.

If a requested feature conflicts with these rules, implement the safer alternative and explain it in comments or documentation.

---

## Prototype Scope

The current version should use:

- Mock data only
- Local state or localStorage
- No real Reddit API
- No real customer data
- No payment integration
- No shipping integration
- No production database
- No automatic outreach

The prototype should be safe to demo internally to managers, marketing, sales, operations, and compliance teams.

---

## Recommended Tech Stack

Use:

- Next.js
- TypeScript
- Tailwind CSS
- React components
- Local mock data
- Local mock AI logic

Do not add unnecessary dependencies unless they clearly improve the prototype.

Prefer simple, readable code over complex architecture.

---

## UI Requirements

The UI should look like a professional internal dashboard.

Prioritize clarity over decoration.

The dashboard should include:

- Summary cards
- Post/opportunity review table
- Filters
- Risk badges
- Status badges
- Review detail panel
- Draft reply section
- Compliance warnings
- Human review buttons
- Simple analytics

The dashboard should be understandable in a 3-minute demo.

Use clear labels such as:

- New
- Drafted
- Approved
- Rejected
- Do Not Engage
- Needs Review
- High Risk
- Medium Risk
- Low Risk

---

## Main Modules

### 1. Lead Listening Module

Use mock posts, comments, or customer messages to simulate public conversation discovery.

The module should identify pain points, complaints, questions, and possible buying signals.

Do not connect to real social platforms yet.

---

### 2. Intent Classification Module

Classify each mock post into useful business categories such as:

- Asking for help
- Looking for recommendations
- Expressing frustration
- Comparing solutions
- Complaining about current workflow
- Study fatigue
- Burnout
- Desk discomfort
- Joke or meme
- Low-quality rant
- High-risk medical case

Return fields such as:

- relevance_score
- helpfulness_opportunity
- buying_signal_score
- medical_risk
- promotion_risk
- should_reply
- reason
- recommended_response_angle
- red_flags_detected

---

### 3. Buying Signal Detection

Detect phrases that suggest possible commercial intent, such as:

- “Any recommendations?”
- “What do you use?”
- “I’m looking for…”
- “Is there a better way?”
- “I would pay for…”
- “I need something that…”
- “Has anyone tried…?”

Buying signal does not mean the system should sell immediately.

It only means the post may be worth human review.

---

### 4. Risk and Compliance Checker

Check every draft reply for:

- Spam risk
- Promotion risk
- Health claim risk
- Hidden advertising risk
- Aggressive DM request
- Medical red flags
- Repetitive or bot-like wording

Flag or fail drafts containing risky terms such as:

- cure
- treat
- heal
- fix
- guaranteed
- clinically proven
- use my link
- DM me for the product
- this solved my numbness
- this fixed my burnout
- discount code
- affiliate link

---

### 5. Draft Reply Generator

Generated replies must follow this structure:

1. Acknowledge the user’s situation
2. Give 2–3 practical free suggestions
3. Mention professional help when symptoms are severe or persistent
4. Optionally offer a checklist or resource

Allowed soft CTA:

“I can share a checklist/resource if useful.”

Forbidden CTA:

“DM me and I’ll send you the product.”

The first public reply must be helpful, non-promotional, and link-free.

---

### 6. Human Review Workflow

Every draft must require human action before use.

Supported actions:

- Approve
- Edit Draft
- Reject
- Do Not Engage
- Needs Compliance Review
- Needs Marketing Review

The system must make it obvious that AI is assisting, not making final decisions.

---

### 7. Resource Request Tracker

Track whether a user voluntarily asks for a resource.

Suggested statuses:

- No resource offered
- Resource offered
- User requested resource
- Resource sent
- Product requested
- Converted
- Not relevant

The system should treat product recommendation as optional and only after the user asks for more information.

---

### 8. Analytics Module

Show simple internal metrics such as:

- Total opportunities found
- High-relevance opportunities
- High buying-signal opportunities
- High-risk cases
- Approved replies
- Rejected replies
- Do Not Engage count
- Resource request opportunities
- Posts by subreddit or channel
- Top pain points
- Top objections

Analytics should help the team learn, not encourage spam volume.

---

## Mock Data Requirements

Create realistic mock data across different channels or communities.

Include examples for:

- Burnout
- Brain fog
- Wrist pain
- Numb fingers
- Neck pain
- Back pain from sitting
- Study fatigue
- Productivity frustration
- Product recommendation request
- Low-quality rant
- Meme or joke post
- High medical risk case

Include enough variation to test classification, compliance, and review workflow.

---

## Code Quality Rules

Use TypeScript types for core objects.

Create clear types for:

- MockPost
- ClassificationResult
- ComplianceResult
- DraftReply
- ReviewStatus
- RiskLevel
- ResourceStatus

Keep business logic separated from UI when reasonable.

Recommended structure:

```txt
/src
  /app
  /components
  /data
  /lib
  /types
  /prompts