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

    // Ensure schema exists (subset of schema.sql for runtime safety)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        row_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        import_batch_id TEXT REFERENCES import_batches(id),
        channel TEXT NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        body TEXT NOT NULL,
        matched_keyword TEXT NOT NULL,
        created_at DATE NOT NULL,
        inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS classifications (
        post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
        intent_category TEXT NOT NULL,
        relevance_score INTEGER NOT NULL,
        helpfulness_opportunity INTEGER NOT NULL,
        buying_signal_score INTEGER NOT NULL,
        medical_risk TEXT NOT NULL,
        promotion_risk TEXT NOT NULL,
        should_reply TEXT NOT NULL,
        reason TEXT NOT NULL,
        recommended_response_angle TEXT NOT NULL,
        red_flags_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
        ai_summary TEXT NOT NULL,
        prompt_version TEXT NOT NULL DEFAULT 'local-mock-v1',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS draft_replies (
        id BIGSERIAL PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        draft_text TEXT NOT NULL,
        generated_by TEXT NOT NULL DEFAULT 'local-mock-v1',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS compliance_results (
        draft_reply_id BIGINT PRIMARY KEY REFERENCES draft_replies(id) ON DELETE CASCADE,
        pass BOOLEAN NOT NULL,
        spam_risk TEXT NOT NULL,
        promotion_risk TEXT NOT NULL,
        health_claim_risk TEXT NOT NULL,
        hidden_advertising_risk TEXT NOT NULL,
        repetitive_wording_risk TEXT NOT NULL,
        disclosure_needed BOOLEAN NOT NULL DEFAULT false,
        issues JSONB NOT NULL DEFAULT '[]'::jsonb,
        required_edits JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS review_states (
        post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        resource_status TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id BIGSERIAL PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS dashboard_state_snapshots (
        key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    return {
      kind: "postgres",
      async load() {
        // We still support loading the legacy blob if available for migration, 
        // but prioritize granular data.
        const postsResult = await pool.query(`
          SELECT 
            p.*, 
            c.intent_category, c.relevance_score, c.helpfulness_opportunity, c.buying_signal_score, 
            c.medical_risk, c.promotion_risk, c.should_reply, c.reason, c.recommended_response_angle, 
            c.red_flags_detected, c.ai_summary,
            rs.status, rs.resource_status,
            (SELECT draft_text FROM draft_replies WHERE post_id = p.id ORDER BY created_at DESC LIMIT 1) as draft_reply
          FROM posts p
          LEFT JOIN classifications c ON p.id = c.post_id
          LEFT JOIN review_states rs ON p.id = rs.post_id
        `);

        if (postsResult.rows.length === 0) {
          const legacy = await pool.query(
            "SELECT payload FROM dashboard_state_snapshots WHERE key = $1",
            [stateKey]
          );
          return legacy.rows[0]?.payload ?? null;
        }

        const auditResult = await pool.query("SELECT * FROM audit_events ORDER BY created_at ASC");
        const auditByPost = auditResult.rows.reduce((acc, row) => {
          if (!acc[row.post_id]) acc[row.post_id] = [];
          acc[row.post_id].push({
            id: String(row.id),
            postId: row.post_id,
            action: row.action,
            actor: row.actor,
            fromStatus: row.from_status,
            toStatus: row.to_status,
            note: row.note,
            createdAt: row.created_at.toISOString()
          });
          return acc;
        }, {});

        // Reconstruct the state shape expected by the frontend
        const overrides = postsResult.rows.map(row => ({
          id: row.id,
          status: row.status ?? "new",
          resourceStatus: row.resource_status ?? "no_resource_offered",
          draftReply: row.draft_reply ?? "",
          auditEvents: auditByPost[row.id] ?? [],
          classification: row.intent_category ? {
            intent_category: row.intent_category,
            relevance_score: row.relevance_score,
            helpfulness_opportunity: row.helpfulness_opportunity,
            buying_signal_score: row.buying_signal_score,
            medical_risk: row.medical_risk,
            promotion_risk: row.promotion_risk,
            should_reply: row.should_reply,
            reason: row.reason,
            recommended_response_angle: row.recommended_response_angle,
            red_flags_detected: row.red_flags_detected,
            ai_summary: row.ai_summary
          } : undefined
        }));

        const importedPosts = postsResult.rows.map(row => ({
          id: row.id,
          subreddit: row.channel,
          title: row.title,
          excerpt: row.excerpt,
          body: row.body,
          matchedKeyword: row.matched_keyword,
          createdAt: row.created_at instanceof Date ? row.created_at.toISOString().slice(0, 10) : String(row.created_at),
          classification: row.intent_category ? {
            intent_category: row.intent_category,
            relevance_score: row.relevance_score,
            helpfulness_opportunity: row.helpfulness_opportunity,
            buying_signal_score: row.buying_signal_score,
            medical_risk: row.medical_risk,
            promotion_risk: row.promotion_risk,
            should_reply: row.should_reply,
            reason: row.reason,
            recommended_response_angle: row.recommended_response_angle,
            red_flags_detected: row.red_flags_detected,
            ai_summary: row.ai_summary
          } : undefined
        }));

        return { overrides, importedPosts };
      },
      async save(state, actor = "server-reviewer") {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          const overrides = Array.isArray(state) ? state : state.overrides;
          const importedPosts = Array.isArray(state) ? [] : (state.importedPosts ?? []);

          // 1. Ensure import batch for manual imports
          if (importedPosts.length > 0) {
            const batchId = `manual-batch-${Date.now()}`;
            await client.query(
              "INSERT INTO import_batches (id, source_type, created_by, row_count) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
              [batchId, "manual_import", actor, importedPosts.length]
            );

            for (const post of importedPosts) {
              await client.query(
                `INSERT INTO posts (id, import_batch_id, channel, title, excerpt, body, matched_keyword, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET 
                   title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, body = EXCLUDED.body
                `,
                [post.id, batchId, post.subreddit, post.title, post.excerpt, post.body, post.matchedKeyword, post.createdAt || new Date()]
              );

              if (post.classification) {
                const c = post.classification;
                await client.query(
                  `INSERT INTO classifications (
                    post_id, intent_category, relevance_score, helpfulness_opportunity, buying_signal_score,
                    medical_risk, promotion_risk, should_reply, reason, recommended_response_angle,
                    red_flags_detected, ai_summary
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                  ON CONFLICT (post_id) DO UPDATE SET
                    intent_category = EXCLUDED.intent_category, relevance_score = EXCLUDED.relevance_score,
                    buying_signal_score = EXCLUDED.buying_signal_score, medical_risk = EXCLUDED.medical_risk,
                    should_reply = EXCLUDED.should_reply, reason = EXCLUDED.reason
                  `,
                  [
                    post.id, c.intent_category, c.relevance_score, c.helpfulness_opportunity, c.buying_signal_score,
                    c.medical_risk, c.promotion_risk, c.should_reply, c.reason, c.recommended_response_angle,
                    JSON.stringify(c.red_flags_detected), c.ai_summary
                  ]
                );
              }
            }
          }

          // 2. Save overrides
          for (const ov of overrides) {
            // Ensure post exists
            await client.query(
              "INSERT INTO posts (id, channel, title, excerpt, body, matched_keyword, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING",
              [ov.id, "unknown", "Migrated Post", "", "", "migrated", new Date()]
            );

            await client.query(
              `INSERT INTO review_states (post_id, status, resource_status, updated_by, updated_at)
               VALUES ($1, $2, $3, $4, now())
               ON CONFLICT (post_id) DO UPDATE SET
                 status = EXCLUDED.status, resource_status = EXCLUDED.resource_status, updated_by = EXCLUDED.updated_by, updated_at = now()
              `,
              [ov.id, ov.status, ov.resourceStatus ?? "no_resource_offered", actor]
            );

            if (ov.draftReply) {
              await client.query(
                "INSERT INTO draft_replies (post_id, draft_text, generated_by) VALUES ($1, $2, $3)",
                [ov.id, ov.draftReply, actor]
              );
            }

            if (ov.classification) {
              const c = ov.classification;
              await client.query(
                `INSERT INTO classifications (
                  post_id, intent_category, relevance_score, helpfulness_opportunity, buying_signal_score,
                  medical_risk, promotion_risk, should_reply, reason, recommended_response_angle,
                  red_flags_detected, ai_summary
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (post_id) DO UPDATE SET
                  intent_category = EXCLUDED.intent_category, relevance_score = EXCLUDED.relevance_score,
                  buying_signal_score = EXCLUDED.buying_signal_score, medical_risk = EXCLUDED.medical_risk,
                  should_reply = EXCLUDED.should_reply, reason = EXCLUDED.reason
                `,
                [
                  ov.id, c.intent_category, c.relevance_score, c.helpfulness_opportunity, c.buying_signal_score,
                  c.medical_risk, c.promotion_risk, c.should_reply, c.reason, c.recommended_response_angle,
                  JSON.stringify(c.red_flags_detected), c.ai_summary
                ]
              );
            }

            if (Array.isArray(ov.auditEvents)) {
              for (const event of ov.auditEvents) {
                // Skip if id is numeric (already in DB) or already exists
                if (!/^\d+$/.test(event.id)) {
                  await client.query(
                    `INSERT INTO audit_events (post_id, actor, action, from_status, to_status, note, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT DO NOTHING`,
                    [ov.id, event.actor, event.action, event.fromStatus, event.toStatus, event.note, event.createdAt]
                  );
                }
              }
            }
          }

          // 3. Keep legacy blob in sync for safety during transition
          await client.query(
            `
            INSERT INTO dashboard_state_snapshots (key, payload, updated_by, updated_at)
            VALUES ($1, $2::jsonb, $3, now())
            ON CONFLICT (key)
            DO UPDATE SET payload = EXCLUDED.payload, updated_by = EXCLUDED.updated_by, updated_at = now()
            `,
            [stateKey, JSON.stringify(state), actor]
          );

          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
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
