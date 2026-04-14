// ============================================
// Data Sync Orchestrator — Drizzle ORM
// ============================================

import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { contentTracking } from '@/db/schema/content';
import { orderTracking } from '@/db/schema/tiktok';
import { outreachPipeline } from '@/db/schema/outreach';
import { cronSyncState } from '@/db/schema/sync';
import { eq, asc, sql, isNull, inArray } from 'drizzle-orm';
import { calculateTier } from '@/lib/tier/auto-update';
import { onNewContentDetected } from '@/agent/memory/creator-sync';
import type { PinkTier } from '@/db/schema/creators';
import type {
  ITikTokShopAdapter,
  ITikTokCrawlerAdapter,
  ICompetitorDiscoveryAdapter,
  SyncResult,
  SyncJobType,
  ComputedMetrics,
  CrawledVideo,
} from './types';

interface OrchestratorConfig {
  shopAdapter: ITikTokShopAdapter;
  crawlerAdapter: ITikTokCrawlerAdapter;
  discoveryAdapter: ICompetitorDiscoveryAdapter;
}

export class DataSyncOrchestrator {
  private shop: ITikTokShopAdapter;
  private crawler: ITikTokCrawlerAdapter;
  private discovery: ICompetitorDiscoveryAdapter;

  constructor(config: OrchestratorConfig) {
    this.shop = config.shopAdapter;
    this.crawler = config.crawlerAdapter;
    this.discovery = config.discoveryAdapter;
  }

