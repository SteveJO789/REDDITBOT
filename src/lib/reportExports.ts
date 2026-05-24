import type { ReviewPost, ReviewStatus, RiskLevel } from "./types";

export type ReportKind = "json" | "evidence" | "summary";
export type ReportFilenameKind = ReportKind | `${"all" | "visible"}-${ReportKind}`;

const needsReviewStatuses = new Set<ReviewStatus>([
  "new",
  "drafted",
  "needs_compliance_review",
  "needs_marketing_review"
]);

function formatList(values: string[]) {
  return values.length > 0 ? values.join("; ") : "none";
}

function riskRank(risk: RiskLevel) {
  return risk === "high" ? 3 : risk === "medium" ? 2 : 1;
}

function overallRisk(post: ReviewPost): RiskLevel {
  const risks: RiskLevel[] = [
    post.classification.medical_risk,
    post.classification.promotion_risk,
    post.compliance.spam_risk,
    post.compliance.promotion_risk,
    post.compliance.health_claim_risk,
    post.compliance.hidden_advertising_risk,
    post.compliance.repetitive_wording_risk
  ];

  return risks.reduce<RiskLevel>((highest, risk) => (riskRank(risk) > riskRank(highest) ? risk : highest), "low");
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<T, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

function sortedEntries(counts: Record<string, number>) {
  return Object.entries(counts).sort(([, a], [, b]) => b - a);
}

function bulletCounts(counts: Record<string, number>) {
  const entries = sortedEntries(counts);
  return entries.length > 0 ? entries.map(([label, count]) => `- ${label}: ${count}`).join("\n") : "- none: 0";
}

function postLine(post: ReviewPost, index: number) {
  return [
    `## Evidence ${index + 1}: ${post.title}`,
    "",
    `- ID: ${post.id}`,
    `- Source: ${post.url ?? "not provided"}`,
    `- Platform/channel: r/${post.subreddit}`,
    `- Author alias: ${post.author ?? "unknown"}`,
    `- Created: ${post.createdAt}`,
    `- Matched keyword: ${post.matchedKeyword}`,
    `- Review status: ${post.status}`,
    `- Resource status: ${post.resourceStatus}`,
    `- Overall risk: ${overallRisk(post)}`,
    `- Intent: ${post.classification.intent_category}`,
    `- Relevance score: ${post.classification.relevance_score}`,
    `- Buying signal score: ${post.classification.buying_signal_score}`,
    `- Red flags: ${formatList(post.classification.red_flags_detected)}`,
    `- Compliance pass: ${post.compliance.pass ? "yes" : "no"}`,
    `- Compliance issues: ${formatList(post.compliance.issues)}`,
    "",
    "### Source text",
    "",
    post.body || post.excerpt || "No source text captured.",
    "",
    "### AI / classification summary",
    "",
    post.classification.ai_summary || post.classification.reason,
    "",
    "### Audit trail",
    "",
    post.auditEvents.length > 0
      ? post.auditEvents
          .map((event) =>
            `- ${event.createdAt} — ${event.action} by ${event.actor}${event.note ? `: ${event.note}` : ""}`
          )
          .join("\n")
      : "- No audit events recorded."
  ].join("\n");
}

export function convertPostsToJsonReport(posts: ReviewPost[], generatedAt = new Date()) {
  return JSON.stringify(
    {
      metadata: {
        generatedAt: generatedAt.toISOString(),
        postCount: posts.length,
        safetyMode: "read-only reporting; no outreach actions"
      },
      posts
    },
    null,
    2
  );
}

export function convertPostsToEvidencePacket(posts: ReviewPost[], generatedAt = new Date()) {
  return [
    "# redditbot Evidence Packet",
    "",
    `Generated: ${generatedAt.toISOString()}`,
    "Safety mode: read-only evidence preservation; no outreach actions.",
    "",
    posts.length > 0 ? posts.map(postLine).join("\n\n---\n\n") : "No evidence items selected."
  ].join("\n");
}

export function convertPostsToSummaryReport(posts: ReviewPost[], generatedAt = new Date()) {
  const riskCounts = countBy(posts.map(overallRisk));
  const statusCounts = countBy(posts.map((post) => post.status));
  const subredditCounts = countBy(posts.map((post) => post.subreddit));
  const redFlagCounts = countBy(posts.flatMap((post) => post.classification.red_flags_detected));
  const highRiskItems = posts.filter((post) => overallRisk(post) === "high").length;
  const needsReviewItems = posts.filter((post) => needsReviewStatuses.has(post.status)).length;

  return [
    "# redditbot Summary Report",
    "",
    `Generated: ${generatedAt.toISOString()}`,
    "Safety mode: read-only reporting; no outreach actions.",
    "",
    "## Overview",
    "",
    `- Total items: ${posts.length}`,
    `- High risk items: ${highRiskItems}`,
    `- Needs review items: ${needsReviewItems}`,
    "",
    "## Status counts",
    "",
    bulletCounts(statusCounts),
    "",
    "## Risk counts",
    "",
    bulletCounts(riskCounts),
    "",
    "## Source counts",
    "",
    bulletCounts(subredditCounts),
    "",
    "## Top risk signals",
    "",
    bulletCounts(redFlagCounts)
  ].join("\n");
}

export function createReportFilename(kind: ReportFilenameKind, date = new Date()) {
  const extension = kind.endsWith("json") ? "json" : "md";
  return `redditbot-${kind}-${date.toISOString().slice(0, 10)}.${extension}`;
}
