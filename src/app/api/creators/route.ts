import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { verifyAdmin } from '@/lib/auth';
import { eq, ilike, desc, sql, and, count } from 'drizzle-orm';

/**
 * GET /api/creators — Admin: list creators with search/filter/pagination
 */
export async function GET(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.slice(0, 100) ?? '';
  const tier = searchParams.get('tier');
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    // Sanitize search (VULN-002)
    const sanitized = search.replace(/[\\%_]/g, '');
    conditions.push(
      sql`(${ilike(creators.tiktokHandle, `%${sanitized}%`)} OR ${ilike(creators.displayName, `%${sanitized}%`)} OR ${ilike(creators.email, `%${sanitized}%`)})`,
    );
  }
  if (tier) conditions.push(eq(creators.tier, tier as typeof creators.tier.enumValues[number]));
  if (status) conditions.push(eq(creators.status, status as typeof creators.status.enumValues[number]));
  if (source) conditions.push(eq(creators.source, source as typeof creators.source.enumValues[number]));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [totalResult]] = await Promise.all([
    db.select().from(creators).where(where)
      .orderBy(desc(sql`COALESCE(${creators.monthlyGmv}, '0')::numeric`))
      .limit(limit).offset(offset),
    db.select({ count: count() }).from(creators).where(where),
  ]);

  return NextResponse.json({
    creators: data,
    pagination: { page, limit, total: totalResult?.count ?? 0, totalPages: Math.ceil((totalResult?.count ?? 0) / limit) },
  });
}

/**
 * POST /api/creators — Admin: add a creator
 */
export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const body = await request.json();

  const allowed = ['tiktokHandle', 'displayName', 'email', 'instagramHandle', 'source', 'mcnName', 'tags', 'notes', 'followerCount'] as const;
  const values: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) values[key] = body[key];
  }

  if (!values.tiktokHandle) {
    return NextResponse.json({ error: 'tiktokHandle is required' }, { status: 400 });
  }

  const [newCreator] = await db.insert(creators).values(values as typeof creators.$inferInsert).returning();

  return NextResponse.json({ creator: newCreator }, { status: 201 });
}
