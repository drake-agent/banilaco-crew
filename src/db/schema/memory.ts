import {
  pgTable, uuid, text, decimal, integer, boolean, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// L2: Episodic Memory — raw conversation log
// ---------------------------------------------------------------------------
export const episodicMemory = pgTable('episodic_memory', {
  id: uuid('id').primaryKey().defaultRandom(),

  conversationKey: text('conversation_key').notNull(), // guild:channel:thread
  userId: text('user_id').notNull(),                   // discord user id
  channelId: text('channel_id').notNull(),
  threadId: text('thread_id'),

  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  contentHash: text('content_hash'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  convKeyIdx: index('idx_episodic_conv_key').on(table.conversationKey),
  userIdx: index('idx_episodic_user').on(table.userId),
  channelIdx: index('idx_episodic_channel').on(table.channelId),
  createdIdx: index('idx_episodic_created').on(table.createdAt),
}));

// ---------------------------------------------------------------------------
// L3: Semantic Memory — distilled knowledge
// ---------------------------------------------------------------------------
export const semanticMemory = pgTable('semantic_memory', {
  id: uuid('id').primaryKey().defaultRandom(),

  content: text('content').notNull(),
  contentHash: text('content_hash').unique(),

  sourceType: text('source_type', {
    enum: ['distillation', 'document', 'conversation'],
  }),
  sourceId: text('source_id'),

  memoryType: text('memory_type', {
    enum: ['Decision', 'Fact', 'Observation', 'Goal', 'Tip', 'Article'],
  }),

  poolId: text('pool_id').default('squad'), // squad | personal | admin
  importance: decimal('importance', { precision: 3, scale: 2 }).default('0.50'),
  tags: jsonb('tags').$type<string[]>().default([]),

  channelId: text('channel_id'),
  userId: text('user_id'),

  accessCount: integer('access_count').default(0),
  lastAccessed: timestamp('last_accessed', { withTimezone: true }),
  archived: boolean('archived').default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  poolIdx: index('idx_semantic_pool').on(table.poolId),
  typeIdx: index('idx_semantic_type').on(table.memoryType),
  archivedIdx: index('idx_semantic_archived').on(table.archived),
}));

// ---------------------------------------------------------------------------
// L4: Entity Memory — knowledge graph nodes
// ---------------------------------------------------------------------------
export const entities = pgTable('entities', {
  id: uuid('id').primaryKey().defaultRandom(),

  entityType: text('entity_type', {
    enum: ['creator', 'topic', 'product', 'squad', 'mission'],
  }).notNull(),
  entityId: text('entity_id').notNull(),
  name: text('name').notNull(),

  properties: jsonb('properties').$type<Record<string, unknown>>().default({}),
  lastSeen: timestamp('last_seen', { withTimezone: true }).defaultNow(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  typeIdIdx: index('idx_entity_type_id').on(table.entityType, table.entityId),
}));

// ---------------------------------------------------------------------------
// L4: Entity Relationships — knowledge graph edges
// ---------------------------------------------------------------------------
export const entityRelationships = pgTable('entity_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),

  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),

  relation: text('relation', {
    enum: [
      'expert_in',       // creator → topic
      'uses_product',    // creator → product
      'member_of',       // creator → squad
      'leads',           // creator → squad
      'mentors',         // creator → creator
      'competes_with',   // creator → creator
      'related_to',      // topic → topic
    ],
  }).notNull(),

  weight: decimal('weight', { precision: 3, scale: 2 }).default('0.50'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  sourceIdx: index('idx_rel_source').on(table.sourceType, table.sourceId),
  targetIdx: index('idx_rel_target').on(table.targetType, table.targetId),
}));

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type EpisodicEntry = typeof episodicMemory.$inferSelect;
export type NewEpisodicEntry = typeof episodicMemory.$inferInsert;
export type SemanticEntry = typeof semanticMemory.$inferSelect;
export type NewSemanticEntry = typeof semanticMemory.$inferInsert;
export type Entity = typeof entities.$inferSelect;
export type EntityRelationship = typeof entityRelationships.$inferSelect;
