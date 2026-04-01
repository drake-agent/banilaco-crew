// ============================================
// /api/webhooks/tiktok — TikTok Shop Webhook Receiver
//
// 1. Verify HMAC-SHA256 signature
// 2. Log event to webhook_events table
// 3. Route to handler by event type
// 4. Return 200 immediately (async processing)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TikTokWebhook } from '@/lib/tiktok/webhook';
import { WEBHOOK_EVENTS } from '@/lib/tiktok/types';
import { createServerClient } from '@/lib/supabase';

function getWebhook() {
  return new TikTokWebhook({
    appKey: process.env.TIKTOK_SHOP_APP_KEY!,
    appSecret: process.env.TIKTOK_SHOP_APP_SECRET!,
  });
}

/**
 * POST /api/webhooks/tiktok
 * Receives and processes TikTok Shop webhook events.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const authorization = request.headers.get('authorization') || '';

  // ① Verify signature
  const webhook = getWebhook();
  if (!webhook.verifySignature(rawBody, authorization)) {
    console.warn('Webhook signature verification failed');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 },
    );
  }

  // ② Parse payload
  const payload = webhook.parsePayload(rawBody);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid payload' },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // ③ Log to webhook_events (fire-and-forget for speed)
  const logPromise = supabase
    .from('webhook_events')
    .insert({
      event_type: payload.type,
      shop_id: payload.shop_id,
      payload: payload,
      processing_status: 'RECEIVED',
      received_at: new Date().toISOString(),
    })
    .then(({ data, error }) => {
      if (error) console.error('Failed to log webhook event:', error);
      return data;
    });

  // ④ Route to handler with error handling
  const processPromise = (async () => {
    try {
      await processEvent(payload, supabase);
    } catch (err) {
      console.error(`Webhook processing failed for type=${payload.type}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Log the failed event
      await logPromise.then(async () =>
        supabase
          .from('webhook_events')
          .update({
            processing_status: 'FAILED',
            error_message: errorMessage,
            processed_at: new Date().toISOString(),
          })
          .eq('event_type', payload.type)
          .eq('shop_id', payload.shop_id)
          .order('received_at', { ascending: false })
          .limit(1),
      );
    }
  })();

  // ⑤ Return 200 immediately — TikTok requires fast response
  // Processing continues in background via the promises above
  // In Vercel, the response is sent but the function continues until promises settle
  await Promise.allSettled([logPromise, processPromise]);

  return NextResponse.json({ success: true });
}

// ─── Event Handlers ──────────────────────────

async function processEvent(
  payload: { type: number; shop_id: string; data: Record<string, unknown> },
  supabase: ReturnType<typeof createServerClient>,
) {
  switch (payload.type) {
    case WEBHOOK_EVENTS.ORDER_STATUS_UPDATE:
      await handleOrderUpdate(payload.data, supabase);
      break;

    case WEBHOOK_EVENTS.REVERSE_ORDER_STATUS_UPDATE:
      await handleReverseOrder(payload.data, supabase);
      break;

    case WEBHOOK_EVENTS.PACKAGE_UPDATE:
      await handlePackageUpdate(payload.data, supabase);
      break;

    case WEBHOOK_EVENTS.PRODUCT_STATUS_UPDATE:
      await handleProductUpdate(payload.data, supabase);
      break;

    case WEBHOOK_EVENTS.RETURN_STATUS_UPDATE:
      await handleReturnUpdate(payload.data, supabase);
      break;

    case WEBHOOK_EVENTS.SELLER_DEAUTHORIZATION:
      await handleDeauthorization(payload.shop_id, supabase);
      break;

    case WEBHOOK_EVENTS.UPCOMING_AUTH_EXPIRATION:
      // Handled by cron token refresh — just log
      console.info(`Auth expiration warning for shop ${payload.shop_id}`);
      break;

    default:
      console.info(`Unhandled webhook type: ${payload.type}`);
  }

  // Mark as processed
  await supabase
    .from('webhook_events')
    .update({
      processing_status: 'PROCESSED',
      processed_at: new Date().toISOString(),
    })
    .eq('event_type', payload.type)
    .eq('shop_id', payload.shop_id)
    .order('received_at', { ascending: false })
    .limit(1);
}

async function handleOrderUpdate(
  data: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>,
) {
  const orderId = data.order_id as string;
  const status = data.order_status as number;
  if (!orderId) return;

  const statusMap: Record<number, string> = {
    100: 'UNPAID',
    111: 'AWAITING_SHIPMENT',
    112: 'AWAITING_SHIPMENT',
    121: 'IN_TRANSIT',
    122: 'DELIVERED',
    130: 'COMPLETED',
    140: 'CANCELLED',
  };

  await supabase
    .from('order_tracking')
    .update({
      order_status: statusMap[status] || 'UNKNOWN',
      updated_at: new Date().toISOString(),
    })
    .eq('shop_order_id', orderId);
}

async function handleReverseOrder(
  data: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>,
) {
  const orderId = data.order_id as string;
  if (!orderId) return;

  await supabase
    .from('order_tracking')
    .update({
      order_status: 'CANCELLED',
      updated_at: new Date().toISOString(),
    })
    .eq('shop_order_id', orderId);
}

async function handlePackageUpdate(
  data: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>,
) {
  const trackingNumber = data.tracking_number as string;
  const status = data.package_status as string;
  if (!trackingNumber) return;

  // Update sample shipment tracking
  const newStatus =
    status === 'DELIVERED'
      ? 'delivered'
      : status === 'IN_TRANSIT'
        ? 'shipped'
        : undefined;

  if (newStatus) {
    await supabase
      .from('sample_shipments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('tracking_number', trackingNumber);
  }
}

async function handleProductUpdate(
  data: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>,
) {
  // Product status changes are picked up by the next product sync cron
  // Just log for now
  console.info('Product update webhook:', data.product_id, data.status);
}

async function handleReturnUpdate(
  data: Record<string, unknown>,
  supabase: ReturnType<typeof createServerClient>,
) {
  // Return status changes affect order_tracking
  const orderId = data.order_id as string;
  if (!orderId) return;

  await supabase
    .from('order_tracking')
    .update({
      order_status: 'RETURNED',
      updated_at: new Date().toISOString(),
    })
    .eq('shop_order_id', orderId);
}

async function handleDeauthorization(
  shopId: string,
  supabase: ReturnType<typeof createServerClient>,
) {
  // Mark credentials as inactive
  await supabase
    .from('tiktok_credentials')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('shop_id', shopId);

  console.error(`⚠️ TikTok Shop deauthorized: ${shopId}`);
}
