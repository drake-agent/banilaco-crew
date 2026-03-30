-- ============================================
-- Banilaco Crew - Database Schema
-- TikTok Shop Affiliate Management Platform
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE creator_tier AS ENUM ('bronze', 'silver', 'gold', 'diamond');
CREATE TYPE creator_source AS ENUM ('open_collab', 'dm_outreach', 'mcn', 'buyer_to_creator', 'referral', 'paid');
CREATE TYPE creator_status AS ENUM ('pending', 'active', 'inactive', 'churned');

CREATE TYPE sample_status AS ENUM ('requested', 'approved', 'shipped', 'delivered', 'reminder_1', 'reminder_2', 'content_posted', 'no_response');
CREATE TYPE sample_set_type AS ENUM ('hero', 'premium', 'mini');

CREATE TYPE outreach_status AS ENUM ('identified', 'dm_sent', 'responded', 'sample_requested', 'converted', 'declined', 'no_response');
CREATE TYPE outreach_channel AS ENUM ('tiktok_dm', 'instagram_dm', 'email', 'mcn_referral');
CREATE TYPE outreach_tier AS ENUM ('tier_a', 'tier_b');

-- ============================================
-- TABLES
-- ============================================

-- 1. Creators (크리에이터 DB)
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tiktok_handle VARCHAR(100) NOT NULL,
  tiktok_id VARCHAR(100),
  display_name VARCHAR(200),
  email VARCHAR(255),
  instagram_handle VARCHAR(100),

  -- Profile metrics
  follower_count INTEGER DEFAULT 0,
  avg_views INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,

  -- Affiliate metrics
  tier creator_tier DEFAULT 'bronze',
  source creator_source NOT NULL,
  status creator_status DEFAULT 'pending',
  mcn_name VARCHAR(200),

  -- Performance
  total_gmv DECIMAL(12,2) DEFAULT 0,
  monthly_gmv DECIMAL(12,2) DEFAULT 0,
  total_content_count INTEGER DEFAULT 0,
  monthly_content_count INTEGER DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 30.00,

  -- Dates
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  last_content_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  competitor_brands TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sample Shipments (샘플 발송 관리)
CREATE TABLE sample_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  set_type sample_set_type NOT NULL DEFAULT 'hero',
  status sample_status NOT NULL DEFAULT 'requested',

  -- Shipping info
  tracking_number VARCHAR(100),
  carrier VARCHAR(50),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Reminders
  reminder_1_sent_at TIMESTAMPTZ,
  reminder_2_sent_at TIMESTAMPTZ,

  -- Content tracking
  content_posted_at TIMESTAMPTZ,
  content_url TEXT,
  content_gmv DECIMAL(12,2) DEFAULT 0,

  -- SKU details
  sku_list JSONB DEFAULT '[]',
  estimated_cost DECIMAL(8,2),
  shipping_cost DECIMAL(8,2),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Outreach Pipeline (아웃리치 파이프라인)
CREATE TABLE outreach_pipeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Target info
  tiktok_handle VARCHAR(100) NOT NULL,
  display_name VARCHAR(200),
  email VARCHAR(255),
  instagram_handle VARCHAR(100),

  -- Classification
  outreach_tier outreach_tier NOT NULL DEFAULT 'tier_b',
  status outreach_status NOT NULL DEFAULT 'identified',
  channel outreach_channel,

  -- Source/competitor info
  source_competitor VARCHAR(200),
  competitor_gmv DECIMAL(12,2) DEFAULT 0,
  follower_count INTEGER DEFAULT 0,

  -- Tracking
  dm_sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  dm_template_version VARCHAR(10),

  -- If converted, link to creator
  creator_id UUID REFERENCES creators(id),

  -- Assigned to
  assigned_to VARCHAR(200),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MCN Partners
CREATE TABLE mcn_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'large', 'niche', 'ai_platform'

  contact_name VARCHAR(200),
  contact_email VARCHAR(255),

  -- Contract details
  monthly_retainer DECIMAL(10,2) DEFAULT 0,
  commission_share DECIMAL(5,2) DEFAULT 0,
  contract_start DATE,
  contract_end DATE,

  -- Performance
  total_creators_matched INTEGER DEFAULT 0,
  active_creators INTEGER DEFAULT 0,
  total_gmv DECIMAL(12,2) DEFAULT 0,

  -- Targets
  weekly_target INTEGER DEFAULT 0,

  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Weekly KPI Snapshots (주간 KPI)
