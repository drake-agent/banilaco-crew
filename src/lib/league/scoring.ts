/**
 * PINK LEAGUE Scoring Engine
 *
 * Pink Score = (GMV × weight_gmv) + (Viral Index × weight_viral)
 * Viral Index = (views×0.3 + shares×0.4 + likes×0.2 + comments×0.1) / follower_count × 1000
 */

import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { contentTracking } from '@/db/schema/content';
import { pinkLeagueSeasons, pinkLeagueEntries, pinkLeagueDailySnapshots } from '@/db/schema/league';
import { collabDuos } from '@/db/schema/collab';
import { eq, and, or, gte, desc, sql, asc } from 'drizzle-orm';

// Scoring weights
const WEIGHT_GMV = 1.0;
const WEIGHT_VIRAL = 0.5;

export interface PinkScoreBreakdown {
  gmvScore: number;
  viralScore: number;
  viralIndex: number;
  totalPinkScore: number;
}

/**
 * Compute Pink Score for a creator based on their recent content + GMV.
 */
export function computePinkScore(params: {
  monthlyGmv: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followerCount: number;
}): PinkScoreBreakdown {
  const { monthlyGmv, views, likes, comments, shares, followerCount } = params;

  const gmvScore = monthlyGmv * WEIGHT_GMV;

  // Viral Index: normalize engagement by follower count
  const rawEngagement = (views * 0.3) + (shares * 0.4) + (likes * 0.2) + (comments * 0.1);
  const viralIndex = followerCount > 0
    ? (rawEngagement / followerCount) * 1000
    : 0;
  const viralScore = viralIndex * WEIGHT_VIRAL;

  return {
    gmvScore: Math.round(gmvScore * 100) / 100,
    viralScore: Math.round(viralScore * 100) / 100,
    viralIndex: Math.round(viralIndex * 100) / 100,
    totalPinkScore: Math.round((gmvScore + viralScore) * 100) / 100,
  };
}

/**
 * Take a daily snapshot of all league participants' rankings.
 * Called by Cron daily during active season.
 */
