-- ============================================
-- Banilaco Crew - Schema V3 Additions
-- Referral Program System
-- ============================================

-- Referral codes table (each creator gets a unique code)
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,  -- e.g. 'MIABEAUTY', 'SARA30'
  uses_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_creator ON referral_codes(creator_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- Referral tracking table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES creators(id),      -- who referred
  referred_id UUID REFERENCES creators(id),                -- who was referred (after conversion)
  referral_code VARCHAR(20) NOT NULL,
  referred_handle VARCHAR(100) NOT NULL,                   -- TikTok handle of referred person
  referred_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'invited',                    -- 'invited', 'signed_up', 'active', 'qualified'
  bonus_amount DECIMAL(8,2) DEFAULT 0,                     -- bonus earned
  bonus_paid BOOLEAN DEFAULT false,
  qualified_at TIMESTAMPTZ,                                -- when referred creator hit qualification criteria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_codes
CREATE POLICY "Creators see own referral codes"
  ON referral_codes FOR SELECT TO authenticated
  USING (creator_id IN (SELECT creator_id FROM creator_accounts WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins manage all referral codes"
  ON referral_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS Policies for referrals
CREATE POLICY "Creators see own referrals (as referrer)"
  ON referrals FOR SELECT TO authenticated
  USING (referrer_id IN (SELECT creator_id FROM creator_accounts WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins manage all referrals"
  ON referrals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- Bonus calculation rules (tracked in comments)
-- ============================================
-- $10 when referred creator signs up (status = 'signed_up')
-- $25 when referred creator posts first content (status = 'active')
-- $50 when referred creator hits $500 GMV (status = 'qualified')
-- Total possible: $85 per successful referral
