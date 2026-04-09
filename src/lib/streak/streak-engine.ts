/**
 * Streak Engine — Track daily mission streaks and calculate bonuses
 *
 * Rules:
 * - Complete at least 1 mission/day to maintain streak
 * - Missing a day resets streak to 0
 * - Streak multipliers: 3d=1.2x, 7d=1.5x, 14d=1.8x, 30d=2.0x
 * - Longest streak is tracked permanently for achievements
 */

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastMissionDate: string;
  multiplier: number;
  streakBroken: boolean;
  milestone: StreakMilestone | null;
}

export interface StreakMilestone {
  days: number;
  label: string;
  emoji: string;
  multiplier: number;
}

const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3,  label: 'On Fire',        emoji: '🔥', multiplier: 1.2 },
  { days: 7,  label: 'Week Warrior',   emoji: '⚡', multiplier: 1.5 },
  { days: 14, label: 'Unstoppable',    emoji: '💪', multiplier: 1.8 },
  { days: 30, label: 'Legend',         emoji: '👑', multiplier: 2.0 },
];

/**
 * Get streak multiplier for a given streak count
 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 14) return 1.8;
  if (streakDays >= 7) return 1.5;
  if (streakDays >= 3) return 1.2;
  return 1.0;
}

/**
 * Get the current milestone for display
 */
export function getCurrentMilestone(streakDays: number): StreakMilestone | null {
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    if (streakDays >= STREAK_MILESTONES[i].days) {
      return STREAK_MILESTONES[i];
    }
  }
  return null;
}

/**
 * Get the next milestone to achieve
 */
export function getNextMilestone(streakDays: number): StreakMilestone | null {
  for (const milestone of STREAK_MILESTONES) {
    if (streakDays < milestone.days) {
      return milestone;
    }
  }
  return null;
}

/**
 * Calculate updated streak after a mission completion
 */
export function calculateStreak(
  currentStreak: number,
  longestStreak: number,
  lastMissionDate: string | null,
  todayDate: string, // YYYY-MM-DD
): StreakResult {
  let newStreak: number;
  let streakBroken = false;

  if (!lastMissionDate) {
    // First ever mission
    newStreak = 1;
  } else if (lastMissionDate === todayDate) {
    // Already completed a mission today — streak unchanged
    newStreak = currentStreak;
  } else {
    // Check if yesterday
    const lastDate = new Date(lastMissionDate + 'T00:00:00Z');
    const today = new Date(todayDate + 'T00:00:00Z');
    const diffMs = today.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day — streak continues
      newStreak = currentStreak + 1;
    } else if (diffDays > 1) {
      // Streak broken
      newStreak = 1;
      streakBroken = currentStreak > 0;
    } else {
      // Same day or future (shouldn't happen) — keep current
      newStreak = currentStreak;
    }
  }

  const newLongest = Math.max(longestStreak, newStreak);
  const multiplier = getStreakMultiplier(newStreak);

  // Check if we just hit a milestone
  const prevMilestone = getCurrentMilestone(newStreak - 1);
  const curMilestone = getCurrentMilestone(newStreak);
  const hitNewMilestone = curMilestone && curMilestone !== prevMilestone ? curMilestone : null;

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastMissionDate: todayDate,
    multiplier,
    streakBroken,
    milestone: hitNewMilestone,
  };
}

/**
 * Get all milestones for display
 */
export function getAllMilestones(): StreakMilestone[] {
  return [...STREAK_MILESTONES];
}
