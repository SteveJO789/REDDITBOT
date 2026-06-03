import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const pixelAgentsDir = path.resolve(
  projectRoot,
  process.env.PIXEL_AGENTS_DIR ?? "../pixel-agents",
);
const pixelAgentsCli = path.join(pixelAgentsDir, "dist", "cli.js");
const pixelAgentsPackage = path.join(pixelAgentsDir, "package.json");
const host = process.env.PIXEL_AGENTS_HOST ?? "0.0.0.0";
const port = process.env.PIXEL_AGENTS_PORT ?? "3100";
const passthroughArgs = process.argv.slice(2);

if (!fs.existsSync(pixelAgentsPackage)) {
  console.error(
    [
      `Pixel Agents repo not found at ${pixelAgentsDir}.`,
      "Clone it beside this project or set PIXEL_AGENTS_DIR to its absolute path.",
      "Expected clone command:",
      "  git clone https://github.com/pixel-agents-hq/pixel-agents ../pixel-agents",
    ].join("\n"),
  );
  process.exit(1);
}

if (!fs.existsSync(pixelAgentsCli)) {
  console.error(
    [
      `Pixel Agents has not been built at ${pixelAgentsDir}.`,
      "Build it once before starting the Redditbot development overlay:",
      "  cd ../pixel-agents",
      "  npm install",
      "  npm run build",
    ].join("\n"),
  );
  process.exit(1);
}

const cliArgs =
  passthroughArgs.length > 0 ? passthroughArgs : ["--host", host, "--port", port];

const child = spawn(process.execPath, [pixelAgentsCli, ...cliArgs], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
