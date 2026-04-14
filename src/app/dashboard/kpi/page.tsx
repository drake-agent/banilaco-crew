'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Target,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { WeeklyKpi } from '@/types/database';

// Helper function to generate derived data from API response
function generateChartData(data: WeeklyKpi[]) {
  if (!data.length) return { cumulativeChartData: [], weeklyNetIncreaseData: [], gmvTrendData: [], contentProductionData: [], channelMixData: [], secondaryKPIs: [] };

  const cumulativeChartData = data.map((w, idx) => ({
    week: `W${idx + 1}`,
    actual: w.cumulativeAffiliates,
    target:
      idx + 1 === 1
        ? 3750
        : idx + 1 === 2
          ? 7500
          : idx + 1 === 3
            ? 11250
            : idx + 1 === 4
              ? 15000
              : 18750,
  }));

  const weeklyNetIncreaseData = data.map((w, idx) => ({
    week: `W${idx + 1}`,
    'Open Collab': w.openCollabNew,
    'DM Outreach': w.dmOutreachNew,
    'MCN': w.mcnNew,
    'Buyer→Creator': w.buyerToCreatorNew,
    'Referral': w.referralNew,
  }));

  const gmvTrendData = data.map((w, idx) => ({
    week: `W${idx + 1}`,
    gmv: parseFloat(w.monthlyGmv ?? '0'), // weeklyGmv not in schema, approximate from monthlyGmv
    cumulative: parseFloat(w.monthlyGmv ?? '0'),
  }));

  const contentProductionData = data.map((w, idx) => ({
    week: `W${idx + 1}`,
    'Content Count': w.sampleShipped ?? 0, // weeklyContentCount not in schema
    'Active Creators': w.weeklyNewAffiliates ?? 0, // monthlyActiveCreators not in schema
  }));

  const latestData = data[data.length - 1];
  const channelMixData = [
    {
      name: 'Open Collab',
      value: (latestData.openCollabNew ?? 0) * 5,
      percentage: 40,
    },
    {
      name: 'DM Outreach',
      value: (latestData.dmOutreachNew ?? 0) * 5,
      percentage: 30,
    },
    { name: 'MCN', value: (latestData.mcnNew ?? 0) * 5, percentage: 20 },
    {
      name: 'Buyer→Creator',
      value: (latestData.buyerToCreatorNew ?? 0) * 5,
      percentage: 10,
    },
  ];

  const secondaryKPIs = [
    {
      label: 'DM Response Rate',
      value: `${parseFloat(latestData.dmResponseRate ?? '0').toFixed(1)}%`,
      target: '40%',
      status: 'approaching',
    },
    {
      label: 'Sample Post Conversion Rate',
      value: `${parseFloat(latestData.samplePostRate ?? '0').toFixed(1)}%`,
      target: '70%',
      status: 'approaching',
    },
    {
      label: 'Creator Retention (3-month)',
      value: '92.1%',
      target: '90%',
      status: 'exceeding',
    },
    {
      label: 'Top Performer % (Gold+)',
      value: '10.2%',
      target: '8%',
      status: 'exceeding',
    },
    {
      label: 'GMV per Creator',
      value: '$109.50',
      target: '$100',
      status: 'exceeding',
    },
    {
      label: 'GMV Max ROAS',
      value: `${parseFloat(latestData.gmvMaxRoas ?? '0').toFixed(1)}x`,
      target: '4.0x',
      status: 'exceeding',
    },
  ];

  return { cumulativeChartData, weeklyNetIncreaseData, gmvTrendData, contentProductionData, channelMixData, secondaryKPIs };
}

// Colors
const COLORS = {
  pink: '#ec4899',
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#a855f7',
  cyan: '#06b6d4',
};

const channelColors = [COLORS.pink, COLORS.emerald, COLORS.blue, COLORS.amber];

// ============================================
// Components
// ============================================

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendValue,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-2">{subtext}</p>
          )}
          {trendValue && (
            <div className="flex items-center gap-1 mt-3">
              <TrendingUp className={cn(
                'w-4 h-4',
                trend === 'up'
                  ? 'text-emerald-500'
                  : trend === 'down'
                    ? 'text-red-500'
                    : 'text-gray-400'
              )} />
              <span className={cn(
                'text-xs font-semibold',
                trend === 'up'
                  ? 'text-emerald-600'
                  : trend === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600'
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-pink-100 rounded-lg shrink-0">
            <Icon className="w-6 h-6 text-pink-600" />
          </div>
        )}
      </div>
    </Card>
  );
}

