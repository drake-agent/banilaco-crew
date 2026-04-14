import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { joinApplications } from '@/db/schema/applications';
import { z } from 'zod';

const joinSchema = z.object({
  tiktok_handle: z.string().min(1, 'TikTok handle is required'),
  display_name: z.string().optional(),
  email: z.string().email('Valid email is required'),
  instagram_handle: z.string().optional(),
  follower_count: z.string().optional(),
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

    const [application] = await db
      .insert(joinApplications)
      .values({
        tiktokHandle: validated.tiktok_handle,
        displayName: validated.display_name || null,
        email: validated.email,
        instagramHandle: validated.instagram_handle || null,
        followerCount: validated.follower_count || null,
        contentCategories: validated.content_categories,
        whyJoin: validated.why_join || null,
        brandExperience: validated.brand_experience,
        squadCode: validated.squad_code || null,
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
