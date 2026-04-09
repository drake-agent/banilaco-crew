/**
 * @deprecated Use src/lib/auth/guards.ts instead.
 * This file existed for Supabase Auth integration.
 * All auth functions have been moved to NextAuth-based guards.
 *
 * Import from '@/lib/auth' instead:
 *   import { verifyAuth, verifyAdmin, getCreatorFromAuth } from '@/lib/auth';
 */

export {
  verifyAuth,
  verifyAdmin,
  getCreatorFromAuth,
} from '@/lib/auth/guards';
