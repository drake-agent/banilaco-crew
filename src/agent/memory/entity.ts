/**
 * L4: Entity Memory — Knowledge graph (PostgreSQL)
 *
 * Tracks creators, products, topics, squads and their relationships.
 * Populated during onboarding, mission completion, and nightly distillation.
 *
 * Entities = nodes (creator, topic, product, squad, mission)
 * Relationships = edges (expert_in, uses_product, member_of, leads, mentors, etc.)
 */

import { db } from '@/db';
import { entities, entityRelationships } from '@/db/schema/memory';
import { eq, and, or, desc } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Entity CRUD
// ---------------------------------------------------------------------------

/**
 * Upsert an entity — create if new, update lastSeen + properties if exists.
 */
export async function upsertEntity(params: {
  entityType: 'creator' | 'topic' | 'product' | 'squad' | 'mission';
  entityId: string;
  name: string;
  properties?: Record<string, unknown>;
}): Promise<string> {
  // Check existing
  const [existing] = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      and(
        eq(entities.entityType, params.entityType),
        eq(entities.entityId, params.entityId),
      ),
    )
    .limit(1);

  if (existing) {
    // Update lastSeen + merge properties
    await db
      .update(entities)
      .set({
        name: params.name,
        lastSeen: new Date(),
        ...(params.properties
          ? { properties: params.properties }
          : {}),
      })
      .where(eq(entities.id, existing.id));
    return existing.id;
  }

  // Create new
  const [entry] = await db
    .insert(entities)
    .values({
      entityType: params.entityType,
      entityId: params.entityId,
      name: params.name,
      properties: params.properties ?? {},
    })
    .returning();

  return entry.id;
}

/**
 * Upsert a relationship between two entities.
 * If already exists, updates weight and metadata.
 */
