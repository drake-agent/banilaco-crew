-- ============================================
-- Banilaco Crew - Schema V4 Fixes
-- Deep Code Review: STRUCT-001, STRUCT-002, BUG-8
-- ============================================

-- STRUCT-001: content_tracking missing updated_at column
-- sync-orchestrator.ts writes updated_at on upsert but column doesn't exist
ALTER TABLE content_tracking ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Auto-update trigger for content_tracking.updated_at
CREATE OR REPLACE FUNCTION update_content_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_tracking_updated ON content_tracking;
CREATE TRIGGER trg_content_tracking_updated
  BEFORE UPDATE ON content_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_content_tracking_timestamp();

-- STRUCT-002: referral_codes missing updated_at column
-- RPC increment_referral_code_uses writes updated_at = NOW() but column doesn't exist
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Auto-update trigger for referral_codes.updated_at
CREATE OR REPLACE FUNCTION update_referral_codes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_referral_codes_updated ON referral_codes;
CREATE TRIGGER trg_referral_codes_updated
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_codes_timestamp();

-- BUG-8: auto_update_tier trigger fires on every UPDATE
-- Add guard to only recalculate when monthly_gmv or monthly_content_count changes
CREATE OR REPLACE FUNCTION auto_update_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if GMV or content count actually changed
  IF NEW.monthly_gmv IS DISTINCT FROM OLD.monthly_gmv
     OR NEW.monthly_content_count IS DISTINCT FROM OLD.monthly_content_count THEN
    IF NEW.monthly_gmv >= 5000 THEN
      NEW.tier = 'diamond';
      NEW.commission_rate = 40;
    ELSIF NEW.monthly_gmv >= 1000 THEN
      NEW.tier = 'gold';
      NEW.commission_rate = 40;
    ELSIF NEW.monthly_content_count >= 5 THEN
      NEW.tier = 'silver';
      NEW.commission_rate = 35;
    ELSE
      NEW.tier = 'bronze';
      NEW.commission_rate = 30;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ARCH-004: Idempotency — cron sync state tracking
-- Prevents double execution of sync jobs
-- ============================================
CREATE TABLE IF NOT EXISTS cron_sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type VARCHAR(50) NOT NULL UNIQUE,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_cursor VARCHAR(500),
  status VARCHAR(20) DEFAULT 'completed',  -- 'running', 'completed', 'failed'
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial state
INSERT INTO cron_sync_state (sync_type, last_run_at, status) VALUES
  ('full_sync', NOW() - INTERVAL '1 day', 'completed'),
  ('shop_orders', NOW() - INTERVAL '1 day', 'completed'),
  ('competitor_discovery', NOW() - INTERVAL '1 day', 'completed')
ON CONFLICT (sync_type) DO NOTHING;

