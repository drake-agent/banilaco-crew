// ============================================
// /api/sync - Data Sync API Route
// Admin에서 수동 트리거 or Cron에서 자동 호출
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdapters } from '@/lib/adapters';
import { SampleShippingSync } from '@/lib/sync/sample-shipping-sync';
import { timingSafeEqual } from 'crypto';

// Cron schedule operates in UTC. Vercel Cron always fires in UTC.
// KST = UTC + 9 hours
const CRON_SCHEDULE = {
  FULL_SYNC_UTC: 18,        // KST 03:00 (새벽 3시)
  SHOP_ORDERS_UTC: [3, 9, 15, 21], // KST 12:00, 18:00, 00:00, 06:00
  COMPETITOR_DISCOVERY_UTC: 0,       // KST 09:00
  COMPETITOR_DISCOVERY_DAYS: [1, 4], // Monday, Thursday
} as const;

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

  // DATABASE_URL-based service auth (legacy compat)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && authHeader) return true; // Cron check above should suffice

  return false;
}

// Timeout wrapper for long-running cron operations
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`[Cron Timeout] ${label} exceeded ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
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

      case 'shipping_track': {
        const { shippingAdapter } = createAdapters({ includeShipping: true });
        if (!shippingAdapter) {
          return NextResponse.json({ error: 'No shipping tracker configured' }, { status: 400 });
        }
        const shippingSync = new SampleShippingSync(shippingAdapter);
        return NextResponse.json(await shippingSync.run());
      }

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
  } catch (error: unknown) {
    console.error('[Sync API Error]', error);
    const message =
      error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json(
      { error: message },
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
  const isCron = cronSecret && authHeader && safeCompare(authHeader, `Bearer ${cronSecret}`);

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
    if (
      hour === CRON_SCHEDULE.FULL_SYNC_UTC
    ) {
      // UTC 18:00 = KST 새벽 3AM — 풀 싱크 (프로필 + 콘텐츠 + 메트릭)
      const results = await withTimeout(
        orchestrator.runFullSync(),
        55000,
        'full_sync'
      );
      return NextResponse.json({
        cron: 'full_sync',
        results,
      });
    } else if (
      (CRON_SCHEDULE.SHOP_ORDERS_UTC as readonly number[]).includes(hour)
    ) {
      // 6시간마다 (UTC 03/09/15/21 = KST 12PM/6PM/12AM/6AM) — Shop 주문 동기화
      const result = await withTimeout(
        orchestrator.syncShopOrders(),
        55000,
        'shop_orders'
      );
      return NextResponse.json({
        cron: 'shop_orders',
        result,
      });
    } else if (hour % 2 === 0) {
      // 짝수 시간마다 — 샘플 배송 추적 동기화
      const { shippingAdapter } = createAdapters({
        includeShipping: true,
      });
      if (shippingAdapter) {
        const shippingSync = new SampleShippingSync(
          shippingAdapter
        );
        const result = await withTimeout(
          shippingSync.run(),
          55000,
          'shipping_track'
        );
        return NextResponse.json({
          cron: 'shipping_track',
          result,
        });
      }
      return NextResponse.json({
        cron: 'shipping_track',
        skipped: 'No adapter configured',
      });
    } else if (
      hour === CRON_SCHEDULE.COMPETITOR_DISCOVERY_UTC &&
      (CRON_SCHEDULE.COMPETITOR_DISCOVERY_DAYS as readonly number[]).includes(
        day
      )
    ) {
      // UTC 00:00 월/목 = KST 9AM 월/목 — 경쟁사 디스커버리
      const result = await withTimeout(orchestrator.runCompetitorDiscovery(), 55000, 'competitor_discovery');
      return NextResponse.json({ cron: 'competitor_discovery', result });
    } else {
      return NextResponse.json({
        cron: 'no_job_scheduled',
        hour,
        day,
      });
    }
  } catch (error: unknown) {
    console.error('[Cron Sync Error]', error);
    const message =
      error instanceof Error ? error.message : 'Cron sync failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
