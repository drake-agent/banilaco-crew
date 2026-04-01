// ============================================
// Shipping Tracker Adapter
// 배송 추적 API 연동 (USPS, UPS, FedEx, DHL)
// ============================================
//
// 📌 지원 캐리어:
//   USPS   — 미국 내 K-beauty 샘플 (가장 많이 사용)
//   UPS    — 대량/프리미엄 세트
//   FedEx  — 빠른 배송 필요 시
//   DHL    — 해외 크리에이터
//
// 📌 연동 방식:
//   Strategy A: ShipStation / Shippo / AfterShip 같은 통합 API (추천)
//   Strategy B: 각 캐리어 API 직접 연동
//   Strategy C: 자체 크롤링 서비스
//
// 📌 현재 구현: Strategy A (AfterShip) 기본
// ============================================

// ------------------------------------
// 표준 타입 정의
// ------------------------------------

export type CarrierCode = 'usps' | 'ups' | 'fedex' | 'dhl' | 'other';

export type ShipmentTrackingStatus =
  | 'info_received'    // 운송장 생성됨 (아직 미접수)
  | 'in_transit'       // 배송 중
  | 'out_for_delivery' // 배달 출발
  | 'delivered'        // 배달 완료
  | 'failed_attempt'   // 배달 실패 (부재 등)
  | 'returned'         // 반송
  | 'exception'        // 예외 (분실, 파손 등)
  | 'expired'          // 추적 만료
  | 'unknown';

export interface TrackingCheckpoint {
  status: ShipmentTrackingStatus;
  message: string;            // "Package arrived at USPS facility in Los Angeles, CA"
  location?: string;          // "Los Angeles, CA"
  timestamp: string;          // ISO 8601
}

export interface TrackingResult {
  tracking_number: string;
  carrier: CarrierCode;
  current_status: ShipmentTrackingStatus;
  estimated_delivery?: string; // ISO 8601
  signed_by?: string;
  checkpoints: TrackingCheckpoint[];
  days_in_transit: number;
  last_updated: string;
}

export interface ShippingAnalytics {
  total_shipments: number;
  in_transit: number;
  delivered: number;
  failed: number;
  avg_delivery_days: number;
  delivery_rate: number;       // 0-100%
  by_carrier: {
    carrier: CarrierCode;
    count: number;
    avg_days: number;
    delivery_rate: number;
  }[];
  by_region: {
    state: string;
    count: number;
    avg_days: number;
  }[];
}

/** 배송 추적 어댑터 인터페이스 */
export interface IShippingTrackerAdapter {
  /** 단일 추적번호 조회 */
  track(tracking_number: string, carrier?: CarrierCode): Promise<TrackingResult | null>;

  /** 배치 추적 (여러 건 동시 조회) */
  trackBatch(items: { tracking_number: string; carrier?: CarrierCode }[]): Promise<TrackingResult[]>;

  /** 캐리어 자동 감지 */
  detectCarrier(tracking_number: string): CarrierCode;
}

// ------------------------------------
// AfterShip API Response Types
// ------------------------------------

interface AfterShipCheckpoint {
  tag?: string;
  message?: string;
  location?: string;
  checkpoint_time?: string;
}

interface AfterShipTracking {
  tracking_number?: string;
  slug?: string;
  tag?: string;
  checkpoints?: AfterShipCheckpoint[];
  shipment_pickup_date?: string;
  expected_delivery?: string;
  signed_by?: string;
  last_updated_at?: string;
}

interface AfterShipTrackingResponse {
  data?: {
    tracking?: AfterShipTracking;
  };
}

// ------------------------------------
// AfterShip 연동 구현
// ------------------------------------

