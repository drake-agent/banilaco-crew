import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sampleShipments } from '@/db/schema/samples';
import { creators } from '@/db/schema/creators';
import { verifyAdmin } from '@/lib/auth';
import { eq, desc, gte, and, isNotNull, sql, count } from 'drizzle-orm';

/**
 * GET /api/shipping — Shipping status summary (last 30 days)
 */
export async function GET() {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const shipments = await db
    .select({
      id: sampleShipments.id,
      status: sampleShipments.status,
      carrier: sampleShipments.carrier,
      trackingNumber: sampleShipments.trackingNumber,
      shippedAt: sampleShipments.shippedAt,
      deliveredAt: sampleShipments.deliveredAt,
      contentPostedAt: sampleShipments.contentPostedAt,
      setType: sampleShipments.setType,
      shippingCost: sampleShipments.shippingCost,
      creatorHandle: creators.tiktokHandle,
      creatorName: creators.displayName,
    })
    .from(sampleShipments)
    .leftJoin(creators, eq(sampleShipments.creatorId, creators.id))
    .where(gte(sampleShipments.createdAt, thirtyDaysAgo))
    .orderBy(desc(sampleShipments.createdAt));

  // Summary stats
  const statusCounts: Record<string, number> = {};
  let totalShippingCost = 0;
  for (const s of shipments) {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    totalShippingCost += parseFloat(s.shippingCost ?? '0');
  }

  // Avg delivery days
  const deliveredShipments = shipments.filter((s) => s.shippedAt && s.deliveredAt);
  const avgDeliveryDays = deliveredShipments.length > 0
    ? Math.round(deliveredShipments.reduce((sum, s) => {
        return sum + (s.deliveredAt!.getTime() - s.shippedAt!.getTime()) / 86400000;
      }, 0) / deliveredShipments.length * 10) / 10
    : null;

  return NextResponse.json({
    shipments: shipments.map((s) => ({
      ...s,
      creator: { tiktok_handle: s.creatorHandle, display_name: s.creatorName },
    })),
    summary: {
      total: shipments.length,
      statusCounts,
      totalShippingCost: Math.round(totalShippingCost * 100) / 100,
      avgDeliveryDays,
    },
  });
}

/**
 * PATCH /api/shipping — Update tracking info
 */
export async function PATCH(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const setFields: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.tracking_number) setFields.trackingNumber = updates.tracking_number;
  if (updates.carrier) setFields.carrier = updates.carrier;
  if (updates.status) setFields.status = updates.status;
  if (updates.aftership_id) setFields.aftershipId = updates.aftership_id;

  const [updated] = await db.update(sampleShipments).set(setFields).where(eq(sampleShipments.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ data: updated });
}
