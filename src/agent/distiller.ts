/**
 * Nightly Distiller — effy v4.0 pattern
 *
 * Runs daily (2am Cron): scans last 24h of Discord conversations,
 * extracts valuable knowledge, and promotes to semantic memory (L3).
 *
 * Pipeline:
 * 1. Collect recent episodic messages
 * 2. Use Claude to extract promotion candidates
 * 3. Deduplicate against existing semantic entries
 * 4. Save to semantic memory
 * 5. Archive old low-value entries (anti-bloat)
 */

import Anthropic from '@anthropic-ai/sdk';
import { getRecentForDistillation } from './memory/episodic';
import { saveSemantic, archiveOldMemories } from './memory/semantic';

const anthropic = new Anthropic();

interface DistillationResult {
  messagesScanned: number;
  candidatesFound: number;
  promoted: number;
  archived: number;
  errors: string[];
}

/**
 * Run the nightly distillation process.
 */
export async function runDistillation(): Promise<DistillationResult> {
  const result: DistillationResult = {
    messagesScanned: 0,
    candidatesFound: 0,
    promoted: 0,
    archived: 0,
    errors: [],
  };

  try {
    // 1. Collect recent 24h messages
    const messages = await getRecentForDistillation(24, 500);
    result.messagesScanned = messages.length;

    if (messages.length < 5) {
      // Not enough conversations to distill
      result.archived = await archiveOldMemories(90);
      return result;
    }

    // 2. Format conversations for Claude
    const conversationText = messages
      .map((m) => `[${m.role}] ${m.content}`)
      .join('\n');

    // 3. Extract promotion candidates via Claude
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a knowledge distiller for the BANILACO SQUAD K-beauty creator community.

Your job: scan Discord conversations and extract HIGH-VALUE knowledge worth remembering long-term.

ONLY extract items that match these criteria:
- Frequently asked questions (same topic appears 2+ times)
- Useful tips shared by experienced creators (content strategy, hook advice, product insights)
- Decisions made by admins (policy changes, new rules)
- Product insights (what sells well, seasonal trends)
- Community patterns (what motivates creators, common struggles)

DO NOT extract:
- Casual greetings or small talk
- One-off personal questions
- Duplicate information already covered in basic onboarding

Output JSON array:
[
  {
    "content": "the knowledge to remember (1-2 sentences, factual)",
    "memoryType": "Tip" | "Fact" | "Observation" | "Decision",
    "importance": 0.5-0.9,
    "tags": ["relevant", "tags"]
  }
]

Return empty array [] if nothing worth promoting.`,
      messages: [
        {
          role: 'user',
          content: `Scan these last 24h Discord conversations and extract knowledge worth remembering:\n\n${conversationText.slice(0, 8000)}`,
        },
      ],
    });

    // 4. Parse candidates
    const textContent = extraction.content.find((c) => c.type === 'text');
    if (!textContent) {
      result.errors.push('No text content in extraction response');
      return result;
    }

    let candidates: Array<{
      content: string;
      memoryType: 'Tip' | 'Fact' | 'Observation' | 'Decision';
      importance: number;
      tags: string[];
    }>;

    try {
      // Extract JSON from response (may have markdown wrapping)
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      candidates = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      result.errors.push('Failed to parse extraction JSON');
      return result;
    }

    result.candidatesFound = candidates.length;

    // 5. Save each candidate to semantic memory (with dedup)
    for (const candidate of candidates) {
      try {
        await saveSemantic({
          content: candidate.content,
          memoryType: candidate.memoryType,
          importance: candidate.importance.toString(),
          tags: candidate.tags,
          sourceType: 'distillation',
          poolId: 'squad',
        });
        result.promoted++;
      } catch (err) {
        result.errors.push(`Save failed: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    // 6. Anti-bloat: archive old entries
    result.archived = await archiveOldMemories(90);

  } catch (err) {
    result.errors.push(`Distillation error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  return result;
}
