import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { joinApplications } from '@/db/schema/applications';
import { scoreApplication } from '@/lib/join/scoring';
import { z } from 'zod';

const joinSchema = z.object({
  tiktok_handle: z.string().min(1, 'TikTok handle is required'),
  display_name: z.string().optional(),
  email: z.string().email('Valid email is required'),
  instagram_handle: z.string().optional(),
  follower_count: z.string().optional(),
  // Affiliate-signal fields — optional but heavily weighted in applicant scoring.
  avg_views: z.number().int().nonnegative().optional(),
  engagement_rate: z.number().nonnegative().max(100).optional(),  // percent (0-100)
  past_affiliate_gmv: z.number().nonnegative().optional(),        // USD
  content_categories: z.array(z.string()).default([]),
  why_join: z.string().optional(),
  brand_experience: z.array(z.string()).default([]),
  squad_code: z.string().optional(),
});

// Rate limiter (per IP, 5 requests per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (rateLimitMap.size > 10000) {
    for (const [key, val] of Array.from(rateLimitMap.entries())) {
      if (val.resetAt < now) rateLimitMap.delete(key);
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Too many applications. Please try again later.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const validated = joinSchema.parse(body);

    // engagement_rate는 사용자가 퍼센트(5.23)로 보내지만 스키마는 decimal(5,4) fraction(0.0523).
    const engagementFraction =
      validated.engagement_rate !== undefined
        ? Math.round((validated.engagement_rate / 100) * 10000) / 10000
        : null;

    // 제출 시점에 어필리에이트 점수를 계산해 저장 — 어드민이 pending 목록을 점수순으로 볼 수 있다.
    const score = scoreApplication({
      avgViews: validated.avg_views ?? null,
      engagementRate: engagementFraction,
      pastAffiliateGmv: validated.past_affiliate_gmv ?? null,
      contentCategories: validated.content_categories,
      brandExperience: validated.brand_experience,
    });

    const [application] = await db
      .insert(joinApplications)
      .values({
        tiktokHandle: validated.tiktok_handle,
        displayName: validated.display_name || null,
        email: validated.email,
        instagramHandle: validated.instagram_handle || null,
        followerCount: validated.follower_count || null,
        avgViews: validated.avg_views ?? null,
        engagementRate: engagementFraction !== null ? engagementFraction.toString() : null,
        pastAffiliateGmv:
          validated.past_affiliate_gmv !== undefined
            ? validated.past_affiliate_gmv.toFixed(2)
            : null,
        contentCategories: validated.content_categories,
        whyJoin: validated.why_join || null,
        brandExperience: validated.brand_experience,
        squadCode: validated.squad_code || null,
        applicantScore: score.total,
        status: 'pending',
      })
      .returning();

    return NextResponse.json(
      { message: 'Application submitted successfully', data: application },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 },
      );
    }
    console.error('[join] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
