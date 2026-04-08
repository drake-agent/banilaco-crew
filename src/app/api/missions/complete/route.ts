import { NextResponse } from 'next/server';
import { db } from '@/db';
import { missions, missionCompletions } from '@/db/schema/missions';
import { creators } from '@/db/schema/creators';
import { getCreatorFromAuth } from '@/lib/auth';
import { calculateTier } from '@/lib/tier/auto-update';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * POST /api/missions/complete — Submit mission completion
 *
 * Flow:
 * 1. Verify creator auth + mission exists
 * 2. Check daily completion limit
 * 3. Insert completion record
 * 4. Update creator: missionCount++, flatFeeEarned, pinkScore
 * 5. Recalculate tier (auto-upgrade if threshold met)
 * 6. Return result + tier change info
 */
export async function POST(request: Request) {
  const creatorResult = await getCreatorFromAuth();
  if (creatorResult.error) return creatorResult.error;

  const body = await request.json();
  const { missionId, proofUrl } = body;

  if (!missionId) {
    return NextResponse.json(
      { error: 'missionId is required' },
      { status: 400 },
    );
  }

  // 1. Verify mission exists and is active
  const [mission] = await db
    .select()
    .from(missions)
    .where(and(eq(missions.id, missionId), eq(missions.isActive, true)))
    .limit(1);

  if (!mission) {
    return NextResponse.json(
      { error: 'Mission not found or inactive' },
      { status: 404 },
    );
  }

  // 2. Check tier requirement
  if (mission.requiredTier) {
    const tierOrder = ['pink_petal', 'pink_rose', 'pink_diamond', 'pink_crown'];
    const creatorTierIdx = tierOrder.indexOf(creatorResult.creator.tier);
    const requiredTierIdx = tierOrder.indexOf(mission.requiredTier);
    if (creatorTierIdx < requiredTierIdx) {
      return NextResponse.json(
        { error: `Requires ${mission.requiredTier} tier or above` },
        { status: 403 },
      );
    }
  }

  // 3. Check daily completion (one per day per mission)
  const today = new Date().toISOString().split('T')[0];
  const existing = await db
    .select({ id: missionCompletions.id })
    .from(missionCompletions)
    .where(
      and(
        eq(missionCompletions.creatorId, creatorResult.creatorId),
        eq(missionCompletions.missionId, missionId),
        gte(missionCompletions.completedAt, new Date(`${today}T00:00:00Z`)),
        lte(missionCompletions.completedAt, new Date(`${today}T23:59:59Z`)),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'Mission already completed today' },
      { status: 409 },
    );
  }

  const rewardAmount = parseFloat(mission.rewardAmount ?? '0');
  const scoreAmount = mission.scoreAmount ?? 0;

  // 4. Insert completion
  const [completion] = await db
    .insert(missionCompletions)
    .values({
      creatorId: creatorResult.creatorId,
      missionId,
      rewardEarned: rewardAmount.toString(),
      scoreEarned: scoreAmount,
      proofUrl: proofUrl ?? null,
      verificationMethod: proofUrl ? 'manual' : 'auto',
    })
    .returning();

  // 5. Update creator metrics
  const newMissionCount = (creatorResult.creator.missionCount ?? 0) + 1;
  const newFlatFee = parseFloat(creatorResult.creator.flatFeeEarned ?? '0') + rewardAmount;
  const newPinkScore = parseFloat(creatorResult.creator.pinkScore ?? '0') + scoreAmount;

  // 6. Calculate new tier
  const tierResult = calculateTier(creatorResult.creator.tier, {
    missionCount: newMissionCount,
    monthlyGmv: parseFloat(creatorResult.creator.monthlyGmv ?? '0'),
    aiProfileCompleted: creatorResult.creator.aiProfileCompleted ?? false,
  });

  await db
    .update(creators)
    .set({
      missionCount: newMissionCount,
      flatFeeEarned: newFlatFee.toString(),
      pinkScore: newPinkScore.toString(),
      tier: tierResult.tier,
      commissionRate: tierResult.commissionRate.toString(),
      squadBonusRate: tierResult.squadBonusRate.toString(),
      ...(tierResult.changed ? { tierUpdatedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(creators.id, creatorResult.creatorId));

  return NextResponse.json({
    completion: {
      id: completion.id,
      missionTitle: mission.title,
      missionType: mission.missionType,
      rewardEarned: rewardAmount,
      scoreEarned: scoreAmount,
    },
    creator: {
      missionCount: newMissionCount,
      flatFeeEarned: newFlatFee,
      pinkScore: newPinkScore,
      tier: tierResult.tier,
      tierChanged: tierResult.changed,
      ...(tierResult.changed
        ? { previousTier: creatorResult.creator.tier, newTier: tierResult.tier }
        : {}),
    },
  });
}
