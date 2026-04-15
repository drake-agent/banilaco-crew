import { db } from '@/db';
import { creators, type PinkTier } from '@/db/schema/creators';
import { orderTracking } from '@/db/schema/tiktok';
import { calculateTier } from '@/lib/tier/auto-update';
import { and, eq, isNull } from 'drizzle-orm';

export async function creditCreatorSettledGmv(creatorId: string, gmv: number): Promise<void> {
  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, creatorId))
    .limit(1);
  if (!creator) return;

  const newMonthlyGmv = parseFloat(creator.monthlyGmv ?? '0') + gmv;
  const newTotalGmv = parseFloat(creator.totalGmv ?? '0') + gmv;

  const tierResult = calculateTier(creator.tier as PinkTier, {
    missionCount: creator.missionCount ?? 0,
    monthlyGmv: newMonthlyGmv,
  });

  await db
    .update(creators)
    .set({
      monthlyGmv: newMonthlyGmv.toString(),
      totalGmv: newTotalGmv.toString(),
      lastActiveAt: new Date(),
      tier: tierResult.tier,
      commissionRate: tierResult.commissionRate.toString(),
      squadBonusRate: tierResult.squadBonusRate.toString(),
      ...(tierResult.changed ? { tierUpdatedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(creators.id, creatorId));
}

export async function creditOrderGmvIfNeeded(params: {
  orderTrackingId: string;
  creatorId: string;
  gmv: number;
}): Promise<boolean> {
  const [marked] = await db
    .update(orderTracking)
    .set({
      gmvCreditedAt: new Date(),
      syncedAt: new Date(),
    })
    .where(
      and(
        eq(orderTracking.id, params.orderTrackingId),
        isNull(orderTracking.gmvCreditedAt),
      ),
    )
    .returning({ id: orderTracking.id });

  if (!marked) return false;

  await creditCreatorSettledGmv(params.creatorId, params.gmv);
  return true;
}
