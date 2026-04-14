'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, X, Play, Square, Trophy, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Season {
  id: string;
  seasonNumber: number;
  title: string | null;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  boostConfig: BoostConfig;
  createdAt: string;
}

interface BoostConfig {
  boostDays?: number[];
  prizes?: PrizeEntry[];
}

interface PrizeEntry {
  rank: number;
  amount: number;
  label: string;
}

interface Ranking {
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
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  upcoming:  { label: 'Upcoming',  color: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Active',    color: 'bg-green-100 text-green-700' },
  voting:    { label: 'Voting',    color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-500' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_PRIZES: PrizeEntry[] = [
  { rank: 1, amount: 500, label: 'Pink Crown + $500 bonus' },
  { rank: 2, amount: 300, label: '$300 bonus' },
  { rank: 3, amount: 200, label: '$200 bonus' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LeaguePage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    boostDays: [1] as number[], // Monday default
    prizes: DEFAULT_PRIZES.map((p) => ({ ...p })),
  });

  // ---------- Fetch ----------
  const fetchSeasons = useCallback(async () => {
    setLoading(true);
    try {
      // Get all seasons via admin missions pattern (reuse league GET)
      const res = await fetch('/api/league?limit=100');
      const data = await res.json();
      // The league API returns current season + rankings
      if (data.season) {
        setRankings(data.rankings ?? []);
      }
      // We need all seasons — fetch via a custom approach
      // For now, the league GET returns only active/voting season
      // Store what we get
      if (data.season) {
        setSeasons([data.season]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSeasons(); }, [fetchSeasons]);

  // ---------- Handlers ----------
  const handleCreate = async () => {
    if (!form.startDate || !form.endDate || !form.title.trim()) return;

    const res = await fetch('/api/league', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_season',
        title: form.title,
        startDate: form.startDate,
        endDate: form.endDate,
        boostConfig: {
          boostDays: form.boostDays,
          prizes: form.prizes.filter((p) => p.amount > 0),
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setSeasons((prev) => [data.season, ...prev]);
      setShowForm(false);
      resetForm();
    }
  };

  const handleAction = async (seasonId: string, action: string) => {
    const res = await fetch('/api/league', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, seasonId }),
    });

    if (res.ok) {
      fetchSeasons();
    }
  };

  const toggleBoostDay = (day: number) => {
    setForm((f) => ({
      ...f,
      boostDays: f.boostDays.includes(day)
        ? f.boostDays.filter((d) => d !== day)
        : [...f.boostDays, day].sort(),
    }));
  };

  const updatePrize = (idx: number, field: keyof PrizeEntry, value: string | number) => {
    setForm((f) => {
      const prizes = [...f.prizes];
      prizes[idx] = { ...prizes[idx], [field]: value };
      return { ...f, prizes };
    });
  };

  const addPrize = () => {
    setForm((f) => ({
      ...f,
      prizes: [...f.prizes, { rank: f.prizes.length + 1, amount: 0, label: '' }],
    }));
  };

  const removePrize = (idx: number) => {
    setForm((f) => ({ ...f, prizes: f.prizes.filter((_, i) => i !== idx) }));
  };

  const resetForm = () => {
    setForm({
      title: '',
      startDate: '',
      endDate: '',
      boostDays: [1],
      prizes: DEFAULT_PRIZES.map((p) => ({ ...p })),
    });
  };

  // Set default 4-week window when start date changes
  const handleStartDateChange = (startDate: string) => {
    const end = new Date(startDate);
    end.setDate(end.getDate() + 27); // 4 weeks
    setForm((f) => ({
      ...f,
      startDate,
      endDate: end.toISOString().split('T')[0],
    }));
  };

  // ---------- Derived ----------
  const activeSeason = seasons.find((s) => s.status === 'active' || s.status === 'voting');
  const totalPrizePool = form.prizes.reduce((sum, p) => sum + p.amount, 0);

  // ---------- Render ----------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PINK LEAGUE</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeSeason
              ? `Season ${activeSeason.seasonNumber} — ${STATUS_CFG[activeSeason.status].label}`
              : 'No active season'}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-pink-500 hover:bg-pink-600">
          <Plus className="w-4 h-4 mr-1" /> New Season
        </Button>
      </div>

      {/* ================================================================ */}
      {/* Create Season Form                                               */}
      {/* ================================================================ */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Create New Season</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Season Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Season 1 — Spring Sprint"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Boost Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Boost Days (1.5x score multiplier)
            </label>
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleBoostDay(i)}
                  className={cn(
                    'w-12 h-10 rounded-lg text-xs font-semibold transition-colors border',
                    form.boostDays.includes(i)
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300',
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Prize Pool */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Prize Pool
                <span className="text-pink-500 ml-2 font-bold">(Total: ${totalPrizePool.toLocaleString()})</span>
              </label>
              <button
                onClick={addPrize}
                className="text-xs text-pink-600 hover:text-pink-700 font-medium"
              >
                + Add Tier
              </button>
            </div>
            <div className="space-y-2">
              {form.prizes.map((prize, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-16 text-center">
                    <span className="text-sm font-bold text-gray-500">
                      {prize.rank === 1 ? '🥇' : prize.rank === 2 ? '🥈' : prize.rank === 3 ? '🥉' : `#${prize.rank}`}
                    </span>
                  </div>
                  <div className="w-28">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        value={prize.amount}
                        onChange={(e) => updatePrize(i, 'amount', parseInt(e.target.value) || 0)}
                        className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={prize.label}
                    onChange={(e) => updatePrize(i, 'label', e.target.value)}
                    placeholder="Prize description"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  {form.prizes.length > 1 && (
                    <button
                      onClick={() => removePrize(i)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.title.trim() || !form.startDate || !form.endDate}
              className="bg-pink-500 hover:bg-pink-600"
            >
              Create Season
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Seasons List                                                     */}
      {/* ================================================================ */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Seasons</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : seasons.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No seasons yet. Create your first season.</div>
        ) : (
          <div className="divide-y">
            {seasons.map((season) => {
              const statusCfg = STATUS_CFG[season.status];
              const isExpanded = expandedSeason === season.id;
              const prizes = (season.boostConfig as BoostConfig)?.prizes ?? [];
              const boostDays = (season.boostConfig as BoostConfig)?.boostDays ?? [];
              const totalPrize = prizes.reduce((s, p) => s + p.amount, 0);

              return (
                <div key={season.id}>
                  <div
                    className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedSeason(isExpanded ? null : season.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-gray-300 w-8 text-center">
                        #{season.seasonNumber}
                      </span>
                      <div>
                        <span className="font-medium text-gray-900">{season.title ?? `Season ${season.seasonNumber}`}</span>
                        <p className="text-xs text-gray-500">
                          {season.startDate} ~ {season.endDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalPrize > 0 && (
                        <span className="text-sm font-semibold text-pink-600">${totalPrize.toLocaleString()}</span>
                      )}
                      <Badge className={cn('text-xs', statusCfg.color)}>{statusCfg.label}</Badge>
                      <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 bg-gray-50 border-t">
                      {/* Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Boost Days</p>
                          <p className="text-sm mt-1">
                            {boostDays.length > 0
                              ? boostDays.map((d) => DAY_NAMES[d]).join(', ')
                              : 'None'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase">Prize Pool</p>
                          <p className="text-sm mt-1 font-medium text-pink-600">
                            ${totalPrize.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Prize Breakdown */}
                      {prizes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Prize Distribution</p>
                          <div className="space-y-1">
                            {prizes.map((p, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                <span className="w-8 text-center font-bold text-gray-400">
                                  {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                                </span>
                                <span className="font-medium text-green-600 w-16">${p.amount}</span>
                                <span className="text-gray-600">{p.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {season.status === 'upcoming' && (
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleAction(season.id, 'activate_season'); }}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Play className="w-3.5 h-3.5 mr-1" /> Activate
                          </Button>
                        )}
                        {season.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleAction(season.id, 'end_season'); }}
                          >
                            <Square className="w-3.5 h-3.5 mr-1" /> End &rarr; Voting
                          </Button>
                        )}
                        {season.status === 'voting' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleAction(season.id, 'complete_season'); }}
                          >
                            <Trophy className="w-3.5 h-3.5 mr-1" /> Complete Season
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Current Rankings                                                 */}
      {/* ================================================================ */}
      {rankings.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm">
              Current Rankings
              {activeSeason && (
                <span className="font-normal text-gray-500 ml-2">
                  {activeSeason.title ?? `Season ${activeSeason.seasonNumber}`}
                </span>
              )}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-center py-3 px-4 font-medium text-gray-600 w-16">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Creator</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Pink Score</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">GMV</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Viral</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Crown?</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Votes</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r) => (
                <tr key={r.handle} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      'font-bold',
                      r.rank === 1 ? 'text-amber-500 text-lg' :
                      r.rank === 2 ? 'text-gray-400 text-lg' :
                      r.rank === 3 ? 'text-amber-700 text-lg' :
                      'text-gray-500',
                    )}>
                      {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-900">
                      {r.tierEmoji} {r.displayName ?? r.handle}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">@{r.handle}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-pink-600">
                    {r.pinkScore.toFixed(0)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    ${r.gmvScore.toFixed(0)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {r.viralScore.toFixed(0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {r.isCrownCandidate ? '👑' : '-'}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {r.fanVotes > 0 ? r.fanVotes : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
