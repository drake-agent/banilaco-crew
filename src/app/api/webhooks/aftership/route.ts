// ============================================
// AfterShip Webhook Receiver
// 배송 상태 변경 시 실시간 업데이트
//
// AfterShip webhook payload:
//   - event: "tracking_update"
//   - msg: { tracking_number, slug, tag, ... }
//
// tag 값:
//   InfoReceived, InTransit, OutForDelivery,
//   Delivered, AttemptFail, Exception, Expired
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createServerClient } from '@/lib/supabase';
import type { SampleStatus } from '@/types/database';

const AFTERSHIP_WEBHOOK_SECRET = process.env.AFTERSHIP_WEBHOOK_SECRET || '';

// ─── Signature Verification ─────────────────

function verifyAfterShipSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!AFTERSHIP_WEBHOOK_SECRET || !signature) return false;

  const expected = createHmac('sha256', AFTERSHIP_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('base64');

  try {
    return timingSafeEqual(
      Buffer.from(expected, 'utf-8'),
      Buffer.from(signature, 'utf-8'),
    );
  } catch {
    return false;
  }
}

// ─── Tag → Status Mapping ───────────────────

function mapAfterShipTagToStatus(tag: string): SampleStatus | null {
  switch (tag) {
    case 'InTransit':
    case 'OutForDelivery':
    case 'AvailableForPickup':
      return 'shipped';      // 아직 배송 중 — shipped 상태 유지
    case 'Delivered':
      return 'delivered';
    case 'AttemptFail':
    case 'Exception':
    case 'Expired':
      return null;            // 별도 처리 필요 — 상태 변경하지 않고 로그만
    default:
      return null;
  }
}

// ─── Webhook Handler ────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // 1. Verify signature (CRITICAL: reject if secret not configured)
  if (!AFTERSHIP_WEBHOOK_SECRET) {
    console.error('[AfterShip] CRITICAL: AFTERSHIP_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 503 });
  }

  const signature = request.headers.get('aftership-hmac-sha256');
  if (!verifyAfterShipSignature(rawBody, signature)) {
    console.error('[AfterShip Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = payload.event;
  const msg = payload.msg;

  if (!msg?.tracking_number) {
    return NextResponse.json({ error: 'Missing tracking_number' }, { status: 400 });
  }

  const supabase = createServerClient();

  // 3. Find matching shipment
  const { data: shipment, error: findError } = await supabase
    .from('sample_shipments')
    .select('id, status, creator_id')
    .eq('tracking_number', msg.tracking_number)
    .single();

  if (findError || !shipment) {
    // Not found — might be a non-sample shipment, ignore gracefully
    console.warn(`[AfterShip Webhook] No shipment found for tracking: ${msg.tracking_number}`);
    return NextResponse.json({ received: true, matched: false });
  }

  // 4. Map status
  const tag = msg.tag as string;
  const newStatus = mapAfterShipTagToStatus(tag);

  // 5. Build update payload
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (newStatus && shouldTransition(shipment.status, newStatus)) {
    updates.status = newStatus;

    if (newStatus === 'delivered') {
      updates.delivered_at = msg.last_updated_at || new Date().toISOString();
    }
  }

  // Store AfterShip tracking ID
  if (msg.id) {
    updates.aftership_id = msg.id;
  }

  // 6. Update shipment
  const { error: updateError } = await supabase
    .from('sample_shipments')
    .update(updates)
    .eq('id', shipment.id);

  if (updateError) {
    console.error(`[AfterShip Webhook] Update error for ${shipment.id}:`, updateError.message);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // 7. Log exception events for manual review
  if (tag === 'AttemptFail' || tag === 'Exception' || tag === 'Expired') {
    await supabase.from('webhook_events').insert({
      event_type: 100, // AfterShip shipping exception
      shop_id: 'aftership',
      payload: {
        tracking_number: msg.tracking_number,
        tag,
        subtag: msg.subtag,
        message: msg.subtag_message,
        shipment_id: shipment.id,
        checkpoints: msg.checkpoints?.slice(0, 3), // Last 3 checkpoints
      },
      processing_status: 'RECEIVED',
    });
  }

  console.log(
    `[AfterShip Webhook] ${msg.tracking_number}: ${tag} → ${newStatus || 'logged only'}`
  );

  return NextResponse.json({
    received: true,
    matched: true,
    shipment_id: shipment.id,
    status_updated: !!newStatus,
  });
}

// ─── Status Transition Guard ────────────────
// 상태가 역방향으로 가지 않도록 보호

const STATUS_ORDER: Record<string, number> = {
  requested: 0,
  approved: 1,
  shipped: 2,
  delivered: 3,
  reminder_1: 4,
  reminder_2: 5,
  content_posted: 6,
  no_response: 7,
};

function shouldTransition(current: string, next: string): boolean {
  const currentOrder = STATUS_ORDER[current] ?? -1;
  const nextOrder = STATUS_ORDER[next] ?? -1;

  // Only allow forward transitions for shipping events
  // (delivered should not regress to shipped)
  return nextOrder > currentOrder;
}
