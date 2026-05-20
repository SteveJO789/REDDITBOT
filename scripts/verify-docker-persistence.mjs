import { execFileSync } from "node:child_process";

const composeArgs = ["compose"];
const verifyStateKey = "operation-empathy-dashboard-verify";
const testState = {
  state: {
    overrides: [
      {
        id: "post-001",
        status: "approved",
        draftReply: "Safe Docker persistence verification draft.",
        resourceStatus: "resource_offered",
        auditEvents: [
          {
            id: `docker-verify-${Date.now()}`,
            postId: "post-001",
            action: "approve",
            actor: "docker-verify",
            fromStatus: "drafted",
            toStatus: "approved",
            createdAt: new Date().toISOString()
          }
        ]
      }
    ],
    importedPosts: []
  },
  actor: "docker-verify"
};

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    env: { ...process.env, DASHBOARD_STATE_KEY: verifyStateKey },
    ...options
  });
}

function runDocker(args, options = {}) {
  return run("docker", [...composeArgs, ...args], options);
}

function runAppNode(code) {
  return runDocker(["exec", "-T", "app", "node", "-e", code]);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function waitForHealth() {
  const code = `
    fetch('http://localhost:3000/api/health')
      .then(async (response) => {
        const text = await response.text();
        console.log(JSON.stringify({ status: response.status, body: text }));
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  `;

  const startedAt = Date.now();
  const timeoutMs = 120_000;
  let lastError = "";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const raw = runAppNode(code);
      const result = JSON.parse(raw);
      const body = JSON.parse(result.body);

      if (result.status === 200 && body.ok === true) {
        return body;
      }
      lastError = raw;
    } catch (error) {
      lastError = error.message;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
  }

  throw new Error(`App health check did not pass within ${timeoutMs}ms. Last error: ${lastError}`);
}

console.log("Building and starting PostgreSQL plus app containers...");
runDocker(["up", "-d", "--build", "postgres", "app"], { stdio: "inherit" });

console.log("Checking app health...");
const health = waitForHealth();
assert(health.storage === "postgres", `Expected postgres storage, got ${health.storage}`);
assert(health.outreachWriteEnabled === false, "OUTREACH_WRITE_ENABLED must remain false.");

console.log("Writing review-state test payload...");
const putCode = `
  const body = ${JSON.stringify(JSON.stringify(testState))};
  fetch('http://localhost:3000/api/review-state', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body
  })
    .then(async (response) => {
      const text = await response.text();
      console.log(JSON.stringify({ status: response.status, body: text }));
      if (!response.ok) process.exit(1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
`;
const putResult = JSON.parse(runAppNode(putCode));
assert(putResult.status === 200, `Expected PUT 200, got ${putResult.status}`);

console.log("Reading persisted row from PostgreSQL...");
const queryOutput = runDocker([
  "exec",
  "-T",
  "postgres",
  "psql",
  "-U",
  "operation_empathy",
  "-d",
  "operation_empathy",
  "-t",
  "-A",
  "-c",
  `SELECT updated_by || '|' || jsonb_array_length(payload->'overrides') FROM dashboard_state_snapshots WHERE key = '${verifyStateKey}';`
]).trim();

assert(
  queryOutput === "docker-verify|1",
  `Expected PostgreSQL snapshot row docker-verify|1, got ${queryOutput || "<empty>"}`
);

console.log("Docker persistence verification passed.");
