"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AGENT_COMPANY_STORAGE_KEY,
  agentRoster,
  agentStatusLabels,
  agentStatusStyles,
  clientChannels,
  dailyPipeline,
  getClientChannel,
  mergeAgentCompanyProgress,
  platformLanes,
  roadmapTasks,
  type AgentCompanyProgress,
  type AgentWorkStatus
} from "@/lib/agentCompany";
import {
  addAssetBriefToQueueItem,
  canGenerateAssetsForQueueItem,
  contentCalendarStatusLabels,
  contentCalendarStatusOrder,
  createContentCalendarQueueItems,
  createScriptDraftForQueueItem,
  canPackageQueueItem,
  generateAssetsForQueueItem,
  mergeContentCalendarQueue,
  packageQueueItem,
  policyReviewDecisionLabels,
  parseContentCalendarCsv,
  reviewQueueItemScriptPolicy,
  scriptDraftReviewStatusLabels,
  scriptDraftReviewStatusOrder,
  type ContentCalendarStatus,
  type ScriptDraftReviewStatus
} from "@/lib/contentCalendar";
import { formatUtcDateTime } from "@/lib/dateFormat";

const statusOrder: AgentWorkStatus[] = ["backlog", "working", "review", "blocked", "done"];

const priorityStyles: Record<string, string> = {
  P0: "border-rose-200 bg-rose-50 text-rose-900",
  P1: "border-amber-200 bg-amber-50 text-amber-900",
  P2: "border-cyan-200 bg-cyan-50 text-cyan-900",
  P3: "border-slate-200 bg-slate-50 text-slate-700"
};

const contentCalendarStatusStyles: Record<ContentCalendarStatus, string> = {
  queued: "border-slate-200 bg-slate-50 text-slate-700",
  scripting: "border-cyan-200 bg-cyan-50 text-cyan-900",
  policy_review: "border-amber-200 bg-amber-50 text-amber-900",
  needs_edits: "border-rose-200 bg-rose-50 text-rose-900",
  approved: "border-teal-200 bg-teal-50 text-teal-900",
  packaged: "border-violet-200 bg-violet-50 text-violet-900"
};

const opsStatusStyles: Record<string, string> = {
  idle: "border-slate-200 bg-slate-50 text-slate-700",
  working: "border-cyan-200 bg-cyan-50 text-cyan-900",
  waiting: "border-amber-200 bg-amber-50 text-amber-900",
  review: "border-amber-200 bg-amber-50 text-amber-900",
  blocked: "border-rose-200 bg-rose-50 text-rose-900",
  done: "border-teal-200 bg-teal-50 text-teal-900",
  failed: "border-rose-200 bg-rose-50 text-rose-900",
  offline: "border-slate-200 bg-slate-100 text-slate-700"
};

type OpsAgent = {
  agentId: string;
  agentName: string;
  status: string;
  currentTask: string;
  updatedAt: string;
};

type OpsBudget = {
  budgetDate: string;
  budgetKey: string;
  limitUsd: number;
  spentUsd: number;
  status: string;
  updatedAt: string;
};

type OpsAuditEvent = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

type OpsApiFetch = {
  id: string;
  connector: string;
  endpoint: string;
  status: string;
  statusCode?: number | null;
  durationMs?: number | null;
  resultCount?: number | null;
  fetchedAt: string;
};

type AgentOpsSummary = {
  agents: OpsAgent[];
  budgets: OpsBudget[];
  auditEvents: OpsAuditEvent[];
  apiFetches: OpsApiFetch[];
};

const emptyAgentOpsSummary: AgentOpsSummary = {
  agents: [],
  budgets: [],
  auditEvents: [],
  apiFetches: []
};

function TrackerBadge({
  label,
  className
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`inline-flex h-6 items-center rounded border px-2 text-[11px] font-bold ${className}`}>
      {label}
    </span>
  );
}

function TrackerMetric({
  label,
  value,
  detail,
  tone = "slate"
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "slate" | "teal" | "amber" | "rose" | "cyan";
}) {
  const toneClass = {
    slate: "border-t-slate-700",
    teal: "border-t-signal",
    amber: "border-t-caution",
    rose: "border-t-danger",
    cyan: "border-t-cyan-700"
  }[tone];

  return (
    <div className={`rounded-lg border border-line border-t-4 bg-white px-4 py-3 shadow-panel ${toneClass}`}>
      <div className="text-[11px] font-bold uppercase text-steel">{label}</div>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-3xl font-bold leading-none text-ink">{value}</span>
        {detail ? <span className="pb-0.5 text-[11px] font-medium text-steel">{detail}</span> : null}
      </div>
    </div>
  );
}

function loadStoredProgress() {
  try {
    const raw = window.localStorage.getItem(AGENT_COMPANY_STORAGE_KEY);
    return mergeAgentCompanyProgress(raw ? (JSON.parse(raw) as Partial<AgentCompanyProgress>) : null);
  } catch {
    return mergeAgentCompanyProgress(null);
  }
}

