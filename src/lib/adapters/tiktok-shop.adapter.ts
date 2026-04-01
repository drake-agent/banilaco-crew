// ============================================
// TikTok Shop API Adapter
// 셀러센터 Open API → GMV, 주문, 커미션 데이터
//
// v2: Uses TikTokClient for proper HMAC-SHA256 signing,
//     POST support, token refresh, and retries.
// ============================================

import type {
  ITikTokShopAdapter,
  ShopOrder,
  ShopAffiliateStats,
} from './types';
import { TikTokClient } from '@/lib/tiktok/client';

// TikTok Shop API response types
interface TikTokOrderRaw {
  order_id: string;
  create_time?: number;
  settle_time?: number;
  order_status?: number;
  affiliate_info?: {
    creator_id?: string;
    commission_amount?: number;
    commission_rate?: number;
  };
  item_list?: Array<{
    product_id?: string;
    product_name?: string;
    quantity?: number;
  }>;
  payment_info?: {
    total_amount?: number;
  };
}

interface TikTokOrderListResponse {
  order_list?: TikTokOrderRaw[];
  next_cursor?: string;
  more?: boolean;
}

interface TikTokCreatorPerformanceRaw {
  creator_id?: string;
  creator_name?: string;
  order_count?: number;
  total_gmv?: number;
  total_commission?: number;
  top_products?: Array<{
    product_id?: string;
    product_name?: string;
    gmv?: number;
  }>;
}

interface TikTokPerformanceResponse {
  creator_performance_list?: TikTokCreatorPerformanceRaw[];
}

interface TopProduct {
  product_id: string;
  name: string;
  gmv: number;
}

interface TikTokShopConfig {
  appKey: string;
  appSecret: string;
  shopId: string;
  accessToken: string;
  baseUrl?: string;
}

export class TikTokShopAdapter implements ITikTokShopAdapter {
  private config: TikTokShopConfig;
  private client: TikTokClient;

  constructor(config: TikTokShopConfig) {
    this.config = config;
    this.client = new TikTokClient({
      appKey: config.appKey,
      appSecret: config.appSecret,
      baseUrl: config.baseUrl,
    });
  }

  /** Request options with access token */
  private get reqOpts() {
    return { accessToken: this.config.accessToken };
  }

  // ------------------------------------
  // Public: ITikTokShopAdapter 구현
  // ------------------------------------

  async fetchOrders(params: {
    start_date: string;
    end_date: string;
    cursor?: string;
    page_size?: number;
  }) {
    // Use AffiliateSeller.searchSellerAffiliateOrders for affiliate-specific orders
    const data = await this.client.post<TikTokOrderListResponse>(
      'affiliate_seller',
      'affiliate_orders/search',
      {
        create_time_from: Math.floor(new Date(params.start_date).getTime() / 1000),
        create_time_to: Math.floor(new Date(params.end_date).getTime() / 1000),
        cursor: params.cursor || '',
        page_size: params.page_size || 50,
      },
      {},
      this.reqOpts
    );

    const orders: ShopOrder[] = (data.order_list || []).map((o: TikTokOrderRaw) => ({
      order_id: o.order_id,
      creator_tiktok_id: o.affiliate_info?.creator_id || '',
      product_id: o.item_list?.[0]?.product_id || '',
      product_name: o.item_list?.[0]?.product_name || '',
      quantity:
        o.item_list?.reduce(
          (sum: number, i) => sum + (i.quantity || 0),
          0
        ) || 0,
      gmv: Number(o.payment_info?.total_amount || 0) / 100, // 센트 → 달러
      commission_amount: Number(o.affiliate_info?.commission_amount || 0) / 100,
      commission_rate:
        Number(o.affiliate_info?.commission_rate || 0) / 10000,
      order_status: this.mapOrderStatus(o.order_status),
      ordered_at: new Date((o.create_time || 0) * 1000).toISOString(),
      settled_at: o.settle_time
        ? new Date(o.settle_time * 1000).toISOString()
        : undefined,
    }));

    return {
      orders,
      next_cursor: data.next_cursor || undefined,
      has_more: data.more || false,
    };
  }

  async fetchAffiliateStats(params: {
    creator_tiktok_ids?: string[];
    period: 'daily' | 'weekly' | 'monthly';
    start_date: string;
    end_date: string;
  }): Promise<ShopAffiliateStats[]> {
    // TikTok Shop API — AffiliateSeller performance report
    // 크리에이터별 aggregate 성과 반환
    const data = await this.client.get<TikTokPerformanceResponse>(
      'affiliate_seller',
      'creator_performance/search',
      {
        start_date: params.start_date.replace(/-/g, ''),
        end_date: params.end_date.replace(/-/g, ''),
        dimension:
          params.period === 'daily'
            ? 1
            : params.period === 'weekly'
              ? 2
              : 3,
      },
      this.reqOpts
    );

    let results = (data.creator_performance_list || [])
      .filter((c: TikTokCreatorPerformanceRaw): c is Required<Pick<TikTokCreatorPerformanceRaw, 'creator_id'>> & TikTokCreatorPerformanceRaw =>
        !!c.creator_id
      )
      .map((c: TikTokCreatorPerformanceRaw & { creator_id: string }) => ({
        creator_tiktok_id: c.creator_id,
        tiktok_handle: c.creator_name || '',
        period_start: params.start_date,
        period_end: params.end_date,
        total_orders: c.order_count || 0,
        total_gmv: Number(c.total_gmv || 0) / 100,
        total_commission: Number(c.total_commission || 0) / 100,
        avg_order_value: c.order_count
          ? Number(c.total_gmv || 0) / 100 / c.order_count
          : 0,
        top_products: (c.top_products || [])
          .filter(
            (p): p is Required<typeof p> =>
              !!p.product_id && !!p.product_name
          )
          .map((p): TopProduct => ({
            product_id: p.product_id,
            name: p.product_name,
            gmv: Number(p.gmv || 0) / 100,
          })),
      }));

    // 특정 크리에이터만 필터링
    if (params.creator_tiktok_ids?.length) {
      const idSet = new Set(params.creator_tiktok_ids);
      results = results.filter((r) => idSet.has(r.creator_tiktok_id));
    }

    return results;
  }

  async fetchCreatorGMV(creator_tiktok_id: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await this.fetchAffiliateStats({
      creator_tiktok_ids: [creator_tiktok_id],
      period: 'monthly',
      start_date: monthStart.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    });

    const current = stats[0];
    return {
      monthly_gmv: current ? current.total_gmv : 0,
      total_gmv: 0, // total은 별도 aggregate 쿼리 필요 — DB에서 합산
      last_order_at: undefined, // fetchOrders로 별도 조회
    };
  }

  // ------------------------------------
  // Helpers
  // ------------------------------------

  private mapOrderStatus(status: number | undefined): ShopOrder['order_status'] {
    if (!status) return 'pending';
    switch (status) {
      case 100: return 'pending';
      case 111:
      case 112:
      case 121: return 'confirmed';
      case 130: return 'settled';
      case 140: return 'cancelled';
      default: return 'pending';
    }
  }
}
