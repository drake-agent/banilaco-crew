'use client';

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const weeklyData = [
  { week: 'W1', views: 12000, gmv: 320, commission: 96 },
  { week: 'W2', views: 18500, gmv: 580, commission: 174 },
  { week: 'W3', views: 31000, gmv: 1250, commission: 375 },
  { week: 'W4', views: 28000, gmv: 980, commission: 294 },
  { week: 'W5', views: 45000, gmv: 1850, commission: 555 },
];

const stats = [
  {
    label: 'Monthly GMV',
    value: '$850',
    change: '+42%',
    icon: '💳',
  },
  {
    label: 'Commission Earned',
    value: '$298',
    change: '+38%',
    icon: '💰',
  },
  {
    label: 'Total Views',
    value: '134.5K',
    change: '+25%',
    icon: '👁️',
  },
  {
    label: 'Content Posted',
    value: '5',
    change: '+67%',
    icon: '🎬',
  },
  {
    label: 'Avg CTR',
    value: '3.1%',
    change: '-18%',
    icon: '🎯',
  },
];

export default function MyPerformance() {
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900">My Performance</h1>
          <p className="text-gray-600 mt-2">Last 5 weeks · Keep going, you're almost Gold! 🔥</p>
          <div className="mt-4 inline-block px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 text-sm font-semibold rounded-full">
            🥈 Silver · 35% Commission
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-sm font-semibold mt-2 ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </p>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Views Trend */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Views Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#ec4899"
                    fillOpacity={1}
                    fill="url(#colorViews)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Commission Earned */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Commission Earned</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="commission" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tier Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly GMV */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">MONTHLY GMV PROGRESS</h3>
              <p className="text-3xl font-bold text-gray-900">$850</p>
              <p className="text-sm text-gray-500 mt-1">of $1,000 target</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all"
                  style={{ width: '85%' }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-3">85% to next tier</p>
            </div>

            {/* Monthly Content */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">MONTHLY CONTENT</h3>
              <p className="text-3xl font-bold text-gray-900">5 ✓</p>
              <p className="text-sm text-gray-500 mt-1">of 5 videos posted</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all"
                  style={{ width: '100%' }}
                ></div>
              </div>
              <p className="text-sm font-semibold text-green-600 mt-3">🎉 Goal reached!</p>
            </div>

            {/* Unlock Gold */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-300 p-6 shadow-sm">
              <p className="text-sm font-semibold text-yellow-900 mb-2">🔓 UNLOCK GOLD TIER</p>
              <p className="text-lg font-bold text-yellow-900">$150 more GMV</p>
              <p className="text-sm text-yellow-700 mt-3 leading-relaxed">
                Get 40% commission + $200/month bonus
              </p>
              <div className="mt-4 pt-4 border-t border-yellow-200">
                <p className="text-xs font-semibold text-yellow-800">Almost there! Keep posting!</p>
              </div>
            </div>
          </div>

          {/* Insight Box */}
          <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 rounded-lg border border-pink-200 p-6 shadow-sm">
            <div className="flex items-start space-x-4">
              <span className="text-4xl flex-shrink-0">💡</span>
              <div>
                <h3 className="text-lg font-bold text-pink-900 mb-2">Your Top Performing Content</h3>
                <p className="text-pink-800 mb-3">
                  Your <strong>Morning Routine</strong> video generated <strong>$1,850 GMV</strong>. This format performs exceptionally well!
                </p>
                <p className="text-sm text-pink-700 font-medium">
                  📌 Next step: Post 2 more Routine-format videos to hit Gold tier. Your audience loves this content!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
