'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/creator', label: 'Dashboard', icon: '📊' },
  { href: '/creator/missions', label: 'Missions', icon: '🎯' },
  { href: '/creator/improve', label: 'How to Improve', icon: '💡' },
  { href: '/creator/content', label: 'My Content', icon: '🎬' },
  { href: '/creator/earnings', label: 'Earnings', icon: '💰' },
  { href: '/creator/samples', label: 'My Samples', icon: '📦' },
  { href: '/creator/squad', label: 'My Squad', icon: '👥' },
  { href: '/creator/league', label: 'PINK LEAGUE', icon: '🏆' },
];

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // TODO: Replace with real session data from NextAuth
  const user = {
    name: 'Mia W.',
    handle: '@beautybymia',
    tier: 'Pink Rose',
    tierEmoji: '🌹',
    avatar: 'MW',
  };

  const tierProgress = {
    current: 'Pink Rose',
    currentEmoji: '🌹',
    next: 'Pink Diamond',
    nextEmoji: '💎',
    missions: 87,
    missionsTarget: 200,
    gmv: 1250,
    gmvTarget: 2500,
    percentage: 50,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold bg-linear-to-r from-pink-500 via-purple-500 to-rose-500 bg-clip-text text-transparent">
            BANILACO SQUAD
          </h1>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
              <p className="text-gray-500 text-xs">{user.handle}</p>
              <span className="inline-block mt-1 px-2 py-1 bg-pink-50 text-pink-700 text-xs font-medium rounded-full">
                {user.tierEmoji} {user.tier}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/creator' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-linear-to-r from-pink-50 to-rose-50 text-pink-700 border-l-4 border-pink-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Tier Progress */}
        <div className="p-6 border-t border-gray-100 bg-linear-to-br from-pink-50 to-rose-50">
          <p className="text-xs font-semibold text-gray-600 mb-2">TIER PROGRESS</p>
          <div className="flex items-baseline space-x-1 mb-3">
            <span className="text-sm font-bold text-gray-900">
              {tierProgress.currentEmoji} {tierProgress.current}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-sm font-bold text-gray-700">
              {tierProgress.nextEmoji} {tierProgress.next}
            </span>
          </div>

          <div className="mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-linear-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all"
                style={{ width: `${tierProgress.percentage}%` }}
              ></div>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            🎯 {tierProgress.missions}/{tierProgress.missionsTarget} missions
          </p>
          <p className="text-xs text-gray-600">
            💰 ${tierProgress.gmv.toLocaleString()}/${tierProgress.gmvTarget.toLocaleString()} GMV
          </p>
          <p className="text-xs font-semibold text-pink-700 mt-2">
            {tierProgress.percentage}% to {tierProgress.next} 🔥
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
