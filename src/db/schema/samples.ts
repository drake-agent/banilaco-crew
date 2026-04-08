import {
  pgTable, uuid, text, integer, decimal, boolean, timestamp, jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { creators } from './creators';

export const sampleShipments = pgTable('sample_shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => creators.id).notNull(),
  setType: text('set_type', { enum: ['hero', 'premium', 'mini', 'full', 'welcome'] }).notNull(),
  status: text('status', {
    enum: [
      'requested', 'approved', 'shipped', 'delivered',
      'reminder_1', 'reminder_2', 'content_posted', 'no_response',
    ],
  }).default('requested').notNull(),
  trackingNumber: text('tracking_number'),
  carrier: text('carrier'),
  aftershipId: text('aftership_id'),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  contentPostedAt: timestamp('content_posted_at', { withTimezone: true }),
  contentUrl: text('content_url'),
  contentGmv: decimal('content_gmv', { precision: 10, scale: 2 }),
  skuList: jsonb('sku_list').$type<string[]>().default([]),
  estimatedCost: decimal('estimated_cost', { precision: 8, scale: 2 }),
  shippingCost: decimal('shipping_cost', { precision: 8, scale: 2 }),
  productIds: jsonb('product_ids').$type<string[]>().default([]),
  allocationRuleId: uuid('allocation_rule_id'),
  notes: text('notes'),
  reminder1SentAt: timestamp('reminder_1_sent_at', { withTimezone: true }),
  reminder2SentAt: timestamp('reminder_2_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const sampleAllocationRules = pgTable('sample_allocation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tier: text('tier').notNull(),
  setType: text('set_type').notNull(),
  skuList: jsonb('sku_list').$type<string[]>().default([]),
  autoApprove: boolean('auto_approve').default(false),
  cooldownDays: integer('cooldown_days').default(90),
  maxPerMonth: integer('max_per_month').default(50),
  estimatedCost: decimal('estimated_cost', { precision: 8, scale: 2 }),
  estimatedShipping: decimal('estimated_shipping', { precision: 8, scale: 2 }),
  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const sampleShipmentsRelations = relations(sampleShipments, ({ one }) => ({
  creator: one(creators, {
    fields: [sampleShipments.creatorId],
    references: [creators.id],
  }),
}));

export type SampleShipment = typeof sampleShipments.$inferSelect;
export type SampleAllocationRule = typeof sampleAllocationRules.$inferSelect;
