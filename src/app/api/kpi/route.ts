import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weeklyKpis } from '@/db/schema/kpi';
import { creators } from '@/db/schema/creators';
import { sampleShipments } from '@/db/schema/samples';
import { outreachPipeline } from '@/db/schema/outreach';
import { verifyAdmin } from '@/lib/auth';
import { desc, eq, count, sql } from 'drizzle-orm';

export async function GET() {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const data = await db.select().from(weeklyKpis).orderBy(desc(weeklyKpis.weekStarting));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const body = await request.json();

  // BUG-4: Guard division by zero
  if (body.weekly_net_increase !== undefined && body.cumulative_affiliates !== undefined) {
    const remaining = 30000 - (Number(body.cumulative_affiliates) || 0);
    const weeklyIncrease = Number(body.weekly_net_increase) || 0;
    if (remaining <= 0) body.weeks_to_30k = 0;
    else if (weeklyIncrease > 0) body.weeks_to_30k = parseFloat((remaining / weeklyIncrease).toFixed(1));
    else body.weeks_to_30k = null;
  }

  const [kpi] = await db.insert(weeklyKpis).values({
    weekStarting: body.week_starting,
    cumulativeAffiliates: body.cumulative_affiliates,
    weeklyNewAffiliates: body.weekly_new_affiliates,
    churned: body.churned,
    netIncrease: body.net_increase ?? body.weekly_net_increase,
    monthlyGmv: body.monthly_gmv?.toString(),
    openCollabNew: body.open_collab_new,
    dmOutreachNew: body.dm_outreach_new,
    mcnNew: body.mcn_new,
    buyerToCreatorNew: body.buyer_to_creator_new,
    referralNew: body.referral_new,
    paidNew: body.paid_new,
    discordNew: body.discord_new ?? 0,
    dmResponseRate: body.dm_response_rate?.toString(),
    samplePostRate: body.sample_post_rate?.toString(),
    sampleShipped: body.sample_shipped,
    weeksTo30k: body.weeks_to_30k?.toString(),
    tierBreakdown: body.tier_breakdown,
    notes: body.notes,
  }).returning();

  return NextResponse.json({ data: kpi }, { status: 201 });
}

/**
 * PUT /api/kpi — Dashboard summary (aggregated from DB)
 */
export async function PUT() {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const [
    [totalCreators],
    [activeCreators],
    tierBreakdown,
    sourceBreakdown,
    [pendingSamples],
    [outreachCount],
    latestKpi,
  ] = await Promise.all([
    db.select({ count: count() }).from(creators),
    db.select({ count: count() }).from(creators).where(eq(creators.status, 'active')),
    db.select({ tier: creators.tier, count: count() }).from(creators).groupBy(creators.tier),
    db.select({ source: creators.source, count: count() }).from(creators).groupBy(creators.source),
    db.select({ count: count() }).from(sampleShipments).where(eq(sampleShipments.status, 'requested')),
    db.select({ count: count() }).from(outreachPipeline),
    db.select().from(weeklyKpis).orderBy(desc(weeklyKpis.weekStarting)).limit(1),
  ]);

  const kpi = latestKpi[0];
  const totalGmv = await db.select({ sum: sql<string>`COALESCE(SUM(${creators.totalGmv}::numeric), 0)` }).from(creators);

  return NextResponse.json({
    totalCreators: totalCreators?.count ?? 0,
    activeCreators: activeCreators?.count ?? 0,
    weeklyNetIncrease: kpi?.netIncrease ?? 0,
    weeksTo30K: kpi?.weeksTo30k ?? null,
    totalGMV: parseFloat(totalGmv[0]?.sum ?? '0'),
    monthlyGMV: kpi?.monthlyGmv ?? 0,
    pendingSamples: pendingSamples?.count ?? 0,
    samplePostRate: kpi?.samplePostRate ?? 0,
    outreachPipelineCount: outreachCount?.count ?? 0,
    dmResponseRate: kpi?.dmResponseRate ?? 0,
    tierBreakdown: Object.fromEntries(tierBreakdown.map((t) => [t.tier, t.count])),
    sourceBreakdown: Object.fromEntries(sourceBreakdown.filter((s) => s.source).map((s) => [s.source!, s.count])),
  });
}
