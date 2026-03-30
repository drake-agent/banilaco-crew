import { CreatorAnalysis } from './recommendation-engine';

// Centralized AI config (SC-008)
export const AI_CONFIG = {
  model: process.env.ANTHROPIC_MODEL_ID || 'claude-sonnet-4-20250514',
  maxTokens: 1024,
  anthropicVersion: '2023-06-01',
} as const;

const SYSTEM_PROMPT = `You are a K-beauty TikTok affiliate growth coach for Banilaco, a premium Korean skincare brand. Your expertise includes:
- TikTok content strategy and algorithm optimization
- K-beauty product positioning and storytelling
- Short-form video hook, format, and CTA optimization
- Creator monetization and tier progression

You provide specific, actionable recommendations based on creator performance data. Your tone is encouraging but direct. Always tie recommendations to measurable outcomes (CTR, engagement, views, GMV impact).

Key insights you know:
- Routine/Tutorial format outperforms others by 3.2x GMV
- Before/After in first frame increases CTR by 2x
- 3-step hook (Problem → Solution → Proof) drives 40% better engagement
- Posting 3+ times per week triggers algorithm boost + Silver tier unlock
- CTA at 30-second mark (not just end) increases CVR by 35%
- Best posting times: Tuesday/Thursday/Saturday at 10 AM local time

Always reference the creator's actual metrics when making recommendations.`;

const USER_PROMPT_TEMPLATE = (analysis: CreatorAnalysis): string => {
  const { creator, metrics, tierComparison } = analysis;

  return `Creator Performance Analysis:
Creator: ${creator.tiktok_handle} (@${creator.tiktok_handle})
Tier: ${creator.tier} | Followers: ${creator.follower_count.toLocaleString()}

30-Day Content Metrics:
- Total videos: ${metrics.totalVideos}
- Average views: ${metrics.avgViews.toLocaleString()}
- Average likes: ${metrics.avgLikes.toLocaleString()}
- Average engagement rate: ${metrics.engagementRate.toFixed(2)}%
- Posting frequency: ${metrics.postingFrequency.toFixed(1)} posts/week
- Best performing format: ${metrics.topContentType || 'mixed'}

Tier Comparison (${creator.tier.toUpperCase()} tier):
- Tier median avg views: ${tierComparison.tierMedianViews.toLocaleString()}
- Creator rank percentile: ${tierComparison.creatorRankPercentile}th %
- Tier engagement median: ${tierComparison.tierMedianEngagement.toFixed(2)}%

Monthly Performance:
- Monthly GMV: $${creator.monthly_gmv.toLocaleString()}
- Monthly content posts: ${creator.monthly_content_count}

Based on this data, provide 2-3 highly specific, personalized tips for this creator to improve their next 5 videos. Focus on:
1. Hook/opening optimization
2. Format strategy
3. Posting cadence or timing

Make recommendations concrete (e.g., "Use Before/After shot at 0:00", not "improve hooks"). Reference their actual metrics. Be encouraging.`;
};

/**
 * Call Anthropic Claude API to generate AI-enhanced tips
 */
export async function generateAITips(analysis: CreatorAnalysis, apiKey: string): Promise<string[]> {
  try {
    const userPrompt = USER_PROMPT_TEMPLATE(analysis);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': AI_CONFIG.anthropicVersion,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as any;

    if (data.content && data.content.length > 0 && data.content[0].type === 'text') {
      const text = data.content[0].text;
      // Split response into individual tips (assume newlines separate tips)
      const tips = text
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .slice(0, 3); // Take first 3 tips

      return tips;
    }

    return [];
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    // Return empty array to fall back to base recommendations
    return [];
  }
}

export { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE };
