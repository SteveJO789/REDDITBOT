import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const prompt = process.argv.slice(2).join(" ").trim();
const sandbox = process.env.CODEX_AGENT_SANDBOX ?? "workspace-write";
const runsDir = path.join(projectRoot, ".data", "agent-runs");
const serverJsonPath = path.join(os.homedir(), ".pixel-agents", "server.json");
const sessionId = `codex-${Date.now()}`;
const hookHost = process.env.PIXEL_AGENTS_HOOK_HOST ?? "localhost";
const hookRetryCount = Number(process.env.PIXEL_AGENTS_HOOK_RETRIES ?? 5);
const agentOpsBaseUrl = process.env.AGENT_OPS_BASE_URL ?? "http://localhost:3000";
const outputStamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const outputBasePath = path.join(runsDir, `${outputStamp}-${sessionId}`);
const roleMatch = prompt.match(/^Role:\s*([^.\n]+)/i);
const agentRole = roleMatch?.[1]?.trim() || "Codex Agent";
const agentId = agentRole
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "codex-agent";
const trackedPixelProjectDir = path.join(
  os.homedir(),
  ".claude",
  "projects",
  "-root-REDDITBOT",
);

if (!prompt) {
  console.error('Usage: npm run codex:agent -- "your task prompt"');
  process.exit(1);
}

if (!fs.existsSync(serverJsonPath)) {
  console.error("Pixel Agents is not running. Start it first with npm run dev:agents.");
  process.exit(1);
}

const server = JSON.parse(fs.readFileSync(serverJsonPath, "utf-8"));
fs.mkdirSync(runsDir, { recursive: true });

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringifyContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          return part.text ?? part.content ?? "";
        }
        return "";
      })
      .filter(Boolean)
      .join("");
  }

  if (content && typeof content === "object") {
    return content.text ?? content.content ?? "";
  }

  return "";
}

function extractCodexMessage(event) {
  const item = event.item && typeof event.item === "object" ? event.item : event;
  const type = item.type ?? event.type;

  if (type === "agent_message" || item.role === "assistant") {
    return stringifyContent(item.text ?? item.content ?? item.message?.content);
  }

  if (event.type === "item.completed" && item.type === "agent_message") {
    return stringifyContent(item.text ?? item.content ?? item.message?.content);
  }

  if (event.type === "message" && event.role === "assistant") {
    return stringifyContent(event.content);
  }

  return "";
}

function trySaveJson(finalText) {
  try {
    const parsed = JSON.parse(finalText);
    const jsonPath = `${outputBasePath}.json`;
    fs.writeFileSync(jsonPath, `${JSON.stringify(parsed, null, 2)}\n`);
    return jsonPath;
  } catch {
    return "";
  }
}

