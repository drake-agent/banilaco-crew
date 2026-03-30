// ============================================
// /api/sync - Data Sync API Route
// Admin에서 수동 트리거 or Cron에서 자동 호출
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdapters } from '@/lib/adapters';
import { timingSafeEqual } from 'crypto';

// Timing-safe string comparison (VULN-004)
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Cron 또는 Admin 인증
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron 호출
  if (cronSecret && safeCompare(authHeader || '', `Bearer ${cronSecret}`)) return true;

  // Supabase service role
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && safeCompare(authHeader || '', `Bearer ${serviceKey}`)) return true;

  return false;
}

// POST /api/sync
// Body: { type: 'profile_refresh' | 'content_crawl' | 'shop_orders' | 'competitor_discovery' | 'full' }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, options } = body;
    const { orchestrator, discoveryAdapter } = createAdapters();

    switch (type) {
      case 'profile_refresh':
        return NextResponse.json(await orchestrator.syncProfiles(options?.batchSize));

      case 'content_crawl':
        return NextResponse.json(await orchestrator.syncContent(options?.batchSize));

      case 'shop_orders':
        return NextResponse.json(await orchestrator.syncShopOrders());

      case 'competitor_discovery':
        return NextResponse.json(
          await orchestrator.runCompetitorDiscovery(options?.brands)
        );

      case 'metrics_compute':
        return NextResponse.json(
          await orchestrator.computeMetrics(options?.creatorIds)
        );

      case 'full':
        return NextResponse.json(await orchestrator.runFullSync());

      default:
        return NextResponse.json(
          { error: `Unknown sync type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Sync API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET /api/sync — Vercel Cron 엔트리포인트 + 상태 확인
// Vercel Cron은 GET으로 호출하므로, 시간대별로 적절한 잡 실행
export async function GET(req: NextRequest) {
  // Vercel Cron은 CRON_SECRET 헤더로 인증
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    // 인증 없으면 상태 정보만 반환
    return NextResponse.json({
      available_types: [
        'profile_refresh',
        'content_crawl',
        'shop_orders',
        'competitor_discovery',
        'metrics_compute',
        'full',
      ],
      env_check: {
        tiktok_shop: !!process.env.TIKTOK_SHOP_APP_KEY,
        crawler: process.env.CRAWLER_TYPE === 'self-hosted'
          ? !!process.env.CRAWLER_BASE_URL
          : !!process.env.APIFY_API_TOKEN,
      },
    });
  }

  // CFG-001: Cron 호출 → UTC 시간 기반 실행 (한국 시간 = UTC + 9)
  // vercel.json 스케줄과 일치해야 함
  const hour = new Date().getUTCHours();
  const day = new Date().getUTCDay(); // 0=Sun, 1=Mon, 4=Thu
  const { orchestrator } = createAdapters();

  try {
    if (hour === 18) {
      // UTC 18:00 = KST 새벽 3AM — 풀 싱크 (프로필 + 콘텐츠 + 메트릭)
      const results = await orchestrator.runFullSync();
      return NextResponse.json({ cron: 'full_sync', results });
    } else if ([3, 9, 15, 21].includes(hour)) {
      // 6시간마다 (UTC 03/09/15/21 = KST 12PM/6PM/12AM/6AM) — Shop 주문 동기화
      const result = await orchestrator.syncShopOrders();
      return NextResponse.json({ cron: 'shop_orders', result });
    } else if (hour === 0 && (day === 1 || day === 4)) {
      // UTC 00:00 월/목 = KST 9AM 월/목 — 경쟁사 디스커버리
      const result = await orchestrator.runCompetitorDiscovery();
      return NextResponse.json({ cron: 'competitor_discovery', result });
    } else {
      return NextResponse.json({ cron: 'no_job_scheduled', hour, day });
    }
  } catch (error: any) {
    console.error('[Cron Sync Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
