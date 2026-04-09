import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pinkLeagueSeasons, pinkLeagueEntries } from '@/db/schema/league';
import { verifyAuth } from '@/lib/auth';
import { eq, and, sql } from 'drizzle-orm';

/**
 * POST /api/league/vote — Fan voting during season finale (voting status)
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuth();
  if (authResult.error) return authResult.error;

  const body = await request.json();
  const { seasonId, creatorId } = body;

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

  // Increment vote (simple — no duplicate check for now, can add later)
  await db.update(pinkLeagueEntries).set({
    fanVoteCount: (entry.fanVoteCount ?? 0) + 1,
    updatedAt: new Date(),
  }).where(eq(pinkLeagueEntries.id, entry.id));

  return NextResponse.json({
    voted: true,
    creatorId,
    newVoteCount: (entry.fanVoteCount ?? 0) + 1,
  });
}
