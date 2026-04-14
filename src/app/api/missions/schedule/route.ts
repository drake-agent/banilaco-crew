import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyMissionSchedule, missions } from '@/db/schema/missions';
import { verifyAdmin } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { parseJsonBody } from '@/lib/api/errors';

// C4 FIX: business rule — only ONE mystery mission may be flagged per day.
const MAX_MYSTERY_PER_DAY = 1;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
      isMystery: dailyMissionSchedule.isMystery,
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

  const parsed = await parseJsonBody<{
    missionId?: string;
    activeDate?: string;
    slotOrder?: number;
    isMystery?: boolean;
  }>(request);
  if (parsed.error) return parsed.error;
  const { missionId, activeDate, slotOrder, isMystery } = parsed.data;

  if (!missionId || !activeDate) {
    return NextResponse.json({ error: 'missionId and activeDate required' }, { status: 400 });
  }

  // C4 FIX: validate inputs before trusting the admin payload.
  if (!DATE_RE.test(activeDate)) {
    return NextResponse.json({ error: 'activeDate must be YYYY-MM-DD' }, { status: 400 });
  }
  if (isMystery !== undefined && typeof isMystery !== 'boolean') {
    return NextResponse.json({ error: 'isMystery must be a boolean' }, { status: 400 });
  }
  if (slotOrder !== undefined && (typeof slotOrder !== 'number' || !Number.isInteger(slotOrder) || slotOrder < 0)) {
    return NextResponse.json({ error: 'slotOrder must be a non-negative integer' }, { status: 400 });
  }

  // C4 FIX: enforce the one-mystery-per-day business rule.
  if (isMystery === true) {
    const existingMystery = await db
      .select({ id: dailyMissionSchedule.id })
      .from(dailyMissionSchedule)
      .where(
        and(
          eq(dailyMissionSchedule.activeDate, activeDate),
          eq(dailyMissionSchedule.isMystery, true),
        ),
      )
      .limit(MAX_MYSTERY_PER_DAY);

    if (existingMystery.length >= MAX_MYSTERY_PER_DAY) {
      return NextResponse.json(
        { error: 'A mystery mission is already scheduled for this date' },
        { status: 409 },
      );
    }
  }

  const [entry] = await db
    .insert(dailyMissionSchedule)
    .values({
      missionId,
      activeDate,
      slotOrder: slotOrder ?? 0,
      isMystery: isMystery ?? false,
    })
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