export async function takeDailySnapshot(seasonId: string): Promise<{
  participantCount: number;
  snapshotDate: string;
}> {
  const today = new Date().toISOString().split('T')[0];

  // Get all entries for this season (include carry-over multiplier)
  const entries = await db
    .select({
      entryId: pinkLeagueEntries.id,
      creatorId: pinkLeagueEntries.creatorId,
      monthlyGmv: creators.monthlyGmv,
      followerCount: creators.followerCount,
      seasonStartMultiplier: pinkLeagueEntries.seasonStartMultiplier,
    })
    .from(pinkLeagueEntries)
    .innerJoin(creators, eq(pinkLeagueEntries.creatorId, creators.id))
    .where(eq(pinkLeagueEntries.seasonId, seasonId));

  if (!entries.length) return { participantCount: 0, snapshotDate: today };

  // Get season boost config
  const [season] = await db
    .select({ boostConfig: pinkLeagueSeasons.boostConfig })
    .from(pinkLeagueSeasons)
    .where(eq(pinkLeagueSeasons.id, seasonId))
    .limit(1);

  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon
  const boostConfig = (season?.boostConfig ?? {}) as Record<string, unknown>;
  const boostDays = (boostConfig.boostDays as number[]) ?? [1]; // Default: Monday
  const boostMultiplier = boostDays.includes(dayOfWeek) ? 1.5 : 1.0;

  // Compute scores for each participant
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const scored: Array<{ entryId: string; creatorId: string; score: PinkScoreBreakdown }> = [];

  for (const entry of entries) {
    // Aggregate recent content metrics
    const [contentAgg] = await db
      .select({
        totalViews: sql<number>`COALESCE(SUM(${contentTracking.views}), 0)`,
        totalLikes: sql<number>`COALESCE(SUM(${contentTracking.likes}), 0)`,
        totalComments: sql<number>`COALESCE(SUM(${contentTracking.comments}), 0)`,
        totalShares: sql<number>`COALESCE(SUM(${contentTracking.shares}), 0)`,
      })
      .from(contentTracking)
      .where(
        and(
          eq(contentTracking.creatorId, entry.creatorId),
          gte(contentTracking.postedAt, thirtyDaysAgo),
        ),
      );

    const score = computePinkScore({
      monthlyGmv: parseFloat(entry.monthlyGmv ?? '0'),
      views: contentAgg?.totalViews ?? 0,
      likes: contentAgg?.totalLikes ?? 0,
      comments: contentAgg?.totalComments ?? 0,
      shares: contentAgg?.totalShares ?? 0,
      followerCount: entry.followerCount ?? 1,
    });

    // Apply Collab Duo boost: sum all verified collab boosts for this season
    const [collabAgg] = await db
      .select({ totalBoost: sql<number>`COALESCE(SUM(${collabDuos.scoreBoostPct}::numeric), 0)` })
      .from(collabDuos)
      .where(
        and(
          or(
            eq(collabDuos.initiatorId, entry.creatorId),
            eq(collabDuos.partnerId, entry.creatorId),
          ),
          eq(collabDuos.seasonId, seasonId),
          eq(collabDuos.status, 'verified'),
        ),
      );

    const collabBoostPct = collabAgg?.totalBoost ?? 0;
    if (collabBoostPct > 0) {
      score.totalPinkScore = Math.round(score.totalPinkScore * (1 + collabBoostPct) * 100) / 100;
    }

    // Apply season carry-over multiplier (from previous season performance)
    const startMultiplier = parseFloat(entry.seasonStartMultiplier ?? '1.00');
    if (startMultiplier > 1) {
      score.totalPinkScore = Math.round(score.totalPinkScore * startMultiplier * 100) / 100;
    }

    scored.push({ entryId: entry.entryId, creatorId: entry.creatorId, score });
  }

  // Sort by total score descending
  scored.sort((a, b) => b.score.totalPinkScore - a.score.totalPinkScore);

  // Update entries + create snapshots
  for (let i = 0; i < scored.length; i++) {
    const { entryId, creatorId, score } = scored[i];
    const rank = i + 1;
    const boostedScore = score.totalPinkScore * boostMultiplier;

    // Update entry
    await db.update(pinkLeagueEntries).set({
      pinkScore: boostedScore.toString(),
      gmvScore: score.gmvScore.toString(),
      viralScore: score.viralScore.toString(),
      dailyRank: rank,
      isCrownCandidate: rank <= 10,
      updatedAt: new Date(),
    }).where(eq(pinkLeagueEntries.id, entryId));

    // Insert daily snapshot
    await db.insert(pinkLeagueDailySnapshots).values({
      seasonId,
      creatorId,
      snapshotDate: today,
      rank,
      pinkScore: boostedScore.toString(),
      boostMultiplier: boostMultiplier.toString(),
    }).onConflictDoUpdate({
      target: [pinkLeagueDailySnapshots.seasonId, pinkLeagueDailySnapshots.creatorId, pinkLeagueDailySnapshots.snapshotDate],
      set: { rank, pinkScore: boostedScore.toString(), boostMultiplier: boostMultiplier.toString() },
    });

    // FIX BUG-5: Store RAW score on creator, not boosted (prevents 33% swings)
    await db.update(creators).set({
      pinkScore: score.totalPinkScore.toString(),
      updatedAt: new Date(),
    }).where(eq(creators.id, creatorId));
  }

  return { participantCount: scored.length, snapshotDate: today };
}

/**
 * Auto-register eligible creators for an active season.
 * Pink Diamond+ can enter PINK LEAGUE.
 */
export async function autoRegisterEligible(seasonId: string): Promise<number> {
  const eligible = await db
    .select({ id: creators.id })
    .from(creators)
    .where(
      and(
        eq(creators.status, 'active'),
        sql`${creators.tier} IN ('pink_diamond', 'pink_crown')`,
      ),
    );

  let registered = 0;
  for (const creator of eligible) {
    try {
      await db.insert(pinkLeagueEntries).values({
        seasonId,
        creatorId: creator.id,
      }).onConflictDoNothing();
      registered++;
    } catch { /* already registered */ }
  }

  return registered;
}
