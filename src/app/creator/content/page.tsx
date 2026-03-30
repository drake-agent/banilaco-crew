'use client';

import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  type: 'Routine' | 'ASMR' | 'Review' | 'GRWM' | 'Haul';
  views: number;
  gmv: number;
  ctr: number;
  cvr: number;
  posted: string;
  status: 'top' | 'good' | 'average' | 'below';
}

const mockVideos: Video[] = [
  {
    id: '1',
    title: 'Morning Routine with banila co',
    type: 'Routine',
    views: 45000,
    gmv: 1850,
    ctr: 4.2,
    cvr: 2.8,
    posted: 'Mar 22',
    status: 'top',
  },
  {
    id: '2',
    title: 'ASMR Unboxing K-beauty Set',
    type: 'ASMR',
    views: 31000,
    gmv: 1250,
    ctr: 3.8,
    cvr: 2.1,
    posted: 'Mar 15',
    status: 'good',
  },
  {
    id: '3',
    title: 'Honest Review: Clean It Zero',
    type: 'Review',
    views: 28000,
    gmv: 980,
    ctr: 3.1,
    cvr: 1.9,
    posted: 'Mar 18',
    status: 'average',
  },
  {
    id: '4',
    title: 'GRWM for Date Night',
    type: 'GRWM',
    views: 18500,
    gmv: 580,
    ctr: 2.5,
    cvr: 1.4,
    posted: 'Mar 10',
    status: 'below',
  },
  {
    id: '5',
    title: 'K-beauty Haul Under $30',
    type: 'Haul',
    views: 12000,
    gmv: 320,
    ctr: 2.1,
    cvr: 1.1,
    posted: 'Mar 5',
    status: 'below',
  },
];

const getStatusBadgeColor = (status: Video['status']) => {
  switch (status) {
    case 'top':
      return 'bg-green-100 text-green-800';
    case 'good':
      return 'bg-blue-100 text-blue-800';
    case 'average':
      return 'bg-yellow-100 text-yellow-800';
    case 'below':
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: Video['status']) => {
  switch (status) {
    case 'top':
      return '🔥 Top';
    case 'good':
      return 'Good';
    case 'average':
      return 'Average';
    case 'below':
      return 'Below Avg';
  }
};

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export default function ContentPage() {
  const totalViews = mockVideos.reduce((sum, v) => sum + v.views, 0);
  const totalGmv = mockVideos.reduce((sum, v) => sum + v.gmv, 0);
  const avgCtr = (mockVideos.reduce((sum, v) => sum + v.ctr, 0) / mockVideos.length).toFixed(1);
  const bestFormat = 'Routine';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Content</h1>
          <p className="text-gray-600 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Track performance of each video
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Video
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Views
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    GMV
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    CVR
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Posted
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockVideos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {video.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-xs font-medium">
                        {video.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      {formatNumber(video.views)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      ${video.gmv.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {video.ctr}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {video.cvr}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {video.posted}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                          video.status
                        )}`}
                      >
                        {getStatusLabel(video.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium">Total Views</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatNumber(totalViews)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-medium">Total GMV</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ${totalGmv.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-500">
            <p className="text-gray-600 text-sm font-medium">Best Format</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {bestFormat}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-medium">Avg CTR</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {avgCtr}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
