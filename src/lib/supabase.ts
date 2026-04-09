/**
 * @deprecated Supabase has been replaced by Drizzle ORM + NextAuth.js
 *
 * Use `import { db } from '@/db'` for database queries.
 * Use `import { auth } from '@/lib/auth'` for authentication.
 *
 * This stub prevents import errors during migration.
 */

export function createServerClient(): never {
  throw new Error(
    'Supabase removed. Use Drizzle ORM: import { db } from "@/db"',
  );
}

export function createBrowserClient(): never {
  throw new Error(
    'Supabase removed. Use NextAuth.js for client-side auth.',
  );
}
