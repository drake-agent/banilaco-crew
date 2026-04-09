import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creatorPayouts } from '@/db/schema/payouts';
import { creators } from '@/db/schema/creators';
import { squadBonusLog } from '@/db/schema/squad';
import { missionCompletions } from '@/db/schema/missions';
import { verifyAdmin, getCreatorFromAuth } from '@/lib/auth';
import { eq, and, desc, sql, gte, lte, sum } from 'drizzle-orm';

/**
 * GET /api/payouts — Creator: own payout history / Admin: all payouts
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get('admin') === 'true';

  if (isAdmin) {
    const adminResult = await verifyAdmin();
    if (adminResult.error) return adminResult.error;

    const payouts = await db.select().from(creatorPayouts).orderBy(desc(creatorPayouts.createdAt)).limit(100);
    return NextResponse.json({ payouts });
  }

  const creatorResult = await getCreatorFromAuth();
  if (creatorResult.error) return creatorResult.error;

  const payouts = await db
    .select()
    .from(creatorPayouts)
    .where(eq(creatorPayouts.creatorId, creatorResult.creatorId))
    .orderBy(desc(creatorPayouts.periodEnd))
    .limit(12);

  return NextResponse.json({ payouts });
}

/**
 * POST /api/payouts — Admin: generate payout for a period
 *
 * total_payout = commission + flat_fee + squad_bonus + league_bonus
 */
export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const body = await request.json();
  const { periodStart, periodEnd } = body;

  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'periodStart and periodEnd required' }, { status: 400 });
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const period = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

  // Get all active creators
  const activeCreators = await db
    .select()
    .from(creators)
    .where(eq(creators.status, 'active'));

  let generated = 0;

  for (const creator of activeCreators) {
    const commissionRate = parseFloat(creator.commissionRate ?? '0');
    const monthlyGmv = parseFloat(creator.monthlyGmv ?? '0');
    const commissionAmount = monthlyGmv * commissionRate;

    // Flat fee from missions in this period
    const [missionFees] = await db
      .select({ total: sql<string>`COALESCE(SUM(${missionCompletions.rewardEarned}::numeric), 0)` })
      .from(missionCompletions)
      .where(and(
        eq(missionCompletions.creatorId, creator.id),
        gte(missionCompletions.completedAt, start),
        lte(missionCompletions.completedAt, end),
      ));
    const flatFeeAmount = parseFloat(missionFees?.total ?? '0');

    // Squad bonus for this period
    const [squadBonus] = await db
      .select({ total: sql<string>`COALESCE(SUM(${squadBonusLog.bonusAmount}::numeric), 0)` })
      .from(squadBonusLog)
      .where(and(
        eq(squadBonusLog.leaderId, creator.id),
        eq(squadBonusLog.period, period),
      ));
    const squadBonusAmount = parseFloat(squadBonus?.total ?? '0');

    const totalPayout = commissionAmount + flatFeeAmount + squadBonusAmount;

    if (totalPayout <= 0) continue;

    await db.insert(creatorPayouts).values({
      creatorId: creator.id,
      periodStart: periodStart,
      periodEnd: periodEnd,
      totalGmv: monthlyGmv.toString(),
      commissionRate: commissionRate.toString(),
      commissionAmount: commissionAmount.toString(),
      flatFeeAmount: flatFeeAmount.toString(),
      squadBonusAmount: squadBonusAmount.toString(),
      leagueBonusAmount: '0', // TODO: league prizes
      totalPayout: totalPayout.toString(),
      status: 'pending',
    });

    generated++;
  }

  return NextResponse.json({
    message: `Payouts generated for ${period}`,
    period,
    creatorsProcessed: activeCreators.length,
    payoutsGenerated: generated,
  });
}
