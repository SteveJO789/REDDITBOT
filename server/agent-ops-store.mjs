import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const emptyState = {
  agents: [],
  budgets: [],
  auditEvents: [],
  apiFetches: []
};

function getDataDir() {
  return process.env.PERSISTENCE_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function getFilePath() {
  return path.join(getDataDir(), "agent-ops.json");
}

function iso(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function normalizeAgentStatus(input) {
  return {
    agentId: input.agentId,
    agentName: input.agentName ?? input.agentId,
    status: input.status,
    currentTask: input.currentTask ?? "",
    lastHeartbeatAt: input.lastHeartbeatAt ?? new Date().toISOString(),
    metadata: normalizeMetadata(input.metadata),
    updatedAt: new Date().toISOString()
  };
}

function normalizeDailyBudget(input) {
  return {
    budgetDate: input.budgetDate ?? todayDate(),
    budgetKey: input.budgetKey ?? "content-factory",
    limitUsd: Number(input.limitUsd ?? 0),
    spentUsd: Number(input.spentUsd ?? 0),
    currency: input.currency ?? "USD",
    status: input.status ?? "active",
    notes: input.notes ?? "",
    updatedBy: input.updatedBy ?? "system",
    updatedAt: new Date().toISOString()
  };
}

function normalizeAuditEvent(input) {
  return {
    id: input.id ?? createId("audit"),
    actor: input.actor ?? "system",
    action: input.action,
    entityType: input.entityType ?? "system",
    entityId: input.entityId ?? "",
    details: normalizeMetadata(input.details),
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

function normalizeApiFetch(input) {
  return {
    id: input.id ?? createId("fetch"),
    connector: input.connector,
    endpoint: input.endpoint,
    requestHash: input.requestHash ?? "",
    query: normalizeMetadata(input.query),
    status: input.status,
    statusCode: input.statusCode ?? null,
    durationMs: input.durationMs ?? null,
    resultCount: input.resultCount ?? null,
    costUsd: Number(input.costUsd ?? 0),
    error: input.error ?? "",
    fetchedBy: input.fetchedBy ?? "system",
    fetchedAt: input.fetchedAt ?? new Date().toISOString()
  };
}

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
      CREATE TABLE IF NOT EXISTS agent_statuses (
        agent_id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (
          status IN ('idle', 'working', 'waiting', 'review', 'blocked', 'done', 'failed', 'offline')
        ),
        current_task TEXT NOT NULL DEFAULT '',
        last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS daily_budgets (
        budget_date DATE NOT NULL,
        budget_key TEXT NOT NULL,
        limit_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
        spent_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'exceeded', 'closed')),
        notes TEXT NOT NULL DEFAULT '',
        updated_by TEXT NOT NULL DEFAULT 'system',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (budget_date, budget_key)
      );

      CREATE TABLE IF NOT EXISTS agent_audit_events (
        id BIGSERIAL PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL DEFAULT '',
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS api_fetch_history (
        id BIGSERIAL PRIMARY KEY,
        connector TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        request_hash TEXT NOT NULL DEFAULT '',
        query JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'blocked', 'skipped')),
        status_code INTEGER,
        duration_ms INTEGER,
        result_count INTEGER,
        cost_usd NUMERIC(12, 4) NOT NULL DEFAULT 0,
        error TEXT NOT NULL DEFAULT '',
        fetched_by TEXT NOT NULL DEFAULT 'system',
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_agent_statuses_status ON agent_statuses(status);
      CREATE INDEX IF NOT EXISTS idx_daily_budgets_date ON daily_budgets(budget_date DESC);
      CREATE INDEX IF NOT EXISTS idx_agent_audit_events_created ON agent_audit_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_agent_audit_events_entity ON agent_audit_events(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_api_fetch_history_connector ON api_fetch_history(connector, fetched_at DESC);
    `);

    return {
      kind: "postgres",
      async loadSummary({ auditLimit = 100, apiFetchLimit = 100 } = {}) {
        const [agents, budgets, auditEvents, apiFetches] = await Promise.all([
          pool.query(`
            SELECT agent_id, agent_name, status, current_task, last_heartbeat_at, metadata, updated_at
            FROM agent_statuses
            ORDER BY updated_at DESC
          `),
          pool.query(`
            SELECT budget_date, budget_key, limit_usd, spent_usd, currency, status, notes, updated_by, updated_at
            FROM daily_budgets
            ORDER BY budget_date DESC, budget_key ASC
            LIMIT 90
          `),
          pool.query(`
            SELECT id, actor, action, entity_type, entity_id, details, created_at
            FROM agent_audit_events
            ORDER BY created_at DESC
            LIMIT $1
          `, [auditLimit]),
          pool.query(`
            SELECT id, connector, endpoint, request_hash, query, status, status_code, duration_ms,
                   result_count, cost_usd, error, fetched_by, fetched_at
            FROM api_fetch_history
            ORDER BY fetched_at DESC
            LIMIT $1
          `, [apiFetchLimit])
        ]);

        return {
          agents: agents.rows.map((row) => ({
            agentId: row.agent_id,
            agentName: row.agent_name,
            status: row.status,
            currentTask: row.current_task,
            lastHeartbeatAt: iso(row.last_heartbeat_at),
            metadata: row.metadata ?? {},
            updatedAt: iso(row.updated_at)
          })),
          budgets: budgets.rows.map((row) => ({
            budgetDate: row.budget_date instanceof Date ? row.budget_date.toISOString().slice(0, 10) : String(row.budget_date),
            budgetKey: row.budget_key,
            limitUsd: Number(row.limit_usd),
            spentUsd: Number(row.spent_usd),
            currency: row.currency,
            status: row.status,
            notes: row.notes,
            updatedBy: row.updated_by,
            updatedAt: iso(row.updated_at)
          })),
          auditEvents: auditEvents.rows.map((row) => ({
            id: String(row.id),
            actor: row.actor,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            details: row.details ?? {},
            createdAt: iso(row.created_at)
          })),
          apiFetches: apiFetches.rows.map((row) => ({
            id: String(row.id),
            connector: row.connector,
            endpoint: row.endpoint,
            requestHash: row.request_hash,
            query: row.query ?? {},
            status: row.status,
            statusCode: row.status_code,
            durationMs: row.duration_ms,
            resultCount: row.result_count,
            costUsd: Number(row.cost_usd),
            error: row.error,
            fetchedBy: row.fetched_by,
            fetchedAt: iso(row.fetched_at)
          }))
        };
      },
      async upsertAgentStatus(input) {
        const status = normalizeAgentStatus(input);
        const result = await pool.query(`
          INSERT INTO agent_statuses (
            agent_id, agent_name, status, current_task, last_heartbeat_at, metadata, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
          ON CONFLICT (agent_id)
          DO UPDATE SET
            agent_name = EXCLUDED.agent_name,
            status = EXCLUDED.status,
            current_task = EXCLUDED.current_task,
            last_heartbeat_at = EXCLUDED.last_heartbeat_at,
            metadata = EXCLUDED.metadata,
            updated_at = now()
          RETURNING agent_id, agent_name, status, current_task, last_heartbeat_at, metadata, updated_at
        `, [
          status.agentId,
          status.agentName,
          status.status,
          status.currentTask,
          status.lastHeartbeatAt,
          JSON.stringify(status.metadata)
        ]);

        const row = result.rows[0];
        return {
          agentId: row.agent_id,
          agentName: row.agent_name,
          status: row.status,
          currentTask: row.current_task,
          lastHeartbeatAt: iso(row.last_heartbeat_at),
          metadata: row.metadata ?? {},
          updatedAt: iso(row.updated_at)
        };
      },
      async upsertDailyBudget(input) {
        const budget = normalizeDailyBudget(input);
        const result = await pool.query(`
          INSERT INTO daily_budgets (
            budget_date, budget_key, limit_usd, spent_usd, currency, status, notes, updated_by, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
          ON CONFLICT (budget_date, budget_key)
          DO UPDATE SET
            limit_usd = EXCLUDED.limit_usd,
            spent_usd = EXCLUDED.spent_usd,
            currency = EXCLUDED.currency,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            updated_by = EXCLUDED.updated_by,
            updated_at = now()
          RETURNING budget_date, budget_key, limit_usd, spent_usd, currency, status, notes, updated_by, updated_at
        `, [
          budget.budgetDate,
          budget.budgetKey,
          budget.limitUsd,
          budget.spentUsd,
          budget.currency,
          budget.status,
          budget.notes,
          budget.updatedBy
        ]);

        const row = result.rows[0];
        return {
          budgetDate: row.budget_date instanceof Date ? row.budget_date.toISOString().slice(0, 10) : String(row.budget_date),
          budgetKey: row.budget_key,
          limitUsd: Number(row.limit_usd),
          spentUsd: Number(row.spent_usd),
          currency: row.currency,
          status: row.status,
          notes: row.notes,
          updatedBy: row.updated_by,
          updatedAt: iso(row.updated_at)
        };
      },
      async recordAuditEvent(input) {
        const event = normalizeAuditEvent(input);
        const result = await pool.query(`
          INSERT INTO agent_audit_events (actor, action, entity_type, entity_id, details, created_at)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6)
          RETURNING id, actor, action, entity_type, entity_id, details, created_at
        `, [
          event.actor,
          event.action,
          event.entityType,
          event.entityId,
          JSON.stringify(event.details),
          event.createdAt
        ]);

        const row = result.rows[0];
        return {
          id: String(row.id),
          actor: row.actor,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          details: row.details ?? {},
          createdAt: iso(row.created_at)
        };
      },
      async recordApiFetch(input) {
        const fetchRecord = normalizeApiFetch(input);
        const result = await pool.query(`
          INSERT INTO api_fetch_history (
            connector, endpoint, request_hash, query, status, status_code, duration_ms,
            result_count, cost_usd, error, fetched_by, fetched_at
          )
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, connector, endpoint, request_hash, query, status, status_code, duration_ms,
                    result_count, cost_usd, error, fetched_by, fetched_at
        `, [
          fetchRecord.connector,
          fetchRecord.endpoint,
          fetchRecord.requestHash,
          JSON.stringify(fetchRecord.query),
          fetchRecord.status,
          fetchRecord.statusCode,
          fetchRecord.durationMs,
          fetchRecord.resultCount,
          fetchRecord.costUsd,
          fetchRecord.error,
          fetchRecord.fetchedBy,
          fetchRecord.fetchedAt
        ]);

        const row = result.rows[0];
        return {
          id: String(row.id),
          connector: row.connector,
          endpoint: row.endpoint,
          requestHash: row.request_hash,
          query: row.query ?? {},
          status: row.status,
          statusCode: row.status_code,
          durationMs: row.duration_ms,
          resultCount: row.result_count,
          costUsd: Number(row.cost_usd),
          error: row.error,
          fetchedBy: row.fetched_by,
          fetchedAt: iso(row.fetched_at)
        };
      }
    };
  } catch (error) {
    if (process.env.REQUIRE_POSTGRES === "true") {
      throw new Error(`PostgreSQL agent-ops persistence is required but unavailable: ${error.message}`);
    }

    console.warn(
      `PostgreSQL agent-ops persistence unavailable, falling back to file storage: ${error.message}`
    );
    return null;
  }
}

async function readFileState() {
  try {
    return {
      ...emptyState,
      ...JSON.parse(await readFile(getFilePath(), "utf8"))
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...emptyState };
    }
    throw error;
  }
}

async function writeFileState(state) {
  await mkdir(getDataDir(), { recursive: true });
  await writeFile(getFilePath(), JSON.stringify(state, null, 2), "utf8");
}

function createFileStore() {
  return {
    kind: "file",
    async loadSummary({ auditLimit = 100, apiFetchLimit = 100 } = {}) {
      const state = await readFileState();
      return {
        agents: state.agents,
        budgets: state.budgets.slice(0, 90),
        auditEvents: state.auditEvents.slice(0, auditLimit),
        apiFetches: state.apiFetches.slice(0, apiFetchLimit)
      };
    },
    async upsertAgentStatus(input) {
      const state = await readFileState();
      const status = normalizeAgentStatus(input);
      state.agents = [status, ...state.agents.filter((agent) => agent.agentId !== status.agentId)];
      await writeFileState(state);
      return status;
    },
    async upsertDailyBudget(input) {
      const state = await readFileState();
      const budget = normalizeDailyBudget(input);
      state.budgets = [
        budget,
        ...state.budgets.filter((item) => item.budgetDate !== budget.budgetDate || item.budgetKey !== budget.budgetKey)
      ];
      await writeFileState(state);
      return budget;
    },
    async recordAuditEvent(input) {
      const state = await readFileState();
      const event = normalizeAuditEvent(input);
      state.auditEvents = [event, ...state.auditEvents].slice(0, 1000);
      await writeFileState(state);
      return event;
    },
    async recordApiFetch(input) {
      const state = await readFileState();
      const fetchRecord = normalizeApiFetch(input);
      state.apiFetches = [fetchRecord, ...state.apiFetches].slice(0, 1000);
      await writeFileState(state);
      return fetchRecord;
    }
  };
}

export async function createAgentOpsStore() {
  return (await createPostgresStore()) ?? createFileStore();
}
