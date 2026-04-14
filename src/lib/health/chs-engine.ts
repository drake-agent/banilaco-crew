/**
 * Creator Health Score (CHS) Engine
 *
 * Zombie Filter — prevents bot farms from draining mission fees.
 *
 * CHS = (salesScore × 0.40) + (contentScore × 0.30) + (engagementScore × 0.20) + (diversityScore × 0.10)
 *
 * Zones:
 *   GREEN  70-100 → full rewards, no limits
 *   YELLOW 40-69  → full rewards, streak multiplier capped at 1.2x
 *   ORANGE 20-39  → 50% fee reward, max 2 missions/day
 *   RED    0-19   → score only (0% cash)
 *
 * Grace period: creators active < 14 days get CHS floor of 40 (YELLOW minimum).
 */

import { db } from '@/db';
import { creators, type Creator } from '@/db/schema/creators';
import { missionCompletions } from '@/db/schema/missions';
import { eq, and, gte, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Zone definitions
// ---------------------------------------------------------------------------
export type HealthZone = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface CHSResult {
  score: number;         // 0-100
  zone: HealthZone;
  rewardMultiplier: number;  // 1.0 / 1.0 / 0.5 / 0
  streakCap: number;         // Infinity / 1.2 / 1.2 / 1.0
  dailyMissionCap: number;   // Infinity / Infinity / 2 / Infinity (RED still unlimited — but earns nothing)
  breakdown: {
    salesScore: number;
    contentScore: number;
    engagementScore: number;
    diversityScore: number;
  };
}

const ZONE_CONFIG: Record<HealthZone, { rewardMultiplier: number; streakCap: number; dailyMissionCap: number }> = {
  GREEN:  { rewardMultiplier: 1.0, streakCap: Infinity, dailyMissionCap: Infinity },
  YELLOW: { rewardMultiplier: 1.0, streakCap: 1.2,      dailyMissionCap: Infinity },
  ORANGE: { rewardMultiplier: 0.5, streakCap: 1.2,      dailyMissionCap: 2 },
  RED:    { rewardMultiplier: 0,   streakCap: 1.0,      dailyMissionCap: Infinity },
};

const GRACE_PERIOD_DAYS = 14;
const GRACE_FLOOR = 40; // YELLOW minimum for new creators

// ---------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------
const W_SALES = 0.40;
const W_CONTENT = 0.30;
const W_ENGAGEMENT = 0.20;
const W_DIVERSITY = 0.10;

// ---------------------------------------------------------------------------
// Component calculations (each returns 0-100)
// ---------------------------------------------------------------------------

/** Sales: sqrt curve — $200/mo = 100, $50 = 50, $0 = 0 */
function calcSalesScore(monthlyGmv: number): number {
  if (monthlyGmv <= 0) return 0;
  return Math.min(100, Math.sqrt(monthlyGmv / 200) * 100);
}

/** Content: 4 posts/mo = 100, linear */
function calcContentScore(monthlyContentCount: number): number {
  if (monthlyContentCount <= 0) return 0;
  return Math.min(100, (monthlyContentCount / 4) * 100);
}

/** Engagement: 5% rate = 100, linear */
function calcEngagementScore(engagementRate: number): number {
  if (engagementRate <= 0) return 0;
  return Math.min(100, (engagementRate / 0.05) * 100);
}

/** Diversity: unique mission types in last 30 days (max 3 types) */
function calcDiversityScore(uniqueTypes: number): number {
  return Math.min(100, (uniqueTypes / 3) * 100);
}

// ---------------------------------------------------------------------------
// Zone mapping
// ---------------------------------------------------------------------------
function scoreToZone(score: number): HealthZone {
  if (score >= 70) return 'GREEN';
  if (score >= 40) return 'YELLOW';
  if (score >= 20) return 'ORANGE';
  return 'RED';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute Creator Health Score for a creator.
 */
export async function computeCHS(creatorId: string, creator: Creator): Promise<CHSResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  // Mission type diversity (last 30 days)
  const diversityRows = await db
    .select({
      missionType: sql<string>`m.mission_type`,
    })
    .from(missionCompletions)
    .innerJoin(
      sql`missions m`,
      sql`m.id = ${missionCompletions.missionId}`,
    )
    .where(
      and(
        eq(missionCompletions.creatorId, creatorId),
        gte(missionCompletions.completedAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`m.mission_type`);

  const uniqueTypes = diversityRows.length;

  // Compute component scores
  const salesScore = calcSalesScore(parseFloat(creator.monthlyGmv ?? '0'));
  const contentScore = calcContentScore(creator.monthlyContentCount ?? 0);
  const engagementScore = calcEngagementScore(parseFloat(creator.engagementRate ?? '0'));
  const diversityScore = calcDiversityScore(uniqueTypes);

  // Weighted sum
  let score = (salesScore * W_SALES)
    + (contentScore * W_CONTENT)
    + (engagementScore * W_ENGAGEMENT)
    + (diversityScore * W_DIVERSITY);

  score = Math.round(score * 100) / 100;

  // Grace period: new creators get floor of 40
  if (creator.joinedAt) {
    const daysSinceJoin = (Date.now() - new Date(creator.joinedAt).getTime()) / 86400000;
    if (daysSinceJoin < GRACE_PERIOD_DAYS && score < GRACE_FLOOR) {
      score = GRACE_FLOOR;
    }
  }

  const zone = scoreToZone(score);
  const config = ZONE_CONFIG[zone];

  return {
    score,
    zone,
    rewardMultiplier: config.rewardMultiplier,
    streakCap: config.streakCap,
    dailyMissionCap: config.dailyMissionCap,
    breakdown: { salesScore, contentScore, engagementScore, diversityScore },
  };
}

/**
 * Count total missions completed today by a creator (for ORANGE zone daily cap).
 */
export async function getTodayMissionCount(creatorId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(missionCompletions)
    .where(
      and(
        eq(missionCompletions.creatorId, creatorId),
        gte(missionCompletions.completedAt, new Date(`${today}T00:00:00Z`)),
      ),
    );
  return result?.count ?? 0;
}

export { ZONE_CONFIG, GRACE_PERIOD_DAYS };
