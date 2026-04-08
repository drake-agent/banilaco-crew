import { auth } from './config';
import { db } from '@/db';
import { discordLinks } from '@/db/schema/discord';
import { creators } from '@/db/schema/creators';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type AuthUser = {
  id: string;
  role: string;
  discordId?: string;
};

/**
 * Verify that the request is authenticated.
 * Returns the user or a 401 response.
 */
export async function verifyAuth(): Promise<
  { user: AuthUser; error?: never } | { user?: never; error: NextResponse }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      ),
    };
  }

  return {
    user: {
      id: session.user.id,
      role: (session.user as Record<string, unknown>).role as string ?? 'user',
      discordId: (session.user as Record<string, unknown>).discordId as string | undefined,
    },
  };
}

/**
 * Verify that the request is from an admin.
 * Returns the user or a 403 response.
 */
export async function verifyAdmin(): Promise<
  { user: AuthUser; error?: never } | { user?: never; error: NextResponse }
> {
  const result = await verifyAuth();
  if (result.error) return result;

  if (result.user.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      ),
    };
  }

  return result;
}

/**
 * Get the creator associated with the authenticated user.
 * Links via discord_links table (discord_user_id → creator_id).
 */
export async function getCreatorFromAuth(): Promise<
  { creatorId: string; creator: typeof creators.$inferSelect; error?: never }
  | { creatorId?: never; creator?: never; error: NextResponse }
> {
  const result = await verifyAuth();
  if (result.error) return result;

  const discordId = result.user.discordId;
  if (!discordId) {
    return {
      error: NextResponse.json(
        { error: 'Discord account not linked' },
        { status: 403 },
      ),
    };
  }

  const link = await db
    .select({ creatorId: discordLinks.creatorId })
    .from(discordLinks)
    .where(eq(discordLinks.discordUserId, discordId))
    .limit(1);

  if (!link[0]) {
    return {
      error: NextResponse.json(
        { error: 'Creator account not found. Please link your account.' },
        { status: 404 },
      ),
    };
  }

  const creator = await db
    .select()
    .from(creators)
    .where(eq(creators.id, link[0].creatorId))
    .limit(1);

  if (!creator[0]) {
    return {
      error: NextResponse.json(
        { error: 'Creator profile not found' },
        { status: 404 },
      ),
    };
  }

  return { creatorId: link[0].creatorId, creator: creator[0] };
}

/**
 * Verify cron secret for server-to-server calls.
 */
export function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return false;

  // Timing-safe comparison
  if (token.length !== cronSecret.length) return false;

  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ cronSecret.charCodeAt(i);
  }

  return mismatch === 0;
}
