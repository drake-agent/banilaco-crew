import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyMissionSchedule, missions } from '@/db/schema/missions';
import { verifyAdmin } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { parseJsonBody } from '@/lib/api/errors';

/**
 * GET /api/missions/schedule?date=YYYY-MM-DD — Day's schedule
 */
export async function GET(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const date = request.nextUrl.searchParams.get('date')
    ?? new Date().toISOString().split('T')[0];

  const schedule = await db
    .select({
      id: dailyMissionSchedule.id,
      slotOrder: dailyMissionSchedule.slotOrder,
      activeDate: dailyMissionSchedule.activeDate,
      mission: missions,
    })
    .from(dailyMissionSchedule)
    .innerJoin(missions, eq(dailyMissionSchedule.missionId, missions.id))
    .where(eq(dailyMissionSchedule.activeDate, date))
    .orderBy(dailyMissionSchedule.slotOrder);

  return NextResponse.json({ date, schedule });
}

/**
 * POST /api/missions/schedule — Assign mission to date
 */
export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const parsed = await parseJsonBody<{ missionId?: string; activeDate?: string; slotOrder?: number }>(request);
  if (parsed.error) return parsed.error;
  const { missionId, activeDate, slotOrder } = parsed.data;

  if (!missionId || !activeDate) {
    return NextResponse.json({ error: 'missionId and activeDate required' }, { status: 400 });
  }

  const [entry] = await db
    .insert(dailyMissionSchedule)
    .values({ missionId, activeDate, slotOrder: slotOrder ?? 0 })
    .returning();

  return NextResponse.json({ entry }, { status: 201 });
}

/**
 * DELETE /api/missions/schedule — Remove from schedule
 */
export async function DELETE(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const parsed = await parseJsonBody<{ id?: string }>(request);
  if (parsed.error) return parsed.error;
  const { id } = parsed.data;

  if (!id) {
    return NextResponse.json({ error: 'Schedule entry ID required' }, { status: 400 });
  }

  await db.delete(dailyMissionSchedule).where(eq(dailyMissionSchedule.id, id));
  return NextResponse.json({ deleted: true });
}
