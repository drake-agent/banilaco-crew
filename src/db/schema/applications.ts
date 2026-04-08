import {
  pgTable, uuid, text, integer, timestamp, jsonb,
} from 'drizzle-orm/pg-core';

export const joinApplications = pgTable('join_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tiktokHandle: text('tiktok_handle').notNull(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  instagramHandle: text('instagram_handle'),
  followerCount: text('follower_count'), // range string
  contentCategories: jsonb('content_categories').$type<string[]>().default([]),
  whyJoin: text('why_join'),
  brandExperience: jsonb('brand_experience').$type<string[]>().default([]),
  squadCode: text('squad_code'), // referral/squad code
  status: text('status', {
    enum: ['pending', 'approved', 'rejected'],
  }).default('pending'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type JoinApplication = typeof joinApplications.$inferSelect;
