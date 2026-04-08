import {
  pgTable, uuid, text, integer, decimal, boolean, timestamp, jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { creators } from './creators';

export const contentTracking = pgTable('content_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => creators.id).notNull(),
  videoId: text('video_id'),
  videoUrl: text('video_url'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow(),
  views: integer('views').default(0),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  shares: integer('shares').default(0),
  gmvAttributed: decimal('gmv_attributed', { precision: 10, scale: 2 }).default('0'),
  ctr: decimal('ctr', { precision: 5, scale: 4 }),
  cvr: decimal('cvr', { precision: 5, scale: 4 }),
  contentType: text('content_type'),
  hookType: text('hook_type'),
  skuFeatured: jsonb('sku_featured').$type<string[]>().default([]),
  isSparkAd: boolean('is_spark_ad').default(false),
  sparkAdCode: text('spark_ad_code'),
  shipmentId: uuid('shipment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const contentRelations = relations(contentTracking, ({ one }) => ({
  creator: one(creators, {
    fields: [contentTracking.creatorId],
    references: [creators.id],
  }),
}));

export type ContentTrack = typeof contentTracking.$inferSelect;
