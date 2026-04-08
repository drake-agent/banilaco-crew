/**
 * L3: Semantic Memory — Distilled knowledge (PostgreSQL + FTS)
 *
 * High-value facts, decisions, tips promoted from episodic memory
 * or seeded from FNCO content strategy knowledge base.
 */

import { db } from '@/db';
import { semanticMemory } from '@/db/schema/memory';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { createHash } from 'crypto';

/**
 * Search semantic memory with pool filtering.
 * Uses PostgreSQL ILIKE for keyword matching (upgrade to pg_trgm or tsvector later).
 */
export async function searchSemantic(
  query: string,
  pools: string[] = ['squad'],
  limit = 5,
): Promise<Array<typeof semanticMemory.$inferSelect>> {
  // Extract keywords (basic — can upgrade to NLP)
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5);

  if (keywords.length === 0) return [];

  // Build OR conditions for keyword matching
  const keywordConditions = keywords.map((kw) =>
    ilike(semanticMemory.content, `%${kw}%`),
  );

  const poolConditions = pools.map((p) =>
    eq(semanticMemory.poolId, p),
  );

  const results = await db
    .select()
    .from(semanticMemory)
    .where(
      and(
        eq(semanticMemory.archived, false),
        or(...poolConditions),
        or(...keywordConditions),
      ),
    )
    .orderBy(desc(semanticMemory.importance))
    .limit(limit);

  // Update access count for retrieved entries
  for (const entry of results) {
    await db
      .update(semanticMemory)
      .set({
        accessCount: (entry.accessCount ?? 0) + 1,
        lastAccessed: new Date(),
      })
      .where(eq(semanticMemory.id, entry.id));
  }

  return results;
}

/**
 * Save a new semantic memory entry (used by Distiller and save_knowledge tool).
 */
export async function saveSemantic(params: {
  content: string;
  memoryType: 'Decision' | 'Fact' | 'Observation' | 'Goal' | 'Tip' | 'Article';
  poolId?: string;
  importance?: string;
  tags?: string[];
  sourceType?: 'distillation' | 'document' | 'conversation';
  sourceId?: string;
  channelId?: string;
  userId?: string;
}): Promise<string> {
  const contentHash = createHash('sha256')
    .update(params.content)
    .digest('hex')
    .slice(0, 32);

  // Duplicate check
  const existing = await db
    .select({ id: semanticMemory.id })
    .from(semanticMemory)
    .where(eq(semanticMemory.contentHash, contentHash))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id; // Already exists
  }

  const [entry] = await db
    .insert(semanticMemory)
    .values({
      content: params.content,
      contentHash,
      memoryType: params.memoryType,
      poolId: params.poolId ?? 'squad',
      importance: params.importance ?? '0.50',
      tags: params.tags ?? [],
      sourceType: params.sourceType ?? 'conversation',
      sourceId: params.sourceId,
      channelId: params.channelId,
      userId: params.userId,
    })
    .returning();

  return entry.id;
}

/**
 * Archive old low-value memories (anti-bloat, called by Distiller).
 */
export async function archiveOldMemories(
  daysThreshold = 90,
): Promise<number> {
  const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  const result = await db
    .update(semanticMemory)
    .set({ archived: true })
    .where(
      and(
        eq(semanticMemory.archived, false),
        sql`${semanticMemory.lastAccessed} < ${cutoff} OR ${semanticMemory.lastAccessed} IS NULL`,
        sql`${semanticMemory.memoryType} != 'Decision'`, // Preserve decisions
        sql`${semanticMemory.importance}::numeric < 0.7`, // Keep high-importance
      ),
    )
    .returning({ id: semanticMemory.id });

  return result.length;
}
