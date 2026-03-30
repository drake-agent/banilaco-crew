'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

// ============================================
// Types
// ============================================

type ShipmentStatus =
  | 'requested'
  | 'approved'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_attempt'
  | 'returned'
  | 'exception';

type CarrierCode = 'usps' | 'ups' | 'fedex' | 'dhl';

interface ShipmentRow {
  id: string;
  creator_handle: string;
  creator_name: string;
  set_type: 'hero' | 'premium' | 'mini';
  status: ShipmentStatus;
  tracking_number?: string;
  carrier?: CarrierCode;
  shipped_at?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  days_in_transit: number;
  last_location?: string;
  last_checkpoint?: string;
  content_posted: boolean;
}

// ============================================
// Mock Data
// ============================================

const MOCK_SHIPMENTS: ShipmentRow[] = [
  {
    id: '1', creator_handle: '@glowwithsara', creator_name: 'Sara Kim',
    set_type: 'hero', status: 'delivered', tracking_number: '9400111899223100001234',
    carrier: 'usps', shipped_at: '2026-03-15', delivered_at: '2026-03-19',
    days_in_transit: 4, last_location: 'Los Angeles, CA', last_checkpoint: 'Delivered to front door',
    content_posted: true,
  },
  {
    id: '2', creator_handle: '@beautybymia', creator_name: 'Mia Chen',
    set_type: 'premium', status: 'delivered', tracking_number: '9400111899223100005678',
    carrier: 'usps', shipped_at: '2026-03-14', delivered_at: '2026-03-18',
    days_in_transit: 4, last_location: 'New York, NY', last_checkpoint: 'Delivered, left with individual',
    content_posted: true,
  },
  {
    id: '3', creator_handle: '@skincarejess', creator_name: 'Jessica Park',
    set_type: 'hero', status: 'in_transit', tracking_number: '1Z999AA10123456784',
    carrier: 'ups', shipped_at: '2026-03-24', days_in_transit: 3,
    estimated_delivery: '2026-03-28', last_location: 'Memphis, TN',
    last_checkpoint: 'In transit to destination', content_posted: false,
  },
  {
    id: '4', creator_handle: '@kbeautylover', creator_name: 'Emily Watson',
    set_type: 'mini', status: 'out_for_delivery', tracking_number: '9400111899223100009012',
    carrier: 'usps', shipped_at: '2026-03-23', days_in_transit: 4,
    estimated_delivery: '2026-03-27', last_location: 'Chicago, IL',
    last_checkpoint: 'Out for delivery', content_posted: false,
  },
  {
    id: '5', creator_handle: '@cleanbeautyali', creator_name: 'Ali Johnson',
    set_type: 'hero', status: 'shipped', tracking_number: '785612345678',
    carrier: 'fedex', shipped_at: '2026-03-26', days_in_transit: 1,
    estimated_delivery: '2026-03-30', last_location: 'Ontario, CA',
    last_checkpoint: 'Picked up', content_posted: false,
  },
  {
    id: '6', creator_handle: '@tiktokmakeup', creator_name: 'Danielle Lee',
    set_type: 'premium', status: 'failed_attempt', tracking_number: '9400111899223100003456',
    carrier: 'usps', shipped_at: '2026-03-20', days_in_transit: 7,
    last_location: 'Houston, TX', last_checkpoint: 'No authorized recipient available',
    content_posted: false,
  },
  {
    id: '7', creator_handle: '@skinwithluna', creator_name: 'Luna Nguyen',
    set_type: 'hero', status: 'returned', tracking_number: '9400111899223100007890',
    carrier: 'usps', shipped_at: '2026-03-10', days_in_transit: 14,
    last_location: 'Return to sender', last_checkpoint: 'Returned — incorrect address',
    content_posted: false,
  },
  {
    id: '8', creator_handle: '@beautyhaul', creator_name: 'Chloe Martinez',
    set_type: 'mini', status: 'requested', days_in_transit: 0,
    content_posted: false,
  },
  {
    id: '9', creator_handle: '@vibecheck', creator_name: 'Taylor Reed',
    set_type: 'hero', status: 'approved', days_in_transit: 0,
    content_posted: false,
  },
  {
    id: '10', creator_handle: '@skincaregoals', creator_name: 'Rachel Wong',
    set_type: 'premium', status: 'delivered', tracking_number: '9400111899223100002222',
    carrier: 'usps', shipped_at: '2026-03-12', delivered_at: '2026-03-16',
    days_in_transit: 4, last_location: 'San Francisco, CA', last_checkpoint: 'Delivered to mailbox',
    content_posted: false,
  },
  {
    id: '11', creator_handle: '@glossyboss', creator_name: 'Sophia Patel',
    set_type: 'hero', status: 'in_transit', tracking_number: '1Z999AA10123456790',
    carrier: 'ups', shipped_at: '2026-03-25', days_in_transit: 2,
    estimated_delivery: '2026-03-29', last_location: 'Louisville, KY',
    last_checkpoint: 'Departed facility', content_posted: false,
  },
  {
    id: '12', creator_handle: '@dewydani', creator_name: 'Dani Flores',
    set_type: 'premium', status: 'delivered', tracking_number: '9400111899223100004444',
    carrier: 'usps', shipped_at: '2026-03-08', delivered_at: '2026-03-12',
    days_in_transit: 4, last_location: 'Seattle, WA', last_checkpoint: 'Delivered',
    content_posted: true,
  },
];

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; bg: string; icon: any }> = {
  requested:        { label: 'Requested',        color: 'text-gray-500',   bg: 'bg-gray-100',    icon: Clock },
  approved:         { label: 'Approved',         color: 'text-blue-600',   bg: 'bg-blue-50',     icon: CheckCircle2 },
  shipped:          { label: 'Shipped',          color: 'text-indigo-600', bg: 'bg-indigo-50',   icon: Package },
  in_transit:       { label: 'In Transit',       color: 'text-amber-600',  bg: 'bg-amber-50',    icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-600', bg: 'bg-orange-50',   icon: MapPin },
  delivered:        { label: 'Delivered',         color: 'text-green-600',  bg: 'bg-green-50',    icon: CheckCircle2 },
  failed_attempt:   { label: 'Failed Attempt',   color: 'text-red-500',    bg: 'bg-red-50',      icon: AlertTriangle },
  returned:         { label: 'Returned',         color: 'text-red-700',    bg: 'bg-red-100',     icon: RotateCcw },
  exception:        { label: 'Exception',        color: 'text-red-600',    bg: 'bg-red-50',      icon: XCircle },
};

const CARRIER_LABELS: Record<CarrierCode, string> = {
  usps: 'USPS', ups: 'UPS', fedex: 'FedEx', dhl: 'DHL',
};

const CARRIER_TRACK_URL: Record<CarrierCode, (tn: string) => string> = {
  usps: (tn) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`,
  ups: (tn) => `https://www.ups.com/track?tracknum=${tn}`,
  fedex: (tn) => `https://www.fedex.com/fedextrack/?trknbr=${tn}`,
  dhl: (tn) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${tn}`,
};

// ============================================
// Analytics Helpers
// ============================================

function computeAnalytics(shipments: ShipmentRow[]) {
  const total = shipments.length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;
  const inTransitGroup = shipments.filter((s) =>
    ['shipped', 'in_transit', 'out_for_delivery'].includes(s.status)
  ).length;
  const failed = shipments.filter((s) =>
    ['failed_attempt', 'returned', 'exception'].includes(s.status)
  ).length;
  const pending = shipments.filter((s) =>
    ['requested', 'approved'].includes(s.status)
  ).length;

  const deliveredShipments = shipments.filter((s) => s.status === 'delivered');
  const avgDays = deliveredShipments.length
    ? deliveredShipments.reduce((s, r) => s + r.days_in_transit, 0) / deliveredShipments.length
    : 0;

  const shippedOrDelivered = shipments.filter((s) =>
    !['requested', 'approved'].includes(s.status)
  ).length;
  const deliveryRate = shippedOrDelivered ? (delivered / shippedOrDelivered) * 100 : 0;

  // 콘텐츠 전환율: 도착 → 콘텐츠 포스팅
  const contentPosted = deliveredShipments.filter((s) => s.content_posted).length;
  const contentRate = deliveredShipments.length
    ? (contentPosted / deliveredShipments.length) * 100
    : 0;

  return { total, delivered, inTransitGroup, failed, pending, avgDays, deliveryRate, contentRate, contentPosted };
}

// ============================================
// Component
// ============================================

export default function ShippingDashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');
  const [carrierFilter, setCarrierFilter] = useState<CarrierCode | 'all'>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return MOCK_SHIPMENTS.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (carrierFilter !== 'all' && s.carrier !== carrierFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.creator_handle.toLowerCase().includes(q) ||
          s.creator_name.toLowerCase().includes(q) ||
          (s.tracking_number || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, statusFilter, carrierFilter]);

  const analytics = computeAnalytics(MOCK_SHIPMENTS);

  // Chart data
  const statusPieData = [
    { name: 'Delivered', value: analytics.delivered, color: '#22c55e' },
    { name: 'In Transit', value: analytics.inTransitGroup, color: '#f59e0b' },
    { name: 'Pending', value: analytics.pending, color: '#94a3b8' },
    { name: 'Failed/Returned', value: analytics.failed, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const carrierData = (['usps', 'ups', 'fedex', 'dhl'] as CarrierCode[]).map((c) => {
    const carrierShipments = MOCK_SHIPMENTS.filter((s) => s.carrier === c);
    const del = carrierShipments.filter((s) => s.status === 'delivered');
    return {
      carrier: CARRIER_LABELS[c],
      count: carrierShipments.length,
      avgDays: del.length ? +(del.reduce((s, r) => s + r.days_in_transit, 0) / del.length).toFixed(1) : 0,
    };
  }).filter((d) => d.count > 0);

  const weeklyData = [
    { week: 'W1', shipped: 8, delivered: 6 },
    { week: 'W2', shipped: 12, delivered: 10 },
    { week: 'W3', shipped: 15, delivered: 11 },
    { week: 'W4', shipped: 10, delivered: 8 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping & Delivery</h1>
          <p className="text-sm text-gray-500 mt-1">
            샘플 배송 추적 및 도착 현황 대시보드
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium">
          <RefreshCw className="w-4 h-4" />
          Sync All Tracking
        </button>
      </div>

      {/* =========== KPI Cards =========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Shipped"
          value={analytics.total - analytics.pending}
          sub={`${analytics.pending} pending`}
          icon={<Package className="w-5 h-5 text-indigo-600" />}
          bg="bg-indigo-50"
        />
        <StatCard
          label="Delivered"
          value={analytics.delivered}
          sub={`${analytics.deliveryRate.toFixed(0)}% delivery rate`}
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
          trend={analytics.deliveryRate >= 80 ? 'up' : 'down'}
        />
        <StatCard
          label="Avg. Delivery Days"
          value={analytics.avgDays.toFixed(1)}
          sub="days from shipped"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          bg="bg-amber-50"
          trend={analytics.avgDays <= 5 ? 'up' : 'down'}
        />
        <StatCard
          label="Content Posted"
          value={`${analytics.contentPosted}/${analytics.delivered}`}
          sub={`${analytics.contentRate.toFixed(0)}% conversion`}
          icon={<ArrowUpRight className="w-5 h-5 text-pink-600" />}
          bg="bg-pink-50"
          trend={analytics.contentRate >= 50 ? 'up' : 'down'}
        />
      </div>

      {/* =========== Charts Row =========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Breakdown Pie */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Breakdown</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                  dataKey="value" paddingAngle={3}>
                  {statusPieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {statusPieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Carrier Performance */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Carrier Performance</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carrierData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="carrier" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Shipments" fill="#ec4899" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgDays" name="Avg Days" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Shipment Trend */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Weekly Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="shipped" name="Shipped" stroke="#ec4899" fill="#fce7f3" />
                <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#22c55e" fill="#dcfce7" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* =========== Pipeline Summary =========== */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Shipping Pipeline</h3>
        <div className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              ['requested', 'Requested'],
              ['approved', 'Approved'],
              ['shipped', 'Shipped'],
              ['in_transit', 'In Transit'],
              ['out_for_delivery', 'Out for Delivery'],
              ['delivered', 'Delivered'],
            ] as [ShipmentStatus, string][]
          ).map(([status, label], i) => {
            const count = MOCK_SHIPMENTS.filter((s) => s.status === status).length;
            const conf = STATUS_CONFIG[status];
            return (
              <React.Fragment key={status}>
                {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
                <button
                  onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                  className={`flex flex-col items-center px-4 py-3 rounded-lg min-w-[100px] transition-all ${
                    statusFilter === status
                      ? `${conf.bg} ring-2 ring-offset-1 ring-pink-300`
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xl font-bold ${conf.color}`}>{count}</span>
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">{label}</span>
                </button>
              </React.Fragment>
            );
          })}
          {/* Failed/Returned */}
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          <div className="flex flex-col items-center px-4 py-3 rounded-lg min-w-[100px] bg-red-50/50">
            <span className="text-xl font-bold text-red-500">{analytics.failed}</span>
            <span className="text-[11px] text-gray-500">Issues</span>
          </div>
        </div>
      </div>

      {/* =========== Filters & Table =========== */}
      <div className="bg-white rounded-xl border">
        {/* Filters */}
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search creator or tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value as any)}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="all">All Carriers</option>
            {Object.entries(CARRIER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left py-3 px-4 font-medium">Creator</th>
                <th className="text-left py-3 px-4 font-medium">Set</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Carrier</th>
                <th className="text-left py-3 px-4 font-medium">Tracking</th>
                <th className="text-left py-3 px-4 font-medium">Days</th>
                <th className="text-left py-3 px-4 font-medium">Location</th>
                <th className="text-left py-3 px-4 font-medium">Content</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((s) => {
                const conf = STATUS_CONFIG[s.status];
                const StatusIcon = conf.icon;
                const isExpanded = expandedRow === s.id;

                return (
                  <React.Fragment key={s.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(isExpanded ? null : s.id)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{s.creator_name}</div>
                        <div className="text-xs text-gray-500">{s.creator_handle}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          s.set_type === 'hero' ? 'bg-pink-100 text-pink-700'
                            : s.set_type === 'premium' ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {s.set_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${conf.bg} ${conf.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {conf.label}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {s.carrier ? CARRIER_LABELS[s.carrier] : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {s.tracking_number ? (
                          <a
                            href={s.carrier ? CARRIER_TRACK_URL[s.carrier](s.tracking_number) : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:text-pink-700 font-mono text-xs flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {s.tracking_number.slice(0, 12)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {s.days_in_transit > 0 ? (
                          <span className={`font-medium ${
                            s.days_in_transit > 7 ? 'text-red-500' : s.days_in_transit > 5 ? 'text-amber-500' : 'text-gray-700'
                          }`}>
                            {s.days_in_transit}d
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs max-w-[150px] truncate">
                        {s.last_location || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {s.content_posted ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Posted
                          </span>
                        ) : s.status === 'delivered' ? (
                          <span className="text-amber-500 text-xs font-medium">Waiting</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-gray-500">Shipped</span>
                              <div className="font-medium mt-0.5">{s.shipped_at || 'Not yet'}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Est. Delivery</span>
                              <div className="font-medium mt-0.5">{s.estimated_delivery || '—'}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Delivered</span>
                              <div className="font-medium mt-0.5">{s.delivered_at || '—'}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Last Update</span>
                              <div className="font-medium mt-0.5">{s.last_checkpoint || '—'}</div>
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

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No shipments match your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* =========== Action Items =========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Needs Attention */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Needs Attention ({analytics.failed})
          </h3>
          <div className="space-y-2">
            {MOCK_SHIPMENTS.filter((s) =>
              ['failed_attempt', 'returned', 'exception'].includes(s.status)
            ).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{s.creator_name}</div>
                  <div className="text-xs text-gray-500">{s.last_checkpoint}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[s.status].bg} ${STATUS_CONFIG[s.status].color}`}>
                  {STATUS_CONFIG[s.status].label}
                </span>
              </div>
            ))}
            {analytics.failed === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">All shipments on track!</p>
            )}
          </div>
        </div>

        {/* Awaiting Content */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Delivered — Awaiting Content
          </h3>
          <div className="space-y-2">
            {MOCK_SHIPMENTS.filter((s) => s.status === 'delivered' && !s.content_posted).map((s) => {
              const daysSinceDelivery = s.delivered_at
                ? Math.ceil((Date.now() - new Date(s.delivered_at).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{s.creator_name}</div>
                    <div className="text-xs text-gray-500">
                      Delivered {daysSinceDelivery}d ago — {s.set_type} set
                    </div>
                  </div>
                  <button className="text-xs px-3 py-1.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
                    Send Reminder
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function StatCard({
  label,
  value,
  sub,
  icon,
  bg,
  trend,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  bg: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 inline" /> : <ArrowDownRight className="w-3.5 h-3.5 inline" />}
          </span>
        )}
      </div>
      <span className="text-xs text-gray-400">{sub}</span>
    </div>
  );
}
