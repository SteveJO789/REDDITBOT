import { createServer } from "node:http";
import next from "next";
import { createReviewStateStore } from "./review-state-store.mjs";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const maxBodyBytes = Number(process.env.IMPORT_MAX_FILE_MB ?? 5) * 1024 * 1024;

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
  return Array.isArray(state) || (state && Array.isArray(state.overrides));
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
      sendJson(res, 500, { ok: false, error: error.message });
      return;
    }
  }

  await handle(req, res);
}).listen(port, hostname, () => {
  console.log(`Operation Empathy server ready on http://${hostname}:${port}`);
  console.log(`Review state persistence: ${store.kind}`);
});
