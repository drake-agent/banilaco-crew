import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { clampPagination, pickFields } from '@/lib/api';

const samplePatchSchema = z.object({
  status: z.enum(['requested', 'approved', 'shipped', 'delivered', 'content_posted', 'rejected', 'returned']).optional(),
  tracking_number: z.string().max(100).optional(),
  carrier: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  shipped_at: z.string().datetime().optional(),
  delivered_at: z.string().datetime().optional(),
}).strict();

// Whitelist allowed update fields for PATCH (VULN-005)
const ALLOWED_PATCH_FIELDS = [
  'status', 'tracking_number', 'carrier', 'shipped_at', 'delivered_at',
  'content_url', 'content_posted_at', 'notes', 'set_type', 'updated_at',
] as const;

function pickPatchFields(body: Record<string, any>): Record<string, any> {
  const cleaned = pickFields<any>(body, ALLOWED_PATCH_FIELDS);
  cleaned.updated_at = new Date().toISOString();
  return cleaned;
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status');
  const set_type = searchParams.get('set_type');
  const rawPage = parseInt(searchParams.get('page') || '1');
  const rawLimit = parseInt(searchParams.get('limit') || '20');
  const { page, limit } = clampPagination(rawPage, rawLimit);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('sample_shipments')
    .select('*, creator:creators(tiktok_handle, display_name)', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (set_type) query = query.eq('set_type', set_type);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('GET /api/samples error:', error);
    return NextResponse.json({ error: 'Failed to fetch samples' }, { status: 500 });
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
    .from('sample_shipments')
    .insert(body)
    .select()
    .single();

  if (error) {
    console.error('POST /api/samples error:', error);
    return NextResponse.json({ error: 'Failed to create sample shipment' }, { status: 500 });
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

  // Validate PATCH body
  const validationResult = samplePatchSchema.safeParse(rawUpdates);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validationResult.error.errors },
      { status: 400 }
    );
  }

  // Whitelist allowed fields (VULN-005)
  const updates = pickPatchFields(rawUpdates);

  const { data, error } = await supabase
    .from('sample_shipments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH /api/samples error:', error);
    return NextResponse.json({ error: 'Failed to update sample shipment' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
