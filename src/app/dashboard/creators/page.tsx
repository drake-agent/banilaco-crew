'use client';

import { useState, useMemo } from 'react';
import { formatNumber, formatCurrency, tierColor, statusColor, sourceLabel } from '@/lib/utils';
import type { Creator, CreatorTier, CreatorSource, CreatorStatus } from '@/types/database';

// Mock data for creators
const MOCK_CREATORS: Creator[] = [
  {
    id: 'creator_001',
    tiktokHandle: '@glowupwithmin',
    displayName: 'Min Ji Park',
    email: 'minji@example.com',
    instagram: '@minjibeauty_kr',
    tier: 'Diamond',
    source: 'Open Collab',
    status: 'Active',
    followers: 542000,
    monthlyGMV: 18500,
    monthlyContentCount: 12,
    commissionRate: 8.5,
    lastActive: new Date('2026-03-26'),
    mcnName: null,
    tags: ['K-beauty', 'Skincare', 'High-performer'],
    notes: 'Top performer, consistent content quality',
  },
  {
    id: 'creator_002',
    tiktokHandle: '@skincaresofya',
    displayName: 'Sofia Yoon',
    email: 'sofia@example.com',
    instagram: '@sofiabeauty',
    tier: 'Gold',
    source: 'DM',
    status: 'Active',
    followers: 328000,
    monthlyGMV: 12300,
    monthlyContentCount: 10,
    commissionRate: 7.5,
    lastActive: new Date('2026-03-27'),
    mcnName: null,
    tags: ['Skincare', 'Tutorials'],
    notes: 'Consistent performer, good engagement rate',
  },
  {
    id: 'creator_003',
    tiktokHandle: '@beausangah',
    displayName: 'Sangah Park',
    email: 'sangah@example.com',
    instagram: '@sangahbeaute',
    tier: 'Diamond',
    source: 'Referral',
    status: 'Active',
    followers: 765000,
    monthlyGMV: 24100,
    monthlyContentCount: 15,
    commissionRate: 9,
    lastActive: new Date('2026-03-25'),
    mcnName: null,
    tags: ['K-beauty', 'Makeup', 'Trends', 'High-performer'],
    notes: 'Mega influencer, drives significant volume',
  },
  {
    id: 'creator_004',
    tiktokHandle: '@carefacebyls',
    displayName: 'Lisa Chen',
    email: 'lisa@example.com',
    instagram: '@liscareface',
    tier: 'Silver',
    source: 'MCN',
    status: 'Active',
    followers: 156000,
    monthlyGMV: 6800,
    monthlyContentCount: 8,
    commissionRate: 6.5,
    lastActive: new Date('2026-03-27'),
    mcnName: 'Beauty Network Asia',
    tags: ['Skincare', 'Routine'],
    notes: 'Reliable performer through MCN partnership',
  },
  {
    id: 'creator_005',
    tiktokHandle: '@joyfulbeauty',
    displayName: 'Joy Kim',
    email: 'joy@example.com',
    instagram: '@joyfulkbeauty',
    tier: 'Gold',
    source: 'Buyer→Creator',
    status: 'Active',
    followers: 402000,
    monthlyGMV: 14700,
    monthlyContentCount: 11,
    commissionRate: 7.5,
    lastActive: new Date('2026-03-24'),
    mcnName: null,
    tags: ['K-beauty', 'Viral trends'],
    notes: 'Former buyer, great product knowledge',
  },
  {
    id: 'creator_006',
    tiktokHandle: '@glowgoddess_kj',
    displayName: 'Kyuri Jung',
    email: 'kyuri@example.com',
    instagram: '@kyuriglowgoddess',
    tier: 'Silver',
    source: 'Open Collab',
    status: 'Active',
    followers: 234000,
    monthlyGMV: 8200,
    monthlyContentCount: 9,
    commissionRate: 6.5,
    lastActive: new Date('2026-03-27'),
    mcnName: null,
    tags: ['Skincare', 'Affordable'],
    notes: 'Growing creator, strong engagement',
  },
  {
    id: 'creator_007',
    tiktokHandle: '@beautymuse_ah',
    displayName: 'Ah Ra Lee',
    email: 'ahara@example.com',
    instagram: '@ahraleemuse',
    tier: 'Bronze',
    source: 'DM',
    status: 'Active',
    followers: 87000,
    monthlyGMV: 3100,
    monthlyContentCount: 5,
    commissionRate: 5.5,
    lastActive: new Date('2026-03-26'),
    mcnName: null,
    tags: ['Skincare', 'Budget-friendly'],
    notes: 'New creator, still building audience',
  },
  {
    id: 'creator_008',
    tiktokHandle: '@stylewithjin',
    displayName: 'Jin Park',
    email: 'jin@example.com',
    instagram: '@jinstyle_kr',
    tier: 'Gold',
    source: 'Paid',
    status: 'Active',
    followers: 521000,
    monthlyGMV: 16400,
    monthlyContentCount: 13,
    commissionRate: 7,
    lastActive: new Date('2026-03-27'),
    mcnName: null,
    tags: ['K-beauty', 'Fashion', 'Lifestyle'],
    notes: 'Multi-category influencer, excellent reach',
  },
  {
    id: 'creator_009',
    tiktokHandle: '@skintruth_mj',
    displayName: 'Min Joo Kang',
    email: 'minjoo@example.com',
    instagram: '@minjootruth',
    tier: 'Silver',
    source: 'Referral',
    status: 'Pending',
    followers: 198000,
    monthlyGMV: 0,
    monthlyContentCount: 0,
    commissionRate: 6.5,
    lastActive: new Date('2026-03-20'),
    mcnName: null,
    tags: ['Skincare', 'Education'],
    notes: 'Pending onboarding, high engagement potential',
  },
  {
    id: 'creator_010',
    tiktokHandle: '@luminouslipz',
    displayName: 'Soo Ji Han',
    email: 'soojiuhan@example.com',
    instagram: '@sujibeauty',
    tier: 'Bronze',
    source: 'Open Collab',
    status: 'Active',
    followers: 112000,
    monthlyGMV: 4200,
    monthlyContentCount: 6,
    commissionRate: 5.5,
    lastActive: new Date('2026-03-25'),
    mcnName: null,
    tags: ['Makeup', 'Trends'],
    notes: 'Emerging creator with viral potential',
  },
  {
    id: 'creator_011',
    tiktokHandle: '@essenceofbeauty',
    displayName: 'Ye Lin Park',
    email: 'yelin@example.com',
    instagram: '@yelinessence',
    tier: 'Silver',
    source: 'MCN',
    status: 'Active',
    followers: 267000,
    monthlyGMV: 9600,
    monthlyContentCount: 10,
    commissionRate: 6.5,
    lastActive: new Date('2026-03-26'),
    mcnName: 'K-Beauty Collective',
    tags: ['K-beauty', 'Holistic'],
    notes: 'MCN partnership performing well',
  },
  {
    id: 'creator_012',
    tiktokHandle: '@dewycomplexion',
    displayName: 'Hae Won Jung',
    email: 'haewon@example.com',
    instagram: '@haewon_dewy',
    tier: 'Bronze',
    source: 'Buyer→Creator',
    status: 'Inactive',
    followers: 78000,
    monthlyGMV: 0,
    monthlyContentCount: 0,
    commissionRate: 5.5,
    lastActive: new Date('2026-01-15'),
    mcnName: null,
    tags: ['Skincare'],
    notes: 'Inactive for 2+ months, needs reactivation',
  },
  {
    id: 'creator_013',
    tiktokHandle: '@glowtribe_kr',
    displayName: 'Tae Young Moon',
    email: 'taeyoung@example.com',
    instagram: '@taeyoungglow',
    tier: 'Gold',
    source: 'Open Collab',
    status: 'Active',
    followers: 445000,
    monthlyGMV: 15200,
    monthlyContentCount: 12,
    commissionRate: 7.5,
    lastActive: new Date('2026-03-27'),
    mcnName: null,
    tags: ['K-beauty', 'Skincare', 'Community'],
    notes: 'Strong community engagement, consistent growth',
  },
  {
    id: 'creator_014',
    tiktokHandle: '@luxelips_beauty',
    displayName: 'Nari Choi',
    email: 'nari@example.com',
    instagram: '@nariluxe',
    tier: 'Silver',
    source: 'DM',
    status: 'Churned',
    followers: 156000,
    monthlyGMV: 0,
    commissionRate: 6.5,
    monthlyContentCount: 0,
    lastActive: new Date('2025-11-30'),
    mcnName: null,
    tags: ['Makeup', 'Premium'],
    notes: 'Churned due to brand conflict',
  },
  {
    id: 'creator_015',
    tiktokHandle: '@purecomplexion',
    displayName: 'Huni Lee',
    email: 'huni@example.com',
    instagram: '@hunipure',
    tier: 'Bronze',
    source: 'Referral',
    status: 'Active',
    followers: 95000,
    monthlyGMV: 2800,
    monthlyContentCount: 4,
    commissionRate: 5.5,
    lastActive: new Date('2026-03-24'),
    mcnName: null,
    tags: ['Skincare', 'Natural'],
    notes: 'New creator, testing partnership',
  },
  {
    id: 'creator_016',
    tiktokHandle: '@radiantskincare',
    displayName: 'Sun Mi Ahn',
    email: 'sunmi@example.com',
    instagram: '@sunmiradiant',
    tier: 'Gold',
    source: 'Paid',
    status: 'Active',
    followers: 378000,
    monthlyGMV: 13900,
    monthlyContentCount: 11,
    commissionRate: 7.5,
    lastActive: new Date('2026-03-27'),
    mcnName: null,
    tags: ['K-beauty', 'Skincare', 'Education'],
    notes: 'Educational content driving conversions',
  },
];

