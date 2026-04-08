import {
  pgTable, uuid, text, integer, timestamp,
} from 'drizzle-orm/pg-core';

export const cronSyncState = pgTable('cron_sync_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  syncType: text('sync_type').unique().notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastCursor: text('last_cursor'),
  status: text('status', { enum: ['idle', 'running', 'failed'] }).default('idle'),
  runCount: integer('run_count').default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const syncLog = pgTable('sync_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  syncType: text('sync_type').notNull(),
  recordsProcessed: integer('records_processed').default(0),
  recordsCreated: integer('records_created').default(0),
  recordsUpdated: integer('records_updated').default(0),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
