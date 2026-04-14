import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pinkLeagueSeasons, pinkLeagueEntries, pinkLeagueVotes } from '@/db/schema/league';
import { verifyAuth } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';
import { parseJsonBody } from '@/lib/api/errors';

/**
 * POST /api/league/vote — Fan voting during season finale (voting status)
 *
 * SEC-1 FIX: One vote per user per season via pinkLeagueVotes table.
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuth();
  if (authResult.error) return authResult.error;

  const parsed = await parseJsonBody<{ seasonId?: string; creatorId?: string }>(request);
  if (parsed.error) return parsed.error;
  const { seasonId, creatorId } = parsed.data;

  if (!seasonId || !creatorId) {
    return NextResponse.json({ error: 'seasonId and creatorId required' }, { status: 400 });
  }

  // Verify season is in voting status
  const [season] = await db
    .select()
    .from(pinkLeagueSeasons)
    .where(and(eq(pinkLeagueSeasons.id, seasonId), eq(pinkLeagueSeasons.status, 'voting')))
    .limit(1);

  if (!season) {
    return NextResponse.json({ error: 'Season is not in voting phase' }, { status: 400 });
  }

  // Verify creator is a crown candidate
  const [entry] = await db
    .select()
    .from(pinkLeagueEntries)
    .where(
      and(
        eq(pinkLeagueEntries.seasonId, seasonId),
        eq(pinkLeagueEntries.creatorId, creatorId),
        eq(pinkLeagueEntries.isCrownCandidate, true),
      ),
    )
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: 'Creator is not a Pink Crown candidate' }, { status: 400 });
  }

  // SEC-1 FIX: Insert vote with unique constraint (one vote per user per season)
  try {
    await db.transaction(async (tx) => {
      await tx.insert(pinkLeagueVotes).values({
        seasonId,
        voterId: authResult.user.id,
        creatorId,
      });

      await tx.update(pinkLeagueEntries).set({
        fanVoteCount: sql`COALESCE(${pinkLeagueEntries.fanVoteCount}, 0) + 1`,
        updatedAt: new Date(),
      }).where(eq(pinkLeagueEntries.id, entry.id));
    });
  } catch (err: unknown) {
    // Unique constraint violation = already voted
    const isConstraintViolation = err instanceof Error && (
      (err as unknown as { constraint?: string }).constraint === 'uq_season_voter' ||
      err.message.includes('uq_season_voter')
    );
    if (isConstraintViolation) {
      return NextResponse.json({ error: 'You have already voted this season' }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({
    voted: true,
    creatorId,
  });
}
