import { createServerClient } from '@/lib/supabase';

export interface ReferralStats {
  totalInvited: number;
  totalSignedUp: number;
  totalActive: number;
  totalQualified: number;
  totalEarnings: number;
  referrals: {
    id: string;
    referred_handle: string;
    status: 'invited' | 'signed_up' | 'active' | 'qualified';
    bonus_amount: number;
    created_at: string;
  }[];
}

export interface LeaderboardEntry {
  creator_id: string;
  tiktok_handle: string;
  display_name: string;
  referral_count: number;
  total_earnings: number;
  tier: string;
}

export class ReferralEngine {
  private supabase: ReturnType<typeof createServerClient>;

  constructor(supabase?: ReturnType<typeof createServerClient>) {
    this.supabase = supabase || createServerClient();
  }

  /**
   * Generate a unique referral code for a creator
   * Uses creator's handle + random suffix if custom not provided
   * Examples: MIABEAUTY, SARA30K
   */
  async generateCode(creatorId: string, customCode?: string): Promise<string> {
    // Check if creator already has an active code
    const { data: existingCode } = await this.supabase
      .from('referral_codes')
      .select('code')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .single();

    if (existingCode) {
      return existingCode.code;
    }

    let newCode: string;

    if (customCode) {
      newCode = customCode.toUpperCase();
    } else {
      // Get creator handle to base code on
      const { data: creator } = await this.supabase
        .from('creators')
        .select('tiktok_handle')
        .eq('id', creatorId)
        .single();

      if (!creator) {
        throw new Error('Creator not found');
      }

      // Generate code from handle + random suffix
      const handle = creator.tiktok_handle
        .replace('@', '')
        .toUpperCase()
        .substring(0, 12);
      const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      newCode = `${handle}${suffix}`;
    }

    // Ensure uniqueness
    let finalCode = newCode;
    let counter = 1;
    while (counter < 100) {
      const { data: existing } = await this.supabase
        .from('referral_codes')
        .select('id')
        .eq('code', finalCode)
        .single();

      if (!existing) {
        break;
      }

      finalCode = `${newCode}${counter}`;
      counter++;
    }

    // Insert the code
    const { data, error } = await this.supabase
      .from('referral_codes')
      .insert({
        creator_id: creatorId,
        code: finalCode,
        is_active: true,
      })
      .select('code')
      .single();

    if (error) {
      throw new Error(`Failed to generate referral code: ${error.message}`);
    }

    return data.code;
  }

  /**
   * Process a new signup that used a referral code
   * Creates a referral record and awards $10 bonus
   */
  async processReferralSignup(
    code: string,
    newCreatorHandle: string,
    email: string
  ): Promise<void> {
    // ARCH-003: Use transactional RPC to ensure atomicity
    const { data, error } = await this.supabase.rpc('process_referral_signup', {
      p_code: code,
      p_referred_handle: newCreatorHandle,
      p_referred_email: email || null,
    });

    if (error) {
      throw new Error(`Referral signup failed: ${error.message}`);
    }
  }

