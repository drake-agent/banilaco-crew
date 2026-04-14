/**
 * Creator Memory Sync — Periodic entity memory enrichment
 *
 * Aggregates per-creator data from content_tracking, sample_shipments,
 * creators table, and order_tracking into the L4 entity memory.
 *
 * This runs:
 * - After content_crawl sync (new videos detected)
 * - After shop_orders sync (new GMV data)
 * - After shipping_track sync (sample delivery updates)
 * - Nightly alongside the Distiller (full refresh)
 *
 * The resulting entity properties are injected into the Discord agent's
 * system prompt via context.ts → getCreatorGraph().
 */

import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { contentTracking } from '@/db/schema/content';
import { sampleShipments } from '@/db/schema/samples';
import { eq, desc, gte, sql, and } from 'drizzle-orm';
import { upsertEntity, upsertRelationship } from './entity';

// ---------------------------------------------------------------------------
// Per-creator entity sync
// ---------------------------------------------------------------------------

interface CreatorSnapshot {
  // Content metrics (last 30 days)
  contentCount30d: number;
  totalViews30d: number;
  avgViews30d: number;
  avgEngagement30d: number; // (likes+comments+shares) / views
  topFormats: string[];     // Most used content types
  topHooks: string[];       // Most used hook types
  bestVideoViews: number;
  bestVideoUrl: string | null;
  latestVideoAt: string | null;

  // Sample/shipping metrics
  totalSamplesReceived: number;
  pendingSamples: number;
  avgDaysToContent: number | null; // delivered → content_posted
  sampleResponseRate: number;      // % of delivered samples that got content

  // Product affinity
  productsUsed: string[];  // SKUs featured in content

  // Performance trajectory
  gmvTrend: 'rising' | 'stable' | 'declining' | 'new';
  missionMomentum: 'accelerating' | 'steady' | 'slowing' | 'inactive';
}

/**
 * Build a full snapshot of a creator's activity and sync to entity memory.
 */
