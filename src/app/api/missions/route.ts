import { NextResponse } from 'next/server';
import { db } from '@/db';
import { missions, missionCompletions, dailyMissionSchedule } from '@/db/schema/missions';
import { creators } from '@/db/schema/creators';
import { verifyAuth, verifyAdmin, getCreatorFromAuth } from '@/lib/auth';
import { calculateTier } from '@/lib/tier/auto-update';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { parseJsonBody } from '@/lib/api/errors';

/**
 * GET /api/missions — Today's missions for the authenticated creator
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get('admin') === 'true';

  // Admin: list all mission templates
  if (isAdmin) {
    const adminResult = await verifyAdmin();
    if (adminResult.error) return adminResult.error;

    const allMissions = await db
      .select()
      .from(missions)
      .orderBy(desc(missions.createdAt));

    return NextResponse.json({ missions: allMissions });
  }

  // Creator: today's missions
  const creatorResult = await getCreatorFromAuth();
  if (creatorResult.error) return creatorResult.error;

  const today = new Date().toISOString().split('T')[0];

  // Get today's scheduled missions
  const todaySchedule = await db
    .select({
      mission: missions,
      slotOrder: dailyMissionSchedule.slotOrder,
      isMystery: dailyMissionSchedule.isMystery,
    })
    .from(dailyMissionSchedule)
    .innerJoin(missions, eq(dailyMissionSchedule.missionId, missions.id))
    .where(
      and(
        eq(dailyMissionSchedule.activeDate, today),
        eq(missions.isActive, true),
      ),
    )
    .orderBy(dailyMissionSchedule.slotOrder);

  // Check which ones the creator already completed today
  const todayCompletions = await db
    .select({ missionId: missionCompletions.missionId })
    .from(missionCompletions)
    .where(
      and(
        eq(missionCompletions.creatorId, creatorResult.creatorId),
        gte(missionCompletions.completedAt, new Date(`${today}T00:00:00Z`)),
        lte(missionCompletions.completedAt, new Date(`${today}T23:59:59Z`)),
      ),
    );

  const completedIds = new Set(todayCompletions.map((c) => c.missionId));

  const result = todaySchedule.map((s) => ({
    ...s.mission,
    slotOrder: s.slotOrder,
    completed: completedIds.has(s.mission.id),
    isMystery: s.isMystery,
  }));

  return NextResponse.json({
    date: today,
    missions: result,
    completedCount: completedIds.size,
    totalCount: todaySchedule.length,
  });
}

/**
 * POST /api/missions — Admin: create a mission template
 */
export async function POST(request: Request) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const parsed = await parseJsonBody<{
    missionType: string; title: string; description?: string;
    rewardType?: string; rewardAmount?: number; scoreAmount?: number;
    requiredTier?: string; recurrence?: string; metadata?: Record<string, unknown>;
    durationMinutes?: number;
  }>(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const [newMission] = await db
    .insert(missions)
    .values({
      missionType: body.missionType as 'learning' | 'creation' | 'viral',
      title: body.title,
      description: body.description,
      rewardType: (body.rewardType ?? 'both') as 'coin' | 'score' | 'both',
      rewardAmount: body.rewardAmount?.toString() ?? '0',
      scoreAmount: body.scoreAmount ?? 0,
      requiredTier: body.requiredTier,
      recurrence: (body.recurrence ?? 'daily') as 'daily' | 'weekly' | 'one_time' | 'event',
      metadata: body.metadata ?? {},
      durationMinutes: body.durationMinutes,
    })
    .returning();

  return NextResponse.json({ mission: newMission }, { status: 201 });
}

/**
 * PATCH /api/missions — Admin: update a mission template
 */
export async function PATCH(request: Request) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const parsed = await parseJsonBody<{
    id: string; title?: string; description?: string; missionType?: string;
    rewardAmount?: number; scoreAmount?: number; requiredTier?: string;
    recurrence?: string; isActive?: boolean; durationMinutes?: number;
  }>(request);
  if (parsed.error) return parsed.error;
  const { id, ...fields } = parsed.data;

  if (!id) {
    return NextResponse.json({ error: 'Mission ID required' }, { status: 400 });
  }

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if ('title' in fields) set.title = fields.title;
  if ('description' in fields) set.description = fields.description;
  if ('missionType' in fields) set.missionType = fields.missionType;
  if ('rewardAmount' in fields) set.rewardAmount = String(fields.rewardAmount);
  if ('scoreAmount' in fields) set.scoreAmount = fields.scoreAmount;
  if ('requiredTier' in fields) set.requiredTier = fields.requiredTier || null;
  if ('recurrence' in fields) set.recurrence = fields.recurrence;
  if ('isActive' in fields) set.isActive = fields.isActive;
  if ('durationMinutes' in fields) set.durationMinutes = fields.durationMinutes || null;

  const [updated] = await db
    .update(missions)
    .set(set)
    .where(eq(missions.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
  }

  return NextResponse.json({ mission: updated });
}
