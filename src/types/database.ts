// ============================================
// Banilaco Crew - Database Types
// ============================================

export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type CreatorSource = 'open_collab' | 'dm_outreach' | 'mcn' | 'buyer_to_creator' | 'referral' | 'paid';
export type CreatorStatus = 'pending' | 'active' | 'inactive' | 'churned';

export type SampleStatus = 'requested' | 'approved' | 'shipped' | 'delivered' | 'reminder_1' | 'reminder_2' | 'content_posted' | 'no_response';
export type SampleSetType = 'hero' | 'premium' | 'mini';

export type OutreachStatus = 'identified' | 'dm_sent' | 'responded' | 'sample_requested' | 'converted' | 'declined' | 'no_response';
export type OutreachChannel = 'tiktok_dm' | 'instagram_dm' | 'email' | 'mcn_referral';
export type OutreachTierType = 'tier_a' | 'tier_b';

export interface Creator {
  id: string;
  tiktok_handle: string;
  tiktok_id?: string;
  display_name?: string;
  email?: string;
  instagram_handle?: string;
  follower_count: number;
  avg_views: number;
  engagement_rate: number;
  tier: CreatorTier;
  source: CreatorSource;
  status: CreatorStatus;
  mcn_name?: string;
  total_gmv: number;
  monthly_gmv: number;
  total_content_count: number;
  monthly_content_count: number;
  commission_rate: number;
  joined_at: string;
  last_active_at?: string;
  last_content_at?: string;
  notes?: string;
  tags: string[];
  competitor_brands: string[];
  created_at: string;
  updated_at: string;
}

export interface SampleShipment {
  id: string;
  creator_id: string;
  creator?: Creator;
  set_type: SampleSetType;
  status: SampleStatus;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  reminder_1_sent_at?: string;
  reminder_2_sent_at?: string;
  content_posted_at?: string;
  content_url?: string;
  content_gmv: number;
  sku_list: any[];
  estimated_cost?: number;
  shipping_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachRecord {
  id: string;
  tiktok_handle: string;
  display_name?: string;
  email?: string;
  instagram_handle?: string;
  outreach_tier: OutreachTierType;
  status: OutreachStatus;
  channel?: OutreachChannel;
  source_competitor?: string;
  competitor_gmv: number;
  follower_count: number;
  dm_sent_at?: string;
  responded_at?: string;
  converted_at?: string;
  dm_template_version?: string;
  creator_id?: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MCNPartner {
  id: string;
  name: string;
  type: string;
  contact_name?: string;
  contact_email?: string;
  monthly_retainer: number;
  commission_share: number;
  contract_start?: string;
  contract_end?: string;
  total_creators_matched: number;
  active_creators: number;
  total_gmv: number;
  weekly_target: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyKPI {
  id: string;
  week_number: number;
  week_start: string;
  week_end: string;
  cumulative_affiliates: number;
  weekly_new_affiliates: number;
  weekly_churned: number;
  weekly_net_increase: number;
  monthly_active_creators: number;
  weekly_content_count: number;
  monthly_gmv: number;
  weekly_gmv: number;
  open_collab_new: number;
  dm_outreach_new: number;
  mcn_new: number;
  buyer_to_creator_new: number;
  referral_new: number;
  dm_sent: number;
  dm_response_rate: number;
  sample_shipped: number;
  sample_post_rate: number;
  gmv_max_daily_budget: number;
  gmv_max_total_gmv: number;
  gmv_max_roas: number;
  discord_members: number;
  weeks_to_30k?: number;
  notes?: string;
  created_at: string;
}

export interface JoinApplication {
  id: string;
  tiktok_handle: string;
  display_name?: string;
  email: string;
  instagram_handle?: string;
  follower_count?: number;
  content_categories: string[];
  why_join?: string;
  competitor_experience: string[];
  status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

// Dashboard summary types
export interface DashboardSummary {
  totalCreators: number;
  activeCreators: number;
  weeklyNetIncrease: number;
  weeksTo30K: number;
  totalGMV: number;
  monthlyGMV: number;
  pendingSamples: number;
  samplePostRate: number;
  outreachPipelineCount: number;
  dmResponseRate: number;
  tierBreakdown: {
    bronze: number;
    silver: number;
    gold: number;
    diamond: number;
  };
  sourceBreakdown: {
    open_collab: number;
    dm_outreach: number;
    mcn: number;
    buyer_to_creator: number;
    referral: number;
    paid: number;
  };
}
