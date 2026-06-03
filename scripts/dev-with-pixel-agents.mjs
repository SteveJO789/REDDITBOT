import { spawn } from "node:child_process";
import process from "node:process";

const processes = [
  spawn(process.execPath, ["scripts/pixel-agents.mjs"], {
    env: process.env,
    stdio: "inherit",
  }),
  spawn(process.execPath, ["scripts/dev-server.mjs"], {
    env: {
      ...process.env,
      REQUIRE_POSTGRES: process.env.REQUIRE_POSTGRES ?? "false",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

for (const child of processes) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.error(`Development process stopped with signal ${signal}.`);
      shutdown(1);
      return;
    }
    if (code && code !== 0) {
      console.error(`Development process exited with code ${code}.`);
      shutdown(code);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
