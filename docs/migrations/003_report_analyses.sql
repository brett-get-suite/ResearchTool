-- docs/migrations/003_report_analyses.sql

-- Stores the full computed + AI-generated analysis for one or more uploads
CREATE TABLE IF NOT EXISTS report_analyses (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  upload_ids      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  mode            TEXT        NOT NULL DEFAULT 'lead_gen' CHECK (mode IN ('lead_gen', 'ecommerce')),
  computed_data   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  swot            JSONB,
  action_items    JSONB,
  data_sufficiency_warnings JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_analyses_account_id_idx ON report_analyses (account_id);
CREATE INDEX IF NOT EXISTS report_analyses_created_at_idx ON report_analyses (created_at DESC);