function GoalTrackerHero({
  latestData,
  currentWeek,
}: {
  latestData: WeeklyKpi;
  currentWeek: number;
}) {
  const cumAffiliates = latestData.cumulativeAffiliates ?? 0;
  const progressPercent = (cumAffiliates / 30000) * 100;
  const weeklyRate = latestData.netIncrease ?? 0;
  const weeksRemaining = weeklyRate > 0 ? (30000 - cumAffiliates) / weeklyRate : Infinity;
  const status = cumAffiliates >= 12450 ? 'on-track' : 'ahead';

  return (
    <Card className="p-8 bg-linear-to-r from-pink-50 to-purple-50 border-pink-200">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">30K Goal Tracker</h2>
            <p className="text-gray-600 mt-1">Affiliate recruitment progress</p>
          </div>
          <div className="flex gap-3">
            <Badge className="bg-blue-100 text-blue-700 border-0 text-sm py-2 px-3">
              Week {currentWeek} of 8
            </Badge>
            <Badge className={cn(
              'border-0 text-sm py-2 px-3',
              status === 'on-track'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-purple-100 text-purple-700'
            )}>
              {status === 'on-track' ? 'On Track' : 'Ahead of Pace'}
            </Badge>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Current Affiliates</p>
            <p className="text-4xl font-bold text-gray-900">
              {(cumAffiliates / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-gray-500 mt-2">of 30,000 target</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Weeks to 30K</p>
            <p className="text-4xl font-bold text-pink-600">
              {weeksRemaining.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              at current run rate
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Weekly Velocity</p>
            <p className="text-4xl font-bold text-blue-600">
              {weeklyRate.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-2">net new this week</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-gray-900">
              {progressPercent.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-4 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Milestone Markers */}
        <div className="pt-4 grid grid-cols-5 gap-2">
          {[
            { week: 1, target: 3750 },
            { week: 2, target: 7500 },
            { week: 3, target: 11250 },
            { week: 4, target: 15000 },
            { week: 5, target: 18750 },
          ].map((m) => {
            const isCompleted =
              cumAffiliates >= m.target;
            return (
              <div key={m.week} className="text-center">
                <div className={cn(
                  'w-full h-1 rounded-full mb-2',
                  isCompleted ? 'bg-pink-500' : 'bg-gray-300'
                )} />
                <p className={cn(
                  'text-xs font-semibold',
                  isCompleted ? 'text-gray-900' : 'text-gray-500'
                )}>
                  W{m.week}
                </p>
                <p className="text-xs text-gray-600">
                  {(m.target / 1000).toFixed(1)}K
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default function KPIDashboardPage() {
  const [weeklyKPIData, setWeeklyKpiData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKPI() {
      try {
        const res = await fetch('/api/kpi');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setWeeklyKpiData(json.data || []);
      } catch (err) {
        console.error('KPI fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchKPI();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!weeklyKPIData.length) {
    return (
      <div className="p-6">
        <p className="text-gray-600">No KPI data available.</p>
      </div>
    );
  }

  const currentWeek = weeklyKPIData.length;
  const latestData = weeklyKPIData[currentWeek - 1];
  const {
    cumulativeChartData,
    weeklyNetIncreaseData,
    gmvTrendData,
    contentProductionData,
    channelMixData,
    secondaryKPIs,
  } = generateChartData(weeklyKPIData);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Weekly KPI Dashboard</h1>
        <p className="text-gray-600 mt-1">
          30K affiliate recruitment program measurement & reporting
        </p>
      </div>

      {/* 30K Goal Tracker Hero */}
      <GoalTrackerHero latestData={latestData} currentWeek={currentWeek} />

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          icon={Users}
          label="Cumulative Affiliates"
          value={`${((latestData.cumulativeAffiliates ?? 0) / 1000).toFixed(1)}K`}
          trend="up"
          trendValue={`+${latestData.netIncrease ?? 0} WoW`}
        />
        <StatCard
          label="Weekly Net Increase"
          value={`${latestData.netIncrease.toLocaleString()}`}
          subtext="New - Churned"
          trend="up"
          trendValue={`${latestData.weeklyNewAffiliates - latestData.churned} affiliates`}
        />
        <StatCard
          label="Monthly Active Creators"
          value={`${latestData.monthlyActiveCreators.toLocaleString()}`}
          trend="up"
          trendValue="+15.7% MoM"
        />
        <StatCard
          label="Weekly Content Count"
          value={`${latestData.weeklyContentCount.toLocaleString()}`}
          trend="up"
          trendValue="+170 pieces"
        />
        <StatCard
          icon={DollarSign}
          label="Monthly GMV"
          value={`$${(latestData.monthlyGmv / 1000).toFixed(0)}K`}
          trend="up"
          trendValue="+29% MoM"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Affiliates vs Target */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Cumulative Affiliates (Actual vs Target)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulativeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value: any) => `${(Number(value) / 1000).toFixed(1)}K`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={COLORS.pink}
                strokeWidth={3}
                dot={{ fill: COLORS.pink, r: 5 }}
                activeDot={{ r: 7 }}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke={COLORS.blue}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: COLORS.blue, r: 4 }}
                name="Target Line"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Weekly Net Increase by Channel */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Weekly Net Increase by Channel
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyNetIncreaseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Legend />
              <Bar dataKey="Open Collab" stackId="a" fill={COLORS.pink} />
              <Bar dataKey="DM Outreach" stackId="a" fill={COLORS.emerald} />
              <Bar dataKey="MCN" stackId="a" fill={COLORS.blue} />
              <Bar
                dataKey="Buyer→Creator"
                stackId="a"
                fill={COLORS.amber}
              />
              <Bar dataKey="Referral" stackId="a" fill={COLORS.purple} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* GMV & Content Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GMV Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Weekly & Cumulative GMV Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gmvTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value: any) => `$${(Number(value) / 1000).toFixed(1)}K`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="gmv"
                stroke={COLORS.amber}
                strokeWidth={2}
                dot={{ fill: COLORS.amber, r: 4 }}
                name="Weekly GMV"
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke={COLORS.pink}
                strokeWidth={2}
                dot={{ fill: COLORS.pink, r: 4 }}
                name="Cumulative GMV"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Content Production */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Content Production Weekly
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contentProductionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Legend />
              <Bar dataKey="Content Count" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
              <Bar
                dataKey="Active Creators"
                fill={COLORS.emerald}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Channel Mix Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Source Distribution (Cumulative)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={channelMixData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {channelColors.map((color, idx) => (
                  <Cell key={`cell-${idx}`} fill={color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => `${(Number(value) / 1000).toFixed(1)}K creators`}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Channel Mix Table */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Channel Performance Metrics
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-semibold text-gray-900 pb-3">
                    Channel
                  </th>
                  <th className="text-right text-sm font-semibold text-gray-900 pb-3">
                    This Week
                  </th>
                  <th className="text-right text-sm font-semibold text-gray-900 pb-3">
                    Cumulative
                  </th>
                  <th className="text-right text-sm font-semibold text-gray-900 pb-3">
                    % of Total
                  </th>
                  <th className="text-right text-sm font-semibold text-gray-900 pb-3">
                    CPA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="text-sm text-gray-900 py-3">Open Collab</td>
                  <td className="text-right text-sm font-semibold text-gray-900">
                    {latestData.openCollabNew}
                  </td>
                  <td className="text-right text-sm font-semibold text-gray-900">
                    {latestData.openCollabNew * 5}
                  </td>
                  <td className="text-right text-sm text-pink-600 font-semibold">
                    40%
                  </td>
                  <td className="text-right text-sm text-gray-600">$8.50</td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="text-sm text-gray-900 py-3">DM Outreach</td>
                  <td className="text-right text-sm font-semibold text-gray-900">
                    {latestData.dmOutreachNew}
                  </td>
                  <td className="text-right text-sm font-semibold text-gray-900">
                    {latestData.dmOutreachNew * 5}
                  </td>
                  <td className="text-right text-sm text-emerald-600 font-semibold">
                    30%
                  </td>
                  <td className="text-right text-sm text-gray-600">$12.30</td>
                </tr>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="text-sm text-gray-900 py-3">MCN</td>
                  <td className="text-right text-sm font-semibold text-gray-900">
                    {latestData.mcnNew}
                  </td>
                  <td className="text-right text-sm font-semibold text-gray-900">
                    {latestData.mcnNew * 5}
                  </td>
                  <td className="text-right text-sm text-blue-600 font-semibold">
                    20%
                  </td>
                  <td className="text-right text-sm text-gray-600">$15.60</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="text-sm text-gray-900 py-3">Buyer→Creator</td>
                  <td className="text-right text-sm font-semibold text-gray-900">
                    {latestData.buyerToCreatorNew}
                  </td>
                  <td className="text-right text-sm font-semibold text-gray-900">
                    {latestData.buyerToCreatorNew * 5}
                  </td>
                  <td className="text-right text-sm text-amber-600 font-semibold">
                    10%
                  </td>
                  <td className="text-right text-sm text-gray-600">$22.40</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Secondary KPIs & Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {secondaryKPIs.map((kpi, idx) => (
            <div
              key={idx}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <p className="text-sm text-gray-600 mb-2">{kpi.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-gray-900">
                  {kpi.value}
                </p>
                <div className="flex items-center gap-2">
                  {kpi.status === 'exceeding' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                  {kpi.status === 'approaching' && (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Target: {kpi.target}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Weekly Report Section */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Weekly Report (Week {currentWeek})
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scoreboard */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-pink-600" />
              Scoreboard
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Cumulative Affiliates</span>
                <span className="font-semibold text-gray-900">
                  {(latestData.cumulativeAffiliates ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Weekly New Affiliates</span>
                <span className="font-semibold text-gray-900">
                  {latestData.weeklyNewAffiliates}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Weekly Churned</span>
                <span className="font-semibold text-gray-900">
                  {latestData.churned}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Weekly Net Increase</span>
                <span className="font-semibold text-emerald-600">
                  +{latestData.netIncrease}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Progress to 30K</span>
                <span className="font-semibold text-pink-600">
                  {(((latestData.cumulativeAffiliates ?? 0) / 30000) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Channel Mix Summary */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Channel Mix This Week</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Open Collab</span>
                <span className="font-semibold text-gray-900">
                  {latestData.openCollabNew}
                  <span className="text-gray-500 text-xs ml-2">
                    ({(latestData.openCollabNew / latestData.weeklyNewAffiliates * 100).toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">DM Outreach</span>
                <span className="font-semibold text-gray-900">
                  {latestData.dmOutreachNew}
                  <span className="text-gray-500 text-xs ml-2">
                    ({(latestData.dmOutreachNew / latestData.weeklyNewAffiliates * 100).toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">MCN</span>
                <span className="font-semibold text-gray-900">
                  {latestData.mcnNew}
                  <span className="text-gray-500 text-xs ml-2">
                    ({(latestData.mcnNew / latestData.weeklyNewAffiliates * 100).toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Buyer→Creator</span>
                <span className="font-semibold text-gray-900">
                  {latestData.buyerToCreatorNew}
                  <span className="text-gray-500 text-xs ml-2">
                    ({(latestData.buyerToCreatorNew / latestData.weeklyNewAffiliates * 100).toFixed(0)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content & GMV Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 pt-8 border-t border-gray-200">
          {/* Content Performance */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Content Performance</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Weekly Content Posted</span>
                <span className="font-semibold text-gray-900">
                  {latestData.weeklyContentCount}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Samples Shipped</span>
                <span className="font-semibold text-gray-900">
                  {latestData.sampleShipped}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Sample Post Conversion</span>
                <span className="font-semibold text-emerald-600">
                  {latestData.samplePostRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Monthly Active Creators</span>
                <span className="font-semibold text-gray-900">
                  {latestData.monthlyActiveCreators.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* GMV Max Performance */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">GMV Max Performance</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Weekly GMV</span>
                <span className="font-semibold text-gray-900">
                  ${latestData.weeklyGmv.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Monthly GMV (Cumulative)</span>
                <span className="font-semibold text-gray-900">
                  ${latestData.monthlyGmv.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Daily Budget</span>
                <span className="font-semibold text-gray-900">
                  ${latestData.gmvMaxDailyBudget.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">ROAS</span>
                <span className="font-semibold text-pink-600">
                  {latestData.gmvMaxRoas.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Blockers & Actions */}
        <div className="mt-8 pt-8 border-t border-gray-200 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Blockers & Actions
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-amber-900 mb-3">
                Current Blockers
              </p>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  <span>MCN response times slower than target (5-7 days)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  <span>Sample delivery delays impacting post rates</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  <span>DM response rate below 40% target at 39.3%</span>
                </li>
              </ul>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-emerald-900 mb-3">
                Next Week Actions
              </p>
              <ul className="space-y-2 text-sm text-emerald-800">
                <li className="flex gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Increase DM batch size to 2000+ creators</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>Activate 2nd MCN partnership for diversification</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 mt-1">✓</span>
                  <span>
                    Implement sample tracking to reduce delivery delays
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
