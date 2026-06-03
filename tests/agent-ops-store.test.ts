import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createAgentOpsStore } from "../server/agent-ops-store.mjs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

describe("AgentOpsStore (File Mode)", () => {
  const testDataDir = path.join(process.cwd(), ".data-agent-ops-test");

  beforeEach(async () => {
    process.env.PERSISTENCE_DATA_DIR = testDataDir;
    process.env.DATABASE_URL = "";
    await mkdir(testDataDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDataDir, { recursive: true, force: true });
  });

  it("saves and loads agent ops records in file mode", async () => {
    const store = await createAgentOpsStore();
    expect(store.kind).toBe("file");

    await store.upsertAgentStatus({
      agentId: "trend-research-agent",
      agentName: "Trend Research Agent",
      status: "working",
      currentTask: "Create 20 video ideas",
      metadata: { sessionId: "codex-test" }
    });

    await store.upsertDailyBudget({
      budgetDate: "2026-06-02",
      budgetKey: "content-factory",
      limitUsd: 3,
      spentUsd: 1.25,
      currency: "USD",
      status: "active",
      updatedBy: "test"
    });

    await store.recordAuditEvent({
      actor: "codex-agent",
      action: "agent_task_started",
      entityType: "agent",
      entityId: "trend-research-agent",
      details: { prompt: "Return JSON only" }
    });

    await store.recordApiFetch({
      connector: "reddit",
      endpoint: "/api/reddit/search",
      query: { query: "ai tools", limit: 10 },
      status: "success",
      statusCode: 200,
      durationMs: 125,
      resultCount: 10,
      fetchedBy: "test"
    });

    const summary = await store.loadSummary();

    expect(summary.agents[0]).toMatchObject({
      agentId: "trend-research-agent",
      agentName: "Trend Research Agent",
      status: "working",
      currentTask: "Create 20 video ideas"
    });
    expect(summary.budgets[0]).toMatchObject({
      budgetDate: "2026-06-02",
      budgetKey: "content-factory",
      limitUsd: 3,
      spentUsd: 1.25,
      status: "active"
    });
    expect(summary.auditEvents[0]).toMatchObject({
      actor: "codex-agent",
      action: "agent_task_started",
      entityType: "agent",
      entityId: "trend-research-agent"
    });
    expect(summary.apiFetches[0]).toMatchObject({
      connector: "reddit",
      endpoint: "/api/reddit/search",
      status: "success",
      statusCode: 200,
      resultCount: 10
    });
  });
});
