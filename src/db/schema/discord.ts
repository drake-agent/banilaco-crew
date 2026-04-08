import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { creators } from './creators';

export const discordLinks = pgTable('discord_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => creators.id).notNull(),
  discordUserId: text('discord_user_id').unique().notNull(),
  discordUsername: text('discord_username'),
  linkedAt: timestamp('linked_at', { withTimezone: true }).defaultNow(),
  isVerified: boolean('is_verified').default(false),
});

export const discordLinksRelations = relations(discordLinks, ({ one }) => ({
  creator: one(creators, {
    fields: [discordLinks.creatorId],
    references: [creators.id],
  }),
}));

export type DiscordLink = typeof discordLinks.$inferSelect;
export type NewDiscordLink = typeof discordLinks.$inferInsert;
