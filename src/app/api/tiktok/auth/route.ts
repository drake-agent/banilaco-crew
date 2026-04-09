// ============================================
// /api/tiktok/auth — TikTok Shop OAuth (Drizzle)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { TikTokAuth } from '@/lib/tiktok/auth';
import { db } from '@/db';
import { tiktokCredentials } from '@/db/schema/tiktok';
import { eq } from 'drizzle-orm';

function getAuth() {
  return new TikTokAuth({
    appKey: process.env.TIKTOK_SHOP_APP_KEY!,
    appSecret: process.env.TIKTOK_SHOP_APP_SECRET!,
  });
}

export async function GET() {
  const auth = getAuth();
  const state = crypto.randomUUID().slice(0, 8);
  const authUrl = auth.getAuthorizationUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 600, path: '/',
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;
    if (!code) return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });

    const storedState = request.cookies.get('tiktok_oauth_state')?.value;
    if (!state || !storedState || state !== storedState) {
      return NextResponse.json({ error: 'Invalid state token' }, { status: 400 });
    }

    const auth = getAuth();
    const tokens = await auth.exchangeCodeForToken(code);

    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + tokens.access_token_expire_in * 1000);
    const refreshExpiresAt = new Date(now.getTime() + tokens.refresh_token_expire_in * 1000);

    // Upsert credentials
    await db
      .insert(tiktokCredentials)
      .values({
        shopId: tokens.open_id,
        shopName: tokens.seller_name || null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiresAt: tokenExpiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
        isActive: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: tiktokCredentials.shopId,
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: tokenExpiresAt,
          refreshTokenExpiresAt: refreshExpiresAt,
          isActive: true,
          updatedAt: now,
        },
      });

    const response = NextResponse.json({
      success: true,
      shop_id: tokens.open_id,
      seller_name: tokens.seller_name,
      expires_at: tokenExpiresAt.toISOString(),
    });
    response.cookies.delete('tiktok_oauth_state');
    return response;
  } catch (err: unknown) {
    console.error('TikTok OAuth error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 });
  }
}
