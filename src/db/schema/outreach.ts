import {
  pgTable, uuid, text, decimal, integer, timestamp, jsonb,
} from 'drizzle-orm/pg-core';
import { creators } from './creators';

export const outreachPipeline = pgTable('outreach_pipeline', {
  id: uuid('id').primaryKey().defaultRandom(),
  tiktokHandle: text('tiktok_handle').notNull(),
  displayName: text('display_name'),
  email: text('email'),
  instagramHandle: text('instagram_handle'),
  followerCount: integer('follower_count'),
  engagementRate: decimal('engagement_rate', { precision: 5, scale: 4 }),
  outreachTier: text('outreach_tier', { enum: ['tier_a', 'tier_b'] }),
  status: text('status', {
    enum: ['identified', 'dm_sent', 'responded', 'sample_requested', 'converted', 'declined', 'no_response'],
  }).default('identified'),
  channel: text('channel', { enum: ['tiktok_dm', 'instagram_dm', 'email', 'mcn_referral'] }),
  sourceBrand: text('source_brand'),
  dmSentAt: timestamp('dm_sent_at', { withTimezone: true }),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  creatorId: uuid('creator_id').references(() => creators.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const mcnPartners = pgTable('mcn_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  monthlyRetainer: decimal('monthly_retainer', { precision: 10, scale: 2 }),
  commissionShare: decimal('commission_share', { precision: 5, scale: 4 }),
  totalCreatorsMatched: integer('total_creators_matched').default(0),
  activeCreators: integer('active_creators').default(0),
  totalGmv: decimal('total_gmv', { precision: 12, scale: 2 }).default('0'),
  weeklyTarget: integer('weekly_target'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type OutreachEntry = typeof outreachPipeline.$inferSelect;
export type McnPartner = typeof mcnPartners.$inferSelect;
