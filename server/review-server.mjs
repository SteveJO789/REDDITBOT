import { createServer } from "node:http";
import next from "next";
import { createReviewStateStore } from "./review-state-store.mjs";

const dev = process.env.NODE_ENV !== "production";
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

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const store = await createReviewStateStore();

await app.prepare();

createServer(async (req, res) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (requestUrl.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      storage: store.kind,
      outreachWriteEnabled: process.env.OUTREACH_WRITE_ENABLED === "true"
    });
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
