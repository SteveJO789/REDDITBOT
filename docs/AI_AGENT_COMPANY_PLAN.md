# AI Agent Content Company Plan

Last updated: 2026-06-02

## Objective

Build a small company operated by AI agents that produces one approved short-form video every day for TikTok, Instagram, Reddit, and YouTube, with Pixel Agents as the monitoring cockpit and Codex-powered agents as the execution workers.

The operating principle is:

Research -> Script -> Verify -> Produce -> Review -> Package -> Approve -> Publish -> Measure

The system should automate production work, not business judgment. Final publishing should stay behind a human approval gate until platform approvals, brand safety, and channel quality are proven.

## Configured Client Channels

| Channel | Source plan | Current use |
| --- | --- | --- |
| Psychedelic Harm Reduction | `docs/PSYCHEDELIC_HARM_REDUCTION_CHANNEL.md` and `../psychedelic-harm-reduction-30-day-content-calendar-en.csv` | First configured client/channel with a 30-day safety-first content calendar. |
| AI Tools Shorts | Trend Research Agent daily topic queue | Internal proof-of-concept channel for AI tool education videos. |

## Core Architecture

### 1. Orchestration Layer

The orchestration layer owns task assignment, schedules, dependencies, budgets, approval gates, and audit logs.

Minimum viable implementation:

- A typed agent roster.
- A typed production pipeline.
- A task board with status tracking.
- A daily production queue.
- A progress log.
- Codex task commands that can be sent to Pixel Agents for monitoring.

Later implementation:

- Persistent database-backed task queue.
- Agent budgets and spend tracking.
- Queue retries and escalation rules.
- Slack/email approval notifications.
- Platform publishing adapters.

### 2. Pixel Agents Monitoring Frontend

Pixel Agents should be used as the live cockpit:

- See which Codex agent is working.
- Chat with active agents.
- Watch tool calls and errors.
- Inspect active tasks.
- Keep development monitoring separate from production posting.

Local ports:

- Redditbot / operating dashboard: `http://localhost:3000`
- Pixel Agents monitor: `http://localhost:3100`

### 3. Content Factory

The content factory turns daily topics into short-form videos.

Minimum viable content path:

- Topic brief.
- 30-60 second script.
- Fact and policy review.
- Voiceover.
- Captions.
- Rendered vertical video.
- Platform-specific title, description, hashtags, thumbnail, and Reddit post draft.
- Human approval.

Recommended rendering stack:

- `ffmpeg` for reliable assembly and validation.
- Remotion or MoviePy for templated video generation.
- A small library of reusable layouts, captions, lower thirds, and end cards.

## Agent Roster

| Agent | Responsibility | First implementation |
| --- | --- | --- |
| CEO Agent | Converts monthly goals into weekly priorities. | Generates weekly content goals and blockers. |
| Trend Research Agent | Finds daily topics from public sources. | Produces 20 candidate topics per day. |
| Strategist Agent | Chooses ideas based on audience fit and channel goals. | Ranks topics and selects 3 candidates. |
| Script Agent | Writes hooks, voiceover, scene beats, captions. | Creates 3 draft scripts. |
| Fact/Policy Agent | Checks claims, platform rules, synthetic media disclosure, copyright risk. | Blocks risky scripts before rendering. |
| Creative Director Agent | Chooses style, pacing, thumbnail concept, visual references. | Produces a video brief for the selected script. |
| Asset Agent | Creates prompts, images, b-roll list, audio plan, captions. | Creates asset manifest. |
| Video Editor Agent | Renders the final video. | Builds the first templated 9:16 video. |
| QA Agent | Checks duration, resolution, captions, audio, claims, and export quality. | Produces pass/fail checklist. |
| Platform Packager Agent | Creates channel-specific metadata. | Produces TikTok, Instagram, YouTube, and Reddit package drafts. |
| Publisher Agent | Publishes only after approval. | Starts as manual checklist only. |
| Analytics Agent | Reads results and updates strategy. | Logs metrics and next-day recommendations. |
| Finance Agent | Tracks production cost, model spend, and channel ROI. | Tracks cost per video. |

## Daily Operating Cadence

| Time | Stage | Owner | Output |
| --- | --- | --- | --- |
| 07:00 | Research | Trend Research Agent | 20 topic candidates |
| 07:30 | Strategy | Strategist Agent | 3 ranked ideas |
| 08:00 | Script | Script Agent | 3 scripts |
| 08:30 | Safety | Fact/Policy Agent | approved script candidate |
| 09:00 | Human gate | CEO / human editor | selected script |
| 09:15 | Creative | Creative Director + Asset Agent | production brief |
| 10:00 | Render | Video Editor Agent | draft video |
| 10:45 | QA | QA Agent | pass/fail checklist |
| 11:00 | Human gate | CEO / human editor | final approval |
| 12:00 | Package | Platform Packager Agent | platform drafts |
| 13:00 | Publish | Publisher Agent + human | scheduled or uploaded content |
| Next day | Measure | Analytics Agent | performance summary |

