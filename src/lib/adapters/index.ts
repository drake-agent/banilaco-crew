// ============================================
// Adapters - Barrel Export & Factory
// ============================================

export * from './types';
export { TikTokShopAdapter } from './tiktok-shop.adapter';
export { ApifyTikTokCrawlerAdapter, SelfHostedCrawlerAdapter } from './tiktok-crawler.adapter';
export { CompetitorDiscoveryAdapter, COMPETITOR_HASHTAG_MAP } from './competitor-discovery.adapter';
export { AfterShipTrackingAdapter, SelfHostedShippingAdapter } from './shipping-tracker.adapter';
export type { IShippingTrackerAdapter, TrackingResult, ShippingAnalytics } from './shipping-tracker.adapter';
export { DataSyncOrchestrator } from './sync-orchestrator';

// ------------------------------------
// Factory: 환경변수 기반 어댑터 생성
// ------------------------------------

import { TikTokShopAdapter } from './tiktok-shop.adapter';
import { ApifyTikTokCrawlerAdapter, SelfHostedCrawlerAdapter } from './tiktok-crawler.adapter';
import { CompetitorDiscoveryAdapter } from './competitor-discovery.adapter';
import { DataSyncOrchestrator } from './sync-orchestrator';
import { AfterShipTrackingAdapter, SelfHostedShippingAdapter } from './shipping-tracker.adapter';
import { db } from '@/db';
import { tiktokCredentials } from '@/db/schema/tiktok';
import { TikTokAuth } from '@/lib/tiktok/auth';
import { desc, eq } from 'drizzle-orm';
import type { ITikTokCrawlerAdapter } from './types';
import type { IShippingTrackerAdapter } from './shipping-tracker.adapter';

interface AdapterOptions {
  includeShipping?: boolean;
  includeDiscovery?: boolean;
}

interface TikTokShopCredential {
  shopId: string;
  accessToken: string;
  shopCipher?: string;
}

async function loadTikTokShopCredential(): Promise<TikTokShopCredential> {
  const [stored] = await db
    .select({
      id: tiktokCredentials.id,
      shopId: tiktokCredentials.shopId,
      shopCipher: tiktokCredentials.shopCipher,
      accessToken: tiktokCredentials.accessToken,
      refreshToken: tiktokCredentials.refreshToken,
      accessTokenExpiresAt: tiktokCredentials.accessTokenExpiresAt,
    })
    .from(tiktokCredentials)
    .where(eq(tiktokCredentials.isActive, true))
    .orderBy(desc(tiktokCredentials.updatedAt))
    .limit(1);

  if (stored?.accessToken) {
    if (
      stored.refreshToken &&
      stored.accessTokenExpiresAt &&
      TikTokAuth.isTokenExpiringSoon(stored.accessTokenExpiresAt)
    ) {
      const auth = new TikTokAuth({
        appKey: process.env.TIKTOK_SHOP_APP_KEY!,
        appSecret: process.env.TIKTOK_SHOP_APP_SECRET!,
      });
      const tokens = await auth.refreshAccessToken(stored.refreshToken);
      const now = new Date();
      const tokenExpiresAt = new Date(now.getTime() + tokens.access_token_expire_in * 1000);
      const refreshExpiresAt = new Date(now.getTime() + tokens.refresh_token_expire_in * 1000);

      await db
        .update(tiktokCredentials)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: tokenExpiresAt,
          refreshTokenExpiresAt: refreshExpiresAt,
          updatedAt: now,
        })
        .where(eq(tiktokCredentials.id, stored.id));

      return {
        shopId: tokens.open_id || stored.shopId,
        accessToken: tokens.access_token,
        shopCipher: stored.shopCipher ?? undefined,
      };
    }

    return {
      shopId: stored.shopId,
      accessToken: stored.accessToken,
      shopCipher: stored.shopCipher ?? undefined,
    };
  }

  if (process.env.TIKTOK_SHOP_ACCESS_TOKEN) {
    return {
      shopId: process.env.TIKTOK_SHOP_ID || '',
      accessToken: process.env.TIKTOK_SHOP_ACCESS_TOKEN,
      shopCipher: process.env.TIKTOK_SHOP_CIPHER || undefined,
    };
  }

  throw new Error('Missing TikTok Shop OAuth credentials. Connect TikTok Shop or set TIKTOK_SHOP_ACCESS_TOKEN.');
}

export async function createAdapters(options: AdapterOptions = {}) {
  const { includeShipping = true, includeDiscovery = true } = options;

  // TikTok Shop — required
  if (!process.env.TIKTOK_SHOP_APP_KEY || !process.env.TIKTOK_SHOP_APP_SECRET) {
    throw new Error('Missing required env: TIKTOK_SHOP_APP_KEY, TIKTOK_SHOP_APP_SECRET');
  }

  const tikTokCredential = await loadTikTokShopCredential();
  const shopAdapter = new TikTokShopAdapter({
    appKey: process.env.TIKTOK_SHOP_APP_KEY,
    appSecret: process.env.TIKTOK_SHOP_APP_SECRET,
    shopId: tikTokCredential.shopId,
    accessToken: tikTokCredential.accessToken,
    shopCipher: tikTokCredential.shopCipher,
  });

  // Crawler — choose based on env, required for sync
  let crawlerAdapter: ITikTokCrawlerAdapter;

  if (process.env.CRAWLER_TYPE === 'self-hosted') {
    if (!process.env.CRAWLER_BASE_URL) {
      throw new Error('CRAWLER_TYPE=self-hosted requires CRAWLER_BASE_URL');
    }
    crawlerAdapter = new SelfHostedCrawlerAdapter({
      baseUrl: process.env.CRAWLER_BASE_URL,
      apiKey: process.env.CRAWLER_API_KEY,
    });
  } else {
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error('Missing required env: APIFY_API_TOKEN (for Apify crawler)');
    }
    crawlerAdapter = new ApifyTikTokCrawlerAdapter({
      apiToken: process.env.APIFY_API_TOKEN,
    });
  }

  // Competitor Discovery — optional, lazy
  let discoveryAdapter: CompetitorDiscoveryAdapter | undefined;
  if (includeDiscovery) {
    discoveryAdapter = new CompetitorDiscoveryAdapter({
      crawler: crawlerAdapter,
    });
  }

  // Orchestrator
  const orchestrator = new DataSyncOrchestrator({
    shopAdapter,
    crawlerAdapter,
    discoveryAdapter: discoveryAdapter || new CompetitorDiscoveryAdapter({ crawler: crawlerAdapter }),
  });

  // Shipping Tracker — optional, lazy
  let shippingAdapter: IShippingTrackerAdapter | undefined;
  if (includeShipping) {
    if (process.env.SHIPPING_TRACKER === 'self-hosted') {
      if (!process.env.SHIPPING_TRACKER_URL) {
        console.warn('SHIPPING_TRACKER=self-hosted but SHIPPING_TRACKER_URL not set. Shipping disabled.');
      } else {
        shippingAdapter = new SelfHostedShippingAdapter({
          baseUrl: process.env.SHIPPING_TRACKER_URL,
          apiKey: process.env.SHIPPING_TRACKER_API_KEY,
        });
      }
    } else if (process.env.AFTERSHIP_API_KEY) {
      shippingAdapter = new AfterShipTrackingAdapter({
        apiKey: process.env.AFTERSHIP_API_KEY,
      });
    } else {
      console.warn('No shipping tracker configured. Shipping features disabled.');
    }
  }

  return {
    shopAdapter,
    crawlerAdapter,
    discoveryAdapter,
    shippingAdapter,
    orchestrator,
  };
}
