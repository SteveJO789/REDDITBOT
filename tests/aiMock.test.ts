import { describe, expect, it } from "vitest";
import { checkCompliance, classifyPost, generateDraftReply } from "../src/lib/aiMock";
import type { MockPost } from "../src/lib/types";

const basePost: MockPost = {
  id: "test-post",
  subreddit: "r/WFH",
  title: "Work from home burnout and brain fog",
  excerpt: "I am exhausted and cannot focus after back to back calls.",
  body: "I am exhausted and cannot focus after back to back calls. I want practical free steps.",
  matchedKeyword: "burnout",
  createdAt: "2026-05-17"
};

describe("mock AI classification", () => {
  it("marks a relevant low-risk burnout post as reply-worthy", () => {
    const result = classifyPost(basePost);

    expect(result.relevance_score).toBeGreaterThanOrEqual(5);
    expect(result.medical_risk).toBe("low");
    expect(result.promotion_risk).toBe("low");
    expect(result.should_reply).toBe("yes");
  });

  it("detects high medical risk and blocks sales engagement", () => {
    const result = classifyPost({
      ...basePost,
      title: "Worsening numbness and weakness in one hand",
      body: "My numbness is worsening and I have one-sided numbness plus weakness."
    });

    expect(result.medical_risk).toBe("high");
    expect(result.should_reply).toBe("no");
    expect(result.red_flags_detected).toEqual(
      expect.arrayContaining(["weakness", "worsening numbness", "one-sided numbness"])
    );
  });
});

describe("mock draft generation and compliance", () => {
  it("generates a safe first public reply without promotional patterns", () => {
    const classification = classifyPost(basePost);
    const draft = generateDraftReply(basePost, classification);
    const compliance = checkCompliance(draft);

    expect(draft).toContain("I can share a checklist/resource if useful.");
    expect(draft).not.toMatch(/https?:\/\/|affiliate link|discount code|dm me/i);
    expect(compliance.pass).toBe(true);
  });

  it("fails drafts that include risky claims or affiliate language", () => {
    const compliance = checkCompliance(
      "This clinically proven product will cure wrist pain. Use my link for a discount code."
    );

    expect(compliance.pass).toBe(false);
    expect(compliance.spam_risk).toBe("medium");
    expect(compliance.health_claim_risk).toBe("high");
    expect(compliance.required_edits.length).toBeGreaterThan(0);
  });
});
