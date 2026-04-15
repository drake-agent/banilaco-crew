/**
 * Reminder Engine — Drizzle ORM
 *
 * Sends reminders to creators who received samples but haven't posted content.
 * Timeline: Day 5 → reminder_1, Day 10 → reminder_2, Day 14 → no_response
 */

import { db } from '@/db';
import { sampleShipments } from '@/db/schema/samples';
import { creators } from '@/db/schema/creators';
import { contentTracking } from '@/db/schema/content';
import { eq, and, isNull, isNotNull, lte, sql } from 'drizzle-orm';
import { INotificationSender } from './notification-sender';
import {
  renderTemplate, reminder1_dm, reminder1_email,
  reminder2_dm, reminder2_email, content_posted_thanks,
} from './templates';

export interface ReminderResult {
  reminder1Sent: number;
  reminder2Sent: number;
  markedNoResponse: number;
  contentDetected: number;
  errors: Array<{ shipmentId: string; error: string }>;
}

export class ReminderEngine {
  private sender: INotificationSender;

  constructor(notificationSender: INotificationSender) {
    this.sender = notificationSender;
  }

  async processReminders(): Promise<ReminderResult> {
    const result: ReminderResult = {
      reminder1Sent: 0, reminder2Sent: 0,
      markedNoResponse: 0, contentDetected: 0, errors: [],
    };

    try {
      // Auto-detect content first
      result.contentDetected = await this.autoDetectContentPosted();

      // Get delivered shipments needing reminders
      const shipments = await db
        .select({
          id: sampleShipments.id,
          status: sampleShipments.status,
          setType: sampleShipments.setType,
          deliveredAt: sampleShipments.deliveredAt,
          reminder1SentAt: sampleShipments.reminder1SentAt,
          reminder2SentAt: sampleShipments.reminder2SentAt,
          creatorId: sampleShipments.creatorId,
          creatorHandle: creators.tiktokHandle,
          creatorName: creators.displayName,
          creatorEmail: creators.email,
          creatorTier: creators.tier,
          creatorCommission: creators.commissionRate,
        })
        .from(sampleShipments)
        .leftJoin(creators, eq(sampleShipments.creatorId, creators.id))
        .where(
          and(
            sql`${sampleShipments.status} IN ('delivered', 'reminder_1')`,
            isNotNull(sampleShipments.deliveredAt),
            isNull(sampleShipments.contentPostedAt),
          ),
        );

      const now = Date.now();
      const fiveDaysMs = 5 * 86400000;
      const tenDaysMs = 10 * 86400000;
      const fourteenDaysMs = 14 * 86400000;

      for (const s of shipments) {
        if (!s.deliveredAt) continue;
        const daysSince = now - s.deliveredAt.getTime();
        const daysCount = Math.floor(daysSince / 86400000);

        const templateVars = {
          creator_name: s.creatorName || s.creatorHandle || '',
          tiktok_handle: s.creatorHandle || '',
          set_type: s.setType || 'sample',
          days_since_delivery: daysCount.toString(),
          commission_rate: s.creatorCommission?.toString() ?? '0.10',
          tier: s.creatorTier || 'pink_petal',
        };

        try {
          // Day 14+ → no_response
          if (daysSince >= fourteenDaysMs && s.status === 'reminder_1' && !s.reminder2SentAt) {
            // Send reminder 2 first, then mark no_response if past 14d
          }

          // Day 10+ → reminder_2
          if (daysSince >= tenDaysMs && s.status === 'reminder_1' && !s.reminder2SentAt) {
            const dmSent = s.creatorHandle
              ? await this.sender.sendDM(s.creatorHandle, renderTemplate(reminder2_dm, templateVars))
              : false;
            const emailSent = s.creatorEmail
              ? await this.sender.sendEmail(s.creatorEmail, 'Last Reminder: Post Your BANILACO SQUAD Content', renderTemplate(reminder2_email, templateVars))
              : false;
            if (!dmSent && !emailSent) continue;
            await db.update(sampleShipments).set({
              status: 'reminder_2', reminder2SentAt: new Date(), updatedAt: new Date(),
            }).where(eq(sampleShipments.id, s.id));
            result.reminder2Sent++;
            continue;
          }

          // Day 5+ → reminder_1
          if (daysSince >= fiveDaysMs && s.status === 'delivered' && !s.reminder1SentAt) {
            const dmSent = s.creatorHandle
              ? await this.sender.sendDM(s.creatorHandle, renderTemplate(reminder1_dm, templateVars))
              : false;
            const emailSent = s.creatorEmail
              ? await this.sender.sendEmail(s.creatorEmail, 'Your BANILACO SQUAD Sample', renderTemplate(reminder1_email, templateVars))
              : false;
            if (!dmSent && !emailSent) continue;
            await db.update(sampleShipments).set({
              status: 'reminder_1', reminder1SentAt: new Date(), updatedAt: new Date(),
            }).where(eq(sampleShipments.id, s.id));
            result.reminder1Sent++;
          }
        } catch (err) {
          result.errors.push({ shipmentId: s.id, error: err instanceof Error ? err.message : 'Unknown' });
        }
      }

      // Mark 14-day no_response
      const fourteenDaysAgo = new Date(now - fourteenDaysMs);
      const noResponseResult = await db.update(sampleShipments).set({
        status: 'no_response', updatedAt: new Date(),
      }).where(
        and(
          eq(sampleShipments.status, 'reminder_2'),
          isNotNull(sampleShipments.deliveredAt),
          lte(sampleShipments.deliveredAt, fourteenDaysAgo),
        ),
      ).returning({ id: sampleShipments.id });

      result.markedNoResponse = noResponseResult.length;

    } catch (err) {
      result.errors.push({ shipmentId: 'global', error: err instanceof Error ? err.message : 'Unknown' });
    }

    return result;
  }

  async autoDetectContentPosted(): Promise<number> {
    let detected = 0;

    const deliveredShipments = await db
      .select({
        id: sampleShipments.id,
        creatorId: sampleShipments.creatorId,
        deliveredAt: sampleShipments.deliveredAt,
        creatorHandle: creators.tiktokHandle,
        creatorName: creators.displayName,
      })
      .from(sampleShipments)
      .leftJoin(creators, eq(sampleShipments.creatorId, creators.id))
      .where(
        and(
          sql`${sampleShipments.status} IN ('delivered', 'reminder_1', 'reminder_2')`,
          isNotNull(sampleShipments.deliveredAt),
          isNull(sampleShipments.contentPostedAt),
        ),
      );

    for (const shipment of deliveredShipments) {
      if (!shipment.deliveredAt) continue;

      const [content] = await db
        .select({ id: contentTracking.id, videoUrl: contentTracking.videoUrl, postedAt: contentTracking.postedAt })
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
          contentPostedAt: content.postedAt ?? new Date(),
          contentUrl: content.videoUrl,
          updatedAt: new Date(),
        }).where(eq(sampleShipments.id, shipment.id));

        detected++;

        // Send thank you
        try {
          if (shipment.creatorHandle) {
            await this.sender.sendDM(
              shipment.creatorHandle,
              renderTemplate(content_posted_thanks, {
                creator_name: shipment.creatorName || shipment.creatorHandle,
                tiktok_handle: shipment.creatorHandle,
                set_type: 'sample', days_since_delivery: '0',
                commission_rate: '0', tier: 'pink_petal',
              }),
            );
          }
        } catch { /* non-critical */ }
      }
    }

    return detected;
  }
}
