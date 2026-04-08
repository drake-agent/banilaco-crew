import { type PinkTier, TIER_CONFIG } from '@/db/schema/creators';

interface TierInput {
  missionCount: number;
  monthlyGmv: number;
  aiProfileCompleted: boolean;
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
  let tier: PinkTier;

  if (input.missionCount >= 200 || input.monthlyGmv >= 2500) {
    tier = 'pink_diamond';
  } else if (input.missionCount >= 50 || input.monthlyGmv >= 500) {
    tier = 'pink_rose';
  } else {
    tier = 'pink_petal';
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
