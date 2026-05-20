import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createReviewStateStore } from "../server/review-state-store.mjs";
import { rm, mkdir } from "node:fs/promises";
import path from "node:path";

describe("ReviewStateStore (File Mode)", () => {
  const testDataDir = path.join(process.cwd(), ".data-test");

  beforeEach(async () => {
    process.env.PERSISTENCE_DATA_DIR = testDataDir;
    process.env.DATABASE_URL = ""; // Force file mode
    await mkdir(testDataDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDataDir, { recursive: true, force: true });
  });

  it("should save and load state in file mode", async () => {
    const store = await createReviewStateStore();
    expect(store.kind).toBe("file");

    const mockState = {
      overrides: [
        {
          id: "test-id",
          status: "approved",
          draftReply: "Hello test",
          resourceStatus: "resource_offered",
          auditEvents: []
        }
      ],
      importedPosts: []
    };

    await store.save(mockState);
    const loadedState = await store.load();

    expect(loadedState).toEqual(mockState);
  });
});