interface CreatorFilterState {
  search: string;
  tier: CreatorTier | '';
  source: CreatorSource | '';
  status: CreatorStatus | '';
}

interface FormData {
  tiktokHandle: string;
  displayName: string;
  email: string;
  instagram: string;
  source: CreatorSource;
  mcnName: string;
  tags: string;
  notes: string;
}

export default function CreatorsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<CreatorFilterState>({
    search: '',
    tier: '',
    source: '',
    status: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    tiktokHandle: '',
    displayName: '',
    email: '',
    instagram: '',
    source: 'Open Collab',
    mcnName: '',
    tags: '',
    notes: '',
  });

  const itemsPerPage = 20;

  // Filter creators
  const filteredCreators = useMemo(() => {
    return MOCK_CREATORS.filter((creator) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        creator.tiktokHandle.toLowerCase().includes(searchLower) ||
        creator.displayName.toLowerCase().includes(searchLower);

      const matchesTier = !filters.tier || creator.tier === filters.tier;
      const matchesSource = !filters.source || creator.source === filters.source;
      const matchesStatus = !filters.status || creator.status === filters.status;

      return matchesSearch && matchesTier && matchesSource && matchesStatus;
    });
  }, [filters]);

  // Pagination
  const totalPages = Math.ceil(filteredCreators.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCreators = filteredCreators.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Summary stats
  const activeCreators = MOCK_CREATORS.filter((c) => c.status === 'Active');
  const totalGMV = MOCK_CREATORS.reduce((sum, c) => sum + c.monthlyGMV, 0);
  const averageGMVPerCreator =
    activeCreators.length > 0 ? totalGMV / activeCreators.length : 0;
  const topPerformer = MOCK_CREATORS.reduce((max, creator) =>
    creator.monthlyGMV > max.monthlyGMV ? creator : max
  );

  // Handle form submission
  const handleAddCreator = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send data to backend
    console.log('New creator:', formData);
    setShowAddModal(false);
    setFormData({
      tiktokHandle: '',
      displayName: '',
      email: '',
      instagram: '',
      source: 'Open Collab',
      mcnName: '',
      tags: '',
      notes: '',
    });
  };

  const handleFilterChange = (
    key: keyof CreatorFilterState,
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Creators</h1>
            <p className="mt-2 text-slate-600">
              Manage your creator network and track performance metrics
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-linear-to-r from-pink-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-xl hover:from-pink-600 hover:to-rose-600"
          >
            + Add Creator
          </button>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-sm font-medium text-slate-600">Total Creators</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {MOCK_CREATORS.length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-sm font-medium text-slate-600">Active Creators</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {activeCreators.length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-sm font-medium text-slate-600">
              Average GMV/Creator
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatCurrency(averageGMVPerCreator)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-sm font-medium text-slate-600">
              Top Performer GMV
            </p>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {formatCurrency(topPerformer.monthlyGMV)}
            </p>
            <p className="text-xs text-slate-500">{topPerformer.displayName}</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                type="text"
                placeholder="Handle or name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Tier
              </label>
              <select
                value={filters.tier}
                onChange={(e) => handleFilterChange('tier', e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">All Tiers</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Diamond">Diamond</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">All Sources</option>
                <option value="Open Collab">Open Collab</option>
                <option value="DM">DM</option>
                <option value="MCN">MCN</option>
                <option value="Buyer→Creator">Buyer→Creator</option>
                <option value="Referral">Referral</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
                <option value="Churned">Churned</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Results
              </label>
              <div className="mt-1 flex items-center justify-between rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                {filteredCreators.length} found
              </div>
            </div>
          </div>
        </div>

        {/* Creators Table */}
        <div className="rounded-lg bg-white shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    TikTok Handle
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Display Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                    Followers
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                    Monthly GMV
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                    Content
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCreators.map((creator, index) => (
                  <tr
                    key={creator.id}
                    className={`border-b border-slate-200 transition hover:bg-slate-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {creator.tiktokHandle}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {creator.displayName}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tierColor(
                          creator.tier
                        )}`}
                      >
                        {creator.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {sourceLabel(creator.source)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColor(
                          creator.status
                        )}`}
                      >
                        {creator.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">
                      {formatNumber(creator.followers)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(creator.monthlyGMV)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">
                      {creator.monthlyContentCount}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">
                      {creator.commissionRate}%
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {creator.lastActive.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="rounded bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-200">
                          View
                        </button>
                        <button className="rounded bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginatedCreators.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-500">
                No creators found matching your filters.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.max(prev - 1, 1))
              }
              disabled={currentPage === 1}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition disabled:opacity-50 hover:bg-slate-100"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded px-3 py-2 text-sm font-medium transition ${
                      currentPage === page
                        ? 'bg-pink-500 text-white'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition disabled:opacity-50 hover:bg-slate-100"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add Creator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900">Add Creator</h2>
            </div>

            <form onSubmit={handleAddCreator} className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    TikTok Handle *
                  </label>
                  <input
                    type="text"
                    placeholder="@handle"
                    required
                    value={formData.tiktokHandle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tiktokHandle: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Full name"
                    required
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayName: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    placeholder="creator@example.com"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Instagram
                  </label>
                  <input
                    type="text"
                    placeholder="@instagram_handle"
                    value={formData.instagram}
                    onChange={(e) =>
                      setFormData({ ...formData, instagram: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Source *
                  </label>
                  <select
                    required
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        source: e.target.value as CreatorSource,
                      })
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="Open Collab">Open Collab</option>
                    <option value="DM">DM</option>
                    <option value="MCN">MCN</option>
                    <option value="Buyer→Creator">Buyer→Creator</option>
                    <option value="Referral">Referral</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    MCN Name
                  </label>
                  <input
                    type="text"
                    placeholder="If applicable"
                    value={formData.mcnName}
                    onChange={(e) =>
                      setFormData({ ...formData, mcnName: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tags
                  </label>
                  <input
                    type="text"
                    placeholder="Comma-separated tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-linear-to-r from-pink-500 to-rose-500 px-4 py-2 font-semibold text-white transition hover:from-pink-600 hover:to-rose-600"
                >
                  Add Creator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