  // ------------------------------------
  // 1. Profile refresh
  // ------------------------------------
  async syncProfiles(batchSize = 50): Promise<SyncResult> {
    const start = Date.now();

    const creatorList = await db
      .select({ id: creators.id, tiktokHandle: creators.tiktokHandle })
      .from(creators)
      .where(inArray(creators.status, ['active', 'pending']))
      .orderBy(asc(creators.lastActiveAt))
      .limit(batchSize);

    if (!creatorList.length) return this.result('profile_refresh', 0, 0, start, {});

    const handles = creatorList.map((c) => c.tiktokHandle);
    let processed = 0;
    let failed = 0;

    try {
      const profiles = await this.crawler.fetchProfiles(handles);
      const profileMap = new Map(profiles.map((p) => [p.tiktok_handle.toLowerCase(), p]));

      for (const creator of creatorList) {
        const profile = profileMap.get(creator.tiktokHandle.toLowerCase());
        if (!profile || typeof profile.follower_count !== 'number' || profile.follower_count < 0) {
          failed++;
          continue;
        }

        await db.update(creators).set({
          followerCount: profile.follower_count,
          displayName: profile.display_name || undefined,
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(creators.id, creator.id));

        processed++;
      }
    } catch {
      failed = handles.length;
    }

    return this.result('profile_refresh', processed, failed, start, { creators_updated: processed });
  }

  // ------------------------------------
  // 2. Content crawl
  // ------------------------------------
  async syncContent(batchSize = 30): Promise<SyncResult> {
    const start = Date.now();

    const creatorList = await db
      .select({ id: creators.id, tiktokHandle: creators.tiktokHandle, lastContentAt: creators.lastContentAt })
      .from(creators)
      .where(eq(creators.status, 'active'))
      .orderBy(asc(creators.lastContentAt))
      .limit(batchSize);

    if (!creatorList.length) return this.result('content_crawl', 0, 0, start, {});

    let totalVideos = 0;
    let failed = 0;

    for (const creator of creatorList) {
      try {
        const videos = await this.crawler.fetchVideos({
          tiktok_handle: creator.tiktokHandle,
          count: 10,
          after_date: creator.lastContentAt?.toISOString() || undefined,
        });

        const relevant = this.filterBanilacoContent(videos);

        for (const video of relevant) {
          await db.insert(contentTracking).values({
            creatorId: creator.id,
            videoId: video.video_id,
            videoUrl: `https://www.tiktok.com/@${video.tiktok_handle}/video/${video.video_id}`,
            views: video.view_count,
            likes: video.like_count,
            comments: video.comment_count,
            shares: video.share_count,
            postedAt: new Date(video.posted_at),
          }).onConflictDoUpdate({
            target: contentTracking.videoId,
            set: {
              views: video.view_count,
              likes: video.like_count,
              comments: video.comment_count,
              shares: video.share_count,
              updatedAt: new Date(),
            },
          });
          totalVideos++;

          // Track in entity memory (L4) — non-blocking
          onNewContentDetected({
            creatorId: creator.id,
            videoId: video.video_id,
            videoUrl: `https://www.tiktok.com/@${video.tiktok_handle}/video/${video.video_id}`,
            contentType: null,
            hookType: null,
            views: video.view_count,
            likes: video.like_count,
            comments: video.comment_count,
            shares: video.share_count,
            skuFeatured: [],
          }).catch(() => {});
        }

        if (videos.length > 0) {
          const avgViews = Math.round(videos.reduce((s, v) => s + v.view_count, 0) / videos.length);
          const totalEng = videos.reduce((s, v) => s + v.like_count + v.comment_count + v.share_count, 0) / videos.length;
          const engRate = avgViews > 0 ? Math.round((totalEng / avgViews) * 10000) / 10000 : 0;

          await db.update(creators).set({
            avgViews,
            engagementRate: engRate.toString(),
            monthlyContentCount: relevant.length,
            lastContentAt: new Date(videos[0].posted_at),
            updatedAt: new Date(),
          }).where(eq(creators.id, creator.id));
        }
      } catch {
        failed++;
      }
    }

    return this.result('content_crawl', creatorList.length - failed, failed, start, {
      videos_added: totalVideos,
      creators_updated: creatorList.length - failed,
    });
  }

  // ------------------------------------
  // 3. Shop orders sync
  // ------------------------------------
  async syncShopOrders(): Promise<SyncResult> {
    const start = Date.now();

    // ARCH-004: Check cron state
    const [syncState] = await db
      .select()
      .from(cronSyncState)
      .where(eq(cronSyncState.syncType, 'shop_orders'))
      .limit(1);

    if (syncState?.status === 'running') {
      const runningFor = Date.now() - (syncState.updatedAt?.getTime() ?? 0);
      if (runningFor < 10 * 60 * 1000) {
        return this.result('shop_orders', 0, 0, start, { orders_synced: 0 });
      }
    }

    // Mark running
    await db.insert(cronSyncState).values({
      syncType: 'shop_orders',
      status: 'running',
      runCount: (syncState?.runCount ?? 0) + 1,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: cronSyncState.syncType,
      set: { status: 'running', runCount: (syncState?.runCount ?? 0) + 1, updatedAt: new Date() },
    });

    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 86400000);
    let totalOrders = 0;
    let newOrders = 0;
    let cursor: string | undefined;
    let hasMore = true;

    try {
      // PERF-004: Batch creator lookup
      const allCreators = await db
        .select({ id: creators.id, tiktokId: creators.tiktokId })
        .from(creators)
        .where(sql`${creators.tiktokId} IS NOT NULL`);

      const creatorMap = new Map(allCreators.map((c) => [c.tiktokId!, c.id]));

      while (hasMore) {
        const result = await this.shop.fetchOrders({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          cursor,
          page_size: 50,
        });

        for (const order of result.orders) {
          totalOrders++;

          // ARCH-008: Idempotency check
          const [existing] = await db
            .select({ id: orderTracking.id })
            .from(orderTracking)
            .where(eq(orderTracking.shopOrderId, order.order_id))
            .limit(1);

          if (existing) continue;

          const creatorId = creatorMap.get(order.creator_tiktok_id);
          if (!creatorId) continue;

          await db.insert(orderTracking).values({
            shopOrderId: order.order_id,
            creatorId,
            orderStatus: order.order_status,
            gmvAmount: order.gmv.toString(),
          }).onConflictDoNothing();

          if (order.order_status === 'settled') {
            // Increment GMV + recalculate tier
            const [creator] = await db.select().from(creators).where(eq(creators.id, creatorId)).limit(1);
            if (creator) {
              const newMonthlyGmv = parseFloat(creator.monthlyGmv ?? '0') + order.gmv;
              const newTotalGmv = parseFloat(creator.totalGmv ?? '0') + order.gmv;

              const tierResult = calculateTier(creator.tier as PinkTier, {
                missionCount: creator.missionCount ?? 0,
                monthlyGmv: newMonthlyGmv,
              });

              await db.update(creators).set({
                monthlyGmv: newMonthlyGmv.toString(),
                totalGmv: newTotalGmv.toString(),
                lastActiveAt: new Date(),
                tier: tierResult.tier,
                commissionRate: tierResult.commissionRate.toString(),
                squadBonusRate: tierResult.squadBonusRate.toString(),
                ...(tierResult.changed ? { tierUpdatedAt: new Date() } : {}),
                updatedAt: new Date(),
              }).where(eq(creators.id, creatorId));

              newOrders++;
            }
          }
        }

        cursor = result.next_cursor;
        hasMore = result.has_more;
      }

      // Mark completed
      await db.update(cronSyncState).set({
        status: 'idle',
        lastRunAt: new Date(),
        lastCursor: cursor ?? null,
        updatedAt: new Date(),
      }).where(eq(cronSyncState.syncType, 'shop_orders'));

    } catch (err) {
      await db.update(cronSyncState).set({
        status: 'failed',
        updatedAt: new Date(),
      }).where(eq(cronSyncState.syncType, 'shop_orders'));
      throw err;
    }

    return this.result('shop_orders', newOrders, 0, start, {
      orders_synced: newOrders,
      total_fetched: totalOrders,
    });
  }

