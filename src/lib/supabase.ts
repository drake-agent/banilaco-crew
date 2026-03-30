import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses anon key, RLS enforced)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side client with SERVICE_ROLE key — bypasses RLS.
 * USE ONLY for: cron jobs, admin operations after role verification, system-level tasks.
 * For user-scoped queries, prefer createUserScopedClient().
 */
export function createServerClient(): SupabaseClient {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    { auth: { persistSession: false } }
  );
}

/**
 * UNI-001: User-scoped client — uses anon key, RLS enforced.
 * Safe for user-facing API routes where data should be scoped to the authenticated user.
 * Pass the user's access token to set the auth context for RLS.
 */
export function createUserScopedClient(accessToken?: string): SupabaseClient {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: accessToken ? {
      headers: { Authorization: `Bearer ${accessToken}` },
    } : undefined,
  });
  return client;
}
