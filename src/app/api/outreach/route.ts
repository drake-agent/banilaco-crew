import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { outreachPipeline } from '@/db/schema/outreach';
import { verifyAdmin } from '@/lib/auth';
import { eq, desc, and, count, ilike } from 'drizzle-orm';

const outreachPatchSchema = z.object({
  status: z.enum(['identified', 'dm_sent', 'responded', 'sample_requested', 'converted', 'declined', 'no_response']).optional(),
  outreach_tier: z.enum(['tier_a', 'tier_b']).optional(),
  notes: z.string().max(2000).optional(),
  email: z.string().email().optional(),
  instagram_handle: z.string().optional(),
}).strict();

export async function GET(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const tier = searchParams.get('tier');
  const search = searchParams.get('search')?.slice(0, 100);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) conditions.push(eq(outreachPipeline.status, status as typeof outreachPipeline.status.enumValues[number]));
  if (tier) conditions.push(eq(outreachPipeline.outreachTier, tier as typeof outreachPipeline.outreachTier.enumValues[number]));
  if (search) conditions.push(ilike(outreachPipeline.tiktokHandle, `%${search.replace(/[\\%_]/g, '')}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [totalResult]] = await Promise.all([
    db.select().from(outreachPipeline).where(where).orderBy(desc(outreachPipeline.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(outreachPipeline).where(where),
  ]);

  return NextResponse.json({ data, pagination: { page, limit, total: totalResult?.count ?? 0 } });
}

export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;
  const body = await request.json();

  const [entry] = await db.insert(outreachPipeline).values({
    tiktokHandle: body.tiktok_handle ?? body.tiktokHandle,
    displayName: body.display_name ?? body.displayName,
    email: body.email,
    instagramHandle: body.instagram_handle ?? body.instagramHandle,
    followerCount: body.follower_count ?? body.followerCount,
    outreachTier: body.outreach_tier ?? body.outreachTier,
    channel: body.channel,
    sourceBrand: body.source_brand ?? body.sourceBrand,
    notes: body.notes,
  }).returning();

  return NextResponse.json({ data: entry }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;
  const body = await request.json();
  const { id, ...rawUpdates } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const validation = outreachPatchSchema.safeParse(rawUpdates);
  if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (rawUpdates.status) updates.status = rawUpdates.status;
  if (rawUpdates.outreach_tier) updates.outreachTier = rawUpdates.outreach_tier;
  if (rawUpdates.notes !== undefined) updates.notes = rawUpdates.notes;
  if (rawUpdates.email) updates.email = rawUpdates.email;
  if (rawUpdates.instagram_handle) updates.instagramHandle = rawUpdates.instagram_handle;

  const [updated] = await db.update(outreachPipeline).set(updates).where(eq(outreachPipeline.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ data: updated });
}
