import {
  pgTable, uuid, text, integer, decimal, boolean, timestamp, date, jsonb, unique,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { creators } from './creators';

// ---------------------------------------------------------------------------
// missions — template definitions
// ---------------------------------------------------------------------------
export const missions = pgTable('missions', {
  id: uuid('id').primaryKey().defaultRandom(),

  missionType: text('mission_type', {
    enum: ['learning', 'creation', 'viral'],
  }).notNull(),

  title: text('title').notNull(),
  description: text('description'),

  // Rewards
  rewardType: text('reward_type', {
    enum: ['coin', 'score', 'both'],
  }).default('both').notNull(),
  rewardAmount: decimal('reward_amount', { precision: 8, scale: 2 }).default('0'),
  scoreAmount: integer('score_amount').default(0),

  // Gating
  requiredTier: text('required_tier'),
  recurrence: text('recurrence', {
    enum: ['daily', 'weekly', 'one_time', 'event'],
  }).default('daily').notNull(),

  // Config
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  durationMinutes: integer('duration_minutes'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// mission_completions — creator activity log
// ---------------------------------------------------------------------------
export const missionCompletions = pgTable('mission_completions', {
  id: uuid('id').primaryKey().defaultRandom(),

  creatorId: uuid('creator_id').references(() => creators.id).notNull(),
  missionId: uuid('mission_id').references(() => missions.id).notNull(),

  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow(),

  rewardEarned: decimal('reward_earned', { precision: 8, scale: 2 }),
  scoreEarned: integer('score_earned'),

  // Proof & Verification
  proofUrl: text('proof_url'),
  proofVerified: boolean('proof_verified').default(false),
  verificationMethod: text('verification_method', {
    enum: ['auto', 'manual', 'ai'],
  }),

  // Mystery mission tracking
  mysteryMultiplier: decimal('mystery_multiplier', { precision: 3, scale: 1 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // One completion per day per mission per creator
  dailyUnique: unique('uq_daily_completion').on(
    table.creatorId,
    table.missionId,
    // Note: Drizzle doesn't natively support expression-based unique.
    // This will be enforced via application logic + DB function index.
  ),
}));

// ---------------------------------------------------------------------------
// daily_mission_schedule — which missions run each day
// ---------------------------------------------------------------------------
export const dailyMissionSchedule = pgTable('daily_mission_schedule', {
  id: uuid('id').primaryKey().defaultRandom(),

  missionId: uuid('mission_id').references(() => missions.id).notNull(),
  activeDate: date('active_date').notNull(),
  slotOrder: integer('slot_order'),
  isMystery: boolean('is_mystery').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dateUnique: unique('uq_mission_date').on(table.missionId, table.activeDate),
}));

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const missionsRelations = relations(missions, ({ many }) => ({
  completions: many(missionCompletions),
  schedules: many(dailyMissionSchedule),
}));

export const missionCompletionsRelations = relations(missionCompletions, ({ one }) => ({
  creator: one(creators, {
    fields: [missionCompletions.creatorId],
    references: [creators.id],
  }),
  mission: one(missions, {
    fields: [missionCompletions.missionId],
    references: [missions.id],
  }),
}));

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type Mission = typeof missions.$inferSelect;
export type NewMission = typeof missions.$inferInsert;
export type MissionCompletion = typeof missionCompletions.$inferSelect;
export type NewMissionCompletion = typeof missionCompletions.$inferInsert;
