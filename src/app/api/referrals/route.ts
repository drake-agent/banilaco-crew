/**
 * /api/referrals → Squad API (referral system fully replaced by Squad revenue share)
 *
 * Legacy referral bonus ($10/$25/$50) is deprecated.
 * This endpoint now serves Squad management:
 * - GET: Squad info + members
 * - POST: Generate/update squad code
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { squadBonusLog } from '@/db/schema/squad';
import { verifyAuth, getCreatorFromAuth } from '@/lib/auth';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * GET /api/referrals — Get squad info for authenticated creator
 */
export async function GET() {
  const result = await getCreatorFromAuth();
  if (result.error) return result.error;

  const { creator, creatorId } = result;

  // Get squad members (creators whose squadLeaderId = this creator)
  const members = await db
    .select({
      id: creators.id,
      tiktokHandle: creators.tiktokHandle,
      displayName: creators.displayName,
      tier: creators.tier,
      monthlyGmv: creators.monthlyGmv,
      joinedAt: creators.joinedAt,
    })
    .from(creators)
    .where(eq(creators.squadLeaderId, creatorId))
    .orderBy(desc(sql`COALESCE(${creators.monthlyGmv}, '0')::numeric`));

  // Get bonus history (last 6 months)
  const bonuses = await db
    .select()
    .from(squadBonusLog)
    .where(eq(squadBonusLog.leaderId, creatorId))
    .orderBy(desc(squadBonusLog.period))
    .limit(6);

  const totalTeamGmv = members.reduce((sum, m) => sum + parseFloat(m.monthlyGmv ?? '0'), 0);
  const squadBonusRate = parseFloat(creator.squadBonusRate ?? '0');
  const monthlyBonus = totalTeamGmv * squadBonusRate;

  return NextResponse.json({
    squad: {
      leaderId: creatorId,
      leaderHandle: creator.tiktokHandle,
      bonusRate: squadBonusRate,
      memberCount: members.length,
      totalTeamGmv: Math.round(totalTeamGmv * 100) / 100,
      estimatedMonthlyBonus: Math.round(monthlyBonus * 100) / 100,
    },
    members: members.map((m) => ({
      ...m,
      monthlyGmv: parseFloat(m.monthlyGmv ?? '0'),
      yourBonus: Math.round(parseFloat(m.monthlyGmv ?? '0') * squadBonusRate * 100) / 100,
    })),
    bonusHistory: bonuses,
  });
}

/**
 * POST /api/referrals — Admin: process squad bonuses for a period
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuth();
  if (authResult.error) return authResult.error;

  if (authResult.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { period } = body; // YYYY-MM

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: 'Valid period (YYYY-MM) required' }, { status: 400 });
  }

  // Find all squad leaders (creators with squadBonusRate > 0)
  const leaders = await db
    .select({
      id: creators.id,
      squadBonusRate: creators.squadBonusRate,
    })
    .from(creators)
    .where(sql`${creators.squadBonusRate}::numeric > 0`);

  let totalBonuses = 0;

  for (const leader of leaders) {
    const members = await db
      .select({ id: creators.id, monthlyGmv: creators.monthlyGmv })
      .from(creators)
      .where(eq(creators.squadLeaderId, leader.id));

    for (const member of members) {
      const memberGmv = parseFloat(member.monthlyGmv ?? '0');
      if (memberGmv <= 0) continue;

      const bonusRate = parseFloat(leader.squadBonusRate ?? '0');
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
          target: [squadBonusLog.leaderId, squadBonusLog.memberId, squadBonusLog.period],
          set: {
            memberGmv: memberGmv.toString(),
            bonusAmount: bonusAmount.toString(),
          },
        });

      totalBonuses++;
    }
  }

  return NextResponse.json({
    message: `Squad bonuses processed for ${period}`,
    leadersProcessed: leaders.length,
    bonusEntriesCreated: totalBonuses,
  });
}
