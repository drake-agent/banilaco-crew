/**
 * Context Builder — 3-Route Parallel Search
 *
 * Assembles prompt context from all memory layers before
 * sending to Claude. Inspired by effy's buildContext().
 */

import { workingMemory } from './memory/working';
import { getRecentHistory, getUserCrossChannelHistory } from './memory/episodic';
import { searchSemantic } from './memory/semantic';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { entities, entityRelationships } from '@/db/schema/memory';
import { eq, and } from 'drizzle-orm';
import { TIER_CONFIG, type PinkTier } from '@/db/schema/creators';

interface ContextInput {
  content: string;
  channelId: string;
  userId: string; // Discord user ID
  threadId?: string;
}

interface AssembledContext {
  systemPrompt: string;
  conversationHistory: string;
  creatorProfile: string | null;
}

/**
 * Build full context for the agent runtime.
 * Runs 3 routes in parallel for speed.
 */
export async function buildContext(input: ContextInput): Promise<AssembledContext> {
  const convKey = `${input.channelId}:${input.threadId ?? 'main'}`;

  // --- Parallel routes ---
  const [recentHistory, semanticHits, creatorData] = await Promise.all([
    // Route 1: Recent episodic history
    getRecentHistory(input.channelId, 10),
    // Route 2: Semantic knowledge search
    searchSemantic(input.content, ['squad', 'personal'], 5),
    // Route 3: Creator profile lookup
    resolveCreator(input.userId),
  ]);

  // L1: Working memory (in-process, instant)
  const workingContext = workingMemory.getContext(convKey);

  // Assemble system prompt
  const systemPrompt = assembleSystemPrompt(semanticHits, creatorData);

  // Assemble conversation history
  const historyParts: string[] = [];

  if (workingContext) {
    historyParts.push(workingContext);
  } else if (recentHistory.length > 0) {
    // Fallback to episodic if working memory expired
    const reversed = [...recentHistory].reverse();
    for (const msg of reversed) {
      const prefix = msg.role === 'user' ? 'Creator' : 'Squad Bot';
      historyParts.push(`${prefix}: ${msg.content}`);
    }
  }

  // Creator profile string
  let creatorProfile: string | null = null;
  if (creatorData) {
    const tierConfig = TIER_CONFIG[creatorData.tier as PinkTier];
    creatorProfile = [
      `Handle: @${creatorData.tiktokHandle}`,
      `Tier: ${tierConfig.emoji} ${tierConfig.label}`,
      `Missions: ${creatorData.missionCount ?? 0}`,
      `Pink Score: ${creatorData.pinkScore ?? 0}`,
      `Monthly GMV: $${creatorData.monthlyGmv ?? 0}`,
      `Commission: ${(parseFloat(creatorData.commissionRate ?? '0') * 100).toFixed(0)}%`,
    ].join(' | ');
  }

  return {
    systemPrompt,
    conversationHistory: historyParts.join('\n'),
    creatorProfile,
  };
}

/**
 * Resolve Discord user → creator profile.
 */
async function resolveCreator(discordUserId: string) {
  const link = await db
    .select({ creatorId: discordLinks.creatorId })
    .from(discordLinks)
    .where(eq(discordLinks.discordUserId, discordUserId))
    .limit(1);

  if (!link[0]) return null;

  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, link[0].creatorId))
    .limit(1);

  return creator ?? null;
}

/**
 * Assemble the system prompt with semantic knowledge + creator context.
 */
function assembleSystemPrompt(
  semanticHits: Array<{ content: string; memoryType: string | null }>,
  creatorData: Awaited<ReturnType<typeof resolveCreator>>,
): string {
  const parts: string[] = [
    `You are the BANILACO SQUAD AI Assistant — a K-beauty creator community bot.`,
    `You help creators improve their TikTok content, complete daily missions, track PINK LEAGUE rankings, and grow their Squad.`,
    `Respond in Korean by default. Use English for technical terms.`,
    `Be encouraging, specific, and actionable. Reference data when available.`,
  ];

  // Inject creator context
  if (creatorData) {
    const tierConfig = TIER_CONFIG[creatorData.tier as PinkTier];
    parts.push(
      `\n[Creator Profile]`,
      `- Handle: @${creatorData.tiktokHandle}`,
      `- Tier: ${tierConfig.emoji} ${tierConfig.label} (${(parseFloat(creatorData.commissionRate ?? '0') * 100).toFixed(0)}% commission)`,
      `- Missions completed: ${creatorData.missionCount ?? 0}`,
      `- Pink Score: ${creatorData.pinkScore ?? 0}`,
      `- Monthly GMV: $${creatorData.monthlyGmv ?? 0}`,
    );
  }

  // Inject relevant knowledge
  if (semanticHits.length > 0) {
    parts.push(`\n[Knowledge Base — use this to answer questions]`);
    for (const hit of semanticHits) {
      parts.push(`- [${hit.memoryType}] ${hit.content}`);
    }
  }

  return parts.join('\n');
}
