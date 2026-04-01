'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

interface FunnelItem {
  name: string;
  value: number;
}

interface TrendItem {
  month: string;
  referrals: number;
  qualified: number;
}

interface LeaderboardItem {
  name: string;
  referrals: number;
  bonus: number;
}

interface ReferralData {
  stats?: {
    total_referrals?: number;
    conversion_rate?: number;
    total_bonuses?: number;
    avg_per_creator?: number;
  };
  leaderboard?: LeaderboardItem[];
  funnel?: FunnelItem[];
  trend?: TrendItem[];
}

export default function AdminReferralsPage() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReferrals() {
      try {
        const res = await fetch('/api/referrals');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setReferralData(json);
      } catch (err) {
        console.error('Referrals fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReferrals();
  }, []);

  // Derive display data from API response
  const mockKPIs = {
    totalSignups: referralData?.stats?.total_referrals || 0,
    conversionRate: referralData?.stats?.conversion_rate || 0,
    totalBonusesPaid: referralData?.stats?.total_bonuses || 0,
    avgReferralsPerCreator: referralData?.stats?.avg_per_creator || 0,
  };
  const mockTopReferrers = referralData?.leaderboard || [];
  const mockFunnelData = referralData?.funnel || [];
  const mockTrendData = referralData?.trend || [];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Referral Analytics</h1>
          <p className="text-gray-600 mt-1">Track referral program performance and creator incentives</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Referral Signups</p>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              👥
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{mockKPIs.totalSignups}</p>
          <p className="text-xs text-green-600 mt-2">↑ 8% vs last month</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              📊
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{mockKPIs.conversionRate}%</p>
          <p className="text-xs text-green-600 mt-2">↑ 2.1% vs last month</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Bonuses Paid</p>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
              💰
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">${mockKPIs.totalBonusesPaid}</p>
          <p className="text-xs text-green-600 mt-2">↑ 15% vs last month</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Avg Referrals/Creator</p>
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
              ⭐
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{mockKPIs.avgReferralsPerCreator}</p>
          <p className="text-xs text-green-600 mt-2">↑ 0.4 vs last month</p>
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Referral Funnel</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mockFunnelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          {mockFunnelData.map((item: FunnelItem, idx: number) => {
            const rate =
              idx === 0
                ? 100
                : (
                    (mockFunnelData[idx].value /
                      mockFunnelData[0].value) *
                    100
                  ).toFixed(1);
            return (
              <div key={item.name}>
                <p className="text-sm text-gray-600 mb-1">
                  {item.name}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {item.value}
                </p>
                <p className="text-xs text-gray-500">
                  {rate}% of invites
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Referral Trend (6 Months)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mockTrendData}>
              <defs>
                <linearGradient id="colorReferrals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorQualified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="referrals"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorReferrals)"
                name="New Referrals"
              />
              <Area
                type="monotone"
                dataKey="qualified"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorQualified)"
                name="Qualified"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={mockFunnelData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }: FunnelItem) =>
                  `${name}: ${value}`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {mockFunnelData.map(
                  (entry: FunnelItem, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  )
                )}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Referrers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Top Referrers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Creator</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total Referrals</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Qualified</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Earnings</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {mockTopReferrers.map(
                (referrer: LeaderboardItem, idx: number) => {
                  const conversion = (
                    (referrer.bonus / referrer.referrals) *
                    100
                  ).toFixed(1);
                  return (
                    <tr
                      key={referrer.name}
                      className={`${
                        idx === mockTopReferrers.length - 1
                          ? ''
                          : 'border-b border-gray-200'
                      } hover:bg-gray-50`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {referrer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {referrer.referrals}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {referrer.bonus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        ${referrer.bonus}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {conversion}%
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
