// ============================================
// Next.js Middleware - Route Protection
// /dashboard → Admin 인증 필요
// /creator   → Creator 인증 필요
// ============================================

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Public routes — 인증 불필요
  if (
    pathname === '/' ||
    pathname === '/join' ||
    pathname === '/auth' ||
    pathname.startsWith('/api/join') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return res;
  }

  // Sync API — 별도 Bearer 토큰 인증 (middleware에서 스킵)
  if (pathname.startsWith('/api/sync')) {
    return res;
  }

  // Supabase 세션 확인
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 미인증 → /auth로 리다이렉트
  if (!session) {
    const authUrl = new URL('/auth', req.url);
    authUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(authUrl);
  }

  // /creator 라우트 — creator_accounts에 연결된 유저만 접근
  if (pathname.startsWith('/creator')) {
    const { data: account } = await supabase
      .from('creator_accounts')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (!account) {
      // 크리에이터 계정이 없으면 메인으로
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // /dashboard 라우트 — admin 체크
  // Supabase에서 user_metadata.role = 'admin' 또는 별도 admins 테이블로 관리
  if (pathname.startsWith('/dashboard')) {
    const userRole = session.user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    // 인증이 필요한 모든 라우트
    '/dashboard/:path*',
    '/creator/:path*',
    '/api/creators/:path*',
    '/api/samples/:path*',
    '/api/outreach/:path*',
    '/api/kpi/:path*',
    '/api/creator/:path*',
    '/api/referrals/:path*',
    '/api/reminders/:path*',
  ],
};