async function postAgentOps(pathname, payload) {
  try {
    const response = await fetch(`${agentOpsBaseUrl}${pathname}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`Agent ops write failed (${response.status}): ${body}`);
    }
  } catch (error) {
    console.warn(`Agent ops write skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function postHookOnce(event) {
  const body = JSON.stringify({
    session_id: sessionId,
    ...event,
  });

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: hookHost,
        port: server.port,
        path: "/api/hooks/claude",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Authorization: `Bearer ${server.token}`,
        },
      },
      (res) => {
        res.resume();
        res.on("end", resolve);
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function postHook(event) {
  let lastError;

  for (let attempt = 0; attempt <= hookRetryCount; attempt += 1) {
    try {
      await postHookOnce(event);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < hookRetryCount) {
        await delay(250);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Pixel Agents is not reachable at http://${hookHost}:${server.port}. Start it with: npm run dev:agents -- --host 0.0.0.0 --port ${server.port}. Last error: ${message}`,
  );
}

try {
  await postHook({
    hook_event_name: "SessionStart",
    source: "startup",
    cwd: trackedPixelProjectDir,
  });

  await postHook({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: {
      command: `codex exec --sandbox ${sandbox} ${JSON.stringify(prompt)}`,
    },
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

await postAgentOps("/api/agent-ops/agent-status", {
  agentId,
  agentName: agentRole,
  status: "working",
  currentTask: prompt,
  metadata: {
    sessionId,
    sandbox,
    outputBasePath: path.relative(projectRoot, outputBasePath)
  }
});

await postAgentOps("/api/agent-ops/audit-event", {
  actor: "codex-agent",
  action: "agent_task_started",
  entityType: "agent",
  entityId: agentId,
  details: {
    agentName: agentRole,
    sessionId,
    sandbox,
    prompt
  }
});

const rawJsonLines = [];
const stderrChunks = [];
let bufferedStdout = "";
let finalMessage = "";

console.log(`Codex agent started. Output will be saved under ${path.relative(projectRoot, outputBasePath)}.*`);

const child = spawn("codex", ["exec", "--json", "--sandbox", sandbox, prompt], {
  cwd: projectRoot,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => {
  bufferedStdout += chunk.toString("utf-8");
  const lines = bufferedStdout.split(/\r?\n/);
  bufferedStdout = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.trim()) continue;
    rawJsonLines.push(line);

    try {
      const event = JSON.parse(line);
      const message = extractCodexMessage(event);
      if (message.trim()) {
        finalMessage = message.trim();
      }
    } catch {
      stderrChunks.push(`Unparseable stdout line: ${line}`);
    }
  }
});

child.stderr.on("data", (chunk) => {
  stderrChunks.push(chunk.toString("utf-8"));
});

const exitCode = await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", (code) => resolve(code ?? 0));
});

if (bufferedStdout.trim()) {
  rawJsonLines.push(bufferedStdout.trim());
  try {
    const event = JSON.parse(bufferedStdout.trim());
    const message = extractCodexMessage(event);
    if (message.trim()) {
      finalMessage = message.trim();
    }
  } catch {
    stderrChunks.push(`Unparseable stdout line: ${bufferedStdout.trim()}`);
  }
}

const jsonlPath = `${outputBasePath}.jsonl`;
const stderrPath = `${outputBasePath}.stderr.log`;
const finalPath = `${outputBasePath}.txt`;

fs.writeFileSync(jsonlPath, rawJsonLines.length > 0 ? `${rawJsonLines.join("\n")}\n` : "");
if (stderrChunks.length > 0) {
  fs.writeFileSync(stderrPath, stderrChunks.join(""));
}
fs.writeFileSync(finalPath, finalMessage ? `${finalMessage}\n` : "");

const jsonPath = finalMessage ? trySaveJson(finalMessage) : "";
const relativeOutput = {
  final: path.relative(projectRoot, finalPath),
  json: jsonPath ? path.relative(projectRoot, jsonPath) : "",
  rawJsonl: path.relative(projectRoot, jsonlPath),
  stderr: stderrChunks.length > 0 ? path.relative(projectRoot, stderrPath) : ""
};

if (finalMessage) {
  console.log(finalMessage);
}

console.log("\nCodex agent output saved:");
console.log(`- Final: ${path.relative(projectRoot, finalPath)}`);
if (jsonPath) {
  console.log(`- JSON: ${path.relative(projectRoot, jsonPath)}`);
}
console.log(`- Raw JSONL: ${path.relative(projectRoot, jsonlPath)}`);
if (stderrChunks.length > 0) {
  console.log(`- Stderr: ${path.relative(projectRoot, stderrPath)}`);
}

await postAgentOps("/api/agent-ops/agent-status", {
  agentId,
  agentName: agentRole,
  status: exitCode === 0 ? "done" : "failed",
  currentTask: "",
  metadata: {
    sessionId,
    sandbox,
    exitCode,
    output: relativeOutput
  }
});

await postAgentOps("/api/agent-ops/audit-event", {
  actor: "codex-agent",
  action: exitCode === 0 ? "agent_task_completed" : "agent_task_failed",
  entityType: "agent",
  entityId: agentId,
  details: {
    agentName: agentRole,
    sessionId,
    sandbox,
    exitCode,
    output: relativeOutput
  }
});

try {
  await postHook({
    hook_event_name: exitCode === 0 ? "PostToolUse" : "PostToolUseFailure",
  });
  await postHook({ hook_event_name: "Stop" });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
}

process.exit(exitCode);
