'use client';

import React from 'react';
import {
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
  LineChart,
  Line,
} from 'recharts';
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Plus,
  Send,
  Mail,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Mock data for Week 3 of the 30K goal plan
const mockStats = {
  totalAffiliates: 8000,
  weeklyNetIncrease: 2100,
  monthlyGMV: 80000,
  weeksTo30k: 5.3,
};

// Week-by-week progress data
const progressData = [
  { week: 'Week 1', affiliates: 3500, target: 3750 },
  { week: 'Week 2', affiliates: 5900, target: 7500 },
  { week: 'Week 3', affiliates: 8000, target: 11250 },
  { week: 'Week 4', affiliates: null, target: 15000 },
  { week: 'Week 5', affiliates: null, target: 18750 },
  { week: 'Week 6', affiliates: null, target: 22500 },
  { week: 'Week 7', affiliates: null, target: 26250 },
  { week: 'Week 8', affiliates: null, target: 30000 },
];

// Channel mix data
const channelMixData = [
  { name: 'Open Collab', value: 3200, percentage: 40 },
  { name: 'DM Outreach', value: 2400, percentage: 30 },
  { name: 'MCN', value: 1600, percentage: 20 },
  { name: 'Buyer→Creator', value: 800, percentage: 10 },
];

// Tier distribution
const tierDistribution = [
  { tier: 'Bronze', count: 4800, percentage: 60 },
  { tier: 'Silver', count: 2400, percentage: 30 },
  { tier: 'Gold', count: 640, percentage: 8 },
  { tier: 'Diamond', count: 160, percentage: 2 },
];

// Recent activity
const recentActivity = [
  {
    id: 1,
    type: 'creator_added',
    description: 'New creator added: @fashionista_luna',
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    type: 'outreach_sent',
    description: 'Outreach batch sent to 145 creators',
    timestamp: '4 hours ago',
  },
  {
    id: 3,
    type: 'sample_sent',
    description: 'Product samples sent to 23 creators',
    timestamp: '1 day ago',
  },
  {
    id: 4,
    type: 'goal_milestone',
    description: 'Reached 7,500 affiliates (25% of 30K goal)',
    timestamp: '2 days ago',
  },
  {
    id: 5,
    type: 'mcn_partnership',
    description: 'New MCN partnership: CreatorHub Network',
    timestamp: '3 days ago',
  },
];

// Color palette
const COLORS = {
  pink: '#ec4899',
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#a855f7',
};

const tierColors = {
  Bronze: '#b45309',
  Silver: '#9ca3af',
  Gold: '#f59e0b',
  Diamond: '#06b6d4',
};

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  className?: string;
}) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-2">{subtext}</p>
          )}
        </div>
        <div className="p-3 bg-pink-100 rounded-lg">
          <Icon className="w-6 h-6 text-pink-600" />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const progressPercent = (mockStats.totalAffiliates / 30000) * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to Banilaco Crew admin</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Affiliates"
          value={`${(mockStats.totalAffiliates / 1000).toFixed(1)}K`}
          subtext="Active creators in program"
        />
        <StatCard
          icon={TrendingUp}
          label="Weekly Net Increase"
          value={`+${mockStats.weeklyNetIncrease}`}
          subtext="New affiliates this week"
        />
        <StatCard
          icon={DollarSign}
          label="Monthly GMV"
          value={`$${(mockStats.monthlyGMV / 1000).toFixed(0)}K`}
          subtext="Gross merchandise value"
        />
        <StatCard
          icon={Clock}
          label="Weeks to 30K"
          value={`${mockStats.weeksTo30k.toFixed(1)}`}
          subtext="At current pace"
        />
      </div>

      {/* 30K Progress Section */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          30K Goal Progress
        </h2>

        {/* Main Progress Bar */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {mockStats.totalAffiliates.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">out of 30,000 affiliates</p>
            </div>
            <Badge className="bg-pink-100 text-pink-700 border-0">
              {progressPercent.toFixed(1)}%
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-3 bg-gray-200" />
        </div>

        {/* Week Markers */}
        <div className="grid grid-cols-8 gap-1 text-center text-xs">
          {progressData.map((week, idx) => (
            <div key={idx} className="space-y-2">
              <div
                className={cn(
                  'h-1 rounded-full mx-auto w-full',
                  week.affiliates
                    ? 'bg-pink-500'
                    : 'bg-gray-300'
              )}
              />
              <p
                className={cn(
                  'font-medium',
                  week.affiliates ? 'text-gray-900' : 'text-gray-500'
                )}
              >
                W{idx + 1}
              </p>
              <p className="text-gray-600">
                {week.affiliates
                  ? `${(week.affiliates / 1000).toFixed(1)}K`
                  : '-'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Mix Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Channel Mix
          </h2>
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
                <Cell fill={COLORS.pink} />
                <Cell fill={COLORS.emerald} />
                <Cell fill={COLORS.blue} />
                <Cell fill={COLORS.amber} />
              </Pie>
              <Tooltip
                formatter={(value) => `${value} creators`}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-6 space-y-2">
            {channelMixData.map((channel) => (
              <div key={channel.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        channel.name === 'Open Collab'
                          ? COLORS.pink
                          : channel.name === 'DM Outreach'
                          ? COLORS.emerald
                          : channel.name === 'MCN'
                          ? COLORS.blue
                          : COLORS.amber,
                    }}
                  />
                  <span className="text-gray-600">{channel.name}</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {channel.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Tier Distribution Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Tier Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="tier" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value) => `${value} creators`}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                <Cell fill={tierColors.Bronze} />
                <Cell fill={tierColors.Silver} />
                <Cell fill={tierColors.Gold} />
                <Cell fill={tierColors.Diamond} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-6 space-y-2">
            {tierDistribution.map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: tierColors[tier.tier as keyof typeof tierColors],
                    }}
                  />
                  <span className="text-gray-600">{tier.tier}</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {tier.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Button className="w-full justify-start gap-2 bg-pink-500 hover:bg-pink-600">
              <Plus className="w-4 h-4" />
              Add Creator
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Mail className="w-4 h-4" />
              Send Samples
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Send className="w-4 h-4" />
              New Outreach Batch
            </Button>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-6">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b border-gray-200 last:pb-0 last:border-0"
              >
                <div
                  className={cn(
                    'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                    activity.type === 'creator_added'
                      ? 'bg-emerald-500'
                      : activity.type === 'outreach_sent'
                      ? 'bg-blue-500'
                      : activity.type === 'sample_sent'
                      ? 'bg-amber-500'
                      : activity.type === 'goal_milestone'
                      ? 'bg-pink-500'
                      : 'bg-purple-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
