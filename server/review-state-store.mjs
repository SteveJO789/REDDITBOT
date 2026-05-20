import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const stateKey = process.env.DASHBOARD_STATE_KEY ?? "operation-empathy-dashboard-v1";
const dataDir = process.env.PERSISTENCE_DATA_DIR ?? path.join(process.cwd(), ".data");
const filePath = path.join(dataDir, "review-state.json");

async function createPostgresStore() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_state_snapshots (
        key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    return {
      kind: "postgres",
      async load() {
        const result = await pool.query(
          "SELECT payload FROM dashboard_state_snapshots WHERE key = $1",
          [stateKey]
        );
        return result.rows[0]?.payload ?? null;
      },
      async save(state, actor = "server-reviewer") {
        await pool.query(
          `
          INSERT INTO dashboard_state_snapshots (key, payload, updated_by, updated_at)
          VALUES ($1, $2::jsonb, $3, now())
          ON CONFLICT (key)
          DO UPDATE SET payload = EXCLUDED.payload, updated_by = EXCLUDED.updated_by, updated_at = now()
          `,
          [stateKey, JSON.stringify(state), actor]
        );
      }
    };
  } catch (error) {
    if (process.env.REQUIRE_POSTGRES === "true") {
      throw new Error(`PostgreSQL persistence is required but unavailable: ${error.message}`);
    }

    console.warn(
      `PostgreSQL persistence unavailable, falling back to file storage: ${error.message}`
    );
    return null;
  }
}

function createFileStore() {
  return {
    kind: "file",
    async load() {
      try {
        return JSON.parse(await readFile(filePath, "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },
    async save(state) {
      await mkdir(dataDir, { recursive: true });
      await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
    }
  };
}

export async function createReviewStateStore() {
  return (await createPostgresStore()) ?? createFileStore();
}
