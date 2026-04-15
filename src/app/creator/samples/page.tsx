'use client';

import React, { useState, useEffect } from 'react';
import { Package, Truck, AlertCircle } from 'lucide-react';
import type { SampleSetType, SampleStatus } from '@/types/database';

interface SampleShipmentView {
  id: string;
  setType: SampleSetType;
  status: SampleStatus;
  shippedAt: string | null;
  trackingNumber: string | null;
}

interface SampleSet {
  name: string;
  description: string;
  tier?: string;
}

const getStatusBadgeColor = (status: SampleStatus) => {
  const colors: Record<SampleStatus, string> = {
    requested: 'bg-gray-100 text-gray-800',
    approved: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    reminder_1: 'bg-orange-100 text-orange-800',
    reminder_2: 'bg-red-100 text-red-800',
    content_posted: 'bg-emerald-100 text-emerald-800',
    no_response: 'bg-gray-200 text-gray-800',
  };
  return colors[status];
};

const getStatusLabel = (status: SampleStatus) => {
  const labels: Record<SampleStatus, string> = {
    requested: 'Requested',
    approved: 'Approved',
    shipped: 'Shipped',
    delivered: 'Delivered',
    reminder_1: 'Reminder 1 Sent',
    reminder_2: 'Reminder 2 Sent',
    content_posted: 'Content Posted',
    no_response: 'No Response',
  };
  return labels[status];
};

const getSetTypeLabel = (setType: SampleSetType) => {
  const labels: Record<SampleSetType, string> = {
    hero: 'Hero Set',
    premium: 'Premium Set',
    mini: 'Mini Set',
    full: 'Full Set',
    welcome: 'Welcome Set',
  };
  return labels[setType];
};

export default function SamplesPage() {
  const [samples, setSamples] = useState<SampleShipmentView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMySamples() {
      try {
        const res = await fetch('/api/samples?limit=50');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setSamples(json.data || []);
      } catch (err) {
        console.error('Samples fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMySamples();
  }, []);

  // Available sample sets (static config, or could be fetched)
  const availableSampleSets: SampleSet[] = [
    { name: 'Hero Set', description: 'Clean It Zero + Lip Tint' },
    { name: 'Premium Set', description: 'Full skincare collection' },
    { name: 'Mini Set', description: 'Travel-size essentials' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-pink-50 to-white p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Loading your samples...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-pink-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Samples</h1>
          <p className="text-gray-600 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Track your sample shipments and request new ones
          </p>
        </div>

        {/* Request Button */}
        <div className="mb-8">
          <button className="bg-linear-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition transform hover:scale-105">
            + Request New Sample
          </button>
        </div>

        {/* Current Samples Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-pink-600" />
              Your Shipments
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Shipped Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Tracking Number
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {samples.map((sample) => (
                  <tr key={sample.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {getSetTypeLabel(sample.setType)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                          sample.status
                        )}`}
                      >
                        {getStatusLabel(sample.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {sample.shippedAt ? new Date(sample.shippedAt).toLocaleDateString() : 'Not shipped'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {sample.trackingNumber || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Sample Sets */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Sample Sets
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableSampleSets.map((set, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-lg transition"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {set.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {set.description}
                </p>
                {set.tier && (
                  <p className="text-xs font-medium text-pink-600 mb-3">
                    {set.tier}
                  </p>
                )}
                <button className="w-full bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold py-2 px-3 rounded transition">
                  Request {set.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tip Box */}
        <div className="mt-8 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Pro Tip
              </p>
              <p className="text-sm text-gray-700">
                Post content within <span className="font-bold">5 days</span> of receiving samples to maintain priority sample access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
