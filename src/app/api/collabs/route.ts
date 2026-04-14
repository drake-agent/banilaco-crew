import { NextResponse } from 'next/server';
import { db } from '@/db';
import { collabDuos } from '@/db/schema/collab';
import { creators } from '@/db/schema/creators';
import { pinkLeagueSeasons } from '@/db/schema/league';
import { getCreatorFromAuth } from '@/lib/auth';
import { validateCollabInit, calculateBoost, getWeeklyCollabCount, WEEKLY_LIMIT } from '@/lib/collab/collab-engine';
import { parseJsonBody } from '@/lib/api/errors';
import { alias } from 'drizzle-orm/pg-core';
import { eq, and, or, desc } from 'drizzle-orm';

/**
 * GET /api/collabs — My collabs (pending + recent verified)
 */
export async function GET() {
  const result = await getCreatorFromAuth();
  if (result.error) return result.error;

  const { creatorId } = result;

  // H6 FIX: single query with two LEFT JOINs instead of N+1.
  // Pick the counterparty in SQL so we never hit the creators table per row.
  const initiatorCreator = alias(creators, 'initiator_creator');
  const partnerCreator = alias(creators, 'partner_creator');

  const rows = await db
    .select({
      id: collabDuos.id,
      initiatorId: collabDuos.initiatorId,
      partnerId: collabDuos.partnerId,
      productTag: collabDuos.productTag,
      status: collabDuos.status,
      scoreBoostPct: collabDuos.scoreBoostPct,
      duoStreakCount: collabDuos.duoStreakCount,
      isDynamicDuo: collabDuos.isDynamicDuo,
      initiatorContentUrl: collabDuos.initiatorContentUrl,
      partnerContentUrl: collabDuos.partnerContentUrl,
      createdAt: collabDuos.createdAt,
      verifiedAt: collabDuos.verifiedAt,
      initiatorHandle: initiatorCreator.tiktokHandle,
      initiatorName: initiatorCreator.displayName,
      partnerHandle: partnerCreator.tiktokHandle,
      partnerName: partnerCreator.displayName,
    })
    .from(collabDuos)
    .leftJoin(initiatorCreator, eq(initiatorCreator.id, collabDuos.initiatorId))
    .leftJoin(partnerCreator, eq(partnerCreator.id, collabDuos.partnerId))
    .where(
      or(
        eq(collabDuos.initiatorId, creatorId),
        eq(collabDuos.partnerId, creatorId),
      ),
    )
    .orderBy(desc(collabDuos.createdAt))
    .limit(20);

  const enriched = rows.map((c) => {
    const isInitiator = c.initiatorId === creatorId;
    return {
      id: c.id,
      initiatorId: c.initiatorId,
      partnerId: c.partnerId,
      productTag: c.productTag,
      status: c.status,
      scoreBoostPct: parseFloat(c.scoreBoostPct ?? '0'),
      duoStreakCount: c.duoStreakCount,
      isDynamicDuo: c.isDynamicDuo,
      initiatorContentUrl: c.initiatorContentUrl,
      partnerContentUrl: c.partnerContentUrl,
      createdAt: c.createdAt,
      verifiedAt: c.verifiedAt,
      partnerHandle: (isInitiator ? c.partnerHandle : c.initiatorHandle) ?? 'unknown',
      partnerName: isInitiator ? c.partnerName : c.initiatorName,
      isInitiator,
    };
  });

  const weeklyCount = await getWeeklyCollabCount(creatorId);

  return NextResponse.json({
    collabs: enriched,
    weeklyUsed: weeklyCount,
    weeklyLimit: WEEKLY_LIMIT,
  });
}

/**
 * POST /api/collabs — Initiate a collab
 * Body: { partnerHandle, productTag, contentUrl }
 */
