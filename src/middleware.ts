// ============================================
// Next.js Middleware - Route Protection (NextAuth)
// /dashboard → Admin 인증 필요
// /creator   → Creator 인증 필요
// ============================================

import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user as Record<string, unknown> | undefined;

  // Public routes — no auth needed
  if (
    pathname === '/' ||
    pathname === '/join' ||
    pathname === '/auth' ||
    pathname.startsWith('/api/join') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/squad/validate') ||
    pathname.startsWith('/api/sync') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to /auth
  if (!user) {
    const authUrl = new URL('/auth', req.url);
    authUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(authUrl);
  }

  // /dashboard → admin only
  if (pathname.startsWith('/dashboard')) {
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // /creator → must have creator role or linked account
  // Fine-grained check happens in API guards (getCreatorFromAuth)

  return NextResponse.next();
});

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
    '/api/payouts/:path*',
    '/api/reminders/:path*',
    '/api/missions/:path*',
    '/api/league/:path*',
    '/api/squad/:path*',
    '/api/discord/:path*',
  ],
};