export async function syncCreatorEntity(creatorId: string): Promise<void> {
  // Fetch creator base data
  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, creatorId))
    .limit(1);

  if (!creator) return;

  // Parallel data fetch
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [recentContent, allSamples] = await Promise.all([
    // Content from last 30 days
    db
      .select()
      .from(contentTracking)
      .where(
        and(
          eq(contentTracking.creatorId, creatorId),
          gte(contentTracking.postedAt, thirtyDaysAgo),
        ),
      )
      .orderBy(desc(contentTracking.postedAt))
      .limit(100),

    // All sample shipments
    db
      .select()
      .from(sampleShipments)
      .where(eq(sampleShipments.creatorId, creatorId))
      .orderBy(desc(sampleShipments.createdAt))
      .limit(50),
  ]);

  // --- Compute content metrics ---
  const contentCount30d = recentContent.length;
  const totalViews30d = recentContent.reduce((s, c) => s + (c.views ?? 0), 0);
  const avgViews30d = contentCount30d > 0 ? Math.round(totalViews30d / contentCount30d) : 0;

  const totalEngagement = recentContent.reduce(
    (s, c) => s + (c.likes ?? 0) + (c.comments ?? 0) + (c.shares ?? 0),
    0,
  );
  const avgEngagement30d = totalViews30d > 0
    ? parseFloat((totalEngagement / totalViews30d).toFixed(4))
    : 0;

  // Top content formats
  const formatCounts: Record<string, number> = {};
  const hookCounts: Record<string, number> = {};
  const productCounts: Record<string, number> = {};

  for (const c of recentContent) {
    if (c.contentType) {
      formatCounts[c.contentType] = (formatCounts[c.contentType] ?? 0) + 1;
    }
    if (c.hookType) {
      hookCounts[c.hookType] = (hookCounts[c.hookType] ?? 0) + 1;
    }
    for (const sku of (c.skuFeatured ?? [])) {
      productCounts[sku] = (productCounts[sku] ?? 0) + 1;
    }
  }

  const topFormats = Object.entries(formatCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k);

  const topHooks = Object.entries(hookCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => k);

  const productsUsed = Object.entries(productCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([k]) => k);

  // Best performing video
  const bestVideo = recentContent.reduce(
    (best, c) => ((c.views ?? 0) > (best?.views ?? 0) ? c : best),
    recentContent[0] ?? null,
  );

  // --- Compute sample metrics ---
  const deliveredSamples = allSamples.filter((s) =>
    ['delivered', 'reminder_1', 'reminder_2', 'content_posted', 'no_response'].includes(s.status),
  );
  const contentPostedSamples = allSamples.filter((s) => s.status === 'content_posted');
  const pendingSamples = allSamples.filter((s) =>
    ['requested', 'approved', 'shipped'].includes(s.status),
  );

  const sampleResponseRate = deliveredSamples.length > 0
    ? parseFloat((contentPostedSamples.length / deliveredSamples.length).toFixed(2))
    : 0;

  // Average days from delivery to content posting
  let avgDaysToContent: number | null = null;
  const daysToContentList: number[] = [];
  for (const s of contentPostedSamples) {
    if (s.deliveredAt && s.contentPostedAt) {
      const days = (s.contentPostedAt.getTime() - s.deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 90) daysToContentList.push(days);
    }
  }
  if (daysToContentList.length > 0) {
    avgDaysToContent = parseFloat(
      (daysToContentList.reduce((s, d) => s + d, 0) / daysToContentList.length).toFixed(1),
    );
  }

  // --- Compute trajectory ---
  const monthlyGmv = parseFloat(creator.monthlyGmv ?? '0');
  const totalGmv = parseFloat(creator.totalGmv ?? '0');
  const gmvTrend: CreatorSnapshot['gmvTrend'] =
    totalGmv === 0 ? 'new'
      : monthlyGmv > totalGmv * 0.15 ? 'rising'
        : monthlyGmv > totalGmv * 0.05 ? 'stable'
          : 'declining';

  const missionCount = creator.missionCount ?? 0;
  const currentStreak = creator.currentStreak ?? 0;
  const missionMomentum: CreatorSnapshot['missionMomentum'] =
    currentStreak >= 7 ? 'accelerating'
      : currentStreak >= 3 ? 'steady'
        : missionCount > 0 ? 'slowing'
          : 'inactive';

  const latestVideoAt = recentContent[0]?.postedAt?.toISOString() ?? null;

  // --- Build snapshot ---
  const snapshot: CreatorSnapshot = {
    contentCount30d,
    totalViews30d,
    avgViews30d,
    avgEngagement30d,
    topFormats,
    topHooks,
    bestVideoViews: bestVideo?.views ?? 0,
    bestVideoUrl: bestVideo?.videoUrl ?? null,
    latestVideoAt,
    totalSamplesReceived: deliveredSamples.length,
    pendingSamples: pendingSamples.length,
    avgDaysToContent,
    sampleResponseRate,
    productsUsed,
    gmvTrend,
    missionMomentum,
  };

  // --- Upsert to entity memory ---
  await upsertEntity({
    entityType: 'creator',
    entityId: creatorId,
    name: creator.displayName ?? `@${creator.tiktokHandle}`,
    properties: {
      tiktokHandle: creator.tiktokHandle,
      tier: creator.tier,
      followerCount: creator.followerCount,
      ...snapshot,
      lastSyncedAt: new Date().toISOString(),
    },
  });

  // --- Product entity relationships ---
  for (const sku of productsUsed) {
    await upsertEntity({
      entityType: 'product',
      entityId: sku.toLowerCase(),
      name: sku,
      properties: { category: 'banilaco' },
    });

    await upsertRelationship({
      sourceType: 'creator',
      sourceId: creatorId,
      targetType: 'product',
      targetId: sku.toLowerCase(),
      relation: 'uses_product',
      weight: Math.min(1, (productCounts[sku] ?? 1) * 0.2).toFixed(2),
      metadata: { videoCount: productCounts[sku] ?? 0 },
    });
  }

  // --- Content format expertise ---
  for (const format of topFormats) {
    await upsertEntity({
      entityType: 'topic',
      entityId: `format_${format.toLowerCase().replace(/\s+/g, '_')}`,
      name: format,
      properties: { category: 'content_format' },
    });

    await upsertRelationship({
      sourceType: 'creator',
      sourceId: creatorId,
      targetType: 'topic',
      targetId: `format_${format.toLowerCase().replace(/\s+/g, '_')}`,
      relation: 'expert_in',
      weight: Math.min(1, (formatCounts[format] ?? 1) * 0.15).toFixed(2),
      metadata: { videoCount: formatCounts[format] ?? 0 },
    });
  }
}

