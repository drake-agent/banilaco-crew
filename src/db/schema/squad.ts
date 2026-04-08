import {
  pgTable, uuid, text, decimal, timestamp, unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { creators } from './creators';

export const squadBonusLog = pgTable('squad_bonus_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  leaderId: uuid('leader_id').references(() => creators.id).notNull(),
  memberId: uuid('member_id').references(() => creators.id).notNull(),
  period: text('period').notNull(), // YYYY-MM
  memberGmv: decimal('member_gmv', { precision: 12, scale: 2 }).default('0'),
  bonusRate: decimal('bonus_rate', { precision: 5, scale: 4 }).notNull(),
  bonusAmount: decimal('bonus_amount', { precision: 10, scale: 2 }).default('0'),
  status: text('status', {
    enum: ['pending', 'processing', 'paid'],
  }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  periodUnique: unique('uq_squad_bonus_period').on(table.leaderId, table.memberId, table.period),
}));

export const squadBonusRelations = relations(squadBonusLog, ({ one }) => ({
  leader: one(creators, {
    fields: [squadBonusLog.leaderId],
    references: [creators.id],
    relationName: 'leaderBonuses',
  }),
  member: one(creators, {
    fields: [squadBonusLog.memberId],
    references: [creators.id],
    relationName: 'memberContributions',
  }),
}));

export type SquadBonusEntry = typeof squadBonusLog.$inferSelect;
