'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  ChevronDown,
  Send,
  Plus,
  AlertCircle,
  CheckCircle,
  Truck,
  Package,
  Mail,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { SampleShipment, SampleSetType, SampleStatus, Creator } from '@/types/database';

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<
  SampleStatus,
  { label: string; color: string; bgColor: string; position: number }
> = {
  requested: { label: 'Requested', color: 'text-gray-600', bgColor: 'bg-gray-100', position: 1 },
  approved: { label: 'Approved', color: 'text-blue-600', bgColor: 'bg-blue-100', position: 2 },
  shipped: { label: 'Shipped', color: 'text-purple-600', bgColor: 'bg-purple-100', position: 3 },
  delivered: {
    label: 'Delivered',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    position: 4,
  },
  reminder_1: {
    label: 'Reminder 1 Sent',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    position: 5,
  },
  reminder_2: {
    label: 'Reminder 2 Sent',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    position: 6,
  },
  content_posted: {
    label: 'Content Posted',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    position: 7,
  },
  no_response: { label: 'No Response', color: 'text-gray-600', bgColor: 'bg-gray-100', position: 8 },
};

const SET_TYPE_CONFIG: Record<SampleSetType, { label: string; color: string }> = {
  hero: { label: 'Hero', color: 'bg-red-500' },
  premium: { label: 'Premium', color: 'bg-purple-500' },
  mini: { label: 'Mini', color: 'bg-blue-500' },
  full: { label: 'Full', color: 'bg-green-500' },
  welcome: { label: 'Welcome', color: 'bg-pink-500' },
};

// ============================================
// Component: Summary Cards
// ============================================

