// ============================================
// TikTok Shop Open API — HTTP Client
// HMAC-SHA256 서명, POST 지원, 토큰 갱신, 재시도
//
// 서명 알고리즘은 공식 PHP SDK (EcomPHP/tiktokshop-php)에서 검증:
//   1. 쿼리 파라미터에서 sign, access_token 제외
//   2. 남은 파라미터를 키 기준 알파벳 정렬
//   3. key+value를 이어붙임: "app_key{val}timestamp{val}..."
//   4. 앞에 요청 경로 추가: "/affiliate_seller/202405/open_collaborations"
//   5. GET이 아니고 multipart가 아니면 body도 뒤에 추가
//   6. app_secret으로 감싸기: "{secret}{string}{secret}"
//   7. HMAC-SHA256(app_secret, wrapped_string).hexdigest()
// ============================================

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  TikTokClientConfig,
  TikTokApiResponse,
  RequestOptions,
} from './types';
import { TOKEN_ERROR_CODES } from './types';

const DEFAULT_BASE_URL = 'https://open-api.tiktokglobalshop.com';
const DEFAULT_VERSION = '202405';
const MAX_RETRIES = 5;
const RATE_LIMIT_DELAY_MS = 1_000;

export class TikTokClient {
  private appKey: string;
  private appSecret: string;
  private baseUrl: string;
  private defaultVersion: string;

  /** Optional callback invoked when token error (105/360) occurs */
  onTokenExpired?: (errorCode: number) => Promise<string | null>;

  constructor(config: TikTokClientConfig) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.defaultVersion = config.defaultVersion || DEFAULT_VERSION;
  }

  // ─── Public API ─────────────────────────────

  /** GET request to TikTok Shop API */
  async get<T = unknown>(
    resource: string,
    action: string,
    query: Record<string, string | number | boolean> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    return this.call<T>('GET', resource, action, query, undefined, options);
  }

  /** POST request to TikTok Shop API */
  async post<T = unknown>(
    resource: string,
    action: string,
    body: Record<string, unknown> = {},
    query: Record<string, string | number | boolean> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    return this.call<T>('POST', resource, action, query, body, options);
  }

  /** PUT request to TikTok Shop API */
  async put<T = unknown>(
    resource: string,
    action: string,
    body: Record<string, unknown> = {},
    query: Record<string, string | number | boolean> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    return this.call<T>('PUT', resource, action, query, body, options);
  }

  /** DELETE request to TikTok Shop API */
  async delete<T = unknown>(
    resource: string,
    action: string,
    query: Record<string, string | number | boolean> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    return this.call<T>('DELETE', resource, action, query, undefined, options);
  }

  // ─── Core Request Logic ─────────────────────

  private async call<T>(
    method: string,
    resource: string,
    action: string,
    query: Record<string, string | number | boolean>,
    body: Record<string, unknown> | undefined,
    options: RequestOptions,
    retryCount = 0,
  ): Promise<T> {
    const version = options.version || this.defaultVersion;
    const path = `/${resource}/${version}/${action}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Build query params (app_key and timestamp are always included)
    const allQuery: Record<string, string> = {
      app_key: this.appKey,
      timestamp,
    };

    // Add shop_cipher for cross-border shops
    if (options.shopCipher) {
      allQuery.shop_cipher = options.shopCipher;
    }

    // Add user-provided query params
    for (const [k, v] of Object.entries(query)) {
      allQuery[k] = String(v);
    }

    // Generate signature
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const sign = this.generateSignature(path, allQuery, method, bodyStr);
    allQuery.sign = sign;

    // Build URL
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(allQuery)) {
      url.searchParams.set(k, v);
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.accessToken) {
      headers['x-tts-access-token'] = options.accessToken;
    }

    // Execute request
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: bodyStr,
    });

    // Handle rate limit (429)
    if (res.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = res.headers.get('Retry-After');
      const delay = retryAfter
        ? (parseInt(retryAfter, 10) || 1) * 1000
        : RATE_LIMIT_DELAY_MS * Math.pow(2, retryCount);
      await sleep(delay);
      return this.call<T>(method, resource, action, query, body, options, retryCount + 1);
    }

    // Handle server errors (5xx)
    if (res.status >= 500 && retryCount < 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
      return this.call<T>(method, resource, action, query, body, options, retryCount + 1);
    }

    if (!res.ok) {
      throw new TikTokApiError(
        `HTTP ${res.status}: ${res.statusText}`,
        res.status,
        '',
      );
    }

    const json: TikTokApiResponse<T> = await res.json();

    // Handle token expiry
    const errorGroup = Math.floor(json.code / 1);
    if (TOKEN_ERROR_CODES.includes(json.code as any) && this.onTokenExpired && retryCount < 1) {
      const newToken = await this.onTokenExpired(json.code);
      if (newToken) {
        return this.call<T>(
          method, resource, action, query, body,
          { ...options, accessToken: newToken },
          retryCount + 1,
        );
      }
    }

    // Handle API errors
    if (json.code !== 0) {
      throw new TikTokApiError(
        json.message || `API error code: ${json.code}`,
        json.code,
        json.request_id,
      );
    }

    return json.data;
  }

  // ─── HMAC-SHA256 Signature ──────────────────

  /**
   * Generates TikTok Shop API request signature.
   *
   * Algorithm (verified from official PHP SDK):
   * 1. Take all query params except: sign, access_token
   * 2. Sort alphabetically by key
   * 3. Concatenate as: key1+value1+key2+value2...
   * 4. Prepend the request path
   * 5. For non-GET, non-multipart: append request body
   * 6. Wrap with app_secret: secret + string + secret
   * 7. HMAC-SHA256(secret, wrapped) → hex
   */
  generateSignature(
    path: string,
    query: Record<string, string>,
    method: string,
    body?: string,
  ): string {
    // Step 1-2: Filter and sort params
    const filtered = Object.entries(query)
      .filter(([k]) => k !== 'sign' && k !== 'access_token')
      .sort(([a], [b]) => a.localeCompare(b));

    // Step 3: Concatenate key+value pairs
    const paramString = filtered.map(([k, v]) => `${k}${v}`).join('');

    // Step 4: Prepend path
    let stringToSign = path + paramString;

    // Step 5: Append body for non-GET
    if (method !== 'GET' && body) {
      stringToSign += body;
    }

    // Step 6: Wrap with secret
    const wrapped = this.appSecret + stringToSign + this.appSecret;

    // Step 7: HMAC-SHA256
    return createHmac('sha256', this.appSecret)
      .update(wrapped)
      .digest('hex');
  }
}

// ─── Error Class ────────────────────────────

export class TikTokApiError extends Error {
  code: number;
  requestId: string;

  constructor(message: string, code: number, requestId: string) {
    super(message);
    this.name = 'TikTokApiError';
    this.code = code;
    this.requestId = requestId;
  }
}

// ─── Helpers ────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
