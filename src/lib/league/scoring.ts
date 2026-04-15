/**
 * PINK LEAGUE Scoring Engine (Affiliate-First)
 *
 * Pink Score = (GMV × weight_gmv) + (Viral Index × weight_viral)
 *
 * Viral Index is affiliate-weighted, NOT influencer-weighted:
 * - shares  × 3.0  → strongest purchase-intent proxy (sharing = recommending)
 * - comments × 1.5 → genuine consideration / questions about product
 * - views   × 0.01 → reach signal (abundant, low per-unit weight)
 * - likes   × 0.1  → passive approval (lowest weight)
 *
 * No follower-count normalization: we reward absolute conversion volume,
 * not per-follower "efficiency". A 10K-follower affiliate with 500 shares
 * beats a 1M-follower influencer with 500 shares, and that's the goal —
 * GMV is the ceiling, virality is the floor.
 */

import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { contentTracking } from '@/db/schema/content';
import { pinkLeagueSeasons, pinkLeagueEntries, pinkLeagueDailySnapshots } from '@/db/schema/league';
import { collabDuos } from '@/db/schema/collab';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';

// Scoring weights
const WEIGHT_GMV = 1.0;
const WEIGHT_VIRAL = 0.5;

// Engagement weights (affiliate-tilted: shares > comments > views > likes)
const W_SHARES = 3.0;
const W_COMMENTS = 1.5;
const W_VIEWS = 0.01;
const W_LIKES = 0.1;

export interface PinkScoreBreakdown {
  gmvScore: number;
  viralScore: number;
  viralIndex: number;
  totalPinkScore: number;
}

/**
 * Compute Pink Score for a creator based on their recent content + GMV.
 *
 * NOTE: `followerCount` is intentionally NOT used in viral-index calculation.
 * It's accepted only for API-shape compatibility with older callers.
 */
export function computePinkScore(params: {
  monthlyGmv: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followerCount?: number; // deprecated input, ignored
}): PinkScoreBreakdown {
  const { monthlyGmv, views, likes, comments, shares } = params;

  const gmvScore = monthlyGmv * WEIGHT_GMV;

  // Viral Index: absolute affiliate-weighted engagement (no follower normalization)
  const viralIndex =
    shares * W_SHARES +
    comments * W_COMMENTS +
    views * W_VIEWS +
    likes * W_LIKES;
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
 *
 * H5 FIX: content metrics and collab boost are now bulk-aggregated in two queries
 * instead of two-per-creator. Previously this routine fired 2×N queries per run.
 *
 * M7 FIX: `now` is injectable so the Cron can re-run for a specific date without
 * wall-clock drift (e.g. backfills after a failure).
 */
export async function takeDailySnapshot(
  seasonId: string,
  now: Date = new Date(),
): Promise<{
  participantCount: number;
  snapshotDate: string;
}> {
  const today = now.toISOString().split('T')[0];

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

  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
  const boostConfig = (season?.boostConfig ?? {}) as Record<string, unknown>;
  const boostDays = (boostConfig.boostDays as number[]) ?? [1]; // Default: Monday
  const boostMultiplier = boostDays.includes(dayOfWeek) ? 1.5 : 1.0;

  // Compute scores for each participant
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const creatorIds = entries.map((e) => e.creatorId);

  // H5 FIX: one aggregate query for all participants' content.
  const contentRows = await db
    .select({
      creatorId: contentTracking.creatorId,
      totalViews: sql<number>`COALESCE(SUM(${contentTracking.views}), 0)::int`,
      totalLikes: sql<number>`COALESCE(SUM(${contentTracking.likes}), 0)::int`,
      totalComments: sql<number>`COALESCE(SUM(${contentTracking.comments}), 0)::int`,
      totalShares: sql<number>`COALESCE(SUM(${contentTracking.shares}), 0)::int`,
    })
    .from(contentTracking)
    .where(
      and(
        inArray(contentTracking.creatorId, creatorIds),
        gte(contentTracking.postedAt, thirtyDaysAgo),
      ),
    )
    .groupBy(contentTracking.creatorId);

  const contentByCreator = new Map(contentRows.map((r) => [r.creatorId, r]));

  // H5 FIX: one aggregate query for all verified collab boosts this season.
  const collabRowsInit = await db
    .select({
      creatorId: collabDuos.initiatorId,
      totalBoost: sql<number>`COALESCE(SUM(${collabDuos.scoreBoostPct}::numeric), 0)::float`,
    })
    .from(collabDuos)
    .where(
      and(
        inArray(collabDuos.initiatorId, creatorIds),
        eq(collabDuos.seasonId, seasonId),
        eq(collabDuos.status, 'verified'),
      ),
    )
    .groupBy(collabDuos.initiatorId);

  const collabRowsPart = await db
    .select({
      creatorId: collabDuos.partnerId,
      totalBoost: sql<number>`COALESCE(SUM(${collabDuos.scoreBoostPct}::numeric), 0)::float`,
    })
    .from(collabDuos)
    .where(
      and(
        inArray(collabDuos.partnerId, creatorIds),
        eq(collabDuos.seasonId, seasonId),
        eq(collabDuos.status, 'verified'),
      ),
    )
    .groupBy(collabDuos.partnerId);

  const collabByCreator = new Map<string, number>();
  for (const r of [...collabRowsInit, ...collabRowsPart]) {
    collabByCreator.set(r.creatorId, (collabByCreator.get(r.creatorId) ?? 0) + (r.totalBoost ?? 0));
  }

  const scored: Array<{ entryId: string; creatorId: string; score: PinkScoreBreakdown }> = [];

  for (const entry of entries) {
    const contentAgg = contentByCreator.get(entry.creatorId);
    const score = computePinkScore({
      monthlyGmv: parseFloat(entry.monthlyGmv ?? '0'),
      views: contentAgg?.totalViews ?? 0,
      likes: contentAgg?.totalLikes ?? 0,
      comments: contentAgg?.totalComments ?? 0,
      shares: contentAgg?.totalShares ?? 0,
      followerCount: entry.followerCount ?? 1,
    });

    const collabBoostPct = collabByCreator.get(entry.creatorId) ?? 0;
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
