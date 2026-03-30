'use client';

import React from 'react';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Payout {
  month: string;
  amount: number;
  status: 'pending' | 'paid';
  date: string;
  method?: string;
}

const chartData = [
  { week: 'W1', commission: 96 },
  { week: 'W2', commission: 174 },
  { week: 'W3', commission: 375 },
  { week: 'W4', commission: 294 },
  { week: 'W5', commission: 555 },
];

const payoutHistory: Payout[] = [
  {
    month: 'Mar 2026',
    amount: 555,
    status: 'pending',
    date: 'Apr 1',
  },
  {
    month: 'Feb 2026',
    amount: 643,
    status: 'paid',
    date: 'Mar 1',
    method: 'PayPal',
  },
  {
    month: 'Jan 2026',
    amount: 296,
    status: 'paid',
    date: 'Feb 1',
    method: 'PayPal',
  },
];

export default function EarningsPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-pink-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings</h1>
          <p className="text-gray-600 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Commission breakdown and payout history
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Earned */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Earned</p>
            <div className="mt-3">
              <p className="text-3xl font-bold text-gray-900">$1,494</p>
              <p className="text-xs text-gray-500 mt-1">all time</p>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">This Month</p>
            <div className="mt-3">
              <p className="text-3xl font-bold text-gray-900">$555</p>
              <p className="text-xs text-green-600 font-medium mt-1">+89%</p>
            </div>
          </div>

          {/* Commission Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Commission Rate</p>
            <div className="mt-3">
              <p className="text-3xl font-bold text-gray-900">35%</p>
              <p className="text-xs text-gray-500 mt-1">Silver tier</p>
            </div>
          </div>

          {/* Next Payout */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
            <p className="text-gray-600 text-sm font-medium">Next Payout</p>
            <div className="mt-3">
              <p className="text-3xl font-bold text-indigo-900">$555</p>
              <p className="text-xs text-indigo-600 font-medium mt-1">Apr 1</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-600" />
            Commission by Week
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
                formatter={(value) => `$${value}`}
              />
              <Bar
                dataKey="commission"
                fill="#ec4899"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payout History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-pink-600" />
                  Payout History
                </h2>
              </div>
              <div className="divide-y">
                {payoutHistory.map((payout, idx) => (
                  <div key={idx} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {payout.month}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {payout.status === 'pending'
                            ? `Processing for ${payout.date}`
                            : `Paid ${payout.date} via ${payout.method}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          ${payout.amount}
                        </p>
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-1 ${
                            payout.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {payout.status === 'pending' ? 'Pending' : 'Paid'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tip Box */}
          <div className="bg-linear-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
            <div className="flex gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Level Up to Gold
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  At Gold tier you'd earn <span className="font-bold text-green-700">$145 more this month</span> ($555 × 40% instead of 35%) plus a <span className="font-bold text-green-700">$200 monthly bonus</span>.
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  You need just <span className="text-orange-600">$150 more GMV!</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
