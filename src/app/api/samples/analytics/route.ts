import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sampleShipments } from '@/db/schema/samples';
import { creators } from '@/db/schema/creators';
import { verifyAdmin } from '@/lib/auth';
import { eq, gte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '90d';

  let startDate: Date | null = null;
  if (period === '30d') startDate = new Date(Date.now() - 30 * 86400000);
  else if (period === '90d') startDate = new Date(Date.now() - 90 * 86400000);

  // Pipeline data
  const conditions = [];
  if (startDate) conditions.push(gte(sampleShipments.createdAt, startDate));

  const allSamples = await db
    .select({
      status: sampleShipments.status,
      setType: sampleShipments.setType,
      estimatedCost: sampleShipments.estimatedCost,
      shippingCost: sampleShipments.shippingCost,
      deliveredAt: sampleShipments.deliveredAt,
      contentPostedAt: sampleShipments.contentPostedAt,
      creatorTier: creators.tier,
    })
    .from(sampleShipments)
    .leftJoin(creators, eq(sampleShipments.creatorId, creators.id))
    .where(conditions.length > 0 ? conditions[0] : undefined);

  // Pipeline funnel
  const pipeline: Record<string, number> = {
    requested: 0, approved: 0, shipped: 0, delivered: 0,
    reminder_1: 0, reminder_2: 0, content_posted: 0, no_response: 0,
  };
  let totalCost = 0;

  for (const s of allSamples) {
    if (s.status && s.status in pipeline) pipeline[s.status]++;
    totalCost += (parseFloat(s.estimatedCost ?? '0')) + (parseFloat(s.shippingCost ?? '0'));
  }

  const totalDelivered = pipeline.delivered + pipeline.reminder_1 + pipeline.reminder_2 + pipeline.content_posted + pipeline.no_response;
  const conversionRate = totalDelivered > 0 ? Math.round((pipeline.content_posted / totalDelivered) * 1000) / 10 : 0;

  // ROI by tier
  const tierStats: Record<string, { count: number; cost: number; contentCount: number; daysToContent: number[] }> = {};
  for (const s of allSamples) {
    const tier = s.creatorTier ?? 'unknown';
    if (!tierStats[tier]) tierStats[tier] = { count: 0, cost: 0, contentCount: 0, daysToContent: [] };
    tierStats[tier].count++;
    tierStats[tier].cost += parseFloat(s.estimatedCost ?? '0') + parseFloat(s.shippingCost ?? '0');
    if (s.status === 'content_posted') tierStats[tier].contentCount++;
    if (s.deliveredAt && s.contentPostedAt) {
      tierStats[tier].daysToContent.push(Math.ceil((s.contentPostedAt.getTime() - s.deliveredAt.getTime()) / 86400000));
    }
  }

  const tierOrder = ['pink_petal', 'pink_rose', 'pink_diamond', 'pink_crown'];
  const roiByTier = Object.entries(tierStats)
    .map(([tier, stats]) => ({
      tier,
      samples_sent: stats.count,
      total_cost: Math.round(stats.cost * 100) / 100,
      content_posted: stats.contentCount,
      content_rate_pct: stats.count > 0 ? Math.round((stats.contentCount / stats.count) * 1000) / 10 : 0,
      avg_days_to_content: stats.daysToContent.length > 0
        ? Math.round(stats.daysToContent.reduce((a, b) => a + b, 0) / stats.daysToContent.length * 10) / 10
        : null,
      cost_per_content: stats.contentCount > 0 ? Math.round((stats.cost / stats.contentCount) * 100) / 100 : null,
    }))
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return NextResponse.json({
    period,
    pipeline: { ...pipeline, total: allSamples.length, total_cost: Math.round(totalCost * 100) / 100, conversion_rate_pct: conversionRate },
    roi_by_tier: roiByTier,
    summary: {
      total_samples: allSamples.length,
      total_cost: Math.round(totalCost * 100) / 100,
      total_content: pipeline.content_posted,
      overall_conversion_pct: conversionRate,
      avg_cost_per_content: pipeline.content_posted > 0 ? Math.round((totalCost / pipeline.content_posted) * 100) / 100 : null,
    },
  });
}
