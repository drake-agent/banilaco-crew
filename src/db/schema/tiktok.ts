import {
  pgTable, uuid, text, decimal, boolean, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';
import { creators } from './creators';

export const tiktokCredentials = pgTable('tiktok_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  shopId: text('shop_id').unique().notNull(),
  shopName: text('shop_name'),
  shopCipher: text('shop_cipher'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(),
  shopId: text('shop_id'),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}),
  processingStatus: text('processing_status', {
    enum: ['pending', 'processed', 'failed'],
  }).default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const orderTracking = pgTable('order_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  shopOrderId: text('shop_order_id').unique().notNull(),
  creatorId: uuid('creator_id').references(() => creators.id),
  orderStatus: text('order_status'),
  gmvAmount: decimal('gmv_amount', { precision: 10, scale: 2 }),
  orderedAt: timestamp('ordered_at', { withTimezone: true }),
  settledAt: timestamp('settled_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type TiktokCredential = typeof tiktokCredentials.$inferSelect;
export type OrderTrack = typeof orderTracking.$inferSelect;
