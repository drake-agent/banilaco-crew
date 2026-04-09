import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sampleShipments } from '@/db/schema/samples';
import { creators } from '@/db/schema/creators';
import { contentTracking } from '@/db/schema/content';
import { verifyAdmin, verifyCronAuth } from '@/lib/auth';
import { eq, and, isNull, isNotNull, sql, lte } from 'drizzle-orm';

/**
 * GET /api/reminders — List samples needing reminders
 */
export async function GET() {
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
 * POST /api/reminders — Process reminders (Cron or manual)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === 'process') {
    // Cron auth
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

    let processed = 0;

    // Auto-detect content posted
    const deliveredShipments = await db
      .select({
        id: sampleShipments.id,
        creatorId: sampleShipments.creatorId,
        deliveredAt: sampleShipments.deliveredAt,
      })
      .from(sampleShipments)
      .where(
        sql`${sampleShipments.status} IN ('delivered', 'reminder_1', 'reminder_2') AND ${sampleShipments.deliveredAt} IS NOT NULL`,
      );

    for (const shipment of deliveredShipments) {
      // Check if creator posted content after delivery
      const [content] = await db
        .select({ id: contentTracking.id })
        .from(contentTracking)
        .where(
          and(
            eq(contentTracking.creatorId, shipment.creatorId),
            sql`${contentTracking.postedAt} >= ${shipment.deliveredAt}`,
          ),
        )
        .limit(1);

      if (content) {
        await db.update(sampleShipments).set({
          status: 'content_posted',
          contentPostedAt: now,
          updatedAt: now,
        }).where(eq(sampleShipments.id, shipment.id));
        processed++;
      }
    }

    // Mark 14+ day no-response
    await db.update(sampleShipments).set({
      status: 'no_response',
      updatedAt: now,
    }).where(
      and(
        eq(sampleShipments.status, 'reminder_2'),
        isNotNull(sampleShipments.deliveredAt),
        lte(sampleShipments.deliveredAt, fourteenDaysAgo),
      ),
    );

    return NextResponse.json({ processed, message: 'Reminders processed' });
  }

  // Manual send (admin only)
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  return NextResponse.json({ message: 'Manual reminder sent (placeholder)' });
}
