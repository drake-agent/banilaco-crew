// ============================================
// Competitor Creator Discovery Adapter
// 경쟁사 어필리에이트 크리에이터 헌팅
// ============================================
//
// 📌 게임플랜 Week 1-2 핵심:
//    Medicube, COSRX, Beauty of Joseon, Anua, Torriden, e.l.f.
//    → 이들의 어필리에이트 크리에이터를 식별 → DM 아웃리치
//
// 📌 디스커버리 흐름:
//    1. 경쟁사 해시태그/멘션으로 비디오 크롤링
//    2. 비디오에서 크리에이터 추출
//    3. 프로필 크롤링 → 팔로워/인게이지먼트 필터
//    4. 기존 DB와 대조 → 신규만 반환
//    5. outreach_pipeline에 'identified' 상태로 삽입
// ============================================

import type {
  ICompetitorDiscoveryAdapter,
  ITikTokCrawlerAdapter,
  DiscoveredCreator,
  CrawledVideo,
} from './types';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { ilike, inArray } from 'drizzle-orm';

// 경쟁사 브랜드별 기본 해시태그 매핑
export const COMPETITOR_HASHTAG_MAP: Record<string, string[]> = {
  medicube: ['medicube', 'medicubeus', 'agrzeroboomer', 'collagenjelly'],
  cosrx: ['cosrx', 'cosrxsnailmucin', 'snailmucin', 'cosrxreview'],
  beauty_of_joseon: ['beautyofjoseon', 'beautyofjoseonreview', 'bojsunscreen', 'glowserum'],
  anua: ['anua', 'anuacleansing', 'anuaoil', 'anuapeachserum'],
  torriden: ['torriden', 'torridenreview', 'torridendive', 'torridenserum'],
  elf: ['elfcosmetics', 'elfmakeup', 'elfskin', 'elfskincare'],
  banilaco: ['banilaco', 'cleanitzero', 'cleanitzerocleansingoil', 'banilacousa'],
};

interface CompetitorDiscoveryConfig {
  crawler: ITikTokCrawlerAdapter;
  minFollowers?: number;    // 기본 1000
  minAvgViews?: number;     // 기본 500
}

export class CompetitorDiscoveryAdapter implements ICompetitorDiscoveryAdapter {
  private crawler: ITikTokCrawlerAdapter;
  private minFollowers: number;
  private minAvgViews: number;

  constructor(config: CompetitorDiscoveryConfig) {
    this.crawler = config.crawler;
    this.minFollowers = config.minFollowers || 1000;
    this.minAvgViews = config.minAvgViews || 500;
  }

