import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creators, TIER_CONFIG, type PinkTier } from '@/db/schema/creators';
import { contentTracking } from '@/db/schema/content';
import { missionCompletions } from '@/db/schema/missions';
import { getCreatorFromAuth } from '@/lib/auth';
import { eq, desc, sql, gte, count } from 'drizzle-orm';

/**
 * GET /api/creator — Creator's own dashboard data
 */
export async function GET() {
  const result = await getCreatorFromAuth();
  if (result.error) return result.error;

  const { creator } = result;
  const tierConfig = TIER_CONFIG[creator.tier as PinkTier];

  // Recent content (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentContent = await db
    .select({
      views: contentTracking.views,
      likes: contentTracking.likes,
      comments: contentTracking.comments,
      shares: contentTracking.shares,
      gmvAttributed: contentTracking.gmvAttributed,
    })
    .from(contentTracking)
    .where(
      sql`${contentTracking.creatorId} = ${creator.id} AND ${contentTracking.postedAt} >= ${thirtyDaysAgo}`,
    )
    .orderBy(desc(contentTracking.postedAt))
    .limit(50);

  // Mission stats (this month)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthlyMissions] = await db
    .select({ count: count() })
    .from(missionCompletions)
    .where(
      sql`${missionCompletions.creatorId} = ${creator.id} AND ${missionCompletions.completedAt} >= ${monthStart}`,
    );

  // Compute stats
  const totalViews = recentContent.reduce((sum, c) => sum + (c.views ?? 0), 0);
  const totalLikes = recentContent.reduce((sum, c) => sum + (c.likes ?? 0), 0);
  const avgViews = recentContent.length > 0 ? Math.round(totalViews / recentContent.length) : 0;

  // Tier progress
  const tierOrder: PinkTier[] = ['pink_petal', 'pink_rose', 'pink_diamond', 'pink_crown'];
  const currentIdx = tierOrder.indexOf(creator.tier as PinkTier);
  const thresholds: Record<string, { missions: number | null; gmv: number }> = {
    pink_rose: { missions: 50, gmv: 500 },
    pink_diamond: { missions: 200, gmv: 2500 },
    pink_crown: { missions: null, gmv: 10000 },
  };

  let tierProgress = null;
  if (currentIdx < tierOrder.length - 1) {
    const nextTier = tierOrder[currentIdx + 1];
    const threshold = thresholds[nextTier];
    if (threshold) {
      const missionPct = threshold.missions
        ? Math.min(100, ((creator.missionCount ?? 0) / threshold.missions) * 100)
        : 0;
      const gmvPct = Math.min(100, (parseFloat(creator.monthlyGmv ?? '0') / threshold.gmv) * 100);
      tierProgress = {
        nextTier,
        nextTierLabel: TIER_CONFIG[nextTier].label,
        nextTierEmoji: TIER_CONFIG[nextTier].emoji,
        missionProgress: threshold.missions ? { current: creator.missionCount ?? 0, target: threshold.missions, pct: Math.round(missionPct) } : null,
        gmvProgress: { current: parseFloat(creator.monthlyGmv ?? '0'), target: threshold.gmv, pct: Math.round(gmvPct) },
        overallPct: Math.round(Math.max(missionPct, gmvPct)),
      };
    }
  }

  return NextResponse.json({
    creator: {
      id: creator.id,
      tiktokHandle: creator.tiktokHandle,
      displayName: creator.displayName,
      tier: creator.tier,
      tierLabel: tierConfig.label,
      tierEmoji: tierConfig.emoji,
      commissionRate: parseFloat(creator.commissionRate ?? '0'),
      squadBonusRate: parseFloat(creator.squadBonusRate ?? '0'),
      missionCount: creator.missionCount ?? 0,
      pinkScore: parseFloat(creator.pinkScore ?? '0'),
      flatFeeEarned: parseFloat(creator.flatFeeEarned ?? '0'),
      monthlyGmv: parseFloat(creator.monthlyGmv ?? '0'),
      totalGmv: parseFloat(creator.totalGmv ?? '0'),
      followerCount: creator.followerCount ?? 0,
      avgViews: creator.avgViews ?? 0,
      engagementRate: parseFloat(creator.engagementRate ?? '0'),
    },
    stats: {
      totalViews,
      totalLikes,
      avgViews,
      contentCount: recentContent.length,
      monthlyMissions: monthlyMissions?.count ?? 0,
    },
    tierProgress,
  });
}
