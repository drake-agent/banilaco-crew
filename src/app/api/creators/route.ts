import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { clampPagination, pickFields } from '@/lib/api';

// Sanitize search input to prevent PostgREST injection (VULN-002)
function sanitizeSearch(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .slice(0, 100); // Max 100 chars
}

// Whitelist allowed fields for creator insert (VULN-008)
const ALLOWED_CREATE_FIELDS = [
  'tiktok_handle', 'display_name', 'email', 'instagram_handle',
  'source', 'status', 'follower_count', 'competitor_brands', 'notes',
] as const;

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);

  const tier = searchParams.get('tier');
  const source = searchParams.get('source');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const rawPage = parseInt(searchParams.get('page') || '1');
  const rawLimit = parseInt(searchParams.get('limit') || '20');
  const { page, limit } = clampPagination(rawPage, rawLimit);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('creators')
    .select('*', { count: 'exact' });

  if (tier) query = query.eq('tier', tier);
  if (source) query = query.eq('source', source);
  if (status) query = query.eq('status', status);
  if (search) {
    const sanitized = sanitizeSearch(search);
    query = query.or(`tiktok_handle.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`);
  }

  const { data, error, count } = await query
    .order('monthly_gmv', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('GET /api/creators error:', error);
    return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  // Whitelist allowed fields (VULN-008)
  const cleanedBody = pickFields<any>(body, ALLOWED_CREATE_FIELDS);

  if (!cleanedBody.tiktok_handle) {
    return NextResponse.json({ error: 'tiktok_handle is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('creators')
    .insert(cleanedBody)
    .select()
    .single();

  if (error) {
    console.error('POST /api/creators error:', error);
    return NextResponse.json({ error: 'Failed to create creator' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
