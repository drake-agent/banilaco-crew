import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Validate pagination params (VULN-007)
function clampPagination(page: number, limit: number): { page: number; limit: number } {
  return {
    page: Math.max(1, Math.min(isNaN(page) ? 1 : page, 10000)),
    limit: Math.max(1, Math.min(isNaN(limit) ? 20 : limit, 100)),
  };
}

// Whitelist allowed update fields for PATCH
const ALLOWED_PATCH_FIELDS = [
  'status', 'outreach_tier', 'notes', 'dm_sent_at', 'response_at',
  'follow_up_at', 'email', 'instagram_handle', 'updated_at',
] as const;

function pickPatchFields(body: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (body[key] !== undefined) {
      cleaned[key] = body[key];
    }
  }
  cleaned.updated_at = new Date().toISOString();
  return cleaned;
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status');
  const tier = searchParams.get('tier');
  const competitor = searchParams.get('competitor');
  const rawPage = parseInt(searchParams.get('page') || '1');
  const rawLimit = parseInt(searchParams.get('limit') || '20');
  const { page, limit } = clampPagination(rawPage, rawLimit);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('outreach_pipeline')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (tier) query = query.eq('outreach_tier', tier);
  if (competitor) query = query.eq('source_competitor', competitor);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('GET /api/outreach error:', error);
    return NextResponse.json({ error: 'Failed to fetch outreach' }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count || 0 },
  });
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('outreach_pipeline')
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error('POST /api/outreach error:', error);
    return NextResponse.json({ error: 'Failed to create outreach entry' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();
  const { id, ...rawUpdates } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  // If converting to "converted", also create a creator record
  if (rawUpdates.status === 'converted') {
    const { data: existing } = await supabase
      .from('outreach_pipeline')
      .select('*')
      .eq('id', id)
      .single();

    if (existing) {
      const { data: creator } = await supabase
        .from('creators')
        .insert({
          tiktok_handle: existing.tiktok_handle,
          display_name: existing.display_name,
          email: existing.email,
          instagram_handle: existing.instagram_handle,
          source: 'dm_outreach',
          status: 'pending',
          follower_count: existing.follower_count,
          competitor_brands: existing.source_competitor ? [existing.source_competitor] : [],
        })
        .select()
        .single();

      if (creator) {
        rawUpdates.creator_id = creator.id;
        rawUpdates.converted_at = new Date().toISOString();
      }
    }
  }

  // Whitelist allowed fields for non-conversion updates
  const updates = rawUpdates.status === 'converted'
    ? { ...pickPatchFields(rawUpdates), creator_id: rawUpdates.creator_id, converted_at: rawUpdates.converted_at }
    : pickPatchFields(rawUpdates);

  const { data, error } = await supabase
    .from('outreach_pipeline')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH /api/outreach error:', error);
    return NextResponse.json({ error: 'Failed to update outreach entry' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
