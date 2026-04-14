/**
 * Context Builder — 3-Route Parallel Search
 *
 * Assembles prompt context from all memory layers before
 * sending to Claude. Inspired by effy's buildContext().
 */

import { workingMemory } from './memory/working';
import { getRecentHistory, getUserCrossChannelHistory } from './memory/episodic';
import { searchSemantic } from './memory/semantic';
import { getCreatorGraph } from './memory/entity';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { discordLinks } from '@/db/schema/discord';
import { eq } from 'drizzle-orm';
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

  // Resolve creator ID first (single discord_links lookup, reused by all routes)
  const creatorId = await resolveCreatorId(input.userId);

  // --- 4-Route Parallel Search ---
  const [recentHistory, semanticHits, creatorData, entityGraph] = await Promise.all([
    // Route 1: Recent episodic history (L2)
    getRecentHistory(input.channelId, 10),
    // Route 2: Semantic knowledge search (L3) — personal pool filtered by creatorId
    searchSemantic(input.content, ['squad', 'personal'], 5, creatorId ?? undefined),
    // Route 3: Creator profile lookup (identity) — uses cached creatorId
    creatorId ? fetchCreatorById(creatorId) : Promise.resolve(null),
    // Route 4: Entity graph (L4) — creator relationships & expertise
    creatorId ? getCreatorGraph(creatorId) : Promise.resolve(null),
  ]);

  // L1: Working memory (in-process, instant)
  const workingContext = workingMemory.getContext(convKey);

  // Assemble system prompt
  const systemPrompt = assembleSystemPrompt(semanticHits, creatorData, entityGraph);

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
 * Resolve Discord user → creator ID (fast lookup, cached per request).
 */
async function resolveCreatorId(discordUserId: string): Promise<string | null> {
  const link = await db
    .select({ creatorId: discordLinks.creatorId })
    .from(discordLinks)
    .where(eq(discordLinks.discordUserId, discordUserId))
    .limit(1);

  return link[0]?.creatorId ?? null;
}

/**
 * Fetch creator by ID (avoids redundant discord_links lookup).
 */
async function fetchCreatorById(creatorId: string) {
  const [creator] = await db
    .select()
    .from(creators)
    .where(eq(creators.id, creatorId))
    .limit(1);

  return creator ?? null;
}


/**
 * Assemble the system prompt with semantic knowledge + creator context + entity graph.
 */
function assembleSystemPrompt(
  semanticHits: Array<{ content: string; memoryType: string | null }>,
  creatorData: Awaited<ReturnType<typeof fetchCreatorById>> | null,
  entityGraph: Awaited<ReturnType<typeof getCreatorGraph>> | null,
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
      `- Streak: ${creatorData.currentStreak ?? 0} days (longest: ${creatorData.longestStreak ?? 0})`,
    );
  }

  // Inject entity graph (L4 — relationships, expertise, activity snapshot)
  if (entityGraph) {
    // Entity properties = aggregated content/sample/performance data
    const props = entityGraph.entity?.properties as Record<string, unknown> | undefined;
    if (props) {
      parts.push(`\n[Creator Activity Snapshot — from synced data]`);

      if (props.contentCount30d != null) {
        parts.push(`- Content (30d): ${props.contentCount30d} videos, avg ${props.avgViews30d ?? 0} views, ${((props.avgEngagement30d as number) * 100).toFixed(1)}% engagement`);
      }
      if (props.bestVideoViews && (props.bestVideoViews as number) > 0) {
        parts.push(`- Best video: ${(props.bestVideoViews as number).toLocaleString()} views${props.bestVideoUrl ? ` (${props.bestVideoUrl})` : ''}`);
      }
      if ((props.topFormats as string[])?.length > 0) {
        parts.push(`- Preferred formats: ${(props.topFormats as string[]).join(', ')}`);
      }
      if ((props.topHooks as string[])?.length > 0) {
        parts.push(`- Effective hooks: ${(props.topHooks as string[]).join(', ')}`);
      }
      if (props.totalSamplesReceived != null) {
        parts.push(`- Samples: ${props.totalSamplesReceived} received, ${(((props.sampleResponseRate as number) ?? 0) * 100).toFixed(0)}% posted content`);
        if (props.avgDaysToContent) {
          parts.push(`- Avg time to content after sample: ${props.avgDaysToContent} days`);
        }
      }
      if (props.pendingSamples && (props.pendingSamples as number) > 0) {
        parts.push(`- ⚠️ ${props.pendingSamples} sample(s) pending delivery`);
      }
      if (props.gmvTrend) {
        parts.push(`- GMV trend: ${props.gmvTrend} | Mission momentum: ${props.missionMomentum ?? 'unknown'}`);
      }
    }

    // Relationship graph
    if (entityGraph.relationships.length > 0) {
      parts.push(`\n[Creator Knowledge Graph]`);

      const expertise = entityGraph.relationships.filter((r) => r.relation === 'expert_in');
      if (expertise.length > 0) {
        parts.push(`- Expertise: ${expertise.map((r) => r.targetName).join(', ')}`);
      }

      const products = entityGraph.relationships.filter((r) => r.relation === 'uses_product');
      if (products.length > 0) {
        parts.push(`- Products: ${products.map((r) => r.targetName).join(', ')}`);
      }

      const squad = entityGraph.relationships.filter((r) => r.relation === 'leads' || r.relation === 'member_of');
      if (squad.length > 0) {
        for (const rel of squad) {
          const verb = rel.relation === 'leads' ? 'Leads' : 'Member of';
          parts.push(`- Squad: ${verb} ${rel.targetName}`);
        }
      }

      const mentors = entityGraph.relationships.filter((r) => r.relation === 'mentors');
      if (mentors.length > 0) {
        parts.push(`- Mentoring: ${mentors.map((r) => r.targetName).join(', ')}`);
      }
    }
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
