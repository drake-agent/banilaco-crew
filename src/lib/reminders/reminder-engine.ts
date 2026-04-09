// TODO: Migrate to Drizzle ORM
import { db } from '@/db';
// @ts-expect-error — Legacy Supabase import, pending full migration
import { createServerClient } from '@/lib/supabase';
import { SampleShipment, Creator, SampleStatus } from '@/types/database';
import { INotificationSender } from './notification-sender';
import { renderTemplate, reminder1_dm, reminder1_email, reminder2_dm, reminder2_email, content_posted_thanks } from './templates';

export interface ShipmentWithCreator extends SampleShipment {
  creator: Creator;
}

export interface ReminderResult {
  reminder1Sent: number;
  reminder2Sent: number;
  markedNoResponse: number;
  contentDetected: number;
  errors: Array<{ shipmentId: string; error: string }>;
}

export class ReminderEngine {
  private supabase = createServerClient();
  private notificationSender: INotificationSender;

  constructor(notificationSender: INotificationSender) {
    this.notificationSender = notificationSender;
  }

  /**
   * Main entry point: scan all shipped/delivered samples and process reminders
   */
  async processReminders(): Promise<ReminderResult> {
    const result: ReminderResult = {
      reminder1Sent: 0,
      reminder2Sent: 0,
      markedNoResponse: 0,
      contentDetected: 0,
      errors: [],
    };

    try {
      // Get all delivered shipments without content posted
      const { data: shipments, error } = await this.supabase
        .from('sample_shipments')
        .select('*, creator:creators(id, tiktok_handle, display_name, email, tier, commission_rate)')
        .eq('status', 'delivered')
        .is('content_posted_at', null)
        .order('delivered_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch shipments: ${error.message}`);
      }

      if (!shipments || shipments.length === 0) {
        return result;
      }

      const shipmentList = shipments as ShipmentWithCreator[];

      // Auto-detect content posted
      const contentDetected = await this.autoDetectContentPosted();
      result.contentDetected = contentDetected;

      // Re-fetch shipments after content detection
      const { data: updatedShipments } = await this.supabase
        .from('sample_shipments')
        .select('*, creator:creators(id, tiktok_handle, display_name, email, tier, commission_rate)')
        .eq('status', 'delivered')
        .is('content_posted_at', null)
        .order('delivered_at', { ascending: true });

      const activeShipments = (updatedShipments || []) as ShipmentWithCreator[];

      // Process reminders by age
      result.reminder1Sent = await this.sendReminder1(activeShipments);
      result.reminder2Sent = await this.sendReminder2(activeShipments);
      result.markedNoResponse = await this.markNoResponse(activeShipments);
    } catch (error) {
      console.error('ReminderEngine.processReminders error:', error);
      result.errors.push({
        shipmentId: 'global',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Send Reminder 1: 5 days after delivery, no content posted yet
   */
  private async sendReminder1(shipments: ShipmentWithCreator[]): Promise<number> {
    let sent = 0;
    const fiveDaysAgo = this.getDaysAgoDate(5);

    for (const shipment of shipments) {
      if (!shipment.delivered_at || shipment.reminder_1_sent_at) {
        continue;
      }

      const deliveredDate = new Date(shipment.delivered_at);
      if (deliveredDate > fiveDaysAgo) {
        continue; // Not 5 days yet
      }

      try {
        const creator = shipment.creator as Creator;
        if (!creator) {
          console.warn(`Shipment ${shipment.id} has no creator, skipping reminder_1`);
          continue;
        }

        const daysSinceDelivery = Math.floor(
          (Date.now() - new Date(shipment.delivered_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        const dmMessage = renderTemplate(reminder1_dm, {
          creator_name: creator.display_name || creator.tiktok_handle,
          tiktok_handle: creator.tiktok_handle,
          set_type: shipment.set_type || 'sample',
          days_since_delivery: daysSinceDelivery.toString(),
          commission_rate: creator.commission_rate.toString(),
          tier: creator.tier,
        });

        const emailSubject = `Your Banilaco Sample - ${shipment.set_type} Set`;
        const emailBody = renderTemplate(reminder1_email, {
          creator_name: creator.display_name || creator.tiktok_handle,
          tiktok_handle: creator.tiktok_handle,
          set_type: shipment.set_type || 'sample',
          days_since_delivery: daysSinceDelivery.toString(),
          commission_rate: creator.commission_rate.toString(),
          tier: creator.tier,
        });

        // Send notifications — verify at least DM succeeds before marking sent (SC-004)
        const dmSent = await this.notificationSender.sendDM(creator.tiktok_handle, dmMessage);
        if (!dmSent) {
          console.warn(`DM send failed for shipment ${shipment.id}, skipping status update`);
          continue;
        }
        if (creator.email) {
          await this.notificationSender.sendEmail(creator.email, emailSubject, emailBody);
        }

        // Update shipment status
        const { error } = await this.supabase
          .from('sample_shipments')
          .update({
            status: 'reminder_1' as SampleStatus,
            reminder_1_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.id);

        if (error) {
          throw error;
        }

        sent++;
      } catch (error) {
        console.error(`Error sending reminder_1 for shipment ${shipment.id}:`, error);
      }
    }

    return sent;
  }

  /**
   * Send Reminder 2: 10 days after delivery, still no content
   */
  private async sendReminder2(shipments: ShipmentWithCreator[]): Promise<number> {
    let sent = 0;
    const tenDaysAgo = this.getDaysAgoDate(10);

    for (const shipment of shipments) {
      if (!shipment.delivered_at || shipment.reminder_2_sent_at) {
        continue;
      }

      const deliveredDate = new Date(shipment.delivered_at);
      if (deliveredDate > tenDaysAgo) {
        continue; // Not 10 days yet
      }

      try {
        const creator = shipment.creator as Creator;
        if (!creator) {
          console.warn(`Shipment ${shipment.id} has no creator, skipping reminder_2`);
          continue;
        }

        const daysSinceDelivery = Math.floor(
          (Date.now() - new Date(shipment.delivered_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        const dmMessage = renderTemplate(reminder2_dm, {
          creator_name: creator.display_name || creator.tiktok_handle,
          tiktok_handle: creator.tiktok_handle,
          set_type: shipment.set_type || 'sample',
          days_since_delivery: daysSinceDelivery.toString(),
          commission_rate: creator.commission_rate.toString(),
          tier: creator.tier,
        });

        const emailSubject = `Last Reminder: Post Your Banilaco Content & Earn Commission`;
        const emailBody = renderTemplate(reminder2_email, {
          creator_name: creator.display_name || creator.tiktok_handle,
          tiktok_handle: creator.tiktok_handle,
          set_type: shipment.set_type || 'sample',
          days_since_delivery: daysSinceDelivery.toString(),
          commission_rate: creator.commission_rate.toString(),
          tier: creator.tier,
        });

        // Send notifications — verify at least DM succeeds before marking sent (SC-004)
        const dmSent = await this.notificationSender.sendDM(creator.tiktok_handle, dmMessage);
        if (!dmSent) {
          console.warn(`DM send failed for shipment ${shipment.id}, skipping status update`);
          continue;
        }
        if (creator.email) {
          await this.notificationSender.sendEmail(creator.email, emailSubject, emailBody);
        }

        // Update shipment status
        const { error } = await this.supabase
          .from('sample_shipments')
          .update({
            status: 'reminder_2' as SampleStatus,
            reminder_2_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.id);

        if (error) {
          throw error;
        }

        sent++;
      } catch (error) {
        console.error(`Error sending reminder_2 for shipment ${shipment.id}:`, error);
      }
    }

    return sent;
  }

  /**
   * Mark as no_response: 14 days after delivery, still no content
   */
  private async markNoResponse(shipments: ShipmentWithCreator[]): Promise<number> {
    let marked = 0;
    const fourteenDaysAgo = this.getDaysAgoDate(14);

    for (const shipment of shipments) {
      if (!shipment.delivered_at) {
        continue;
      }

      const deliveredDate = new Date(shipment.delivered_at);
      if (deliveredDate > fourteenDaysAgo) {
        continue; // Not 14 days yet
      }

      try {
        const { error } = await this.supabase
          .from('sample_shipments')
          .update({
            status: 'no_response' as SampleStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.id);

        if (error) {
          throw error;
        }

        marked++;
      } catch (error) {
        console.error(`Error marking no_response for shipment ${shipment.id}:`, error);
      }
    }

    return marked;
  }

  /**
   * Auto-detect content posted: check if creator has posted since delivery
   * This would check against a content_tracking table or external TikTok API
   */
  async autoDetectContentPosted(): Promise<number> {
    let detected = 0;

    try {
      // Get all delivered shipments without content posted
      const { data: shipments, error } = await this.supabase
        .from('sample_shipments')
        .select('*, creator:creators(id, tiktok_handle, tiktok_id)')
        .eq('status', 'delivered')
        .is('content_posted_at', null);

      if (error) {
        throw error;
      }

      if (!shipments || shipments.length === 0) {
        return detected;
      }

      // Collect all unique creator IDs for batch query
      const creatorIds: string[] = [];
      const shipmentMap = new Map<string, ShipmentWithCreator>();

      for (const shipment of shipments as ShipmentWithCreator[]) {
        const creator = shipment.creator as Creator;
        if (!creator) {
          console.warn(`Shipment ${shipment.id} has no creator, skipping content detection`);
          continue;
        }
        creatorIds.push(creator.id);
        shipmentMap.set(creator.id, shipment);
      }

      if (creatorIds.length === 0) {
        return detected;
      }

      // Single batch query: fetch all content for these creators
      const { data: allContentTracking, error: batchError } = await this.supabase
        .from('content_tracking')
        .select('id, creator_id, video_url, created_at')
        .in('creator_id', creatorIds);

      if (batchError) {
        console.warn('Error fetching batch content_tracking:', batchError);
        return detected;
      }

      // Build a Map of creator_id → latest content (newest created_at wins)
      const contentMap = new Map<string, typeof allContentTracking[0]>();
      if (allContentTracking) {
        for (const content of allContentTracking) {
          const existing = contentMap.get(content.creator_id);
          if (!existing || new Date(content.created_at) > new Date(existing.created_at)) {
            contentMap.set(content.creator_id, content);
          }
        }
      }

      // Process shipments against the pre-fetched content map
      for (const shipment of shipments as ShipmentWithCreator[]) {
        const creator = shipment.creator as Creator;
        if (!creator) continue;

        const contentTracking = contentMap.get(creator.id);
        if (!contentTracking || !shipment.delivered_at || new Date(contentTracking.created_at) <= new Date(shipment.delivered_at)) {
          continue;
        }

        // Content detected! Mark shipment as content_posted
        const { error: updateError } = await this.supabase
          .from('sample_shipments')
          .update({
            status: 'content_posted' as SampleStatus,
            content_posted_at: contentTracking.created_at,
            content_url: contentTracking.video_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipment.id);

        if (updateError) {
          console.error(`Error updating shipment ${shipment.id}:`, updateError);
        } else {
          detected++;

          // Send thank you message
          try {
            const thankYouMessage = renderTemplate(content_posted_thanks, {
              creator_name: creator.display_name || creator.tiktok_handle,
              tiktok_handle: creator.tiktok_handle,
              set_type: shipment.set_type || 'sample',
              days_since_delivery: '0',
              commission_rate: '0',
              tier: 'bronze',
            });

            await this.notificationSender.sendDM(creator.tiktok_handle, thankYouMessage);
          } catch (dmError) {
            console.error(`Error sending thank you DM for creator ${creator.tiktok_handle}:`, dmError);
          }
        }
      }
    } catch (error) {
      console.error('ReminderEngine.autoDetectContentPosted error:', error);
    }

    return detected;
  }

  /**
   * Helper: get date N days ago
   */
  private getDaysAgoDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