  // ------------------------------------
  // 4. Competitor discovery
  // ------------------------------------
  async runCompetitorDiscovery(
    brands: string[] = ['medicube', 'cosrx', 'beauty_of_joseon', 'anua', 'torriden', 'elf'],
  ): Promise<SyncResult> {
    const start = Date.now();
    let totalNew = 0;
    let failed = 0;

    for (const brand of brands) {
      try {
        const discovered = await this.discovery.discoverCreators({
          brand,
          hashtags: [],
          count: 30,
        });

        const newCreators = discovered.filter((d) => !d.already_in_db);

        for (const creator of newCreators) {
          try {
            await db.insert(outreachPipeline).values({
              tiktokHandle: creator.tiktok_handle,
              displayName: creator.display_name,
              followerCount: creator.follower_count,
              sourceBrand: creator.source_brand,
              outreachTier: creator.follower_count >= 100000 ? 'tier_a' : 'tier_b',
              status: 'identified',
            });
            totalNew++;
          } catch { /* duplicate handle, skip */ }
        }
      } catch {
        failed++;
      }
    }

    return this.result('competitor_discovery', brands.length - failed, failed, start, {
      new_discoveries: totalNew,
    });
  }

  // ------------------------------------
  // 5. Compute metrics
  // ------------------------------------
  async computeMetrics(creatorIds?: string[]): Promise<SyncResult> {
    const start = Date.now();

    let query = db
      .select({ id: creators.id, tiktokHandle: creators.tiktokHandle })
      .from(creators)
      .where(eq(creators.status, 'active'))
      .limit(500);

    const creatorList = await query;
    if (!creatorList.length) return this.result('metrics_compute', 0, 0, start, {});

    let processed = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    for (const creator of creatorList) {
      if (creatorIds?.length && !creatorIds.includes(creator.id)) continue;

      const videos = await db
        .select()
        .from(contentTracking)
        .where(sql`${contentTracking.creatorId} = ${creator.id} AND ${contentTracking.postedAt} >= ${thirtyDaysAgo}`)
        .limit(100);

      if (!videos.length) continue;

      const avgViews = Math.round(videos.reduce((s, v) => s + (v.views ?? 0), 0) / videos.length);
      const avgLikes = Math.round(videos.reduce((s, v) => s + (v.likes ?? 0), 0) / videos.length);
      const avgShares = Math.round(videos.reduce((s, v) => s + (v.shares ?? 0), 0) / videos.length);
      const engRate = avgViews > 0
        ? Math.round(((avgLikes + avgShares) / avgViews) * 10000) / 10000
        : 0;

      await db.update(creators).set({
        avgViews,
        engagementRate: engRate.toString(),
        updatedAt: new Date(),
      }).where(eq(creators.id, creator.id));

      processed++;
    }

    return this.result('metrics_compute', processed, 0, start, { creators_updated: processed });
  }

  // ------------------------------------
  // Full sync
  // ------------------------------------
  async runFullSync(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const [profileResult, contentResult] = await Promise.all([
      this.syncProfiles(),
      this.syncContent(),
    ]);
    results.push(profileResult, contentResult);
    results.push(await this.syncShopOrders());
    results.push(await this.computeMetrics());
    return results;
  }

  // ------------------------------------
  // Helpers
  // ------------------------------------
  private filterBanilacoContent(videos: CrawledVideo[]): CrawledVideo[] {
    const keywords = [
      'banilaco', 'banila co', 'cleanitzero', 'clean it zero',
      'cleansing balm', 'banilacousa', 'banilacoreview',
    ];
    return videos.filter((v) => {
      const text = `${v.description} ${v.hashtags.join(' ')}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    });
  }

  private result(
    type: SyncJobType, processed: number, failed: number,
    startTime: number, updates: Partial<SyncResult['updates']>,
  ): SyncResult {
    return {
      job_id: `${type}_${Date.now()}`,
      type,
      status: failed === 0 ? 'completed' : processed > 0 ? 'partial' : 'failed',
      processed,
      failed,
      duration_ms: Date.now() - startTime,
      updates: { creators_updated: 0, videos_added: 0, orders_synced: 0, new_discoveries: 0, ...updates },
    };
  }
}
