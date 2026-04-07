-- docs/migrations/002_report_uploads.sql

-- Add mode to accounts table (lead_gen = optimize for CPA; ecommerce = optimize for ROAS)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'lead_gen'
  CHECK (mode IN ('lead_gen', 'ecommerce'));

-- Stores each uploaded Google Ads report CSV, parsed into JSON rows
CREATE TABLE IF NOT EXISTS report_uploads (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  report_type     TEXT        NOT NULL CHECK (report_type IN ('keyword', 'search_terms', 'campaign', 'product')),
  date_range_start DATE,
  date_range_end   DATE,
  row_count       INTEGER     NOT NULL DEFAULT 0,
  raw_data        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  file_name       TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_uploads_account_id_idx ON report_uploads (account_id);
CREATE INDEX IF NOT EXISTS report_uploads_uploaded_at_idx ON report_uploads (uploaded_at DESC);