export function AgentCompanyDashboard() {
  const [progress, setProgress] = useState<AgentCompanyProgress>(() => mergeAgentCompanyProgress(null));
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false);
  const [progressNote, setProgressNote] = useState("");
  const [agentOpsSummary, setAgentOpsSummary] = useState<AgentOpsSummary>(emptyAgentOpsSummary);
  const [agentOpsStorage, setAgentOpsStorage] = useState("loading");
  const [agentOpsMessage, setAgentOpsMessage] = useState("");
  const [budgetSpentUsd, setBudgetSpentUsd] = useState(0);
  const [contentCalendarMessage, setContentCalendarMessage] = useState("");

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setProgress(loadStoredProgress());
      setHasLoadedProgress(true);
      void refreshAgentOps();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!hasLoadedProgress) {
      return;
    }

    window.localStorage.setItem(AGENT_COMPANY_STORAGE_KEY, JSON.stringify(progress));
  }, [hasLoadedProgress, progress]);

  const tasksByPhase = useMemo(() => {
    return roadmapTasks.reduce<Record<string, typeof roadmapTasks>>((grouped, task) => {
      grouped[task.phase] = grouped[task.phase] ?? [];
      grouped[task.phase].push(task);
      return grouped;
    }, {});
  }, []);

  const statusCounts = useMemo(() => {
    return roadmapTasks.reduce<Record<AgentWorkStatus, number>>(
      (counts, task) => {
        counts[progress.taskStatuses[task.id] ?? task.defaultStatus] += 1;
        return counts;
      },
      {
        backlog: 0,
        working: 0,
        review: 0,
        blocked: 0,
        done: 0
      }
    );
  }, [progress.taskStatuses]);

  const completedPercent = Math.round((statusCounts.done / roadmapTasks.length) * 100);
  const weeklyTarget = Math.max(progress.dailyVideoTarget * 7, 1);
  const weeklyVideoPercent = Math.min(
    Math.round((progress.approvedVideosThisWeek / weeklyTarget) * 100),
    100
  );
  const selectedClientChannel = getClientChannel(progress.activeClientChannelId);
  const activeContentQueue = useMemo(() => {
    return progress.contentQueue
      .filter((item) => item.clientChannelId === selectedClientChannel.id)
      .sort((first, second) => first.day - second.day || first.id.localeCompare(second.id));
  }, [progress.contentQueue, selectedClientChannel.id]);
  const contentQueueStatusCounts = useMemo(() => {
    return activeContentQueue.reduce<Record<ContentCalendarStatus, number>>(
      (counts, item) => {
        counts[item.status] += 1;
        return counts;
      },
      {
        queued: 0,
        scripting: 0,
        policy_review: 0,
        needs_edits: 0,
        approved: 0,
        packaged: 0
      }
    );
  }, [activeContentQueue]);
  const codexCommands = [
    {
      label: "Research",
      command: `npm run codex:agent -- "Role: Trend Research Agent. Client/channel: ${selectedClientChannel.name}. Produce 20 safe short-form video topics for ${progress.activeChannel}. Use the channel positioning and seed calendar. Return JSON only."`
    },
    {
      label: "Review",
      command: `CODEX_AGENT_SANDBOX=read-only npm run codex:agent -- "Role: Fact/Policy Agent. Review this ${selectedClientChannel.name} script for factual, copyright, platform-policy, medical/legal/safety, and disclosure risks. Enforce channel guardrails."`
    },
    {
      label: "Build",
      command: `CODEX_AGENT_SANDBOX=workspace-write npm run codex:agent -- "Role: Video Editor Agent. Implement the next roadmap task for the ${selectedClientChannel.name} channel and update progress."`
    }
  ];
  const todayBudget =
    agentOpsSummary.budgets.find((budget) => budget.budgetKey === "content-factory") ??
    agentOpsSummary.budgets[0];

  function updateProgress(update: Partial<AgentCompanyProgress>) {
    setProgress((current) => ({ ...current, ...update }));
  }

  function selectClientChannel(clientChannelId: string) {
    const clientChannel = getClientChannel(clientChannelId);

    setProgress((current) => ({
      ...current,
      activeClientChannelId: clientChannel.id,
      activeChannel: clientChannel.activeChannel
    }));
    void recordAuditEvent("client_channel_selected", "client_channel", clientChannel.id, {
      activeChannel: clientChannel.activeChannel
    });
  }

  function updateContentCalendarStatus(itemId: string, status: ContentCalendarStatus) {
    setProgress((current) => ({
      ...current,
      contentQueue: current.contentQueue.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    }));
    void recordAuditEvent("content_calendar_status_changed", "content_calendar_item", itemId, { status });
  }

  function generateContentScriptDraft(itemId: string) {
    setProgress((current) => ({
      ...current,
      contentQueue: current.contentQueue.map((item) =>
        item.id === itemId ? createScriptDraftForQueueItem(item) : item
      )
    }));
    void recordAuditEvent("script_draft_generated", "content_calendar_item", itemId, {
      clientChannelId: selectedClientChannel.id
    });
  }

  function runPolicyReview(itemId: string) {
    setProgress((current) => ({
      ...current,
      contentQueue: current.contentQueue.map((item) =>
        item.id === itemId ? reviewQueueItemScriptPolicy(item) : item
      )
    }));
    void recordAuditEvent("script_policy_reviewed", "content_calendar_item", itemId, {
      clientChannelId: selectedClientChannel.id
    });
  }

  function updateScriptDraftReviewStatus(itemId: string, reviewStatus: ScriptDraftReviewStatus) {
    setProgress((current) => ({
      ...current,
      contentQueue: current.contentQueue.map((item) => {
        if (item.id !== itemId || !item.scriptDraft) {
          return item;
        }

        const canHumanApprove = reviewStatus === "approved" && item.policyReview?.decision === "pass";

        return {
          ...item,
          status: canHumanApprove ? "approved" : reviewStatus === "rejected" ? "needs_edits" : item.status,
          platformPackage: canHumanApprove ? item.platformPackage : undefined,
          assetBrief: canHumanApprove ? item.assetBrief : undefined,
          generatedAssets: canHumanApprove ? item.generatedAssets : undefined,
          scriptDraft: {
            ...item.scriptDraft,
            reviewStatus
          },
          updatedAt: new Date().toISOString()
        };
      })
    }));
    void recordAuditEvent("script_draft_review_status_changed", "content_calendar_item", itemId, {
      reviewStatus
    });
  }

  function generatePlatformPackage(itemId: string) {
    setProgress((current) => ({
      ...current,
      contentQueue: current.contentQueue.map((item) =>
        item.id === itemId && canPackageQueueItem(item) ? packageQueueItem(item) : item
      )
    }));
    void recordAuditEvent("platform_package_generated", "content_calendar_item", itemId, {
      clientChannelId: selectedClientChannel.id,
      automationStatus: "draft_only"
    });
  }

  function generateAssetBrief(itemId: string) {
    setProgress((current) => ({
      ...current,
      contentQueue: current.contentQueue.map((item) =>
        item.id === itemId && canPackageQueueItem(item) ? addAssetBriefToQueueItem(item) : item
      )
    }));
    void recordAuditEvent("asset_brief_generated", "content_calendar_item", itemId, {
      clientChannelId: selectedClientChannel.id,
      renderStatus: "brief_only"
    });
  }

  function generateDraftAssets(itemId: string) {
    setProgress((current) => ({
      ...current,
      contentQueue: current.contentQueue.map((item) =>
        item.id === itemId && canGenerateAssetsForQueueItem(item) ? generateAssetsForQueueItem(item) : item
      )
    }));
    void recordAuditEvent("draft_assets_generated", "content_calendar_item", itemId, {
      clientChannelId: selectedClientChannel.id,
      automationStatus: "draft_asset",
      renderReady: false
    });
  }

  async function importContentCalendarFile(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const rows = parseContentCalendarCsv(text);
      const queueItems = createContentCalendarQueueItems(selectedClientChannel.id, rows, {
        source: "import",
        sourceLabel: file.name
      });

      setProgress((current) => ({
        ...current,
        contentQueue: mergeContentCalendarQueue(current.contentQueue, queueItems)
      }));
      setContentCalendarMessage(`Imported ${queueItems.length} calendar item${queueItems.length === 1 ? "" : "s"}.`);
      void recordAuditEvent("content_calendar_imported", "client_channel", selectedClientChannel.id, {
        filename: file.name,
        rowCount: queueItems.length
      });
    } catch (error) {
      setContentCalendarMessage((error as Error).message);
    }
  }

  async function refreshAgentOps() {
    try {
      const response = await fetch("/api/agent-ops", { cache: "no-store" });
      const payload = (await response.json()) as {
        ok?: boolean;
        storage?: string;
        summary?: AgentOpsSummary;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.summary) {
        throw new Error(payload.error || "Could not load agent ops data.");
      }

      setAgentOpsSummary(payload.summary);
      setAgentOpsStorage(payload.storage ?? "unknown");
      const budget = payload.summary.budgets.find((item) => item.budgetKey === "content-factory");
      if (budget) {
        setBudgetSpentUsd(budget.spentUsd);
      }
    } catch (error) {
      setAgentOpsStorage("unavailable");
      setAgentOpsMessage((error as Error).message);
    }
  }

  async function recordAuditEvent(
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown>
  ) {
    try {
      await fetch("/api/agent-ops/audit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: "local-operator",
          action,
          entityType,
          entityId,
          details
        })
      });
      await refreshAgentOps();
    } catch {
      setAgentOpsMessage("Could not write audit event.");
    }
  }

  async function saveDailyBudget() {
    try {
      const response = await fetch("/api/agent-ops/daily-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetKey: "content-factory",
          limitUsd: progress.productionCostTargetUsd,
          spentUsd: budgetSpentUsd,
          currency: "USD",
          status: budgetSpentUsd > progress.productionCostTargetUsd ? "exceeded" : "active",
          notes: `${progress.dailyVideoTarget} approved video target per day.`,
          updatedBy: "local-operator"
        })
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Could not save daily budget.");
      }

      setAgentOpsMessage("Daily budget saved.");
      await recordAuditEvent("daily_budget_saved", "daily_budget", "content-factory", {
        limitUsd: progress.productionCostTargetUsd,
        spentUsd: budgetSpentUsd
      });
      await refreshAgentOps();
    } catch (error) {
      setAgentOpsMessage((error as Error).message);
    }
  }

  function updateTaskStatus(taskId: string, status: AgentWorkStatus) {
    setProgress((current) => ({
      ...current,
      taskStatuses: {
        ...current.taskStatuses,
        [taskId]: status
      }
    }));
    void recordAuditEvent("roadmap_task_status_changed", "roadmap_task", taskId, { status });
  }

  function addProgressLogEntry() {
    const text = progressNote.trim();
    if (!text) {
      return;
    }

    setProgress((current) => ({
      ...current,
      progressLog: [
        {
          id: `progress-${Date.now()}`,
          text,
          createdAt: new Date().toISOString()
        },
        ...current.progressLog
      ].slice(0, 12)
    }));
    setProgressNote("");
    void recordAuditEvent("progress_log_added", "progress_log", `progress-${Date.now()}`, { text });
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <TrackerMetric label="Roadmap" value={`${completedPercent}%`} detail={`${statusCounts.done}/${roadmapTasks.length} done`} tone="teal" />
        <TrackerMetric label="Working" value={statusCounts.working} detail="active tasks" tone="cyan" />
        <TrackerMetric label="Review" value={statusCounts.review} detail="approval queue" tone="amber" />
        <TrackerMetric label="Blocked" value={statusCounts.blocked} detail="needs decision" tone={statusCounts.blocked > 0 ? "rose" : "slate"} />
        <TrackerMetric label="Weekly videos" value={`${weeklyVideoPercent}%`} detail={`${progress.approvedVideosThisWeek}/${weeklyTarget}`} tone="teal" />
        <TrackerMetric
          label="Calendar"
          value={activeContentQueue.length || selectedClientChannel.calendarRows || "Agent"}
          detail={activeContentQueue.length || selectedClientChannel.calendarRows ? "queue items" : "generated"}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_130px_130px_150px] lg:items-end">
              <label className="text-[11px] font-bold uppercase text-steel">
                Client/channel
                <select
                  className="mt-1 h-11 w-full rounded-md border border-line bg-white px-3 text-sm normal-case text-ink"
                  value={selectedClientChannel.id}
                  onChange={(event) => selectClientChannel(event.target.value)}
                >
                  {clientChannels.map((clientChannel) => (
                    <option key={clientChannel.id} value={clientChannel.id}>
                      {clientChannel.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-bold uppercase text-steel">
                Active channel
                <input
                  className="mt-1 h-11 w-full rounded-md border border-line bg-white px-3 text-sm normal-case text-ink"
                  value={progress.activeChannel}
                  onChange={(event) => updateProgress({ activeChannel: event.target.value })}
                />
              </label>
              <label className="text-[11px] font-bold uppercase text-steel">
                Daily target
                <input
                  className="mt-1 h-11 w-full rounded-md border border-line bg-white px-3 text-sm normal-case text-ink"
                  type="number"
                  min={1}
                  value={progress.dailyVideoTarget}
                  onChange={(event) => updateProgress({ dailyVideoTarget: Number(event.target.value) || 1 })}
                />
              </label>
              <label className="text-[11px] font-bold uppercase text-steel">
                Approved
                <input
                  className="mt-1 h-11 w-full rounded-md border border-line bg-white px-3 text-sm normal-case text-ink"
                  type="number"
                  min={0}
                  value={progress.approvedVideosThisWeek}
                  onChange={(event) => updateProgress({ approvedVideosThisWeek: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="text-[11px] font-bold uppercase text-steel">
                Cost target
                <div className="mt-1 flex h-11 items-center rounded-md border border-line bg-white px-3">
                  <span className="text-sm font-bold text-steel">$</span>
                  <input
                    className="h-full min-w-0 flex-1 border-0 px-2 text-sm normal-case text-ink outline-none"
                    type="number"
                    min={0}
                    step={0.5}
                    value={progress.productionCostTargetUsd}
                    onChange={(event) => updateProgress({ productionCostTargetUsd: Number(event.target.value) || 0 })}
                  />
                </div>
              </label>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold uppercase text-ink">{selectedClientChannel.client}</h2>
                    <TrackerBadge
                      label={selectedClientChannel.calendarRows ? `${selectedClientChannel.calendarRows} day seed` : "Agent generated"}
                      className="border-cyan-200 bg-cyan-50 text-cyan-900"
                    />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink">{selectedClientChannel.positioning}</p>
                  <p className="mt-2 text-xs leading-5 text-steel">{selectedClientChannel.audience}</p>
                  <p className="mt-2 text-xs leading-5 text-steel">{selectedClientChannel.offer}</p>
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase text-steel">Calendar seed</div>
                  <div className="mt-1 text-xs leading-5 text-ink">{selectedClientChannel.firstThirtyDays}</div>
                  <div className="mt-2 text-[11px] font-semibold uppercase text-steel">
                    {selectedClientChannel.calendarSource}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedClientChannel.calendarThemes.map((theme) => (
                  <TrackerBadge key={theme} label={theme} className="border-slate-200 bg-slate-50 text-slate-700" />
                ))}
                {selectedClientChannel.contentPillars.map((pillar) => (
                  <TrackerBadge
                    key={pillar.label}
                    label={pillar.count ? `${pillar.label} ${pillar.count}` : pillar.label}
                    className="border-teal-200 bg-teal-50 text-teal-900"
                  />
                ))}
                {selectedClientChannel.primaryPlatforms.map((platform) => (
                  <TrackerBadge key={platform} label={platform} className="border-amber-200 bg-amber-50 text-amber-900" />
                ))}
              </div>

              <ul className="mt-3 grid gap-2 text-xs leading-5 text-steel md:grid-cols-2">
                {selectedClientChannel.launchGuardrails.map((guardrail) => (
                  <li key={guardrail} className="border-l-4 border-rose-200 pl-3">
                    {guardrail}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white shadow-panel">
            <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase text-ink">Daily Content Queue</h2>
                <p className="text-xs text-steel">{selectedClientChannel.name} production calendar</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {contentCalendarStatusOrder.map((status) => (
                  <TrackerBadge
                    key={status}
                    label={`${contentCalendarStatusLabels[status]} ${contentQueueStatusCounts[status]}`}
                    className={contentCalendarStatusStyles[status]}
                  />
                ))}
                <label className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md bg-night px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">
                  Import CSV
                  <input
                    className="sr-only"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      void importContentCalendarFile(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {contentCalendarMessage ? (
              <p className="border-b border-line px-4 py-2 text-xs font-medium text-steel" aria-live="polite">
                {contentCalendarMessage}
              </p>
            ) : null}
            <div className="max-h-[720px] space-y-3 overflow-auto p-4">
              {activeContentQueue.map((item) => (
                <article key={item.id} className="grid gap-3 rounded-lg border border-line bg-panel p-3 lg:grid-cols-[72px_minmax(0,1fr)_220px]">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-steel">Day</div>
                    <div className="mt-1 text-2xl font-bold leading-none text-ink">{item.day}</div>
                    <div className="mt-2 text-xs font-semibold text-steel">{item.weekTheme}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <TrackerBadge label={item.contentPillar} className="border-teal-200 bg-teal-50 text-teal-900" />
                      <TrackerBadge label={item.format} className="border-slate-200 bg-slate-50 text-slate-700" />
                      <TrackerBadge
                        label={item.source === "seed" ? "Seed CSV" : "Imported CSV"}
                        className="border-cyan-200 bg-cyan-50 text-cyan-900"
                      />
                    </div>
                    <h3 className="mt-2 text-sm font-bold leading-5 text-ink">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-steel">{item.caption}</p>
                    <p className="mt-2 text-xs leading-5 text-ink">{item.cta}</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase leading-5 text-steel">
                      {item.recommendedPlatforms.join(" / ")}
                    </p>
                    <p className="mt-2 border-l-4 border-rose-200 pl-3 text-xs leading-5 text-steel">
                      {item.safetyNote}
                    </p>
                    {item.scriptDraft ? (
                      <div className="mt-3 rounded-lg border border-cyan-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold uppercase text-ink">Script Review Packet</h4>
                          <TrackerBadge
                            label={`${item.scriptDraft.estimatedDurationSeconds}s`}
                            className="border-cyan-200 bg-cyan-50 text-cyan-900"
                          />
                          <TrackerBadge
                            label={scriptDraftReviewStatusLabels[item.scriptDraft.reviewStatus]}
                            className="border-slate-200 bg-slate-50 text-slate-700"
                          />
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-bold uppercase text-steel">Hook</div>
                            <p className="mt-1 text-sm leading-6 text-ink">{item.scriptDraft.hook.text}</p>
                            <p className="mt-2 text-xs leading-5 text-steel">{item.scriptDraft.hook.safetyNote}</p>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase text-steel">CTA</div>
                            <p className="mt-1 text-sm leading-6 text-ink">{item.scriptDraft.cta.text}</p>
                            <p className="mt-2 text-xs leading-5 text-steel">{item.scriptDraft.cta.safetyCheck}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-[11px] font-bold uppercase text-steel">Voiceover</div>
                          <ol className="mt-2 space-y-2">
                            {item.scriptDraft.voiceover.map((beat) => (
                              <li key={`${item.id}-voiceover-${beat.beat}`} className="rounded border border-line bg-panel px-3 py-2">
                                <div className="text-[11px] font-bold uppercase text-steel">
                                  {beat.timestampRange} / {beat.purpose}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-ink">{beat.line}</p>
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="mt-3">
                          <div className="text-[11px] font-bold uppercase text-steel">Caption</div>
                          <p className="mt-1 whitespace-pre-wrap rounded border border-line bg-panel px-3 py-2 text-xs leading-5 text-ink">
                            {item.scriptDraft.captions.fullCaptionText}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {item.policyReview ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold uppercase text-ink">Fact/Policy Review</h4>
                          <TrackerBadge
                            label={policyReviewDecisionLabels[item.policyReview.decision]}
                            className={
                              item.policyReview.decision === "pass"
                                ? "border-teal-200 bg-teal-50 text-teal-900"
                                : item.policyReview.decision === "revise"
                                  ? "border-amber-200 bg-amber-50 text-amber-900"
                                  : "border-rose-200 bg-rose-50 text-rose-900"
                            }
                          />
                          <TrackerBadge
                            label="Human approval required"
                            className="border-amber-200 bg-amber-50 text-amber-900"
                          />
                        </div>
                        {item.policyReview.blockedCategories.length > 0 ? (
                          <div className="mt-3">
                            <div className="text-[11px] font-bold uppercase text-steel">Blocked categories</div>
                            <p className="mt-1 text-xs leading-5 text-ink">{item.policyReview.blockedCategories.join(", ")}</p>
                          </div>
                        ) : null}
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-bold uppercase text-steel">Notes</div>
                            <ul className="mt-1 space-y-1 text-xs leading-5 text-steel">
                              {item.policyReview.notes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase text-steel">Required edits</div>
                            {item.policyReview.requiredEdits.length > 0 ? (
                              <ul className="mt-1 space-y-1 text-xs leading-5 text-steel">
                                {item.policyReview.requiredEdits.map((edit) => (
                                  <li key={edit}>{edit}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-xs leading-5 text-steel">No required edits from automated review.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {item.platformPackage ? (
                      <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold uppercase text-ink">Platform Package</h4>
                          <TrackerBadge
                            label={`${item.platformPackage.drafts.length} drafts`}
                            className="border-violet-200 bg-violet-50 text-violet-900"
                          />
                          <TrackerBadge
                            label="Draft only"
                            className="border-amber-200 bg-amber-50 text-amber-900"
                          />
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          {item.platformPackage.drafts.map((draft) => (
                            <article key={`${item.id}-${draft.platform}`} className="rounded border border-line bg-panel p-3">
                              <div className="text-[11px] font-bold uppercase text-steel">
                                {draft.platform.replaceAll("_", " ")}
                              </div>
                              <h5 className="mt-1 text-sm font-bold leading-5 text-ink">{draft.title}</h5>
                              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-steel">
                                {draft.body}
                              </p>
                              <p className="mt-2 text-[11px] font-semibold uppercase leading-5 text-steel">
                                {draft.hashtags.join(" ")}
                              </p>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {item.assetBrief ? (
                      <div className="mt-3 rounded-lg border border-teal-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold uppercase text-ink">Asset Brief</h4>
                          <TrackerBadge
                            label={`${item.assetBrief.deliverables.length} deliverables`}
                            className="border-teal-200 bg-teal-50 text-teal-900"
                          />
                          <TrackerBadge
                            label={`${item.assetBrief.scenes.length} scenes`}
                            className="border-cyan-200 bg-cyan-50 text-cyan-900"
                          />
                          <TrackerBadge
                            label="Brief only"
                            className="border-amber-200 bg-amber-50 text-amber-900"
                          />
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-bold uppercase text-steel">Creative direction</div>
                            <p className="mt-1 text-xs leading-5 text-ink">{item.assetBrief.creativeDirection}</p>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase text-steel">Visual style</div>
                            <p className="mt-1 text-xs leading-5 text-ink">{item.assetBrief.visualStyle}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-[11px] font-bold uppercase text-steel">Deliverables</div>
                          <div className="mt-2 grid gap-2 lg:grid-cols-2">
                            {item.assetBrief.deliverables.map((deliverable) => (
                              <article key={`${item.id}-${deliverable.name}`} className="rounded border border-line bg-panel px-3 py-2">
                                <div className="text-[11px] font-bold uppercase text-steel">
                                  {deliverable.format} / {deliverable.aspectRatio}
                                </div>
                                <h5 className="mt-1 text-xs font-bold leading-5 text-ink">{deliverable.name}</h5>
                                <p className="mt-1 text-xs leading-5 text-steel">
                                  {deliverable.platforms.join(" / ") || "Shared asset"}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-steel">{deliverable.productionNotes}</p>
                              </article>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-[11px] font-bold uppercase text-steel">Scene asset plan</div>
                          <ol className="mt-2 space-y-2">
                            {item.assetBrief.scenes.map((scene) => (
                              <li key={`${item.id}-asset-scene-${scene.beat}`} className="rounded border border-line bg-panel px-3 py-2">
                                <div className="text-[11px] font-bold uppercase text-steel">
                                  {scene.timestampRange} / Beat {scene.beat}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-ink">{scene.onScreenText}</p>
                                <p className="mt-1 text-xs leading-5 text-steel">{scene.assetNeed}</p>
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-bold uppercase text-steel">Visual prompts</div>
                            <ul className="mt-1 space-y-2 text-xs leading-5 text-steel">
                              {item.assetBrief.visualPrompts.map((prompt) => (
                                <li key={prompt.promptId} className="rounded border border-line bg-panel px-3 py-2">
                                  <p className="font-semibold text-ink">{prompt.prompt}</p>
                                  <p className="mt-1">{prompt.negativePrompt}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase text-steel">Voiceover and license</div>
                            <p className="mt-1 text-xs leading-5 text-ink">{item.assetBrief.voiceoverPlan.tone}</p>
                            <p className="mt-1 text-xs leading-5 text-steel">{item.assetBrief.voiceoverPlan.recordingNotes}</p>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-steel">
                              {item.assetBrief.licenseNotes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2">
                          <div className="text-[11px] font-bold uppercase text-rose-900">Safety constraints</div>
                          <p className="mt-1 text-xs leading-5 text-rose-900">
                            {item.assetBrief.prohibitedVisuals.join(" ")}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {item.generatedAssets ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold uppercase text-ink">Generated Assets</h4>
                          <TrackerBadge
                            label={`${item.generatedAssets.assets.length} draft assets`}
                            className="border-emerald-200 bg-emerald-50 text-emerald-900"
                          />
                          <TrackerBadge
                            label={`${item.generatedAssets.renderInputs.textCardCount} text cards`}
                            className="border-cyan-200 bg-cyan-50 text-cyan-900"
                          />
                          <TrackerBadge
                            label="Render locked"
                            className="border-amber-200 bg-amber-50 text-amber-900"
                          />
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-3">
                          <div className="rounded border border-line bg-panel px-3 py-2">
                            <div className="text-[11px] font-bold uppercase text-steel">Aspect</div>
                            <p className="mt-1 text-sm font-bold text-ink">{item.generatedAssets.renderInputs.aspectRatio}</p>
                          </div>
                          <div className="rounded border border-line bg-panel px-3 py-2">
                            <div className="text-[11px] font-bold uppercase text-steel">Duration</div>
                            <p className="mt-1 text-sm font-bold text-ink">
                              {item.generatedAssets.renderInputs.estimatedDurationSeconds}s
                            </p>
                          </div>
                          <div className="rounded border border-line bg-panel px-3 py-2">
                            <div className="text-[11px] font-bold uppercase text-steel">Voiceover</div>
                            <p className="mt-1 text-sm font-bold text-ink">
                              {item.generatedAssets.renderInputs.voiceoverLineCount} lines
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-[11px] font-bold uppercase text-steel">Visual prompt assets</div>
                          <div className="mt-2 grid gap-2 lg:grid-cols-2">
                            {item.generatedAssets.assets
                              .filter(
                                (asset) =>
                                  asset.kind === "cover_image_prompt" ||
                                  asset.kind === "background_loop_prompt" ||
                                  asset.kind === "support_graphic_prompt"
                              )
                              .map((asset) => (
                                <article key={asset.assetId} className="rounded border border-line bg-panel px-3 py-2">
                                  <div className="text-[11px] font-bold uppercase text-steel">{asset.kind.replaceAll("_", " ")}</div>
                                  <h5 className="mt-1 text-xs font-bold leading-5 text-ink">{asset.name}</h5>
                                  <p className="mt-1 text-xs leading-5 text-ink">{asset.prompt}</p>
                                  <p className="mt-1 text-xs leading-5 text-steel">{asset.negativePrompt}</p>
                                </article>
                              ))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-[11px] font-bold uppercase text-steel">Text card assets</div>
                          <ol className="mt-2 space-y-2">
                            {item.generatedAssets.assets
                              .filter((asset) => asset.kind === "text_card")
                              .map((asset) => (
                                <li key={asset.assetId} className="rounded border border-line bg-panel px-3 py-2">
                                  <div className="text-[11px] font-bold uppercase text-steel">{asset.name}</div>
                                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-ink">{asset.body}</p>
                                </li>
                              ))}
                          </ol>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          {item.generatedAssets.assets
                            .filter(
                              (asset) =>
                                asset.kind === "b_roll_list" ||
                                asset.kind === "voiceover_script" ||
                                asset.kind === "caption_file" ||
                                asset.kind === "license_checklist"
                            )
                            .map((asset) => (
                              <article key={asset.assetId} className="rounded border border-line bg-panel p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-[11px] font-bold uppercase text-steel">
                                    {asset.kind.replaceAll("_", " ")}
                                  </div>
                                  <TrackerBadge
                                    label={asset.licenseStatus.replaceAll("_", " ")}
                                    className="border-amber-200 bg-amber-50 text-amber-900"
                                  />
                                </div>
                                <h5 className="mt-1 text-xs font-bold leading-5 text-ink">{asset.name}</h5>
                                <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5 text-steel">
                                  {asset.body}
                                </p>
                              </article>
                            ))}
                        </div>
                        <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2">
                          <div className="text-[11px] font-bold uppercase text-rose-900">QA before render</div>
                          <ul className="mt-1 space-y-1 text-xs leading-5 text-rose-900">
                            {item.generatedAssets.qaChecklist.map((check) => (
                              <li key={check}>{check}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold uppercase text-steel">
                      Queue status
                      <select
                        className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                        value={item.status}
                        onChange={(event) => updateContentCalendarStatus(item.id, event.target.value as ContentCalendarStatus)}
                      >
                        {contentCalendarStatusOrder.map((status) => (
                          <option key={status} value={status}>
                            {contentCalendarStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md bg-night px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
                        onClick={() => generateContentScriptDraft(item.id)}
                      >
                        {item.scriptDraft ? "Regenerate" : "Draft"}
                      </button>
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md bg-white px-3 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => runPolicyReview(item.id)}
                        disabled={!item.scriptDraft}
                      >
                        Review
                      </button>
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-violet-300 bg-violet-100 px-3 py-2 text-xs font-bold text-ink hover:bg-violet-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                        onClick={() => generatePlatformPackage(item.id)}
                        disabled={!canPackageQueueItem(item)}
                      >
                        {item.platformPackage ? "Repackage" : "Package"}
                      </button>
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-teal-300 bg-teal-100 px-3 py-2 text-xs font-bold text-ink hover:bg-teal-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                        onClick={() => generateAssetBrief(item.id)}
                        disabled={!canPackageQueueItem(item)}
                      >
                        {item.assetBrief ? "Update Brief" : "Asset Brief"}
                      </button>
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 text-xs font-bold text-ink hover:bg-emerald-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                        onClick={() => generateDraftAssets(item.id)}
                        disabled={!canGenerateAssetsForQueueItem(item)}
                      >
                        {item.generatedAssets ? "Regen Assets" : "Generate Assets"}
                      </button>
                    </div>

                    {!canPackageQueueItem(item) ? (
                      <p className="rounded border border-line bg-white px-2 py-1 text-[11px] font-medium leading-5 text-steel">
                        Package and Asset Brief unlock after Policy Review is Pass and Human script status is Human Approved.
                      </p>
                    ) : null}
                    {canPackageQueueItem(item) && !item.assetBrief ? (
                      <p className="rounded border border-line bg-white px-2 py-1 text-[11px] font-medium leading-5 text-steel">
                        Generate Assets unlocks after Asset Brief is created.
                      </p>
                    ) : null}

                    {item.scriptDraft ? (
                      <div className="rounded border border-line bg-white p-2">
                        <div className="text-[11px] font-bold uppercase text-steel">Script draft</div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink">{item.scriptDraft.hook.text}</p>
                        <label className="mt-2 block text-[11px] font-bold uppercase text-steel">
                          Human script status
                          <select
                            className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                            value={item.scriptDraft.reviewStatus}
                            onChange={(event) => updateScriptDraftReviewStatus(item.id, event.target.value as ScriptDraftReviewStatus)}
                          >
                            {scriptDraftReviewStatusOrder.map((status) => (
                              <option key={status} value={status}>
                                {scriptDraftReviewStatusLabels[status]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}

                    {item.policyReview ? (
                      <div className="rounded border border-line bg-white p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-bold uppercase text-steel">Policy review</div>
                          <TrackerBadge
                            label={policyReviewDecisionLabels[item.policyReview.decision]}
                            className={
                              item.policyReview.decision === "pass"
                                ? "border-teal-200 bg-teal-50 text-teal-900"
                                : item.policyReview.decision === "revise"
                                  ? "border-amber-200 bg-amber-50 text-amber-900"
                                  : "border-rose-200 bg-rose-50 text-rose-900"
                            }
                          />
                        </div>
                        {item.policyReview.requiredEdits.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-xs leading-5 text-steel">
                            {item.policyReview.requiredEdits.slice(0, 2).map((edit) => (
                              <li key={edit}>{edit}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-steel">No required edits. Human approval still required.</p>
                        )}
                      </div>
                    ) : null}

                    {item.updatedAt ? (
                      <span className="block text-[11px] font-semibold uppercase text-steel">
                        {formatUtcDateTime(item.updatedAt)}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
              {activeContentQueue.length === 0 ? (
                <div className="rounded border border-line bg-panel p-3 text-xs text-steel">
                  No content calendar items for this client/channel yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white shadow-panel">
            <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase text-ink">Implementation Roadmap</h2>
                <p className="text-xs text-steel">Persistent local progress for the agent-company build.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOrder.map((status) => (
                  <TrackerBadge
                    key={status}
                    label={`${agentStatusLabels[status]} ${statusCounts[status]}`}
                    className={agentStatusStyles[status]}
                  />
                ))}
              </div>
            </div>
            <div className="divide-y divide-line">
              {Object.entries(tasksByPhase).map(([phase, tasks]) => {
                const phaseDone = tasks.filter((task) => progress.taskStatuses[task.id] === "done").length;
                return (
                  <section key={phase} className="p-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-sm font-bold text-ink">{phase}</h3>
                      <span className="text-xs font-semibold text-steel">
                        {phaseDone}/{tasks.length} done
                      </span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {tasks.map((task) => {
                        const currentStatus = progress.taskStatuses[task.id] ?? task.defaultStatus;
                        return (
                          <article key={task.id} className="rounded-lg border border-line bg-panel p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap gap-2">
                                  <TrackerBadge label={task.priority} className={priorityStyles[task.priority]} />
                                  <TrackerBadge
                                    label={agentStatusLabels[currentStatus]}
                                    className={agentStatusStyles[currentStatus]}
                                  />
                                </div>
                                <h4 className="mt-2 text-sm font-bold leading-5 text-ink">{task.title}</h4>
                                <p className="mt-1 text-xs leading-5 text-steel">{task.target}</p>
                                <p className="mt-2 text-[11px] font-bold uppercase text-steel">{task.owner}</p>
                              </div>
                              <label className="w-full text-[11px] font-bold uppercase text-steel sm:w-32">
                                Status
                                <select
                                  className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                                  value={currentStatus}
                                  onChange={(event) => updateTaskStatus(task.id, event.target.value as AgentWorkStatus)}
                                >
                                  {statusOrder.map((status) => (
                                    <option key={status} value={status}>
                                      {agentStatusLabels[status]}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase text-ink">Daily Pipeline</h2>
                <TrackerBadge label="Human gates active" className="border-amber-200 bg-amber-50 text-amber-900" />
              </div>
              <div className="mt-3 space-y-2">
                {dailyPipeline.map((stage) => (
                  <div key={stage.id} className="grid grid-cols-[68px_minmax(0,1fr)] gap-3 rounded border border-line bg-panel px-3 py-2">
                    <div className="text-xs font-bold text-ink">{stage.time}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-ink">{stage.stage}</span>
                        {stage.approvalGate ? (
                          <TrackerBadge label="Approval" className="border-amber-200 bg-amber-50 text-amber-900" />
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-steel">
                        {stage.owner} {"->"} {stage.output}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
              <h2 className="text-sm font-bold uppercase text-ink">Platform Lanes</h2>
              <div className="mt-3 space-y-3">
                {platformLanes.map((lane) => (
                  <article key={lane.id} className="rounded-lg border border-line bg-panel p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase text-steel">Launch {lane.launchOrder}</div>
                        <h3 className="mt-1 text-sm font-bold text-ink">{lane.platform}</h3>
                      </div>
                      <TrackerBadge
                        label={lane.id === "reddit" ? "Draft only" : "Approval"}
                        className={lane.id === "reddit" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-teal-200 bg-teal-50 text-teal-900"}
                      />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-steel">{lane.role}</p>
                    <p className="mt-2 text-xs leading-5 text-ink">{lane.automation}</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase text-steel">{lane.currentGate}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase text-ink">Database Tracking</h2>
                <p className="mt-1 text-xs text-steel">Audit, agent status, budgets, and API fetch history.</p>
              </div>
              <TrackerBadge
                label={`DB ${agentOpsStorage}`}
                className={agentOpsStorage === "postgres" ? "border-teal-200 bg-teal-50 text-teal-900" : "border-slate-200 bg-slate-50 text-slate-700"}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-line bg-panel p-3">
                <div className="font-bold uppercase text-steel">Agent status</div>
                <div className="mt-1 text-lg font-bold text-ink">{agentOpsSummary.agents.length}</div>
              </div>
              <div className="rounded border border-line bg-panel p-3">
                <div className="font-bold uppercase text-steel">API fetches</div>
                <div className="mt-1 text-lg font-bold text-ink">{agentOpsSummary.apiFetches.length}</div>
              </div>
            </div>

            <div className="mt-3 rounded border border-line bg-panel p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold uppercase text-steel">Daily budget</div>
                  <div className="mt-1 text-xs text-steel">
                    {todayBudget ? `${todayBudget.budgetDate} / ${todayBudget.status}` : "No saved budget yet"}
                  </div>
                </div>
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-md bg-night px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
                  onClick={saveDailyBudget}
                >
                  Save
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold uppercase text-steel">
                  Limit
                  <div className="mt-1 rounded border border-line bg-white px-2 py-2 text-sm text-ink">
                    ${progress.productionCostTargetUsd.toFixed(2)}
                  </div>
                </label>
                <label className="text-[11px] font-bold uppercase text-steel">
                  Spent
                  <input
                    className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                    type="number"
                    min={0}
                    step={0.25}
                    value={budgetSpentUsd}
                    onChange={(event) => setBudgetSpentUsd(Number(event.target.value) || 0)}
                  />
                </label>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-bold uppercase text-steel">Recent agents</div>
              {agentOpsSummary.agents.slice(0, 4).map((agent) => (
                <div key={agent.agentId} className="rounded border border-line bg-panel p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-ink">{agent.agentName}</span>
                    <TrackerBadge
                      label={agent.status}
                      className={opsStatusStyles[agent.status] ?? opsStatusStyles.offline}
                    />
                  </div>
                  {agent.currentTask ? (
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-steel">{agent.currentTask}</div>
                  ) : null}
                </div>
              ))}
              {agentOpsSummary.agents.length === 0 ? (
                <div className="rounded border border-line bg-panel p-2 text-xs text-steel">No agent status records yet.</div>
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-bold uppercase text-steel">Recent audit</div>
              {agentOpsSummary.auditEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded border border-line bg-panel p-2 text-xs">
                  <div className="font-bold text-ink">{event.action}</div>
                  <div className="mt-1 text-steel">
                    {event.actor} / {event.entityType}:{event.entityId || "system"}
                  </div>
                </div>
              ))}
              {agentOpsSummary.auditEvents.length === 0 ? (
                <div className="rounded border border-line bg-panel p-2 text-xs text-steel">No audit records yet.</div>
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-bold uppercase text-steel">Recent API fetches</div>
              {agentOpsSummary.apiFetches.slice(0, 4).map((fetchRecord) => (
                <div key={fetchRecord.id} className="rounded border border-line bg-panel p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold text-ink">{fetchRecord.connector}</span>
                    <TrackerBadge
                      label={fetchRecord.status}
                      className={fetchRecord.status === "success" ? "border-teal-200 bg-teal-50 text-teal-900" : "border-rose-200 bg-rose-50 text-rose-900"}
                    />
                  </div>
                  <div className="mt-1 truncate text-steel">
                    {fetchRecord.endpoint} / {fetchRecord.resultCount ?? 0} results
                  </div>
                </div>
              ))}
              {agentOpsSummary.apiFetches.length === 0 ? (
                <div className="rounded border border-line bg-panel p-2 text-xs text-steel">No API fetch records yet.</div>
              ) : null}
            </div>

            {agentOpsMessage ? (
              <p className="mt-3 rounded border border-line bg-panel px-3 py-2 text-xs font-medium text-steel">
                {agentOpsMessage}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="text-sm font-bold uppercase text-ink">Progress Log</h2>
            <div className="mt-3 flex gap-2">
              <input
                className="h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm text-ink"
                placeholder="Add progress update"
                value={progressNote}
                onChange={(event) => setProgressNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addProgressLogEntry();
                  }
                }}
              />
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-night px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                onClick={addProgressLogEntry}
                disabled={!progressNote.trim()}
              >
                Add
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {progress.progressLog.map((entry) => (
                <li key={entry.id} className="rounded border border-line bg-panel px-3 py-2">
                  <div className="text-xs leading-5 text-ink">{entry.text}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase text-steel">
                    {formatUtcDateTime(entry.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="text-sm font-bold uppercase text-ink">Codex Agent Commands</h2>
            <div className="mt-3 space-y-3">
              {codexCommands.map((command) => (
                <div key={command.label} className="rounded border border-line bg-panel p-3">
                  <div className="text-[11px] font-bold uppercase text-steel">{command.label}</div>
                  <code className="mt-2 block whitespace-pre-wrap break-words text-xs leading-5 text-ink">
                    {command.command}
                  </code>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="text-sm font-bold uppercase text-ink">Agent Roster</h2>
            <div className="mt-3 max-h-[640px] space-y-3 overflow-auto pr-1">
              {agentRoster.map((agent) => (
                <article key={agent.id} className="rounded-lg border border-line bg-panel p-3">
                  <h3 className="text-sm font-bold text-ink">{agent.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-steel">{agent.mission}</p>
                  <p className="mt-2 text-xs leading-5 text-ink">{agent.dailyOutput}</p>
                  <p className="mt-2 text-[11px] font-semibold uppercase leading-5 text-steel">
                    {agent.automationBoundary}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
