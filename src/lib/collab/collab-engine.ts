/**
 * Collab Duo Engine
 *
 * Rules:
 * - Base boost: +15% Pink Score on verified collab content
 * - League season active: +20% instead
 * - Dynamic Duo (3+ consecutive with same partner): +5% extra
 * - Weekly limit: 3 duo bonuses per creator
 * - Season limit: 5 collabs with same partner per season
 */

import { db } from '@/db';
import { collabDuos } from '@/db/schema/collab';
import { pinkLeagueSeasons } from '@/db/schema/league';
import { eq, and, or, sql, desc } from 'drizzle-orm';

const WEEKLY_LIMIT = 3;
const SEASON_PARTNER_LIMIT = 5;
const BASE_BOOST = 0.15;
const LEAGUE_BOOST = 0.20;
const DYNAMIC_DUO_EXTRA = 0.05;
const DYNAMIC_DUO_THRESHOLD = 3;

function currentWeekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

/**
 * Check if a creator has exceeded weekly collab limit.
 */
export async function getWeeklyCollabCount(creatorId: string): Promise<number> {
  const week = currentWeekKey();
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(collabDuos)
    .where(
      and(
        or(
          eq(collabDuos.initiatorId, creatorId),
          eq(collabDuos.partnerId, creatorId),
        ),
        eq(collabDuos.weekKey, week),
        eq(collabDuos.status, 'verified'),
      ),
    );
  return result?.count ?? 0;
}

/**
 * Check how many times two creators have collabed this season.
 */
export async function getSeasonPairCount(
  creatorA: string,
  creatorB: string,
  seasonId: string,
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(collabDuos)
    .where(
      and(
        eq(collabDuos.seasonId, seasonId),
        eq(collabDuos.status, 'verified'),
        or(
          and(eq(collabDuos.initiatorId, creatorA), eq(collabDuos.partnerId, creatorB)),
          and(eq(collabDuos.initiatorId, creatorB), eq(collabDuos.partnerId, creatorA)),
        ),
      ),
    );
  return result?.count ?? 0;
}

/**
 * Count consecutive verified collabs between two creators (duo streak).
 */
export async function getDuoStreak(creatorA: string, creatorB: string): Promise<number> {
  // Get most recent collabs for this pair, check if last N are all verified
  const recent = await db
    .select({ status: collabDuos.status })
    .from(collabDuos)
    .where(
      or(
        and(eq(collabDuos.initiatorId, creatorA), eq(collabDuos.partnerId, creatorB)),
        and(eq(collabDuos.initiatorId, creatorB), eq(collabDuos.partnerId, creatorA)),
      ),
    )
    .orderBy(desc(collabDuos.createdAt))
    .limit(10);

  let streak = 0;
  for (const r of recent) {
    if (r.status === 'verified') streak++;
    else break;
  }
  return streak;
}

/**
 * Calculate the boost percentage for a collab.
 */
export async function calculateBoost(
  creatorA: string,
  creatorB: string,
): Promise<{ boostPct: number; isDynamicDuo: boolean; duoStreak: number; isLeagueSeason: boolean }> {
  // Check if league season is active
  const [activeSeason] = await db
    .select({ id: pinkLeagueSeasons.id })
    .from(pinkLeagueSeasons)
    .where(eq(pinkLeagueSeasons.status, 'active'))
    .limit(1);

  const isLeagueSeason = !!activeSeason;
  let boostPct = isLeagueSeason ? LEAGUE_BOOST : BASE_BOOST;

  // Check duo streak
  const duoStreak = await getDuoStreak(creatorA, creatorB);
  const isDynamicDuo = (duoStreak + 1) >= DYNAMIC_DUO_THRESHOLD; // +1 for current
  if (isDynamicDuo) boostPct += DYNAMIC_DUO_EXTRA;

  return { boostPct, isDynamicDuo, duoStreak: duoStreak + 1, isLeagueSeason };
}

/**
 * Validate a collab initiation — check limits.
 */
export async function validateCollabInit(
  initiatorId: string,
  partnerId: string,
): Promise<{ valid: boolean; error?: string }> {
  if (initiatorId === partnerId) {
    return { valid: false, error: 'Cannot collab with yourself' };
  }

  // Weekly limit check for initiator
  const weekCount = await getWeeklyCollabCount(initiatorId);
  if (weekCount >= WEEKLY_LIMIT) {
    return { valid: false, error: `Weekly collab limit reached (${WEEKLY_LIMIT}/week)` };
  }

  // Season partner limit
  const [activeSeason] = await db
    .select({ id: pinkLeagueSeasons.id })
    .from(pinkLeagueSeasons)
    .where(eq(pinkLeagueSeasons.status, 'active'))
    .limit(1);

  if (activeSeason) {
    const pairCount = await getSeasonPairCount(initiatorId, partnerId, activeSeason.id);
    if (pairCount >= SEASON_PARTNER_LIMIT) {
      return { valid: false, error: `Season limit with this partner reached (${SEASON_PARTNER_LIMIT}/season)` };
    }
  }

  // Check for pending collab between these two
  const [existing] = await db
    .select({ id: collabDuos.id })
    .from(collabDuos)
    .where(
      and(
        or(
          and(eq(collabDuos.initiatorId, initiatorId), eq(collabDuos.partnerId, partnerId)),
          and(eq(collabDuos.initiatorId, partnerId), eq(collabDuos.partnerId, initiatorId)),
        ),
        or(eq(collabDuos.status, 'pending'), eq(collabDuos.status, 'matched')),
      ),
    )
    .limit(1);

  if (existing) {
    return { valid: false, error: 'Active collab already exists with this partner' };
  }

  return { valid: true };
}

export { WEEKLY_LIMIT, SEASON_PARTNER_LIMIT, BASE_BOOST, LEAGUE_BOOST, DYNAMIC_DUO_EXTRA, DYNAMIC_DUO_THRESHOLD };
