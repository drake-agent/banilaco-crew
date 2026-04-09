// ============================================
// Data Sync Orchestrator
// 모든 어댑터를 조합하여 Supabase DB 동기화
// ============================================
//
// 📌 실행 방법:
//   1. Cron Job (Vercel Cron / Supabase Edge Function)
//   2. Admin Dashboard 수동 트리거
//   3. API Route 호출
//
// 📌 싱크 스케줄 권장:
//   - profile_refresh:      매일 1회 (새벽 3AM)
//   - content_crawl:        매일 1회 (새벽 4AM)
//   - shop_orders:          6시간마다
//   - competitor_discovery:  주 2회 (월/목)
//   - metrics_compute:      profile_refresh, content_crawl 직후
// ============================================

// TODO: Migrate from Supabase to Drizzle ORM queries
// The orchestrator still uses Supabase client internally.
// Each method needs to be converted to use `db` from '@/db'.
// For now, this is a placeholder import — will fail at runtime without DATABASE_URL.
import { db } from '@/db';
// @ts-expect-error — Legacy Supabase import, pending full migration
import { createServerClient } from '../supabase';
import type {
  ITikTokShopAdapter,
  ITikTokCrawlerAdapter,
  ICompetitorDiscoveryAdapter,
  SyncJob,
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
  // 1. 프로필 메트릭 갱신
  // ------------------------------------

  async syncProfiles(batchSize = 50): Promise<SyncResult> {
    const start = Date.now();
    const supabase = createServerClient();

    // active 크리에이터 목록 가져오기
    const { data: creators } = await supabase
      .from('creators')
      .select('id, tiktok_handle')
      .in('status', ['active', 'pending'])
      .order('last_active_at', { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (!creators?.length) {
      return this.result('profile_refresh', 0, 0, start, {});
    }

    const handles = creators.map((c) => c.tiktok_handle);
    let processed = 0;
    let failed = 0;
    const errorLog: { handle: string; error: string }[] = [];

    try {
      const profiles = await this.crawler.fetchProfiles(handles);
      const profileMap = new Map(profiles.map((p) => [p.tiktok_handle.toLowerCase(), p]));

      for (const creator of creators) {
        const profile = profileMap.get(creator.tiktok_handle.toLowerCase());
        if (!profile) {
          failed++;
          errorLog.push({ handle: creator.tiktok_handle, error: 'Profile not found' });
          continue;
        }

        if (typeof profile.follower_count !== 'number' || profile.follower_count < 0) {
          failed++;
          errorLog.push({ handle: creator.tiktok_handle, error: 'Invalid profile data: missing follower_count' });
          continue;
        }

        const { error } = await supabase
          .from('creators')
          .update({
            follower_count: profile.follower_count,
            display_name: profile.display_name || undefined,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', creator.id);

        if (error) {
          failed++;
          errorLog.push({ handle: creator.tiktok_handle, error: error.message });
        } else {
          processed++;
        }
      }
    } catch (err: unknown) {
      failed = handles.length;
      errorLog.push({ handle: 'batch', error: err instanceof Error ? err.message : String(err) });
    }

    return this.result('profile_refresh', processed, failed, start, {
      creators_updated: processed,
    });
  }

  // ------------------------------------
  // 2. 콘텐츠 크롤링 → content_tracking 저장
  // ------------------------------------

  async syncContent(batchSize = 30): Promise<SyncResult> {
    const start = Date.now();
    const supabase = createServerClient();

    const { data: creators } = await supabase
      .from('creators')
      .select('id, tiktok_handle, last_content_at')
      .eq('status', 'active')
      .order('last_content_at', { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (!creators?.length) {
      return this.result('content_crawl', 0, 0, start, {});
    }

    let totalVideos = 0;
    let failed = 0;

    for (const creator of creators) {
      try {
        const videos = await this.crawler.fetchVideos({
          tiktok_handle: creator.tiktok_handle,
          count: 10,
          after_date: creator.last_content_at || undefined,
        });

        // banilaco 관련 콘텐츠만 필터
        const relevantVideos = this.filterBanilacoContent(videos);

        for (const video of relevantVideos) {
          await supabase.from('content_tracking').upsert(
            {
              creator_id: creator.id,
              tiktok_video_id: video.video_id,
              video_url: `https://www.tiktok.com/@${video.tiktok_handle}/video/${video.video_id}`,
              views: video.view_count,
              likes: video.like_count,
              comments: video.comment_count,
              shares: video.share_count,
              posted_at: video.posted_at,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'tiktok_video_id' }
          );
          totalVideos++;
        }

        // 크리에이터의 avg_views, engagement_rate 업데이트
        if (videos.length > 0) {
          const avgViews = Math.round(
            videos.reduce((s, v) => s + v.view_count, 0) / videos.length
          );
          const engRate =
            avgViews > 0
              ? Math.round(
                  ((videos.reduce((s, v) => s + v.like_count + v.comment_count + v.share_count, 0) /
                    videos.length) /
                    avgViews) *
                    10000
                ) / 100
              : 0;

          await supabase
            .from('creators')
            .update({
              avg_views: avgViews,
              engagement_rate: engRate,
              monthly_content_count: relevantVideos.length,
              last_content_at: videos[0]?.posted_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', creator.id);
        }
      } catch {
        failed++;
      }
    }

    return this.result('content_crawl', creators.length - failed, failed, start, {
      videos_added: totalVideos,
      creators_updated: creators.length - failed,
    });
  }

  // ------------------------------------
  // 3. TikTok Shop 주문 동기화
  // ------------------------------------

  async syncShopOrders(): Promise<SyncResult> {
    const start = Date.now();
    const supabase = createServerClient();

    // ARCH-004: Check cron_sync_state to prevent overlapping runs
    const { data: syncState } = await supabase
      .from('cron_sync_state')
      .select('*')
      .eq('sync_type', 'shop_orders')
      .single();

    if (syncState?.status === 'running') {
      const runningFor = Date.now() - new Date(syncState.updated_at).getTime();
      // Allow re-run if stuck for > 10 minutes
      if (runningFor < 10 * 60 * 1000) {
        return this.result('shop_orders', 0, 0, start, {
          orders_synced: 0,
          skipped_reason: 'already_running',
        });
      }
    }

    // Mark as running
    await supabase
      .from('cron_sync_state')
      .upsert({
        sync_type: 'shop_orders',
        status: 'running',
        updated_at: new Date().toISOString(),
        run_count: (syncState?.run_count || 0) + 1,
      }, { onConflict: 'sync_type' });

    // 최근 7일간 주문 가져오기
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    let totalOrders = 0;
    let newOrders = 0;
    let skippedDuplicates = 0;
    let cursor: string | undefined;
    let hasMore = true;

    try {
      // PERF-004: Batch creator lookup — fetch all unique creator mappings upfront
      const { data: allCreators } = await supabase
        .from('creators')
        .select('id, tiktok_id')
        .not('tiktok_id', 'is', null);

      const creatorMap = new Map(
        (allCreators || []).map(c => [c.tiktok_id, c.id])
      );

      while (hasMore) {
        const result = await this.shop.fetchOrders({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          cursor,
          page_size: 50,
        });

        for (const order of result.orders) {
          totalOrders++;

          // ARCH-008: Check if this order was already processed (idempotency)
          const { data: existingOrder } = await supabase
            .from('order_tracking')
            .select('id')
            .eq('shop_order_id', order.order_id)
            .maybeSingle();

          if (existingOrder) {
            skippedDuplicates++;
            continue;
          }

          // PERF-004: Use pre-fetched Map instead of N+1 query
          const creatorId = creatorMap.get(order.creator_tiktok_id);

          if (creatorId && order.order_status === 'settled') {
            // Upsert order to prevent duplicate inserts
            const { error: upsertError } = await supabase.from('order_tracking').upsert({
              shop_order_id: order.order_id,
              creator_id: creatorId,
              order_status: order.order_status,
              gmv_amount: order.gmv,
            }, { onConflict: 'shop_order_id' });

            if (!upsertError) {
              // Then increment GMV
              await supabase.rpc('increment_creator_gmv', {
                p_creator_id: creatorId,
                p_gmv_amount: order.gmv,
              });

              newOrders++;
            }
          } else if (creatorId) {
            // Track non-settled orders too for visibility
            await supabase.from('order_tracking').upsert({
              shop_order_id: order.order_id,
              creator_id: creatorId,
              order_status: order.order_status,
              gmv_amount: order.gmv,
            }, { onConflict: 'shop_order_id' });
          }
        }

        cursor = result.next_cursor;
        hasMore = result.has_more;
      }

      // Mark completed
      await supabase
        .from('cron_sync_state')
        .update({
          status: 'completed',
          last_run_at: new Date().toISOString(),
          last_cursor: cursor || null,
          updated_at: new Date().toISOString(),
        })
        .eq('sync_type', 'shop_orders');

    } catch (err: unknown) {
      // Mark failed
      await supabase
        .from('cron_sync_state')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('sync_type', 'shop_orders');

      throw err;
    }

    return this.result('shop_orders', newOrders, 0, start, {
      orders_synced: newOrders,
      total_fetched: totalOrders,
      skipped_duplicates: skippedDuplicates,
    });
  }

  // ------------------------------------
  // 4. 경쟁사 크리에이터 디스커버리
  // ------------------------------------

  async runCompetitorDiscovery(
    brands: string[] = ['medicube', 'cosrx', 'beauty_of_joseon', 'anua', 'torriden', 'elf']
  ): Promise<SyncResult> {
    const start = Date.now();
    const supabase = createServerClient();
    let totalNew = 0;
    let failed = 0;

    for (const brand of brands) {
      try {
        const discovered = await this.discovery.discoverCreators({
          brand,
          hashtags: [],  // COMPETITOR_HASHTAG_MAP에서 자동 로드
          count: 30,
        });

        // 신규만 outreach_pipeline에 추가
        const newCreators = discovered.filter((d) => !d.already_in_db);

        for (const creator of newCreators) {
          const { error } = await supabase.from('outreach_pipeline').insert({
            tiktok_handle: creator.tiktok_handle,
            display_name: creator.display_name,
            follower_count: creator.follower_count,
            source_competitor: creator.source_brand,
            outreach_tier: creator.follower_count >= 100000 ? 'tier_a' : 'tier_b',
            status: 'identified',
          });

          if (!error) totalNew++;
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
  // 5. ComputedMetrics 계산
  // ------------------------------------

  async computeMetrics(creatorIds?: string[]): Promise<SyncResult> {
    const start = Date.now();
    const supabase = createServerClient();

    let query = supabase
      .from('creators')
      .select('id, tiktok_handle')
      .eq('status', 'active');

    if (creatorIds?.length) {
      query = query.in('id', creatorIds);
    }

    const { data: creators } = await query.limit(500);
    if (!creators?.length) return this.result('metrics_compute', 0, 0, start, {});

    let processed = 0;

    for (const creator of creators) {
      // 최근 30일 콘텐츠 가져오기
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: videos } = await supabase
        .from('content_tracking')
        .select('*')
        .eq('creator_id', creator.id)
        .gte('posted_at', thirtyDaysAgo.toISOString())
        .order('posted_at', { ascending: false })
        .limit(100);

      if (!videos?.length) continue;

      const metrics: Partial<ComputedMetrics> = {
        tiktok_handle: creator.tiktok_handle,
        avg_views: Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length),
        avg_likes: Math.round(videos.reduce((s, v) => s + v.likes, 0) / videos.length),
        avg_comments: Math.round(videos.reduce((s, v) => s + v.comments, 0) / videos.length),
        avg_shares: Math.round(videos.reduce((s, v) => s + v.shares, 0) / videos.length),
        posting_frequency: (videos.length / 4), // 30일 ÷ ~4주
        computed_at: new Date().toISOString(),
      };

      metrics.engagement_rate =
        (metrics.avg_views ?? 0) > 0
          ? Math.round(
              (((metrics.avg_likes ?? 0) + (metrics.avg_comments ?? 0) + (metrics.avg_shares ?? 0)) /
                (metrics.avg_views ?? 1)) *
                10000
            ) / 100
          : 0;

      // creator_recommendations 테이블에 저장 (schema-v2)
      await supabase.from('creator_recommendations').upsert(
        {
          creator_id: creator.id,
          type: 'metrics_snapshot',
          title: 'Monthly Performance Snapshot',
          description: JSON.stringify(metrics),
          priority: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'creator_id,type' }
      );

      processed++;
    }

    return this.result('metrics_compute', processed, 0, start, {
      creators_updated: processed,
    });
  }

  // ------------------------------------
  // 전체 싱크 (순차 실행)
  // ------------------------------------

  async runFullSync(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Parallelize independent sync jobs
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
    type: SyncJobType,
    processed: number,
    failed: number,
    startTime: number,
    updates: Partial<SyncResult['updates']>
  ): SyncResult {
    return {
      job_id: `${type}_${Date.now()}`,
      type,
      status: failed === 0 ? 'completed' : processed > 0 ? 'partial' : 'failed',
      processed,
      failed,
      duration_ms: Date.now() - startTime,
      updates: {
        creators_updated: 0,
        videos_added: 0,
        orders_synced: 0,
        new_discoveries: 0,
        ...updates,
      },
    };
  }
}
