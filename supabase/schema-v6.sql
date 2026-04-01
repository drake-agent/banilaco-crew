-- ============================================
-- Schema V6: Sample Tracking Enhancement
--
-- New tables:
--   - content_tracking (크리에이터 콘텐츠 게시 추적)
--   - sample_allocation_rules (티어별 샘플 자동 할당 규칙)
--
-- New views:
--   - v_sample_roi (샘플 발송 ROI 분석)
--   - v_sample_pipeline (샘플 파이프라인 현황)
--
-- Modified tables:
--   - sample_shipments (add product_ids, aftership_id columns)
-- ============================================

-- ===================================
-- 1. Content Tracking
-- ===================================
-- ReminderEngine.autoDetectContentPosted()에서 참조
-- TikTok API 또는 수동 입력으로 채워짐

CREATE TABLE IF NOT EXISTS content_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES sample_shipments(id) ON DELETE SET NULL,

  -- Content info
  video_url TEXT NOT NULL,
  video_id TEXT,                          -- TikTok video ID
  title TEXT,
  description TEXT,

  -- Performance metrics (TikTok API에서 가져옴)
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  gmv_attributed DECIMAL(12,2) DEFAULT 0, -- 이 콘텐츠로 발생한 GMV

  -- Product tagging
  product_ids JSONB DEFAULT '[]',         -- 태그된 바닐라코 제품 ID 리스트

  -- Timestamps
  posted_at TIMESTAMPTZ,                  -- 콘텐츠 게시 시간
  detected_at TIMESTAMPTZ DEFAULT now(),  -- 시스템이 감지한 시간
  metrics_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_creator_posted
  ON content_tracking(creator_id, posted_at DESC);

CREATE INDEX idx_content_shipment
  ON content_tracking(shipment_id)
  WHERE shipment_id IS NOT NULL;

CREATE INDEX idx_content_video_id
  ON content_tracking(video_id)
  WHERE video_id IS NOT NULL;

-- Auto-update timestamp
CREATE TRIGGER content_tracking_updated_at
  BEFORE UPDATE ON content_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE content_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_tracking_admin_all" ON content_tracking
  FOR ALL USING (is_admin());

CREATE POLICY "content_tracking_creator_read_own" ON content_tracking
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM creators WHERE tiktok_handle = current_setting('app.current_user_handle', true)
    )
  );


-- ===================================
-- 2. Sample Allocation Rules
-- ===================================
-- 티어별 자동 샘플 할당 규칙
-- 티어가 변경되면 이 규칙에 따라 샘플 요청 자동 생성

