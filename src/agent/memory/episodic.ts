/**
 * L2: Episodic Memory — Full conversation log (PostgreSQL)
 *
 * Stores every message exchanged in Discord channels.
 * Used for session recovery and context building.
 */

import { db } from '@/db';
import { episodicMemory } from '@/db/schema/memory';
import { eq, desc, and, ne, gte } from 'drizzle-orm';
import { createHash } from 'crypto';

/**
 * Save a message to episodic memory.
 */
export async function saveEpisodic(params: {
  conversationKey: string;
  userId: string;
  channelId: string;
  threadId?: string;
  role: 'user' | 'assistant';
  content: string;
}): Promise<void> {
  const contentHash = createHash('sha256')
    .update(params.content)
    .digest('hex')
    .slice(0, 16);

  await db.insert(episodicMemory).values({
    conversationKey: params.conversationKey,
    userId: params.userId,
    channelId: params.channelId,
    threadId: params.threadId,
    role: params.role,
    content: params.content,
    contentHash,
  });
}

/**
 * Get recent conversation history for a channel.
 */
export async function getRecentHistory(
  channelId: string,
  limit = 10,
): Promise<Array<{ role: string; content: string; createdAt: Date | null }>> {
  return db
    .select({
      role: episodicMemory.role,
      content: episodicMemory.content,
      createdAt: episodicMemory.createdAt,
    })
    .from(episodicMemory)
    .where(eq(episodicMemory.channelId, channelId))
    .orderBy(desc(episodicMemory.createdAt))
    .limit(limit);
}

/**
 * Get a user's messages across OTHER channels (cross-channel context).
 */
export async function getUserCrossChannelHistory(
  userId: string,
  excludeChannelId: string,
  limit = 10,
): Promise<Array<{ content: string; channelId: string; createdAt: Date | null }>> {
  return db
    .select({
      content: episodicMemory.content,
      channelId: episodicMemory.channelId,
      createdAt: episodicMemory.createdAt,
    })
    .from(episodicMemory)
    .where(
      and(
        eq(episodicMemory.userId, userId),
        ne(episodicMemory.channelId, excludeChannelId),
        eq(episodicMemory.role, 'user'),
      ),
    )
    .orderBy(desc(episodicMemory.createdAt))
    .limit(limit);
}

/**
 * Get recent 24-hour messages for nightly distillation.
 */
export async function getRecentForDistillation(
  hoursAgo = 24,
  limit = 500,
): Promise<Array<{ content: string; userId: string; channelId: string; role: string; createdAt: Date | null }>> {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  return db
    .select({
      content: episodicMemory.content,
      userId: episodicMemory.userId,
      channelId: episodicMemory.channelId,
      role: episodicMemory.role,
      createdAt: episodicMemory.createdAt,
    })
    .from(episodicMemory)
    .where(gte(episodicMemory.createdAt, cutoff))
    .orderBy(desc(episodicMemory.createdAt))
    .limit(limit);
}
