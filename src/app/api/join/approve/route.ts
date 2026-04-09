import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { joinApplications } from '@/db/schema/applications';
import { verifyAdmin } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/**
 * POST /api/join/approve — Admin: approve a join application
 *
 * Creates a creator record and auto-links squad leader if squad_code is present.
 */
export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const { applicationId } = await request.json();

  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId required' }, { status: 400 });
  }

  // Get application
  const [app] = await db
    .select()
    .from(joinApplications)
    .where(eq(joinApplications.id, applicationId))
    .limit(1);

  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (app.status !== 'pending') {
    return NextResponse.json({ error: `Application already ${app.status}` }, { status: 409 });
  }

  // Resolve squad leader from squad code
  let squadLeaderId: string | null = null;
  if (app.squadCode) {
    const [leader] = await db
      .select({ id: creators.id })
      .from(creators)
      .where(eq(creators.squadCode, app.squadCode.toUpperCase()))
      .limit(1);
    if (leader) {
      squadLeaderId = leader.id;
    }
  }

  // Generate squad code for new creator
  const handle = app.tiktokHandle.replace('@', '').toUpperCase();
  const squadCode = `${handle.slice(0, 8)}SQUAD`.replace(/[^A-Z0-9]/g, '');

  // Create creator
  const [newCreator] = await db
    .insert(creators)
    .values({
      tiktokHandle: app.tiktokHandle.replace('@', ''),
      displayName: app.displayName,
      email: app.email,
      instagramHandle: app.instagramHandle,
      followerCount: parseFollowerCount(app.followerCount),
      tier: 'pink_petal',
      commissionRate: '0.1000',
      status: 'active',
      source: 'discord',
      squadLeaderId,
      squadCode,
      onboardingStep: 0,
      tags: (app.contentCategories as string[]) ?? [],
    })
    .returning();

  // Mark application as approved
  await db
    .update(joinApplications)
    .set({
      status: 'approved',
      reviewedBy: adminResult.user.id,
      reviewedAt: new Date(),
    })
    .where(eq(joinApplications.id, applicationId));

  return NextResponse.json({
    approved: true,
    creator: {
      id: newCreator.id,
      tiktokHandle: newCreator.tiktokHandle,
      tier: newCreator.tier,
      squadLeaderId,
      squadCode,
    },
  });
}

function parseFollowerCount(range: string | null): number | null {
  if (!range) return null;
  const map: Record<string, number> = {
    '< 1K': 500,
    '1K - 5K': 3000,
    '5K - 10K': 7500,
    '10K - 25K': 17500,
    '25K - 50K': 37500,
    '50K - 100K': 75000,
    '100K+': 100000,
  };
  return map[range] ?? null;
}
