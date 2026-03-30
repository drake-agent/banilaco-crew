// ============================================
// TikTok Profile & Content Crawler Adapter
// 크롤링 인프라 → 프로필, 비디오, 해시태그 데이터
// ============================================
//
// 📌 이 어댑터는 "크롤링 인프라"를 추상화합니다.
//    실제 크롤링 백엔드(Apify, 자체 Playwright, etc.)에 따라
//    아래 3가지 전략 중 하나를 선택하여 구현:
//
//    Strategy A: Apify Actor 호출 (추천 — 유지보수 제로)
//    Strategy B: 자체 크롤링 마이크로서비스 HTTP 호출
//    Strategy C: TikTok Research API (학술/비즈니스 계정 필요)
//
// 📌 현재 구현: Strategy A (Apify) 기본 + B/C 확장 가능
// ============================================

import type {
  ITikTokCrawlerAdapter,
  CrawledProfile,
  CrawledVideo,
} from './types';

// ------------------------------------
// Strategy A: Apify 연동
// ------------------------------------

interface ApifyConfig {
  apiToken: string;
  profileActorId?: string;  // 기본: 'clockworks/tiktok-profile-scraper'
  videoActorId?: string;    // 기본: 'clockworks/tiktok-scraper'
  hashtagActorId?: string;  // 기본: 'clockworks/tiktok-hashtag-scraper'
  baseUrl?: string;
}

export class ApifyTikTokCrawlerAdapter implements ITikTokCrawlerAdapter {
  private config: ApifyConfig;
  private baseUrl: string;

  constructor(config: ApifyConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.apify.com/v2';
  }

  // ------------------------------------
  // Private: Apify Actor 실행 헬퍼
  // ------------------------------------

