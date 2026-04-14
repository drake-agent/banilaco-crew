import {
  pgTable, uuid, text, integer, decimal, boolean, timestamp, date, jsonb, unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { creators } from './creators';

export const pinkLeagueSeasons = pgTable('pink_league_seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonNumber: integer('season_number').unique().notNull(),
  title: text('title'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status', {
    enum: ['upcoming', 'active', 'voting', 'completed'],
  }).default('upcoming').notNull(),
  boostConfig: jsonb('boost_config').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pinkLeagueEntries = pgTable('pink_league_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').references(() => pinkLeagueSeasons.id).notNull(),
  creatorId: uuid('creator_id').references(() => creators.id).notNull(),
  pinkScore: decimal('pink_score', { precision: 10, scale: 2 }).default('0'),
  gmvScore: decimal('gmv_score', { precision: 10, scale: 2 }).default('0'),
  viralScore: decimal('viral_score', { precision: 10, scale: 2 }).default('0'),
  dailyRank: integer('daily_rank'),
  finalRank: integer('final_rank'),
  isCrownCandidate: boolean('is_crown_candidate').default(false),
  fanVoteCount: integer('fan_vote_count').default(0),
  seasonStartMultiplier: decimal('season_start_multiplier', { precision: 3, scale: 2 }).default('1.00'),
  brandReviewScore: decimal('brand_review_score', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  seasonCreator: unique('uq_season_creator').on(table.seasonId, table.creatorId),
}));

export const pinkLeagueDailySnapshots = pgTable('pink_league_daily_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').references(() => pinkLeagueSeasons.id).notNull(),
  creatorId: uuid('creator_id').references(() => creators.id).notNull(),
  snapshotDate: date('snapshot_date').notNull(),
  rank: integer('rank'),
  pinkScore: decimal('pink_score', { precision: 10, scale: 2 }),
  boostMultiplier: decimal('boost_multiplier', { precision: 3, scale: 2 }).default('1.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dailyUnique: unique('uq_daily_snapshot').on(table.seasonId, table.creatorId, table.snapshotDate),
}));

// SEC-1 FIX: Per-user vote dedup table
export const pinkLeagueVotes = pgTable('pink_league_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').references(() => pinkLeagueSeasons.id).notNull(),
  voterId: text('voter_id').notNull(), // NextAuth user ID
  creatorId: uuid('creator_id').references(() => creators.id).notNull(),
  votedAt: timestamp('voted_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  oneVotePerUser: unique('uq_season_voter').on(table.seasonId, table.voterId),
}));

export const seasonsRelations = relations(pinkLeagueSeasons, ({ many }) => ({
  entries: many(pinkLeagueEntries),
  snapshots: many(pinkLeagueDailySnapshots),
}));

export type PinkLeagueSeason = typeof pinkLeagueSeasons.$inferSelect;
export type PinkLeagueEntry = typeof pinkLeagueEntries.$inferSelect;
