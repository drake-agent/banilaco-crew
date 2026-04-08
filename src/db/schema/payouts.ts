import {
  pgTable, uuid, text, decimal, timestamp, date,
} from 'drizzle-orm/pg-core';
import { creators } from './creators';

export const creatorPayouts = pgTable('creator_payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => creators.id).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  totalGmv: decimal('total_gmv', { precision: 12, scale: 2 }).default('0'),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 4 }),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }).default('0'),
  flatFeeAmount: decimal('flat_fee_amount', { precision: 10, scale: 2 }).default('0'),
  squadBonusAmount: decimal('squad_bonus_amount', { precision: 10, scale: 2 }).default('0'),
  leagueBonusAmount: decimal('league_bonus_amount', { precision: 10, scale: 2 }).default('0'),
  bonusAmount: decimal('bonus_amount', { precision: 10, scale: 2 }).default('0'),
  totalPayout: decimal('total_payout', { precision: 10, scale: 2 }).default('0'),
  status: text('status', {
    enum: ['pending', 'processing', 'paid'],
  }).default('pending'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  paymentMethod: text('payment_method', { enum: ['paypal', 'bank_transfer'] }),
  paymentReference: text('payment_reference'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type CreatorPayout = typeof creatorPayouts.$inferSelect;
