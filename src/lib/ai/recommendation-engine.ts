/**
 * Recommendation Engine — Drizzle ORM
 * Rule-based + AI-enhanced creator guidance (FNCO strategy patterns)
 */

import { db } from '@/db';
import { creators, type PinkTier, TIER_CONFIG } from '@/db/schema/creators';
import { contentTracking } from '@/db/schema/content';
import { eq, desc, gte, sql } from 'drizzle-orm';
import { generateAITips } from './prompt-templates';

export type RecommendationCategory = 'hook' | 'format' | 'posting_schedule' | 'cta' | 'timing' | 'mission';
export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  creatorId: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  currentState: string;
  recommendation: string;
  expectedImpact: string;
}

export interface CreatorContentMetrics {
  avgViews: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  engagementRate: number;
  postingFrequency: number;
  totalVideos: number;
  topContentType: string | null;
}

export class RecommendationEngine {
  async generateRecommendations(creatorId: string): Promise<Recommendation[]> {
    // Fetch creator
    const [creator] = await db.select().from(creators).where(eq(creators.id, creatorId)).limit(1);
    if (!creator) throw new Error(`Creator not found: ${creatorId}`);

    // Get 30-day content
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const content = await db
      .select()
      .from(contentTracking)
      .where(sql`${contentTracking.creatorId} = ${creatorId} AND ${contentTracking.postedAt} >= ${thirtyDaysAgo}`)
      .orderBy(desc(contentTracking.postedAt))
      .limit(50);

    const metrics = this.computeMetrics(content);

    // Get tier comparison
    const topCreators = await db
      .select({ avgViews: creators.avgViews, engagementRate: creators.engagementRate })
      .from(creators)
      .where(eq(creators.tier, creator.tier))
      .orderBy(desc(sql`COALESCE(${creators.monthlyGmv}, '0')::numeric`))
      .limit(10);

    const tierMedianViews = topCreators.length > 0
      ? topCreators.reduce((sum, c) => sum + (c.avgViews ?? 0), 0) / topCreators.length
      : 0;

    // Generate rule-based recommendations
    const recs = this.generateRules(creator, metrics, tierMedianViews);

    // Try AI enhancement
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey && recs.length > 0) {
        const tips = await generateAITips(
          { creator: creator as any, metrics, tierComparison: { tierMedianViews, tierMedianEngagement: 0, tierTopFormat: 'routine', creatorRankPercentile: 50 } },
          apiKey,
        );
        if (tips.length > 0) {
          const highIdx = recs.findIndex((r) => r.priority === 'high');
          if (highIdx >= 0) recs[highIdx].recommendation = tips[0];
        }
      }
    } catch { /* fallback to rule-based */ }

    return recs;
  }

  private computeMetrics(content: typeof contentTracking.$inferSelect[]): CreatorContentMetrics {
    if (!content.length) {
      return { avgViews: 0, avgLikes: 0, avgComments: 0, avgShares: 0, engagementRate: 0, postingFrequency: 0, totalVideos: 0, topContentType: null };
    }

    const avgViews = content.reduce((s, c) => s + (c.views ?? 0), 0) / content.length;
    const avgLikes = content.reduce((s, c) => s + (c.likes ?? 0), 0) / content.length;
    const avgComments = content.reduce((s, c) => s + (c.comments ?? 0), 0) / content.length;
    const avgShares = content.reduce((s, c) => s + (c.shares ?? 0), 0) / content.length;
    const engagementRate = avgViews > 0 ? ((avgLikes + avgComments + avgShares) / avgViews) * 100 : 0;

    const now = Date.now();
    const oldest = content[content.length - 1]?.postedAt?.getTime() ?? now;
    const daysDiff = Math.max(1, (now - oldest) / 86400000);
    const postingFrequency = (content.length / daysDiff) * 7;

    const typeCounts: Record<string, number> = {};
    content.forEach((c) => { if (c.contentType) typeCounts[c.contentType] = (typeCounts[c.contentType] ?? 0) + 1; });
    const topContentType = Object.keys(typeCounts).length
      ? Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return {
      avgViews: Math.round(avgViews), avgLikes: Math.round(avgLikes),
      avgComments: Math.round(avgComments), avgShares: Math.round(avgShares),
      engagementRate: Math.round(engagementRate * 100) / 100,
      postingFrequency: Math.round(postingFrequency * 100) / 100,
      totalVideos: content.length, topContentType,
    };
  }

  private generateRules(
    creator: typeof creators.$inferSelect,
    metrics: CreatorContentMetrics,
    tierMedianViews: number,
  ): Recommendation[] {
    const recs: Recommendation[] = [];
    const tier = creator.tier as PinkTier;
    const missionCount = creator.missionCount ?? 0;

    // Hook strength
    if (metrics.engagementRate < 5) {
      recs.push({
        creatorId: creator.id, category: 'hook', priority: 'high',
        currentState: `Engagement: ${metrics.engagementRate.toFixed(1)}%`,
        recommendation: 'First 3 seconds must stop scrolling. Use Visual Shock (macro texture), Before/After, or ASMR hooks. Clean It Zero Before/After = 3.2x GMV.',
        expectedImpact: '+40% CTR',
      });
    }

    // Posting frequency
    if (metrics.postingFrequency < 3) {
      recs.push({
        creatorId: creator.id, category: 'posting_schedule', priority: 'high',
        currentState: `${metrics.postingFrequency.toFixed(1)} posts/week`,
        recommendation: 'Post 4-5x/week. Best times: weekdays 7-9pm. TikTok algorithm rewards consistency.',
        expectedImpact: '+50% reach',
      });
    }

    // Format optimization
    if (tierMedianViews > 0 && metrics.avgViews < tierMedianViews * 0.7) {
      recs.push({
        creatorId: creator.id, category: 'format', priority: 'medium',
        currentState: `Avg views: ${metrics.avgViews.toLocaleString()}`,
        recommendation: `GRWM + product reveal = 2-5x engagement. Before/After + durability test = highest save rate. Try 12-hour wear test format.`,
        expectedImpact: '+3.2x GMV',
      });
    }

    // CTA
    if (metrics.engagementRate < 3) {
      recs.push({
        creatorId: creator.id, category: 'cta', priority: 'medium',
        currentState: `Low engagement: ${metrics.engagementRate.toFixed(1)}%`,
        recommendation: 'Pin product link as FIRST COMMENT (30% higher CTR). Add CTA at video midpoint, not just end.',
        expectedImpact: '+35% CVR',
      });
    }

    // Mission strategy (Pink Squad specific)
    if (tier === 'pink_petal' && missionCount < 10) {
      recs.push({
        creatorId: creator.id, category: 'mission', priority: 'high',
        currentState: `${missionCount} missions completed`,
        recommendation: 'Complete 3 daily missions every day. 50 missions = Pink Rose (12% commission + Squad recruitment). Start with Learning missions.',
        expectedImpact: 'Pink Rose unlock',
      });
    } else if (tier === 'pink_rose' && missionCount < 100) {
      recs.push({
        creatorId: creator.id, category: 'mission', priority: 'medium',
        currentState: `${missionCount}/200 missions`,
        recommendation: 'Focus on Creation + Viral missions. 200 missions = Pink Diamond (15% commission + PINK LEAGUE entry).',
        expectedImpact: 'Pink Diamond unlock',
      });
    }

    // Share optimization (Pink Score)
    if (metrics.totalVideos > 0 && metrics.avgShares < metrics.avgViews * 0.05) {
      recs.push({
        creatorId: creator.id, category: 'format', priority: 'low',
        currentState: `Share rate: ${metrics.avgViews > 0 ? ((metrics.avgShares / metrics.avgViews) * 100).toFixed(1) : 0}%`,
        recommendation: 'Shares have highest weight in Pink Score (0.4). Create forwarding-worthy content: surprising transformations, myth-busters, relatable pain points.',
        expectedImpact: '+Pink Score boost',
      });
    }

    return recs;
  }
}

export default RecommendationEngine;
