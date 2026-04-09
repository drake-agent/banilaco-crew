import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { eq } from 'drizzle-orm';

/**
 * GET /api/squad/validate?code=MIASQUAD — Validate a squad code
 *
 * Returns the squad leader's display name if the code is valid.
 * Public endpoint (no auth) so join page can validate before submission.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase();

  if (!code || code.length < 3) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  const [leader] = await db
    .select({
      displayName: creators.displayName,
      tiktokHandle: creators.tiktokHandle,
      tier: creators.tier,
    })
    .from(creators)
    .where(eq(creators.squadCode, code))
    .limit(1);

  if (!leader) {
    return NextResponse.json({ error: 'Squad code not found' }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    leaderName: leader.displayName ?? `@${leader.tiktokHandle}`,
    leaderTier: leader.tier,
  });
}
