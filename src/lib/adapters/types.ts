// ============================================
// Data Adapter Interfaces
// 크롤링 인프라 ↔ banilaco-crew 연동 계약
// ============================================

// ------------------------------------
// 1. TikTok Shop API (셀러센터)
// ------------------------------------

/** TikTok Shop에서 가져오는 어필리에이트 주문 데이터 */
export interface ShopOrder {
  order_id: string;
  creator_tiktok_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  gmv: number;            // 총 거래액 (USD)
  commission_amount: number;
  commission_rate: number; // 0.30 = 30%
  order_status: 'pending' | 'confirmed' | 'settled' | 'cancelled';
  ordered_at: string;      // ISO 8601
  settled_at?: string;
}

/** TikTok Shop 어필리에이트 요약 (크리에이터별) */
export interface ShopAffiliateStats {
  creator_tiktok_id: string;
  tiktok_handle: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  total_gmv: number;
  total_commission: number;
  avg_order_value: number;
  top_products: { product_id: string; name: string; gmv: number }[];
}

/** TikTok Shop API 어댑터 인터페이스 */
export interface ITikTokShopAdapter {
  /** 기간별 주문 목록 가져오기 */
  fetchOrders(params: {
    start_date: string;
    end_date: string;
    cursor?: string;
    page_size?: number;
  }): Promise<{ orders: ShopOrder[]; next_cursor?: string; has_more: boolean }>;

  /** 크리에이터별 어필리에이트 요약 */
  fetchAffiliateStats(params: {
    creator_tiktok_ids?: string[];
    period: 'daily' | 'weekly' | 'monthly';
    start_date: string;
    end_date: string;
  }): Promise<ShopAffiliateStats[]>;

  /** 단일 크리에이터의 실시간 GMV */
  fetchCreatorGMV(creator_tiktok_id: string): Promise<{
    monthly_gmv: number;
    total_gmv: number;
    last_order_at?: string;
  }>;
}

// ------------------------------------
// 2. TikTok Profile 크롤링
// ------------------------------------

/** 크롤링으로 가져오는 프로필 데이터 */
export interface CrawledProfile {
  tiktok_id: string;
  tiktok_handle: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  follower_count: number;
  following_count: number;
  like_count: number;        // 총 받은 좋아요
  video_count: number;
  verified: boolean;
  crawled_at: string;         // ISO 8601
}

/** 크롤링으로 가져오는 비디오 데이터 */
export interface CrawledVideo {
  video_id: string;
  tiktok_handle: string;
  description: string;
  hashtags: string[];
  music_title?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  save_count: number;
  duration_seconds: number;
  cover_url?: string;
  video_url?: string;
  posted_at: string;          // ISO 8601
  crawled_at: string;
}

/** 계산된 크리에이터 성과 메트릭 */
export interface ComputedMetrics {
  tiktok_handle: string;
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  avg_shares: number;
  engagement_rate: number;    // (likes + comments + shares) / views * 100
  posting_frequency: number;  // 주당 평균 포스팅 수
  best_posting_hour?: number; // 0-23
  best_posting_day?: string;  // 'monday' | 'tuesday' ...
  top_hashtags: string[];
  avg_video_duration: number;
  growth_rate_7d?: number;    // 7일간 팔로워 성장률 %
  growth_rate_30d?: number;
  content_categories: string[];
  computed_at: string;
}

/** TikTok 프로필/콘텐츠 크롤링 어댑터 인터페이스 */
export interface ITikTokCrawlerAdapter {
  /** 프로필 크롤링 (단일) */
  fetchProfile(tiktok_handle: string): Promise<CrawledProfile | null>;

  /** 프로필 배치 크롤링 */
  fetchProfiles(tiktok_handles: string[]): Promise<CrawledProfile[]>;

  /** 최근 비디오 크롤링 */
  fetchVideos(params: {
    tiktok_handle: string;
    count?: number;          // 기본 30
    after_date?: string;     // 이 날짜 이후 영상만
  }): Promise<CrawledVideo[]>;

  /** 특정 비디오 ID로 조회 */
  fetchVideoById(video_id: string): Promise<CrawledVideo | null>;

  /** 해시태그 검색 (경쟁사 모니터링용) */
  searchByHashtag(params: {
    hashtag: string;         // e.g. "banilaco", "cleanitzerocleansingoil"
    count?: number;
  }): Promise<CrawledVideo[]>;
}

// ------------------------------------
// 3. 경쟁사 크리에이터 디스커버리
// ------------------------------------

/** 경쟁사 브랜드에서 발견된 크리에이터 */
export interface DiscoveredCreator {
  tiktok_handle: string;
  tiktok_id?: string;
  display_name?: string;
  follower_count: number;
  avg_views: number;
  engagement_rate: number;
  source_brand: string;      // 'medicube' | 'cosrx' | 'beauty_of_joseon' etc.
  source_video_ids: string[];
  estimated_gmv?: number;    // 경쟁사에서의 추정 GMV
  already_in_db: boolean;    // 이미 우리 DB에 있는지
  discovered_at: string;
}

/** 경쟁사 크리에이터 디스커버리 어댑터 */
export interface ICompetitorDiscoveryAdapter {
  /** 경쟁사 해시태그/멘션으로 크리에이터 찾기 */
  discoverCreators(params: {
    brand: string;
    hashtags: string[];           // 브랜드 관련 해시태그
    min_followers?: number;       // 기본 1000 (floor only)
    min_avg_views?: number;       // 기본 500
    min_engagement_rate?: number; // 기본 2.0 (%) — 어필리에이트 전환 시그널
    count?: number;               // 기본 50
  }): Promise<DiscoveredCreator[]>;

  /** TikTok Shop 특정 상품의 어필리에이트 크리에이터 찾기 */
  discoverShopAffiliates(params: {
    product_url: string;
    min_followers?: number;
  }): Promise<DiscoveredCreator[]>;
}

// ------------------------------------
// 4. 통합 싱크 오케스트레이터 타입
// ------------------------------------

export type SyncJobType =
  | 'profile_refresh'       // 프로필 메트릭 갱신
  | 'content_crawl'         // 최근 콘텐츠 크롤링
  | 'shop_orders'           // TikTok Shop 주문 동기화
  | 'competitor_discovery'  // 경쟁사 크리에이터 발견
  | 'metrics_compute';      // 계산 메트릭 업데이트

export type SyncJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'partial';

export interface SyncJob {
  id: string;
  type: SyncJobType;
  status: SyncJobStatus;
  total_items: number;
  processed_items: number;
  failed_items: number;
  error_log: { handle: string; error: string }[];
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SyncResult {
  job_id: string;
  type: SyncJobType;
  status: SyncJobStatus;
  processed: number;
  failed: number;
  duration_ms: number;
  updates: {
    creators_updated: number;
    videos_added: number;
    orders_synced: number;
    new_discoveries: number;
    total_fetched?: number;
    skipped_duplicates?: number;
    skipped_reason?: string;
  };
}