## Platform Strategy

Start with YouTube Shorts because the upload API is mature and supports explicit synthetic media disclosure. TikTok and Instagram should be added after the video production loop is stable. Reddit should begin as draft-only community posts, not automated posting.

| Platform | Launch role | Automation stance |
| --- | --- | --- |
| YouTube Shorts | First publishing target. | API upload after human approval. |
| TikTok | Second publishing target. | Direct Post only after app review and account caps are understood. |
| Instagram Reels | Third publishing target. | Graph API publishing after business account setup and permissions. |
| Reddit | Research, discussion, and draft distribution. | Draft-only until explicit compliant user action is designed. |

Current source links to verify before production integration:

- TikTok Direct Post API: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- TikTok Content Sharing Guidelines: https://developers.tiktok.com/doc/content-sharing-guidelines/
- Instagram Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- YouTube `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- YouTube video resource and synthetic media metadata: https://developers.google.com/youtube/v3/docs/videos
- Reddit user actions: https://developers.reddit.com/docs/capabilities/server/userActions

## First 30 Days

### Week 1: Operating System

- Create the Markdown operating plan.
- Add dashboard mode for the AI content company.
- Add agent roster, pipeline, roadmap, and local progress tracking.
- Keep Pixel Agents connected as the live monitor.
- Assign Codex tasks through `npm run codex:agent`.

### Week 2: Script Factory

- Build topic intake format.
- Build script format.
- Build fact/policy checklist.
- Generate 3 scripts per day.
- Approve one script per day.

### Week 3: Video Factory

- Choose one repeatable video template.
- Add voiceover generation workflow.
- Add caption generation.
- Add `ffmpeg` validation.
- Render the first daily 9:16 video.

### Week 4: Publishing And Analytics

- Add platform metadata packages.
- Add human approval queue.
- Add YouTube Shorts upload adapter behind a disabled-by-default feature flag.
- Keep TikTok, Instagram, and Reddit as draft-only until platform review is complete.
- Add analytics import and next-day feedback.

## Metrics

Track these from day one:

- Videos approved per day.
- Total production cost per video.
- Agent runtime per video.
- Number of manual interventions.
- QA fail reasons.
- View count after 24 hours.
- Retention.
- Click-through rate.
- Saves, comments, shares.
- Topics that should be repeated.

The first target is:

`1 approved video per day for 30 days, under $3 production cost per video, with analytics used in the next day's topic selection.`

## Codex Task Assignment

Use the Codex bridge to assign work and watch it in Pixel Agents:

```bash
npm run dev:agents
npm run codex:agent -- "Role: Trend Research Agent. Produce 20 safe short-form video topics for an AI tools channel. Return JSON only."
```

Use read-only mode for research or review:

```bash
CODEX_AGENT_SANDBOX=read-only npm run codex:agent -- "Role: Fact/Policy Agent. Review this script for factual, copyright, and platform-policy risks."
```

Use workspace-write mode for implementation tasks:

```bash
CODEX_AGENT_SANDBOX=workspace-write npm run codex:agent -- "Role: Video Editor Agent. Implement a first ffmpeg-based render validation script."
```

## Implementation Backlog

| Priority | Task | Status |
| --- | --- | --- |
| P0 | Add AI content company plan document. | Done |
| P0 | Add in-app roadmap and progress tracking. | Done |
| P0 | Keep all publishing behind human approval. | Done |
| P0 | Add database tracking for audit logs, agent status, daily budgets, and API fetch history. | Done |
| P1 | Add content idea schema and browser-local daily queue persistence. | Done |
| P1 | Add script generation prompt templates and local draft generation. | Done |
| P1 | Add policy/fact review checklist and local review workflow. | Done |
| P1 | Add video asset manifest schema. | Done |
| P2 | Add first vertical video render template. | Backlog |
| P2 | Add draft-only platform package export. | Done |
| P3 | Add YouTube upload adapter behind feature flag. | Backlog |
| P3 | Add analytics import and feedback loop. | Backlog |

## Safety Rules

- No automatic posting without explicit approval.
- No auto-DM.
- No account rotation, scraping bypasses, or spam workflows.
- No platform integration without current official API review.
- No copyrighted music or media unless licensed.
- Synthetic media disclosures must be tracked where required.
- Every final video must have a human approval event before publishing.