CREATE TABLE weekly_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,

  -- Primary KPIs
  cumulative_affiliates INTEGER DEFAULT 0,
  weekly_new_affiliates INTEGER DEFAULT 0,
  weekly_churned INTEGER DEFAULT 0,
  weekly_net_increase INTEGER DEFAULT 0,

  monthly_active_creators INTEGER DEFAULT 0,
  weekly_content_count INTEGER DEFAULT 0,
  monthly_gmv DECIMAL(12,2) DEFAULT 0,
  weekly_gmv DECIMAL(12,2) DEFAULT 0,

  -- Channel breakdown
  open_collab_new INTEGER DEFAULT 0,
  dm_outreach_new INTEGER DEFAULT 0,
  mcn_new INTEGER DEFAULT 0,
  buyer_to_creator_new INTEGER DEFAULT 0,
  referral_new INTEGER DEFAULT 0,

  -- Secondary KPIs
  dm_sent INTEGER DEFAULT 0,
  dm_response_rate DECIMAL(5,2) DEFAULT 0,
  sample_shipped INTEGER DEFAULT 0,
  sample_post_rate DECIMAL(5,2) DEFAULT 0,

  -- Ad performance
  gmv_max_daily_budget DECIMAL(10,2) DEFAULT 0,
  gmv_max_total_gmv DECIMAL(12,2) DEFAULT 0,
  gmv_max_roas DECIMAL(5,2) DEFAULT 0,

  -- Community
  discord_members INTEGER DEFAULT 0,

  -- Projections
  weeks_to_30k DECIMAL(4,1),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Content Tracking
CREATE TABLE content_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

  tiktok_video_id VARCHAR(100),
  video_url TEXT,

  -- Performance
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  gmv DECIMAL(12,2) DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  cvr DECIMAL(5,2) DEFAULT 0,

  -- Classification
  content_type VARCHAR(50), -- 'routine', 'grwm', 'asmr', 'before_after', 'price_compare'
  hook_type VARCHAR(100),
  sku_featured TEXT[],

  -- Spark Ads
  is_spark_ad BOOLEAN DEFAULT FALSE,
  spark_ad_code VARCHAR(100),

  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Weekly Challenges
CREATE TABLE weekly_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  prize_amount DECIMAL(8,2),
  prize_description TEXT,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  winner_creator_id UUID REFERENCES creators(id),
  status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'active', 'completed'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Join Applications (공개 신청)
CREATE TABLE join_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tiktok_handle VARCHAR(100) NOT NULL,
  display_name VARCHAR(200),
  email VARCHAR(255) NOT NULL,
  instagram_handle VARCHAR(100),

  follower_count INTEGER,
  content_categories TEXT[] DEFAULT '{}',
  why_join TEXT,
  competitor_experience TEXT[] DEFAULT '{}',

  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by VARCHAR(200),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_creators_tier ON creators(tier);
CREATE INDEX idx_creators_status ON creators(status);
CREATE INDEX idx_creators_source ON creators(source);
CREATE INDEX idx_creators_monthly_gmv ON creators(monthly_gmv DESC);
CREATE INDEX idx_creators_tiktok_handle ON creators(tiktok_handle);

CREATE INDEX idx_samples_status ON sample_shipments(status);
CREATE INDEX idx_samples_creator ON sample_shipments(creator_id);

CREATE INDEX idx_outreach_status ON outreach_pipeline(status);
CREATE INDEX idx_outreach_tier ON outreach_pipeline(outreach_tier);
CREATE INDEX idx_outreach_source ON outreach_pipeline(source_competitor);

CREATE INDEX idx_weekly_kpis_week ON weekly_kpis(week_number);
CREATE INDEX idx_content_creator ON content_tracking(creator_id);
CREATE INDEX idx_content_posted ON content_tracking(posted_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_updated_at BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER samples_updated_at BEFORE UPDATE ON sample_shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER outreach_updated_at BEFORE UPDATE ON outreach_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER mcn_updated_at BEFORE UPDATE ON mcn_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate tier based on monthly GMV
CREATE OR REPLACE FUNCTION auto_update_tier()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_auto_tier BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION auto_update_tier();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcn_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_applications ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by backend API routes)
-- Authenticated users (dashboard team) have full CRUD
CREATE POLICY "Authenticated users can manage creators"
  ON creators FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage samples"
  ON sample_shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage outreach"
  ON outreach_pipeline FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage mcn"
  ON mcn_partners FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage kpis"
  ON weekly_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage content"
  ON content_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage challenges"
  ON weekly_challenges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public can insert join applications (the public signup form)
CREATE POLICY "Anyone can submit join application"
  ON join_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated users can manage applications"
  ON join_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
