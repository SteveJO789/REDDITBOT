import { existsSync } from "node:fs";
import { getRequiredEnv, hasPlaceholder, readEnvFile } from "./env-utils.mjs";

const envPath = process.argv[2] ?? ".env";
const requiredKeys = [
  "NODE_ENV",
  "APP_ENV",
  "APP_BASE_URL",
  "DATABASE_URL",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "BASIC_AUTH_USER",
  "BASIC_AUTH_PASSWORD_HASH",
  "OUTREACH_WRITE_ENABLED",
  "REDDIT_READ_ONLY_ENABLED",
  "LLM_ENABLED",
  "REQUIRE_POSTGRES",
  "IMPORT_MAX_FILE_MB"
];

function fail(message) {
  console.error(`VPS env validation failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

if (!existsSync(envPath)) {
  fail(`Missing ${envPath}. Copy .env.example to .env and fill real deployment values.`);
}

let env;
try {
  env = readEnvFile(envPath);
} catch (error) {
  fail(error.message);
}

for (const key of requiredKeys) {
  const value = getRequiredEnv(env, key);
  assert(!hasPlaceholder(value), `${key} still looks like a placeholder.`);
}

const appBaseUrl = getRequiredEnv(env, "APP_BASE_URL");
assert(/^https:\/\/[^/]+/i.test(appBaseUrl), "APP_BASE_URL must be an HTTPS origin for VPS.");

const databaseUrl = getRequiredEnv(env, "DATABASE_URL");
assert(
  databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"),
  "DATABASE_URL must be a PostgreSQL connection string."
);
assert(
  databaseUrl.includes("@postgres:5432/"),
  "DATABASE_URL should point at the Compose service host postgres:5432."
);

for (const key of ["SESSION_SECRET", "ENCRYPTION_KEY"]) {
  assert(getRequiredEnv(env, key).length >= 32, `${key} must be at least 32 characters.`);
}

const basicAuthHash = getRequiredEnv(env, "BASIC_AUTH_PASSWORD_HASH");
assert(
  /^(\$\$|\$)2[aby]\$/.test(basicAuthHash),
  "BASIC_AUTH_PASSWORD_HASH must be a Caddy bcrypt hash. In .env, escape dollar signs as $$."
);

for (const key of ["OUTREACH_WRITE_ENABLED", "REDDIT_READ_ONLY_ENABLED", "LLM_ENABLED"]) {
  assert(getRequiredEnv(env, key) === "false", `${key} must stay false for v1 deployment.`);
}
assert(getRequiredEnv(env, "REQUIRE_POSTGRES") === "true", "REQUIRE_POSTGRES must be true for VPS deployment.");

const importMaxFileMb = Number(getRequiredEnv(env, "IMPORT_MAX_FILE_MB"));
assert(Number.isInteger(importMaxFileMb) && importMaxFileMb > 0 && importMaxFileMb <= 25, "IMPORT_MAX_FILE_MB must be an integer from 1 to 25.");

for (const futureOnlyKey of [
  "LLM_PROVIDER",
  "LLM_API_KEY",
  "REDDIT_CLIENT_ID",
  "REDDIT_CLIENT_SECRET",
  "REDDIT_USER_AGENT"
]) {
  assert(!env.get(futureOnlyKey), `${futureOnlyKey} must remain empty until separately approved.`);
}

console.log(`VPS env validation passed for ${envPath}.`);
