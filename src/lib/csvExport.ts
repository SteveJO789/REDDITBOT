import type { ReviewPost } from "./types";

const csvHeaders = [
  "id",
  "subreddit",
  "author",
  "title",
  "excerpt",
  "body",
  "matchedKeyword",
  "createdAt",
  "url",
  "status",
  "resourceStatus",
  "relevanceScore",
  "buyingSignalScore",
  "medicalRisk",
  "promotionRisk",
  "shouldReply",
  "intentCategory",
  "redFlags",
  "aiSummary",
  "draftReply"
] as const;

function csvCell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/[",;\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function postToCsvRow(post: ReviewPost) {
  return [
    post.id,
    post.subreddit,
    post.author ?? "",
    post.title,
    post.excerpt,
    post.body,
    post.matchedKeyword,
    post.createdAt,
    post.url ?? "",
    post.status,
    post.resourceStatus,
    post.classification.relevance_score,
    post.classification.buying_signal_score,
    post.classification.medical_risk,
    post.classification.promotion_risk,
    post.classification.should_reply,
    post.classification.intent_category,
    post.classification.red_flags_detected.join("; "),
    post.classification.ai_summary,
    post.draftReply
  ];
}

export function convertPostsToCsv(posts: ReviewPost[]) {
  const rows = [csvHeaders, ...posts.map(postToCsvRow)];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function createCsvFilename(prefix = "operation-empathy-export", date = new Date()) {
  return `${prefix}-${date.toISOString().slice(0, 10)}.csv`;
}
