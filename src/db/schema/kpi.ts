import {
  pgTable, uuid, text, integer, decimal, timestamp, date, jsonb,
} from 'drizzle-orm/pg-core';
import { creators } from './creators';

export const weeklyKpis = pgTable('weekly_kpis', {
  id: uuid('id').primaryKey().defaultRandom(),
  weekStarting: date('week_starting').notNull(),
  cumulativeAffiliates: integer('cumulative_affiliates').default(0),
  weeklyNewAffiliates: integer('weekly_new_affiliates').default(0),
  churned: integer('churned').default(0),
  netIncrease: integer('net_increase').default(0),
  monthlyGmv: decimal('monthly_gmv', { precision: 12, scale: 2 }),
  openCollabNew: integer('open_collab_new').default(0),
  dmOutreachNew: integer('dm_outreach_new').default(0),
  mcnNew: integer('mcn_new').default(0),
  buyerToCreatorNew: integer('buyer_to_creator_new').default(0),
  referralNew: integer('referral_new').default(0),
  paidNew: integer('paid_new').default(0),
  discordNew: integer('discord_new').default(0),
  dmResponseRate: decimal('dm_response_rate', { precision: 5, scale: 4 }),
  samplePostRate: decimal('sample_post_rate', { precision: 5, scale: 4 }),
  sampleShipped: integer('sample_shipped').default(0),
  weeksTo30k: decimal('weeks_to_30k', { precision: 6, scale: 1 }),
  tierBreakdown: jsonb('tier_breakdown').$type<Record<string, number>>().default({}),
  gmvMaxDailyBudget: decimal('gmv_max_daily_budget', { precision: 10, scale: 2 }),
  gmvMaxTotalGmv: decimal('gmv_max_total_gmv', { precision: 12, scale: 2 }),
  gmvMaxRoas: decimal('gmv_max_roas', { precision: 6, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const weeklyChallenges = pgTable('weekly_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  prizeAmount: decimal('prize_amount', { precision: 8, scale: 2 }),
  prizeDescription: text('prize_description'),
  winnerCreatorId: uuid('winner_creator_id').references(() => creators.id),
  status: text('status', { enum: ['active', 'completed', 'cancelled'] }).default('active'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type WeeklyKpi = typeof weeklyKpis.$inferSelect;