CREATE TABLE IF NOT EXISTS sample_allocation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
  set_type TEXT NOT NULL CHECK (set_type IN ('hero', 'premium', 'mini')),

  -- What to send
  sku_list JSONB NOT NULL DEFAULT '[]',     -- [{ "sku": "BAN-CLN-01", "name": "Clean It Zero", "qty": 1 }]
  description TEXT,                          -- "Welcome Kit — Hero Set"

  -- Rules
  is_active BOOLEAN DEFAULT true,
  auto_approve BOOLEAN DEFAULT false,        -- true면 승인 없이 바로 발송 큐
  cooldown_days INTEGER DEFAULT 90,          -- 같은 크리에이터에게 재발송 대기 일수
  max_per_month INTEGER DEFAULT 50,          -- 월 최대 발송 수
  priority INTEGER DEFAULT 0,               -- 높을수록 우선 (같은 티어에 여러 규칙일 때)

  -- Cost tracking
  estimated_cost DECIMAL(8,2) DEFAULT 0,    -- 세트당 예상 원가
  estimated_shipping DECIMAL(8,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_allocation_tier_set
  ON sample_allocation_rules(tier, set_type)
  WHERE is_active = true;

-- RLS: admin only
ALTER TABLE sample_allocation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allocation_rules_admin_only" ON sample_allocation_rules
  FOR ALL USING (is_admin());


-- ===================================
-- 3. Extend sample_shipments
-- ===================================

-- AfterShip tracking ID (for webhook matching)
ALTER TABLE sample_shipments
  ADD COLUMN IF NOT EXISTS aftership_id TEXT;

-- Link to allocation rule that triggered this shipment
ALTER TABLE sample_shipments
  ADD COLUMN IF NOT EXISTS allocation_rule_id UUID REFERENCES sample_allocation_rules(id);

-- Product IDs included in this shipment
ALTER TABLE sample_shipments
  ADD COLUMN IF NOT EXISTS product_ids JSONB DEFAULT '[]';

CREATE INDEX idx_shipments_aftership
  ON sample_shipments(aftership_id)
  WHERE aftership_id IS NOT NULL;


-- ===================================
-- 4. Sample ROI View
-- ===================================
-- 샘플 발송 대비 ROI 분석

CREATE OR REPLACE VIEW v_sample_roi AS
SELECT
  ss.id AS shipment_id,
  ss.creator_id,
  c.tiktok_handle,
  c.display_name,
  c.tier,
  ss.set_type,
  ss.status AS shipment_status,
  ss.shipped_at,
  ss.delivered_at,
  ss.content_posted_at,

  -- Cost
  COALESCE(ss.estimated_cost, 0) + COALESCE(ss.shipping_cost, 0) AS total_cost,

  -- Content metrics (aggregated)
  COALESCE(ct.content_count, 0) AS content_count,
  COALESCE(ct.total_views, 0) AS total_views,
  COALESCE(ct.total_gmv, 0) AS total_gmv_attributed,

  -- ROI calculation
  CASE
    WHEN COALESCE(ss.estimated_cost, 0) + COALESCE(ss.shipping_cost, 0) > 0
    THEN ROUND(
      (COALESCE(ct.total_gmv, 0) /
       (COALESCE(ss.estimated_cost, 0) + COALESCE(ss.shipping_cost, 0))) * 100,
      1
    )
    ELSE 0
  END AS roi_pct,

  -- Time metrics
  CASE
    WHEN ss.delivered_at IS NOT NULL AND ss.content_posted_at IS NOT NULL
    THEN EXTRACT(DAY FROM (ss.content_posted_at - ss.delivered_at))
    ELSE NULL
  END AS days_to_content,

  CASE
    WHEN ss.shipped_at IS NOT NULL AND ss.delivered_at IS NOT NULL
    THEN EXTRACT(DAY FROM (ss.delivered_at - ss.shipped_at))
    ELSE NULL
  END AS delivery_days

FROM sample_shipments ss
JOIN creators c ON c.id = ss.creator_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS content_count,
    COALESCE(SUM(views), 0) AS total_views,
    COALESCE(SUM(gmv_attributed), 0) AS total_gmv
  FROM content_tracking ct2
  WHERE ct2.shipment_id = ss.id
) ct ON true;


-- ===================================
-- 5. Sample Pipeline View
-- ===================================
-- 샘플 파이프라인 현황 (퍼널)

CREATE OR REPLACE VIEW v_sample_pipeline AS
SELECT
  ss.set_type,
  COUNT(*) FILTER (WHERE ss.status = 'requested') AS requested,
  COUNT(*) FILTER (WHERE ss.status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE ss.status = 'shipped') AS shipped,
  COUNT(*) FILTER (WHERE ss.status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE ss.status = 'reminder_1') AS reminder_1,
  COUNT(*) FILTER (WHERE ss.status = 'reminder_2') AS reminder_2,
  COUNT(*) FILTER (WHERE ss.status = 'content_posted') AS content_posted,
  COUNT(*) FILTER (WHERE ss.status = 'no_response') AS no_response,
  COUNT(*) AS total,

  -- Conversion rates
  ROUND(
    COUNT(*) FILTER (WHERE ss.status = 'content_posted')::DECIMAL /
    NULLIF(COUNT(*) FILTER (WHERE ss.status IN ('delivered', 'reminder_1', 'reminder_2', 'content_posted', 'no_response')), 0) * 100,
    1
  ) AS content_rate_pct,

  -- Cost
  SUM(COALESCE(ss.estimated_cost, 0) + COALESCE(ss.shipping_cost, 0)) AS total_cost

FROM sample_shipments ss
GROUP BY ss.set_type;


-- ===================================
-- 6. Auto-create sample on tier upgrade
-- ===================================
-- 크리에이터 티어가 올라가면 자동으로 샘플 요청 생성

