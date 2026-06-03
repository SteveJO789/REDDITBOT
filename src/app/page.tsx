"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentCompanyDashboard } from "@/components/AgentCompanyDashboard";
import {
  createInitialReviewPosts,
  createReviewPostFromPost,
  getOverallRisk
} from "@/lib/aiMock";
import { getAnalytics } from "@/lib/analytics";
import { convertPostsToCsv, createCsvFilename } from "@/lib/csvExport";
import { formatUtcDateTime } from "@/lib/dateFormat";
import { validateManualImportText } from "@/lib/importValidation";
import {
  convertPostsToEvidencePacket,
  convertPostsToJsonReport,
  convertPostsToSummaryReport,
  createReportFilename,
  type ReportKind
} from "@/lib/reportExports";
import {
  SOURCE_CONNECTOR_LABELS,
  mapSourceRecordsToMockPosts,
  parseSourceConnectorImportText,
  type SourceConnectorKind
} from "@/lib/sourceConnectors";
import {
  DASHBOARD_STORAGE_KEY,
  createSavedDashboardState,
  hydrateSavedPosts,
  parseSavedDashboardState
} from "@/lib/persistenceState";
import { applyReviewAction, getApprovalBlockers } from "@/lib/reviewWorkflow";
import type {
  ClassificationResult,
  MockPost,
  ResourceStatus,
  ReviewPost,
  ReviewStatus,
  RiskLevel
} from "@/lib/types";

const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

const statusLabels: Record<ReviewStatus, string> = {
  new: "New",
  drafted: "Drafted",
  approved: "Approved",
  rejected: "Rejected",
  do_not_engage: "Do Not Engage",
  needs_compliance_review: "Compliance Review",
  needs_marketing_review: "Marketing Review"
};

const resourceLabels: Record<ResourceStatus, string> = {
  no_resource_offered: "No resource offered",
  resource_offered: "Resource offered",
  user_requested_resource: "User requested resource",
  resource_sent: "Resource sent",
  product_requested: "Product requested",
  converted: "Converted",
  not_relevant: "Not relevant"
};

const riskLabels: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

const riskStyles: Record<RiskLevel, string> = {
  low: "border-teal-200 bg-teal-50 text-signal",
  medium: "border-amber-200 bg-amber-50 text-caution",
  high: "border-rose-200 bg-rose-50 text-danger"
};

const statusStyles: Record<ReviewStatus, string> = {
  new: "border-slate-200 bg-slate-50 text-slate-700",
  drafted: "border-cyan-200 bg-cyan-50 text-cyan-800",
  approved: "border-teal-200 bg-teal-50 text-signal",
  rejected: "border-zinc-200 bg-zinc-100 text-zinc-700",
  do_not_engage: "border-rose-200 bg-rose-50 text-danger",
  needs_compliance_review: "border-amber-200 bg-amber-50 text-caution",
  needs_marketing_review: "border-violet-200 bg-violet-50 text-violet"
};