interface SummaryCardsProps {
  samples: SampleShipment[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ samples }) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalSentThisWeek = samples.filter(
    (s) => new Date(s.shippedAt || '') >= weekAgo && s.shippedAt
  ).length;
  const totalSentCumulative = samples.filter((s) => s.shippedAt).length;
  const pendingShipments = samples.filter((s) =>
    ['requested', 'approved'].includes(s.status)
  ).length;
  const awaitingContent = samples.filter(
    (s) =>
      (s.status === 'delivered' ||
        s.status === 'reminder_1' ||
        s.status === 'reminder_2') &&
      !s.contentPostedAt
  ).length;
  const withContent = samples.filter((s) => s.status === 'content_posted').length;
  const postConversionRate =
    samples.filter((s) => s.shippedAt).length > 0
      ? ((withContent / samples.filter((s) => s.shippedAt).length) * 100).toFixed(1)
      : '0';

  const reminder1Needed = samples.filter((s) => {
    if (!s.deliveredAt) return false;
    const daysSinceDelivery = (now.getTime() - new Date(s.deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery >= 5 && daysSinceDelivery < 10 && !s.contentPostedAt;
  }).length;

  const reminder2Needed = samples.filter((s) => {
    if (!s.deliveredAt) return false;
    const daysSinceDelivery = (now.getTime() - new Date(s.deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery >= 10 && !s.contentPostedAt;
  }).length;

  const cards = [
    {
      title: 'This Week',
      value: totalSentThisWeek,
      sublabel: `${totalSentCumulative} cumulative`,
      icon: Package,
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Pending Shipments',
      value: pendingShipments,
      sublabel: 'Awaiting action',
      icon: AlertCircle,
      color: 'bg-orange-50 border-orange-200',
    },
    {
      title: 'Awaiting Content',
      value: awaitingContent,
      sublabel: 'Delivered, no post',
      icon: Mail,
      color: 'bg-yellow-50 border-yellow-200',
    },
    {
      title: 'Post Conversion',
      value: `${postConversionRate}%`,
      sublabel: `${withContent} posted`,
      icon: TrendingUp,
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'Reminder 1 Needed',
      value: reminder1Needed,
      sublabel: '5 days post-delivery',
      icon: AlertCircle,
      color: 'bg-red-50 border-red-200',
    },
    {
      title: 'Reminder 2 Needed',
      value: reminder2Needed,
      sublabel: '10 days post-delivery',
      icon: AlertCircle,
      color: 'bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`border rounded-lg p-4 ${card.color} flex flex-col items-start space-y-2`}
          >
            <div className="flex items-center justify-between w-full">
              <p className="text-sm font-semibold text-gray-600">{card.title}</p>
              <Icon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-600">{card.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// Component: Pipeline Indicator
// ============================================

interface PipelineIndicatorProps {
  status: SampleStatus;
}

const PipelineIndicator: React.FC<PipelineIndicatorProps> = ({ status }) => {
  const statuses: SampleStatus[] = [
    'requested',
    'approved',
    'shipped',
    'delivered',
    'reminder_1',
    'reminder_2',
    'content_posted',
  ];

  const currentIndex = statuses.indexOf(status);

  return (
    <div className="flex items-center space-x-1">
      {statuses.map((s, idx) => (
        <React.Fragment key={s}>
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              idx <= currentIndex ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          />
          {idx < statuses.length - 1 && (
            <div
              className={`w-2 h-0.5 transition-all ${
                idx < currentIndex ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================
// Component: New Shipment Form Modal
// ============================================

interface NewShipmentFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewShipmentForm: React.FC<NewShipmentFormProps> = ({ isOpen, onClose }) => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [formData, setFormData] = useState({
    creatorId: '',
    setType: 'hero' as SampleSetType,
    skus: '',
    estimatedCost: '',
    shippingCost: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    async function fetchCreators() {
      setCreatorsLoading(true);
      try {
        const res = await fetch('/api/creators');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setCreators(json.data || []);
      } catch (err) {
        console.error('Creators fetch error:', err);
      } finally {
        setCreatorsLoading(false);
      }
    }
    fetchCreators();
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission (in real app would save to DB)
    console.log('New shipment:', formData);
    setFormData({
      creatorId: '',
      setType: 'hero',
      skus: '',
      estimatedCost: '',
      shippingCost: '',
      notes: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-gray-900">New Sample Shipment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creator</label>
            <select
              value={formData.creatorId}
              onChange={(e) =>
                setFormData({ ...formData, creatorId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              required
            >
              <option value="">Select a creator</option>
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName} (@{c.tiktokHandle})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Set Type</label>
            <select
              value={formData.setType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  setType: e.target.value as SampleSetType,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="hero">Hero</option>
              <option value="premium">Premium</option>
              <option value="mini">Mini</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKUs (comma-separated)
            </label>
            <input
              type="text"
              value={formData.skus}
              onChange={(e) => setFormData({ ...formData, skus: e.target.value })}
              placeholder="SKU-001, SKU-002"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Est. Cost ($)
              </label>
              <input
                type="number"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping ($)
              </label>
              <input
                type="number"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create Shipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// Component: Main Page
// ============================================

export default function SampleShipmentsPage() {
  const [samples, setSamples] = useState<SampleShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showNewForm, setShowNewForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>('all');
  const [setTypeFilter, setSetTypeFilter] = useState<SampleSetType | 'all'>('all');

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (setTypeFilter && setTypeFilter !== 'all') params.set('set_type', setTypeFilter);
      params.set('page', '1');
      params.set('limit', '50');

      const res = await fetch(`/api/samples?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSamples(json.data || []);
      setTotalCount(json.pagination?.total || 0);
    } catch (err) {
      console.error('Samples fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, setTypeFilter]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-3">{Array.from({length:5}).map((_,i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}</div></div>;
  }

  const filteredSamples = samples.filter((s) => {
    const statusMatch = statusFilter === 'all' || s.status === statusFilter;
    const typeMatch = setTypeFilter === 'all' || s.setType === setTypeFilter;
    return statusMatch && typeMatch;
  });

  const handleStatusChange = (shipmentId: string, newStatus: SampleStatus) => {
    setSamples(
      samples.map((s) => {
        if (s.id === shipmentId) {
          const now = new Date();
          const updated = { ...s, status: newStatus, updatedAt: now };
          if (newStatus === 'content_posted') {
            updated.contentPostedAt = now;
          } else if (newStatus === 'reminder_1') {
            updated.reminder1SentAt = now;
          } else if (newStatus === 'reminder_2') {
            updated.reminder2SentAt = now;
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleSendReminders = () => {
    const now = new Date();
    setSamples(
      samples.map((s) => {
        if (!s.deliveredAt) return s;
        const daysSinceDelivery =
          (now.getTime() - new Date(s.deliveredAt).getTime()) / (1000 * 60 * 60 * 24);

        // Send reminder 1 if 5+ days and no content
        if (daysSinceDelivery >= 5 && !s.contentPostedAt && s.status === 'delivered') {
          return {
            ...s,
            status: 'reminder_1' as SampleStatus,
            reminder1SentAt: now,
            updatedAt: now,
          };
        }
        return s;
      })
    );
  };

  const getNextStatuses = (current: SampleStatus): SampleStatus[] => {
    const statuses: SampleStatus[] = [
      'requested',
      'approved',
      'shipped',
      'delivered',
      'reminder_1',
      'reminder_2',
      'content_posted',
      'no_response',
    ];
    const currentIndex = statuses.indexOf(current);
    return statuses.slice(currentIndex + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sample Shipments</h1>
            <p className="text-gray-600 text-sm mt-1">Manage K-beauty sample operations SOP</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSendReminders}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              Send Bulk Reminders
            </button>
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Shipment
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards samples={samples} />

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SampleStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
              Filter by Set Type
            </label>
            <select
              value={setTypeFilter}
              onChange={(e) => setSetTypeFilter(e.target.value as SampleSetType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="all">All Set Types</option>
              {Object.entries(SET_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shipments Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Creator</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Set Type</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Pipeline</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Tracking</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Shipped</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Delivered</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Content URL</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">GMV</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSamples.map((sample, idx) => {
                  const statusConfig = STATUS_CONFIG[sample.status];
                  const setTypeConfig = SET_TYPE_CONFIG[sample.setType];
                  const nextStatuses = getNextStatuses(sample.status);

                  return (
                    <tr
                      key={sample.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            @{(sample as any).creator?.tiktokHandle}
                          </span>
                          <span className="text-xs text-gray-600">
                            {(sample as any).creator?.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${setTypeConfig.color}`}
                        >
                          {setTypeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <PipelineIndicator status={sample.status} />
                      </td>
                      <td className="px-6 py-4">
                        {sample.trackingNumber ? (
                          <a
                            href={`#`}
                            className="text-blue-600 hover:underline font-mono text-xs"
                          >
                            {sample.trackingNumber}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {sample.shippedAt ? (
                          new Date(sample.shippedAt).toLocaleDateString()
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {sample.deliveredAt ? (
                          new Date(sample.deliveredAt).toLocaleDateString()
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sample.contentUrl ? (
                          <a
                            href={sample.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            View Post
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {parseFloat(sample.contentGmv ?? '0') > 0 ? (
                          <span className="text-green-600">${parseFloat(sample.contentGmv ?? '0').toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">$0</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="relative group">
                            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <div className="py-1">
                                {nextStatuses.map((status) => {
                                  const config = STATUS_CONFIG[status];
                                  return (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusChange(sample.id, status)}
                                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${config.color}`}
                                    >
                                      {config.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          {sample.status === 'delivered' && !sample.contentPostedAt && (
                            <button
                              onClick={() => handleStatusChange(sample.id, 'reminder_1')}
                              className="p-2 hover:bg-gray-200 rounded transition-colors text-orange-600 hover:text-orange-700"
                              title="Send reminder"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredSamples.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-sm">
                No sample shipments match your filters
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Shipment Costs</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Product Cost:</span>
                <span className="font-medium">
                  $
                  {samples
                    .reduce((sum, s) => sum + parseFloat(s.estimatedCost ?? '0'), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping Cost:</span>
                <span className="font-medium">
                  $
                  {samples
                    .reduce((sum, s) => sum + parseFloat(s.shippingCost ?? '0'), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total Investment:</span>
                <span className="text-blue-600">
                  $
                  {(
                    samples.reduce((sum, s) => sum + parseFloat(s.estimatedCost ?? '0') + parseFloat(s.shippingCost ?? '0'), 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Content Performance</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total GMV:</span>
                <span className="font-medium text-green-600">
                  $
                  {samples
                    .reduce((sum, s) => sum + parseFloat(s.contentGmv ?? '0'), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg per Post:</span>
                <span className="font-medium">
                  $
                  {samples.filter((s) => parseFloat(s.contentGmv ?? '0') > 0).length > 0
                    ? (
                        samples.reduce((sum, s) => sum + parseFloat(s.contentGmv ?? '0'), 0) /
                        samples.filter((s) => parseFloat(s.contentGmv ?? '0') > 0).length
                      ).toFixed(0)
                    : '0'}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>ROI:</span>
                <span className="text-green-600">
                  {samples.reduce((sum, s) => sum + parseFloat(s.estimatedCost ?? '0') + parseFloat(s.shippingCost ?? '0'), 0) > 0
                    ? (
                        ((samples.reduce((sum, s) => sum + parseFloat(s.contentGmv ?? '0'), 0) -
                          samples.reduce((sum, s) => sum + parseFloat(s.estimatedCost ?? '0') + parseFloat(s.shippingCost ?? '0'), 0)) /
                          samples.reduce((sum, s) => sum + parseFloat(s.estimatedCost ?? '0') + parseFloat(s.shippingCost ?? '0'), 0)) *
                        100
                      ).toFixed(1)
                    : '0'}
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status Breakdown</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const count = samples.filter((s) => s.status === status).length;
                return (
                  <div key={status} className="flex justify-between">
                    <span className="text-gray-600">{config.label}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* New Shipment Form Modal */}
      <NewShipmentForm
        isOpen={showNewForm}
        onClose={() => setShowNewForm(false)}
      />
    </div>
  );
}
