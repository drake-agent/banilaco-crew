/**
 * Mystery Mission — Variable Reward System
 *
 * One daily "?" mission with unpredictable reward multiplier (1x-5x).
 * Uses variable ratio reinforcement for engagement.
 *
 * Distribution:
 *   1x: 50%  (normal)
 *   2x: 25%
 *   3x: 15%
 *   4x: 8%
 *   5x: 2%   (jackpot)
 *
 * Expected value: ~1.87x — costs slightly more than normal but drives
 * daily open rate ("what's today's mystery mission?").
 */

interface MysteryTier {
  multiplier: number;
  weight: number;      // probability weight
  label: string;
  emoji: string;
}

const MYSTERY_TIERS: MysteryTier[] = [
  { multiplier: 1, weight: 50, label: 'Normal',  emoji: '🎯' },
  { multiplier: 2, weight: 25, label: 'Double',  emoji: '✨' },
  { multiplier: 3, weight: 15, label: 'Triple',  emoji: '🔥' },
  { multiplier: 4, weight: 8,  label: 'Mega',    emoji: '💎' },
  { multiplier: 5, weight: 2,  label: 'Jackpot', emoji: '🎰' },
];

/**
 * Roll a mystery multiplier using weighted random selection.
 *
 * @param rng - Optional PRNG (defaults to Math.random). Inject in tests for determinism.
 */
export function rollMysteryMultiplier(rng: () => number = Math.random): {
  multiplier: number;
  label: string;
  emoji: string;
} {
  const totalWeight = MYSTERY_TIERS.reduce((sum, t) => sum + t.weight, 0);
  let roll = rng() * totalWeight;

  for (const tier of MYSTERY_TIERS) {
    roll -= tier.weight;
    if (roll <= 0) {
      return { multiplier: tier.multiplier, label: tier.label, emoji: tier.emoji };
    }
  }

  // Fallback (shouldn't happen)
  return { multiplier: 1, label: 'Normal', emoji: '🎯' };
}

/**
 * Check if a multiplier qualifies as a "jackpot" (4x or 5x).
 */
export function isJackpot(multiplier: number): boolean {
  return multiplier >= 4;
}

export { MYSTERY_TIERS };