// ---------------------------------------------------------------------------
// Batch sync (called nightly or after major sync jobs)
// ---------------------------------------------------------------------------

/**
 * Sync entity memory for all active creators.
 * Returns count of creators synced.
 */
export async function syncAllCreatorEntities(): Promise<{
  synced: number;
  errors: string[];
}> {
  const result = { synced: 0, errors: [] as string[] };

  const activeCreators = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.status, 'active'))
    .limit(500);

  for (const creator of activeCreators) {
    try {
      await syncCreatorEntity(creator.id);
      result.synced++;
    } catch (err) {
      result.errors.push(
        `Creator ${creator.id}: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Content-specific entity updates (called after content_crawl sync)
// ---------------------------------------------------------------------------

/**
 * When a new video is detected by content_crawl, create/update
 * per-creator memory with the latest content data.
 */
export async function onNewContentDetected(params: {
  creatorId: string;
  videoId: string;
  videoUrl: string;
  contentType: string | null;
  hookType: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  skuFeatured: string[];
}): Promise<void> {
  // Quick entity update with latest video info
  const [creator] = await db
    .select({ id: creators.id, tiktokHandle: creators.tiktokHandle, displayName: creators.displayName })
    .from(creators)
    .where(eq(creators.id, params.creatorId))
    .limit(1);

  if (!creator) return;

  // Create personal semantic memory for notable videos
  const isHighPerforming = params.views > 10000 || params.likes > 1000;
  if (isHighPerforming) {
    const { saveSemantic } = await import('./semantic');
    await saveSemantic({
      content: `@${creator.tiktokHandle}의 ${params.contentType ?? 'video'} 영상이 ${params.views.toLocaleString()}회 조회. ` +
        `${params.hookType ? `Hook: ${params.hookType}. ` : ''}` +
        `제품: ${params.skuFeatured.join(', ') || 'N/A'}`,
      memoryType: 'Observation',
      poolId: 'personal',
      importance: params.views > 100000 ? '0.90' : params.views > 50000 ? '0.80' : '0.70',
      tags: ['content', 'performance', params.contentType ?? 'video'].filter(Boolean),
      sourceType: 'conversation',
      userId: params.creatorId,
    });
  }

  // Update product relationships for featured SKUs
  for (const sku of params.skuFeatured) {
    await upsertEntity({
      entityType: 'product',
      entityId: sku.toLowerCase(),
      name: sku,
    });

    await upsertRelationship({
      sourceType: 'creator',
      sourceId: params.creatorId,
      targetType: 'product',
      targetId: sku.toLowerCase(),
      relation: 'uses_product',
      weight: '0.60',
      metadata: {
        latestVideoId: params.videoId,
        latestViews: params.views,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Sample delivery entity update
// ---------------------------------------------------------------------------

/**
 * When a sample is delivered, update creator entity with delivery info.
 * Creates a personal semantic memory so the bot can reference it.
 */
export async function onSampleDelivered(params: {
  creatorId: string;
  shipmentId: string;
  setType: string;
  skuList: string[];
}): Promise<void> {
  const [creator] = await db
    .select({ tiktokHandle: creators.tiktokHandle })
    .from(creators)
    .where(eq(creators.id, params.creatorId))
    .limit(1);

  if (!creator) return;

  // Create personal memory about the delivery
  const { saveSemantic } = await import('./semantic');
  await saveSemantic({
    content: `@${creator.tiktokHandle}에게 ${params.setType} 샘플 세트 배송 완료. 제품: ${params.skuList.join(', ')}`,
    memoryType: 'Fact',
    poolId: 'personal',
    importance: '0.75',
    tags: ['sample', 'delivery', params.setType],
    sourceType: 'document',
    userId: params.creatorId,
  });

  // Update product relationships
  for (const sku of params.skuList) {
    await upsertEntity({
      entityType: 'product',
      entityId: sku.toLowerCase(),
      name: sku,
    });

    await upsertRelationship({
      sourceType: 'creator',
      sourceId: params.creatorId,
      targetType: 'product',
      targetId: sku.toLowerCase(),
      relation: 'uses_product',
      weight: '0.40', // Lower weight since just received, not yet used
      metadata: {
        source: 'sample_delivery',
        shipmentId: params.shipmentId,
      },
    });
  }
}
