-- Connected Google Ads accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_customer_id TEXT NOT NULL UNIQUE,
  google_refresh_token TEXT NOT NULL,
  google_login_customer_id TEXT,
  status TEXT DEFAULT 'connecting',
  brand_profile JSONB,
  audit_data JSONB,
  settings JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Every AI-driven change (the undo log)
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  run_id UUID,
  agent_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_resource_name TEXT,
  description TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  reasoning TEXT,
  status TEXT DEFAULT 'applied',
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent execution runs
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  trigger TEXT DEFAULT 'scheduled',
  status TEXT DEFAULT 'running',
  actions_taken INTEGER DEFAULT 0,
  summary JSONB,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Campaign data cache
CREATE TABLE campaign_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  metrics_data JSONB,
  period TEXT DEFAULT 'last_30_days',
  created_at TIMESTAMPTZ DEFAULT now()
);
