import { describe, expect, it } from "vitest";
import {
  convertPostsToEvidencePacket,
  convertPostsToJsonReport,
  convertPostsToSummaryReport,
  createReportFilename
} from "../src/lib/reportExports";
import type { ReviewPost } from "../src/lib/types";

const generatedAt = new Date("2026-05-22T15:00:00.000Z");

const basePost: ReviewPost = {
  id: "abc123",
  author: "sample_author",
  subreddit: "ClaudeCode",
  title: "Need help with Claude Code workflows",
  excerpt: "I need a safer workflow for reviewing generated code.",
  body: "I need a safer workflow for reviewing generated code before shipping it.",
  content: "I need a safer workflow for reviewing generated code before shipping it.",
  matchedKeyword: "ClaudeCode",
  createdAt: "2026-05-22T14:54:18.000Z",
  url: "https://www.reddit.com/r/ClaudeCode/comments/abc123/example/",
  status: "needs_compliance_review",
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
    pass: false,
    spam_risk: "low",
    promotion_risk: "medium",
    health_claim_risk: "low",
    hidden_advertising_risk: "low",
    repetitive_wording_risk: "low",
    disclosure_needed: true,
    issues: ["Disclosure needed"],
    required_edits: ["Remove promotional language"]
  },
  auditEvents: [
    {
      id: "audit-1",
      postId: "abc123",
      action: "read_only_import",
      actor: "Hermes Agent",
      toStatus: "new",
      createdAt: "2026-05-22T14:55:00.000Z",
      note: "Fetched read-only"
    }
  ]
};

const approvedPost: ReviewPost = {
  ...basePost,
  id: "def456",
  title: "Approved workflow tip",
  status: "approved",
  classification: {
    ...basePost.classification,
    relevance_score: 5,
    buying_signal_score: 1,
    medical_risk: "high",
    promotion_risk: "low",
    red_flags_detected: ["needs human review"]
  },
  compliance: {
    ...basePost.compliance,
    pass: true,
    issues: [],
    required_edits: []
  },
  auditEvents: []
};

describe("report exports", () => {
  it("creates a JSON report with metadata and review posts", () => {
    const report = JSON.parse(convertPostsToJsonReport([basePost], generatedAt));

    expect(report.metadata).toEqual({
      generatedAt: "2026-05-22T15:00:00.000Z",
      postCount: 1,
      safetyMode: "read-only reporting; no outreach actions"
    });
    expect(report.posts[0].id).toBe("abc123");
    expect(report.posts[0].classification.red_flags_detected).toEqual([
      "needs human review",
      "avoid promotion"
    ]);
  });

  it("creates a markdown evidence packet with source links, classifications, and audit trail", () => {
    const packet = convertPostsToEvidencePacket([basePost], generatedAt);

    expect(packet).toContain("# redditbot Evidence Packet");
    expect(packet).toContain("Generated: 2026-05-22T15:00:00.000Z");
    expect(packet).toContain("Safety mode: read-only evidence preservation; no outreach actions.");
    expect(packet).toContain("## Evidence 1: Need help with Claude Code workflows");
    expect(packet).toContain("- Source: https://www.reddit.com/r/ClaudeCode/comments/abc123/example/");
    expect(packet).toContain("- Red flags: needs human review; avoid promotion");
    expect(packet).toContain("- 2026-05-22T14:55:00.000Z — read_only_import by Hermes Agent: Fetched read-only");
  });

  it("creates a markdown summary report with counts and top risk signals", () => {
    const summary = convertPostsToSummaryReport([basePost, approvedPost], generatedAt);

    expect(summary).toContain("# redditbot Summary Report");
    expect(summary).toContain("- Total items: 2");
    expect(summary).toContain("- High risk items: 1");
    expect(summary).toContain("- Needs review items: 1");
    expect(summary).toContain("- approved: 1");
    expect(summary).toContain("- needs_compliance_review: 1");
    expect(summary).toContain("- needs human review: 2");
    expect(summary).toContain("- avoid promotion: 1");
  });

  it("creates dated filenames for each report type", () => {
    expect(createReportFilename("summary", generatedAt)).toBe("redditbot-summary-2026-05-22.md");
    expect(createReportFilename("evidence", generatedAt)).toBe("redditbot-evidence-2026-05-22.md");
    expect(createReportFilename("json", generatedAt)).toBe("redditbot-json-2026-05-22.json");
  });
});
