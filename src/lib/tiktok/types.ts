// ============================================
// TikTok Shop Open API — Type Definitions
// ============================================

/** API client configuration */
export interface TikTokClientConfig {
  appKey: string;
  appSecret: string;
  baseUrl?: string;          // default: https://open-api.tiktokglobalshop.com
  defaultVersion?: string;   // default: '202405'
}

/** Per-request options */
export interface RequestOptions {
  accessToken?: string;
  shopCipher?: string;
  version?: string;
}

/** Standard TikTok API response envelope */
export interface TikTokApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  request_id: string;
}

/** Token pair from OAuth or refresh */
export interface TokenPair {
  access_token: string;
  access_token_expire_in: number;    // seconds until expiry
  refresh_token: string;
  refresh_token_expire_in: number;
  open_id: string;
  seller_name: string;
  seller_base_region: string;
  user_type: number;
}

/** Stored credentials row in Supabase */
export interface TikTokCredentials {
  id: string;
  shop_id: string;
  shop_name: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;         // ISO 8601
  refresh_expires_at: string;
  shop_cipher: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Webhook event payload from TikTok */
export interface WebhookPayload {
  type: number;
  shop_id: string;
  data: Record<string, unknown>;
  timestamp: number;
}

/** Webhook event types */
export const WEBHOOK_EVENTS = {
  ORDER_STATUS_UPDATE: 1,
  REVERSE_ORDER_STATUS_UPDATE: 2,
  RECIPIENT_ADDRESS_UPDATE: 3,
  PACKAGE_UPDATE: 4,
  PRODUCT_STATUS_UPDATE: 5,
  SELLER_DEAUTHORIZATION: 6,
  UPCOMING_AUTH_EXPIRATION: 7,
  RETURN_STATUS_UPDATE: 12,
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

/** TikTok API error codes that mean token needs refresh */
export const TOKEN_ERROR_CODES = [105, 360] as const;