function Badge({
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

function MetricCard({
  label,
  value,
  detail,
  tone = "slate"
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "slate" | "teal" | "amber" | "rose" | "violet";
}) {
  const toneClass = {
    slate: "border-t-slate-700",
    teal: "border-t-signal",
    amber: "border-t-caution",
    rose: "border-t-danger",
    violet: "border-t-violet"
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

function ChartRows({
  title,
  rows,
  tone = "blue"
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  tone?: "blue" | "green" | "rose";
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const barColor =
    tone === "green" ? "bg-signal" : tone === "rose" ? "bg-danger" : "bg-night";

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h3 className="text-xs font-bold uppercase text-ink">{title}</h3>
      <div className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[108px_1fr_28px] items-center gap-3 text-xs">
            <span className="truncate font-medium text-ink">{row.label}</span>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${barColor}`}
                style={{ width: `${(row.value / max) * 100}%` }}
              />
            </div>
            <span className="text-right font-semibold text-ink">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function loadLocalSavedPosts() {
  try {
    return hydrateSavedPosts(parseSavedDashboardState(window.localStorage.getItem(DASHBOARD_STORAGE_KEY)));
  } catch {
    return createInitialReviewPosts();
  }
}

export default function Home() {
  const [dashboardMode, setDashboardMode] = useState<"agent_company" | "reddit_review">("agent_company");
  const [posts, setPosts] = useState<ReviewPost[]>(() => createInitialReviewPosts());
  const [selectedId, setSelectedId] = useState(posts[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [subredditFilter, setSubredditFilter] = useState("all");
  const [minRelevance, setMinRelevance] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [redditSearchQuery, setRedditSearchQuery] = useState("");
  const [isRedditSearching, setIsRedditSearching] = useState(false);
  const [redditMessage, setRedditMessage] = useState("");
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);
  const [persistenceMode, setPersistenceMode] = useState<"loading" | "server" | "local">("loading");
  const [saveError, setSaveError] = useState("");
  const [redditReadOnlyEnabled, setRedditReadOnlyEnabled] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [sourceConnectorKind, setSourceConnectorKind] = useState<SourceConnectorKind>("manual_url");
  const [sourceConnectorText, setSourceConnectorText] = useState("");
  const [sourceConnectorMessage, setSourceConnectorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadSavedState() {
      let savedPosts = loadLocalSavedPosts();
      let nextPersistenceMode: "server" | "local" = "local";

      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (response.ok) {
           const health = await response.json() as { llmEnabled?: boolean; redditReadOnlyEnabled?: boolean };
           if (health.llmEnabled) setLlmEnabled(true);
           if (health.redditReadOnlyEnabled) setRedditReadOnlyEnabled(true);
        }

        const stateResponse = await fetch("/api/review-state", { cache: "no-store" });
        if (stateResponse.ok) {
          const payload = (await stateResponse.json()) as {
            state?: Parameters<typeof hydrateSavedPosts>[0];
          };
          if (payload.state) {
            savedPosts = hydrateSavedPosts(payload.state);
          }
          nextPersistenceMode = "server";
        }
      } catch {
        nextPersistenceMode = "local";
      }

      if (isCancelled) {
        return;
      }

      setPosts(savedPosts);
      setSelectedId((currentId) =>
        savedPosts.some((post) => post.id === currentId) ? currentId : (savedPosts[0]?.id ?? "")
      );
      setPersistenceMode(nextPersistenceMode);
      setSaveError("");
      setHasLoadedSavedState(true);
    }

    void loadSavedState();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedState) {
      return;
    }

    const savedPayload = createSavedDashboardState(posts);
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(savedPayload));

    if (persistenceMode !== "server") {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      void fetch("/api/review-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: savedPayload })
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Server save failed.");
          }
          setSaveError("");
        })
        .catch(() => {
          setSaveError("Server save failed. Changes are still in this browser and will retry after the next edit.");
        });
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [hasLoadedSavedState, persistenceMode, posts]);

  const subreddits = useMemo(
    () => Array.from(new Set(posts.map((post) => post.subreddit))).sort(),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const overallRisk = getOverallRisk(post);
      return (
        (statusFilter === "all" || post.status === statusFilter) &&
        (riskFilter === "all" || overallRisk === riskFilter) &&
        (subredditFilter === "all" || post.subreddit === subredditFilter) &&
        post.classification.relevance_score >= minRelevance
      );
    });
  }, [minRelevance, posts, riskFilter, statusFilter, subredditFilter]);

  const selectedPost =
    posts.find((post) => post.id === selectedId) ?? filteredPosts[0] ?? posts[0];
  const analytics = useMemo(() => getAnalytics(posts), [posts]);

  const highRelevance = posts.filter((post) => post.classification.relevance_score >= 7).length;
  const highBuyingSignals = analytics.highBuyingSignalCount;
  const needingReview = posts.filter((post) =>
    ["new", "drafted", "needs_compliance_review", "needs_marketing_review"].includes(post.status)
  ).length;
  const highRisk = posts.filter((post) => getOverallRisk(post) === "high").length;
  const approved = posts.filter((post) => post.status === "approved").length;
  const rejected = posts.filter((post) => post.status === "rejected").length;
  const approvalBlockers = selectedPost ? getApprovalBlockers(selectedPost) : [];

  function updateSelectedPost(update: (post: ReviewPost) => ReviewPost) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === selectedPost.id ? update(post) : post))
    );
  }

  function setStatus(status: ReviewStatus) {
    const actionByStatus: Record<ReviewStatus, Parameters<typeof applyReviewAction>[0]["action"]> = {
      new: "edit_draft",
      drafted: "edit_draft",
      approved: "approve",
      rejected: "reject",
      do_not_engage: "do_not_engage",
      needs_compliance_review: "needs_compliance_review",
      needs_marketing_review: "needs_marketing_review"
    };
    updateSelectedPost((post) =>
      applyReviewAction({ post, action: actionByStatus[status], actor: "local-reviewer" })
    );
    setIsEditing(false);
  }

  function updateDraft(draftReply: string) {
    updateSelectedPost((post) =>
      applyReviewAction({ post, action: "edit_draft", draftReply, actor: "local-reviewer" })
    );
  }

  function updateResourceStatus(resourceStatus: ResourceStatus) {
    updateSelectedPost((post) =>
      applyReviewAction({
        post,
        action: "set_resource_status",
        resourceStatus,
        actor: "local-reviewer"
      })
    );
  }

  async function importFile(file: File | null) {
    if (!file) {
      return;
    }

    const extension = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
    const text = await file.text();
    const result = validateManualImportText(text, {
      format: extension,
      existingIds: posts.map((post) => post.id),
      maxBytes: IMPORT_MAX_BYTES,
      batchId: `manual-${Date.now()}`
    });

    if (!result.ok) {
      setImportMessage(result.errors.join(" "));
      return;
    }

    const importedReviewPosts = result.posts.map((post) =>
      createReviewPostFromPost(post, result.batchId)
    );
    setPosts((currentPosts) => [...currentPosts, ...importedReviewPosts]);
    setSelectedId(importedReviewPosts[0]?.id ?? selectedId);
    setImportMessage(`Imported ${importedReviewPosts.length} public examples.`);
  }

  function addDefaultConnectorToSourceInput(text: string) {
    const parsed = JSON.parse(text) as unknown;
    const withConnector = (row: unknown) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return row;
      }
      const record = row as Record<string, unknown>;
      return { ...record, connector: record.connector ?? sourceConnectorKind };
    };

    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed.map(withConnector));
    }

    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (Array.isArray(record.sources)) {
        return JSON.stringify({ ...record, sources: record.sources.map(withConnector) });
      }
      if (Array.isArray(record.records)) {
        return JSON.stringify({ ...record, records: record.records.map(withConnector) });
      }
      if (Array.isArray(record.items)) {
        return JSON.stringify({ ...record, items: record.items.map(withConnector) });
      }
      return JSON.stringify(withConnector(record));
    }

    return text;
  }

  function importSourceConnectorText() {
    const text = sourceConnectorText.trim();
    if (!text) {
      setSourceConnectorMessage("Paste a JSON source record first.");
      return;
    }

    let sourcePayload = text;
    try {
      sourcePayload = addDefaultConnectorToSourceInput(text);
    } catch (error) {
      setSourceConnectorMessage(`Could not parse source connector JSON: ${(error as Error).message}`);
      return;
    }

    const result = parseSourceConnectorImportText(sourcePayload, {
      existingIds: posts.map((post) => post.id)
    });

    if (!result.ok) {
      setSourceConnectorMessage(result.errors.join(" "));
      return;
    }

    const batchId = `source-connectors-${Date.now()}`;
    const sourcePosts = mapSourceRecordsToMockPosts(result.records, batchId);
    const importedReviewPosts = sourcePosts.map((post) => createReviewPostFromPost(post, batchId));
    setPosts((currentPosts) => [...currentPosts, ...importedReviewPosts]);
    setSelectedId(importedReviewPosts[0]?.id ?? selectedId);
    setSourceConnectorText("");
    setSourceConnectorMessage(
      `Imported ${importedReviewPosts.length} read-only source item${importedReviewPosts.length === 1 ? "" : "s"}. ${result.warnings.join(" ")}`
    );
  }

  async function searchReddit(query: string) {
    if (!query || !redditReadOnlyEnabled) return;

    setIsRedditSearching(true);
    setRedditMessage("");

    try {
      const response = await fetch("/api/reddit/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 15 })
      });

      const data = (await response.json()) as { ok: boolean; posts?: MockPost[]; error?: string };

      if (!response.ok || !data.ok || !data.posts) {
        throw new Error(data.error || "Failed to fetch from Reddit API.");
      }

      // Filter out posts that already exist in our queue
      const existingIds = new Set(posts.map((post) => post.id));
      const newPosts = data.posts.filter((post) => !existingIds.has(post.id));

      if (newPosts.length === 0) {
         setRedditMessage("No new posts found for that query.");
         return;
      }

      const batchId = `reddit-search-${Date.now()}`;
      const importedReviewPosts = newPosts.map((post) =>
        createReviewPostFromPost(post, batchId)
      );

      setPosts((currentPosts) => [...currentPosts, ...importedReviewPosts]);
      setSelectedId(importedReviewPosts[0]?.id ?? selectedId);
      setRedditMessage(`Imported ${importedReviewPosts.length} new posts.`);
    } catch (error) {
      setRedditMessage((error as Error).message);
    } finally {
      setIsRedditSearching(false);
    }
  }

  function downloadTextFile(content: string, filename: string, mimeType: string) {
    if (typeof document === "undefined") {
      return;
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCsvExport(exportPosts: ReviewPost[], scope: "all" | "visible") {
    downloadTextFile(convertPostsToCsv(exportPosts), createCsvFilename(`redditbot-${scope}`), "text/csv");
    setImportMessage(`Exported ${exportPosts.length} ${scope === "visible" ? "visible" : "total"} posts to CSV.`);
  }

  function downloadReportOutput(kind: ReportKind, exportPosts: ReviewPost[], scope: "all" | "visible") {
    const generatedAt = new Date();
    const contentByKind: Record<ReportKind, string> = {
      json: convertPostsToJsonReport(exportPosts, generatedAt),
      evidence: convertPostsToEvidencePacket(exportPosts, generatedAt),
      summary: convertPostsToSummaryReport(exportPosts, generatedAt)
    };
    const mimeByKind: Record<ReportKind, string> = {
      json: "application/json",
      evidence: "text/markdown",
      summary: "text/markdown"
    };

    const filename = createReportFilename(`${scope}-${kind}`, generatedAt);
    downloadTextFile(contentByKind[kind], filename, mimeByKind[kind]);
    setImportMessage(
      `Exported ${exportPosts.length} ${scope === "visible" ? "visible" : "total"} posts as ${kind} report.`
    );
  }

  async function analyzeWithAI() {
    if (!selectedPost || !llmEnabled) {
      setAiMessage("OpenRouter AI is not enabled. Set LLM_ENABLED=true and OPENROUTER_API_KEY, then restart the server.");
      return;
    }

    setIsAiProcessing(true);
    setAiMessage("");

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: selectedPost })
      });
      const data = (await response.json()) as {
        ok: boolean;
        classification?: ClassificationResult;
        draft?: string;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.classification || !data.draft) {
        throw new Error(data.error || "AI analysis failed.");
      }

      updateSelectedPost((post) =>
        applyReviewAction({
          post: {
            ...post,
            classification: data.classification as ClassificationResult
          },
          action: "edit_draft",
          draftReply: data.draft,
          actor: "openrouter-ai",
          note: "OpenRouter analysis generated classification and draft. Human review is still required."
        })
      );
      setAiMessage("OpenRouter analysis complete. Draft, risk flags, and compliance were refreshed.");
    } catch (error) {
      setAiMessage((error as Error).message);
    } finally {
      setIsAiProcessing(false);
    }
  }

  function copyApprovedDraft() {
    if (!selectedPost || selectedPost.status !== "approved" || typeof navigator === "undefined") {
      return;
    }

    void navigator.clipboard.writeText(selectedPost.draftReply);
  }

  const subredditRows = Object.entries(analytics.postsBySubreddit)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
  const riskRows: Array<{ label: string; value: number }> = (["low", "medium", "high"] as RiskLevel[]).map(
    (risk) => ({ label: riskLabels[risk], value: analytics.riskCounts[risk] ?? 0 })
  );
  const statusRows = (Object.keys(statusLabels) as ReviewStatus[]).map((status) => ({
    label: statusLabels[status],
    value: analytics.statusCounts[status] ?? 0
  }));
  const painPointRows = analytics.topPainPoints.map(([label, value]) => ({ label, value }));
  const objectionRows = analytics.topObjections.map(([label, value]) => ({ label, value }));

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-900 bg-night text-white shadow-tight">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-teal-300">
              {dashboardMode === "agent_company" ? "AI agent company console" : "Internal review console"}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              {dashboardMode === "agent_company" ? "AI Content Company OS" : "Operation Empathy"}
            </h1>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="inline-flex rounded-md border border-white/20 bg-white/5 p-1">
              <button
                className={`min-h-9 rounded px-3 text-xs font-bold uppercase ${
                  dashboardMode === "agent_company" ? "bg-white text-night" : "text-slate-200 hover:bg-white/10"
                }`}
                onClick={() => setDashboardMode("agent_company")}
              >
                Agent Company
              </button>
              <button
                className={`min-h-9 rounded px-3 text-xs font-bold uppercase ${
                  dashboardMode === "reddit_review" ? "bg-white text-night" : "text-slate-200 hover:bg-white/10"
                }`}
                onClick={() => setDashboardMode("reddit_review")}
              >
                Reddit Review
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase">
              {dashboardMode === "agent_company" ? (
                <>
                  <span className="rounded border border-teal-300/40 bg-teal-300/10 px-2.5 py-1 text-teal-100">
                    1 video / day
                  </span>
                  <span className="rounded border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-amber-100">
                    Human approval required
                  </span>
                  <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">
                    Pixel Agents monitor
                  </span>
                  <span className="rounded border border-rose-300/40 bg-rose-300/10 px-2.5 py-1 text-rose-100">
                    No auto-posting by default
                  </span>
                </>
              ) : (
                <>
                  <span className="rounded border border-teal-300/40 bg-teal-300/10 px-2.5 py-1 text-teal-100">
                    Import only
                  </span>
                  <span className="rounded border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-amber-100">
                    Human approval required
                  </span>
                  <span className="rounded border border-rose-300/40 bg-rose-300/10 px-2.5 py-1 text-rose-100">
                    No posting / DM
                  </span>
                  <span className="rounded border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">
                    {persistenceMode === "server" ? "Server persistence" : "Browser local state"}
                  </span>
                  {saveError ? (
                    <span className="rounded border border-red-300/40 bg-red-300/10 px-2.5 py-1 text-red-100">
                      Save needs retry
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {dashboardMode === "agent_company" ? (
        <AgentCompanyDashboard />
      ) : (
      <div className="mx-auto max-w-7xl px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <MetricCard label="Posts" value={posts.length} />
          <MetricCard label="High fit" value={highRelevance} detail="7+" tone="teal" />
          <MetricCard label="Buying signal" value={highBuyingSignals} detail="review" tone="violet" />
          <MetricCard label="Needs review" value={needingReview} tone="amber" />
          <MetricCard label="High risk" value={highRisk} tone="rose" />
          <MetricCard label="Approved" value={approved} tone="teal" />
          <MetricCard label="Rejected" value={rejected} />
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-line bg-white p-3 shadow-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink">Manual Import</h2>
                <p className="text-xs text-steel">
                  CSV/JSON public examples, including Reddit Listing JSON. Required: id, title, body.
                </p>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-night px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
                Import CSV/JSON
                <input
                  className="sr-only"
                  type="file"
                  accept=".csv,.json,application/json,text/csv"
                  onChange={(event) => {
                    void importFile(event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {importMessage ? <p className="mt-2 text-xs font-medium text-steel" aria-live="polite">{importMessage}</p> : null}
            {saveError ? <p className="mt-2 text-xs font-bold text-danger" aria-live="polite">{saveError}</p> : null}
          </section>

          <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 shadow-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-sm font-bold text-cyan-950">Report Outputs</h2>
                <p className="text-xs text-cyan-800">
                  Export CSV, JSON, evidence packets, and summary reports for read-only review.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-cyan-800 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-900 disabled:opacity-50"
                  onClick={() => downloadCsvExport(posts, "all")}
                  disabled={posts.length === 0}
                >
                  CSV all
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-700 bg-white px-3 py-2 text-sm font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-50"
                  onClick={() => downloadCsvExport(filteredPosts, "visible")}
                  disabled={filteredPosts.length === 0}
                >
                  CSV visible
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-700 bg-white px-3 py-2 text-sm font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-50"
                  onClick={() => downloadReportOutput("json", posts, "all")}
                  disabled={posts.length === 0}
                >
                  JSON all
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-700 bg-white px-3 py-2 text-sm font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-50"
                  onClick={() => downloadReportOutput("json", filteredPosts, "visible")}
                  disabled={filteredPosts.length === 0}
                >
                  JSON visible
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-700 bg-white px-3 py-2 text-sm font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-50"
                  onClick={() => downloadReportOutput("evidence", filteredPosts, "visible")}
                  disabled={filteredPosts.length === 0}
                >
                  Evidence packet
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-cyan-700 bg-white px-3 py-2 text-sm font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-50"
                  onClick={() => downloadReportOutput("summary", posts, "all")}
                  disabled={posts.length === 0}
                >
                  Summary report
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-violet-200 bg-violet-50 p-3 shadow-panel lg:col-span-2">
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">
              <div>
                <label className="text-[11px] font-bold uppercase text-violet-900">
                  Source tool
                  <select
                    className="mt-1 h-11 w-full rounded-md border border-violet-200 bg-white px-3 text-sm normal-case text-ink outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                    value={sourceConnectorKind}
                    onChange={(event) => setSourceConnectorKind(event.target.value as SourceConnectorKind)}
                  >
                    {(Object.keys(SOURCE_CONNECTOR_LABELS) as SourceConnectorKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {SOURCE_CONNECTOR_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <h2 className="text-sm font-bold text-violet-950">Multi-Platform Source Intake</h2>
                <p className="mb-2 text-xs text-violet-800">
                  Paste public-source JSON from manual URLs, RSS, open web, reputation scanners, deep-web public pages, or allowlisted onion evidence. Read-only only: no login, forms, DMs, outreach, or transactions.
                </p>
                <textarea
                  className="h-24 w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-xs text-ink outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                  placeholder='{"title":"Public source item","body":"Evidence text only.","url":"https://example.com/item","keyword":"risk signal"}'
                  value={sourceConnectorText}
                  onChange={(event) => setSourceConnectorText(event.target.value)}
                />
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-violet-800 px-4 py-2 text-sm font-bold text-white hover:bg-violet-900 disabled:opacity-50"
                onClick={importSourceConnectorText}
                disabled={!sourceConnectorText.trim()}
              >
                Import source
              </button>
            </div>
            {sourceConnectorMessage ? (
              <p className="mt-2 text-xs font-medium text-violet-900" aria-live="polite">
                {sourceConnectorMessage}
              </p>
            ) : null}
          </section>

          {redditReadOnlyEnabled && (
            <section className="rounded-lg border border-teal-200 bg-teal-50 p-3 shadow-panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-teal-900">Live Reddit Search (Read-Only)</h2>
                  <p className="text-xs text-teal-700">Fetch recent posts by keyword or subreddit.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. skin irritation"
                    className="h-11 rounded-md border border-teal-200 bg-white px-3 text-sm text-ink outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    value={redditSearchQuery}
                    onChange={(e) => setRedditSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void searchReddit(redditSearchQuery);
                    }}
                  />
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                    onClick={() => void searchReddit(redditSearchQuery)}
                    disabled={isRedditSearching || !redditSearchQuery}
                  >
                    {isRedditSearching ? "Searching..." : "Search"}
                  </button>
                </div>
              </div>
              {redditMessage ? <p className="mt-2 text-xs font-medium text-teal-800" aria-live="polite">{redditMessage}</p> : null}
            </section>
          )}
        </div>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(400px,0.92fr)]">
          <div className="min-w-0">
            <div className="rounded-lg border border-line bg-white shadow-panel">
              <div className="flex flex-col gap-3 border-b border-line p-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase text-ink">Review Queue</h2>
                  <p className="text-xs text-steel">{filteredPosts.length} visible / {posts.length} total</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-[11px] font-bold uppercase text-steel">
                    Status
                    <select
                      className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as "all" | ReviewStatus)}
                    >
                      <option value="all">All</option>
                      {(Object.keys(statusLabels) as ReviewStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-bold uppercase text-steel">
                    Risk
                    <select
                      className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                      value={riskFilter}
                      onChange={(event) => setRiskFilter(event.target.value as "all" | RiskLevel)}
                    >
                      <option value="all">All</option>
                      {(Object.keys(riskLabels) as RiskLevel[]).map((risk) => (
                        <option key={risk} value={risk}>
                          {riskLabels[risk]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-bold uppercase text-steel">
                    Subreddit
                    <select
                      className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                      value={subredditFilter}
                      onChange={(event) => setSubredditFilter(event.target.value)}
                    >
                      <option value="all">All</option>
                      {subreddits.map((subreddit) => (
                        <option key={subreddit} value={subreddit}>
                          {subreddit}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-bold uppercase text-steel">
                    Min score
                    <input
                      className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                      type="number"
                      min={0}
                      max={10}
                      value={minRelevance}
                      onChange={(event) => setMinRelevance(Number(event.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="overflow-hidden">
                <div className="max-h-[610px] overflow-auto">
                  <table className="w-full min-w-[1060px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase text-steel">
                      <tr>
                        <th className="px-3 py-2 font-bold">Subreddit</th>
                        <th className="px-3 py-2 font-bold">Post</th>
                        <th className="px-3 py-2 font-bold">Keyword</th>
                        <th className="px-3 py-2 font-bold">Fit</th>
                        <th className="px-3 py-2 font-bold">Buy</th>
                        <th className="px-3 py-2 font-bold">Medical</th>
                        <th className="px-3 py-2 font-bold">Promo</th>
                        <th className="px-3 py-2 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-white">
                      {filteredPosts.map((post) => (
                        <tr
                          key={post.id}
                          className={`cursor-pointer transition hover:bg-teal-50 ${
                            selectedPost?.id === post.id ? "bg-teal-50" : ""
                          }`}
                          onClick={() => {
                            setSelectedId(post.id);
                            setIsEditing(false);
                          }}
                        >
                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-ink">
                            {post.subreddit}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold leading-5 text-ink">{post.title}</div>
                            <div className="line-clamp-1 max-w-xl text-xs leading-5 text-steel">
                              {post.excerpt}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-steel">
                            {post.matchedKeyword}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-ink">
                              {post.classification.relevance_score}/10
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-ink">
                              {post.classification.buying_signal_score}/10
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              label={riskLabels[post.classification.medical_risk]}
                              className={riskStyles[post.classification.medical_risk]}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              label={riskLabels[post.classification.promotion_risk]}
                              className={riskStyles[post.classification.promotion_risk]}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Badge label={statusLabels[post.status]} className={statusStyles[post.status]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {filteredPosts.length === 0 ? (
                <div className="py-8 text-center text-sm text-steel">No posts match the current filters.</div>
              ) : null}
            </div>
          </div>

          {selectedPost ? (
            <aside className="min-w-0 rounded-lg border border-line bg-white p-4 shadow-panel">
              <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-signal">Review Detail</p>
                  <h2 className="mt-1 text-lg font-bold leading-6 text-ink">{selectedPost.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge label={selectedPost.subreddit} className="border-slate-200 bg-slate-50 text-slate-700" />
                    <Badge
                      label={`Status: ${statusLabels[selectedPost.status]}`}
                      className={statusStyles[selectedPost.status]}
                    />
                    <Badge
                      label={`Resource: ${resourceLabels[selectedPost.resourceStatus]}`}
                      className="border-cyan-200 bg-cyan-50 text-cyan-800"
                    />
                    <Badge
                      label={`Overall risk: ${riskLabels[getOverallRisk(selectedPost)]}`}
                      className={riskStyles[getOverallRisk(selectedPost)]}
                    />
                  </div>
                </div>
                <div className="text-left text-xs text-steel sm:text-right">
                  <div>Matched keyword</div>
                  <div className="font-semibold text-ink">{selectedPost.matchedKeyword}</div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <section className="rounded-lg border border-line bg-panel p-3 lg:col-span-2">
                  <h3 className="text-xs font-bold uppercase text-steel">Original Post</h3>
                  <p className="mt-2 max-h-72 overflow-auto whitespace-pre-line text-sm leading-6 text-ink">
                    {selectedPost.body}
                  </p>
                </section>

                <section className="rounded-lg border border-line bg-white p-3">
                  <h3 className="text-xs font-bold uppercase text-steel">Signal Snapshot</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded border border-line bg-panel px-3 py-2">
                        <dt className="text-[11px] font-bold uppercase text-steel">Fit</dt>
                        <dd className="mt-0.5 text-lg font-bold text-ink">
                          {selectedPost.classification.relevance_score}/10
                        </dd>
                      </div>
                      <div className="rounded border border-line bg-panel px-3 py-2">
                        <dt className="text-[11px] font-bold uppercase text-steel">Helpful</dt>
                        <dd className="mt-0.5 text-lg font-bold text-ink">
                          {selectedPost.classification.helpfulness_opportunity}/10
                        </dd>
                      </div>
                      <div className="rounded border border-line bg-panel px-3 py-2">
                        <dt className="text-[11px] font-bold uppercase text-steel">Buying</dt>
                        <dd className="mt-0.5 text-lg font-bold text-ink">
                          {selectedPost.classification.buying_signal_score}/10
                        </dd>
                      </div>
                      <div className="rounded border border-line bg-panel px-3 py-2">
                        <dt className="text-[11px] font-bold uppercase text-steel">Intent</dt>
                        <dd className="mt-0.5 text-xs font-semibold text-ink">
                          {selectedPost.classification.intent_category.replaceAll("_", " ")}
                        </dd>
                      </div>
                    <div className="col-span-2 flex flex-wrap gap-2 pt-1">
                      <Badge
                        label={`Medical: ${riskLabels[selectedPost.classification.medical_risk]}`}
                        className={riskStyles[selectedPost.classification.medical_risk]}
                      />
                      <Badge
                        label={`Promotion: ${riskLabels[selectedPost.classification.promotion_risk]}`}
                        className={riskStyles[selectedPost.classification.promotion_risk]}
                      />
                      <Badge
                        label={`Should reply: ${selectedPost.classification.should_reply.toUpperCase()}`}
                        className={
                          selectedPost.classification.should_reply === "yes"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                        }
                      />
                    </div>
                  </dl>
                </section>
              </div>

              <section className="mt-3 rounded-lg border border-line bg-white">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <h3 className="text-xs font-bold uppercase text-steel">Draft Reply</h3>
                  <span className="text-[11px] font-medium text-steel">Human review required</span>
                </div>
                <div className="p-3">
                  {isEditing ? (
                    <textarea
                      className="min-h-[180px] w-full resize-y rounded border border-line bg-white p-3 text-sm leading-6 text-ink"
                      value={selectedPost.draftReply}
                      onChange={(event) => updateDraft(event.target.value)}
                    />
                  ) : (
                    <div className="max-h-52 overflow-auto whitespace-pre-line rounded border border-line bg-panel p-3 text-sm leading-6 text-ink">
                      {selectedPost.draftReply}
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-3 rounded-lg border border-line bg-panel p-3">
                <h3 className="text-xs font-bold uppercase text-steel">Compliance</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    label={selectedPost.compliance.pass ? "Compliance: Pass" : "Compliance: Fail"}
                    className={
                      selectedPost.compliance.pass
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-rose-200 bg-rose-50 text-rose-800"
                    }
                  />
                  <Badge
                    label={`Spam risk: ${riskLabels[selectedPost.compliance.spam_risk]}`}
                    className={riskStyles[selectedPost.compliance.spam_risk]}
                  />
                  <Badge
                    label={`Promotion risk: ${riskLabels[selectedPost.compliance.promotion_risk]}`}
                    className={riskStyles[selectedPost.compliance.promotion_risk]}
                  />
                  <Badge
                    label={`Health claim risk: ${riskLabels[selectedPost.compliance.health_claim_risk]}`}
                    className={riskStyles[selectedPost.compliance.health_claim_risk]}
                  />
                  <Badge
                    label={`Hidden ad risk: ${riskLabels[selectedPost.compliance.hidden_advertising_risk]}`}
                    className={riskStyles[selectedPost.compliance.hidden_advertising_risk]}
                  />
                  <Badge
                    label={`Repetition risk: ${riskLabels[selectedPost.compliance.repetitive_wording_risk]}`}
                    className={riskStyles[selectedPost.compliance.repetitive_wording_risk]}
                  />
                  {selectedPost.compliance.disclosure_needed ? (
                    <Badge
                      label="Disclosure review needed"
                      className="border-amber-200 bg-amber-50 text-caution"
                    />
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-steel sm:grid-cols-2">
                  <div className="rounded border border-line bg-white p-3">
                    <div className="font-bold uppercase text-ink">Issues</div>
                    {selectedPost.compliance.issues.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {selectedPost.compliance.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 font-medium text-signal">Clear</p>
                    )}
                  </div>
                  <div className="rounded border border-line bg-white p-3">
                    <div className="font-bold uppercase text-ink">Red flags</div>
                    {selectedPost.classification.red_flags_detected.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {selectedPost.classification.red_flags_detected.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 font-medium text-signal">Clear</p>
                    )}
                  </div>
                </div>
              </section>

              {approvalBlockers.length > 0 ? (
                <section className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="font-bold uppercase">Approval blocked</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 leading-5">
                    {approvalBlockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="mt-3 rounded-lg border border-line bg-white p-3">
                <label className="text-[11px] font-bold uppercase text-steel">
                  Resource status
                  <select
                    className="mt-1 h-9 w-full rounded border border-line bg-white px-2 text-sm normal-case text-ink"
                    value={selectedPost.resourceStatus}
                    onChange={(event) => updateResourceStatus(event.target.value as ResourceStatus)}
                  >
                    {(Object.keys(resourceLabels) as ResourceStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {resourceLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  className="min-h-11 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  onClick={analyzeWithAI}
                  disabled={isAiProcessing || !llmEnabled}
                >
                  {isAiProcessing ? "Analyzing..." : "Analyze"}
                </button>
                {!llmEnabled ? (
                  <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                    OpenRouter disabled. Set LLM_ENABLED=true and OPENROUTER_API_KEY, then restart the server.
                  </p>
                ) : null}
                {aiMessage ? (
                  <p className="rounded border border-line bg-panel px-3 py-2 text-xs font-medium text-steel sm:col-span-2">
                    {aiMessage}
                  </p>
                ) : null}
                <button
                  className="min-h-11 rounded-md bg-signal px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={approvalBlockers.length > 0}
                  onClick={() => setStatus("approved")}
                >
                  Approve
                </button>
                <button
                  className="min-h-11 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-panel"
                  onClick={() => setIsEditing((current) => !current)}
                >
                  {isEditing ? "Close Editor" : "Edit Draft"}
                </button>
                <button
                  className="min-h-11 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-panel"
                  onClick={() => setStatus("rejected")}
                >
                  Reject
                </button>
                <button
                  className="min-h-11 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100"
                  onClick={() => setStatus("needs_compliance_review")}
                >
                  Needs Compliance Review
                </button>
                <button
                  className="min-h-11 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-900 hover:bg-violet-100"
                  onClick={() => setStatus("needs_marketing_review")}
                >
                  Needs Marketing Review
                </button>
                <button
                  className="min-h-11 rounded-md bg-danger px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-800"
                  onClick={() => setStatus("do_not_engage")}
                >
                  Do Not Engage
                </button>
                <button
                  className="min-h-11 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:bg-panel disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  disabled={selectedPost.status !== "approved"}
                  onClick={copyApprovedDraft}
                >
                  Copy Approved Draft
                </button>
              </div>

              {selectedPost.auditEvents.length > 0 ? (
                <section className="mt-3 rounded-lg border border-line bg-panel p-3">
                  <h3 className="text-xs font-bold uppercase text-steel">Audit log</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-steel">
                    {selectedPost.auditEvents.slice(-5).map((event) => (
                      <li key={event.id}>
                        <span className="font-semibold text-ink">{event.action}</span> by {event.actor}
                        {event.toStatus ? ` -> ${statusLabels[event.toStatus]}` : ""} at{" "}
                        {formatUtcDateTime(event.createdAt)}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          ) : null}
        </section>

        <section className="mt-5">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase text-ink">Analytics</h2>
            </div>
            <div className="rounded border border-line bg-white px-3 py-2 text-xs text-steel shadow-tight">
              Avg relevance{" "}
              <span className="font-semibold text-ink">{analytics.averageRelevance.toFixed(1)}/10</span>
              {" "} / Resource requests{" "}
              <span className="font-semibold text-ink">
                {analytics.resourceRequestOpportunityCount}
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ChartRows title="Posts by subreddit" rows={subredditRows} />
            <ChartRows title="Posts by risk level" rows={riskRows} tone="rose" />
            <ChartRows title="Review status count" rows={statusRows} tone="green" />
            <ChartRows title="Top pain points" rows={painPointRows} />
            <ChartRows title="Top risk signals" rows={objectionRows} tone="rose" />
          </div>
        </section>
      </div>
      )}
    </main>
  );
}
