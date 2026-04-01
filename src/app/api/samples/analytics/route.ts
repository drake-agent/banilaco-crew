// ============================================
// /api/samples/analytics — Sample ROI Analytics
//
// GET /api/samples/analytics
//   ?period=30d|90d|all
//   &tier=bronze|silver|gold|diamond
//   &set_type=hero|premium|mini
//
// Returns:
//   - Pipeline funnel (requested → content_posted conversion)
//   - ROI per tier, per set_type
//   - Top performing samples by GMV
//   - Average days to content
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  // Verify admin role
  const { data: { session } } = await supabase.auth.getSession();
  const isAdmin = session?.user?.user_metadata?.role === 'admin';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const period = searchParams.get('period') || '90d';
  const tierFilter = searchParams.get('tier');
  const setTypeFilter = searchParams.get('set_type');

  // Calculate date range
  const now = new Date();
  let startDate: string | null = null;
  if (period === '30d') {
    startDate = new Date(now.getTime() - 30 * 86400000).toISOString();
  } else if (period === '90d') {
    startDate = new Date(now.getTime() - 90 * 86400000).toISOString();
  }
  // 'all' → no date filter

  // ── 1. Pipeline Funnel ────────────────────
  let pipelineQuery = supabase
    .from('sample_shipments')
    .select('status, set_type, estimated_cost, shipping_cost');

  if (startDate) pipelineQuery = pipelineQuery.gte('created_at', startDate);
  if (setTypeFilter) pipelineQuery = pipelineQuery.eq('set_type', setTypeFilter);

  const { data: pipelineData, error: pipelineErr } = await pipelineQuery;

  if (pipelineErr) {
    console.error('[Sample Analytics] Pipeline query error:', pipelineErr);
    return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 });
  }

  const pipeline = {
    requested: 0,
    approved: 0,
    shipped: 0,
    delivered: 0,
    reminder_1: 0,
    reminder_2: 0,
    content_posted: 0,
    no_response: 0,
    total: pipelineData?.length || 0,
    total_cost: 0,
  };

  for (const s of pipelineData || []) {
    const status = s.status as keyof typeof pipeline;
    if (status in pipeline && typeof pipeline[status] === 'number') {
      (pipeline as any)[status]++;
    }
    pipeline.total_cost += (Number(s.estimated_cost) || 0) + (Number(s.shipping_cost) || 0);
  }

  // Conversion rates
  const totalDelivered = pipeline.delivered + pipeline.reminder_1 + pipeline.reminder_2 + pipeline.content_posted + pipeline.no_response;
  const conversionRate = totalDelivered > 0
    ? Math.round((pipeline.content_posted / totalDelivered) * 1000) / 10
    : 0;

  // ── 2. ROI by Tier ────────────────────────
  let roiQuery = supabase
    .from('sample_shipments')
    .select(`
      id, status, set_type, estimated_cost, shipping_cost,
      delivered_at, content_posted_at,
      creator:creators!inner(tier, tiktok_handle)
    `);

  if (startDate) roiQuery = roiQuery.gte('created_at', startDate);
  if (tierFilter) roiQuery = roiQuery.eq('creators.tier', tierFilter);
  if (setTypeFilter) roiQuery = roiQuery.eq('set_type', setTypeFilter);

  const { data: roiData } = await roiQuery;

  const tierStats: Record<string, {
    count: number;
    cost: number;
    content_count: number;
    days_to_content: number[];
  }> = {};

  for (const s of roiData || []) {
    const tier = (s.creator as any)?.tier || 'unknown';
    if (!tierStats[tier]) {
      tierStats[tier] = { count: 0, cost: 0, content_count: 0, days_to_content: [] };
    }
    tierStats[tier].count++;
    tierStats[tier].cost += (Number(s.estimated_cost) || 0) + (Number(s.shipping_cost) || 0);

    if (s.status === 'content_posted') {
      tierStats[tier].content_count++;
    }

    if (s.delivered_at && s.content_posted_at) {
      const days = Math.ceil(
        (new Date(s.content_posted_at).getTime() - new Date(s.delivered_at).getTime()) / 86400000
      );
      tierStats[tier].days_to_content.push(days);
    }
  }

  const roiByTier = Object.entries(tierStats).map(([tier, stats]) => ({
    tier,
    samples_sent: stats.count,
    total_cost: Math.round(stats.cost * 100) / 100,
    content_posted: stats.content_count,
    content_rate_pct: stats.count > 0
      ? Math.round((stats.content_count / stats.count) * 1000) / 10
      : 0,
    avg_days_to_content: stats.days_to_content.length > 0
      ? Math.round(stats.days_to_content.reduce((a, b) => a + b, 0) / stats.days_to_content.length * 10) / 10
      : null,
    cost_per_content: stats.content_count > 0
      ? Math.round((stats.cost / stats.content_count) * 100) / 100
      : null,
  }));

  // ── 3. Response ───────────────────────────
  return NextResponse.json({
    period,
    pipeline: {
      ...pipeline,
      conversion_rate_pct: conversionRate,
    },
    roi_by_tier: roiByTier.sort((a, b) => {
      const order = ['bronze', 'silver', 'gold', 'diamond'];
      return order.indexOf(a.tier) - order.indexOf(b.tier);
    }),
    summary: {
      total_samples: pipeline.total,
      total_cost: Math.round(pipeline.total_cost * 100) / 100,
      total_content: pipeline.content_posted,
      overall_conversion_pct: conversionRate,
      avg_cost_per_content: pipeline.content_posted > 0
        ? Math.round((pipeline.total_cost / pipeline.content_posted) * 100) / 100
        : null,
    },
  });
}