  /**
   * Check and update referral statuses (called by cron/admin)
   * Transitions: invited → signed_up → active → qualified
   * Awards bonuses at each stage
   */
  async updateReferralStatuses(): Promise<{ upgraded: number; bonuses_awarded: number }> {
    let upgraded = 0;
    let bonuses_awarded = 0;

    // Get all pending referrals
    const { data: referrals } = await this.supabase
      .from('referrals')
      .select('*')
      .in('status', ['invited', 'signed_up', 'active'])
      .order('created_at', { ascending: true });

    if (!referrals?.length) {
      return { upgraded: 0, bonuses_awarded: 0 };
    }

    // PERF-002: Batch lookup — fetch all referred creators in ONE query
    const handles = Array.from(new Set(referrals.map(r => r.referred_handle)));
    const { data: creators } = await this.supabase
      .from('creators')
      .select('id, tiktok_handle, total_gmv, source')
      .in('tiktok_handle', handles);

    const creatorMap = new Map(
      (creators || []).map(c => [c.tiktok_handle.toLowerCase(), c])
    );

    // PERF-002: Batch lookup — fetch all content_tracking entries for these creators
    const creatorIds = (creators || []).map(c => c.id);
    const { data: contentEntries } = await this.supabase
      .from('content_tracking')
      .select('creator_id')
      .in('creator_id', creatorIds.length > 0 ? creatorIds : ['__none__']);

    const creatorsWithContent = new Set(
      (contentEntries || []).map(c => c.creator_id)
    );

    // Now loop without any DB queries
    for (const referral of referrals) {
      const creatorData = creatorMap.get(referral.referred_handle.toLowerCase());
      if (!creatorData) continue;

      let newStatus = referral.status;
      let newBonus = referral.bonus_amount;
      let hasChanges = false;

      if (referral.status === 'invited' && creatorData.id) {
        newStatus = 'signed_up';
        newBonus = 10;
        hasChanges = true;
        bonuses_awarded++;
      }

      if (newStatus === 'signed_up' && creatorsWithContent.has(creatorData.id)) {
        newStatus = 'active';
        newBonus = (newBonus || 0) + 25;
        hasChanges = true;
        bonuses_awarded++;
      }

      if (newStatus === 'active' && creatorData.total_gmv >= 500) {
        newStatus = 'qualified';
        newBonus = (newBonus || 0) + 50;
        hasChanges = true;
        bonuses_awarded++;
      }

      if (hasChanges) {
        const { error } = await this.supabase
          .from('referrals')
          .update({
            status: newStatus,
            bonus_amount: newBonus,
            referred_id: creatorData.id,
            qualified_at: newStatus === 'qualified' ? new Date().toISOString() : referral.qualified_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', referral.id);

        if (!error) upgraded++;
      }
    }

    return { upgraded, bonuses_awarded };
  }

  /**
   * Get referral stats for a creator
   */
  async getCreatorReferralStats(creatorId: string): Promise<ReferralStats> {
    const { data: referrals, error } = await this.supabase
      .from('referrals')
      .select('id, referred_handle, status, bonus_amount, created_at')
      .eq('referrer_id', creatorId)
      .order('created_at', { ascending: false });

    if (error || !referrals) {
      throw new Error(`Failed to fetch referral stats: ${error?.message}`);
    }

    const stats: ReferralStats = {
      totalInvited: referrals.length,
      totalSignedUp: referrals.filter((r) => ['signed_up', 'active', 'qualified'].includes(r.status)).length,
      totalActive: referrals.filter((r) => ['active', 'qualified'].includes(r.status)).length,
      totalQualified: referrals.filter((r) => r.status === 'qualified').length,
      totalEarnings: referrals.reduce((sum, r) => sum + (r.bonus_amount || 0), 0),
      referrals: referrals.map((r) => ({
        id: r.id,
        referred_handle: r.referred_handle,
        status: r.status as 'invited' | 'signed_up' | 'active' | 'qualified',
        bonus_amount: r.bonus_amount || 0,
        created_at: r.created_at,
      })),
    };

    return stats;
  }

  /**
   * Get referral leaderboard
   */
  async getReferralLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.supabase
      .from('referrals')
      .select(
        `
        referrer_id,
        bonus_amount,
        creators!referrals_referrer_id_fkey(id, tiktok_handle, display_name, tier)
      `
      )
      .eq('status', 'qualified')
      .order('bonus_amount', { ascending: false });

    if (error || !data) {
      throw new Error(`Failed to fetch leaderboard: ${error?.message}`);
    }

    // Group by referrer and sum earnings
    const leaderboardMap = new Map<string, LeaderboardEntry>();

    for (const referral of data) {
      if (!referral.creators) continue;

      const creator = Array.isArray(referral.creators) ? referral.creators[0] : referral.creators;
      const key = creator.id;

      if (!leaderboardMap.has(key)) {
        leaderboardMap.set(key, {
          creator_id: creator.id,
          tiktok_handle: creator.tiktok_handle,
          display_name: creator.display_name,
          referral_count: 0,
          total_earnings: 0,
          tier: creator.tier,
        });
      }

      const entry = leaderboardMap.get(key)!;
      entry.referral_count++;
      entry.total_earnings += referral.bonus_amount || 0;
    }

    return Array.from(leaderboardMap.values())
      .sort((a, b) => b.total_earnings - a.total_earnings)
      .slice(0, limit);
  }
}

// ARCH-002: Factory function — creates fresh instance per request
export function createReferralEngine() {
  return new ReferralEngine(createServerClient());
}
