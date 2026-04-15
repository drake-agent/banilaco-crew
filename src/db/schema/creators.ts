import {
  pgTable, uuid, text, integer, decimal, boolean, timestamp, jsonb, unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Pink Squad Tier System
// ---------------------------------------------------------------------------
export const TIERS = ['pink_petal', 'pink_rose', 'pink_diamond', 'pink_crown'] as const;
export type PinkTier = (typeof TIERS)[number];

export const TIER_CONFIG = {
  pink_petal:   { commission: 0.10, squadBonus: 0,    label: 'Pink Petal',    emoji: '🌸' },
  pink_rose:    { commission: 0.12, squadBonus: 0.02, label: 'Pink Rose',     emoji: '🌹' },
  pink_diamond: { commission: 0.15, squadBonus: 0.03, label: 'Pink Diamond',  emoji: '💎' },
  pink_crown:   { commission: 0.18, squadBonus: 0.05, label: 'Pink Crown',    emoji: '👑' },
} as const;

// ---------------------------------------------------------------------------
// creators
// ---------------------------------------------------------------------------
export const creators = pgTable('creators', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identity
  tiktokHandle: text('tiktok_handle').notNull(),
  tiktokId: text('tiktok_id'),
  tiktokUserId: text('tiktok_user_id'),
  displayName: text('display_name'),
  email: text('email'),
  instagramHandle: text('instagram_handle'),

  // Tier & Commission (Pink Squad 2.0)
  tier: text('tier', { enum: TIERS }).default('pink_petal').notNull(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 4 }).default('0.1000'),
  tierUpdatedAt: timestamp('tier_updated_at', { withTimezone: true }),

  // Mission System
  missionCount: integer('mission_count').default(0).notNull(),
  pinkScore: decimal('pink_score', { precision: 10, scale: 2 }).default('0'),
  aiProfileCompleted: boolean('ai_profile_completed').default(false),
  flatFeeEarned: decimal('flat_fee_earned', { precision: 10, scale: 2 }).default('0'),

  // Streak System
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastMissionDate: text('last_mission_date'), // YYYY-MM-DD for easy comparison

  // Onboarding
  onboardingStep: integer('onboarding_step').default(0).notNull(), // 0-5 checklist progress
  squadCode: text('squad_code'), // personal squad invite code (e.g. "MIASQUAD")

  // Squad System
  squadLeaderId: uuid('squad_leader_id'), // self-referencing FK handled via relations
  squadBonusRate: decimal('squad_bonus_rate', { precision: 5, scale: 4 }).default('0'),

  // Performance Metrics
  followerCount: integer('follower_count'),
  avgViews: integer('avg_views'),
  engagementRate: decimal('engagement_rate', { precision: 5, scale: 4 }),
  totalGmv: decimal('total_gmv', { precision: 12, scale: 2 }).default('0'),
  monthlyGmv: decimal('monthly_gmv', { precision: 12, scale: 2 }).default('0'),
  totalContentCount: integer('total_content_count').default(0),
  monthlyContentCount: integer('monthly_content_count').default(0),

  // Status & Source
  status: text('status', {
    enum: ['pending', 'active', 'inactive', 'churned'],
  }).default('pending').notNull(),
  source: text('source', {
    enum: ['open_collab', 'dm_outreach', 'mcn', 'buyer_to_creator', 'referral', 'paid', 'discord'],
  }),
  mcnName: text('mcn_name'),

  // Metadata
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default([]),
  competitorBrands: jsonb('competitor_brands').$type<string[]>().default([]),

  // Timestamps
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  lastContentAt: timestamp('last_content_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tiktokHandleUnique: unique('uq_creators_tiktok_handle').on(table.tiktokHandle),
  squadCodeUnique: unique('uq_creators_squad_code').on(table.squadCode),
}));

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const creatorsRelations = relations(creators, ({ one, many }) => ({
  squadLeader: one(creators, {
    fields: [creators.squadLeaderId],
    references: [creators.id],
    relationName: 'squad',
  }),
  squadMembers: many(creators, { relationName: 'squad' }),
}));

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type Creator = typeof creators.$inferSelect;
export type NewCreator = typeof creators.$inferInsert;
