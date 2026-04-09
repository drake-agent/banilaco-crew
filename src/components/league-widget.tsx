'use client';

import Link from 'next/link';
import { useApi } from '@/hooks/use-api';

interface LeagueRanking {
  rank: number;
  handle: string;
  displayName: string | null;
  tier: string;
  tierEmoji: string;
  pinkScore: number;
}

interface LeagueData {
  season: {
    title: string;
    status: string;
    daysLeft: number;
    isBoostDay: boolean;
  } | null;
  rankings: LeagueRanking[];
}

interface LeagueWidgetProps {
  myHandle?: string;
}

export function LeagueWidget({ myHandle }: LeagueWidgetProps) {
  const { data, loading } = useApi<LeagueData>('league', { limit: 5 });

  if (loading) {
    return (
      <div className="rounded-xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-pink-50 p-5 animate-pulse">
        <div className="h-4 bg-purple-100 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-purple-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.season) {
    return (
      <div className="rounded-xl border-2 border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
          PINK LEAGUE
        </h3>
        <p className="text-sm text-gray-500">No active season. Check back soon!</p>
      </div>
    );
  }

  const { season, rankings } = data;
  const myRanking = rankings.find((r) => r.handle === myHandle);
  const myRank = myRanking ? rankings.indexOf(myRanking) + 1 : null;
  const medalEmoji = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-pink-50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide">
            PINK LEAGUE
          </h3>
          <p className="text-xs text-purple-600">{season.title}</p>
        </div>
        <div className="text-right">
          {season.isBoostDay && (
            <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">
              BOOST DAY 1.5x
            </span>
          )}
          <p className="text-xs text-purple-500 mt-1">
            {season.daysLeft > 0 ? `${season.daysLeft}d left` : 'Ending soon'}
          </p>
        </div>
      </div>

      {/* My rank highlight */}
      {myRank && (
        <div className="bg-white rounded-lg border border-purple-200 p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-purple-700">#{myRank}</span>
              <span className="text-sm text-gray-700">Your Rank</span>
            </div>
            <span className="text-sm font-semibold text-purple-600">
              {myRanking?.pinkScore.toFixed(0)} pts
            </span>
          </div>
        </div>
      )}

      {/* Top 5 */}
      <div className="space-y-2">
        {rankings.slice(0, 5).map((r, i) => {
          const isMe = r.handle === myHandle;
          return (
            <div
              key={r.handle}
              className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                isMe ? 'bg-pink-100 border border-pink-300 font-bold' : 'bg-white/60'
              }`}
            >
              <span className="w-6 text-center font-bold text-gray-700">
                {i < 3 ? medalEmoji[i] : `${i + 1}`}
              </span>
              <span className="text-base">{r.tierEmoji}</span>
              <span className={`flex-1 truncate ${isMe ? 'text-pink-800' : 'text-gray-800'}`}>
                @{r.handle}
                {isMe && ' (You)'}
              </span>
              <span className="text-xs font-mono text-gray-600">
                {r.pinkScore.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Link */}
      <Link
        href="/creator/league"
        className="block text-center text-sm font-semibold text-purple-600 hover:text-purple-800 mt-4 pt-3 border-t border-purple-100"
      >
        View Full Rankings &rarr;
      </Link>
    </div>
  );
}
