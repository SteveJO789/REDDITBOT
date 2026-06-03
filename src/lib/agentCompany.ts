import {
  getAllSeedContentCalendarQueue,
  mergeContentCalendarQueue,
  type ContentCalendarQueueItem
} from "./contentCalendar";

export const AGENT_COMPANY_STORAGE_KEY = "operation-empathy-agent-company-v1";

export type AgentWorkStatus = "backlog" | "working" | "review" | "blocked" | "done";

export type AgentRole = {
  id: string;
  name: string;
  mission: string;
  dailyOutput: string;
  automationBoundary: string;
};

export type PipelineStage = {
  id: string;
  time: string;
  stage: string;
  owner: string;
  output: string;
  approvalGate?: boolean;
};

export type RoadmapTask = {
  id: string;
  phase: string;
  priority: "P0" | "P1" | "P2" | "P3";
  title: string;
  owner: string;
  target: string;
  defaultStatus: AgentWorkStatus;
};

export type PlatformLane = {
  id: string;
  platform: string;
  launchOrder: number;
  role: string;
  automation: string;
  currentGate: string;
};

export type ClientChannel = {
  id: string;
  name: string;
  client: string;
  activeChannel: string;
  positioning: string;
  audience: string;
  offer: string;
  calendarSource: string;
  calendarRows: number;
  calendarThemes: string[];
  contentPillars: Array<{
    label: string;
    count: number;
  }>;
  primaryPlatforms: string[];
  launchGuardrails: string[];
  firstThirtyDays: string;
};

export type ProgressLogEntry = {
  id: string;
  text: string;
  createdAt: string;
};

export type AgentCompanyProgress = {
  taskStatuses: Record<string, AgentWorkStatus>;
  activeClientChannelId: string;
  activeChannel: string;
  dailyVideoTarget: number;
  approvedVideosThisWeek: number;
  productionCostTargetUsd: number;
  contentQueue: ContentCalendarQueueItem[];
  progressLog: ProgressLogEntry[];
};

export const agentStatusLabels: Record<AgentWorkStatus, string> = {
  backlog: "Backlog",
  working: "Working",
  review: "Review",
  blocked: "Blocked",
  done: "Done"
};

export const agentStatusStyles: Record<AgentWorkStatus, string> = {
  backlog: "border-slate-200 bg-slate-50 text-slate-700",
  working: "border-cyan-200 bg-cyan-50 text-cyan-900",
  review: "border-amber-200 bg-amber-50 text-amber-900",
  blocked: "border-rose-200 bg-rose-50 text-rose-900",
  done: "border-teal-200 bg-teal-50 text-teal-900"
};

export const defaultClientChannelId = "psychedelic-harm-reduction";

export const clientChannels: ClientChannel[] = [
  {
    id: "psychedelic-harm-reduction",
    name: "Psychedelic Harm Reduction",
    client: "Psychedelic harm-reduction education client",
    activeChannel: "Psychedelic harm-reduction education and integration support",
    positioning:
      "Grounded, safety-first education for preparation, legal awareness, integration, and support boundaries.",
    audience:
      "Adults researching psychedelic harm reduction who need caution, context, and referral-aware support.",
    offer:
      "Preparation and integration support sessions framed as education, not therapy, medical care, legal advice, sourcing, dosage, or encouragement to use.",
    calendarSource: "../psychedelic-harm-reduction-30-day-content-calendar-en.csv",
    calendarRows: 30,
    calendarThemes: ["Awareness", "Preparation", "Integration", "Authority", "Conversion"],
    contentPillars: [
      { label: "Education", count: 18 },
      { label: "Trust", count: 7 },
      { label: "Conversion", count: 5 }
    ],
    primaryPlatforms: ["Instagram", "LinkedIn", "Facebook", "Threads", "Newsletter", "TikTok draft"],
    launchGuardrails: [
      "No sourcing, dosage guidance, legal advice, medical advice, diagnosis, or encouragement to use.",
      "Avoid treatment, cure, guaranteed healing, or spiritual outcome claims.",
      "Every post needs a safety note and human policy review before production.",
      "Refer crisis, psychosis, mania, self-harm, or severe disruption language to qualified professional or emergency support."
    ],
    firstThirtyDays:
      "Use the CSV as the first calendar: 7 Awareness, 7 Preparation, 7 Integration, 6 Authority, and 3 Conversion posts."
  },
  {
    id: "ai-tools-shorts",
    name: "AI Tools Shorts",
    client: "Internal proof-of-concept channel",
    activeChannel: "AI tools explained in 60 seconds",
    positioning:
      "Practical short-form videos that explain useful AI workflows without hype or unsupported product claims.",
    audience: "Builders and operators evaluating AI tools for everyday work.",
    offer: "Internal content-factory proof of concept.",
    calendarSource: "Trend Research Agent daily topic queue",
    calendarRows: 0,
    calendarThemes: ["Tool education", "Workflow demos", "Operator trust"],
    contentPillars: [
      { label: "Education", count: 0 },
      { label: "Demo", count: 0 },
      { label: "Trust", count: 0 }
    ],
    primaryPlatforms: ["YouTube Shorts", "TikTok draft", "Instagram Reels", "Reddit draft"],
    launchGuardrails: [
      "Verify product claims against current official docs before scripting.",
      "Avoid implying tool output is guaranteed, autonomous, or production-safe without review.",
      "Keep publishing approval-gated until platform adapters and QA are proven."
    ],
    firstThirtyDays:
      "Generate daily topics from current public docs, changelogs, and operator pain points."
  }
];

