import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contentTracking } from '@/db/schema/content';
import { creators, TIER_CONFIG, type PinkTier } from '@/db/schema/creators';
import { getCreatorFromAuth } from '@/lib/auth';
import { eq, desc, gte, sql } from 'drizzle-orm';

/**
 * GET /api/creator/recommendations — AI-powered recommendations
 * Uses rule-based recommendations with FNCO content strategy knowledge.
 */
export async function GET() {
  const result = await getCreatorFromAuth();
  if (result.error) return result.error;

  const { creator, creatorId } = result;

  // Get recent content (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const recentContent = await db
    .select()
    .from(contentTracking)
    .where(sql`${contentTracking.creatorId} = ${creatorId} AND ${contentTracking.postedAt} >= ${thirtyDaysAgo}`)
    .orderBy(desc(contentTracking.postedAt))
    .limit(30);

  // Compute metrics
  const totalViews = recentContent.reduce((sum, c) => sum + (c.views ?? 0), 0);
  const totalLikes = recentContent.reduce((sum, c) => sum + (c.likes ?? 0), 0);
  const totalShares = recentContent.reduce((sum, c) => sum + (c.shares ?? 0), 0);
  const avgViews = recentContent.length > 0 ? totalViews / recentContent.length : 0;
  const engagementRate = totalViews > 0 ? (totalLikes + totalShares) / totalViews : 0;
  const weeklyPostCount = recentContent.filter(
    (c) => c.postedAt && c.postedAt.getTime() > Date.now() - 7 * 86400000,
  ).length;

  // Generate rule-based recommendations
  const recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    current: string;
    recommendation: string;
    expectedImpact: string;
  }> = [];

  // 1. Hook strength
  if (engagementRate < 0.05) {
    recommendations.push({
      category: 'hook',
      priority: 'high',
      current: `Engagement rate: ${(engagementRate * 100).toFixed(1)}%`,
      recommendation: 'Use Visual Shock or Before/After hooks in first 3 seconds. Macro texture close-ups of Clean It Zero generate 3.2x more GMV.',
      expectedImpact: '+40% CTR',
    });
  }

  // 2. Posting frequency
  if (weeklyPostCount < 3) {
    recommendations.push({
      category: 'frequency',
      priority: 'high',
      current: `${weeklyPostCount} posts this week`,
      recommendation: 'Post 4-5 times per week. TikTok algorithm rewards consistency. Best times: weekdays 7-9pm.',
      expectedImpact: '+50% reach',
    });
  }

  // 3. Content format
  if (avgViews < (creator.avgViews ?? 0) * 0.7) {
    recommendations.push({
      category: 'format',
      priority: 'medium',
      current: `Avg views: ${Math.round(avgViews)}`,
      recommendation: 'Switch to GRWM + product reveal format (2-5x engagement vs generic reviews). Or try ASMR texture close-ups for highest watch time.',
      expectedImpact: '+3.2x GMV',
    });
  }

  // 4. CTA optimization
  if (engagementRate < 0.03) {
    recommendations.push({
      category: 'cta',
      priority: 'medium',
      current: `Low engagement: ${(engagementRate * 100).toFixed(1)}%`,
      recommendation: 'Pin product link as FIRST COMMENT (30% higher CTR). Add CTA at video midpoint, not just at the end.',
      expectedImpact: '+35% CVR',
    });
  }

  // 5. Mission strategy
  const tierConfig = TIER_CONFIG[creator.tier as PinkTier];
  const missionCount = creator.missionCount ?? 0;
  if (creator.tier === 'pink_petal' && missionCount < 10) {
    recommendations.push({
      category: 'mission',
      priority: 'high',
      current: `${missionCount} missions completed`,
      recommendation: 'Complete 3 daily missions every day. 50 missions = Pink Rose tier with 12% commission + Squad recruitment. Focus on Learning missions to build skill first.',
      expectedImpact: 'Pink Rose unlock',
    });
  }

  // 6. Share optimization (for Pink Score)
  if (totalShares < totalViews * 0.05) {
    recommendations.push({
      category: 'viral',
      priority: 'low',
      current: `Share rate: ${totalViews > 0 ? ((totalShares / totalViews) * 100).toFixed(1) : 0}%`,
      recommendation: 'Shares have the highest weight in Pink Score (0.4). Create content people want to forward — surprising transformations, relatable pain points, or myth-busting hooks.',
      expectedImpact: '+Pink Score boost',
    });
  }

  return NextResponse.json({
    recommendations: recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    }),
    metrics: {
      avgViews: Math.round(avgViews),
      engagementRate: Math.round(engagementRate * 1000) / 10,
      weeklyPostCount,
      totalContent: recentContent.length,
      missionCount,
      tier: creator.tier,
    },
  });
}
