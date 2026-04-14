/**
 * Sample Shipping Sync — Drizzle ORM
 * Cron: tracks shipped samples via AfterShip/self-hosted adapter
 */

import { db } from '@/db';
import { sampleShipments } from '@/db/schema/samples';
import { syncLog } from '@/db/schema/sync';
import { eq, and, isNotNull } from 'drizzle-orm';
import type { IShippingTrackerAdapter, TrackingResult, CarrierCode } from '@/lib/adapters/shipping-tracker.adapter';
import { onSampleDelivered } from '@/agent/memory/creator-sync';

interface SyncResult {
  total_checked: number;
  updated: number;
  delivered: number;
  exceptions: number;
  errors: string[];
}

export class SampleShippingSync {
  private tracker: IShippingTrackerAdapter;

  constructor(tracker: IShippingTrackerAdapter) {
    this.tracker = tracker;
  }

  async run(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      total_checked: 0, updated: 0, delivered: 0, exceptions: 0, errors: [],
    };

    // Log sync start
    const [logEntry] = await db.insert(syncLog).values({
      syncType: 'SHIPPING',
      recordsProcessed: 0,
    }).returning({ id: syncLog.id });

    try {
      // 1. Get shipped samples with tracking numbers
      const shipments = await db
        .select({
          id: sampleShipments.id,
          creatorId: sampleShipments.creatorId,
          setType: sampleShipments.setType,
          skuList: sampleShipments.skuList,
          trackingNumber: sampleShipments.trackingNumber,
          carrier: sampleShipments.carrier,
          status: sampleShipments.status,
        })
        .from(sampleShipments)
        .where(
          and(
            eq(sampleShipments.status, 'shipped'),
            isNotNull(sampleShipments.trackingNumber),
          ),
        );

      if (!shipments.length) {
        await this.completeSyncLog(logEntry.id, result, startTime);
        return result;
      }

      result.total_checked = shipments.length;

      // 2. Batch track
      const trackingItems = shipments.map((s) => ({
        tracking_number: s.trackingNumber!,
        carrier: (s.carrier ?? 'other') as CarrierCode,
      }));

      const trackingResults = await this.tracker.trackBatch(trackingItems);
      const resultMap = new Map<string, TrackingResult>();
      for (const tr of trackingResults) {
        resultMap.set(tr.tracking_number, tr);
      }

      // 3. Update shipments
      for (const shipment of shipments) {
        const tracking = resultMap.get(shipment.trackingNumber!);
        if (!tracking) continue;

        try {
          if (tracking.current_status === 'delivered') {
            const sortedCheckpoints = [...tracking.checkpoints].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
            );

            await db.update(sampleShipments).set({
              status: 'delivered',
              deliveredAt: new Date(sortedCheckpoints[0]?.timestamp ?? Date.now()),
              updatedAt: new Date(),
            }).where(eq(sampleShipments.id, shipment.id));

            result.updated++;
            result.delivered++;

            // Track in entity memory (L4) — non-blocking
            onSampleDelivered({
              creatorId: shipment.creatorId,
              shipmentId: shipment.id,
              setType: shipment.setType,
              skuList: (shipment.skuList as string[]) ?? [],
            }).catch(() => {});
          } else if (['failed_attempt', 'exception', 'returned'].includes(tracking.current_status)) {
            result.exceptions++;
          }
        } catch (err) {
          result.errors.push(`${shipment.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }

    await this.completeSyncLog(logEntry.id, result, startTime);
    return result;
  }

  private async completeSyncLog(logId: string, result: SyncResult, startTime: number) {
    await db.update(syncLog).set({
      recordsProcessed: result.total_checked,
      recordsUpdated: result.updated,
      durationMs: Date.now() - startTime,
      errorMessage: result.errors.length ? result.errors.join('; ') : null,
    }).where(eq(syncLog.id, logId));
  }
}
