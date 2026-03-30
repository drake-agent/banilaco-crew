// ============================================
// /api/shipping - 배송 추적 동기화 API
// ============================================
//
// GET  /api/shipping         → 배송 현황 요약 + 통계
// POST /api/shipping         → 특정 추적번호 조회 or 전체 배치 싱크
// POST /api/shipping/webhook → AfterShip 웹훅 수신 (배송 상태 변경 시 자동)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: 배송 현황 요약
export async function GET(req: NextRequest) {
  const supabase = createServerClient();

  // 최근 30일 배송 가져오기
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: shipments, error } = await supabase
    .from('sample_shipments')
    .select(`
      id, status, carrier, tracking_number,
      shipped_at, delivered_at, content_posted_at,
      set_type, shipping_cost,
      creator:creators!inner(tiktok_handle, display_name)
    `)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Shipping GET] Database error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
  }

  // 통계 계산
  const total = shipments?.length || 0;
  const delivered = shipments?.filter((s) => s.status === 'delivered' || s.status === 'content_posted').length || 0;
  const inTransit = shipments?.filter((s) => s.status === 'shipped').length || 0;
  const failed = shipments?.filter((s) => s.status === 'no_response').length || 0;
  const contentPosted = shipments?.filter((s) => s.content_posted_at).length || 0;

  const deliveredShipments = shipments?.filter((s) => s.delivered_at && s.shipped_at) || [];
  const avgDays = deliveredShipments.length
    ? deliveredShipments.reduce((sum, s) => {
        const days = Math.ceil(
          (new Date(s.delivered_at!).getTime() - new Date(s.shipped_at!).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / deliveredShipments.length
    : 0;

  return NextResponse.json({
    shipments,
    analytics: {
      total,
      delivered,
      in_transit: inTransit,
      failed,
      content_posted: contentPosted,
      avg_delivery_days: Math.round(avgDays * 10) / 10,
      delivery_rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      content_rate: delivered > 0 ? Math.round((contentPosted / delivered) * 100) : 0,
    },
  });
}

// POST: 배송 추적 동기화
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const body = await req.json();

  // 단일 추적 조회
  if (body.action === 'track' && body.tracking_number) {
    // 어댑터 호출은 createShippingAdapter()로 — 여기선 DB 업데이트 로직
    return NextResponse.json({
      message: 'Use shipping adapter directly or call /api/sync with type=shipping_track',
      tracking_number: body.tracking_number,
    });
  }

  // 배치 싱크: shipped 상태인 모든 shipment의 추적 상태 업데이트
  if (body.action === 'sync_all') {
    const { data: pending } = await supabase
      .from('sample_shipments')
      .select('id, tracking_number, carrier')
      .in('status', ['shipped'])
      .not('tracking_number', 'is', null);

    if (!pending?.length) {
      return NextResponse.json({ synced: 0, message: 'No shipments to sync' });
    }

    // 실제 구현에서는 shipping adapter를 사용:
    // const adapter = createShippingAdapter();
    // const results = await adapter.trackBatch(pending);
    // for (const result of results) { ... DB 업데이트 ... }

    return NextResponse.json({
      synced: pending.length,
      tracking_numbers: pending.map((p) => p.tracking_number),
      message: 'Tracking sync initiated. Results will update via webhook or next poll.',
    });
  }

  // 수동 배송 상태 업데이트 (BUG-1: field validation + status enum check)
  if (body.action === 'update_status' && body.shipment_id) {
    // Validate status against enum
    const VALID_STATUSES = [
      'requested', 'approved', 'shipped', 'delivered',
      'reminder_1', 'reminder_2', 'content_posted', 'no_response',
    ] as const;

    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate shipment_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.shipment_id)) {
      return NextResponse.json({ error: 'Invalid shipment_id format' }, { status: 400 });
    }

    // Whitelist fields — only allow known update fields
    const updates: Record<string, any> = {
      status: body.status,
      updated_at: new Date().toISOString(),
    };

    if (body.status === 'shipped') {
      updates.shipped_at = body.shipped_at || new Date().toISOString();
      if (typeof body.tracking_number === 'string' && body.tracking_number.length <= 100) {
        updates.tracking_number = body.tracking_number;
      }
      if (typeof body.carrier === 'string' && body.carrier.length <= 50) {
        updates.carrier = body.carrier;
      }
    }

    if (body.status === 'delivered') {
      updates.delivered_at = body.delivered_at || new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('sample_shipments')
      .update(updates)
      .eq('id', body.shipment_id)
      .select()
      .single();

    if (error) {
      console.error('[Shipping] Update error:', error.message);
      return NextResponse.json({ error: 'Failed to update shipment status' }, { status: 500 });
    }

    return NextResponse.json({ updated: data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
