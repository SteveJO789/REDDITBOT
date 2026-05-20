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
