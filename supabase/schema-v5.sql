-- ============================================
-- Schema V5: TikTok Shop API Integration
--
-- New tables:
--   - tiktok_credentials (OAuth token storage)
--   - webhook_events (webhook audit log)
--
-- Modified tables:
--   - creators (add tiktok_user_id, current_tier columns)
--   - order_tracking (add order_status column)
--
-- Updated trigger:
--   - auto_update_tier → commission rates 15/20/30/30%+
-- ============================================

-- ===================================
-- 1. TikTok API Credentials
-- ===================================

CREATE TABLE IF NOT EXISTS tiktok_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id TEXT UNIQUE NOT NULL,
  shop_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  shop_cipher TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update timestamp
CREATE TRIGGER trg_tiktok_credentials_updated
  BEFORE UPDATE ON tiktok_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: admin only
ALTER TABLE tiktok_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tiktok_credentials_admin_only" ON tiktok_credentials
  FOR ALL USING (is_admin());

-- ===================================
-- 2. Webhook Events Log
-- ===================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type INTEGER NOT NULL,
  shop_id TEXT,
  payload JSONB NOT NULL,
  processing_status TEXT DEFAULT 'RECEIVED'
    CHECK (processing_status IN ('RECEIVED', 'PROCESSED', 'FAILED')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_events_type_received
  ON webhook_events(event_type, received_at DESC);

CREATE INDEX idx_webhook_events_status
  ON webhook_events(processing_status)
  WHERE processing_status = 'FAILED';

-- RLS: admin only
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_admin_only" ON webhook_events
  FOR ALL USING (is_admin());

-- ===================================
-- 3. Extend creators table
-- ===================================

-- TikTok user ID for API matching
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS tiktok_user_id TEXT UNIQUE;

-- Track current tier explicitly (was computed via trigger, now also stored)
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ;

-- ===================================
-- 4. Extend order_tracking table
-- ===================================

-- Add status column for webhook-driven updates
ALTER TABLE order_tracking
  ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'PENDING';

-- ===================================
-- 5. Update tier trigger with correct commission rates
-- ===================================

CREATE OR REPLACE FUNCTION auto_update_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate when GMV or content_count actually changes
  IF NEW.monthly_gmv IS DISTINCT FROM OLD.monthly_gmv
     OR NEW.content_count IS DISTINCT FROM OLD.content_count THEN

    IF NEW.monthly_gmv >= 5000 THEN
      NEW.tier := 'diamond';
      NEW.commission_rate := 0.30;   -- 30%+ (negotiable)
    ELSIF NEW.monthly_gmv >= 1000 THEN
      NEW.tier := 'gold';
      NEW.commission_rate := 0.30;   -- 30%
    ELSIF NEW.content_count >= 5 THEN
      NEW.tier := 'silver';
      NEW.commission_rate := 0.20;   -- 20%
    ELSE
      NEW.tier := 'bronze';
      NEW.commission_rate := 0.15;   -- 15%
    END IF;

    -- Track when tier was last evaluated
    NEW.tier_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 6. Sync log table (for cron sync tracking)
-- ===================================

CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL
    CHECK (sync_type IN ('PRODUCT', 'ORDER', 'FINANCE', 'ANALYTICS', 'TIER_EVALUATION')),
  status TEXT NOT NULL
    CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED')),
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX idx_sync_log_type_started
  ON sync_log(sync_type, started_at DESC);

-- RLS: admin only
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_log_admin_only" ON sync_log
  FOR ALL USING (is_admin());
