import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { semanticMemory } from '@/db/schema/memory';
import { verifyAuth } from '@/lib/auth';
import { sql, desc, eq, and, or } from 'drizzle-orm';

/**
 * GET /api/recipes — Content recipe library
 *
 * Surfaces semantic memory entries tagged as tips, strategies, and proven formats.
 * These are distilled from FNCO seeding data + nightly distiller insights.
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth();
  if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category'); // hook, format, strategy, product, all
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));

  // Build filter conditions
  const conditions = [
    eq(semanticMemory.archived, false),
    or(
      eq(semanticMemory.poolId, 'squad'),
      eq(semanticMemory.poolId, 'fnco'),
    ),
    or(
      eq(semanticMemory.memoryType, 'Tip'),
      eq(semanticMemory.memoryType, 'Fact'),
      eq(semanticMemory.memoryType, 'Observation'),
    ),
  ];

  // Category filter via tags
  if (category && category !== 'all') {
    conditions.push(
      sql`${semanticMemory.tags}::jsonb @> ${JSON.stringify([category])}::jsonb`,
    );
  }

  const recipes = await db
    .select({
      id: semanticMemory.id,
      content: semanticMemory.content,
      memoryType: semanticMemory.memoryType,
      importance: semanticMemory.importance,
      tags: semanticMemory.tags,
      accessCount: semanticMemory.accessCount,
      createdAt: semanticMemory.createdAt,
    })
    .from(semanticMemory)
    .where(and(...conditions))
    .orderBy(desc(sql`${semanticMemory.importance}::numeric`), desc(semanticMemory.accessCount))
    .limit(limit);

  // Categorize recipes
  const categorized = {
    hooks: [] as typeof recipes,
    formats: [] as typeof recipes,
    strategy: [] as typeof recipes,
    product: [] as typeof recipes,
    other: [] as typeof recipes,
  };

  for (const recipe of recipes) {
    const tags = (recipe.tags as string[]) ?? [];
    if (tags.includes('hook') || tags.includes('hooks')) {
      categorized.hooks.push(recipe);
    } else if (tags.includes('format') || tags.includes('content_type')) {
      categorized.formats.push(recipe);
    } else if (tags.includes('strategy') || tags.includes('posting')) {
      categorized.strategy.push(recipe);
    } else if (tags.includes('product') || tags.includes('sku')) {
      categorized.product.push(recipe);
    } else {
      categorized.other.push(recipe);
    }
  }

  // Update access counts for retrieved recipes (non-blocking)
  const recipeIds = recipes.map((r) => r.id);
  if (recipeIds.length > 0) {
    db.execute(
      sql`UPDATE semantic_memory SET access_count = access_count + 1, last_accessed = NOW() WHERE id = ANY(${recipeIds})`,
    ).catch(() => { /* non-critical */ });
  }

  return NextResponse.json({
    total: recipes.length,
    categories: {
      hooks: categorized.hooks.length,
      formats: categorized.formats.length,
      strategy: categorized.strategy.length,
      product: categorized.product.length,
    },
    recipes: recipes.map((r) => ({
      id: r.id,
      content: r.content,
      type: r.memoryType,
      importance: parseFloat(r.importance ?? '0.5'),
      tags: r.tags,
      popularity: r.accessCount ?? 0,
    })),
    categorized: {
      hooks: categorized.hooks.map(formatRecipe),
      formats: categorized.formats.map(formatRecipe),
      strategy: categorized.strategy.map(formatRecipe),
      product: categorized.product.map(formatRecipe),
    },
  });
}

function formatRecipe(r: {
  id: string;
  content: string;
  memoryType: string | null;
  importance: string | null;
  tags: unknown;
  accessCount: number | null;
}) {
  return {
    id: r.id,
    content: r.content,
    type: r.memoryType,
    importance: parseFloat(r.importance ?? '0.5'),
    tags: r.tags,
    popularity: r.accessCount ?? 0,
  };
}
