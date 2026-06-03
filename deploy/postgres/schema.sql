CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('mock_seed', 'manual_csv', 'manual_json')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  row_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT
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
  relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 0 AND 10),
  helpfulness_opportunity INTEGER NOT NULL CHECK (helpfulness_opportunity BETWEEN 0 AND 10),
  buying_signal_score INTEGER NOT NULL CHECK (buying_signal_score BETWEEN 0 AND 10),
  medical_risk TEXT NOT NULL CHECK (medical_risk IN ('low', 'medium', 'high')),
  promotion_risk TEXT NOT NULL CHECK (promotion_risk IN ('low', 'medium', 'high')),
  should_reply TEXT NOT NULL CHECK (should_reply IN ('yes', 'no')),
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
  spam_risk TEXT NOT NULL CHECK (spam_risk IN ('low', 'medium', 'high')),
  promotion_risk TEXT NOT NULL CHECK (promotion_risk IN ('low', 'medium', 'high')),
  health_claim_risk TEXT NOT NULL CHECK (health_claim_risk IN ('low', 'medium', 'high')),
  hidden_advertising_risk TEXT NOT NULL CHECK (hidden_advertising_risk IN ('low', 'medium', 'high')),
  repetitive_wording_risk TEXT NOT NULL CHECK (repetitive_wording_risk IN ('low', 'medium', 'high')),
  disclosure_needed BOOLEAN NOT NULL DEFAULT false,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_edits JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_states (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (
    status IN (
      'new',
      'drafted',
      'approved',
      'rejected',
      'do_not_engage',
      'needs_compliance_review',
      'needs_marketing_review'
    )
  ),
  resource_status TEXT NOT NULL CHECK (
    resource_status IN (
      'no_resource_offered',
      'resource_offered',
      'user_requested_resource',
      'resource_sent',
      'product_requested',
      'converted',
      'not_relevant'
    )
  ),
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

CREATE INDEX IF NOT EXISTS idx_posts_import_batch_id ON posts(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_post_id ON audit_events(post_id);

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
