'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/creator', label: 'My Performance', icon: '📊' },
  { href: '/creator/improve', label: 'How to Improve', icon: '💡' },
  { href: '/creator/content', label: 'My Content', icon: '🎬' },
  { href: '/creator/earnings', label: 'Earnings', icon: '💰' },
  { href: '/creator/samples', label: 'My Samples', icon: '📦' },
  { href: '/creator/referrals', label: 'Referrals', icon: '🎁' },
  { href: '/creator/community', label: 'Community', icon: '👥' },
];

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Mock user data
  const user = {
    name: 'Mia W.',
    handle: '@beautybymia',
    tier: 'Silver Tier',
    avatar: 'MW',
  };

  // Mock tier progress
  const tierProgress = {
    current: 'Silver',
    next: 'Gold',
    gmv: 850,
    gmvTarget: 1000,
    percentage: 85,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500 bg-clip-text text-transparent">
            banilaco crew
          </h1>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
              <p className="text-gray-500 text-xs">{user.handle}</p>
              <span className="inline-block mt-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full">
                {user.tier}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/creator' && pathname === '/creator/page');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 border-l-4 border-pink-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Tier Progress */}
        <div className="p-6 border-t border-gray-100 bg-gradient-to-br from-yellow-50 to-amber-50">
          <p className="text-xs font-semibold text-gray-600 mb-2">TIER PROGRESS</p>
          <div className="flex items-baseline space-x-1 mb-3">
            <span className="text-sm font-bold text-gray-900">{tierProgress.current}</span>
            <span className="text-gray-400">→</span>
            <span className="text-sm font-bold text-gray-700">{tierProgress.next}</span>
          </div>

          <div className="mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all"
                style={{ width: `${tierProgress.percentage}%` }}
              ></div>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            ${tierProgress.gmv.toLocaleString()} / ${tierProgress.gmvTarget.toLocaleString()} GMV
          </p>
          <p className="text-xs font-semibold text-gray-700 mt-2">
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
