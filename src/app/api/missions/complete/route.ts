import { NextResponse } from 'next/server';
import { db } from '@/db';
import { missions, missionCompletions, dailyMissionSchedule } from '@/db/schema/missions';
import { creators } from '@/db/schema/creators';
import { getCreatorFromAuth } from '@/lib/auth';
import { calculateTier } from '@/lib/tier/auto-update';
import { calculateStreak } from '@/lib/streak/streak-engine';
import { computeCHS, getTodayMissionCount } from '@/lib/health/chs-engine';
import { runExploitChecks } from '@/lib/health/anti-exploit';
import { rollMysteryMultiplier } from '@/lib/missions/mystery';
import { trackMissionCompletion } from '@/agent/memory/entity';
import { eq, and, gte, lte } from 'drizzle-orm';
import { parseJsonBody } from '@/lib/api/errors';

/**
 * C3 FIX: Hard ceiling on stacked reward multipliers.
 *
 * Upstream components (streak × CHS × mystery) can multiply up to 10× when the
 * 5x jackpot lands on top of a 2x milestone streak. Capping the product keeps
 * the expected value predictable for finance and prevents an exploit where a
 * creator games the mystery RNG to blow out a single month of flat-fee budget.
 */
const MAX_REWARD_MULTIPLIER = 4.0;

type MissionForProof = typeof missions.$inferSelect;

function missionRequiresProof(mission: MissionForProof): boolean {
  const metadata = mission.metadata ?? {};
  if (typeof metadata.requiresProof === 'boolean') {
    return metadata.requiresProof;
  }
  if (metadata.autoVerify === true) {
    return false;
  }
  return mission.missionType === 'creation' || mission.missionType === 'viral';
}

