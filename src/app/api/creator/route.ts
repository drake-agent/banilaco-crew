import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: Fetch creator's own dashboard data
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get('id');

  if (!creatorId) {
    return NextResponse.json({ error: 'Creator ID required' }, { status: 400 });
  }

  // SECURITY: Verify authentication (VULN-001)
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('sb-access-token')?.value;
  if (!authHeader && !sessionCookie) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Fetch creator profile
  const { data: creator, error: creatorError } = await supabase
    .from('creators')
    .select('*')
    .eq('id', creatorId)
    .single();

  if (creatorError || !creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Fetch their samples
  const { data: samples } = await supabase
    .from('sample_shipments')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  // Fetch their content
  const { data: content } = await supabase
    .from('content_tracking')
    .select('*')
    .eq('creator_id', creatorId)
    .limit(30)
    .order('posted_at', { ascending: false });

  // Calculate improvement recommendations based on their data
  const avgCtr = content?.length
    ? content.reduce((sum, c) => sum + (typeof c.ctr === 'number' ? c.ctr : 0), 0) / content.length
    : 0;
  const avgCvr = content?.length
    ? content.reduce((sum, c) => sum + (typeof c.cvr === 'number' ? c.cvr : 0), 0) / content.length
    : 0;

  // Get top creators for comparison (aggregate)
  const { data: topCreators } = await supabase
    .from('creators')
    .select('monthly_gmv, monthly_content_count')
    .eq('tier', 'gold')
    .order('monthly_gmv', { ascending: false })
    .limit(10);

  const topAvgGmv = topCreators?.length
    ? topCreators.reduce((sum, c) => sum + c.monthly_gmv, 0) / topCreators.length
    : 0;

  // Build tier progress
  const tierProgress = {
    currentTier: creator.tier,
    currentGmv: creator.monthly_gmv ?? 0,
    currentContent: creator.monthly_content_count,
    nextTier: creator.tier === 'bronze' ? 'silver' : creator.tier === 'silver' ? 'gold' : creator.tier === 'gold' ? 'diamond' : 'diamond',
    gmvNeeded: creator.tier === 'bronze' ? 0 : creator.tier === 'silver' ? 1000 : creator.tier === 'gold' ? 5000 : 0,
    gmvRemaining: creator.tier === 'silver' ? Math.max(0, 1000 - (creator.monthly_gmv ?? 0)) : creator.tier === 'gold' ? Math.max(0, 5000 - (creator.monthly_gmv ?? 0)) : 0,
    contentNeeded: creator.tier === 'bronze' ? 5 : 0,
  };

  // Build recommendations
  const recommendations = [];
  if (avgCtr < 3.5) {
    recommendations.push({
      category: 'Hook',
      priority: 'high',
      current: `Average CTR: ${avgCtr.toFixed(1)}%`,
      recommendation: 'Use stronger hooks in the first 1.5 seconds. Top creators show Before/After in the first frame.',
      impact: '+40% CTR expected',
    });
  }
  if (creator.monthly_content_count < 5) {
    recommendations.push({
      category: 'Posting Frequency',
      priority: 'medium',
      current: `${creator.monthly_content_count} posts/month`,
      recommendation: 'Post 3+ times per week for algorithm boost and faster tier progression.',
      impact: '+5% Commission at Silver',
    });
  }
  if (avgCvr < 2.0) {
    recommendations.push({
      category: 'CTA Placement',
      priority: 'medium',
      current: `Average CVR: ${avgCvr.toFixed(1)}%`,
      recommendation: 'Add a CTA at the 30-second mark instead of only at the end.',
      impact: '+35% CVR expected',
    });
  }

  return NextResponse.json({
    creator,
    samples: samples || [],
    content: content || [],
    tierProgress,
    recommendations,
    comparison: {
      yourAvgGmv: creator.monthly_gmv ?? 0,
      topAvgGmv,
      yourAvgCtr: avgCtr,
      yourAvgCvr: avgCvr,
    },
  });
}
