import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { z } from 'zod';

const joinSchema = z.object({
  tiktok_handle: z.string().min(1, 'TikTok handle is required'),
  display_name: z.string().optional(),
  email: z.string().email('Valid email is required'),
  instagram_handle: z.string().optional(),
  follower_count: z.number().optional(),
  content_categories: z.array(z.string()).default([]),
  why_join: z.string().optional(),
  competitor_experience: z.array(z.string()).default([]),
});

// SEC-2: Simple in-memory rate limiter (per IP, 5 requests per hour)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean up stale entries periodically
  if (rateLimitMap.size > 10000) {
    Array.from(rateLimitMap.entries()).forEach(([key, val]) => {
      if (val.resetAt < now) rateLimitMap.delete(key);
    });
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
  // SEC-2: Rate limit check
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Too many applications. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validated = joinSchema.parse(body);

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('join_applications')
      .insert({
        tiktok_handle: validated.tiktok_handle,
        display_name: validated.display_name || null,
        email: validated.email,
        instagram_handle: validated.instagram_handle || null,
        follower_count: validated.follower_count || null,
        content_categories: validated.content_categories,
        why_join: validated.why_join || null,
        competitor_experience: validated.competitor_experience,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Application submitted successfully', data },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      );
    }
    console.error('Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
