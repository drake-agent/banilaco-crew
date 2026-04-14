import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { eq } from 'drizzle-orm';
import { checkRateLimit, clientKey } from '@/lib/api/rate-limit';

/**
 * GET /api/squad/validate?code=MIASQUAD — Validate a squad code
 *
 * Returns the squad leader's display name if the code is valid.
 * Public endpoint (no auth) so join page can validate before submission.
 *
 * M1 FIX: rate limited to prevent squad-code enumeration.
 */
export async function GET(request: NextRequest) {
  const gate = checkRateLimit(clientKey(request, 'squad-validate'), {
    limit: 20,
    windowMs: 60_000,
  });
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((gate.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

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
