import { NextRequest, NextResponse } from 'next/server';
import { getCreatorFromAuth, verifyAdmin, verifyCronAuth } from '@/lib/auth';
import { SquadEngine, SquadJoinError } from '@/lib/referral/referral-engine';

const engine = new SquadEngine();

/**
 * GET /api/squad — Creator's squad info + members
 * Also handles Cron: GET /api/squad?action=calculate_bonuses (FIX: ARCH-2/CFG-2)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Cron handler: monthly bonus calculation
  if (action === 'calculate_bonuses') {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Auto-compute period: previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    const result = await engine.calculateSquadBonuses(period);
    return NextResponse.json({ cron: 'calculate_bonuses', period, ...result });
  }

  const result = await getCreatorFromAuth();
  if (result.error) return result.error;

  const stats = await engine.getSquadStats(result.creatorId);

  return NextResponse.json(stats);
}

/**
 * POST /api/squad — Admin actions (bonus calculation, leaderboard)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'calculate_bonuses': {
      // Cron or admin only
      const isCron = verifyCronAuth(request);
      if (!isCron) {
        const adminResult = await verifyAdmin();
        if (adminResult.error) return adminResult.error;
      }

      const { period } = body;
      if (!period || !/^\d{4}-\d{2}$/.test(period)) {
        return NextResponse.json({ error: 'Valid period (YYYY-MM) required' }, { status: 400 });
      }

      const result = await engine.calculateSquadBonuses(period);
      return NextResponse.json(result);
    }

    case 'leaderboard': {
      const isCron = verifyCronAuth(request);
      if (!isCron) {
        const adminResult = await verifyAdmin();
        if (adminResult.error) return adminResult.error;
      }

      const limit = body.limit ?? 10;
      const leaderboard = await engine.getSquadLeaderboard(limit);
      return NextResponse.json({ leaderboard });
    }

    case 'join': {
      const creatorResult = await getCreatorFromAuth();
      if (creatorResult.error) return creatorResult.error;

      const { leaderId } = body;
      if (!leaderId) {
        return NextResponse.json({ error: 'leaderId required' }, { status: 400 });
      }

      try {
        await engine.joinSquad(creatorResult.creatorId, leaderId);
      } catch (err) {
        if (err instanceof SquadJoinError) {
          return NextResponse.json({ error: err.message }, { status: err.status });
        }
        throw err;
      }
      return NextResponse.json({ joined: true });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
