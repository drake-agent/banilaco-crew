'use client';

import Link from 'next/link';

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  icon: string;
}

interface OnboardingChecklistProps {
  checklist: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
}

const STEP_LINKS: Record<string, string> = {
  discord: '/auth', // Discord OAuth
  tiktok: '/creator', // TikTok linking in settings
  profile: '/creator', // AI profile
  mission: '/creator/missions',
  content: '/creator/content',
};

export function OnboardingChecklist({
  checklist,
  completedCount,
  totalCount,
  isComplete,
}: OnboardingChecklistProps) {
  if (isComplete) return null;

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find the first incomplete step
  const nextStep = checklist.find((item) => !item.done);

  return (
    <div className="bg-white rounded-xl border-2 border-pink-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-pink-500 via-rose-500 to-purple-500 p-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Welcome to BANILACO SQUAD!</h2>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
            {completedCount}/{totalCount}
          </span>
        </div>
        <p className="text-sm text-pink-100 mb-4">
          Complete these steps to unlock your full creator experience
        </p>
        <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="p-4 space-y-1">
        {checklist.map((item, idx) => {
          const isNext = !item.done && item.key === nextStep?.key;
          const link = STEP_LINKS[item.key] ?? '/creator';

          return (
            <div
              key={item.key}
              className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                item.done
                  ? 'bg-green-50 text-green-800'
                  : isNext
                    ? 'bg-pink-50 border border-pink-200 text-pink-900'
                    : 'text-gray-400'
              }`}
            >
              {/* Step indicator */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  item.done
                    ? 'bg-green-500 text-white'
                    : isNext
                      ? 'bg-pink-500 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {item.done ? '✓' : idx + 1}
              </div>

              {/* Label */}
              <div className="flex-1">
                <span className={`text-sm font-medium ${item.done ? 'line-through' : ''}`}>
                  {item.icon} {item.label}
                </span>
              </div>

              {/* Action */}
              {!item.done && isNext && (
                <Link
                  href={link}
                  className="text-xs font-semibold bg-pink-500 text-white px-4 py-2 rounded-full hover:bg-pink-600 transition-colors"
                >
                  Start
                </Link>
              )}
              {item.done && (
                <span className="text-xs font-medium text-green-600">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Motivational footer */}
      <div className="px-6 pb-4">
        <p className="text-xs text-gray-500 text-center">
          {completedCount === 0
            ? "Let's get started! Each step unlocks new features."
            : completedCount < 3
              ? "Great progress! Keep going to unlock missions."
              : "Almost there! You're about to be a full squad member."}
        </p>
      </div>
    </div>
  );
}
