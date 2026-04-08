'use client';

export default function LeaguePage() {
  // TODO: Fetch from /api/league
  const season = {
    number: 1,
    title: 'Season 1: Pink Genesis',
    startDate: '2026-04-14',
    endDate: '2026-05-11',
    status: 'upcoming',
    daysLeft: 6,
  };

  const rankings = [
    { rank: 1, handle: '@skinglow_mia', tier: 'Pink Diamond', pinkScore: 4820, gmv: 3200, emoji: '💎' },
    { rank: 2, handle: '@cleanbeauty_j', tier: 'Pink Diamond', pinkScore: 4210, gmv: 2800, emoji: '💎' },
    { rank: 3, handle: '@asmr_skincare', tier: 'Pink Rose', pinkScore: 3890, gmv: 2100, emoji: '🌹' },
    { rank: 4, handle: '@kbeauty_daily', tier: 'Pink Rose', pinkScore: 3450, gmv: 1950, emoji: '🌹' },
    { rank: 5, handle: '@routinequeen', tier: 'Pink Rose', pinkScore: 3120, gmv: 1700, emoji: '🌹' },
  ];

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🏆 PINK LEAGUE</h1>
        <p className="text-gray-600 mt-2">
          Compete with top creators. Win the season to earn Pink Crown.
        </p>
      </div>

      {/* Season Info */}
      <div className="card border-2 border-pink-200 bg-linear-to-r from-pink-50 to-rose-50 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{season.title}</h2>
            <p className="text-gray-600 text-sm mt-1">
              {season.startDate} ~ {season.endDate} (4 weeks)
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-4 py-2 bg-pink-500 text-white rounded-full text-sm font-bold">
              {season.status === 'upcoming'
                ? `Starts in ${season.daysLeft} days`
                : season.status === 'active'
                ? 'LIVE NOW'
                : season.status}
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

      {/* Rankings */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Current Rankings</h2>
        <div className="space-y-3">
          {rankings.map((r) => (
            <div
              key={r.rank}
              className={`flex items-center justify-between p-4 rounded-lg ${
                r.rank <= 3 ? 'bg-linear-to-r from-amber-50 to-yellow-50 border border-amber-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl w-10 text-center">{medals[r.rank - 1]}</span>
                <div>
                  <p className="font-bold text-gray-900">{r.handle}</p>
                  <p className="text-xs text-gray-500">{r.emoji} {r.tier}</p>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-right">
                  <p className="font-bold text-pink-600">{r.pinkScore.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Pink Score</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-700">${r.gmv.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">GMV</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {rankings.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Season hasn&apos;t started yet. Rankings will appear when the season goes live.
          </p>
        )}
      </div>
    </div>
  );
}