export async function upsertRelationship(params: {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relation:
    | 'expert_in'
    | 'uses_product'
    | 'member_of'
    | 'leads'
    | 'mentors'
    | 'competes_with'
    | 'related_to';
  weight?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const [existing] = await db
    .select({ id: entityRelationships.id })
    .from(entityRelationships)
    .where(
      and(
        eq(entityRelationships.sourceType, params.sourceType),
        eq(entityRelationships.sourceId, params.sourceId),
        eq(entityRelationships.targetType, params.targetType),
        eq(entityRelationships.targetId, params.targetId),
        eq(entityRelationships.relation, params.relation),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(entityRelationships)
      .set({
        weight: params.weight ?? '0.50',
        metadata: params.metadata ?? {},
      })
      .where(eq(entityRelationships.id, existing.id));
    return existing.id;
  }

  const [entry] = await db
    .insert(entityRelationships)
    .values({
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      targetType: params.targetType,
      targetId: params.targetId,
      relation: params.relation,
      weight: params.weight ?? '0.50',
      metadata: params.metadata ?? {},
    })
    .returning();

  return entry.id;
}

// ---------------------------------------------------------------------------
// Creator Graph Query (used by Context Builder)
// ---------------------------------------------------------------------------

interface CreatorGraphResult {
  /** The creator entity node */
  entity: {
    name: string;
    properties: Record<string, unknown>;
  } | null;
  /** Outbound relationships (creator → X) */
  relationships: Array<{
    relation: string;
    targetType: string;
    targetId: string;
    targetName: string;
    weight: string | null;
  }>;
}

/**
 * Get the full entity graph for a creator.
 * Returns the creator entity + all outbound relationships with target names.
 */
export async function getCreatorGraph(creatorId: string): Promise<CreatorGraphResult> {
  // 1. Get creator entity node
  const [creatorEntity] = await db
    .select({
      name: entities.name,
      properties: entities.properties,
    })
    .from(entities)
    .where(
      and(
        eq(entities.entityType, 'creator'),
        eq(entities.entityId, creatorId),
      ),
    )
    .limit(1);

  // 2. Get outbound relationships
  const rels = await db
    .select({
      relation: entityRelationships.relation,
      targetType: entityRelationships.targetType,
      targetId: entityRelationships.targetId,
      weight: entityRelationships.weight,
    })
    .from(entityRelationships)
    .where(
      and(
        eq(entityRelationships.sourceType, 'creator'),
        eq(entityRelationships.sourceId, creatorId),
      ),
    )
    .orderBy(desc(entityRelationships.createdAt))
    .limit(20);

  // 3. Batch-fetch target entity names
  const relationships: CreatorGraphResult['relationships'] = [];

  for (const rel of rels) {
    const [target] = await db
      .select({ name: entities.name })
      .from(entities)
      .where(
        and(
          eq(entities.entityType, rel.targetType as typeof entities.entityType.enumValues[number]),
          eq(entities.entityId, rel.targetId),
        ),
      )
      .limit(1);

    relationships.push({
      relation: rel.relation,
      targetType: rel.targetType,
      targetId: rel.targetId,
      targetName: target?.name ?? rel.targetId,
      weight: rel.weight,
    });
  }

  return {
    entity: creatorEntity
      ? { name: creatorEntity.name, properties: creatorEntity.properties as Record<string, unknown> }
      : null,
    relationships,
  };
}

// ---------------------------------------------------------------------------
// Onboarding Entity Setup
// ---------------------------------------------------------------------------

/**
 * Called when a creator completes Discord linking.
 * Creates the creator entity node and initial relationships.
 */
export async function initCreatorEntity(params: {
  creatorId: string;
  tiktokHandle: string;
  displayName: string | null;
  tier: string;
  squadLeaderId: string | null;
  squadCode: string | null;
  tags: string[];
}): Promise<void> {
  // Create creator entity
  await upsertEntity({
    entityType: 'creator',
    entityId: params.creatorId,
    name: params.displayName ?? `@${params.tiktokHandle}`,
    properties: {
      tiktokHandle: params.tiktokHandle,
      tier: params.tier,
      onboardedAt: new Date().toISOString(),
    },
  });

  // Create squad entity + membership if squad leader exists
  if (params.squadLeaderId) {
    await upsertRelationship({
      sourceType: 'creator',
      sourceId: params.creatorId,
      targetType: 'creator',
      targetId: params.squadLeaderId,
      relation: 'member_of',
      weight: '1.00',
      metadata: { joinedAt: new Date().toISOString() },
    });
  }

  // Create own squad entity if squad code exists
  if (params.squadCode) {
    await upsertEntity({
      entityType: 'squad',
      entityId: params.squadCode,
      name: `Squad ${params.squadCode}`,
      properties: { leaderId: params.creatorId },
    });

    await upsertRelationship({
      sourceType: 'creator',
      sourceId: params.creatorId,
      targetType: 'squad',
      targetId: params.squadCode,
      relation: 'leads',
      weight: '1.00',
    });
  }

  // Create topic relationships from tags
  for (const tag of params.tags.slice(0, 10)) {
    await upsertEntity({
      entityType: 'topic',
      entityId: tag.toLowerCase(),
      name: tag,
    });

    await upsertRelationship({
      sourceType: 'creator',
      sourceId: params.creatorId,
      targetType: 'topic',
      targetId: tag.toLowerCase(),
      relation: 'expert_in',
      weight: '0.50',
    });
  }
}

/**
 * Called when a creator completes a mission.
 * Strengthens topic relationships and tracks mission patterns.
 */
export async function trackMissionCompletion(params: {
  creatorId: string;
  missionType: string;
  missionTitle: string;
}): Promise<void> {
  // Upsert mission topic entity
  await upsertEntity({
    entityType: 'topic',
    entityId: `mission_${params.missionType}`,
    name: `${params.missionType} missions`,
    properties: { category: 'mission_type' },
  });

  // Strengthen creator → mission type relationship
  const existing = await db
    .select({ weight: entityRelationships.weight })
    .from(entityRelationships)
    .where(
      and(
        eq(entityRelationships.sourceType, 'creator'),
        eq(entityRelationships.sourceId, params.creatorId),
        eq(entityRelationships.targetType, 'topic'),
        eq(entityRelationships.targetId, `mission_${params.missionType}`),
        eq(entityRelationships.relation, 'expert_in'),
      ),
    )
    .limit(1);

  const currentWeight = parseFloat(existing[0]?.weight ?? '0.30');
  const newWeight = Math.min(1.0, currentWeight + 0.05).toFixed(2);

  await upsertRelationship({
    sourceType: 'creator',
    sourceId: params.creatorId,
    targetType: 'topic',
    targetId: `mission_${params.missionType}`,
    relation: 'expert_in',
    weight: newWeight,
    metadata: { lastCompleted: new Date().toISOString() },
  });
}
