import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { getRequiredEnv, readEnvFile } from "./env-utils.mjs";

const backupPath = process.argv[2];
const confirmed = process.argv.includes("--yes");

if (!backupPath || !confirmed) {
  console.error("Usage: npm run restore:db -- <backup.sql> --yes");
  console.error("This restores into the configured PostgreSQL database and may replace existing data.");
  process.exit(1);
}

if (!existsSync(backupPath)) {
  console.error(`Backup file not found: ${backupPath}`);
  process.exit(1);
}

const env = readEnvFile(".env");
const postgresUser = getRequiredEnv(env, "POSTGRES_USER");
const postgresDb = getRequiredEnv(env, "POSTGRES_DB");
const sql = readFileSync(backupPath, "utf8");

execFileSync(
  "docker",
  [
    "compose",
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    postgresUser,
    "-d",
    postgresDb,
    "-v",
    "ON_ERROR_STOP=1"
  ],
  { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] }
);

console.log(`PostgreSQL restore completed from ${backupPath}`);
