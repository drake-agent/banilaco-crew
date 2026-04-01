-- Schema v7: Migration tracking infrastructure
-- Depends on: all previous schema versions (v1-v6)

-- Track which schema versions have been applied
CREATE TABLE IF NOT EXISTS _schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum VARCHAR(64)
);

-- Seed with existing versions (mark as retroactively applied)
INSERT INTO _schema_migrations (version, name) VALUES
  ('v1', 'initial_schema'),
  ('v2', 'creator_accounts_tiktok_credentials'),
  ('v3', 'kpi_tables'),
  ('v4', 'outreach_referrals'),
  ('v5', 'tiktok_api_integration'),
  ('v6', 'sample_tracking_content'),
  ('v7', 'migration_tracking')
ON CONFLICT (version) DO NOTHING;
