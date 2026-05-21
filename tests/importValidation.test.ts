import { describe, it, expect } from "vitest";
import { validateManualImportRows, validateManualImportText } from "../src/lib/importValidation";

describe("importValidation", () => {
  describe("validateManualImportRows", () => {
    it("should accept valid rows", () => {
      const rows = [
        { id: "1", title: "Valid title", body: "Valid body", subreddit: "test" }
      ];
      const result = validateManualImportRows(rows);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.posts).toHaveLength(1);
        expect(result.posts[0].id).toBe("1");
      }
    });

    it("should reject missing required fields", () => {
      const rows = [
        { id: "1", title: "Valid title" } // missing body
      ];
      const result = validateManualImportRows(rows);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toContain("missing required fields: body");
      }
    });

    it("should reject duplicates in the same batch", () => {
      const rows = [
        { id: "1", title: "T1", body: "B1" },
        { id: "1", title: "T2", body: "B2" }
      ];
      const result = validateManualImportRows(rows);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toContain("duplicate id: 1");
      }
    });

    it("should reject existing ids", () => {
      const rows = [
        { id: "1", title: "T1", body: "B1" }
      ];
      const result = validateManualImportRows(rows, { existingIds: ["1"] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toContain("duplicate id: 1");
      }
    });

    it("should detect private data", () => {
      const rows = [
        { id: "1", title: "T1", body: "My email is test@example.com" }
      ];
      const result = validateManualImportRows(rows);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toContain("private data: email address");
      }
    });

    it("should warn but still import rows with phone-like text", () => {
      const rows = [
        { id: "1", title: "T1", body: "Call 081-234-5678 if you need more context." }
      ];
      const result = validateManualImportRows(rows);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.posts).toHaveLength(1);
        expect(result.warnings.join(" ")).toContain("phone number");
      }
    });
  });

  describe("validateManualImportText", () => {
    it("should parse and validate CSV", () => {
      const csv = `id,title,body\n1,Test title,Test body`;
      const result = validateManualImportText(csv, { format: "csv" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.posts).toHaveLength(1);
        expect(result.posts[0].id).toBe("1");
      }
    });

    it("should parse and validate JSON", () => {
      const json = JSON.stringify([{ id: "1", title: "Test title", body: "Test body" }]);
      const result = validateManualImportText(json, { format: "json" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.posts).toHaveLength(1);
        expect(result.posts[0].id).toBe("1");
      }
    });

    it("should auto-detect and parse Reddit Listing JSON", () => {
      const redditListing = {
        kind: "Listing",
        data: {
          children: [
            {
              kind: "t3",
              data: {
                id: "abc123",
                author: "post_author",
                subreddit: "WFH",
                title: "Anyone have a setup checklist for neck pain?",
                selftext: "My neck hurts after laptop-only days.",
                permalink: "/r/WFH/comments/abc123/anyone_have_a_setup_checklist_for_neck_pain/",
                created_utc: 1710000000
              }
            },
            {
              kind: "t1",
              data: {
                id: "def456",
                author: "comment_author",
                subreddit: "WFH",
                body: "I changed my monitor height and it helped.",
                permalink: "/r/WFH/comments/abc123/comment/def456/",
                created_utc: 1710003600
              }
            }
          ]
        }
      };

      const result = validateManualImportText(JSON.stringify(redditListing), { format: "json" });
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.posts).toHaveLength(2);
        expect(result.posts[0]).toMatchObject({
          id: "abc123",
          author: "post_author",
          subreddit: "WFH",
          title: "Anyone have a setup checklist for neck pain?",
          body: "Anyone have a setup checklist for neck pain?\n\nMy neck hurts after laptop-only days.",
          url: "https://www.reddit.com/r/WFH/comments/abc123/anyone_have_a_setup_checklist_for_neck_pain/",
          createdAt: "2024-03-09T16:00:00.000Z"
        });
        expect(result.posts[1]).toMatchObject({
          id: "def456",
          author: "comment_author",
          subreddit: "WFH",
          title: "Comment by u/comment_author",
          body: "I changed my monitor height and it helped.",
          url: "https://www.reddit.com/r/WFH/comments/abc123/comment/def456/",
          createdAt: "2024-03-09T17:00:00.000Z"
        });
      }
    });

    it("should reject large files", () => {
      const text = "a".repeat(6 * 1024 * 1024);
      const result = validateManualImportText(text, { format: "csv" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]).toContain("too large");
      }
    });
  });
});
