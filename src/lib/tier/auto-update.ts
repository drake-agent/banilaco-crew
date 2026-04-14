import { type PinkTier, TIER_CONFIG } from '@/db/schema/creators';

interface TierInput {
  missionCount: number;
  monthlyGmv: number;
}

interface TierResult {
  tier: PinkTier;
  commissionRate: number;
  squadBonusRate: number;
  changed: boolean;
}

/**
 * Calculate the creator's tier based on mission count and GMV.
 *
 * Pink Crown is NOT auto-assigned — requires league championship
 * or $10K+ GMV with admin approval.
 */
export function calculateTier(
  current: PinkTier,
  input: TierInput,
): TierResult {
  const TIER_ORDER: PinkTier[] = ['pink_petal', 'pink_rose', 'pink_diamond', 'pink_crown'];

  let tier: PinkTier;

  if (input.missionCount >= 200 || input.monthlyGmv >= 2500) {
    tier = 'pink_diamond';
  } else if (input.missionCount >= 50 || input.monthlyGmv >= 500) {
    tier = 'pink_rose';
  } else {
    tier = 'pink_petal';
  }

  // FIX BUG-2: Never auto-downgrade. Demotion requires admin action.
  if (TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(current)) {
    tier = current;
  }

  const config = TIER_CONFIG[tier];

  return {
    tier,
    commissionRate: config.commission,
    squadBonusRate: config.squadBonus,
    changed: tier !== current,
  };
}

/**
 * Check if a creator qualifies for Pink Crown (manual review required).
 */
export function checkCrownEligibility(input: {
  monthlyGmv: number;
  leagueWinner: boolean;
}): boolean {
  return input.monthlyGmv >= 10000 || input.leagueWinner;
}
