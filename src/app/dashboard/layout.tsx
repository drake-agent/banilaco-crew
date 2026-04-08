'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  Send,
  BarChart3,
  Building2,
  FileText,
  Truck,
  Gift,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Creators', href: '/dashboard/creators', icon: Users },
  { label: 'Missions', href: '/dashboard/missions', icon: BarChart3 },
  { label: 'PINK LEAGUE', href: '/dashboard/league', icon: Gift },
  { label: 'Squads', href: '/dashboard/squads', icon: Building2 },
  { label: 'Samples', href: '/dashboard/samples', icon: Package },
  { label: 'Outreach', href: '/dashboard/outreach', icon: Send },
  { label: 'Shipping', href: '/dashboard/shipping', icon: Truck },
  { label: 'KPI', href: '/dashboard/kpi', icon: BarChart3 },
  { label: 'Applications', href: '/dashboard/applications', icon: FileText },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Mock 30K goal progress (Week 3: 8000/30000)
  const currentCount = 8000;
  const goalCount = 30000;
  const progressPercent = (currentCount / goalCount) * 100;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center font-bold text-sm">
                BS
              </div>
              <span className="font-bold text-lg">BANILACO SQUAD</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium',
                      active
                        ? 'bg-pink-500 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>

          {/* Goal Progress Section */}
          <div className="px-6 py-6 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              30K Goal Progress
            </p>
            <div className="space-y-2">
              <Progress
                value={progressPercent}
                className="h-2 bg-gray-800"
              />
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-gray-400">
                  {(currentCount / 1000).toFixed(0)}K
                </span>
                <span className="text-pink-500 font-semibold">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          <div className="flex-1 flex items-center justify-between">
            <div className="text-gray-600 text-sm">30K Goal Progress</div>
            <div className="hidden md:flex items-center gap-4 min-w-xs">
              <div className="w-64 flex items-center gap-3">
                <Progress
                  value={progressPercent}
                  className="h-2 flex-1 bg-gray-200"
                />
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
