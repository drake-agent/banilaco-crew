'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { OnboardingChecklist } from '@/components/onboarding-checklist';
import { StreakWidget } from '@/components/streak-widget';
import { LeagueWidget } from '@/components/league-widget';
import Link from 'next/link';

interface CreatorData {
  creator: {
    id: string;
    tiktokHandle: string;
    displayName: string | null;
    tier: string;
    tierLabel: string;
    tierEmoji: string;
    commissionRate: number;
    missionCount: number;
    pinkScore: number;
    flatFeeEarned: number;
    monthlyGmv: number;
    totalGmv: number;
    followerCount: number;
    avgViews: number;
    squadCode: string | null;
  };
  stats: {
    totalViews: number;
    totalLikes: number;
    avgViews: number;
    contentCount: number;
    monthlyMissions: number;
  };
  streak: {
    current: number;
    longest: number;
    multiplier: number;
    currentMilestone: { days: number; label: string; emoji: string; multiplier: number } | null;
    nextMilestone: { days: number; label: string; emoji: string; multiplier: number } | null;
  };
  onboarding: {
    step: number;
    checklist: Array<{ key: string; label: string; done: boolean; icon: string }>;
    completedCount: number;
    totalCount: number;
    isComplete: boolean;
  };
  tierProgress: {
    nextTier: string;
    nextTierLabel: string;
    nextTierEmoji: string;
    missionProgress: { current: number; target: number; pct: number } | null;
    gmvProgress: { current: number; target: number; pct: number };
    overallPct: number;
  } | null;
  countdown: {
    nextTier: string;
    nextTierEmoji: string;
    remaining: string;
    overallPct: number;
    display: string | null;
  } | null;
}

export default function MyPerformance() {
  const [data, setData] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/creator');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (err) {
        console.error('Creator data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-linear-to-br from-white to-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Loading your dashboard...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-6xl mb-4">😕</p>
          <p className="text-gray-600">Unable to load your data. Please try again.</p>
        </div>
      </div>
    );
  }

  const { creator, stats, streak, onboarding, tierProgress, countdown } = data;
  const showOnboarding = !onboarding.isComplete;

  return (
    <div className="flex flex-col h-full bg-linear-to-br from-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Performance</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {creator.displayName ?? creator.tiktokHandle}!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StreakWidget {...streak} compact />
              <span className="px-4 py-2 bg-linear-to-r from-pink-50 to-rose-50 text-pink-700 text-sm font-semibold rounded-full border border-pink-200">
                {creator.tierEmoji} {creator.tierLabel} · {(creator.commissionRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          {/* Onboarding (shown only if incomplete) */}
          {showOnboarding && (
            <OnboardingChecklist
              checklist={onboarding.checklist}
              completedCount={onboarding.completedCount}
              totalCount={onboarding.totalCount}
              isComplete={onboarding.isComplete}
            />
          )}

          {/* Top Row: Streak + League + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Streak Widget (full) */}
            <StreakWidget
              current={streak.current}
              longest={streak.longest}
              multiplier={streak.multiplier}
              currentMilestone={streak.currentMilestone}
              nextMilestone={streak.nextMilestone}
            />

            {/* League Widget */}
            <LeagueWidget myHandle={creator.tiktokHandle} />

            {/* Quick Stats */}
            <div className="rounded-xl border-2 border-gray-200 bg-white p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                This Month
              </h3>
              <div className="space-y-3">
                <StatRow icon="🎯" label="Missions" value={`${stats.monthlyMissions}`} />
                <StatRow icon="👁" label="Total Views" value={formatNumber(stats.totalViews)} />
                <StatRow icon="💰" label="GMV" value={`$${creator.monthlyGmv.toLocaleString()}`} />
                <StatRow icon="🎬" label="Content" value={`${stats.contentCount} videos`} />
                <StatRow icon="⭐" label="Pink Score" value={creator.pinkScore.toFixed(0)} />
              </div>
              <Link
                href="/creator/missions"
                className="block text-center text-sm font-semibold text-pink-600 hover:text-pink-800 pt-3 border-t border-gray-100"
              >
                Go to Missions &rarr;
              </Link>
            </div>
          </div>

          {/* Tier Progress */}
          {tierProgress && (
            <div className="bg-linear-to-r from-pink-50 via-rose-50 to-purple-50 rounded-xl border-2 border-pink-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase">Tier Progress</h3>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {creator.tierEmoji} {creator.tierLabel} &rarr; {tierProgress.nextTierEmoji} {tierProgress.nextTierLabel}
                  </p>
                </div>
                <span className="text-2xl font-bold text-pink-600">{tierProgress.overallPct}%</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tierProgress.missionProgress && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">🎯 Missions</span>
                      <span className="font-semibold">{tierProgress.missionProgress.current}/{tierProgress.missionProgress.target}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-linear-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all"
                        style={{ width: `${tierProgress.missionProgress.pct}%` }}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">💰 Monthly GMV</span>
                    <span className="font-semibold">${tierProgress.gmvProgress.current.toLocaleString()}/${tierProgress.gmvProgress.target.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-linear-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${tierProgress.gmvProgress.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Public Countdown — Goal Gradient */}
          {countdown?.display && (
            <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{countdown.nextTierEmoji}</div>
                <div>
                  <p className="text-sm font-bold text-amber-900">{countdown.display}</p>
                  <p className="text-xs text-amber-700 mt-0.5">Keep going — you&apos;re {countdown.overallPct}% there!</p>
                </div>
              </div>
              <div className="w-20 h-20 relative">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#fde68a" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none" stroke="#f59e0b" strokeWidth="3"
                    strokeDasharray={`${countdown.overallPct} ${100 - countdown.overallPct}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-amber-800">
                  {countdown.overallPct}%
                </span>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Views Trend" type="area" />
            <ChartCard title="Earnings" type="bar" />
          </div>

          {/* Squad invite card */}
          {creator.squadCode && (
            <SquadInviteCard code={creator.squadCode} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">
        {icon} {label}
      </span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function ChartCard({ title, type }: { title: string; type: 'area' | 'bar' }) {
  // Placeholder data — will be replaced by real API data
  const placeholderData = [
    { week: 'W1', views: 0, earnings: 0 },
    { week: 'W2', views: 0, earnings: 0 },
    { week: 'W3', views: 0, earnings: 0 },
    { week: 'W4', views: 0, earnings: 0 },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        {type === 'area' ? (
          <AreaChart data={placeholderData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="views" stroke="#ec4899" fillOpacity={1} fill="url(#colorViews)" />
          </AreaChart>
        ) : (
          <BarChart data={placeholderData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Bar dataKey="earnings" fill="#f97316" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center mt-2">
        Data updates daily from TikTok Shop sync
      </p>
    </div>
  );
}

function SquadInviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const link = `${window.location.origin}/join?squad=${code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-linear-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-indigo-900">Grow Your Squad</h3>
          <p className="text-sm text-indigo-700 mt-1">
            Share your code to recruit creators and earn squad bonuses!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border-2 border-indigo-300 rounded-lg px-4 py-2">
            <span className="font-mono font-bold text-indigo-800 text-lg">{code}</span>
          </div>
          <button
            onClick={handleCopy}
            className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
