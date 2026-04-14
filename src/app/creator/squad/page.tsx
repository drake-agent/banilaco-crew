'use client';

import { useApi, LoadingSkeleton, ErrorBanner } from '@/hooks/use-api';
import type { SquadStats } from '@/lib/referral/referral-engine';

const TIER_META: Record<string, { label: string; emoji: string }> = {
  pink_petal: { label: 'Pink Petal', emoji: '🌸' },
  pink_rose: { label: 'Pink Rose', emoji: '🌹' },
  pink_diamond: { label: 'Pink Diamond', emoji: '💎' },
  pink_crown: { label: 'Pink Crown', emoji: '👑' },
};

export default function SquadPage() {
  const { data, loading, error, refetch } = useApi<SquadStats>('squad');

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">👥 My Squad</h1>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">👥 My Squad</h1>
        <ErrorBanner message={error} onRetry={refetch} />
      </div>
    );
  }

  const squad = data ?? {
    memberCount: 0,
    totalTeamGmv: 0,
    bonusRate: 0,
    estimatedMonthlyBonus: 0,
    members: [],
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">👥 My Squad</h1>
        <p className="text-gray-600 mt-2">
          Build your team and earn ongoing revenue share from their sales.
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
          <p className="text-3xl font-bold text-pink-600">{(squad.bonusRate * 100).toFixed(0)}%</p>
          <p className="text-sm text-gray-600">Bonus Rate</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">
            ${squad.estimatedMonthlyBonus.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">This Month</p>
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Squad Members</h2>
        {squad.members.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No squad members yet. Invite creators to join your squad.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="pb-3 font-semibold">Creator</th>
                  <th className="pb-3 font-semibold">Tier</th>
                  <th className="pb-3 font-semibold text-right">Monthly GMV</th>
                  <th className="pb-3 font-semibold text-right">Your Bonus</th>
                </tr>
              </thead>
              <tbody>
                {squad.members.map((m) => {
                  const meta = TIER_META[m.tier] ?? { label: m.tier, emoji: '•' };
                  return (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className="py-3 font-semibold text-gray-900">
                        @{m.tiktokHandle}
                        {m.displayName && (
                          <span className="text-xs text-gray-500 ml-2">({m.displayName})</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-1 bg-pink-50 text-pink-700 rounded-full">
                          {meta.emoji} {meta.label}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-700">
                        ${m.monthlyGmv.toLocaleString()}
                      </td>
                      <td className="py-3 text-right font-semibold text-green-600">
                        +${m.yourBonus.toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