export function getClientChannel(clientChannelId: string) {
  return clientChannels.find((channel) => channel.id === clientChannelId) ?? clientChannels[0];
}

export const agentRoster: AgentRole[] = [
  {
    id: "ceo-agent",
    name: "CEO Agent",
    mission: "Turn business goals into weekly priorities and unblock production.",
    dailyOutput: "Weekly targets, daily blockers, and task priority decisions.",
    automationBoundary: "Can recommend priorities; cannot approve publishing alone."
  },
  {
    id: "trend-research-agent",
    name: "Trend Research Agent",
    mission: "Find daily content opportunities from public sources and channel analytics.",
    dailyOutput: "20 topic candidates with audience, hook, and evidence notes.",
    automationBoundary: "Read-only public research; no scraping bypasses or private data."
  },
  {
    id: "strategist-agent",
    name: "Strategist Agent",
    mission: "Rank topics by channel fit, repeatability, and expected engagement.",
    dailyOutput: "3 ranked concepts and one recommended production pick.",
    automationBoundary: "Can recommend a pick; human selects the daily production idea."
  },
  {
    id: "script-agent",
    name: "Script Agent",
    mission: "Write short-form scripts with hooks, beats, captions, and voiceover.",
    dailyOutput: "3 script drafts in a consistent production format.",
    automationBoundary: "Cannot pass a script to rendering until policy review is clear."
  },
  {
    id: "fact-policy-agent",
    name: "Fact/Policy Agent",
    mission: "Review claims, synthetic media disclosure, platform rules, and copyright risk.",
    dailyOutput: "Pass/fail checklist with required edits.",
    automationBoundary: "Can block work; cannot override a human approval gate."
  },
  {
    id: "creative-director-agent",
    name: "Creative Director Agent",
    mission: "Choose format, pacing, visual style, thumbnail direction, and reusable templates.",
    dailyOutput: "Production brief for the selected script.",
    automationBoundary: "Works only from approved scripts and licensed/generated assets."
  },
  {
    id: "asset-agent",
    name: "Asset Agent",
    mission: "Create prompts, image needs, b-roll list, voice plan, and caption assets.",
    dailyOutput: "Asset manifest for the video editor.",
    automationBoundary: "No copyrighted media unless license is recorded."
  },
  {
    id: "video-editor-agent",
    name: "Video Editor Agent",
    mission: "Render the final vertical video from templates and generated assets.",
    dailyOutput: "9:16 video draft with captions and audio.",
    automationBoundary: "Cannot publish; outputs require QA and human approval."
  },
  {
    id: "qa-agent",
    name: "QA Agent",
    mission: "Check duration, resolution, captions, audio, factual claims, and export quality.",
    dailyOutput: "QA checklist and pass/fail decision.",
    automationBoundary: "Can fail videos; cannot ship failed videos."
  },
  {
    id: "platform-packager-agent",
    name: "Platform Packager Agent",
    mission: "Prepare platform-specific titles, descriptions, hashtags, thumbnails, and Reddit drafts.",
    dailyOutput: "TikTok, Instagram, YouTube, and Reddit packages.",
    automationBoundary: "Package drafts only until platform adapters are explicitly approved."
  },
  {
    id: "publisher-agent",
    name: "Publisher Agent",
    mission: "Schedule or upload approved content through official platform paths.",
    dailyOutput: "Publishing checklist and upload/schedule status.",
    automationBoundary: "Disabled by default; requires human approval and platform review."
  },
  {
    id: "analytics-agent",
    name: "Analytics Agent",
    mission: "Convert performance metrics into next-day content recommendations.",
    dailyOutput: "24-hour performance summary and repeat/avoid topics.",
    automationBoundary: "Reads metrics only; cannot change publishing rules."
  }
];

