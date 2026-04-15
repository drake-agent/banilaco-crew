/**
 * Join Application Scoring (Affiliate-First)
 *
 * 가입 신청서를 어필리에이트 전환력 기준으로 점수화한다.
 * 팔로워 수는 숫자가 크다고 가점을 주지 않는다 — 대신 "실제 판매로 이어지는
 * 시그널"(engagement rate, past affiliate GMV, 비자격 실적)을 가중치로 쓴다.
 *
 * Score: 0-100
 *
 * Components (max):
 *  - Past Affiliate GMV        → 40 (proven conversion — 가장 강한 시그널)
 *  - Engagement Rate           → 25 (전환 의지)
 *  - Avg Views × Engagement    → 20 (engaged-viewer volume)
 *  - Niche Fit (beauty/skincare) → 10
 *  - Brand Experience          → 5
 */

const BEAUTY_NICHES = new Set([
  'Skincare',
  'Makeup',
  'GRWM',
  'ASMR',
  'Wellness',
  'Beauty',
  'K-beauty',
]);

export interface ScoreBreakdown {
  pastGmvScore: number;
  engagementScore: number;
  reachScore: number;
  nicheScore: number;
  experienceScore: number;
  total: number;
}

export interface ScoreInput {
  avgViews: number | null;
  engagementRate: number | null;      // fraction (0.0523) — DB 형식
  pastAffiliateGmv: number | null;    // USD
  contentCategories: string[];
  brandExperience: string[];
}

/**
 * Score a join application. All inputs optional; null values score 0 in that component.
 */
export function scoreApplication(input: ScoreInput): ScoreBreakdown {
  // 1. Past Affiliate GMV (max 40)
  //    $0 → 0, $1K → ~20, $5K+ → 40 (logistic saturation at $5K)
  const gmv = input.pastAffiliateGmv ?? 0;
  const pastGmvScore = gmv <= 0 ? 0 : Math.min(40, Math.round((gmv / 5000) * 40));

  // 2. Engagement Rate (max 25)
  //    fraction 0.02 (2%) → ~10, 0.05 (5%) → ~25 (cap at 5%)
  const engFraction = input.engagementRate ?? 0;
  const engagementScore = Math.min(25, Math.round((engFraction / 0.05) * 25));

  // 3. Engaged-viewer volume (max 20)
  //    avgViews × engagementRate = absolute "people who actually react".
  //    1000 engaged viewers per video ≈ 20 points (cap).
  const engagedViewers = (input.avgViews ?? 0) * engFraction;
  const reachScore = Math.min(20, Math.round((engagedViewers / 1000) * 20));

  // 4. Niche Fit (max 10)
  //    beauty/skincare/wellness 카테고리 겹치는 개수 × 2.5, cap 10.
  const nicheHits = input.contentCategories.filter((c) => BEAUTY_NICHES.has(c)).length;
  const nicheScore = Math.min(10, nicheHits * 2.5);

  // 5. Brand Experience (max 5)
  //    경쟁 K-뷰티 브랜드 경험 1개당 2점, cap 5. "Other"는 0.5.
  const realExperience = input.brandExperience.filter((b) => b !== 'Other').length;
  const hasOther = input.brandExperience.includes('Other') ? 0.5 : 0;
  const experienceScore = Math.min(5, realExperience * 2 + hasOther);

  const total = Math.round(
    pastGmvScore + engagementScore + reachScore + nicheScore + experienceScore,
  );

  return {
    pastGmvScore,
    engagementScore,
    reachScore,
    nicheScore,
    experienceScore,
    total,
  };
}
