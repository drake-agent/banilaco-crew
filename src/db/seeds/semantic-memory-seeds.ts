/**
 * Semantic Memory (L3) Seed Data
 *
 * Pre-loaded K-beauty creator guidance extracted from FNCO influencer seeding framework.
 * These are surfaced by the Discord agent when creators ask for content strategy advice.
 */

import type { NewSemanticEntry } from '../schema/memory';

export const SEMANTIC_SEEDS: Omit<NewSemanticEntry, 'id'>[] = [
  // ========================================================================
  // HOOK STRATEGIES
  // ========================================================================
  {
    content:
      'K-beauty TikTok hooks must stop scrolling in under 3 seconds. The 5 most effective hook types are: (1) Visual Shock — macro close-up of texture/pore-filling, (2) Before/After — instant split-screen transformation, (3) ASMR — satisfying application sounds, (4) Myth Buster — challenge a false belief like "thin foundations can\'t cover", (5) Pain Point — amplify a relatable struggle like transfer or fading.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.90',
    tags: ['hook', 'tiktok', 'content-strategy'],
    sourceType: 'document',
  },
  {
    content:
      'First 3 seconds decide everything. Use a macro texture shot, instant Before/After transition, or trending audio clip. Never start with an intro, greeting, or product name. Lead with the RESULT, then explain HOW.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.85',
    tags: ['hook', 'first-3-seconds'],
    sourceType: 'document',
  },
  {
    content:
      'Sensory trigger layers for hooks: Visual (macro textures, color satisfaction, transformation), Audio (ASMR application sounds, trending music), Emotional (relief, amazement, confidence), Gestural (slow-motion massage, satisfying blending). Layer 2+ triggers for maximum stopping power.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.75',
    tags: ['hook', 'sensory', 'advanced'],
    sourceType: 'document',
  },

  // ========================================================================
  // CONTENT FORMATS
  // ========================================================================
  {
    content:
      'Best-performing K-beauty content formats ranked by engagement: (1) GRWM + product reveal = 2-5x engagement vs generic reviews, (2) Before/After + durability test = highest save rate, (3) Tutorial/step-by-step = highest completion rate, (4) Routine (morning/evening) = highest follower retention, (5) ASMR application = highest watch time.',
    memoryType: 'Fact',
    poolId: 'squad',
    importance: '0.90',
    tags: ['content-format', 'performance', 'ranking'],
    sourceType: 'document',
  },
  {
    content:
      'Platform split recommendation: 70% TikTok (viral reach), 20% Instagram Reels (visual branding), 10% YouTube (trust/authority). Do NOT post identical content across platforms — each platform has different algorithm preferences and audience behavior.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.80',
    tags: ['platform-strategy', 'distribution'],
    sourceType: 'document',
  },

  // ========================================================================
  // POSTING STRATEGY
  // ========================================================================
  {
    content:
      'Optimal posting schedule for K-beauty TikTok: Weekdays 7-9pm (post-work golden hour) or 8-9am (commute). Post 4-5x per week minimum — TikTok algorithm rewards consistency over quality. Pin product link/discount code as first comment for 30% higher CTR.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.85',
    tags: ['posting-schedule', 'tiktok', 'frequency'],
    sourceType: 'document',
  },
  {
    content:
      'Engage with comments within first hour of posting — algorithm treats quick engagement as a quality signal and boosts distribution. Use captions/text overlay because many viewers watch without sound.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.75',
    tags: ['engagement', 'algorithm', 'comments'],
    sourceType: 'document',
  },

  // ========================================================================
  // P.D.A. FRAMEWORK
  // ========================================================================
  {
    content:
      'P.D.A. Content Framework: (P) Persona — identify 3 core audience personas with age/lifestyle/pain points. (D) Desire — map the emotional need behind the purchase (stress relief, skin confidence, time efficiency). (A) Awareness — match content to the viewer\'s stage: A1=problem aware (pain hooks), A2=solution aware (how-it-works), A3=product aware (proof/before-after), A4=most aware (testimonials/urgency).',
    memoryType: 'Article',
    poolId: 'squad',
    importance: '0.90',
    tags: ['framework', 'pda', 'content-planning'],
    sourceType: 'document',
  },
  {
    content:
      'Map each piece of content to ONE awareness stage. Don\'t try to cover all 4 stages in one video. A1 (pain-focused): "모공 어디 갔어?" A2 (mechanism): "이렇게 하면 이렇게 돼" A3 (proof): before/after + specs A4 (decision): "다들 쓰고 있어" + urgency.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.80',
    tags: ['awareness-stage', 'pda', 'focus'],
    sourceType: 'document',
  },

  // ========================================================================
  // 10 PROVEN VIDEO CONCEPTS
  // ========================================================================
  {
    content:
      '10 proven K-beauty video concepts: (1) Visual Shock + Pore Deletion (macro shot), (2) 12-Hour Durability Test (split screen 8am vs 8pm), (3) Authority/Expert Approval (YouTuber quick cuts), (4) Tool Comparison (puff vs brush split face), (5) No-Transfer Test (phone screen test), (6) ASMR Texture (silent close-up on glass), (7) Myth Buster (eyeliner on cheek → one swipe disappears), (8) Color Swatch/Tone Matching (wrist → half-face), (9) Date Prep Story (mirror anxiety → 5min base → confidence), (10) One-Swipe Challenge (transition transformation).',
    memoryType: 'Article',
    poolId: 'squad',
    importance: '0.85',
    tags: ['video-concepts', 'templates', 'proven'],
    sourceType: 'document',
  },

  // ========================================================================
  // COPY & CTA
  // ========================================================================
  {
    content:
      'Head Copy Formula for each content piece: Line 1 = Pain/Hook (relatable problem or surprising statement), Line 2 = Mechanism (how product solves it), Line 3 = Proof/Benefit (visual result or emotional payoff), Line 4 = CTA (specific action: save, share, link in profile). Match copy tone to awareness stage.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.80',
    tags: ['copywriting', 'cta', 'formula'],
    sourceType: 'document',
  },

  // ========================================================================
  // ANTI-PATTERNS
  // ========================================================================
  {
    content:
      'Content anti-patterns to avoid: (1) Don\'t bury the product past second 25 — viewers scroll by then, (2) Don\'t use overly filtered faces — K-beauty is about skin texture, not hiding it, (3) Don\'t make unverified claims ("anti-aging", "cures acne" = illegal in US/Korea), (4) Don\'t copy other creators\' exact videos — algorithm penalizes duplicate content, (5) Don\'t ignore first-hour comment engagement, (6) Don\'t use generic music — trending audio = instant algorithm boost.',
    memoryType: 'Observation',
    poolId: 'squad',
    importance: '0.85',
    tags: ['anti-patterns', 'mistakes', 'avoid'],
    sourceType: 'document',
  },

  // ========================================================================
  // CONTENT CALENDAR
  // ========================================================================
  {
    content:
      '4-phase content calendar: Phase 1 (Week 1-2, TOFU): 70% pain-point hooks + 30% trend-based, 5 posts/week, TikTok 80%. Phase 2 (Week 3-4, MOFU): 50% tutorials + 50% before/after, Instagram Reels focus. Phase 3 (Week 5-6, BOFU): Reviews + durability tests + ingredient science, YouTube long-form. Phase 4 (Ongoing): User-generated content + community spotlights + challenges.',
    memoryType: 'Article',
    poolId: 'squad',
    importance: '0.80',
    tags: ['content-calendar', 'phases', 'funnel'],
    sourceType: 'document',
  },

  // ========================================================================
  // METRICS & ANALYSIS
  // ========================================================================
  {
    content:
      'Key metrics for K-beauty creators: (1) 3-second retention rate — target 60%+ (critical for TikTok), (2) Completion rate — target 50%+, (3) Save rate — % of viewers saving = true value signal, (4) Share rate — 5-10% of views = viral indicator, (5) First-hour engagement — algorithm decides distribution in first 60 minutes.',
    memoryType: 'Fact',
    poolId: 'squad',
    importance: '0.80',
    tags: ['metrics', 'analytics', 'kpi'],
    sourceType: 'document',
  },

  // ========================================================================
  // BANILACO PRODUCT KNOWLEDGE
  // ========================================================================
  {
    content:
      'Clean It Zero Cleansing Balm is Banilaco\'s hero product — #1 selling cleansing balm globally. Key selling points: sherbet-to-oil texture transformation, removes waterproof makeup in one step, contains Acerola vitamin C for brightening. Best content angle: satisfying texture transformation (sherbet → oil → milky emulsion) which is perfect for ASMR and visual shock hooks.',
    memoryType: 'Fact',
    poolId: 'squad',
    importance: '0.90',
    tags: ['product', 'clean-it-zero', 'hero-product'],
    sourceType: 'document',
  },
  {
    content:
      'For Clean It Zero content, the Before/After hook consistently outperforms all other formats at 3.2x GMV. The texture transformation (solid → oil → milky) is inherently satisfying for both ASMR and visual hooks. Recommend filming the product scoop in macro, then slow-motion application.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.85',
    tags: ['clean-it-zero', 'content-strategy', 'before-after'],
    sourceType: 'document',
  },

  // ========================================================================
  // PINK LEAGUE STRATEGY
  // ========================================================================
  {
    content:
      'PINK LEAGUE scoring: Pink Score = GMV conversion amount + content viral index. Viral Index formula = (views×0.3 + shares×0.4 + likes×0.2 + comments×0.1) / follower_count × 1000. Focus on shares (highest weight) — create content people want to forward to friends.',
    memoryType: 'Fact',
    poolId: 'squad',
    importance: '0.85',
    tags: ['pink-league', 'scoring', 'pink-score'],
    sourceType: 'document',
  },
  {
    content:
      'Pink Monday strategy: On designated boost days, commissions and league points are multiplied. Schedule your BEST content (proven hooks, highest-performing formats) for Pink Monday to maximize score. Don\'t waste boost days on experimental content.',
    memoryType: 'Tip',
    poolId: 'squad',
    importance: '0.75',
    tags: ['pink-league', 'pink-monday', 'boost'],
    sourceType: 'document',
  },
];
