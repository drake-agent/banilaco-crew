'use client';

import React, { useState } from 'react';
import {
  Send,
  MessageCircle,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  X,
  Clock,
  AlertCircle,
  ChevronDown,
  Filter,
  Download,
  Plus,
  Edit,
  MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type {
  OutreachRecord,
  OutreachStatus,
  OutreachChannel,
  OutreachTierType,
} from '@/types/database';

// Mock outreach records with 15+ entries targeting competitor brands
const mockOutreachRecords: OutreachRecord[] = [
  {
    id: '1',
    tiktok_handle: '@skincare_guru_lily',
    display_name: 'Lily Park',
    outreach_tier: 'tier_a',
    status: 'converted',
    channel: 'tiktok_dm',
    source_competitor: 'Medicube',
    competitor_gmv: 450000,
    follower_count: 85000,
    dm_sent_at: '2026-03-20',
    responded_at: '2026-03-21',
    converted_at: '2026-03-23',
    dm_template_version: 'Version A',
    assigned_to: 'Sarah Chen',
    notes: 'Excellent engagement, posted within 1 week',
    created_at: '2026-03-20',
    updated_at: '2026-03-23',
  },
  {
    id: '2',
    tiktok_handle: '@cosrx_love_min',
    display_name: 'Min-jun Lee',
    outreach_tier: 'tier_a',
    status: 'sample_requested',
    channel: 'tiktok_dm',
    source_competitor: 'COSRX',
    competitor_gmv: 520000,
    follower_count: 120000,
    dm_sent_at: '2026-03-22',
    responded_at: '2026-03-23',
    dm_template_version: 'Version B',
    assigned_to: 'James Park',
    notes: 'High engagement, ready for sample shipment',
    created_at: '2026-03-22',
    updated_at: '2026-03-24',
  },
  {
    id: '3',
    tiktok_handle: '@beauty_joseon_native',
    display_name: 'Elena Rodriguez',
    outreach_tier: 'tier_b',
    status: 'responded',
    channel: 'instagram_dm',
    source_competitor: 'Beauty of Joseon',
    competitor_gmv: 380000,
    follower_count: 42000,
    dm_sent_at: '2026-03-18',
    responded_at: '2026-03-22',
    dm_template_version: 'Version A',
    assigned_to: 'Sarah Chen',
    notes: 'Interested in collaboration, negotiating terms',
    created_at: '2026-03-18',
    updated_at: '2026-03-22',
  },
  {
    id: '4',
    tiktok_handle: '@anua_skincare_fan',
    display_name: 'Sofia Nakamura',
    outreach_tier: 'tier_a',
    status: 'converted',
    channel: 'tiktok_dm',
    source_competitor: 'Anua',
    competitor_gmv: 410000,
    follower_count: 95000,
    dm_sent_at: '2026-03-19',
    responded_at: '2026-03-19',
    converted_at: '2026-03-21',
    dm_template_version: 'Version B',
    assigned_to: 'James Park',
    notes: 'Fastest conversion, already posted 2 videos',
    created_at: '2026-03-19',
    updated_at: '2026-03-21',
  },
  {
    id: '5',
    tiktok_handle: '@torriden_beauty_tips',
    display_name: 'Marcus Thompson',
    outreach_tier: 'tier_b',
    status: 'dm_sent',
    channel: 'tiktok_dm',
    source_competitor: 'Torriden',
    competitor_gmv: 290000,
    follower_count: 58000,
    dm_sent_at: '2026-03-25',
    dm_template_version: 'Version A',
    assigned_to: 'Sarah Chen',
    notes: 'Awaiting response, follow up after 3 days',
    created_at: '2026-03-25',
    updated_at: '2026-03-25',
  },
  {
    id: '6',
    tiktok_handle: '@elf_makeup_addict',
    display_name: 'Jessica Wong',
    outreach_tier: 'tier_a',
    status: 'responded',
    channel: 'tiktok_dm',
    source_competitor: 'e.l.f.',
    competitor_gmv: 620000,
    follower_count: 110000,
    dm_sent_at: '2026-03-21',
    responded_at: '2026-03-23',
    dm_template_version: 'Version B',
    assigned_to: 'James Park',
    notes: 'Very interested, scheduling call to discuss details',
    created_at: '2026-03-21',
    updated_at: '2026-03-23',
  },
  {
    id: '7',
    tiktok_handle: '@medicube_official_fan',
    display_name: 'Alex Kim',
    outreach_tier: 'tier_b',
    status: 'no_response',
    channel: 'email',
    source_competitor: 'Medicube',
    competitor_gmv: 450000,
    follower_count: 35000,
    dm_sent_at: '2026-03-16',
    dm_template_version: 'Version A',
    assigned_to: 'Sarah Chen',
    notes: 'No response after 5 days, might not be active',
    created_at: '2026-03-16',
    updated_at: '2026-03-24',
  },
  {
    id: '8',
    tiktok_handle: '@skincare_with_cosrx',
    display_name: 'Priya Patel',
    outreach_tier: 'tier_a',
    status: 'converted',
    channel: 'mcn_referral',
    source_competitor: 'COSRX',
    competitor_gmv: 520000,
    follower_count: 135000,
    dm_sent_at: '2026-03-17',
    responded_at: '2026-03-18',
    converted_at: '2026-03-20',
    dm_template_version: 'Version B',
    assigned_to: 'James Park',
    notes: 'MCN referral, smooth conversion process',
    created_at: '2026-03-17',
    updated_at: '2026-03-20',
  },
  {
    id: '9',
    tiktok_handle: '@beauty_joseon_believer',
    display_name: 'David Chen',
    outreach_tier: 'tier_b',
    status: 'declined',
    channel: 'tiktok_dm',
    source_competitor: 'Beauty of Joseon',
    competitor_gmv: 380000,
    follower_count: 41000,
    dm_sent_at: '2026-03-14',
    responded_at: '2026-03-15',
    dm_template_version: 'Version A',
    assigned_to: 'Sarah Chen',
    notes: 'Focusing on other brands, politely declined',
    created_at: '2026-03-14',
    updated_at: '2026-03-15',
  },
  {
    id: '10',
    tiktok_handle: '@anua_glow_journey',
    display_name: 'Isabella Martinez',
    outreach_tier: 'tier_a',
    status: 'sample_requested',
    channel: 'instagram_dm',
    source_competitor: 'Anua',
    competitor_gmv: 410000,
    follower_count: 102000,
    dm_sent_at: '2026-03-23',
    responded_at: '2026-03-24',
    dm_template_version: 'Version A',
    assigned_to: 'James Park',
    notes: 'Requested full size product set',
    created_at: '2026-03-23',
    updated_at: '2026-03-24',
  },
  {
    id: '11',
    tiktok_handle: '@torriden_hydration_fan',
    display_name: 'Yuki Tanaka',
    outreach_tier: 'tier_b',
    status: 'identified',
    channel: undefined,
    source_competitor: 'Torriden',
    competitor_gmv: 290000,
    follower_count: 54000,
    dm_template_version: undefined,
    assigned_to: 'Sarah Chen',
    notes: 'Recently identified, schedule outreach',
    created_at: '2026-03-26',
    updated_at: '2026-03-26',
  },
  {
    id: '12',
    tiktok_handle: '@elf_budget_beauty',
    display_name: 'Rachel Green',
    outreach_tier: 'tier_b',
    status: 'dm_sent',
    channel: 'tiktok_dm',
    source_competitor: 'e.l.f.',
    competitor_gmv: 620000,
    follower_count: 76000,
    dm_sent_at: '2026-03-24',
    dm_template_version: 'Version A',
    assigned_to: 'James Park',
    notes: 'Good engagement potential, awaiting response',
    created_at: '2026-03-24',
    updated_at: '2026-03-24',
  },
  {
    id: '13',
    tiktok_handle: '@medicube_skincare_review',
    display_name: 'Tom Wilson',
    outreach_tier: 'tier_a',
    status: 'responded',
    channel: 'tiktok_dm',
    source_competitor: 'Medicube',
    competitor_gmv: 450000,
    follower_count: 88000,
    dm_sent_at: '2026-03-22',
    responded_at: '2026-03-24',
    dm_template_version: 'Version B',
    assigned_to: 'Sarah Chen',
    notes: 'Very responsive, high conversion potential',
    created_at: '2026-03-22',
    updated_at: '2026-03-24',
  },
  {
    id: '14',
    tiktok_handle: '@cosrx_transformation',
    display_name: 'Lisa Anderson',
    outreach_tier: 'tier_b',
    status: 'no_response',
    channel: 'email',
    source_competitor: 'COSRX',
    competitor_gmv: 520000,
    follower_count: 48000,
    dm_sent_at: '2026-03-19',
    dm_template_version: 'Version B',
    assigned_to: 'James Park',
    notes: 'Email sent, no response yet, may try TikTok DM',
    created_at: '2026-03-19',
    updated_at: '2026-03-25',
  },
  {
    id: '15',
    tiktok_handle: '@joseon_heritage_fan',
    display_name: 'James Liu',
    outreach_tier: 'tier_a',
    status: 'identified',
    channel: undefined,
    source_competitor: 'Beauty of Joseon',
    competitor_gmv: 380000,
    follower_count: 98000,
    dm_template_version: undefined,
    assigned_to: 'Sarah Chen',
    notes: 'High-potential creator, prioritize outreach',
    created_at: '2026-03-26',
    updated_at: '2026-03-26',
  },
];

// Competitor breakdown
const competitorBreakdown = [
  {
    brand: 'Medicube',
    identified: 3,
    dmSent: 2,
    responded: 2,
    converted: 1,
    conversionRate: 50,
  },
  {
    brand: 'COSRX',
    identified: 3,
    dmSent: 3,
    responded: 2,
    converted: 2,
    conversionRate: 67,
  },
  {
    brand: 'Beauty of Joseon',
    identified: 4,
    dmSent: 2,
    responded: 2,
    converted: 0,
    conversionRate: 0,
  },
  {
    brand: 'Anua',
    identified: 3,
    dmSent: 2,
    responded: 2,
    converted: 2,
    conversionRate: 100,
  },
  {
    brand: 'Torriden',
    identified: 2,
    dmSent: 1,
    responded: 0,
    converted: 0,
    conversionRate: 0,
  },
  {
    brand: 'e.l.f.',
    identified: 3,
    dmSent: 2,
    responded: 2,
    converted: 0,
    conversionRate: 0,
  },
];

// Pipeline status colors
const statusColors: Record<OutreachStatus, { bg: string; text: string; badge: string }> = {
  identified: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    badge: 'bg-gray-200 text-gray-800',
  },
  dm_sent: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-200 text-blue-800',
  },
  responded: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    badge: 'bg-purple-200 text-purple-800',
  },
  sample_requested: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    badge: 'bg-orange-200 text-orange-800',
  },
  converted: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    badge: 'bg-green-200 text-green-800',
  },
  declined: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    badge: 'bg-red-200 text-red-800',
  },
  no_response: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    badge: 'bg-yellow-200 text-yellow-800',
  },
};

