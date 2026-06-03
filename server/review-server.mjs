import { createServer } from "node:http";
import nextEnv from "@next/env";
import next from "next";
import { createAgentOpsStore } from "./agent-ops-store.mjs";
import { createReviewStateStore } from "./review-state-store.mjs";

const dev = process.env.NODE_ENV !== "production";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), dev);
const {
  analyzePostWithAI,
  classifyPostWithAI,
  generateDraftWithAI,
  isOpenRouterConfigured
} = await import("./ai-service.mjs");
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const importMaxFileMb = Number(process.env.IMPORT_MAX_FILE_MB ?? 5);
if (!Number.isInteger(importMaxFileMb) || importMaxFileMb < 1 || importMaxFileMb > 25) {
  throw new Error("IMPORT_MAX_FILE_MB must be an integer from 1 to 25.");
}
const maxBodyBytes = importMaxFileMb * 1024 * 1024;

const reviewStatuses = new Set([
  "new",
  "drafted",
  "approved",
  "rejected",
  "do_not_engage",
  "needs_compliance_review",
  "needs_marketing_review"
]);
const resourceStatuses = new Set([
  "no_resource_offered",
  "resource_offered",
  "user_requested_resource",
  "resource_sent",
  "product_requested",
  "converted",
  "not_relevant"
]);
const agentStatuses = new Set(["idle", "working", "waiting", "review", "blocked", "done", "failed", "offline"]);
const budgetStatuses = new Set(["active", "paused", "exceeded", "closed"]);
const apiFetchStatuses = new Set(["success", "failed", "blocked", "skipped"]);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBodyBytes) {
        reject(new Error("Request body is larger than the configured limit."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    req.on("error", reject);
  });
}

