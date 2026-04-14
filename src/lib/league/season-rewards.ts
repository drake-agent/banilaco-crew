/**
 * Season Rewards — Participation-based carry-over multipliers
 *
 * When a season completes, ALL participants get rewards based on percentile:
 *   TOP 10%  → next season starts at 1.5x multiplier
 *   TOP 30%  → next season starts at 1.3x
 *   TOP 50%  → next season starts at 1.2x
 *   TOP 100% → next season starts at 1.1x (participation bonus)
 *
 * This eliminates the "only top 10 matter" problem and keeps everyone
 * motivated to rank as high as possible.
 */

import { db } from '@/db';
import { pinkLeagueEntries, pinkLeagueSeasons } from '@/db/schema/league';
import { eq, desc, asc } from 'drizzle-orm';

export interface SeasonRewardTier {
  percentile: number; // top X%
  multiplier: number;
  label: string;
}

const REWARD_TIERS: SeasonRewardTier[] = [
  { percentile: 10, multiplier: 1.5, label: 'Elite' },
  { percentile: 30, multiplier: 1.3, label: 'Top Performer' },
  { percentile: 50, multiplier: 1.2, label: 'Rising Star' },
  { percentile: 100, multiplier: 1.1, label: 'Participant' },
];

/**
 * Determine carry-over multiplier based on rank percentile.
 */
export function getCarryOverMultiplier(rank: number, totalParticipants: number): {
  multiplier: number;
  label: string;
} {
  if (totalParticipants === 0) return { multiplier: 1.0, label: 'None' };

  const percentile = (rank / totalParticipants) * 100;

  for (const tier of REWARD_TIERS) {
    if (percentile <= tier.percentile) {
      return { multiplier: tier.multiplier, label: tier.label };
    }
  }

  return { multiplier: 1.1, label: 'Participant' };
}

/**
 * Finalize a season: assign final ranks and carry-over multipliers.
 * Called when admin completes a season.
 */
export async function finalizeSeasonRewards(seasonId: string): Promise<{
  totalParticipants: number;
  rewards: Array<{ creatorId: string; finalRank: number; multiplier: number; label: string }>;
}> {
  // Get all entries sorted by pink score descending
  const entries = await db
    .select({
      id: pinkLeagueEntries.id,
      creatorId: pinkLeagueEntries.creatorId,
      pinkScore: pinkLeagueEntries.pinkScore,
    })
    .from(pinkLeagueEntries)
    .where(eq(pinkLeagueEntries.seasonId, seasonId))
    .orderBy(desc(pinkLeagueEntries.pinkScore));

  const total = entries.length;
  if (total === 0) return { totalParticipants: 0, rewards: [] };

  const rewards: Array<{ creatorId: string; finalRank: number; multiplier: number; label: string }> = [];

  for (let i = 0; i < entries.length; i++) {
    const rank = i + 1;
    const { multiplier, label } = getCarryOverMultiplier(rank, total);

    // Update entry with final rank
    await db.update(pinkLeagueEntries).set({
      finalRank: rank,
      updatedAt: new Date(),
    }).where(eq(pinkLeagueEntries.id, entries[i].id));

    rewards.push({
      creatorId: entries[i].creatorId,
      finalRank: rank,
      multiplier,
      label,
    });
  }

  return { totalParticipants: total, rewards };
}

/**
 * Apply carry-over multipliers when creating entries for a new season.
 * Looks up each creator's performance in the most recent completed season.
 */
export async function applyCarryOver(
  newSeasonId: string,
  previousSeasonId: string,
): Promise<number> {
  // Get final ranks from previous season
  const prevEntries = await db
    .select({
      creatorId: pinkLeagueEntries.creatorId,
      finalRank: pinkLeagueEntries.finalRank,
    })
    .from(pinkLeagueEntries)
    .where(eq(pinkLeagueEntries.seasonId, previousSeasonId));

  // Count total participants for percentile calculation
  const total = prevEntries.length;
  let updated = 0;

  for (const entry of prevEntries) {
    if (!entry.finalRank) continue;

    const { multiplier } = getCarryOverMultiplier(entry.finalRank, total);

    // Update the new season entry if it exists
    const [existing] = await db
      .select({ id: pinkLeagueEntries.id })
      .from(pinkLeagueEntries)
      .where(
        eq(pinkLeagueEntries.seasonId, newSeasonId),
      )
      .limit(1);

    if (existing) {
      await db.update(pinkLeagueEntries).set({
        seasonStartMultiplier: multiplier.toString(),
      }).where(eq(pinkLeagueEntries.id, existing.id));
      updated++;
    }
  }

  return updated;
}

export { REWARD_TIERS };
