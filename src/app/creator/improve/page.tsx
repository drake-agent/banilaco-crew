'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const radarData = [
  { axis: 'Hook Strength', you: 78, topCreators: 92 },
  { axis: 'CTR', you: 65, topCreators: 88 },
  { axis: 'CVR', you: 58, topCreators: 82 },
  { axis: 'Post Frequency', you: 72, topCreators: 95 },
  { axis: 'Engagement', you: 80, topCreators: 85 },
  { axis: 'Avg Views', you: 70, topCreators: 90 },
];

const topCreators = [
  {
    handle: '@skincarejunkie',
    insight: 'Routine videos에서 3-step hook 사용 (문제제기 → 솔루션 → 증거)',
    monthly: '$8,200/mo',
    format: 'Routine format',
  },
  {
    handle: '@asmrskincare',
    insight: 'ASMR 언박싱은 처음 3초에 제품 클로즈업 + 사운드가 핵심',
    monthly: '$4,200/mo',
    format: 'ASMR format',
  },
  {
    handle: '@glowwithme',
    insight: 'Before/After를 영상 첫 프레임에 넣으면 CTR 2x 상승',
    monthly: '$3,800/mo',
    format: 'B&A format',
  },
];

const recommendations = [
  {
    priority: 'HIGH',
    icon: '🎣',
    title: 'Hook (First 1.5 seconds)',
    current: '평균 2.5초에 핵심 메시지',
    action: '1.5초 안에 "문제+결과"를 보여주세요',
    impact: '+40% CTR',
    color: 'border-red-500 bg-red-50',
    badgeColor: 'bg-red-100 text-red-700',
  },
  {
    priority: 'HIGH',
    icon: '🎬',
    title: 'Format Change (High Impact)',
    current: 'GRWM, Haul 위주',
    action: 'Routine/Tutorial 포맷으로 전환. Routine이 GMV 3.2x 높음',
    impact: '+220% GMV',
    color: 'border-red-500 bg-red-50',
    badgeColor: 'bg-red-100 text-red-700',
  },
  {
    priority: 'MEDIUM',
    icon: '📅',
    title: 'Posting Frequency',
    current: '주 1-2회',
    action: '주 3회 이상 → Silver 티어 + 알고리즘 부스트',
    impact: '+5% Commission',
    color: 'border-yellow-500 bg-yellow-50',
    badgeColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    priority: 'MEDIUM',
    icon: '📢',
    title: 'Call-to-Action Placement',
    current: '영상 끝에 링크',
    action: '영상 중간(30초)에 CTA',
    impact: '+35% CVR',
    color: 'border-yellow-500 bg-yellow-50',
    badgeColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    priority: 'LOW',
    icon: '⏰',
    title: 'Upload Timing Optimization',
    current: '불규칙 업로드',
    action: '화/목/토 오전 10시가 최적',
    impact: '+20% Views',
    color: 'border-blue-500 bg-blue-50',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
];

const formats = [
  { name: 'Routine/Tutorial', gmv: 2800, views: 42000, cvr: 2.8, rank: 1 },
  { name: 'ASMR Unboxing', gmv: 1900, views: 35000, cvr: 2.2, rank: 2 },
  { name: 'Before/After', gmv: 1500, views: 28000, cvr: 2.5, rank: 3 },
  { name: 'Review', gmv: 980, views: 22000, cvr: 1.9, rank: 4 },
  { name: 'GRWM', gmv: 650, views: 18000, cvr: 1.4, rank: 5 },
  { name: 'Haul', gmv: 420, views: 12000, cvr: 1.1, rank: 6 },
];

const maxGMV = Math.max(...formats.map(f => f.gmv));

export default function HowToImprove() {
  return (
    <div className="flex flex-col h-full bg-linear-to-br from-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900">How to Improve 🚀</h1>
          <p className="text-gray-600 mt-2">
            Personalized recommendations based on your content performance vs top creators
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-8">
          {/* Comparison Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">You vs Top Creators</h2>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="axis" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis stroke="#d1d5db" />
                  <Radar
                    name="You"
                    dataKey="you"
                    stroke="#ec4899"
                    fill="#ec4899"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Top Creators"
                    dataKey="topCreators"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                  <span className="text-gray-700">You</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-700">Top Creators</span>
                </div>
              </div>
            </div>

            {/* Top Creators Insights */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">What Top Creators Do Differently</h2>
              {topCreators.map((creator, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{creator.handle}</h3>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      {creator.monthly}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{creator.insight}</p>
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    {creator.format}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Personalized Action Plan */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Personalized Action Plan</h2>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border-2 p-6 shadow-sm ${rec.color}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rec.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{rec.title}</h3>
                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${rec.badgeColor}`}>
                          {rec.priority} PRIORITY
                        </span>
                      </div>
                    </div>
                    <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-right">
                      <p className="text-xs text-green-600 font-semibold">Impact</p>
                      <p className="font-bold text-sm">{rec.impact}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">CURRENT</p>
                      <p className="text-gray-700">{rec.current}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">ACTION</p>
                      <p className="text-gray-700 font-medium">{rec.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Performing Formats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Best Performing Formats</h2>

            <div className="space-y-4">
              {formats.map((format, idx) => {
                const percentage = (format.gmv / maxGMV) * 100;
                const isTryThis =
                  format.name === 'Routine/Tutorial' || format.name === 'Before/After';

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 w-24">{format.rank}.</span>
                        <span className="font-semibold text-gray-900 flex-1">{format.name}</span>
                        {isTryThis && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            ← Try this!
                          </span>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-bold text-gray-900">${format.gmv.toLocaleString()} avg</p>
                        <p className="text-gray-500 text-xs">
                          {(format.views / 1000).toFixed(0)}K views • {format.cvr}% CVR
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isTryThis
                              ? 'bg-linear-to-r from-green-500 to-emerald-500'
                              : 'bg-linear-to-r from-orange-400 to-pink-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>💡 Insight:</strong> Routine and Before/After formats significantly outperform
                other content types. Consider pivoting your content strategy towards these formats.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-blue-900 mb-2">Ready to Level Up?</h3>
            <p className="text-blue-800 mb-4">
              Start with the HIGH priority recommendations this week. Track your progress in the My
              Performance dashboard.
            </p>
            <button className="px-6 py-2 bg-linear-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow">
              View My Content Ideas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
