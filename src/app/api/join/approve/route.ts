import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { creators } from '@/db/schema/creators';
import { joinApplications } from '@/db/schema/applications';
import { verifyAdmin } from '@/lib/auth';
import { scoreApplication } from '@/lib/join/scoring';
import { and, eq } from 'drizzle-orm';

/**
 * POST /api/join/approve — Admin: approve a join application
 *
 * Creates a creator record and auto-links squad leader if squad_code is present.
 * Recomputes the affiliate-conversion applicant score on approval.
 */
export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const { applicationId } = await request.json();

  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId required' }, { status: 400 });
  }

  try {
    const approval = await db.transaction(async (tx) => {
      const [app] = await tx
        .select()
        .from(joinApplications)
        .where(eq(joinApplications.id, applicationId))
        .limit(1);

      if (!app) {
        return { kind: 'not_found' as const };
      }

      if (app.status !== 'pending') {
        return { kind: 'already_reviewed' as const, status: app.status };
      }

      // 어필리에이트 전환력 점수 (0-100) — 승인 시점에 재계산.
      const score = scoreApplication({
        avgViews: app.avgViews,
        engagementRate: app.engagementRate !== null ? parseFloat(app.engagementRate) : null,
        pastAffiliateGmv: app.pastAffiliateGmv !== null ? parseFloat(app.pastAffiliateGmv) : null,
        contentCategories: (app.contentCategories as string[]) ?? [],
        brandExperience: (app.brandExperience as string[]) ?? [],
      });

      const [claimedApp] = await tx
        .update(joinApplications)
        .set({
          status: 'approved',
          applicantScore: score.total,
          reviewedBy: adminResult.user.id,
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(joinApplications.id, applicationId),
            eq(joinApplications.status, 'pending'),
          ),
        )
        .returning();

      if (!claimedApp) {
        return { kind: 'already_reviewed' as const, status: 'approved' };
      }

      let squadLeaderId: string | null = null;
      if (claimedApp.squadCode) {
        const [leader] = await tx
          .select({ id: creators.id })
          .from(creators)
          .where(eq(creators.squadCode, claimedApp.squadCode.toUpperCase()))
          .limit(1);
        if (leader) {
          squadLeaderId = leader.id;
        }
      }

      const normalizedHandle = normalizeHandle(claimedApp.tiktokHandle);
      const squadCode = await generateUniqueSquadCode(tx, normalizedHandle);

      const [newCreator] = await tx
        .insert(creators)
        .values({
          tiktokHandle: normalizedHandle,
          displayName: claimedApp.displayName,
          email: claimedApp.email,
          instagramHandle: claimedApp.instagramHandle,
          followerCount: parseFollowerCount(claimedApp.followerCount),
          tier: 'pink_petal',
          commissionRate: '0.1000',
          status: 'active',
          source: 'discord',
          squadLeaderId,
          squadCode,
          onboardingStep: 0,
          tags: (claimedApp.contentCategories as string[]) ?? [],
        })
        .returning();

      return { kind: 'approved' as const, newCreator, squadLeaderId, squadCode, score };
    });

    if (approval.kind === 'not_found') {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (approval.kind === 'already_reviewed') {
      return NextResponse.json({ error: `Application already ${approval.status}` }, { status: 409 });
    }

    return NextResponse.json({
      approved: true,
      creator: {
        id: approval.newCreator.id,
        tiktokHandle: approval.newCreator.tiktokHandle,
        tier: approval.newCreator.tier,
        squadLeaderId: approval.squadLeaderId,
        squadCode: approval.squadCode,
      },
      applicantScore: approval.score,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'Creator handle or squad code already exists' }, { status: 409 });
    }
    throw err;
  }
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@+/, '').toLowerCase();
}

function generateBaseSquadCode(handle: string): string {
  const base = `${handle.slice(0, 8)}SQUAD`.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return base || 'CREATORSQUAD';
}

async function generateUniqueSquadCode(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  normalizedHandle: string,
): Promise<string> {
  const base = generateBaseSquadCode(normalizedHandle);

  for (let attempt = 0; attempt < 50; attempt++) {
    const suffix = attempt === 0 ? '' : String(attempt + 1);
    const candidate = attempt === 0 ? base : `${base}${suffix}`;
    const [existing] = await tx
      .select({ id: creators.id })
      .from(creators)
      .where(eq(creators.squadCode, candidate))
      .limit(1);

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Unable to generate unique squad code');
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object'
    && err !== null
    && (
      'code' in err && err.code === '23505'
      || 'message' in err
        && typeof err.message === 'string'
        && (
          err.message.includes('uq_creators_tiktok_handle')
          || err.message.includes('uq_creators_squad_code')
        )
    )
  );
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
