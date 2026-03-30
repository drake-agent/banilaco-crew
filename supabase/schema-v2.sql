-- ============================================
-- Banilaco Crew - Schema V2 Additions
-- Creator Dashboard & Auth Support
-- ============================================

-- Creator auth accounts (links Supabase Auth to creator profile)
CREATE TABLE creator_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE, -- Supabase Auth user ID
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creator_accounts_auth ON creator_accounts(auth_user_id);
CREATE INDEX idx_creator_accounts_creator ON creator_accounts(creator_id);

-- Creator improvement recommendations (generated/cached)
CREATE TABLE creator_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  category VARCHAR(50) NOT NULL, -- 'hook', 'format', 'posting', 'cta', 'timing'
  priority VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
  current_state TEXT,
  recommendation TEXT NOT NULL,
  expected_impact TEXT,

  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recommendations_creator ON creator_recommendations(creator_id);

-- Creator earnings / payout tracking
CREATE TABLE creator_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  total_gmv DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 30,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  total_payout DECIMAL(10,2) DEFAULT 0,

  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'paid'
  paid_at TIMESTAMPTZ,
  payment_method VARCHAR(50), -- 'paypal', 'bank_transfer'
  payment_reference VARCHAR(200),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX idx_payouts_status ON creator_payouts(status);

-- RLS policies for creator-facing access
ALTER TABLE creator_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;

-- Creators can only see their own data
CREATE POLICY "Creators see own account"
  ON creator_accounts FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Creators see own recommendations"
  ON creator_recommendations FOR SELECT TO authenticated
  USING (creator_id IN (SELECT creator_id FROM creator_accounts WHERE auth_user_id = auth.uid()));

CREATE POLICY "Creators see own payouts"
  ON creator_payouts FOR SELECT TO authenticated
  USING (creator_id IN (SELECT creator_id FROM creator_accounts WHERE auth_user_id = auth.uid()));

-- Authenticated admins can manage all
CREATE POLICY "Admins manage accounts"
  ON creator_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage recommendations"
  ON creator_recommendations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage payouts"
  ON creator_payouts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- RPC: increment_creator_gmv
-- sync-orchestrator에서 주문 동기화 시 호출
-- ============================================
CREATE OR REPLACE FUNCTION increment_creator_gmv(
  p_creator_id UUID,
  p_gmv_amount DECIMAL
)
RETURNS void AS $$
BEGIN
  UPDATE creators
  SET
    monthly_gmv = monthly_gmv + p_gmv_amount,
    total_gmv = total_gmv + p_gmv_amount,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE id = p_creator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- content_tracking: tiktok_video_id UNIQUE 제약 추가
-- (upsert onConflict 에 필요)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'content_tracking_tiktok_video_id_key'
  ) THEN
    ALTER TABLE content_tracking ADD CONSTRAINT content_tracking_tiktok_video_id_key UNIQUE (tiktok_video_id);
  END IF;
END $$;

-- ============================================
-- RPC: increment_referral_code_uses
-- referral-engine에서 코드 사용 시 호출
-- ============================================
CREATE OR REPLACE FUNCTION increment_referral_code_uses(
  p_code VARCHAR
)
RETURNS void AS $$
BEGIN
  UPDATE referral_codes
  SET uses_count = uses_count + 1,
      updated_at = NOW()
  WHERE code = p_code AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Performance Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_content_creator_posted ON content_tracking(creator_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_creators_monthly_gmv_desc ON creators(monthly_gmv DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_creators_created_at ON creators(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_samples_creator_status ON sample_shipments(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creators_total_gmv ON creators(total_gmv DESC) WHERE status = 'active';