  private async runActor<T>(actorId: string, input: Record<string, any>): Promise<T[]> {
    const url = `${this.baseUrl}/acts/${actorId}/runs`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiToken}`,
      },
      body: JSON.stringify({
        ...input,
        // 크롤링 인프라 설정 — 필요시 조정
        maxRequestsPerCrawl: input.maxRequestsPerCrawl || 100,
      }),
    });

    if (!res.ok) {
      throw new Error(`Apify run failed: ${res.status} ${res.statusText}`);
    }

    const run = await res.json();
    const runId = run.data?.id;

    // 완료 대기 (polling)
    const datasetItems = await this.waitAndGetResults<T>(runId);
    return datasetItems;
  }

  private async waitAndGetResults<T>(runId: string, maxWaitMs = 300000): Promise<T[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const statusRes = await fetch(
        `${this.baseUrl}/actor-runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
          },
        }
      );
      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === 'SUCCEEDED') {
        const datasetId = statusData.data?.defaultDatasetId;
        const itemsRes = await fetch(
          `${this.baseUrl}/datasets/${datasetId}/items`,
          {
            headers: {
              Authorization: `Bearer ${this.config.apiToken}`,
            },
          }
        );
        return (await itemsRes.json()) as T[];
      }

      if (status === 'FAILED' || status === 'ABORTED') {
        throw new Error(`Apify run ${runId} ${status}`);
      }

      // 5초 대기 후 재확인
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error(`Apify run ${runId} timed out after ${maxWaitMs}ms`);
  }

  // ------------------------------------
  // Public: ITikTokCrawlerAdapter 구현
  // ------------------------------------

  async fetchProfile(tiktok_handle: string): Promise<CrawledProfile | null> {
    const profiles = await this.fetchProfiles([tiktok_handle]);
    return profiles[0] || null;
  }

  async fetchProfiles(tiktok_handles: string[]): Promise<CrawledProfile[]> {
    const actorId = this.config.profileActorId || 'clockworks/tiktok-profile-scraper';

    const results = await this.runActor<any>(actorId, {
      profiles: tiktok_handles.map((h) => `https://www.tiktok.com/@${h}`),
    });

    return results.map((r) => this.mapProfile(r));
  }

  async fetchVideos(params: {
    tiktok_handle: string;
    count?: number;
    after_date?: string;
  }): Promise<CrawledVideo[]> {
    const actorId = this.config.videoActorId || 'clockworks/tiktok-scraper';

    const results = await this.runActor<any>(actorId, {
      profiles: [`https://www.tiktok.com/@${params.tiktok_handle}`],
      resultsPerPage: params.count || 30,
      shouldDownloadVideos: false,
    });

    let videos = results.map((r) => this.mapVideo(r, params.tiktok_handle));

    // after_date 필터링
    if (params.after_date) {
      const cutoff = new Date(params.after_date).getTime();
      videos = videos.filter((v) => new Date(v.posted_at).getTime() >= cutoff);
    }

    return videos;
  }

  async fetchVideoById(video_id: string): Promise<CrawledVideo | null> {
    const actorId = this.config.videoActorId || 'clockworks/tiktok-scraper';

    const results = await this.runActor<any>(actorId, {
      postURLs: [`https://www.tiktok.com/video/${video_id}`],
    });

    return results[0] ? this.mapVideo(results[0], '') : null;
  }

  async searchByHashtag(params: {
    hashtag: string;
    count?: number;
  }): Promise<CrawledVideo[]> {
    const actorId = this.config.hashtagActorId || 'clockworks/tiktok-hashtag-scraper';

    const results = await this.runActor<any>(actorId, {
      hashtags: [params.hashtag],
      resultsPerPage: params.count || 50,
    });

    return results.map((r) => this.mapVideo(r, r.authorMeta?.name || ''));
  }

  // ------------------------------------
  // Mappers: Apify raw → 표준 타입
  // ------------------------------------

  private mapProfile(raw: any): CrawledProfile {
    return {
      tiktok_id: raw.id || raw.userId || '',
      tiktok_handle: raw.uniqueId || raw.name || '',
      display_name: raw.nickname || raw.displayName || '',
      bio: raw.signature || raw.bio || '',
      avatar_url: raw.avatarLarger || raw.avatarThumb || '',
      follower_count: raw.fans || raw.followerCount || 0,
      following_count: raw.following || raw.followingCount || 0,
      like_count: raw.heart || raw.heartCount || 0,
      video_count: raw.video || raw.videoCount || 0,
      verified: raw.verified || false,
      crawled_at: new Date().toISOString(),
    };
  }

  private mapVideo(raw: any, fallback_handle: string): CrawledVideo {
    return {
      video_id: raw.id || raw.videoId || '',
      tiktok_handle: raw.authorMeta?.name || raw.author?.uniqueId || fallback_handle,
      description: raw.text || raw.desc || '',
      hashtags: (raw.hashtags || raw.challenges || []).map(
        (h: any) => (typeof h === 'string' ? h : h.title || h.name || '')
      ),
      music_title: raw.musicMeta?.musicName || raw.music?.title || undefined,
      view_count: raw.playCount || raw.stats?.playCount || 0,
      like_count: raw.diggCount || raw.stats?.diggCount || 0,
      comment_count: raw.commentCount || raw.stats?.commentCount || 0,
      share_count: raw.shareCount || raw.stats?.shareCount || 0,
      save_count: raw.collectCount || raw.stats?.collectCount || 0,
      duration_seconds: raw.videoMeta?.duration || raw.video?.duration || 0,
      cover_url: raw.videoMeta?.coverUrl || raw.video?.cover || undefined,
      video_url: raw.videoUrl || raw.video?.playAddr || undefined,
      posted_at: raw.createTime
        ? new Date(raw.createTime * 1000).toISOString()
        : raw.createTimeISO || new Date().toISOString(),
      crawled_at: new Date().toISOString(),
    };
  }
}

// ------------------------------------
// Strategy B: 자체 크롤링 서비스 연동
// ------------------------------------

interface SelfHostedConfig {
  baseUrl: string;        // e.g. 'http://crawler.internal:8080'
  apiKey?: string;
}

export class SelfHostedCrawlerAdapter implements ITikTokCrawlerAdapter {
  private config: SelfHostedConfig;

  constructor(config: SelfHostedConfig) {
    this.config = config;
  }

  private async request<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(`Crawler API error: ${res.status}`);
    return res.json();
  }

  async fetchProfile(tiktok_handle: string) {
    return this.request<CrawledProfile | null>(`/profile/${tiktok_handle}`);
  }

  async fetchProfiles(tiktok_handles: string[]) {
    return this.request<CrawledProfile[]>('/profiles/batch', { handles: tiktok_handles });
  }

  async fetchVideos(params: { tiktok_handle: string; count?: number; after_date?: string }) {
    return this.request<CrawledVideo[]>(`/videos/${params.tiktok_handle}`, {
      count: params.count || 30,
      after_date: params.after_date,
    });
  }

  async fetchVideoById(video_id: string) {
    return this.request<CrawledVideo | null>(`/video/${video_id}`);
  }

  async searchByHashtag(params: { hashtag: string; count?: number }) {
    return this.request<CrawledVideo[]>('/hashtag/search', params);
  }
}
