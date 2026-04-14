import {
  pgTable, uuid, text, integer, decimal, boolean, timestamp, unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { creators } from './creators';
import { pinkLeagueSeasons } from './league';

// ---------------------------------------------------------------------------
// collab_duos — two creators collaborate on content for a product
// ---------------------------------------------------------------------------
export const collabDuos = pgTable('collab_duos', {
  id: uuid('id').primaryKey().defaultRandom(),

  initiatorId: uuid('initiator_id').references(() => creators.id).notNull(),
  partnerId: uuid('partner_id').references(() => creators.id).notNull(),
  productTag: text('product_tag').notNull(), // e.g., "clean_it_zero"

  // Content proof
  initiatorContentUrl: text('initiator_content_url'),
  partnerContentUrl: text('partner_content_url'),

  // Status lifecycle: pending → matched → verified → expired
  status: text('status', {
    enum: ['pending', 'matched', 'verified', 'expired'],
  }).default('pending').notNull(),

  // Boost applied (0.15 base, 0.20 league, +0.05 dynamic duo)
  scoreBoostPct: decimal('score_boost_pct', { precision: 4, scale: 2 }).default('0.15'),

  // Tracking for limits
  seasonId: uuid('season_id').references(() => pinkLeagueSeasons.id),
  weekKey: text('week_key'), // YYYY-WW format for weekly limit

  // Duo streak tracking
  duoStreakCount: integer('duo_streak_count').default(1),
  isDynamicDuo: boolean('is_dynamic_duo').default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  matchedAt: timestamp('matched_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const collabDuosRelations = relations(collabDuos, ({ one }) => ({
  initiator: one(creators, {
    fields: [collabDuos.initiatorId],
    references: [creators.id],
    relationName: 'initiated_collabs',
  }),
  partner: one(creators, {
    fields: [collabDuos.partnerId],
    references: [creators.id],
    relationName: 'partner_collabs',
  }),
  season: one(pinkLeagueSeasons, {
    fields: [collabDuos.seasonId],
    references: [pinkLeagueSeasons.id],
  }),
}));

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type CollabDuo = typeof collabDuos.$inferSelect;
export type NewCollabDuo = typeof collabDuos.$inferInsert;