  async discoverCreators(params: {
    brand: string;
    hashtags: string[];
    min_followers?: number;
    min_avg_views?: number;
    count?: number;
  }): Promise<DiscoveredCreator[]> {
    const minFollowers = params.min_followers || this.minFollowers;
    const minAvgViews = params.min_avg_views || this.minAvgViews;
    const targetCount = params.count || 50;

    // 1단계: 해시태그별 비디오 크롤링
    const allHashtags = [
      ...params.hashtags,
      ...(COMPETITOR_HASHTAG_MAP[params.brand] || []),
    ];
    const uniqueHashtags = Array.from(new Set(allHashtags));

    const videoPromises = uniqueHashtags.map((tag) =>
      this.crawler.searchByHashtag({ hashtag: tag, count: targetCount })
    );
    const videoResults = await Promise.allSettled(videoPromises);

    // 비디오에서 고유 크리에이터 핸들 추출
    const creatorVideoMap = new Map<string, CrawledVideo[]>();

    for (const result of videoResults) {
      if (result.status === 'fulfilled') {
        for (const video of result.value) {
          const handle = video.tiktok_handle.toLowerCase();
          if (!handle) continue;
          const existing = creatorVideoMap.get(handle) || [];
          existing.push(video);
          creatorVideoMap.set(handle, existing);
        }
      }
    }

    // 2단계: 프로필 배치 크롤링
    const handles = Array.from(creatorVideoMap.keys()).slice(0, 200); // 배치 제한
    const profiles = await this.crawler.fetchProfiles(handles);

    // 3단계: 필터링 (팔로워 + 평균 조회수)
    const qualified = profiles.filter((p) => {
      const videos = creatorVideoMap.get(p.tiktok_handle.toLowerCase()) || [];
      const avgViews = videos.length
        ? videos.reduce((sum, v) => sum + v.view_count, 0) / videos.length
        : 0;
      return p.follower_count >= minFollowers && avgViews >= minAvgViews;
    });

    // 4단계: 기존 DB 대조 (Drizzle)
    const qualifiedHandles = qualified.map((p) => p.tiktok_handle);
    const existingCreators = qualifiedHandles.length > 0
      ? await db
          .select({ tiktokHandle: creators.tiktokHandle })
          .from(creators)
          .where(inArray(creators.tiktokHandle, qualifiedHandles))
      : [];

    const existingHandles = new Set(
      existingCreators.map((c) => c.tiktokHandle.toLowerCase())
    );

    // 5단계: DiscoveredCreator 매핑
    const discovered: DiscoveredCreator[] = qualified.map((profile) => {
      const videos = creatorVideoMap.get(profile.tiktok_handle.toLowerCase()) || [];
      const avgViews = videos.length
        ? videos.reduce((sum, v) => sum + v.view_count, 0) / videos.length
        : 0;
      const engagementRate = avgViews
        ? (videos.reduce((sum, v) => sum + v.like_count + v.comment_count + v.share_count, 0) /
            videos.length /
            avgViews) *
          100
        : 0;

      return {
        tiktok_handle: profile.tiktok_handle,
        tiktok_id: profile.tiktok_id,
        display_name: profile.display_name,
        follower_count: profile.follower_count,
        avg_views: Math.round(avgViews),
        engagement_rate: Math.round(engagementRate * 100) / 100,
        source_brand: params.brand,
        source_video_ids: videos.map((v) => v.video_id),
        estimated_gmv: undefined, // TikTok Shop 데이터 없으면 추정 불가
        already_in_db: existingHandles.has(profile.tiktok_handle.toLowerCase()),
        discovered_at: new Date().toISOString(),
      };
    });

    // 신규 크리에이터 우선, 팔로워 순 정렬
    return discovered
      .sort((a, b) => {
        if (a.already_in_db !== b.already_in_db) return a.already_in_db ? 1 : -1;
        return b.follower_count - a.follower_count;
      })
      .slice(0, targetCount);
  }

  async discoverShopAffiliates(params: {
    product_url: string;
    min_followers?: number;
  }): Promise<DiscoveredCreator[]> {
    // TikTok Shop 특정 상품 페이지의 리뷰/영상에서 크리에이터 추출
    // 상품 URL에서 product_id 파싱 후 관련 비디오 검색
    const productId = this.extractProductId(params.product_url);
    if (!productId) return [];

    // 상품명/키워드로 해시태그 검색 대체
    const videos = await this.crawler.searchByHashtag({
      hashtag: productId,
      count: 50,
    });

    const uniqueHandles = Array.from(new Set(videos.map((v) => v.tiktok_handle)));
    const profiles = await this.crawler.fetchProfiles(uniqueHandles);

    const minFollowers = params.min_followers || this.minFollowers;

    return profiles
      .filter((p) => p.follower_count >= minFollowers)
      .map((profile) => ({
        tiktok_handle: profile.tiktok_handle,
        tiktok_id: profile.tiktok_id,
        display_name: profile.display_name,
        follower_count: profile.follower_count,
        avg_views: 0,
        engagement_rate: 0,
        source_brand: 'tiktok_shop_product',
        source_video_ids: videos
          .filter((v) => v.tiktok_handle === profile.tiktok_handle)
          .map((v) => v.video_id),
        already_in_db: false,
        discovered_at: new Date().toISOString(),
      }));
  }

  private extractProductId(url: string): string | null {
    // https://www.tiktok.com/view/product/1234567890
    // https://shop.tiktok.com/view/product/1234567890
    const match = url.match(/product\/(\d+)/);
    return match ? match[1] : null;
  }
}
