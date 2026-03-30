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
import type { ITikTokCrawlerAdapter } from './types';
import type { IShippingTrackerAdapter } from './shipping-tracker.adapter';

interface AdapterOptions {
  includeShipping?: boolean;
  includeDiscovery?: boolean;
}

export function createAdapters(options: AdapterOptions = {}) {
  const { includeShipping = true, includeDiscovery = true } = options;

  // TikTok Shop — required
  if (!process.env.TIKTOK_SHOP_APP_KEY || !process.env.TIKTOK_SHOP_APP_SECRET) {
    throw new Error('Missing required env: TIKTOK_SHOP_APP_KEY, TIKTOK_SHOP_APP_SECRET');
  }

  const shopAdapter = new TikTokShopAdapter({
    appKey: process.env.TIKTOK_SHOP_APP_KEY,
    appSecret: process.env.TIKTOK_SHOP_APP_SECRET,
    shopId: process.env.TIKTOK_SHOP_ID || '',
    accessToken: process.env.TIKTOK_SHOP_ACCESS_TOKEN || '',
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