CREATE OR REPLACE FUNCTION auto_allocate_sample()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  last_shipment TIMESTAMPTZ;
BEGIN
  -- Only fire when tier actually changes (upgrade)
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN

    -- Find active allocation rule for new tier
    SELECT * INTO rule
    FROM sample_allocation_rules
    WHERE tier = NEW.tier
      AND is_active = true
    ORDER BY priority DESC
    LIMIT 1;

    IF rule IS NULL THEN
      RETURN NEW;  -- No rule for this tier
    END IF;

    -- Check cooldown: don't send if recently shipped
    SELECT MAX(created_at) INTO last_shipment
    FROM sample_shipments
    WHERE creator_id = NEW.id
      AND allocation_rule_id = rule.id;

    IF last_shipment IS NOT NULL
       AND last_shipment > (now() - (rule.cooldown_days || ' days')::INTERVAL) THEN
      RETURN NEW;  -- Within cooldown
    END IF;

    -- Check monthly cap
    IF (
      SELECT COUNT(*)
      FROM sample_shipments
      WHERE allocation_rule_id = rule.id
        AND created_at >= date_trunc('month', now())
    ) >= rule.max_per_month THEN
      RETURN NEW;  -- Monthly cap reached
    END IF;

    -- Create sample shipment request
    INSERT INTO sample_shipments (
      creator_id,
      set_type,
      status,
      sku_list,
      estimated_cost,
      shipping_cost,
      allocation_rule_id,
      product_ids,
      notes
    ) VALUES (
      NEW.id,
      rule.set_type::sample_set_type,
      CASE WHEN rule.auto_approve THEN 'approved' ELSE 'requested' END::sample_status,
      rule.sku_list,
      rule.estimated_cost,
      rule.estimated_shipping,
      rule.id,
      rule.sku_list,  -- product_ids = sku_list for now
      'Auto-allocated on tier upgrade to ' || NEW.tier
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS trg_auto_allocate_sample ON creators;
CREATE TRIGGER trg_auto_allocate_sample
  AFTER UPDATE ON creators
  FOR EACH ROW
  EXECUTE FUNCTION auto_allocate_sample();


-- ===================================
-- 7. Seed default allocation rules
-- ===================================

INSERT INTO sample_allocation_rules (tier, set_type, description, sku_list, auto_approve, cooldown_days, max_per_month, estimated_cost, estimated_shipping, priority)
VALUES
  ('bronze', 'mini', 'Welcome Kit — Mini Set', '[{"sku": "BAN-CLN-MINI", "name": "Clean It Zero Mini", "qty": 1}, {"sku": "BAN-LIP-MINI", "name": "Lip Tint Mini", "qty": 1}]'::jsonb, false, 180, 100, 12.00, 5.50, 1),
  ('silver', 'hero', 'Silver Tier — Hero Set', '[{"sku": "BAN-CLN-01", "name": "Clean It Zero Original", "qty": 1}, {"sku": "BAN-CLN-02", "name": "Clean It Zero Purifying", "qty": 1}, {"sku": "BAN-LIP-01", "name": "Velvet Lip Tint", "qty": 1}]'::jsonb, false, 90, 50, 28.00, 5.50, 1),
  ('gold', 'premium', 'Gold Tier — Premium Set', '[{"sku": "BAN-CLN-01", "name": "Clean It Zero Original", "qty": 1}, {"sku": "BAN-CLN-02", "name": "Clean It Zero Purifying", "qty": 1}, {"sku": "BAN-SKIN-01", "name": "Dear Hydration Toner", "qty": 1}, {"sku": "BAN-LIP-01", "name": "Velvet Lip Tint", "qty": 2}]'::jsonb, true, 60, 30, 52.00, 5.50, 1),
  ('diamond', 'premium', 'Diamond Tier — Full Collection', '[{"sku": "BAN-CLN-01", "name": "Clean It Zero Original", "qty": 1}, {"sku": "BAN-CLN-02", "name": "Clean It Zero Purifying", "qty": 1}, {"sku": "BAN-CLN-03", "name": "Clean It Zero Nourishing", "qty": 1}, {"sku": "BAN-SKIN-01", "name": "Dear Hydration Toner", "qty": 1}, {"sku": "BAN-SKIN-02", "name": "Dear Hydration Cream", "qty": 1}, {"sku": "BAN-LIP-01", "name": "Velvet Lip Tint", "qty": 3}]'::jsonb, true, 45, 20, 89.00, 5.50, 1)
ON CONFLICT DO NOTHING;
