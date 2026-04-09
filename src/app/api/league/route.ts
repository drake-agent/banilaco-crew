import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pinkLeagueSeasons, pinkLeagueEntries, pinkLeagueDailySnapshots } from '@/db/schema/league';
import { creators, TIER_CONFIG, type PinkTier } from '@/db/schema/creators';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { takeDailySnapshot, autoRegisterEligible } from '@/lib/league/scoring';
import { eq, desc, sql, and } from 'drizzle-orm';

/**
 * GET /api/league — Current season + rankings
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '10'));

  // Get active or most recent season
  const [season] = await db
    .select()
    .from(pinkLeagueSeasons)
    .where(sql`${pinkLeagueSeasons.status} IN ('active', 'voting')`)
    .orderBy(desc(pinkLeagueSeasons.seasonNumber))
    .limit(1);

  if (!season) {
    // Fallback to most recent completed
    const [latest] = await db
      .select()
      .from(pinkLeagueSeasons)
      .orderBy(desc(pinkLeagueSeasons.seasonNumber))
      .limit(1);

    return NextResponse.json({
      season: latest ?? null,
      rankings: [],
      message: latest ? 'Season completed' : 'No seasons yet',
    });
  }

  // Get rankings
  const rankings = await db
    .select({
      rank: pinkLeagueEntries.dailyRank,
      pinkScore: pinkLeagueEntries.pinkScore,
      gmvScore: pinkLeagueEntries.gmvScore,
      viralScore: pinkLeagueEntries.viralScore,
      isCrownCandidate: pinkLeagueEntries.isCrownCandidate,
      fanVoteCount: pinkLeagueEntries.fanVoteCount,
      creatorHandle: creators.tiktokHandle,
      creatorName: creators.displayName,
      creatorTier: creators.tier,
      creatorFollowers: creators.followerCount,
    })
    .from(pinkLeagueEntries)
    .innerJoin(creators, eq(pinkLeagueEntries.creatorId, creators.id))
    .where(eq(pinkLeagueEntries.seasonId, season.id))
    .orderBy(desc(sql`${pinkLeagueEntries.pinkScore}::numeric`))
    .limit(limit);

  // Days remaining
  const endDate = new Date(season.endDate);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));

  return NextResponse.json({
    season: {
      ...season,
      daysLeft,
      isBoostDay: isBoostDay(season.boostConfig as Record<string, unknown>),
    },
    rankings: rankings.map((r, i) => {
      const tierConfig = TIER_CONFIG[r.creatorTier as PinkTier];
      return {
        rank: r.rank ?? i + 1,
        handle: r.creatorHandle,
        displayName: r.creatorName,
        tier: r.creatorTier,
        tierEmoji: tierConfig.emoji,
        pinkScore: parseFloat(r.pinkScore ?? '0'),
        gmvScore: parseFloat(r.gmvScore ?? '0'),
        viralScore: parseFloat(r.viralScore ?? '0'),
        isCrownCandidate: r.isCrownCandidate,
        fanVotes: r.fanVoteCount ?? 0,
        followers: r.creatorFollowers ?? 0,
      };
    }),
    participantCount: rankings.length,
  });
}

/**
 * POST /api/league — Admin: create season or trigger snapshot
 */
export async function POST(request: NextRequest) {
  const adminResult = await verifyAdmin();
  if (adminResult.error) return adminResult.error;

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'create_season': {
      const { title, startDate, endDate, boostConfig } = body;

      // Get next season number
      const [latest] = await db
        .select({ seasonNumber: pinkLeagueSeasons.seasonNumber })
        .from(pinkLeagueSeasons)
        .orderBy(desc(pinkLeagueSeasons.seasonNumber))
        .limit(1);

      const nextNumber = (latest?.seasonNumber ?? 0) + 1;

      const [season] = await db.insert(pinkLeagueSeasons).values({
        seasonNumber: nextNumber,
        title: title ?? `Season ${nextNumber}`,
        startDate,
        endDate,
        status: 'upcoming',
        boostConfig: boostConfig ?? { boostDays: [1] }, // Monday default
      }).returning();

      return NextResponse.json({ season }, { status: 201 });
    }

    case 'activate_season': {
      const { seasonId } = body;

      await db.update(pinkLeagueSeasons).set({
        status: 'active',
      }).where(eq(pinkLeagueSeasons.id, seasonId));

      // Auto-register eligible creators
      const registered = await autoRegisterEligible(seasonId);

      return NextResponse.json({ activated: true, registered });
    }

    case 'daily_snapshot': {
      const { seasonId } = body;
      const result = await takeDailySnapshot(seasonId);
      return NextResponse.json(result);
    }

    case 'end_season': {
      const { seasonId } = body;

      // Set final ranks from current daily ranks
      const entries = await db
        .select({ id: pinkLeagueEntries.id, dailyRank: pinkLeagueEntries.dailyRank })
        .from(pinkLeagueEntries)
        .where(eq(pinkLeagueEntries.seasonId, seasonId));

      for (const entry of entries) {
        await db.update(pinkLeagueEntries).set({
          finalRank: entry.dailyRank,
          updatedAt: new Date(),
        }).where(eq(pinkLeagueEntries.id, entry.id));
      }

      await db.update(pinkLeagueSeasons).set({
        status: 'voting',
      }).where(eq(pinkLeagueSeasons.id, seasonId));

      return NextResponse.json({ ended: true, entriesFinalized: entries.length });
    }

    case 'complete_season': {
      const { seasonId } = body;

      await db.update(pinkLeagueSeasons).set({
        status: 'completed',
      }).where(eq(pinkLeagueSeasons.id, seasonId));

      return NextResponse.json({ completed: true });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

function isBoostDay(boostConfig: Record<string, unknown> | null): boolean {
  if (!boostConfig) return false;
  const boostDays = (boostConfig.boostDays as number[]) ?? [1];
  return boostDays.includes(new Date().getDay());
}
