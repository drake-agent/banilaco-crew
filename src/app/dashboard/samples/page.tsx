'use client';

import React, { useState } from 'react';
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
// Mock Data
// ============================================

const MOCK_CREATORS: Creator[] = [
  {
    id: '1',
    tiktok_handle: '@glowingkim',
    display_name: 'Kim Park',
    email: 'kim@example.com',
    follower_count: 125000,
    avg_views: 45000,
    engagement_rate: 4.2,
    tier: 'gold',
    source: 'dm_outreach',
    status: 'active',
    total_gmv: 12500,
    monthly_gmv: 3200,
    total_content_count: 18,
    monthly_content_count: 5,
    commission_rate: 5,
    joined_at: '2025-08-15',
    tags: ['skincare', 'routine'],
    competitor_brands: ['brands_x', 'brands_y'],
    created_at: '2025-08-15',
    updated_at: '2026-03-27',
  },
  {
    id: '2',
    tiktok_handle: '@beautysarah',
    display_name: 'Sarah Chen',
    email: 'sarah@example.com',
    follower_count: 87000,
    avg_views: 32000,
    engagement_rate: 3.8,
    tier: 'silver',
    source: 'open_collab',
    status: 'active',
    total_gmv: 8900,
    monthly_gmv: 2100,
    total_content_count: 12,
    monthly_content_count: 3,
    commission_rate: 4,
    joined_at: '2025-10-01',
    tags: ['makeup', 'tutorials'],
    competitor_brands: ['brands_a'],
    created_at: '2025-10-01',
    updated_at: '2026-03-27',
  },
  {
    id: '3',
    tiktok_handle: '@skincarejess',
    display_name: 'Jessica Ramos',
    email: 'jess@example.com',
    follower_count: 42000,
    avg_views: 15000,
    engagement_rate: 5.1,
    tier: 'bronze',
    source: 'referral',
    status: 'active',
    total_gmv: 4200,
    monthly_gmv: 950,
    total_content_count: 8,
    monthly_content_count: 2,
    commission_rate: 3,
    joined_at: '2025-12-10',
    tags: ['skincare', 'reviews'],
    competitor_brands: [],
    created_at: '2025-12-10',
    updated_at: '2026-03-27',
  },
  {
    id: '4',
    tiktok_handle: '@makeupmaestro',
    display_name: 'Marco Delgado',
    email: 'marco@example.com',
    follower_count: 156000,
    avg_views: 58000,
    engagement_rate: 3.9,
    tier: 'diamond',
    source: 'dm_outreach',
    status: 'active',
    total_gmv: 18900,
    monthly_gmv: 5100,
    total_content_count: 22,
    monthly_content_count: 6,
    commission_rate: 6,
    joined_at: '2025-07-20',
    tags: ['makeup', 'style'],
    competitor_brands: ['brands_x', 'brands_z'],
    created_at: '2025-07-20',
    updated_at: '2026-03-27',
  },
  {
    id: '5',
    tiktok_handle: '@luminousalex',
    display_name: 'Alex Thompson',
    email: 'alex@example.com',
    follower_count: 65000,
    avg_views: 24000,
    engagement_rate: 4.4,
    tier: 'silver',
    source: 'open_collab',
    status: 'active',
    total_gmv: 7150,
    monthly_gmv: 1800,
    total_content_count: 10,
    monthly_content_count: 2,
    commission_rate: 4,
    joined_at: '2025-11-05',
    tags: ['skincare', 'wellness'],
    competitor_brands: ['brands_b'],
    created_at: '2025-11-05',
    updated_at: '2026-03-27',
  },
];

