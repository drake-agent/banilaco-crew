import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { sampleShipments } from '@/db/schema/samples';
import { creators } from '@/db/schema/creators';
import { getCreatorFromAuth, verifyAdmin } from '@/lib/auth';
import { eq, desc, count, and } from 'drizzle-orm';

const samplePatchSchema = z.object({
  status: z.enum([
    'requested', 'approved', 'shipped', 'delivered',
    'reminder_1', 'reminder_2', 'content_posted', 'no_response',
  ]).optional(),
  tracking_number: z.string().max(100).optional(),
  carrier: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  content_url: z.string().url().optional(),
  set_type: z.string().optional(),
}).strict();

const ALLOWED_FIELDS = [
  'status', 'trackingNumber', 'carrier', 'shippedAt', 'deliveredAt',
  'contentUrl', 'contentPostedAt', 'notes', 'setType',
] as const;

export async function GET(request: NextRequest) {
  const adminResult = await verifyAdmin();
  let creatorResult: { creatorId: string } | null = null;
  if (adminResult.error) {
    const authResult = await getCreatorFromAuth();
    if (authResult.error) return authResult.error;
    creatorResult = { creatorId: authResult.creatorId };
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const setType = searchParams.get('set_type');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (creatorResult) conditions.push(eq(sampleShipments.creatorId, creatorResult.creatorId));
  if (status) conditions.push(eq(sampleShipments.status, status as typeof sampleShipments.status.enumValues[number]));
  if (setType) conditions.push(eq(sampleShipments.setType, setType as typeof sampleShipments.setType.enumValues[number]));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [totalResult]] = await Promise.all([
    db
      .select({
        shipment: sampleShipments,
        creatorHandle: creators.tiktokHandle,
        creatorName: creators.displayName,
      })
      .from(sampleShipments)
      .leftJoin(creators, eq(sampleShipments.creatorId, creators.id))
      .where(where)
      .orderBy(desc(sampleShipments.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(sampleShipments).where(where),
  ]);

  return NextResponse.json({
    data: data.map((d) => ({
      ...d.shipment,
      creator: {
        tiktokHandle: d.creatorHandle,
        displayName: d.creatorName,
        tiktok_handle: d.creatorHandle,
        display_name: d.creatorName,
      },
    })),
    pagination: { page, limit, total: totalResult?.count ?? 0 },
  });
}

export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const body = await request.json();

  const [shipment] = await db
    .insert(sampleShipments)
    .values({
      creatorId: body.creator_id ?? body.creatorId,
      setType: body.set_type ?? body.setType,
      status: 'requested',
      skuList: body.sku_list ?? body.skuList ?? [],
      estimatedCost: body.estimated_cost ?? body.estimatedCost,
      shippingCost: body.shipping_cost ?? body.shippingCost,
      notes: body.notes,
    })
    .returning();

  return NextResponse.json({ data: shipment }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const body = await request.json();
  const { id, ...rawUpdates } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const validation = samplePatchSchema.safeParse(rawUpdates);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 },
    );
  }

  // Map snake_case → camelCase for Drizzle
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (rawUpdates.status) updates.status = rawUpdates.status;
  if (rawUpdates.tracking_number) updates.trackingNumber = rawUpdates.tracking_number;
  if (rawUpdates.carrier) updates.carrier = rawUpdates.carrier;
  if (rawUpdates.notes !== undefined) updates.notes = rawUpdates.notes;
  if (rawUpdates.content_url) updates.contentUrl = rawUpdates.content_url;
  if (rawUpdates.set_type) updates.setType = rawUpdates.set_type;

  const [updated] = await db
    .update(sampleShipments)
    .set(updates)
    .where(eq(sampleShipments.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