export const dailyPipeline: PipelineStage[] = [
  {
    id: "research",
    time: "07:00",
    stage: "Research",
    owner: "Trend Research Agent",
    output: "20 topic candidates"
  },
  {
    id: "strategy",
    time: "07:30",
    stage: "Strategy",
    owner: "Strategist Agent",
    output: "3 ranked ideas"
  },
  {
    id: "script",
    time: "08:00",
    stage: "Script",
    owner: "Script Agent",
    output: "3 scripts"
  },
  {
    id: "policy",
    time: "08:30",
    stage: "Safety",
    owner: "Fact/Policy Agent",
    output: "approved script candidate"
  },
  {
    id: "script-approval",
    time: "09:00",
    stage: "Human Gate",
    owner: "CEO / Human Editor",
    output: "selected script",
    approvalGate: true
  },
  {
    id: "creative",
    time: "09:15",
    stage: "Creative",
    owner: "Creative Director + Asset Agent",
    output: "production brief"
  },
  {
    id: "render",
    time: "10:00",
    stage: "Render",
    owner: "Video Editor Agent",
    output: "draft video"
  },
  {
    id: "qa",
    time: "10:45",
    stage: "QA",
    owner: "QA Agent",
    output: "pass/fail checklist"
  },
  {
    id: "final-approval",
    time: "11:00",
    stage: "Human Gate",
    owner: "CEO / Human Editor",
    output: "final approval",
    approvalGate: true
  },
  {
    id: "package",
    time: "12:00",
    stage: "Package",
    owner: "Platform Packager Agent",
    output: "platform drafts"
  },
  {
    id: "publish",
    time: "13:00",
    stage: "Publish",
    owner: "Publisher Agent + Human",
    output: "scheduled or uploaded content",
    approvalGate: true
  },
  {
    id: "measure",
    time: "Next day",
    stage: "Measure",
    owner: "Analytics Agent",
    output: "performance summary"
  }
];

export const platformLanes: PlatformLane[] = [
  {
    id: "youtube",
    platform: "YouTube Shorts",
    launchOrder: 1,
    role: "First publishing target for the daily video loop.",
    automation: "API upload after human approval.",
    currentGate: "Add disabled-by-default upload adapter after render QA exists."
  },
  {
    id: "tiktok",
    platform: "TikTok",
    launchOrder: 2,
    role: "Short-form growth and trend testing.",
    automation: "Direct Post only after app review and posting caps are understood.",
    currentGate: "Keep as package draft until official API review is complete."
  },
  {
    id: "instagram",
    platform: "Instagram Reels",
    launchOrder: 3,
    role: "Brand presence and reposting of best Shorts/TikToks.",
    automation: "Graph API publishing after account permissions are complete.",
    currentGate: "Keep as package draft until business account and permissions are ready."
  },
  {
    id: "reddit",
    platform: "Reddit",
    launchOrder: 4,
    role: "Research, discussion, and careful community-specific posts.",
    automation: "Draft-only by default.",
    currentGate: "No automated posting; use explicit human action only."
  }
];

