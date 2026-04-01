import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { clampPagination } from '@/lib/api';

// SEC-1: Admin role verification helper
async function verifyAdmin(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  try {
    const supabase = createServerClient();
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('sb-access-token')?.value;

    if (!authHeader && !sessionCookie) {
      return { authorized: false };
    }

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || sessionCookie || ''
    );

    if (error || !user) return { authorized: false };

    const role = user.user_metadata?.role;
    if (role !== 'admin') return { authorized: false };

    return { authorized: true, userId: user.id };
  } catch {
    return { authorized: false };
  }
}

export async function GET(request: NextRequest) {
  const { authorized } = await verifyAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('weekly_kpis')
    .select('*')
    .order('week_number', { ascending: true });

  if (error) {
    console.error('[KPI GET] Database error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch KPI data' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { authorized } = await verifyAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }

  const supabase = createServerClient();
  const body = await request.json();

  // BUG-4: Guard division by zero in weeks_to_30k calculation
  if (body.weekly_net_increase !== undefined && body.cumulative_affiliates !== undefined) {
    const remaining = 30000 - (Number(body.cumulative_affiliates) || 0);
    const weeklyIncrease = Number(body.weekly_net_increase) || 0;

    if (remaining <= 0) {
      body.weeks_to_30k = 0; // Already at or past 30K
    } else if (weeklyIncrease > 0) {
      body.weeks_to_30k = parseFloat((remaining / weeklyIncrease).toFixed(1));
    } else {
      body.weeks_to_30k = null; // Cannot project with zero/negative growth
    }
  }

  const { data, error } = await supabase
    .from('weekly_kpis')
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error('[KPI POST] Database error:', error.message);
    return NextResponse.json({ error: 'Failed to insert KPI data' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// Dashboard summary endpoint
export async function PUT(request: NextRequest) {
  const { authorized } = await verifyAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }

  const supabase = createServerClient();

  // UNI-002: Use DB-level aggregation RPC instead of loading all creators into memory
  const [summary, latestKpi] = await Promise.all([
    supabase.rpc('get_dashboard_summary'),
    supabase.from('weekly_kpis').select('*').order('week_number', { ascending: false }).limit(1).single(),
  ]);

  if (summary.error) {
    console.error('[KPI PUT] Summary RPC error:', summary.error.message);
    return NextResponse.json({ error: 'Failed to compute dashboard summary' }, { status: 500 });
  }

  // BUG-2: Proper null handling for latestKpi
  const kpi = latestKpi.data;
  if (latestKpi.error && latestKpi.error.code !== 'PGRST116') {
    console.error('[KPI PUT] Failed to fetch latest KPI:', latestKpi.error.message);
  }

  const data = summary.data;

  return NextResponse.json({
    totalCreators: data.totalCreators,
    activeCreators: data.activeCreators,
    weeklyNetIncrease: kpi?.weekly_net_increase ?? 0,
    weeksTo30K: kpi?.weeks_to_30k ?? 0,
    totalGMV: data.totalGMV,
    monthlyGMV: kpi?.monthly_gmv ?? 0,
    pendingSamples: data.pendingSamples,
    samplePostRate: kpi?.sample_post_rate ?? 0,
    outreachPipelineCount: data.outreachPipelineCount,
    dmResponseRate: kpi?.dm_response_rate ?? 0,
    tierBreakdown: data.tierBreakdown,
    sourceBreakdown: data.sourceBreakdown,
  });
}
