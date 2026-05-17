"use client";

import { useEffect, useMemo, useState } from "react";
import { checkCompliance, createInitialReviewPosts, getOverallRisk } from "@/lib/aiMock";
import { getAnalytics } from "@/lib/analytics";
import type { ReviewPost, ReviewStatus, RiskLevel } from "@/lib/types";

const STORAGE_KEY = "operation-empathy-dashboard-v1";

const statusLabels: Record<ReviewStatus, string> = {
  new: "New",
  drafted: "Drafted",
  approved: "Approved",
  rejected: "Rejected",
  do_not_engage: "Do Not Engage"
};

const riskLabels: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

const riskStyles: Record<RiskLevel, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-rose-200 bg-rose-50 text-rose-800"
};

const statusStyles: Record<ReviewStatus, string> = {
  new: "border-slate-200 bg-slate-50 text-slate-700",
  drafted: "border-blue-200 bg-blue-50 text-blue-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-zinc-200 bg-zinc-100 text-zinc-700",
  do_not_engage: "border-rose-200 bg-rose-50 text-rose-800"
};

function Badge({
  label,
  className
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-steel">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-ink">{value}</div>
      {detail ? <div className="mt-1 text-xs text-steel">{detail}</div> : null}
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
    tone === "green" ? "bg-emerald-500" : tone === "rose" ? "bg-rose-500" : "bg-blue-600";

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[120px_1fr_32px] items-center gap-3 text-sm">
            <span className="truncate text-ink">{row.label}</span>
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

function loadSavedPosts() {
  const initial = createInitialReviewPosts();

  if (typeof window === "undefined") {
    return initial;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return initial;
    }

    const savedPosts = JSON.parse(saved) as Array<{
      id: string;
      status: ReviewStatus;
      draftReply: string;
    }>;
    const savedById = new Map(savedPosts.map((post) => [post.id, post]));

    return initial.map((post) => {
      const savedPost = savedById.get(post.id);
      if (!savedPost) {
        return post;
      }

      return {
        ...post,
        status: savedPost.status,
        draftReply: savedPost.draftReply,
        compliance: checkCompliance(savedPost.draftReply)
      };
    });
  } catch {
    return initial;
  }
}

export default function Home() {
  const [posts, setPosts] = useState<ReviewPost[]>(() => loadSavedPosts());
  const [selectedId, setSelectedId] = useState(posts[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("all");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [subredditFilter, setSubredditFilter] = useState("all");
  const [minRelevance, setMinRelevance] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const savedPayload = posts.map((post) => ({
      id: post.id,
      status: post.status,
      draftReply: post.draftReply
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPayload));
  }, [posts]);

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
  const needingReview = posts.filter((post) =>
    ["new", "drafted"].includes(post.status)
  ).length;
  const highRisk = posts.filter((post) => getOverallRisk(post) === "high").length;
  const approved = posts.filter((post) => post.status === "approved").length;
  const rejected = posts.filter((post) => post.status === "rejected").length;

  function updateSelectedPost(update: (post: ReviewPost) => ReviewPost) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === selectedPost.id ? update(post) : post))
    );
  }

  function setStatus(status: ReviewStatus) {
    updateSelectedPost((post) => ({ ...post, status }));
    setIsEditing(false);
  }

  function updateDraft(draftReply: string) {
    updateSelectedPost((post) => ({
      ...post,
      draftReply,
      status: post.status === "new" ? "drafted" : post.status,
      compliance: checkCompliance(draftReply)
    }));
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

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Internal mock-data prototype
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">Operation Empathy Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
              Demonstrates public conversation triage, risk detection, safe draft generation,
              and human approval without production data, posting, DMs, or external APIs.
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Every generated reply requires human review before use.
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <MetricCard label="Total mock posts found" value={posts.length} />
          <MetricCard label="High relevance posts" value={highRelevance} detail="Score 7 or higher" />
          <MetricCard label="Need human review" value={needingReview} detail="New or drafted" />
          <MetricCard label="High-risk posts" value={highRisk} detail="Medical or promotion" />
          <MetricCard label="Approved replies" value={approved} />
          <MetricCard label="Rejected replies" value={rejected} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <div className="min-w-0">
            <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Post Review Queue</h2>
                  <p className="mt-1 text-sm text-steel">
                    Filter mock posts, inspect risk signals, then open a post for review.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-steel">
                    Status
                    <select
                      className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm normal-case text-ink"
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
                  <label className="text-xs font-semibold uppercase tracking-wide text-steel">
                    Risk
                    <select
                      className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm normal-case text-ink"
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
                  <label className="text-xs font-semibold uppercase tracking-wide text-steel">
                    Subreddit
                    <select
                      className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm normal-case text-ink"
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
                  <label className="text-xs font-semibold uppercase tracking-wide text-steel">
                    Min score
                    <input
                      className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm normal-case text-ink"
                      type="number"
                      min={0}
                      max={10}
                      value={minRelevance}
                      onChange={(event) => setMinRelevance(Number(event.target.value))}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-line">
                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 bg-panel text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Subreddit</th>
                        <th className="px-4 py-3 font-semibold">Post</th>
                        <th className="px-4 py-3 font-semibold">Keyword</th>
                        <th className="px-4 py-3 font-semibold">Score</th>
                        <th className="px-4 py-3 font-semibold">Medical</th>
                        <th className="px-4 py-3 font-semibold">Promotion</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-white">
                      {filteredPosts.map((post) => (
                        <tr
                          key={post.id}
                          className={`cursor-pointer transition hover:bg-blue-50 ${
                            selectedPost?.id === post.id ? "bg-blue-50" : ""
                          }`}
                          onClick={() => {
                            setSelectedId(post.id);
                            setIsEditing(false);
                          }}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">
                            {post.subreddit}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink">{post.title}</div>
                            <div className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-steel">
                              {post.excerpt}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-steel">
                            {post.matchedKeyword}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-ink">
                              {post.classification.relevance_score}/10
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              label={riskLabels[post.classification.medical_risk]}
                              className={riskStyles[post.classification.medical_risk]}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              label={riskLabels[post.classification.promotion_risk]}
                              className={riskStyles[post.classification.promotion_risk]}
                            />
                          </td>
                          <td className="px-4 py-3">
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
            <aside className="min-w-0 rounded-lg border border-line bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Review detail
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">{selectedPost.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge label={selectedPost.subreddit} className="border-slate-200 bg-slate-50 text-slate-700" />
                    <Badge
                      label={`Status: ${statusLabels[selectedPost.status]}`}
                      className={statusStyles[selectedPost.status]}
                    />
                    <Badge
                      label={`Overall risk: ${riskLabels[getOverallRisk(selectedPost)]}`}
                      className={riskStyles[getOverallRisk(selectedPost)]}
                    />
                  </div>
                </div>
                <div className="text-left text-sm text-steel sm:text-right">
                  <div>Matched keyword</div>
                  <div className="font-semibold text-ink">{selectedPost.matchedKeyword}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-line bg-panel p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Original post</h3>
                  <p className="mt-3 text-base font-semibold text-ink">{selectedPost.title}</p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{selectedPost.body}</p>
                </section>

                <section className="rounded-lg border border-line bg-panel p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">AI analysis</h3>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div>
                      <dt className="font-semibold text-ink">Summary</dt>
                      <dd className="mt-1 leading-6 text-steel">{selectedPost.classification.ai_summary}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="font-semibold text-ink">Relevance</dt>
                        <dd className="mt-1 text-steel">
                          {selectedPost.classification.relevance_score}/10
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink">Helpfulness</dt>
                        <dd className="mt-1 text-steel">
                          {selectedPost.classification.helpfulness_opportunity}/10
                        </dd>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                    <div>
                      <dt className="font-semibold text-ink">Reason</dt>
                      <dd className="mt-1 leading-6 text-steel">{selectedPost.classification.reason}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-ink">Suggested response angle</dt>
                      <dd className="mt-1 leading-6 text-steel">
                        {selectedPost.classification.recommended_response_angle}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              <section className="mt-4 rounded-lg border border-line bg-white">
                <div className="border-b border-line px-4 py-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">
                    Draft public reply
                  </h3>
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <textarea
                      className="min-h-[220px] w-full resize-y rounded-md border border-line bg-white p-3 text-sm leading-6 text-ink"
                      value={selectedPost.draftReply}
                      onChange={(event) => updateDraft(event.target.value)}
                    />
                  ) : (
                    <div className="whitespace-pre-line rounded-md border border-line bg-panel p-3 text-sm leading-6 text-ink">
                      {selectedPost.draftReply}
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-4 rounded-lg border border-line bg-panel p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">
                  Compliance warnings
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
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
                    label={`Health claim risk: ${riskLabels[selectedPost.compliance.health_claim_risk]}`}
                    className={riskStyles[selectedPost.compliance.health_claim_risk]}
                  />
                  {selectedPost.compliance.disclosure_needed ? (
                    <Badge
                      label="Disclosure review needed"
                      className="border-amber-200 bg-amber-50 text-amber-800"
                    />
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 text-sm text-steel sm:grid-cols-2">
                  <div>
                    <div className="font-semibold text-ink">Issues</div>
                    {selectedPost.compliance.issues.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {selectedPost.compliance.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2">No blocked language detected.</p>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-ink">Red flags detected</div>
                    {selectedPost.classification.red_flags_detected.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {selectedPost.classification.red_flags_detected.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2">No high-risk red flags detected.</p>
                    )}
                  </div>
                </div>
              </section>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!selectedPost.compliance.pass || getOverallRisk(selectedPost) === "high"}
                  onClick={() => setStatus("approved")}
                >
                  Approve
                </button>
                <button
                  className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-panel"
                  onClick={() => setIsEditing((current) => !current)}
                >
                  {isEditing ? "Close Editor" : "Edit Draft"}
                </button>
                <button
                  className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-panel"
                  onClick={() => setStatus("rejected")}
                >
                  Reject
                </button>
                <button
                  className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
                  onClick={() => setStatus("do_not_engage")}
                >
                  Do Not Engage
                </button>
              </div>
            </aside>
          ) : null}
        </section>

        <section className="mt-6">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Analytics</h2>
              <p className="text-sm text-steel">
                Simple mock metrics for opportunity review and manager demo discussion.
              </p>
            </div>
            <div className="text-sm text-steel">
              Average relevance score:{" "}
              <span className="font-semibold text-ink">{analytics.averageRelevance.toFixed(1)}/10</span>
              {" "} | Resource request opportunities:{" "}
              <span className="font-semibold text-ink">
                {analytics.resourceRequestOpportunityCount}
              </span>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartRows title="Posts by subreddit" rows={subredditRows} />
            <ChartRows title="Posts by risk level" rows={riskRows} tone="rose" />
            <ChartRows title="Review status count" rows={statusRows} tone="green" />
          </div>
        </section>
      </div>
    </main>
  );
}