export const roadmapTasks: RoadmapTask[] = [
  {
    id: "plan-doc",
    phase: "Week 1 - Operating System",
    priority: "P0",
    title: "Create the AI agent company Markdown plan.",
    owner: "CEO Agent",
    target: "Written operating plan with roles, cadence, metrics, and safety rules.",
    defaultStatus: "done"
  },
  {
    id: "tracking-ui",
    phase: "Week 1 - Operating System",
    priority: "P0",
    title: "Add in-app roadmap and progress tracking.",
    owner: "Codex Implementation Agent",
    target: "Browser-local task board and progress log.",
    defaultStatus: "done"
  },
  {
    id: "pixel-agents-cockpit",
    phase: "Week 1 - Operating System",
    priority: "P0",
    title: "Use Pixel Agents as the monitoring cockpit.",
    owner: "Codex Implementation Agent",
    target: "Local Pixel Agents runner and Codex bridge are available.",
    defaultStatus: "done"
  },
  {
    id: "approval-gates",
    phase: "Week 1 - Operating System",
    priority: "P0",
    title: "Keep all publishing behind human approval gates.",
    owner: "Fact/Policy Agent",
    target: "No auto-posting path is active by default.",
    defaultStatus: "done"
  },
  {
    id: "agent-ops-database",
    phase: "Week 1 - Operating System",
    priority: "P0",
    title: "Add database tracking for agent ops.",
    owner: "Codex Implementation Agent",
    target: "Persist audit events, agent status, daily budgets, and API fetch history.",
    defaultStatus: "done"
  },
  {
    id: "topic-schema",
    phase: "Week 2 - Script Factory",
    priority: "P1",
    title: "Create topic intake schema and daily idea queue.",
    owner: "Trend Research Agent",
    target: "Typed content calendar queue with CSV import, seed rows, local statuses, and safety notes.",
    defaultStatus: "done"
  },
  {
    id: "script-templates",
    phase: "Week 2 - Script Factory",
    priority: "P1",
    title: "Add script generation prompt templates.",
    owner: "Script Agent",
    target: "Reusable prompts for hooks, voiceover, captions, and scene beats.",
    defaultStatus: "backlog"
  },
  {
    id: "policy-checklist",
    phase: "Week 2 - Script Factory",
    priority: "P1",
    title: "Add fact and policy review checklist.",
    owner: "Fact/Policy Agent",
    target: "Block risky scripts before rendering.",
    defaultStatus: "backlog"
  },
  {
    id: "asset-manifest",
    phase: "Week 3 - Video Factory",
    priority: "P1",
    title: "Add video asset manifest schema.",
    owner: "Asset Agent",
    target: "Track approved-script asset briefs and draft assets with prompts, voiceover, b-roll, captions, and license notes.",
    defaultStatus: "done"
  },
  {
    id: "render-template",
    phase: "Week 3 - Video Factory",
    priority: "P2",
    title: "Build first vertical video render template.",
    owner: "Video Editor Agent",
    target: "Generate a 9:16 draft video from a script and asset manifest.",
    defaultStatus: "backlog"
  },
  {
    id: "render-qa",
    phase: "Week 3 - Video Factory",
    priority: "P2",
    title: "Add render validation.",
    owner: "QA Agent",
    target: "Check resolution, duration, captions, audio, and file size.",
    defaultStatus: "backlog"
  },
  {
    id: "platform-packages",
    phase: "Week 4 - Publishing And Analytics",
    priority: "P2",
    title: "Add platform package export.",
    owner: "Platform Packager Agent",
    target: "Export titles, descriptions, hashtags, thumbnails, and Reddit draft text.",
    defaultStatus: "backlog"
  },
  {
    id: "youtube-adapter",
    phase: "Week 4 - Publishing And Analytics",
    priority: "P3",
    title: "Add YouTube upload adapter behind a feature flag.",
    owner: "Publisher Agent",
    target: "Upload approved videos only when publishing is explicitly enabled.",
    defaultStatus: "backlog"
  },
  {
    id: "analytics-loop",
    phase: "Week 4 - Publishing And Analytics",
    priority: "P3",
    title: "Add analytics import and next-day feedback loop.",
    owner: "Analytics Agent",
    target: "Track 24-hour results and update tomorrow's strategy.",
    defaultStatus: "backlog"
  }
];

export function createInitialAgentCompanyProgress(): AgentCompanyProgress {
  const defaultClientChannel = getClientChannel(defaultClientChannelId);

  return {
    taskStatuses: Object.fromEntries(roadmapTasks.map((task) => [task.id, task.defaultStatus])),
    activeClientChannelId: defaultClientChannel.id,
    activeChannel: defaultClientChannel.activeChannel,
    dailyVideoTarget: 1,
    approvedVideosThisWeek: 0,
    productionCostTargetUsd: 3,
    contentQueue: getAllSeedContentCalendarQueue(),
    progressLog: [
      {
        id: "initial-plan",
        text: "Created the first operating plan and dashboard tracker with the psychedelic harm-reduction client/channel as the first configured profile.",
        createdAt: "2026-06-02T00:00:00.000Z"
      }
    ]
  };
}

export function mergeAgentCompanyProgress(rawProgress: Partial<AgentCompanyProgress> | null) {
  const initial = createInitialAgentCompanyProgress();

  if (!rawProgress) {
    return initial;
  }

  const inferredClientChannelId =
    rawProgress.activeClientChannelId ??
    (rawProgress.activeChannel === getClientChannel("ai-tools-shorts").activeChannel
      ? "ai-tools-shorts"
      : initial.activeClientChannelId);
  const clientChannel = getClientChannel(inferredClientChannelId);

  return {
    ...initial,
    ...rawProgress,
    activeClientChannelId: clientChannel.id,
    activeChannel: rawProgress.activeChannel ?? clientChannel.activeChannel,
    contentQueue: mergeContentCalendarQueue(rawProgress.contentQueue, getAllSeedContentCalendarQueue()),
    taskStatuses: {
      ...initial.taskStatuses,
      ...(rawProgress.taskStatuses ?? {})
    },
    progressLog: Array.isArray(rawProgress.progressLog)
      ? rawProgress.progressLog
      : initial.progressLog
  };
}