function isSavedStateCandidate(state) {
  if (Array.isArray(state)) {
    return state.length <= 1000 && state.every(isSavedOverrideCandidate);
  }

  return (
    state &&
    Array.isArray(state.overrides) &&
    state.overrides.length <= 1000 &&
    state.overrides.every(isSavedOverrideCandidate) &&
    (!state.importedPosts ||
      (Array.isArray(state.importedPosts) &&
        state.importedPosts.length <= 1000 &&
        state.importedPosts.every(isImportedPostCandidate)))
  );
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isShortString(value, maxLength) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isOptionalShortString(value, maxLength) {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function isOptionalNumberInRange(value, min, max) {
  return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max);
}

function isPlainMetadata(value, maxLength = 20000) {
  if (value === undefined) {
    return true;
  }
  if (!isPlainObject(value)) {
    return false;
  }
  try {
    return JSON.stringify(value).length <= maxLength;
  } catch {
    return false;
  }
}

function isSavedOverrideCandidate(value) {
  return (
    isPlainObject(value) &&
    isShortString(value.id, 160) &&
    reviewStatuses.has(value.status) &&
    isShortString(value.draftReply, 12000) &&
    (value.resourceStatus === undefined || resourceStatuses.has(value.resourceStatus)) &&
    (value.auditEvents === undefined ||
      (Array.isArray(value.auditEvents) && value.auditEvents.length <= 500))
  );
}

function isImportedPostCandidate(value) {
  return (
    isPlainObject(value) &&
    isShortString(value.id, 160) &&
    isShortString(value.subreddit, 160) &&
    isShortString(value.title, 500) &&
    isShortString(value.body, 12000) &&
    isOptionalShortString(value.excerpt, 1000) &&
    isOptionalShortString(value.matchedKeyword, 160) &&
    isOptionalShortString(value.createdAt, 40)
  );
}

function isAgentStatusCandidate(value) {
  return (
    isPlainObject(value) &&
    isShortString(value.agentId, 160) &&
    isOptionalShortString(value.agentName, 160) &&
    agentStatuses.has(value.status) &&
    isOptionalShortString(value.currentTask, 2000) &&
    isOptionalShortString(value.lastHeartbeatAt, 80) &&
    isPlainMetadata(value.metadata)
  );
}

function isDailyBudgetCandidate(value) {
  return (
    isPlainObject(value) &&
    isOptionalShortString(value.budgetDate, 40) &&
    isOptionalShortString(value.budgetKey, 160) &&
    typeof value.limitUsd === "number" &&
    Number.isFinite(value.limitUsd) &&
    value.limitUsd >= 0 &&
    value.limitUsd <= 1000000 &&
    isOptionalNumberInRange(value.spentUsd, 0, 1000000) &&
    isOptionalShortString(value.currency, 12) &&
    (value.status === undefined || budgetStatuses.has(value.status)) &&
    isOptionalShortString(value.notes, 2000) &&
    isOptionalShortString(value.updatedBy, 160)
  );
}

function isAuditEventCandidate(value) {
  return (
    isPlainObject(value) &&
    isOptionalShortString(value.actor, 160) &&
    isShortString(value.action, 160) &&
    isOptionalShortString(value.entityType, 120) &&
    isOptionalShortString(value.entityId, 240) &&
    isPlainMetadata(value.details) &&
    isOptionalShortString(value.createdAt, 80)
  );
}

function isApiFetchCandidate(value) {
  return (
    isPlainObject(value) &&
    isShortString(value.connector, 120) &&
    isShortString(value.endpoint, 500) &&
    isOptionalShortString(value.requestHash, 160) &&
    isPlainMetadata(value.query) &&
    apiFetchStatuses.has(value.status) &&
    isOptionalNumberInRange(value.statusCode, 100, 599) &&
    isOptionalNumberInRange(value.durationMs, 0, 1000 * 60 * 60) &&
    isOptionalNumberInRange(value.resultCount, 0, 1000000) &&
    isOptionalNumberInRange(value.costUsd, 0, 1000000) &&
    isOptionalShortString(value.error, 4000) &&
    isOptionalShortString(value.fetchedBy, 160) &&
    isOptionalShortString(value.fetchedAt, 80)
  );
}

async function recordApiFetchSafe(store, payload) {
  try {
    await store.recordApiFetch(payload);
  } catch (error) {
    console.warn("Agent-ops API fetch logging failed:", error.message);
  }
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const store = await createReviewStateStore();
const agentOpsStore = await createAgentOpsStore();

await app.prepare();

createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (requestUrl.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      storage: store.kind,
      agentOpsStorage: agentOpsStore.kind,
      outreachWriteEnabled: process.env.OUTREACH_WRITE_ENABLED === "true",
      llmEnabled: isOpenRouterConfigured(),
      redditReadOnlyEnabled: process.env.REDDIT_READ_ONLY_ENABLED === "true"
    });
    return;
  }

  if (requestUrl.pathname === "/api/reddit/search" && req.method === "POST") {
    if (process.env.REDDIT_READ_ONLY_ENABLED !== "true") {
      sendJson(res, 403, { ok: false, error: "Reddit API read-only mode is not enabled." });
      return;
    }
    try {
      const { searchRedditPosts } = await import("./reddit-api.mjs");
      const body = await readJsonBody(req);
      const query = body.query;
      const limit = Number.isInteger(body.limit) ? Math.min(body.limit, 25) : 10;
      const startedAt = Date.now();
      
      if (!query || typeof query !== "string") {
        sendJson(res, 400, { ok: false, error: "Query is required." });
        return;
      }
      
      const posts = await searchRedditPosts(query, limit);
      await recordApiFetchSafe(agentOpsStore, {
        connector: "reddit",
        endpoint: "/api/reddit/search",
        query: { query, limit },
        status: "success",
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        resultCount: posts.length,
        fetchedBy: "reddit-read-only-search"
      });

      sendJson(res, 200, { ok: true, posts });
    } catch (error) {
      console.error("Reddit search failure:", error);
      await recordApiFetchSafe(agentOpsStore, {
        connector: "reddit",
        endpoint: "/api/reddit/search",
        query: {},
        status: "failed",
        statusCode: 500,
        error: error.message || "Failed to search Reddit.",
        fetchedBy: "reddit-read-only-search"
      });
      sendJson(res, 500, { ok: false, error: error.message || "Failed to search Reddit." });
    }
    return;
  }

  if (requestUrl.pathname === "/api/agent-ops") {
    try {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        sendJson(res, 405, { ok: false, error: "Method not allowed." });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        storage: agentOpsStore.kind,
        summary: await agentOpsStore.loadSummary()
      });
    } catch (error) {
      console.error("Agent-ops API failure:", error);
      sendJson(res, 500, { ok: false, error: "Internal agent-ops API failure." });
    }
    return;
  }

  if (requestUrl.pathname === "/api/agent-ops/agent-status" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      if (!isAgentStatusCandidate(body)) {
        sendJson(res, 400, { ok: false, error: "Invalid agent status payload." });
        return;
      }

      const agent = await agentOpsStore.upsertAgentStatus(body);
      sendJson(res, 200, { ok: true, storage: agentOpsStore.kind, agent });
    } catch (error) {
      console.error("Agent status API failure:", error);
      sendJson(res, 500, { ok: false, error: "Internal agent status API failure." });
    }
    return;
  }

  if (requestUrl.pathname === "/api/agent-ops/daily-budget" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      if (!isDailyBudgetCandidate(body)) {
        sendJson(res, 400, { ok: false, error: "Invalid daily budget payload." });
        return;
      }

      const budget = await agentOpsStore.upsertDailyBudget(body);
      sendJson(res, 200, { ok: true, storage: agentOpsStore.kind, budget });
    } catch (error) {
      console.error("Daily budget API failure:", error);
      sendJson(res, 500, { ok: false, error: "Internal daily budget API failure." });
    }
    return;
  }

  if (requestUrl.pathname === "/api/agent-ops/audit-event" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      if (!isAuditEventCandidate(body)) {
        sendJson(res, 400, { ok: false, error: "Invalid audit event payload." });
        return;
      }

      const event = await agentOpsStore.recordAuditEvent(body);
      sendJson(res, 200, { ok: true, storage: agentOpsStore.kind, event });
    } catch (error) {
      console.error("Audit event API failure:", error);
      sendJson(res, 500, { ok: false, error: "Internal audit event API failure." });
    }
    return;
  }

  if (requestUrl.pathname === "/api/agent-ops/api-fetch" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      if (!isApiFetchCandidate(body)) {
        sendJson(res, 400, { ok: false, error: "Invalid API fetch payload." });
        return;
      }

      const fetchRecord = await agentOpsStore.recordApiFetch(body);
      sendJson(res, 200, { ok: true, storage: agentOpsStore.kind, fetchRecord });
    } catch (error) {
      console.error("API fetch history API failure:", error);
      sendJson(res, 500, { ok: false, error: "Internal API fetch history API failure." });
    }
    return;
  }

  if (requestUrl.pathname === "/api/ai/classify" && req.method === "POST") {
    if (!isOpenRouterConfigured()) {
      sendJson(res, 400, { ok: false, error: "OpenRouter AI is not enabled or API key is missing." });
      return;
    }
    try {
      const body = await readJsonBody(req);
      const result = await classifyPostWithAI(body.post);
      sendJson(res, 200, { ok: true, classification: result });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message });
    }
    return;
  }

  if (requestUrl.pathname === "/api/ai/draft" && req.method === "POST") {
    if (!isOpenRouterConfigured()) {
      sendJson(res, 400, { ok: false, error: "OpenRouter AI is not enabled or API key is missing." });
      return;
    }
    try {
      const body = await readJsonBody(req);
      const result = await generateDraftWithAI(body.post, body.classification);
      sendJson(res, 200, { ok: true, draft: result });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message });
    }
    return;
  }

  if (requestUrl.pathname === "/api/ai/analyze" && req.method === "POST") {
    if (!isOpenRouterConfigured()) {
      sendJson(res, 400, { ok: false, error: "OpenRouter AI is not enabled or API key is missing." });
      return;
    }
    try {
      const body = await readJsonBody(req);
      const result = await analyzePostWithAI(body.post);
      sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message });
    }
    return;
  }

  if (requestUrl.pathname === "/api/review-state") {
    try {
      if (req.method === "GET") {
        sendJson(res, 200, { ok: true, storage: store.kind, state: await store.load() });
        return;
      }

      if (req.method === "PUT") {
        const body = await readJsonBody(req);
        if (!isSavedStateCandidate(body.state)) {
          sendJson(res, 400, { ok: false, error: "Invalid dashboard state payload." });
          return;
        }

        await store.save(body.state, body.actor);
        sendJson(res, 200, { ok: true, storage: store.kind });
        return;
      }

      res.setHeader("Allow", "GET, PUT");
      sendJson(res, 405, { ok: false, error: "Method not allowed." });
      return;
    } catch (error) {
      console.error("Review-state API failure:", error);
      sendJson(res, 500, { ok: false, error: "Internal review-state API failure." });
      return;
    }
  }

  await handle(req, res);
}).listen(port, hostname, () => {
  console.log(`Operation Empathy server ready on http://${hostname}:${port}`);
  console.log(`Review state persistence: ${store.kind}`);
});
