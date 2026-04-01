import { createServerClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verify request has valid authentication. Returns user or error response.
 */
export async function verifyAuth(request: NextRequest) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  return { user: session.user, supabase };
}

/**
 * Verify request comes from an admin user.
 */
export async function verifyAdmin(request: NextRequest) {
  const result = await verifyAuth(request);
  if ('error' in result) return result;
  const isAdmin = result.user.user_metadata?.role === 'admin';
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return result;
}

/**
 * Get creator_id for the authenticated user from creator_accounts.
 */
export async function getCreatorFromAuth(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: account, error } = await supabase
    .from('creator_accounts')
    .select('creator_id')
    .eq('auth_user_id', userId)
    .single();
  if (error || !account) return null;
  return account.creator_id as string;
}
