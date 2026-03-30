'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Share2, Zap, Users, TrendingUp, Gift } from 'lucide-react';

// Mock data
const mockStats = {
  totalInvited: 12,
  totalSignedUp: 8,
  totalActive: 5,
  totalQualified: 3,
  totalEarnings: 185,
  referralCode: 'MIABEAUTY',
};

const mockReferrals = [
  {
    id: '1',
    referred_handle: '@sara_style',
    status: 'qualified',
    bonus_amount: 85,
    created_at: '2024-02-15',
  },
  {
    id: '2',
    referred_handle: '@emma_content',
    status: 'active',
    bonus_amount: 35,
    created_at: '2024-02-20',
  },
  {
    id: '3',
    referred_handle: '@luna_beauty',
    status: 'signed_up',
    bonus_amount: 10,
    created_at: '2024-03-05',
  },
  {
    id: '4',
    referred_handle: '@alex_creator',
    status: 'invited',
    bonus_amount: 0,
    created_at: '2024-03-10',
  },
  {
    id: '5',
    referred_handle: '@jordan_fit',
    status: 'qualified',
    bonus_amount: 85,
    created_at: '2024-02-28',
  },
];

const mockLeaderboard = [
  { creator: '@beautybymia', referrals: 3, earnings: 185 },
  { creator: '@stylebyrose', referrals: 5, earnings: 310 },
  { creator: '@contentking', referrals: 2, earnings: 120 },
  { creator: '@glowup_daily', referrals: 4, earnings: 215 },
  { creator: '@fitness_era', referrals: 1, earnings: 50 },
  { creator: '@makeup_magic', referrals: 3, earnings: 170 },
  { creator: '@fashion_flow', referrals: 2, earnings: 95 },
  { creator: '@beauty_boost', referrals: 6, earnings: 380 },
  { creator: '@style_studio', referrals: 2, earnings: 110 },
  { creator: '@creative_hub', referrals: 1, earnings: 60 },
];

const getStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    qualified: { bg: 'bg-green-100', text: 'text-green-700', label: '✓ Qualified' },
    active: { bg: 'bg-blue-100', text: 'text-blue-700', label: '→ Active' },
    signed_up: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '○ Signed Up' },
    invited: { bg: 'bg-gray-100', text: 'text-gray-700', label: '◯ Invited' },
  };

  const cfg = config[status] || config.invited;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

export default function CreatorReferralsPage() {
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    setReferralLink(`https://banilaco.crew/join?ref=${mockStats.referralCode}`);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTikTok = () => {
    const text = `Join the banilaco crew! Use my code ${mockStats.referralCode} and get exclusive creator perks!`;
    const url = `https://www.tiktok.com/intent/compose?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank');
  };

  const handleShareInstagram = () => {
    const text = `Join the banilaco crew! Use my code ${mockStats.referralCode} 🎬✨`;
    // Instagram doesn't have direct web sharing, so we copy to clipboard
    navigator.clipboard.writeText(`${text}\n${referralLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Referral Program</h1>
          <p className="text-gray-600">Invite creators and earn bonuses for every successful referral</p>
        </div>

        {/* Referral Code Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Code Display */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Referral Code</h2>
              <div className="bg-linear-to-br from-pink-50 to-rose-50 rounded-lg p-6 border border-pink-200">
                <div className="text-5xl font-bold text-pink-600 mb-4 font-mono">
                  {mockStats.referralCode}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Share this code to invite other creators
                </p>
                <button
                  onClick={handleCopyLink}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Share Your Code</h2>
              <div className="space-y-3">
                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium mb-2">Referral Link:</p>
                  <p className="font-mono text-xs break-all text-gray-700">{referralLink}</p>
                </div>

                <button
                  onClick={handleShareTikTok}
                  className="w-full bg-black hover:bg-gray-900 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share on TikTok
                </button>

                <button
                  onClick={handleShareInstagram}
                  className="w-full bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share on Instagram
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invited</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalInvited}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Signed Up</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalSignedUp}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalActive}</p>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Qualified</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalQualified}</p>
              </div>
              <Gift className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-linear-to-br from-pink-50 to-rose-50 rounded-lg shadow-sm border border-pink-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-pink-600">${mockStats.totalEarnings}</p>
              </div>
              <Gift className="w-8 h-8 text-pink-500" />
            </div>
          </div>
        </div>

        {/* Referral Tracking Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Referrals</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Handle</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Bonus Earned</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Date Referred</th>
                </tr>
              </thead>
              <tbody>
                {mockReferrals.map((referral, idx) => (
                  <tr
                    key={referral.id}
                    className={idx === mockReferrals.length - 1 ? '' : 'border-b border-gray-200 hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{referral.referred_handle}</td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(referral.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      ${referral.bonus_amount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Motivation Section */}
        <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🔥</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keep Growing!</h3>
              <p className="text-gray-700 mb-4">
                You've referred {mockStats.totalQualified} creators! Invite {5 - mockStats.totalQualified} more to unlock
                Diamond tier bonus and an extra $100 referral reward!
              </p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white rounded-full h-2">
                  <div
                    className="bg-linear-to-r from-amber-400 to-orange-500 h-full rounded-full"
                    style={{ width: `${(mockStats.totalQualified / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {mockStats.totalQualified}/5 qualified referrals for Diamond tier
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Referrers This Month</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rank</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Creator</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Referrals</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total Earnings</th>
                </tr>
              </thead>
              <tbody>
                {mockLeaderboard.map((entry, idx) => (
                  <tr
                    key={entry.creator}
                    className={`
                      ${idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-gray-50' : idx === 2 ? 'bg-orange-50' : ''}
                      ${idx === mockLeaderboard.length - 1 ? '' : 'border-b border-gray-200'}
                      hover:bg-opacity-75
                    `}
                  >
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{entry.creator}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{entry.referrals}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">${entry.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