function isValidProofUrl(proofUrl: string): boolean {
  try {
    const url = new URL(proofUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

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

  const parsed = await parseJsonBody<{ missionId?: string; proofUrl?: string }>(request);
  if (parsed.error) return parsed.error;
  const { missionId, proofUrl } = parsed.data;

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

  const today = new Date().toISOString().split('T')[0];
  const [scheduleEntry] = await db
    .select({ isMystery: dailyMissionSchedule.isMystery })
    .from(dailyMissionSchedule)
    .where(
      and(
        eq(dailyMissionSchedule.missionId, missionId),
        eq(dailyMissionSchedule.activeDate, today),
      ),
    )
    .limit(1);

  if (!scheduleEntry) {
    return NextResponse.json(
      { error: 'Mission is not scheduled today' },
      { status: 403 },
    );
  }

  const requiresProof = missionRequiresProof(mission);
  const normalizedProofUrl = proofUrl?.trim() || null;
  if (requiresProof && !normalizedProofUrl) {
    return NextResponse.json(
      { error: 'Proof URL is required for this mission' },
      { status: 400 },
    );
  }
  if (normalizedProofUrl && !isValidProofUrl(normalizedProofUrl)) {
    return NextResponse.json(
      { error: 'Proof URL must be an http(s) URL' },
      { status: 400 },
    );
  }

  // --- Zombie Filter: CHS + Anti-Exploit ---
  const [chs, exploit] = await Promise.all([
    computeCHS(creatorResult.creatorId, creatorResult.creator),
    runExploitChecks({
      creatorId: creatorResult.creatorId,
      missionId,
      proofUrl: normalizedProofUrl,
    }),
  ]);

  if (exploit.blocked) {
    return NextResponse.json(
      { error: exploit.reason, rule: exploit.rule },
      { status: 429 },
    );
  }
  // H1 FIX: the ORANGE-zone daily-cap check moved inside the transaction below,
  // so the read and the insert happen under the same snapshot and two parallel
  // submissions can't both slip through.

  // --- Mystery Mission: check if this mission is scheduled as mystery today ---
  const isMystery = scheduleEntry.isMystery;
  const mysteryResult = isMystery ? rollMysteryMultiplier() : null;
  const mysteryMultiplier = mysteryResult?.multiplier ?? 1;

  // 3-7. Transaction: check daily limit → insert completion → update creator
  // BUG-1 FIX: Wrap in transaction to prevent race condition double-spend

  try {
    const result = await db.transaction(async (tx) => {
      // 3. Check daily completion (one per day per mission)
      const existing = await tx
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
        throw new Error('ALREADY_COMPLETED');
      }

      // H1 FIX: ORANGE-zone daily cap enforced inside the transaction.
      if (chs.zone === 'ORANGE') {
        const todayCount = await getTodayMissionCount(creatorResult.creatorId, tx);
        if (todayCount >= chs.dailyMissionCap) {
          throw new Error('DAILY_CAP_REACHED');
        }
      }

      // 4. Calculate streak
      const streakResult = calculateStreak(
        creatorResult.creator.currentStreak ?? 0,
        creatorResult.creator.longestStreak ?? 0,
        creatorResult.creator.lastMissionDate ?? null,
        today,
      );

      // Apply streak multiplier (capped by CHS zone) + CHS reward multiplier + mystery multiplier
      const cappedStreakMultiplier = Math.min(streakResult.multiplier, chs.streakCap);
      const baseReward = parseFloat(mission.rewardAmount ?? '0');
      const baseScore = mission.scoreAmount ?? 0;

      // C3 FIX: clamp the total stacked multiplier so streak × CHS × mystery can never
      // exceed MAX_REWARD_MULTIPLIER (4.0×). The uncapped product could hit 10× when a
      // 5× mystery lands on top of a 30-day streak.
      const rawMultiplier = cappedStreakMultiplier * chs.rewardMultiplier * mysteryMultiplier;
      const totalMultiplier = Math.min(rawMultiplier, MAX_REWARD_MULTIPLIER);
      const scoreMultiplier = Math.min(
        cappedStreakMultiplier * mysteryMultiplier,
        MAX_REWARD_MULTIPLIER,
      );

      const rewardAmount = Math.round(baseReward * totalMultiplier * 100) / 100;
      const scoreAmount = Math.round(baseScore * scoreMultiplier); // Score always granted (even RED)
      const pendingVerification = requiresProof;
      const approvedRewardAmount = pendingVerification ? 0 : rewardAmount;
      const approvedScoreAmount = pendingVerification ? 0 : scoreAmount;

      // 5. Insert completion
      const [completion] = await tx
        .insert(missionCompletions)
        .values({
          creatorId: creatorResult.creatorId,
          missionId,
          rewardEarned: approvedRewardAmount.toString(),
          scoreEarned: approvedScoreAmount,
          proofUrl: normalizedProofUrl,
          proofVerified: !requiresProof,
          verificationMethod: requiresProof ? 'manual' : 'auto',
          mysteryMultiplier: mysteryResult ? mysteryMultiplier.toString() : null,
        })
        .returning();

      // 6. Update creator metrics (with streak)
      const newMissionCount = (creatorResult.creator.missionCount ?? 0) + (pendingVerification ? 0 : 1);
      const newFlatFee = parseFloat(creatorResult.creator.flatFeeEarned ?? '0') + approvedRewardAmount;
      const newPinkScore = parseFloat(creatorResult.creator.pinkScore ?? '0') + approvedScoreAmount;

      // 7. Calculate new tier
      const tierResult = calculateTier(creatorResult.creator.tier, {
        missionCount: newMissionCount,
        monthlyGmv: parseFloat(creatorResult.creator.monthlyGmv ?? '0'),
      });

      const currentOnboardingStep = creatorResult.creator.onboardingStep ?? 0;
      const newOnboardingStep = !pendingVerification && currentOnboardingStep < 3
        ? 3
        : currentOnboardingStep;

      if (!pendingVerification) {
        await tx
          .update(creators)
          .set({
            missionCount: newMissionCount,
            flatFeeEarned: newFlatFee.toString(),
            pinkScore: newPinkScore.toString(),
            tier: tierResult.tier,
            commissionRate: tierResult.commissionRate.toString(),
            squadBonusRate: tierResult.squadBonusRate.toString(),
            currentStreak: streakResult.currentStreak,
            longestStreak: streakResult.longestStreak,
            lastMissionDate: streakResult.lastMissionDate,
            onboardingStep: newOnboardingStep,
            ...(tierResult.changed ? { tierUpdatedAt: new Date() } : {}),
            updatedAt: new Date(),
          })
          .where(eq(creators.id, creatorResult.creatorId));
      }

      return {
        completion,
        streakResult,
        cappedStreakMultiplier,
        baseReward,
        baseScore,
        rewardAmount,
        scoreAmount,
        newMissionCount,
        newFlatFee,
        newPinkScore,
        tierResult,
        pendingVerification,
        approvedRewardAmount,
        approvedScoreAmount,
      };
    });

    // Track mission completion in entity memory (L4) — non-blocking, outside transaction
    trackMissionCompletion({
      creatorId: creatorResult.creatorId,
      missionType: mission.missionType,
      missionTitle: mission.title,
    }).catch((err) => console.error('[Entity] Mission tracking failed:', err));

    return NextResponse.json({
      completion: {
        id: result.completion.id,
        missionTitle: mission.title,
        missionType: mission.missionType,
        rewardEarned: result.approvedRewardAmount,
        scoreEarned: result.approvedScoreAmount,
        calculatedReward: result.rewardAmount,
        calculatedScore: result.scoreAmount,
        pendingVerification: result.pendingVerification,
        baseReward: result.baseReward,
        baseScore: result.baseScore,
        isMystery,
        mystery: mysteryResult,
      },
      streak: {
        current: result.streakResult.currentStreak,
        longest: result.streakResult.longestStreak,
        multiplier: result.cappedStreakMultiplier,
        rawMultiplier: result.streakResult.multiplier,
        milestone: result.streakResult.milestone,
        broken: result.streakResult.streakBroken,
      },
      health: {
        score: chs.score,
        zone: chs.zone,
        rewardMultiplier: chs.rewardMultiplier,
        streakCap: chs.streakCap === Infinity ? null : chs.streakCap,
      },
      creator: {
        missionCount: result.newMissionCount,
        flatFeeEarned: result.newFlatFee,
        pinkScore: result.newPinkScore,
        tier: result.tierResult.tier,
        tierChanged: !result.pendingVerification && result.tierResult.changed,
        ...(result.tierResult.changed && !result.pendingVerification
          ? { previousTier: creatorResult.creator.tier, newTier: result.tierResult.tier }
          : {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_COMPLETED') {
      return NextResponse.json(
        { error: 'Mission already completed today' },
        { status: 409 },
      );
    }
    if (err instanceof Error && err.message === 'DAILY_CAP_REACHED') {
      return NextResponse.json(
        { error: 'Daily mission limit reached', zone: chs.zone },
        { status: 429 },
      );
    }
    throw err;
  }
}
