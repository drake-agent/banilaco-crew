import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/auth';
import { runDistillation } from '@/agent/distiller';

/**
 * GET /api/distiller — Nightly knowledge distiller (Cron)
 * FIX ARCH-6: Wire distiller to cron route
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runDistillation();
  return NextResponse.json({ cron: 'distiller', ...result });
}
