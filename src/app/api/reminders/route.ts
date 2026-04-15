import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sampleShipments } from '@/db/schema/samples';
import { creators } from '@/db/schema/creators';
import { verifyAdmin, verifyCronAuth } from '@/lib/auth';
import { ReminderEngine, createNotificationSender } from '@/lib/reminders';
import { eq, and, isNull, isNotNull, lte } from 'drizzle-orm';

/**
 * GET /api/reminders — List samples needing reminders (admin) or process (cron)
 */
export async function GET(request: NextRequest) {
  // CFG-2 FIX: Support Vercel Cron auth (GET with CRON_SECRET)
  if (verifyCronAuth(request)) {
    return processCronReminders();
  }

  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);

  // Find delivered samples that need reminders
  const needsReminder1 = await db
    .select({
      shipmentId: sampleShipments.id,
      creatorHandle: creators.tiktokHandle,
      creatorEmail: creators.email,
      deliveredAt: sampleShipments.deliveredAt,
      status: sampleShipments.status,
    })
    .from(sampleShipments)
    .leftJoin(creators, eq(sampleShipments.creatorId, creators.id))
    .where(
      and(
        eq(sampleShipments.status, 'delivered'),
        isNotNull(sampleShipments.deliveredAt),
        lte(sampleShipments.deliveredAt, fiveDaysAgo),
        isNull(sampleShipments.reminder1SentAt),
      ),
    );

  const needsReminder2 = await db
    .select({
      shipmentId: sampleShipments.id,
      creatorHandle: creators.tiktokHandle,
      deliveredAt: sampleShipments.deliveredAt,
      status: sampleShipments.status,
    })
    .from(sampleShipments)
    .leftJoin(creators, eq(sampleShipments.creatorId, creators.id))
    .where(
      and(
        eq(sampleShipments.status, 'reminder_1'),
        isNotNull(sampleShipments.deliveredAt),
        lte(sampleShipments.deliveredAt, tenDaysAgo),
        isNull(sampleShipments.reminder2SentAt),
      ),
    );

  return NextResponse.json({
    needsReminder1: needsReminder1.length,
    needsReminder2: needsReminder2.length,
    details: {
      reminder1: needsReminder1,
      reminder2: needsReminder2,
    },
  });
}

/**
 * Shared reminder processing logic (used by both cron GET and POST action=process)
 */
async function processCronReminders(): Promise<NextResponse> {
  const engine = new ReminderEngine(createNotificationSender());
  const result = await engine.processReminders();
  return NextResponse.json({
    processed: result.reminder1Sent + result.reminder2Sent + result.markedNoResponse + result.contentDetected,
    message: 'Reminders processed',
    ...result,
  });
}

/**
 * POST /api/reminders — Process reminders (Cron or manual)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === 'process') {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return processCronReminders();
  }

  // Manual processing (admin only)
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  return processCronReminders();
}