interface AfterShipConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AfterShipTrackingAdapter implements IShippingTrackerAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AfterShipConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.aftership.com/v4';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'aftership-api-key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`AfterShip error: ${res.status} ${err?.meta?.message || res.statusText}`);
    }

    const json = await res.json();
    return json.data as T;
  }

  async track(
    tracking_number: string,
    carrier?: CarrierCode
  ): Promise<TrackingResult | null> {
    const slug = carrier
      ? this.carrierToSlug(carrier)
      : this.detectSlug(tracking_number);

    try {
      const data = await this.request<{ tracking: AfterShipTracking }>(
        'GET',
        `/trackings/${slug}/${tracking_number}`
      );
      return this.mapTracking(data.tracking);
    } catch {
      // 추적 정보가 없으면 먼저 등록 시도
      try {
        await this.request<Record<string, unknown>>(
          'POST',
          '/trackings',
          {
            tracking: { tracking_number, slug },
          }
        );
        // 등록 후 재조회
        const data = await this.request<{ tracking: AfterShipTracking }>(
          'GET',
          `/trackings/${slug}/${tracking_number}`
        );
        return this.mapTracking(data.tracking);
      } catch {
        return null;
      }
    }
  }

  async trackBatch(
    items: { tracking_number: string; carrier?: CarrierCode }[]
  ): Promise<TrackingResult[]> {
    // AfterShip은 배치 조회 미지원 — 병렬 개별 호출
    const promises = items.map((item) =>
      this.track(item.tracking_number, item.carrier)
    );
    const results = await Promise.allSettled(promises);

    return results
      .filter((r): r is PromiseFulfilledResult<TrackingResult | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((r): r is TrackingResult => r !== null);
  }

  detectCarrier(tracking_number: string): CarrierCode {
    const num = tracking_number.replace(/\s/g, '').toUpperCase();

    // USPS: 20-22자리 숫자 또는 "94..." 시작
    if (/^(94|93|92|91|90)\d{18,22}$/.test(num) || /^\d{20,22}$/.test(num)) {
      return 'usps';
    }
    // UPS: "1Z" 시작 + 16자리 영숫자
    if (/^1Z[A-Z0-9]{16}$/i.test(num)) {
      return 'ups';
    }
    // FedEx: 12 또는 15자리 숫자
    if (/^\d{12}$/.test(num) || /^\d{15}$/.test(num)) {
      return 'fedex';
    }
    // DHL: 10자리 숫자
    if (/^\d{10}$/.test(num)) {
      return 'dhl';
    }

    return 'other';
  }

  // ------------------------------------
  // Mappers
  // ------------------------------------

  private mapTracking(raw: AfterShipTracking): TrackingResult {
    const checkpoints: TrackingCheckpoint[] = (
      raw.checkpoints || []
    ).map((cp: AfterShipCheckpoint) => ({
      status: this.mapStatus(cp.tag || ''),
      message: cp.message || '',
      location: cp.location || undefined,
      timestamp: cp.checkpoint_time || new Date().toISOString(),
    }));

    const shippedAt = raw.shipment_pickup_date
      ? new Date(raw.shipment_pickup_date)
      : checkpoints.length
        ? new Date(checkpoints[checkpoints.length - 1].timestamp)
        : new Date();

    const now = new Date();
    const daysInTransit = Math.max(
      0,
      Math.ceil((now.getTime() - shippedAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      tracking_number: raw.tracking_number || '',
      carrier: this.slugToCarrier(raw.slug),
      current_status: this.mapStatus(raw.tag),
      estimated_delivery: raw.expected_delivery || undefined,
      signed_by: raw.signed_by || undefined,
      checkpoints,
      days_in_transit: daysInTransit,
      last_updated: raw.last_updated_at || new Date().toISOString(),
    };
  }

  private mapStatus(tag: string | undefined): ShipmentTrackingStatus {
    if (!tag) return 'unknown';
    const map: Record<string, ShipmentTrackingStatus> = {
      InfoReceived: 'info_received',
      InTransit: 'in_transit',
      OutForDelivery: 'out_for_delivery',
      Delivered: 'delivered',
      AttemptFail: 'failed_attempt',
      AvailableForPickup: 'out_for_delivery',
      Exception: 'exception',
      Expired: 'expired',
      Pending: 'info_received',
    };
    return map[tag] || 'unknown';
  }

  private carrierToSlug(carrier: CarrierCode): string {
    const map: Record<CarrierCode, string> = {
      usps: 'usps',
      ups: 'ups',
      fedex: 'fedex',
      dhl: 'dhl',
      other: 'other',
    };
    return map[carrier];
  }

  private slugToCarrier(slug: string | undefined): CarrierCode {
    if (slug?.includes('usps')) return 'usps';
    if (slug?.includes('ups')) return 'ups';
    if (slug?.includes('fedex')) return 'fedex';
    if (slug?.includes('dhl')) return 'dhl';
    return 'other';
  }

  private detectSlug(tracking_number: string): string {
    return this.carrierToSlug(this.detectCarrier(tracking_number));
  }
}

// ------------------------------------
// 자체 서비스 연동 (크롤링 인프라용)
// ------------------------------------

interface SelfHostedShippingConfig {
  baseUrl: string;
  apiKey?: string;
}

export class SelfHostedShippingAdapter implements IShippingTrackerAdapter {
  private config: SelfHostedShippingConfig;

  constructor(config: SelfHostedShippingConfig) {
    this.config = config;
  }

  private async request<T>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Shipping API error: ${res.status}`);
    return res.json();
  }

  async track(tracking_number: string, carrier?: CarrierCode) {
    return this.request<TrackingResult | null>(`/track/${tracking_number}`, {
      carrier: carrier || this.detectCarrier(tracking_number),
    });
  }

  async trackBatch(items: { tracking_number: string; carrier?: CarrierCode }[]) {
    return this.request<TrackingResult[]>('/track/batch', { items });
  }

  detectCarrier(tracking_number: string): CarrierCode {
    // AfterShip 어댑터와 동일 로직 재사용
    return new AfterShipTrackingAdapter({ apiKey: '' }).detectCarrier(tracking_number);
  }
}
