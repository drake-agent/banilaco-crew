'use client';

import React from 'react';
import { Package, Truck, AlertCircle } from 'lucide-react';

interface Sample {
  id: string;
  name: string;
  status: 'delivered' | 'shipped' | 'pending';
  shippedDate: string;
  tracking: string;
}

interface SampleSet {
  name: string;
  description: string;
  tier?: string;
}

const mockSamples: Sample[] = [
  {
    id: '1',
    name: 'Hero Routine Set',
    status: 'delivered',
    shippedDate: 'Feb 10',
    tracking: 'TK928...454',
  },
  {
    id: '2',
    name: 'New Product: Vitamin C Serum',
    status: 'shipped',
    shippedDate: 'Mar 24',
    tracking: 'TK931...221',
  },
];

const availableSampleSets: SampleSet[] = [
  {
    name: 'Hero Set',
    description: 'Cleanser + Toner + Serum + Moisturizer',
  },
  {
    name: 'Premium Set',
    description: 'Hero + Device + Special Mask',
    tier: 'For Gold+ tier',
  },
  {
    name: 'Mini Set',
    description: '3 mini sizes',
    tier: 'Quick try',
  },
];

const getStatusBadgeColor = (status: Sample['status']) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
  }
};

const getStatusLabel = (status: Sample['status']) => {
  switch (status) {
    case 'delivered':
      return '✓ Delivered';
    case 'shipped':
      return 'Shipped';
    case 'pending':
      return 'Pending';
  }
};

export default function SamplesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white p-6">
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
          <button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition transform hover:scale-105">
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
                {mockSamples.map((sample) => (
                  <tr key={sample.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {sample.name}
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
                      {sample.shippedDate}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {sample.tracking}
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
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
