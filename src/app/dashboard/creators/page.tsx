'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatNumber, formatCurrency, tierColor, statusColor, sourceLabel } from '@/lib/utils';
import type { Creator, CreatorTier, CreatorSource, CreatorStatus } from '@/types/database';


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
    source: 'open_collab',
    mcnName: '',
    tags: '',
    notes: '',
  });

  // API data state
  const [creators, setCreators] = useState<Creator[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 20;

  // Fetch creators from API
  const fetchCreators = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.tier) params.set('tier', filters.tier);
      if (filters.source) params.set('source', filters.source);
      if (filters.status) params.set('status', filters.status);
      params.set('page', String(currentPage));
      params.set('limit', '20');

      const res = await fetch(`/api/creators?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setCreators(json.creators || []);
      setTotalCount(json.pagination?.total || 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  // Setup API fetch on mount and when filters/page change
  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  // Pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedCreators = creators;

  // Summary stats
  const activeCreators = creators.filter((c) => c.status === 'active');
  const totalGMV = creators.reduce((sum, c) => sum + parseFloat(c.monthlyGmv ?? '0'), 0);
  const averageGMVPerCreator =
    activeCreators.length > 0 ? totalGMV / activeCreators.length : 0;
  const topPerformer = creators.reduce((max, creator) =>
    parseFloat(creator.monthlyGmv ?? '0') > parseFloat(max.monthlyGmv ?? '0') ? creator : max,
    creators[0] || { monthlyGmv: '0', displayName: 'N/A' } as any
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
      source: 'open_collab',
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
    setCurrentPage(1);
  };

  if (loading && creators.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="p-6">
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg bg-red-50 p-6 text-red-700">
            Error loading creators: {error}
          </div>
        </div>
      </div>
    );
  }

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
              {totalCount}
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
              {formatCurrency(parseFloat(topPerformer.monthlyGmv ?? '0'))}
            </p>
            <p className="text-xs text-slate-500">{topPerformer.displayName || 'N/A'}</p>
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
                <option value="pink_petal">Pink Petal</option>
                <option value="pink_rose">Pink Rose</option>
                <option value="pink_diamond">Pink Diamond</option>
                <option value="pink_crown">Pink Crown</option>
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
                <option value="open_collab">Open Collab</option>
                <option value="dm_outreach">DM</option>
                <option value="mcn">MCN</option>
                <option value="buyer_to_creator">Buyer→Creator</option>
                <option value="referral">Referral</option>
                <option value="paid">Paid</option>
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
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Results
              </label>
              <div className="mt-1 flex items-center justify-between rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                {creators.length} found
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
                        {sourceLabel(creator.source ?? '')}
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
                      {formatNumber(creator.followerCount ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(parseFloat(creator.monthlyGmv ?? '0'))}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">
                      {creator.monthlyContentCount}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">
                      {creator.commissionRate}%
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {creator.lastActiveAt
                        ? new Date(creator.lastActiveAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
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
                    <option value="open_collab">Open Collab</option>
                    <option value="dm_outreach">DM</option>
                    <option value="mcn">MCN</option>
                    <option value="buyer_to_creator">Buyer→Creator</option>
                    <option value="referral">Referral</option>
                    <option value="paid">Paid</option>
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
