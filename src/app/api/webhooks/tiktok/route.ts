// ============================================
// /api/webhooks/tiktok — TikTok Shop Webhook Receiver
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TikTokWebhook } from '@/lib/tiktok/webhook';
import { WEBHOOK_EVENTS } from '@/lib/tiktok/types';
import { db } from '@/db';
import { webhookEvents, orderTracking, tiktokCredentials } from '@/db/schema/tiktok';
import { sampleShipments } from '@/db/schema/samples';
import { eq } from 'drizzle-orm';

function getWebhook() {
  return new TikTokWebhook({
    appKey: process.env.TIKTOK_SHOP_APP_KEY!,
    appSecret: process.env.TIKTOK_SHOP_APP_SECRET!,
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const authorization = request.headers.get('authorization') || '';

  const webhook = getWebhook();
  if (!webhook.verifySignature(rawBody, authorization)) {
    console.warn('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = webhook.parsePayload(rawBody);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Log event (FIX BUG-3: capture ID for targeted status update)
  const [event] = await db.insert(webhookEvents).values({
    eventType: String(payload.type),
    shopId: payload.shop_id,
    payload: payload as Record<string, unknown>,
    processingStatus: 'pending',
  }).returning();

  // Process event
  try {
    await processEvent(payload);

    await db.update(webhookEvents).set({
      processingStatus: 'processed',
      processedAt: new Date(),
    }).where(eq(webhookEvents.id, event.id));
  } catch (err) {
    console.error(`Webhook processing failed for type=${payload.type}:`, err);
    await db.update(webhookEvents).set({
      processingStatus: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      processedAt: new Date(),
    }).where(eq(webhookEvents.id, event.id));
  }

  return NextResponse.json({ success: true });
}

async function processEvent(payload: { type: number; shop_id: string; data: Record<string, unknown> }) {
  const statusMap: Record<number, string> = {
    100: 'UNPAID', 111: 'AWAITING_SHIPMENT', 112: 'AWAITING_SHIPMENT',
    121: 'IN_TRANSIT', 122: 'DELIVERED', 130: 'COMPLETED', 140: 'CANCELLED',
  };

  switch (payload.type) {
    case WEBHOOK_EVENTS.ORDER_STATUS_UPDATE: {
      const orderId = payload.data.order_id as string;
      const status = payload.data.order_status as number;
      if (orderId) {
        await db.update(orderTracking).set({
          orderStatus: statusMap[status] || 'UNKNOWN',
        }).where(eq(orderTracking.shopOrderId, orderId));
      }
      break;
    }

    case WEBHOOK_EVENTS.REVERSE_ORDER_STATUS_UPDATE: {
      const orderId = payload.data.order_id as string;
      if (orderId) {
        await db.update(orderTracking).set({ orderStatus: 'CANCELLED' })
          .where(eq(orderTracking.shopOrderId, orderId));
      }
      break;
    }

    case WEBHOOK_EVENTS.PACKAGE_UPDATE: {
      const trackingNumber = payload.data.tracking_number as string;
      const pkgStatus = payload.data.package_status as string;
      if (trackingNumber) {
        const newStatus = pkgStatus === 'DELIVERED' ? 'delivered' : pkgStatus === 'IN_TRANSIT' ? 'shipped' : undefined;
        if (newStatus) {
          await db.update(sampleShipments).set({
            status: newStatus as typeof sampleShipments.status.enumValues[number],
            updatedAt: new Date(),
          }).where(eq(sampleShipments.trackingNumber, trackingNumber));
        }
      }
      break;
    }

    case WEBHOOK_EVENTS.SELLER_DEAUTHORIZATION: {
      await db.update(tiktokCredentials).set({
        isActive: false,
        updatedAt: new Date(),
      }).where(eq(tiktokCredentials.shopId, payload.shop_id));
      console.error(`TikTok Shop deauthorized: ${payload.shop_id}`);
      break;
    }

    default:
      console.info(`Unhandled webhook type: ${payload.type}`);
  }
}