const tierBadgeColor = (tier: OutreachTierType) => {
  return tier === 'tier_a'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-slate-100 text-slate-800';
};

export default function OutreachPipelinePage() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OutreachStatus | 'all'>('all');
  const [filterTier, setFilterTier] = useState<OutreachTierType | 'all'>('all');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // Calculate KPIs
  const totalInPipeline = mockOutreachRecords.length;
  const dmsSentThisWeek = mockOutreachRecords.filter((r) => {
    if (!r.dm_sent_at) return false;
    const dmDate = new Date(r.dm_sent_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return dmDate >= weekAgo;
  }).length;

  const responded = mockOutreachRecords.filter((r) => r.status === 'responded').length;
  const sampleRequested = mockOutreachRecords.filter(
    (r) => r.status === 'sample_requested'
  ).length;
  const converted = mockOutreachRecords.filter((r) => r.status === 'converted').length;
  const identified = mockOutreachRecords.filter((r) => r.status === 'identified').length;

  const responseRate =
    dmsSentThisWeek > 0 ? ((responded + sampleRequested + converted) / dmsSentThisWeek) * 100 : 0;
  const conversionRate = identified > 0 ? (converted / identified) * 100 : 0;

  const tierARemaining = mockOutreachRecords.filter(
    (r) => r.outreach_tier === 'tier_a' && r.status === 'identified'
  ).length;
  const tierBRemaining = mockOutreachRecords.filter(
    (r) => r.outreach_tier === 'tier_b' && r.status === 'identified'
  ).length;

  // Filter records
  const filteredRecords = mockOutreachRecords.filter((record) => {
    const statusMatch = filterStatus === 'all' || record.status === filterStatus;
    const tierMatch = filterTier === 'all' || record.outreach_tier === filterTier;
    return statusMatch && tierMatch;
  });

  // DM Template A/B test
  const templateResults = {
    versionA: {
      sent: 8,
      responded: 5,
      responseRate: 62.5,
    },
    versionB: {
      sent: 7,
      responded: 5,
      responseRate: 71.4,
    },
  };

  // Weekly quota (Monday bulk 70%, mid-week follow-up 30%)
  const weeklyQuota = {
    total: 50,
    used: 32,
    mondayQuota: 35, // 70%
    mondayUsed: 25,
    midweekQuota: 15, // 30%
    midweekUsed: 7,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outreach Pipeline</h1>
          <p className="text-gray-600 mt-1">
            Manage competitor affiliate hunting and DM outreach
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2 bg-pink-600 hover:bg-pink-700">
            <Plus className="w-4 h-4" />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Pipeline</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalInPipeline}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">DMs Sent (Week)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{dmsSentThisWeek}</p>
            </div>
            <Send className="w-8 h-8 text-purple-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {responseRate.toFixed(0)}%
              </p>
            </div>
            <MessageCircle className="w-8 h-8 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {conversionRate.toFixed(0)}%
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tier A Remaining</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{tierARemaining}</p>
            </div>
            <Users className="w-8 h-8 text-amber-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tier B Remaining</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{tierBRemaining}</p>
            </div>
            <Users className="w-8 h-8 text-slate-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Weekly Quota Tracker */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Quota Tracker</h2>
          <Badge className="bg-blue-100 text-blue-800 text-xs">
            Resets Sunday at 12:00 AM
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Total Weekly Quota</p>
              <p className="text-sm text-gray-600">
                {weeklyQuota.used} / {weeklyQuota.total}
              </p>
            </div>
            <Progress value={(weeklyQuota.used / weeklyQuota.total) * 100} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Monday Bulk (70%)
              </p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">
                  {weeklyQuota.mondayUsed} / {weeklyQuota.mondayQuota}
                </span>
              </div>
              <Progress value={(weeklyQuota.mondayUsed / weeklyQuota.mondayQuota) * 100} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                Mid-week Follow-up (30%)
              </p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">
                  {weeklyQuota.midweekUsed} / {weeklyQuota.midweekQuota}
                </span>
              </div>
              <Progress value={(weeklyQuota.midweekUsed / weeklyQuota.midweekQuota) * 100} />
            </div>
          </div>
        </div>
      </Card>

      {/* Outreach Actions Panel */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Outreach Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="outline" className="justify-start h-12">
            <Download className="w-4 h-4 mr-2" />
            Import from FastMoss
          </Button>
          <Button variant="outline" className="justify-start h-12">
            <Send className="w-4 h-4 mr-2" />
            Bulk DM Send
          </Button>
        </div>

        {/* DM Template Selector */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm font-semibold text-gray-900 mb-4">DM Template A/B Test</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-900">Version A: Commission-Focused</p>
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {templateResults.versionA.responseRate.toFixed(1)}% response
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                Emphasizes competitive commission rates and earnings potential. Best for creators
                focused on monetization.
              </p>
              <p className="text-xs text-gray-500">
                Sent: {templateResults.versionA.sent} | Responded:{' '}
                {templateResults.versionA.responded}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-900">Version B: Social Proof</p>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  {templateResults.versionB.responseRate.toFixed(1)}% response
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                Highlights creator community success stories and product quality. Best for
                product-focused creators.
              </p>
              <p className="text-xs text-gray-500">
                Sent: {templateResults.versionB.sent} | Responded: {templateResults.versionB.responded}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Pipeline Kanban/Table View */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pipeline Overview</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value as OutreachTierType | 'all')}
              className="text-sm border rounded-lg px-3 py-2 text-gray-700"
            >
              <option value="all">All Tiers</option>
              <option value="tier_a">Tier A</option>
              <option value="tier_b">Tier B</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OutreachStatus | 'all')}
              className="text-sm border rounded-lg px-3 py-2 text-gray-700"
            >
              <option value="all">All Status</option>
              <option value="identified">Identified</option>
              <option value="dm_sent">DM Sent</option>
              <option value="responded">Responded</option>
              <option value="sample_requested">Sample Requested</option>
              <option value="converted">Converted</option>
              <option value="declined">Declined</option>
              <option value="no_response">No Response</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-24">
                  TikTok Handle
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-28">
                  Display Name
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-20">Tier</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-28">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-24">Channel</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-28">
                  Source Brand
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-24">Followers</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-24">DM Sent</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 w-28">
                  Assigned To
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const colors = statusColors[record.status];
                const isExpanded = expandedRow === record.id;

                return (
                  <React.Fragment key={record.id}>
                    <tr
                      className={cn(
                        'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                        colors.bg
                      )}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {record.tiktok_handle}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{record.display_name}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={cn(
                            'text-xs font-semibold',
                            tierBadgeColor(record.outreach_tier)
                          )}
                        >
                          {record.outreach_tier === 'tier_a' ? 'Tier A' : 'Tier B'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={cn(
                            'text-xs font-semibold',
                            colors.badge
                          )}
                        >
                          {record.status.replace('_', ' ').charAt(0).toUpperCase() +
                            record.status
                              .replace('_', ' ')
                              .slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-xs">
                        {record.channel ? record.channel.replace('_', ' ') : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium text-xs">
                        {record.source_competitor}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {(record.follower_count / 1000).toFixed(0)}K
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-xs">
                        {record.dm_sent_at || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-xs">{record.assigned_to}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              setExpandedRow(isExpanded ? null : record.id)
                            }
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 text-gray-600 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {isExpanded && (
                      <tr className={cn('border-b border-gray-100', colors.bg)}>
                        <td colSpan={10} className="py-4 px-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">
                                Template Version
                              </p>
                              <p className="text-sm text-gray-900 mt-1">
                                {record.dm_template_version || '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">
                                Responded At
                              </p>
                              <p className="text-sm text-gray-900 mt-1">
                                {record.responded_at || '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">
                                Converted At
                              </p>
                              <p className="text-sm text-gray-900 mt-1">
                                {record.converted_at || '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">
                                Competitor GMV
                              </p>
                              <p className="text-sm text-gray-900 mt-1">
                                ${(record.competitor_gmv / 1000).toFixed(0)}K
                              </p>
                            </div>

                            <div className="md:col-span-4">
                              <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                                Notes
                              </p>
                              <p className="text-sm text-gray-700 bg-white rounded p-2 border">
                                {record.notes || 'No notes'}
                              </p>
                            </div>

                            <div className="md:col-span-4 flex items-center gap-2 pt-2">
                              <Button size="sm" variant="outline" className="gap-1">
                                <Send className="w-3 h-3" />
                                Send DM
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1">
                                <Edit className="w-3 h-3" />
                                Update Status
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Add Note
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-600">
          Showing {filteredRecords.length} of {mockOutreachRecords.length} records
        </div>
      </Card>

      {/* Competitor Breakdown Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Competitor Breakdown</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Competitor Brand
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Identified</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">DMs Sent</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Responded</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Converted</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">
                  Conversion Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {competitorBreakdown.map((row) => (
                <tr key={row.brand} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{row.brand}</td>
                  <td className="text-center py-3 px-4 text-gray-700">{row.identified}</td>
                  <td className="text-center py-3 px-4 text-gray-700">{row.dmSent}</td>
                  <td className="text-center py-3 px-4 text-gray-700">{row.responded}</td>
                  <td className="text-center py-3 px-4 text-gray-700 font-medium text-green-600">
                    {row.converted}
                  </td>
                  <td className="text-center py-3 px-4">
                    <Badge
                      className={cn(
                        'text-xs font-semibold',
                        row.conversionRate === 0
                          ? 'bg-gray-100 text-gray-800'
                          : row.conversionRate >= 70
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                      )}
                    >
                      {row.conversionRate.toFixed(0)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
