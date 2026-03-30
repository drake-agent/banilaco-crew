// ============================================
// Next.js Middleware - Route Protection
// /dashboard → Admin 인증 필요
// /creator   → Creator 인증 필요
// ============================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
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

  // Supabase 세션 확인 (@supabase/ssr 방식)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
          });
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 미인증 → /auth로 리다이렉트
  if (!user) {
    const authUrl = new URL('/auth', req.url);
    authUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(authUrl);
  }

  // /creator 라우트 — creator_accounts에 연결된 유저만 접근
  if (pathname.startsWith('/creator')) {
    const { data: account } = await supabase
      .from('creator_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!account) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // /dashboard 라우트 — admin 체크
  if (pathname.startsWith('/dashboard')) {
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
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
