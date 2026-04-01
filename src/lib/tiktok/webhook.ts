// ============================================
// TikTok Shop Webhook — Signature Verification
//
// Verification algorithm (from official PHP SDK):
//   1. Get signature from Authorization header
//   2. Construct: app_key + raw_body
//   3. HMAC-SHA256(app_secret, constructed_string)
//   4. Timing-safe compare with header signature
// ============================================

import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookPayload } from './types';

interface WebhookConfig {
  appKey: string;
  appSecret: string;
}

export class TikTokWebhook {
  private appKey: string;
  private appSecret: string;

  constructor(config: WebhookConfig) {
    this.appKey = config.appKey;
    this.appSecret = config.appSecret;
  }

  /**
   * Verify webhook signature from TikTok.
   * Returns true if signature is valid.
   */
  verifySignature(rawBody: string, authorizationHeader: string): boolean {
    if (!authorizationHeader || !rawBody) {
      return false;
    }

    const expectedSignature = createHmac('sha256', this.appSecret)
      .update(this.appKey + rawBody)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    try {
      const sigBuf = Buffer.from(authorizationHeader, 'utf-8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');

      if (sigBuf.length !== expectedBuf.length) {
        return false;
      }

      return timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Parse and validate a webhook payload.
   * Returns null if body is invalid JSON.
   */
  parsePayload(rawBody: string): WebhookPayload | null {
    try {
      const parsed = JSON.parse(rawBody);
      if (
        typeof parsed.type !== 'number' ||
        typeof parsed.shop_id !== 'string' ||
        typeof parsed.timestamp !== 'number'
      ) {
        return null;
      }
      return parsed as WebhookPayload;
    } catch {
      return null;
    }
  }
}
