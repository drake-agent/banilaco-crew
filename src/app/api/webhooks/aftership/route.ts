// ============================================
// AfterShip Webhook Receiver — Drizzle ORM
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/db';
import { sampleShipments } from '@/db/schema/samples';
import { webhookEvents } from '@/db/schema/tiktok';
import { eq } from 'drizzle-orm';

const AFTERSHIP_WEBHOOK_SECRET = process.env.AFTERSHIP_WEBHOOK_SECRET || '';

function verifyAfterShipSignature(rawBody: string, signature: string | null): boolean {
  if (!AFTERSHIP_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac('sha256', AFTERSHIP_WEBHOOK_SECRET).update(rawBody).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(signature, 'utf-8'));
  } catch {
    return false;
  }
}

type SampleStatus = typeof sampleShipments.status.enumValues[number];

function mapTag(tag: string): SampleStatus | null {
  switch (tag) {
    case 'InTransit': case 'OutForDelivery': case 'AvailableForPickup': return 'shipped';
    case 'Delivered': return 'delivered';
    default: return null;
  }
}

const STATUS_ORDER: Record<string, number> = {
  requested: 0, approved: 1, shipped: 2, delivered: 3,
  reminder_1: 4, reminder_2: 5, content_posted: 6, no_response: 7,
};

function shouldTransition(current: string, next: string): boolean {
  return (STATUS_ORDER[next] ?? -1) > (STATUS_ORDER[current] ?? -1);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!AFTERSHIP_WEBHOOK_SECRET) {
    console.error('[AfterShip] AFTERSHIP_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 503 });
  }

  const signature = request.headers.get('aftership-hmac-sha256');
  if (!verifyAfterShipSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const msg = payload.msg as Record<string, unknown> | undefined;
  if (!msg?.tracking_number) {
    return NextResponse.json({ error: 'Missing tracking_number' }, { status: 400 });
  }

  const trackingNumber = msg.tracking_number as string;
  const tag = msg.tag as string;

  // Find matching shipment
  const [shipment] = await db
    .select({ id: sampleShipments.id, status: sampleShipments.status, creatorId: sampleShipments.creatorId })
    .from(sampleShipments)
    .where(eq(sampleShipments.trackingNumber, trackingNumber))
    .limit(1);

  if (!shipment) {
    console.warn(`[AfterShip] No shipment for tracking: ${trackingNumber}`);
    return NextResponse.json({ received: true, matched: false });
  }

  // Map status + update
  const newStatus = mapTag(tag);
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (newStatus && shouldTransition(shipment.status, newStatus)) {
    updates.status = newStatus;
    if (newStatus === 'delivered') {
      updates.deliveredAt = msg.last_updated_at ? new Date(msg.last_updated_at as string) : new Date();
    }
  }
  if (msg.id) updates.aftershipId = msg.id as string;

  await db.update(sampleShipments).set(updates).where(eq(sampleShipments.id, shipment.id));

  // Log exceptions
  if (['AttemptFail', 'Exception', 'Expired'].includes(tag)) {
    await db.insert(webhookEvents).values({
      eventType: 'aftership_exception',
      shopId: 'aftership',
      payload: { tracking_number: trackingNumber, tag, subtag: msg.subtag, shipment_id: shipment.id } as Record<string, unknown>,
      processingStatus: 'pending',
    });
  }

  return NextResponse.json({ received: true, matched: true, shipment_id: shipment.id, status_updated: !!newStatus });
}