-- ARCH-008: Order-level deduplication table
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_order_id VARCHAR(100) NOT NULL UNIQUE,
  creator_id UUID NOT NULL REFERENCES creators(id),
  order_status VARCHAR(50) NOT NULL,
  gmv_amount DECIMAL(12,2) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_tracking_shop_id ON order_tracking(shop_order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_creator ON order_tracking(creator_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_synced ON order_tracking(synced_at DESC);

-- ============================================
-- ARCH-003: Transaction RPC for referral signup
-- Wraps referral INSERT + code usage increment in single transaction
-- ============================================
CREATE OR REPLACE FUNCTION process_referral_signup(
  p_code VARCHAR,
  p_referred_handle VARCHAR,
  p_referred_email VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  -- Find referral code
  SELECT creator_id INTO v_referrer_id
  FROM referral_codes
  WHERE code = p_code AND is_active = true;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive referral code: %', p_code;
  END IF;

  -- Insert referral record
  INSERT INTO referrals (referrer_id, referral_code, referred_handle, referred_email, status, bonus_amount, updated_at)
  VALUES (v_referrer_id, p_code, p_referred_handle, p_referred_email, 'signed_up', 10, NOW())
  RETURNING id INTO v_referral_id;

  -- Increment code usage atomically (same transaction)
  UPDATE referral_codes
  SET uses_count = uses_count + 1, updated_at = NOW()
  WHERE code = p_code AND is_active = true;

  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UNI-001: Replace USING(true) RLS with proper role checks
-- Drops overly permissive "Admins manage all" policies
-- Replaces with admin-role-verified policies
-- ============================================

-- Helper function: Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- creators table: replace blanket policies
DROP POLICY IF EXISTS "Authenticated users can manage creators" ON creators;
CREATE POLICY "Admins manage creators" ON creators
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Creators read own data" ON creators
  FOR SELECT TO authenticated
  USING (id IN (SELECT creator_id FROM creator_accounts WHERE auth_user_id = auth.uid()));

-- sample_shipments: replace blanket policies
DROP POLICY IF EXISTS "Authenticated users can manage shipments" ON sample_shipments;
CREATE POLICY "Admins manage shipments" ON sample_shipments
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Creators read own shipments" ON sample_shipments
  FOR SELECT TO authenticated
  USING (creator_id IN (SELECT creator_id FROM creator_accounts WHERE auth_user_id = auth.uid()));

-- outreach_pipeline: replace blanket policies
DROP POLICY IF EXISTS "Authenticated users can manage outreach" ON outreach_pipeline;
CREATE POLICY "Admins manage outreach" ON outreach_pipeline
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- content_tracking: replace blanket policies
DROP POLICY IF EXISTS "Authenticated users can manage content" ON content_tracking;
CREATE POLICY "Admins manage content" ON content_tracking
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Creators read own content" ON content_tracking
  FOR SELECT TO authenticated
  USING (creator_id IN (SELECT creator_id FROM creator_accounts WHERE auth_user_id = auth.uid()));

-- referral_codes: replace blanket admin policy
DROP POLICY IF EXISTS "Admins manage all referral codes" ON referral_codes;
CREATE POLICY "Admins manage referral codes" ON referral_codes
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- referrals: replace blanket admin policy
DROP POLICY IF EXISTS "Admins manage all referrals" ON referrals;
CREATE POLICY "Admins manage referrals" ON referrals
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- creator_accounts: replace blanket admin policy
DROP POLICY IF EXISTS "Admins manage accounts" ON creator_accounts;
CREATE POLICY "Admins manage accounts" ON creator_accounts
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- creator_recommendations: replace blanket admin policy
DROP POLICY IF EXISTS "Admins manage recommendations" ON creator_recommendations;
CREATE POLICY "Admins manage recommendations" ON creator_recommendations
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- creator_payouts: replace blanket admin policy
DROP POLICY IF EXISTS "Admins manage payouts" ON creator_payouts;
CREATE POLICY "Admins manage payouts" ON creator_payouts
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- UNI-002: KPI aggregation RPC — runs in DB instead of loading all rows to memory
-- ============================================
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalCreators', (SELECT COUNT(*) FROM creators),
    'activeCreators', (SELECT COUNT(*) FROM creators WHERE status = 'active'),
    'totalGMV', COALESCE((SELECT SUM(monthly_gmv) FROM creators WHERE status = 'active'), 0),
    'tierBreakdown', json_build_object(
      'bronze', (SELECT COUNT(*) FROM creators WHERE tier = 'bronze'),
      'silver', (SELECT COUNT(*) FROM creators WHERE tier = 'silver'),
      'gold', (SELECT COUNT(*) FROM creators WHERE tier = 'gold'),
      'diamond', (SELECT COUNT(*) FROM creators WHERE tier = 'diamond')
    ),
    'sourceBreakdown', json_build_object(
      'open_collab', (SELECT COUNT(*) FROM creators WHERE source = 'open_collab'),
      'dm_outreach', (SELECT COUNT(*) FROM creators WHERE source = 'dm_outreach'),
      'mcn', (SELECT COUNT(*) FROM creators WHERE source = 'mcn'),
      'buyer_to_creator', (SELECT COUNT(*) FROM creators WHERE source = 'buyer_to_creator'),
      'referral', (SELECT COUNT(*) FROM creators WHERE source = 'referral'),
      'paid', (SELECT COUNT(*) FROM creators WHERE source = 'paid')
    ),
    'pendingSamples', (SELECT COUNT(*) FROM sample_shipments WHERE status IN ('requested', 'approved')),
    'outreachPipelineCount', (SELECT COUNT(*) FROM outreach_pipeline)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
