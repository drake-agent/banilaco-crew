/**
 * Squad Engine (formerly Referral Engine)
 *
 * Legacy referral bonuses ($10/$25/$50) are deprecated.
 * This engine now manages Squad revenue share (2-5% of team GMV).
 */

import { db } from '@/db';
import { creators, type PinkTier, TIER_CONFIG } from '@/db/schema/creators';
import { squadBonusLog } from '@/db/schema/squad';
import { eq, desc, sql } from 'drizzle-orm';

export interface SquadStats {
  memberCount: number;
  totalTeamGmv: number;
  bonusRate: number;
  estimatedMonthlyBonus: number;
  members: {
    id: string;
    tiktokHandle: string;
    displayName: string | null;
    tier: string;
    monthlyGmv: number;
    yourBonus: number;
  }[];
}

export interface SquadLeaderboardEntry {
  creatorId: string;
  tiktokHandle: string;
  displayName: string | null;
  tier: string;
  memberCount: number;
  totalTeamGmv: number;
  totalBonus: number;
}

export class SquadEngine {
  /**
   * Get squad stats for a creator (leader perspective)
   */
  async getSquadStats(leaderId: string): Promise<SquadStats> {
    const [leader] = await db
      .select({ squadBonusRate: creators.squadBonusRate })
      .from(creators)
      .where(eq(creators.id, leaderId))
      .limit(1);

    const bonusRate = parseFloat(leader?.squadBonusRate ?? '0');

    const members = await db
      .select({
        id: creators.id,
        tiktokHandle: creators.tiktokHandle,
        displayName: creators.displayName,
        tier: creators.tier,
        monthlyGmv: creators.monthlyGmv,
      })
      .from(creators)
      .where(eq(creators.squadLeaderId, leaderId))
      .orderBy(desc(sql`COALESCE(${creators.monthlyGmv}, '0')::numeric`));

    const totalTeamGmv = members.reduce(
      (sum, m) => sum + parseFloat(m.monthlyGmv ?? '0'), 0,
    );

    return {
      memberCount: members.length,
      totalTeamGmv: Math.round(totalTeamGmv * 100) / 100,
      bonusRate,
      estimatedMonthlyBonus: Math.round(totalTeamGmv * bonusRate * 100) / 100,
      members: members.map((m) => {
        const gmv = parseFloat(m.monthlyGmv ?? '0');
        return {
          id: m.id,
          tiktokHandle: m.tiktokHandle,
          displayName: m.displayName,
          tier: m.tier,
          monthlyGmv: gmv,
          yourBonus: Math.round(gmv * bonusRate * 100) / 100,
        };
      }),
    };
  }

  /**
   * Calculate and store squad bonuses for a period (monthly Cron)
   */
  async calculateSquadBonuses(period: string): Promise<{
    leadersProcessed: number;
    bonusEntriesCreated: number;
    totalBonusAmount: number;
  }> {
    // Find all squad leaders with bonus rate > 0
    const leaders = await db
      .select({ id: creators.id, squadBonusRate: creators.squadBonusRate })
      .from(creators)
      .where(sql`${creators.squadBonusRate}::numeric > 0`);

    let bonusEntriesCreated = 0;
    let totalBonusAmount = 0;

    for (const leader of leaders) {
      const members = await db
        .select({ id: creators.id, monthlyGmv: creators.monthlyGmv })
        .from(creators)
        .where(eq(creators.squadLeaderId, leader.id));

      const bonusRate = parseFloat(leader.squadBonusRate ?? '0');

      for (const member of members) {
        const memberGmv = parseFloat(member.monthlyGmv ?? '0');
        if (memberGmv <= 0) continue;

        const bonusAmount = memberGmv * bonusRate;

        await db
          .insert(squadBonusLog)
          .values({
            leaderId: leader.id,
            memberId: member.id,
            period,
            memberGmv: memberGmv.toString(),
            bonusRate: bonusRate.toString(),
            bonusAmount: bonusAmount.toString(),
            status: 'pending',
          })
          .onConflictDoUpdate({
            target: [squadBonusLog.leaderId, squadBonusLog.memberId],
            set: {
              memberGmv: memberGmv.toString(),
              bonusAmount: bonusAmount.toString(),
            },
          });

        bonusEntriesCreated++;
        totalBonusAmount += bonusAmount;
      }
    }

    return {
      leadersProcessed: leaders.length,
      bonusEntriesCreated,
      totalBonusAmount: Math.round(totalBonusAmount * 100) / 100,
    };
  }

  /**
   * Get squad leaderboard (top squads by total team GMV)
   */
  async getSquadLeaderboard(limit = 10): Promise<SquadLeaderboardEntry[]> {
    // Get all leaders
    const leaders = await db
      .select({
        id: creators.id,
        tiktokHandle: creators.tiktokHandle,
        displayName: creators.displayName,
        tier: creators.tier,
        squadBonusRate: creators.squadBonusRate,
      })
      .from(creators)
      .where(sql`${creators.squadBonusRate}::numeric > 0`);

    const entries: SquadLeaderboardEntry[] = [];

    for (const leader of leaders) {
      const members = await db
        .select({ monthlyGmv: creators.monthlyGmv })
        .from(creators)
        .where(eq(creators.squadLeaderId, leader.id));

      const totalTeamGmv = members.reduce(
        (sum, m) => sum + parseFloat(m.monthlyGmv ?? '0'), 0,
      );
      const bonusRate = parseFloat(leader.squadBonusRate ?? '0');

      entries.push({
        creatorId: leader.id,
        tiktokHandle: leader.tiktokHandle,
        displayName: leader.displayName,
        tier: leader.tier,
        memberCount: members.length,
        totalTeamGmv: Math.round(totalTeamGmv * 100) / 100,
        totalBonus: Math.round(totalTeamGmv * bonusRate * 100) / 100,
      });
    }

    return entries
      .sort((a, b) => b.totalTeamGmv - a.totalTeamGmv)
      .slice(0, limit);
  }

  /**
   * Link a new member to a squad (when they join with a squad code)
   */
  async joinSquad(memberId: string, leaderId: string): Promise<void> {
    await db
      .update(creators)
      .set({ squadLeaderId: leaderId, updatedAt: new Date() })
      .where(eq(creators.id, memberId));
  }
}

// Factory
export function createSquadEngine(): SquadEngine {
  return new SquadEngine();
}

// Legacy compat
export const createReferralEngine = createSquadEngine;
