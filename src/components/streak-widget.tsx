'use client';

interface StreakMilestone {
  days: number;
  label: string;
  emoji: string;
  multiplier: number;
}

interface StreakWidgetProps {
  current: number;
  longest: number;
  multiplier: number;
  currentMilestone: StreakMilestone | null;
  nextMilestone: StreakMilestone | null;
  compact?: boolean;
}

export function StreakWidget({
  current,
  longest,
  multiplier,
  currentMilestone,
  nextMilestone,
  compact = false,
}: StreakWidgetProps) {
  const hasStreak = current > 0;
  const hasMultiplier = multiplier > 1;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold ${
        hasStreak
          ? 'bg-orange-50 text-orange-700 border border-orange-200'
          : 'bg-gray-50 text-gray-400 border border-gray-200'
      }`}>
        <span className="text-lg">{hasStreak ? '🔥' : '❄️'}</span>
        <span>{current} day{current !== 1 ? 's' : ''}</span>
        {hasMultiplier && (
          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
            {multiplier}x
          </span>
        )}
      </div>
    );
  }

  // Progress to next milestone
  let progressPct = 0;
  let progressLabel = '';
  if (nextMilestone) {
    const prevDays = currentMilestone?.days ?? 0;
    const range = nextMilestone.days - prevDays;
    const progress = current - prevDays;
    progressPct = Math.min(100, Math.round((progress / range) * 100));
    progressLabel = `${nextMilestone.days - current} days to ${nextMilestone.emoji} ${nextMilestone.label}`;
  }

  return (
    <div className={`rounded-xl border-2 p-5 ${
      hasMultiplier
        ? 'border-orange-300 bg-linear-to-br from-orange-50 to-amber-50'
        : hasStreak
          ? 'border-yellow-200 bg-linear-to-br from-yellow-50 to-white'
          : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Mission Streak
        </h3>
        {currentMilestone && (
          <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            {currentMilestone.emoji} {currentMilestone.label}
          </span>
        )}
      </div>

      {/* Streak count */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-4xl font-bold text-gray-900">
          {hasStreak ? '🔥' : '❄️'} {current}
        </span>
        <span className="text-sm text-gray-500">
          day{current !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Multiplier badge */}
      {hasMultiplier && (
        <div className="inline-flex items-center gap-1 bg-linear-to-r from-orange-500 to-amber-500 text-white text-sm font-bold px-3 py-1 rounded-full mb-3">
          {multiplier}x Reward Multiplier
        </div>
      )}

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-linear-to-r from-orange-400 to-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progressLabel}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>Best: {longest} days</span>
        {!hasStreak && (
          <span className="text-pink-600 font-medium">
            Complete a mission to start your streak!
          </span>
        )}
      </div>
    </div>
  );
}
