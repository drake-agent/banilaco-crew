'use client';

import React from 'react';
import { Users, Trophy, MessageCircle, ExternalLink } from 'lucide-react';

interface Performer {
  rank: number;
  handle: string;
  gmv: number;
  tier: string;
  isYou?: boolean;
}

interface Announcement {
  id: string;
  title: string;
}

const topPerformers: Performer[] = [
  {
    rank: 1,
    handle: '@skincarejunkie',
    gmv: 2100,
    tier: 'Diamond',
  },
  {
    rank: 2,
    handle: '@asmrskincare',
    gmv: 1650,
    tier: 'Gold',
  },
  {
    rank: 3,
    handle: '@glowwithme',
    gmv: 1200,
    tier: 'Gold',
  },
  {
    rank: 4,
    handle: '@kbeautyqueen',
    gmv: 980,
    tier: 'Gold',
  },
  {
    rank: 5,
    handle: '@beautybymia',
    gmv: 420,
    tier: 'Silver',
    isYou: true,
  },
];

const announcements: Announcement[] = [
  {
    id: '1',
    title: 'New Hero SKU: Vitamin C Serum launching next week!',
  },
  {
    id: '2',
    title: 'Silver+ creators: Submit videos for Spark Ads boost by Friday',
  },
  {
    id: '3',
    title: 'March challenge winners announced! Check #winning-videos',
  },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'Diamond':
      return 'text-cyan-600 bg-cyan-50';
    case 'Gold':
      return 'text-yellow-600 bg-yellow-50';
    case 'Silver':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getTierMedalEmoji = (rank: number) => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '';
  }
};

export default function CommunityPage() {
  const yourGmv = 420;
  const leaderGmv = 2100;
  const gmvGap = leaderGmv - yourGmv;

  return (
    <div className="min-h-screen bg-linear-to-br from-pink-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
          <p className="text-gray-600 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connect with other banilaco crew creators
          </p>
        </div>

        {/* Challenge Card */}
        <div className="bg-linear-to-r from-pink-400 via-pink-500 to-rose-500 rounded-lg shadow-lg p-8 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-2">This Week's Challenge</h2>
          <p className="text-pink-100 mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Highest GMV This Week Wins $500!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Stats */}
            <div className="bg-white bg-opacity-20 backdrop-blur rounded-lg p-4">
              <p className="text-pink-100 text-sm font-medium mb-2">Your GMV</p>
              <p className="text-4xl font-bold">${yourGmv}</p>
            </div>

            {/* Leader Stats */}
            <div className="bg-white bg-opacity-20 backdrop-blur rounded-lg p-4">
              <p className="text-pink-100 text-sm font-medium mb-2">
                Leader (@skincarejunkie)
              </p>
              <p className="text-4xl font-bold">${leaderGmv}</p>
              <p className="text-pink-100 text-sm mt-2">
                ${gmvGap} away from 1st place
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Top Performers This Week
                </h2>
              </div>
              <div className="divide-y">
                {topPerformers.map((performer) => (
                  <div
                    key={performer.rank}
                    className={`p-6 transition ${
                      performer.isYou
                        ? 'bg-pink-50 border-l-4 border-pink-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full font-bold text-gray-700">
                          {getTierMedalEmoji(performer.rank) || performer.rank}
                        </div>
                        <div>
                          <p
                            className={`font-semibold ${
                              performer.isYou
                                ? 'text-pink-900'
                                : 'text-gray-900'
                            }`}
                          >
                            {performer.handle}
                            {performer.isYou && (
                              <span className="ml-2 text-xs bg-pink-200 text-pink-800 px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </p>
                          <p className={`text-sm ${getTierColor(performer.tier)}`}>
                            {performer.tier}
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ${performer.gmv}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Discord Button */}
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition transform hover:scale-105 flex items-center justify-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Join Discord Community
            </button>

            {/* Announcements */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-pink-600" />
                  Announcements
                </h2>
              </div>
              <div className="divide-y">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4">
                    <p className="text-sm font-medium text-gray-900">
                      {announcement.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
