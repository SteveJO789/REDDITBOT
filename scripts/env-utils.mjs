import { readFileSync } from "node:fs";

export function readEnvFile(filePath = ".env") {
  const values = new Map();
  const content = readFileSync(filePath, "utf8");

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      throw new Error(`Invalid .env line ${index + 1}: missing "=".`);
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
}

export function getRequiredEnv(values, key) {
  const value = values.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function hasPlaceholder(value) {
  return /replace|placeholder|your-domain|strong_password|local_dev|example/i.test(value);
}
