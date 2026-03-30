import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function tierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronze: 'bg-amber-100 text-amber-800',
    silver: 'bg-gray-100 text-gray-800',
    gold: 'bg-yellow-100 text-yellow-800',
    diamond: 'bg-purple-100 text-purple-800',
  };
  return colors[tier] || 'bg-gray-100 text-gray-800';
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-600',
    churned: 'bg-red-100 text-red-800',
    requested: 'bg-blue-100 text-blue-800',
    approved: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-cyan-100 text-cyan-800',
    delivered: 'bg-teal-100 text-teal-800',
    content_posted: 'bg-green-100 text-green-800',
    no_response: 'bg-red-100 text-red-800',
    reminder_1: 'bg-orange-100 text-orange-800',
    reminder_2: 'bg-red-100 text-red-700',
    identified: 'bg-gray-100 text-gray-600',
    dm_sent: 'bg-blue-100 text-blue-800',
    responded: 'bg-green-100 text-green-800',
    sample_requested: 'bg-cyan-100 text-cyan-800',
    converted: 'bg-emerald-100 text-emerald-800',
    declined: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

export function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    open_collab: 'Open Collab',
    dm_outreach: 'DM Outreach',
    mcn: 'MCN',
    buyer_to_creator: 'Buyer→Creator',
    referral: 'Referral',
    paid: 'Paid Creator',
  };
  return labels[source] || source;
}

export function getWeekProgress(currentAffiliates: number): number {
  return Math.min((currentAffiliates / 30000) * 100, 100);
}
