import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { RecommendationEngine } from '@/lib/ai/recommendation-engine';

/**
 * GET /api/creator/recommendations
 * Fetch existing recommendations for authenticated creator
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user's creator_id
    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.session.user.id;

    // Look up creator_id from creator_accounts table
    const { data: account, error: accountError } = await supabase
      .from('creator_accounts')
      .select('creator_id')
      .eq('auth_user_id', userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Creator account not found' }, { status: 404 });
    }

    const creatorId = account.creator_id;

    // Fetch recommendations
    const { data: recommendations, error } = await supabase
      .from('creator_recommendations')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_dismissed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      creator_id: creatorId,
      recommendations: recommendations || [],
    });
  } catch (error) {
    console.error('Error in GET /api/creator/recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/creator/recommendations
 * Trigger recommendation regeneration for authenticated creator
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user's creator_id
    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.session.user.id;

    // Look up creator_id
    const { data: account, error: accountError } = await supabase
      .from('creator_accounts')
      .select('creator_id')
      .eq('auth_user_id', userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Creator account not found' }, { status: 404 });
    }

    const creatorId = account.creator_id;

    // Generate recommendations
    const engine = new RecommendationEngine();
    const recommendations = await engine.generateRecommendations(creatorId);

    return NextResponse.json({
      status: 'generated',
      creator_id: creatorId,
      recommendations_count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error('Error in POST /api/creator/recommendations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/creator/recommendations
 * Dismiss a recommendation (set is_dismissed = true)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authData.session.user.id;

    // Verify creator ownership
    const { data: account, error: accountError } = await supabase
      .from('creator_accounts')
      .select('creator_id')
      .eq('auth_user_id', userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Creator account not found' }, { status: 404 });
    }

    // Get recommendation ID from request body
    const body = await request.json();
    const { recommendation_id } = body;

    if (!recommendation_id) {
      return NextResponse.json({ error: 'recommendation_id required' }, { status: 400 });
    }

    // Verify the recommendation belongs to this creator
    const { data: rec, error: recError } = await supabase
      .from('creator_recommendations')
      .select('creator_id')
      .eq('id', recommendation_id)
      .single();

    if (recError || !rec || rec.creator_id !== account.creator_id) {
      return NextResponse.json({ error: 'Recommendation not found or not owned' }, { status: 403 });
    }

    // Mark as dismissed
    const { error: updateError } = await supabase
      .from('creator_recommendations')
      .update({ is_dismissed: true, updated_at: new Date().toISOString() })
      .eq('id', recommendation_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'dismissed',
      recommendation_id,
    });
  } catch (error) {
    console.error('Error in PATCH /api/creator/recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
