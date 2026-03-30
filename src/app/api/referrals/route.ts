import { NextRequest, NextResponse } from 'next/server';
import { createReferralEngine } from '@/lib/referral';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // SECURITY: Verify authentication (VULN-003)
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('sb-access-token')?.value;
    if (!authHeader && !sessionCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const referralEngine = createReferralEngine();

    // Leaderboard doesn't need creator_id
    if (action === 'leaderboard') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const leaderboard = await referralEngine.getReferralLeaderboard(limit);
      return NextResponse.json({ data: leaderboard });
    }

    const creatorId = searchParams.get('creator_id');
    if (!creatorId) {
      return NextResponse.json(
        { error: 'creator_id is required' },
        { status: 400 }
      );
    }

    // Default: get creator's referral stats
    const stats = await referralEngine.getCreatorReferralStats(creatorId);
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Referrals GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const referralEngine = createReferralEngine();

    if (action === 'generate_code') {
      const { creator_id, custom_code } = body;

      if (!creator_id) {
        return NextResponse.json(
          { error: 'creator_id is required' },
          { status: 400 }
        );
      }

      const code = await referralEngine.generateCode(creator_id, custom_code);
      return NextResponse.json({ data: { code } });
    }

    if (action === 'use_code') {
      const { code, handle, email } = body;

      if (!code || !handle) {
        return NextResponse.json(
          { error: 'code and handle are required' },
          { status: 400 }
        );
      }

      await referralEngine.processReferralSignup(code, handle, email);
      return NextResponse.json(
        { data: { success: true } },
        { status: 201 }
      );
    }

    if (action === 'update_statuses') {
      // Admin only - should verify auth token in production
      const result = await referralEngine.updateReferralStatuses();
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Referrals POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
