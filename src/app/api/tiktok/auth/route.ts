// ============================================
// /api/tiktok/auth — TikTok Shop OAuth Callback
//
// GET  → Redirect admin to TikTok auth page
// POST → Handle callback (exchange code for tokens)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TikTokAuth } from '@/lib/tiktok/auth';
import { createServerClient } from '@/lib/supabase';

function getAuth() {
  return new TikTokAuth({
    appKey: process.env.TIKTOK_SHOP_APP_KEY!,
    appSecret: process.env.TIKTOK_SHOP_APP_SECRET!,
  });
}

/**
 * GET /api/tiktok/auth
 * Starts OAuth flow — redirects admin to TikTok authorization page.
 */
export async function GET() {
  const auth = getAuth();

  // Generate state token for CSRF protection
  const state = crypto.randomUUID().slice(0, 8);

  const authUrl = auth.getAuthorizationUrl(state);

  // Store state in httpOnly cookie for verification in POST handler
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}

/**
 * POST /api/tiktok/auth
 * Handles the OAuth callback — exchanges auth code for tokens and stores them.
 *
 * Body: { code: string, state?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 },
      );
    }

    // Validate state token from cookie
    const storedState = request.cookies.get('tiktok_oauth_state')?.value;
    if (!state || !storedState || state !== storedState) {
      return NextResponse.json({ error: 'Invalid or missing state token' }, { status: 400 });
    }

    const auth = getAuth();
    const tokens = await auth.exchangeCodeForToken(code);

    // Calculate expiry timestamps
    const now = new Date();
    const tokenExpiresAt = new Date(
      now.getTime() + tokens.access_token_expire_in * 1000,
    ).toISOString();
    const refreshExpiresAt = new Date(
      now.getTime() + tokens.refresh_token_expire_in * 1000,
    ).toISOString();

    // Store in Supabase
    const supabase = createServerClient();
    const { error } = await supabase
      .from('tiktok_credentials')
      .upsert(
        {
          shop_id: tokens.open_id,
          shop_name: tokens.seller_name || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
          refresh_expires_at: refreshExpiresAt,
          is_active: true,
          updated_at: now.toISOString(),
        },
        { onConflict: 'shop_id' },
      );

    if (error) {
      console.error('Failed to store TikTok credentials:', error);
      return NextResponse.json(
        { error: 'Failed to store credentials' },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      success: true,
      shop_id: tokens.open_id,
      seller_name: tokens.seller_name,
      expires_at: tokenExpiresAt,
    });

    // Clear the state cookie after successful validation
    response.cookies.delete('tiktok_oauth_state');
    return response;
  } catch (err: unknown) {
    const safeMsg =
      err instanceof Error ? err.message : 'OAuth failed';
    console.error('TikTok OAuth error:', safeMsg);
    return NextResponse.json(
      { error: 'OAuth failed' },
      { status: 500 }
    );
  }
}
