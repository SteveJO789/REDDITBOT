"use client";

import { useEffect, useMemo, useState } from "react";
import {
  checkCompliance,
  createInitialReviewPosts,
  createReviewPostFromPost,
  getOverallRisk
} from "@/lib/aiMock";
import { getAnalytics } from "@/lib/analytics";
import { validateManualImportText } from "@/lib/importValidation";
import { applyReviewAction, getApprovalBlockers } from "@/lib/reviewWorkflow";
import type {
  AuditEvent,
  MockPost,
  ResourceStatus,
  ReviewPost,
  ReviewStatus,
  RiskLevel
} from "@/lib/types";

const STORAGE_KEY = "operation-empathy-dashboard-v1";
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

type SavedPostOverride = {
  id: string;
  status: ReviewStatus;
  draftReply: string;
  resourceStatus?: ResourceStatus;
  auditEvents?: AuditEvent[];
};

type SavedDashboardState =
  | SavedPostOverride[]
  | {
      overrides: SavedPostOverride[];
      importedPosts?: MockPost[];
    };

function applySavedOverrides(posts: ReviewPost[], overrides: SavedPostOverride[]) {
  const savedById = new Map(overrides.map((post) => [post.id, post]));

  return posts.map((post) => {
    const savedPost = savedById.get(post.id);
    if (!savedPost) {
      return post;
    }

    return {
      ...post,
      status: savedPost.status,
      resourceStatus: savedPost.resourceStatus ?? post.resourceStatus,
      draftReply: savedPost.draftReply,
      compliance: checkCompliance(savedPost.draftReply),
      auditEvents: savedPost.auditEvents ?? post.auditEvents
    };
  });
}

function loadSavedPosts() {
  const initial = createInitialReviewPosts();

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return initial;
    }

    const savedState = JSON.parse(saved) as SavedDashboardState;
    const importedPosts = Array.isArray(savedState)
      ? []
      : (savedState.importedPosts ?? []).map((post) =>
          createReviewPostFromPost(post, post.id.startsWith("manual-") ? post.id : "local-import")
        );
    const overrides = Array.isArray(savedState) ? savedState : savedState.overrides;

    return applySavedOverrides([...initial, ...importedPosts], overrides);
  } catch {
    return initial;
  }
}

export default function Home() {
  const [posts, setPosts] = useState<ReviewPost[]>(() => createInitialReviewPosts());
  const [selectedId, setSelectedId] = useState(posts[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [subredditFilter, setSubredditFilter] = useState("all");
  const [minRelevance, setMinRelevance] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) {
        return;
      }

      const savedPosts = loadSavedPosts();
      setPosts(savedPosts);
      setSelectedId((currentId) =>
        savedPosts.some((post) => post.id === currentId) ? currentId : (savedPosts[0]?.id ?? "")
      );
      setHasLoadedSavedState(true);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedState) {
      return;
    }

    const initialIds = new Set(createInitialReviewPosts().map((post) => post.id));
    const savedPayload = {
      overrides: posts.map((post) => ({
        id: post.id,
        status: post.status,
        resourceStatus: post.resourceStatus,
        draftReply: post.draftReply,
        auditEvents: post.auditEvents
      })),
      importedPosts: posts
        .filter((post) => !initialIds.has(post.id))
        .map((post) => ({
          id: post.id,
          subreddit: post.subreddit,
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          matchedKeyword: post.matchedKeyword,
          createdAt: post.createdAt
      }))
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPayload));
  }, [hasLoadedSavedState, posts]);

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
    setImportMessage(`Imported ${importedReviewPosts.length} public/mock examples.`);
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
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-teal-300">Internal review console</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Operation Empathy</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase">
            <span className="rounded border border-teal-300/40 bg-teal-300/10 px-2.5 py-1 text-teal-100">
              Mock data only
            </span>
            <span className="rounded border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-amber-100">
              Human approval required
            </span>
            <span className="rounded border border-rose-300/40 bg-rose-300/10 px-2.5 py-1 text-rose-100">
              No posting / DM
            </span>
          </div>
        </div>
      </header>

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

        <section className="mt-5 rounded-lg border border-line bg-white p-3 shadow-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">Manual Import</h2>
              <p className="text-xs text-steel">CSV/JSON public examples. Required: id, title, body.</p>
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
        </section>

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
                <section className="rounded-lg border border-line bg-panel p-3">
                  <h3 className="text-xs font-bold uppercase text-steel">Original Post</h3>
                  <p className="mt-2 max-h-28 overflow-auto whitespace-pre-line text-sm leading-6 text-ink">
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
                        {new Date(event.createdAt).toLocaleString()}
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
    </main>
  );
}