export async function POST(request: Request) {
  const result = await getCreatorFromAuth();
  if (result.error) return result.error;

  const parsed = await parseJsonBody<{
    partnerHandle?: string; productTag?: string; contentUrl?: string;
  }>(request);
  if (parsed.error) return parsed.error;

  const { partnerHandle, productTag, contentUrl } = parsed.data;

  if (!partnerHandle || !productTag) {
    return NextResponse.json({ error: 'partnerHandle and productTag required' }, { status: 400 });
  }

  // Resolve partner
  const [partner] = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.tiktokHandle, partnerHandle.replace('@', '')))
    .limit(1);

  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  // Validate limits
  const validation = await validateCollabInit(result.creatorId, partner.id);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 409 });
  }

  // Get active season for tracking
  const [activeSeason] = await db
    .select({ id: pinkLeagueSeasons.id })
    .from(pinkLeagueSeasons)
    .where(eq(pinkLeagueSeasons.status, 'active'))
    .limit(1);

  // Calculate boost
  const boost = await calculateBoost(result.creatorId, partner.id);

  // Week key
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  const weekKey = `${now.getFullYear()}-${String(weekNum).padStart(2, '0')}`;

  const [collab] = await db.insert(collabDuos).values({
    initiatorId: result.creatorId,
    partnerId: partner.id,
    productTag,
    initiatorContentUrl: contentUrl ?? null,
    scoreBoostPct: boost.boostPct.toString(),
    seasonId: activeSeason?.id ?? null,
    weekKey,
    duoStreakCount: boost.duoStreak,
    isDynamicDuo: boost.isDynamicDuo,
    status: contentUrl ? 'pending' : 'pending',
  }).returning();

  return NextResponse.json({
    collab: {
      id: collab.id,
      partnerId: partner.id,
      productTag,
      boostPct: boost.boostPct,
      duoStreak: boost.duoStreak,
      isDynamicDuo: boost.isDynamicDuo,
      isLeagueSeason: boost.isLeagueSeason,
    },
  }, { status: 201 });
}

/**
 * PATCH /api/collabs — Partner responds (submits their content URL)
 * Body: { collabId, contentUrl }
 */
export async function PATCH(request: Request) {
  const result = await getCreatorFromAuth();
  if (result.error) return result.error;

  const parsed = await parseJsonBody<{ collabId?: string; contentUrl?: string }>(request);
  if (parsed.error) return parsed.error;

  const { collabId, contentUrl } = parsed.data;

  if (!collabId || !contentUrl) {
    return NextResponse.json({ error: 'collabId and contentUrl required' }, { status: 400 });
  }

  // Fetch collab
  const [collab] = await db
    .select()
    .from(collabDuos)
    .where(eq(collabDuos.id, collabId))
    .limit(1);

  if (!collab) {
    return NextResponse.json({ error: 'Collab not found' }, { status: 404 });
  }

  const isInitiator = collab.initiatorId === result.creatorId;
  const isPartner = collab.partnerId === result.creatorId;

  if (!isInitiator && !isPartner) {
    return NextResponse.json({ error: 'Not part of this collab' }, { status: 403 });
  }

  if (collab.status === 'verified' || collab.status === 'expired') {
    return NextResponse.json(
      { error: `Collab already ${collab.status}` },
      { status: 409 },
    );
  }

  // H2 FIX: block resubmission on one's own side — prevents swapping out the
  // proof URL after a verified pair state or replaying the verify branch.
  const mySideAlreadyFilled = isInitiator
    ? !!collab.initiatorContentUrl
    : !!collab.partnerContentUrl;
  if (mySideAlreadyFilled) {
    return NextResponse.json(
      { error: 'You have already submitted your content URL for this collab' },
      { status: 409 },
    );
  }

  // M2 FIX: validate URL shape — prevents javascript:/data: exploits and garbage.
  try {
    const parsedUrl = new URL(contentUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'contentUrl must use http(s)' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'contentUrl must be a valid URL' }, { status: 400 });
  }

  // Weekly limit for partner
  const weeklyCount = await getWeeklyCollabCount(result.creatorId);
  if (weeklyCount >= WEEKLY_LIMIT) {
    return NextResponse.json({ error: `Weekly collab limit reached (${WEEKLY_LIMIT}/week)` }, { status: 409 });
  }

  // Update the correct content URL
  const updateFields: Record<string, unknown> = {};
  if (isInitiator) {
    updateFields.initiatorContentUrl = contentUrl;
  } else {
    updateFields.partnerContentUrl = contentUrl;
  }

  // Check if both sides now have content
  const otherHasContent = isInitiator
    ? !!collab.partnerContentUrl
    : !!collab.initiatorContentUrl;

  if (otherHasContent) {
    // Both submitted — verify!
    updateFields.status = 'verified';
    updateFields.verifiedAt = new Date();
  } else {
    updateFields.status = 'matched';
    updateFields.matchedAt = new Date();
  }

  const [updated] = await db.update(collabDuos)
    .set(updateFields)
    .where(eq(collabDuos.id, collabId))
    .returning();

  return NextResponse.json({
    collab: {
      id: updated.id,
      status: updated.status,
      boostPct: parseFloat(updated.scoreBoostPct ?? '0'),
      isDynamicDuo: updated.isDynamicDuo,
      verified: updated.status === 'verified',
    },
  });
}
