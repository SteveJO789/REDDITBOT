import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getRequiredEnv, readEnvFile } from "./env-utils.mjs";

const backupDir = process.argv[2] ?? "backups";
const env = readEnvFile(".env");
const postgresUser = getRequiredEnv(env, "POSTGRES_USER");
const postgresDb = getRequiredEnv(env, "POSTGRES_DB");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(backupDir, `${postgresDb}-${timestamp}.sql`);

mkdirSync(backupDir, { recursive: true });

const dump = execFileSync(
  "docker",
  [
    "compose",
    "exec",
    "-T",
    "postgres",
    "pg_dump",
    "-U",
    postgresUser,
    "-d",
    postgresDb,
    "--clean",
    "--if-exists"
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
);

writeFileSync(outputPath, dump, "utf8");
console.log(`PostgreSQL backup written to ${outputPath}`);
