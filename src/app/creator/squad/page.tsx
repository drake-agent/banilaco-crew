'use client';

export default function SquadPage() {
  // TODO: Fetch from /api/squad
  const squad = {
    code: 'MIASQUAD',
    memberCount: 5,
    totalTeamGmv: 8500,
    myBonusRate: 0.02,
    monthlyBonus: 170,
  };

  const members = [
    { handle: '@beauty_sarah', tier: 'Pink Rose', monthlyGmv: 2400, joinedAt: '2026-03-15', emoji: '🌹' },
    { handle: '@skincare_jin', tier: 'Pink Petal', monthlyGmv: 1800, joinedAt: '2026-03-20', emoji: '🌸' },
    { handle: '@glow_amy', tier: 'Pink Petal', monthlyGmv: 1500, joinedAt: '2026-03-22', emoji: '🌸' },
    { handle: '@kbeauty_lee', tier: 'Pink Petal', monthlyGmv: 1400, joinedAt: '2026-03-28', emoji: '🌸' },
    { handle: '@clean_vibes', tier: 'Pink Petal', monthlyGmv: 1400, joinedAt: '2026-04-01', emoji: '🌸' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">👥 My Squad</h1>
        <p className="text-gray-600 mt-2">
          Build your team and earn ongoing revenue share from their sales.
        </p>
      </div>

      {/* Squad Code */}
      <div className="card border-2 border-purple-200 bg-linear-to-r from-purple-50 to-pink-50 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Your Squad Code</p>
            <p className="text-3xl font-bold text-purple-700">{squad.code}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(squad.code)}
            className="btn-outline text-sm"
          >
            Copy Code
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Share this code with potential creators. They enter it when joining BANILACO SQUAD.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-900">{squad.memberCount}</p>
          <p className="text-sm text-gray-600">Members</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-900">${squad.totalTeamGmv.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Team GMV</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-pink-600">{(squad.myBonusRate * 100).toFixed(0)}%</p>
          <p className="text-sm text-gray-600">Bonus Rate</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">${squad.monthlyBonus}</p>
          <p className="text-sm text-gray-600">This Month</p>
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Squad Members</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="pb-3 font-semibold">Creator</th>
                <th className="pb-3 font-semibold">Tier</th>
                <th className="pb-3 font-semibold text-right">Monthly GMV</th>
                <th className="pb-3 font-semibold text-right">Your Bonus</th>
                <th className="pb-3 font-semibold text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.handle} className="border-b border-gray-100">
                  <td className="py-3 font-semibold text-gray-900">{m.handle}</td>
                  <td className="py-3">
                    <span className="text-xs px-2 py-1 bg-pink-50 text-pink-700 rounded-full">
                      {m.emoji} {m.tier}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-700">${m.monthlyGmv.toLocaleString()}</td>
                  <td className="py-3 text-right font-semibold text-green-600">
                    +${(m.monthlyGmv * squad.myBonusRate).toFixed(0)}
                  </td>
                  <td className="py-3 text-right text-gray-500">{m.joinedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
