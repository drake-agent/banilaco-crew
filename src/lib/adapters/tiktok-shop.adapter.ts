// ============================================
// TikTok Shop API Adapter
// 셀러센터 Open API → GMV, 주문, 커미션 데이터
// ============================================
//
// 📌 사용법:
//   const adapter = new TikTokShopAdapter({
//     appKey: process.env.TIKTOK_SHOP_APP_KEY!,
//     appSecret: process.env.TIKTOK_SHOP_APP_SECRET!,
//     shopId: process.env.TIKTOK_SHOP_ID!,
//     accessToken: process.env.TIKTOK_SHOP_ACCESS_TOKEN!,
//   });
//   const stats = await adapter.fetchAffiliateStats({ ... });
//
// 📌 TikTok Shop Open API 문서:
//   https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9
//
// ============================================

import type {
  ITikTokShopAdapter,
  ShopOrder,
  ShopAffiliateStats,
} from './types';

interface TikTokShopConfig {
  appKey: string;
  appSecret: string;
  shopId: string;
  accessToken: string;
  baseUrl?: string;
}

export class TikTokShopAdapter implements ITikTokShopAdapter {
  private config: TikTokShopConfig;
  private baseUrl: string;

  constructor(config: TikTokShopConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://open-api.tiktokglobalshop.com';
  }

  // ------------------------------------
  // Private: API 호출 헬퍼
  // ------------------------------------

  private async request<T>(path: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const timestamp = Math.floor(Date.now() / 1000);

    // TikTok Shop API는 HMAC-SHA256 서명 필요
    // 실제 서명 로직은 아래 generateSignature에서 처리
    const sign = this.generateSignature(path, params, timestamp);

    const queryParams = {
      app_key: this.config.appKey,
      shop_id: this.config.shopId,
      timestamp: timestamp.toString(),
      sign,
      access_token: this.config.accessToken,
      ...params,
    };

    Object.entries(queryParams).forEach(([k, v]) =>
      url.searchParams.append(k, String(v))
    );

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`TikTok Shop API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    if (json.code !== 0) {
      throw new Error(`TikTok Shop API error: [${json.code}] ${json.message}`);
    }

    return json.data as T;
  }

  private generateSignature(
    path: string,
    params: Record<string, any>,
    timestamp: number
  ): string {
    // TikTok Shop HMAC-SHA256 서명
    // 실제 구현은 crypto 모듈 사용:
    //   1. 파라미터를 키 알파벳순 정렬
    //   2. key + value 문자열 연결
    //   3. appSecret + path + 연결문자열 + appSecret 으로 HMAC 생성
    //
    // 크롤링 인프라에 이미 서명 로직이 있다면 이 메서드를 오버라이드하거나
    // config에 signFn을 주입받아 사용
    const crypto = require('crypto');
    const sortedParams = Object.entries({ ...params, timestamp: timestamp.toString() })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}${v}`)
      .join('');

    const baseString = `${this.config.appSecret}${path}${sortedParams}${this.config.appSecret}`;
    return crypto
      .createHmac('sha256', this.config.appSecret)
      .update(baseString)
      .digest('hex');
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
    const data = await this.request<{
      order_list: any[];
      next_cursor: string;
      more: boolean;
    }>('/api/orders/search', {
      create_time_from: Math.floor(new Date(params.start_date).getTime() / 1000),
      create_time_to: Math.floor(new Date(params.end_date).getTime() / 1000),
      cursor: params.cursor || '',
      page_size: params.page_size || 50,
      // affiliate 주문만 필터
      order_type: 2, // 2 = affiliate order
    });

    const orders: ShopOrder[] = (data.order_list || []).map((o: any) => ({
      order_id: o.order_id,
      creator_tiktok_id: o.affiliate_info?.creator_id || '',
      product_id: o.item_list?.[0]?.product_id || '',
      product_name: o.item_list?.[0]?.product_name || '',
      quantity: o.item_list?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0,
      gmv: Number(o.payment_info?.total_amount || 0) / 100, // 센트 → 달러
      commission_amount: Number(o.affiliate_info?.commission_amount || 0) / 100,
      commission_rate: Number(o.affiliate_info?.commission_rate || 0) / 10000,
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
    // TikTok Shop API의 /api/affiliate/creator/performance_report 엔드포인트
    // 크리에이터별 aggregate 성과 반환
    const data = await this.request<{
      creator_performance_list: any[];
    }>('/api/affiliate/creator/performance_report', {
      start_date: params.start_date.replace(/-/g, ''),
      end_date: params.end_date.replace(/-/g, ''),
      dimension: params.period === 'daily' ? 1 : params.period === 'weekly' ? 2 : 3,
    });

    let results = (data.creator_performance_list || []).map((c: any) => ({
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
      top_products: (c.top_products || []).map((p: any) => ({
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
      monthly_gmv: current?.total_gmv || 0,
      total_gmv: 0, // total은 별도 aggregate 쿼리 필요 — DB에서 합산
      last_order_at: undefined, // fetchOrders로 별도 조회
    };
  }

  // ------------------------------------
  // Helpers
  // ------------------------------------

  private mapOrderStatus(status: number): ShopOrder['order_status'] {
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