const MOCK_SAMPLES: SampleShipment[] = [
  {
    id: 'SHIP001',
    creator_id: '1',
    creator: MOCK_CREATORS[0],
    set_type: 'hero',
    status: 'content_posted',
    tracking_number: 'TRK001234567890',
    carrier: 'FedEx',
    shipped_at: '2026-03-10',
    delivered_at: '2026-03-15',
    content_posted_at: '2026-03-18',
    content_url: 'https://tiktok.com/@glowingkim/video/123456789',
    content_gmv: 2450,
    sku_list: ['SKU-001', 'SKU-002', 'SKU-003'],
    estimated_cost: 185,
    shipping_cost: 25,
    notes: 'Excellent engagement on first post',
    created_at: '2026-03-09',
    updated_at: '2026-03-18',
  },
  {
    id: 'SHIP002',
    creator_id: '2',
    creator: MOCK_CREATORS[1],
    set_type: 'premium',
    status: 'reminder_2',
    tracking_number: 'TRK002345678901',
    carrier: 'DHL',
    shipped_at: '2026-03-12',
    delivered_at: '2026-03-17',
    reminder_1_sent_at: '2026-03-22',
    reminder_2_sent_at: '2026-03-27',
    content_gmv: 0,
    sku_list: ['SKU-004', 'SKU-005'],
    estimated_cost: 145,
    shipping_cost: 20,
    notes: 'No response yet, sent 2nd reminder',
    created_at: '2026-03-11',
    updated_at: '2026-03-27',
  },
  {
    id: 'SHIP003',
    creator_id: '3',
    creator: MOCK_CREATORS[2],
    set_type: 'mini',
    status: 'delivered',
    tracking_number: 'TRK003456789012',
    carrier: 'UPS',
    shipped_at: '2026-03-14',
    delivered_at: '2026-03-19',
    content_gmv: 0,
    sku_list: ['SKU-006'],
    estimated_cost: 95,
    shipping_cost: 15,
    notes: 'Awaiting content',
    created_at: '2026-03-13',
    updated_at: '2026-03-19',
  },
  {
    id: 'SHIP004',
    creator_id: '4',
    creator: MOCK_CREATORS[3],
    set_type: 'hero',
    status: 'content_posted',
    tracking_number: 'TRK004567890123',
    carrier: 'FedEx',
    shipped_at: '2026-03-08',
    delivered_at: '2026-03-13',
    content_posted_at: '2026-03-16',
    content_url: 'https://tiktok.com/@makeupmaestro/video/987654321',
    content_gmv: 5890,
    sku_list: ['SKU-001', 'SKU-002', 'SKU-003', 'SKU-007'],
    estimated_cost: 220,
    shipping_cost: 30,
    notes: 'Top performer - 5.8K GMV',
    created_at: '2026-03-07',
    updated_at: '2026-03-16',
  },
  {
    id: 'SHIP005',
    creator_id: '5',
    creator: MOCK_CREATORS[4],
    set_type: 'premium',
    status: 'reminder_1',
    tracking_number: 'TRK005678901234',
    carrier: 'DHL',
    shipped_at: '2026-03-16',
    delivered_at: '2026-03-21',
    reminder_1_sent_at: '2026-03-26',
    content_gmv: 0,
    sku_list: ['SKU-008', 'SKU-009'],
    estimated_cost: 155,
    shipping_cost: 22,
    notes: 'First reminder sent',
    created_at: '2026-03-15',
    updated_at: '2026-03-26',
  },
  {
    id: 'SHIP006',
    creator_id: '1',
    creator: MOCK_CREATORS[0],
    set_type: 'premium',
    status: 'shipped',
    tracking_number: 'TRK006789012345',
    carrier: 'UPS',
    shipped_at: '2026-03-25',
    content_gmv: 0,
    sku_list: ['SKU-010', 'SKU-011'],
    estimated_cost: 165,
    shipping_cost: 23,
    notes: 'In transit',
    created_at: '2026-03-24',
    updated_at: '2026-03-25',
  },
  {
    id: 'SHIP007',
    creator_id: '2',
    creator: MOCK_CREATORS[1],
    set_type: 'hero',
    status: 'approved',
    content_gmv: 0,
    sku_list: ['SKU-001', 'SKU-002', 'SKU-003', 'SKU-012'],
    estimated_cost: 200,
    shipping_cost: 28,
    notes: 'Ready to ship',
    created_at: '2026-03-26',
    updated_at: '2026-03-26',
  },
  {
    id: 'SHIP008',
    creator_id: '3',
    creator: MOCK_CREATORS[2],
    set_type: 'mini',
    status: 'requested',
    content_gmv: 0,
    sku_list: ['SKU-013'],
    estimated_cost: 85,
    shipping_cost: 12,
    notes: 'Pending approval',
    created_at: '2026-03-26',
    updated_at: '2026-03-26',
  },
  {
    id: 'SHIP009',
    creator_id: '4',
    creator: MOCK_CREATORS[3],
    set_type: 'premium',
    status: 'content_posted',
    tracking_number: 'TRK009901234567',
    carrier: 'FedEx',
    shipped_at: '2026-03-05',
    delivered_at: '2026-03-10',
    content_posted_at: '2026-03-13',
    content_url: 'https://tiktok.com/@makeupmaestro/video/456789123',
    content_gmv: 3200,
    sku_list: ['SKU-014', 'SKU-015'],
    estimated_cost: 145,
    shipping_cost: 20,
    notes: 'Strong performance',
    created_at: '2026-03-04',
    updated_at: '2026-03-13',
  },
  {
    id: 'SHIP010',
    creator_id: '5',
    creator: MOCK_CREATORS[4],
    set_type: 'mini',
    status: 'no_response',
    tracking_number: 'TRK010012345678',
    carrier: 'UPS',
    shipped_at: '2026-03-02',
    delivered_at: '2026-03-07',
    reminder_1_sent_at: '2026-03-12',
    reminder_2_sent_at: '2026-03-17',
    content_gmv: 0,
    sku_list: ['SKU-016'],
    estimated_cost: 75,
    shipping_cost: 10,
    notes: 'No engagement',
    created_at: '2026-03-01',
    updated_at: '2026-03-17',
  },
  {
    id: 'SHIP011',
    creator_id: '1',
    creator: MOCK_CREATORS[0],
    set_type: 'hero',
    status: 'delivered',
    tracking_number: 'TRK011123456789',
    carrier: 'DHL',
    shipped_at: '2026-03-20',
    delivered_at: '2026-03-24',
    content_gmv: 0,
    sku_list: ['SKU-017', 'SKU-018'],
    estimated_cost: 195,
    shipping_cost: 26,
    notes: 'Recently delivered',
    created_at: '2026-03-19',
    updated_at: '2026-03-24',
  },
  {
    id: 'SHIP012',
    creator_id: '2',
    creator: MOCK_CREATORS[1],
    set_type: 'mini',
    status: 'delivered',
    tracking_number: 'TRK012234567890',
    carrier: 'FedEx',
    shipped_at: '2026-03-22',
    delivered_at: '2026-03-26',
    content_gmv: 0,
    sku_list: ['SKU-019'],
    estimated_cost: 88,
    shipping_cost: 14,
    notes: 'Awaiting content',
    created_at: '2026-03-21',
    updated_at: '2026-03-26',
  },
];

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
    (s) => new Date(s.shipped_at || '') >= weekAgo && s.shipped_at
  ).length;
  const totalSentCumulative = samples.filter((s) => s.shipped_at).length;
  const pendingShipments = samples.filter((s) =>
    ['requested', 'approved'].includes(s.status)
  ).length;
  const awaitingContent = samples.filter(
    (s) =>
      (s.status === 'delivered' ||
        s.status === 'reminder_1' ||
        s.status === 'reminder_2') &&
      !s.content_posted_at
  ).length;
  const withContent = samples.filter((s) => s.status === 'content_posted').length;
  const postConversionRate =
    samples.filter((s) => s.shipped_at).length > 0
      ? ((withContent / samples.filter((s) => s.shipped_at).length) * 100).toFixed(1)
      : '0';

  const reminder1Needed = samples.filter((s) => {
    if (!s.delivered_at) return false;
    const daysSinceDelivery = (now.getTime() - new Date(s.delivered_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery >= 5 && daysSinceDelivery < 10 && !s.content_posted_at;
  }).length;

  const reminder2Needed = samples.filter((s) => {
    if (!s.delivered_at) return false;
    const daysSinceDelivery = (now.getTime() - new Date(s.delivered_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery >= 10 && !s.content_posted_at;
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
  creators: Creator[];
}

const NewShipmentForm: React.FC<NewShipmentFormProps> = ({ isOpen, onClose, creators }) => {
  const [formData, setFormData] = useState({
    creator_id: '',
    set_type: 'hero' as SampleSetType,
    skus: '',
    estimated_cost: '',
    shipping_cost: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission (in real app would save to DB)
    console.log('New shipment:', formData);
    setFormData({
      creator_id: '',
      set_type: 'hero',
      skus: '',
      estimated_cost: '',
      shipping_cost: '',
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
              value={formData.creator_id}
              onChange={(e) =>
                setFormData({ ...formData, creator_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              required
            >
              <option value="">Select a creator</option>
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name} (@{c.tiktok_handle})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Set Type</label>
            <select
              value={formData.set_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  set_type: e.target.value as SampleSetType,
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
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
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
                value={formData.shipping_cost}
                onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value })}
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
  const [samples, setSamples] = useState<SampleShipment[]>(MOCK_SAMPLES);
  const [showNewForm, setShowNewForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>('all');
  const [setTypeFilter, setSetTypeFilter] = useState<SampleSetType | 'all'>('all');

  const filteredSamples = samples.filter((s) => {
    const statusMatch = statusFilter === 'all' || s.status === statusFilter;
    const typeMatch = setTypeFilter === 'all' || s.set_type === setTypeFilter;
    return statusMatch && typeMatch;
  });

  const handleStatusChange = (shipmentId: string, newStatus: SampleStatus) => {
    setSamples(
      samples.map((s) => {
        if (s.id === shipmentId) {
          const updated = { ...s, status: newStatus, updated_at: new Date().toISOString() };
          if (newStatus === 'content_posted') {
            updated.content_posted_at = new Date().toISOString();
          } else if (newStatus === 'reminder_1') {
            updated.reminder_1_sent_at = new Date().toISOString();
          } else if (newStatus === 'reminder_2') {
            updated.reminder_2_sent_at = new Date().toISOString();
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
        if (!s.delivered_at) return s;
        const daysSinceDelivery =
          (now.getTime() - new Date(s.delivered_at).getTime()) / (1000 * 60 * 60 * 24);

        // Send reminder 1 if 5+ days and no content
        if (daysSinceDelivery >= 5 && !s.content_posted_at && s.status === 'delivered') {
          return {
            ...s,
            status: 'reminder_1' as SampleStatus,
            reminder_1_sent_at: now.toISOString(),
            updated_at: now.toISOString(),
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
                  const setTypeConfig = SET_TYPE_CONFIG[sample.set_type];
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
                            @{sample.creator?.tiktok_handle}
                          </span>
                          <span className="text-xs text-gray-600">
                            {sample.creator?.display_name}
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
                        {sample.tracking_number ? (
                          <a
                            href={`#`}
                            className="text-blue-600 hover:underline font-mono text-xs"
                          >
                            {sample.tracking_number}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {sample.shipped_at ? (
                          new Date(sample.shipped_at).toLocaleDateString()
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {sample.delivered_at ? (
                          new Date(sample.delivered_at).toLocaleDateString()
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sample.content_url ? (
                          <a
                            href={sample.content_url}
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
                        {sample.content_gmv > 0 ? (
                          <span className="text-green-600">${sample.content_gmv.toLocaleString()}</span>
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
                          {sample.status === 'delivered' && !sample.content_posted_at && (
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
                    .reduce((sum, s) => sum + (s.estimated_cost || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping Cost:</span>
                <span className="font-medium">
                  $
                  {samples
                    .reduce((sum, s) => sum + (s.shipping_cost || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total Investment:</span>
                <span className="text-blue-600">
                  $
                  {(
                    samples.reduce((sum, s) => sum + (s.estimated_cost || 0) + (s.shipping_cost || 0), 0)
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
                    .reduce((sum, s) => sum + (s.content_gmv || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg per Post:</span>
                <span className="font-medium">
                  $
                  {samples.filter((s) => s.content_gmv > 0).length > 0
                    ? (
                        samples.reduce((sum, s) => sum + (s.content_gmv || 0), 0) /
                        samples.filter((s) => s.content_gmv > 0).length
                      ).toFixed(0)
                    : '0'}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>ROI:</span>
                <span className="text-green-600">
                  {samples.reduce((sum, s) => sum + (s.estimated_cost || 0) + (s.shipping_cost || 0), 0) > 0
                    ? (
                        ((samples.reduce((sum, s) => sum + (s.content_gmv || 0), 0) -
                          samples.reduce((sum, s) => sum + (s.estimated_cost || 0) + (s.shipping_cost || 0), 0)) /
                          samples.reduce((sum, s) => sum + (s.estimated_cost || 0) + (s.shipping_cost || 0), 0)) *
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
        creators={MOCK_CREATORS}
      />
    </div>
  );
}
