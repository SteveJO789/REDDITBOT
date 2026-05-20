import { describe, expect, it } from "vitest";
import {
  checkCompliance,
  classifyPost,
  createReviewPostFromPost,
  generateDraftReply
} from "../src/lib/aiMock";
import { validateManualImportRows, validateManualImportText } from "../src/lib/importValidation";
import { createSavedDashboardState, hydrateSavedPosts } from "../src/lib/persistenceState";
import { applyReviewAction, canApprove } from "../src/lib/reviewWorkflow";
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
    expect(result.buying_signal_score).toBeGreaterThanOrEqual(0);
    expect(result.intent_category).toBe("burnout");
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
    expect(compliance.promotion_risk).toBe("high");
    expect(compliance.health_claim_risk).toBe("high");
    expect(compliance.required_edits.length).toBeGreaterThan(0);
  });

  it("fails hidden advertising and direct-message language", () => {
    const compliance = checkCompliance(
      "Not sponsored, just a happy customer. DM me and I will send you the product."
    );

    expect(compliance.pass).toBe(false);
    expect(compliance.spam_risk).toBe("high");
    expect(compliance.hidden_advertising_risk).toBe("high");
  });
});

describe("manual import validation", () => {
  it("accepts public JSON examples with required fields", () => {
    const result = validateManualImportText(
      JSON.stringify([
        {
          id: "manual-001",
          subreddit: "r/WFH",
          title: "Any setup checklist for laptop neck pain?",
          body: "I am looking for practical setup ideas before buying equipment."
        }
      ]),
      { format: "json", existingIds: [] }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.posts[0].matchedKeyword).toBe("manual import");
    }
  });

  it("rejects duplicate ids", () => {
    const result = validateManualImportRows(
      [
        {
          id: "existing",
          title: "Private customer",
          body: "Email me at person@example.com with the shipping address."
        }
      ],
      { existingIds: ["existing"] }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/duplicate id/i);
    }
  });

  it("rejects private data in manual imports", () => {
    const result = validateManualImportRows([
      {
        id: "private-001",
        title: "Private customer",
        body: "Email me at person@example.com with the shipping address."
      }
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/private data/i);
    }
  });
});

describe("human review workflow", () => {
  it("blocks approval for high-risk medical posts and records audit", () => {
    const post = createReviewPostFromPost({
      ...basePost,
      id: "high-risk",
      title: "Worsening numbness and weakness",
      body: "My one-sided numbness is worsening and I have weakness."
    });

    expect(canApprove(post)).toBe(false);

    const updated = applyReviewAction({ post, action: "approve", actor: "tester" });

    expect(updated.status).toBe("needs_compliance_review");
    expect(updated.auditEvents.at(-1)?.action).toBe("approve");
  });
});

describe("dashboard persistence state", () => {
  it("hydrates saved status, draft edits, audit events, and imported posts", () => {
    const editedPost = applyReviewAction({
      post: createReviewPostFromPost(basePost),
      action: "edit_draft",
      actor: "tester",
      draftReply: "This clinically proven product will cure wrist pain. Use my link."
    });
    const importedPost: MockPost = {
      ...basePost,
      id: "manual-101",
      title: "Any setup checklist?",
      body: "Any setup checklist for a small desk?",
      matchedKeyword: "manual import"
    };
    const importedReviewPost = createReviewPostFromPost(importedPost, "manual-batch");
    const savedState = createSavedDashboardState([editedPost, importedReviewPost]);
    const hydrated = hydrateSavedPosts(savedState);
    const hydratedEditedPost = hydrated.find((post) => post.id === basePost.id);
    const hydratedImportedPost = hydrated.find((post) => post.id === "manual-101");

    expect(hydratedEditedPost?.status).toBe("drafted");
    expect(hydratedEditedPost?.compliance.pass).toBe(false);
    expect(hydratedEditedPost?.auditEvents.at(-1)?.actor).toBe("tester");
    expect(hydratedImportedPost?.importBatchId).toBe("manual-101");
  });
});
