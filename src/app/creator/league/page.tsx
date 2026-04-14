'use client';

import { useApi, LoadingSkeleton, ErrorBanner } from '@/hooks/use-api';

interface LeagueSeason {
  id: string;
  seasonNumber: number;
  title: string | null;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  daysLeft: number;
  isBoostDay: boolean;
}

interface LeagueRanking {
  rank: number;
  handle: string;
  displayName: string | null;
  tier: string;
  tierEmoji: string;
  pinkScore: number;
  gmvScore: number;
  viralScore: number;
  isCrownCandidate: boolean;
  fanVotes: number;
  followers: number;
}

interface LeagueResponse {
  season: LeagueSeason | null;
  rankings: LeagueRanking[];
  participantCount?: number;
  message?: string;
}

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export default function LeaguePage() {
  const { data, loading, error, refetch } = useApi<LeagueResponse>('league');

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🏆 PINK LEAGUE</h1>
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🏆 PINK LEAGUE</h1>
        <ErrorBanner message={error} onRetry={refetch} />
      </div>
    );
  }

  const season = data?.season ?? null;
  const rankings = data?.rankings ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🏆 PINK LEAGUE</h1>
        <p className="text-gray-600 mt-2">
          Compete with top creators. Win the season to earn Pink Crown.
        </p>
      </div>

      {/* Season Info */}
      {season ? (
        <div className="card border-2 border-pink-200 bg-linear-to-r from-pink-50 to-rose-50 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {season.title ?? `Season ${season.seasonNumber}`}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {season.startDate} ~ {season.endDate} (4 weeks)
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-4 py-2 bg-pink-500 text-white rounded-full text-sm font-bold">
                {season.status === 'upcoming'
                  ? `Starts in ${season.daysLeft} days`
                  : season.status === 'active'
                    ? season.isBoostDay
                      ? 'LIVE — BOOST DAY'
                      : 'LIVE NOW'
                    : season.status === 'voting'
                      ? 'FAN VOTING'
                      : 'COMPLETED'}
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-white rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Pink Score</strong> = GMV + Viral Index (views, shares, likes, comments).
              Top 10 at season end become <strong>👑 Pink Crown</strong> candidates.
            </p>
          </div>
        </div>
      ) : (
        <div className="card border-2 border-gray-200 bg-gray-50 mb-8 text-center">
          <p className="text-gray-600">
            {data?.message ?? 'No season data yet.'}
          </p>
        </div>
      )}

      {/* Rankings */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Current Rankings</h2>
        {rankings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Season hasn&apos;t started yet. Rankings will appear when the season goes live.
          </p>
        ) : (
          <div className="space-y-3">
            {rankings.map((r) => (
              <div
                key={r.handle}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  r.rank <= 3
                    ? 'bg-linear-to-r from-amber-50 to-yellow-50 border border-amber-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl w-10 text-center">
                    {MEDALS[r.rank - 1] ?? `#${r.rank}`}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">@{r.handle}</p>
                    <p className="text-xs text-gray-500">
                      {r.tierEmoji} {r.tier.replace('pink_', 'Pink ')}
                      {r.isCrownCandidate && ' · 👑 Crown Candidate'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-bold text-pink-600">
                      {r.pinkScore.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Pink Score</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-700">
                      ${r.gmvScore.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">GMV</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
