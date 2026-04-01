// ============================================
// TikTok Shop Open API — OAuth 2.0 Auth Flow
//
// Flow:
//   1. Admin clicks "Connect TikTok Shop"
//   2. Redirect to auth.tiktok-shops.com/oauth/authorize
//   3. User grants permission → callback with auth code
//   4. Exchange code for access_token + refresh_token
//   5. Store tokens in Supabase (tiktok_credentials)
//   6. Auto-refresh before expiry
// ============================================

import type { TokenPair } from './types';

const AUTH_URL = 'https://auth.tiktok-shops.com/oauth/authorize';
const TOKEN_URL = 'https://auth.tiktok-shops.com/api/v2/token/get';
const REFRESH_URL = 'https://auth.tiktok-shops.com/api/v2/token/refresh';

interface AuthConfig {
  appKey: string;
  appSecret: string;
}

export class TikTokAuth {
  private appKey: string;
  private appSecret: string;

  constructor(config: AuthConfig) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
  }

  /**
   * Generate the authorization URL to redirect the admin to.
   * @param state - CSRF protection token (store in session/cookie)
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      app_key: this.appKey,
      state: state || Math.random().toString(36).slice(2, 7),
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access + refresh tokens.
   * Called after user grants permission and is redirected back.
   */
  async exchangeCodeForToken(code: string): Promise<TokenPair> {
    const params = new URLSearchParams({
      app_key: this.appKey,
      app_secret: this.appSecret,
      auth_code: code,
      grant_type: 'authorized_code',
    });

    const res = await fetch(`${TOKEN_URL}?${params.toString()}`, {
      method: 'GET',
    });

    const json = await res.json();

    if (json.code !== 0) {
      throw new Error(`Token exchange failed: [${json.code}] ${json.message}`);
    }

    return json.data as TokenPair;
  }

  /**
   * Refresh an expired access token using the refresh token.
   * Refresh tokens are valid for ~1 year.
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const params = new URLSearchParams({
      app_key: this.appKey,
      app_secret: this.appSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch(`${REFRESH_URL}?${params.toString()}`, {
      method: 'GET',
    });

    const json = await res.json();

    if (json.code !== 0) {
      throw new Error(`Token refresh failed: [${json.code}] ${json.message}`);
    }

    return json.data as TokenPair;
  }

  /**
   * Check if a token is about to expire (within 1 hour).
   */
  static isTokenExpiringSoon(expiresAt: string | Date): boolean {
    const expiry = new Date(expiresAt).getTime();
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    return expiry < oneHourFromNow;
  }
}
