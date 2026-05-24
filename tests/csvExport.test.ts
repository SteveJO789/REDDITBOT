import { describe, expect, it } from "vitest";
import { convertPostsToCsv } from "../src/lib/csvExport";
import type { ReviewPost } from "../src/lib/types";

const basePost: ReviewPost = {
  id: "abc123",
  author: "sample_author",
  subreddit: "ClaudeCode",
  title: "CSV export, with comma",
  excerpt: "Short excerpt",
  body: "Line one\nLine two with \"quotes\"",
  content: "Line one\nLine two with \"quotes\"",
  matchedKeyword: "ClaudeCode",
  createdAt: "2026-05-22T14:54:18.000Z",
  url: "https://www.reddit.com/r/ClaudeCode/comments/abc123/example/",
  status: "new",
  resourceStatus: "no_resource_offered",
  draftReply: "Draft reply text",
  classification: {
    intent_category: "asking_for_help",
    relevance_score: 8,
    helpfulness_opportunity: 7,
    buying_signal_score: 3,
    medical_risk: "low",
    promotion_risk: "medium",
    should_reply: "yes",
    reason: "Relevant Claude Code workflow question.",
    recommended_response_angle: "Offer a concise troubleshooting checklist.",
    red_flags_detected: ["needs human review", "avoid promotion"],
    ai_summary: "User asks for help with a Claude Code workflow."
  },
  compliance: {
    pass: true,
    spam_risk: "low",
    promotion_risk: "low",
    health_claim_risk: "low",
    hidden_advertising_risk: "low",
    repetitive_wording_risk: "low",
    disclosure_needed: false,
    issues: [],
    required_edits: []
  },
  auditEvents: []
};

describe("convertPostsToCsv", () => {
  it("exports review posts with stable headers and escaped values", () => {
    const csv = convertPostsToCsv([basePost]);

    expect(csv.split("\n")[0]).toBe(
      "id,subreddit,author,title,excerpt,body,matchedKeyword,createdAt,url,status,resourceStatus,relevanceScore,buyingSignalScore,medicalRisk,promotionRisk,shouldReply,intentCategory,redFlags,aiSummary,draftReply"
    );
    expect(csv).toContain('"CSV export, with comma"');
    expect(csv).toContain('"Line one\nLine two with ""quotes"""');
    expect(csv).toContain('"needs human review; avoid promotion"');
  });

  it("returns a header-only CSV when there are no posts", () => {
    const csv = convertPostsToCsv([]);

    expect(csv).toBe(
      "id,subreddit,author,title,excerpt,body,matchedKeyword,createdAt,url,status,resourceStatus,relevanceScore,buyingSignalScore,medicalRisk,promotionRisk,shouldReply,intentCategory,redFlags,aiSummary,draftReply"
    );
  });
});
