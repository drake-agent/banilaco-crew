// ============================================
// Sample Shipping Sync
// Cron으로 실행: 배송 중인 샘플 추적 상태 업데이트
//
// 1. shipped 상태 샘플 중 tracking_number 있는 것 조회
// 2. AfterShip 배치 API로 현재 상태 조회
// 3. delivered면 상태+시간 업데이트
// 4. sync_log에 결과 기록
// ============================================

import { createServerClient } from '@/lib/supabase';
import type { IShippingTrackerAdapter, TrackingResult } from '@/lib/adapters/shipping-tracker.adapter';
import type { SampleStatus } from '@/types/database';

interface SyncResult {
  total_checked: number;
  updated: number;
  delivered: number;
  exceptions: number;
  errors: string[];
}

export class SampleShippingSync {
  private supabase = createServerClient();
  private tracker: IShippingTrackerAdapter;

  constructor(tracker: IShippingTrackerAdapter) {
    this.tracker = tracker;
  }

  async run(): Promise<SyncResult> {
    const result: SyncResult = {
      total_checked: 0,
      updated: 0,
      delivered: 0,
      exceptions: 0,
      errors: [],
    };

    // Log sync start
    const { data: syncLog } = await this.supabase
      .from('sync_log')
      .insert({
        sync_type: 'ORDER',  // reuse ORDER type for shipping
        status: 'STARTED',
      })
      .select('id')
      .single();

    const syncLogId = syncLog?.id;

    try {
      // 1. Get all shipped samples with tracking numbers
      const { data: shipments, error } = await this.supabase
        .from('sample_shipments')
        .select('id, tracking_number, carrier, status, shipped_at')
        .eq('status', 'shipped')
        .not('tracking_number', 'is', null);

      if (error) throw new Error(`DB query failed: ${error.message}`);
      if (!shipments?.length) {
        await this.completeSyncLog(syncLogId, result);
        return result;
      }

      result.total_checked = shipments.length;

      // 2. Batch track (adapter handles parallelism)
      const trackingItems = shipments.map((s) => ({
        tracking_number: s.tracking_number!,
        carrier: s.carrier as any,
      }));

      const trackingResults = await this.tracker.trackBatch(trackingItems);

      // Index results by tracking number
      const resultMap = new Map<string, TrackingResult>();
      for (const tr of trackingResults) {
        resultMap.set(tr.tracking_number, tr);
      }

      // 3. Update shipments in parallel batches of 10
      const BATCH_SIZE = 10;
      const shipmentEntries = shipments
        .filter(s => resultMap.has(s.tracking_number!))
        .map(s => ({ shipment: s, tracking: resultMap.get(s.tracking_number!)! }));

      for (let i = 0; i < shipmentEntries.length; i += BATCH_SIZE) {
        const batch = shipmentEntries.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(({ shipment, tracking }) =>
            this.updateShipment(shipment, tracking)
          )
        );

        for (let j = 0; j < results.length; j++) {
          const settled = results[j];
          const { shipment, tracking } = batch[j];
          if (settled.status === 'fulfilled' && settled.value) {
            result.updated++;
            if (tracking.current_status === 'delivered')
              result.delivered++;
            if (
              [
                'failed_attempt',
                'exception',
                'returned',
              ].includes(tracking.current_status)
            )
              result.exceptions++;
          } else if (settled.status === 'rejected') {
            const reason =
              settled.reason instanceof Error
                ? settled.reason.message
                : 'Unknown error';
            result.errors.push(`${shipment.id}: ${reason}`);
          }
        }
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : String(err);
      result.errors.push(errorMsg);
    }

    await this.completeSyncLog(syncLogId, result);
    return result;
  }

  private async updateShipment(
    shipment: { id: string; status: string; tracking_number: string | null },
    tracking: TrackingResult,
  ): Promise<boolean> {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    let shouldUpdate = false;

    if (tracking.current_status === 'delivered' && shipment.status === 'shipped') {
      updates.status = 'delivered' as SampleStatus;
      const sortedCheckpoints = [...tracking.checkpoints].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      updates.delivered_at = sortedCheckpoints[0]?.timestamp || new Date().toISOString();
      shouldUpdate = true;
    }

    // Store AfterShip ID if available
    if (tracking.tracking_number) {
      updates.aftership_id = updates.aftership_id || null; // Already handled in webhook
    }

    if (shouldUpdate) {
      const { error } = await this.supabase
        .from('sample_shipments')
        .update(updates)
        .eq('id', shipment.id);

      if (error) throw new Error(`Update failed: ${error.message}`);
    }

    return shouldUpdate;
  }

  private async completeSyncLog(syncLogId: string | undefined, result: SyncResult) {
    if (!syncLogId) return;

    await this.supabase
      .from('sync_log')
      .update({
        status: result.errors.length ? 'FAILED' : 'COMPLETED',
        records_processed: result.total_checked,
        records_updated: result.updated,
        error_message: result.errors.length ? result.errors.join('; ') : null,
        completed_at: new Date().toISOString(),
        duration_ms: 0, // Would need start time tracking for accuracy
      })
      .eq('id', syncLogId);
  }
}
