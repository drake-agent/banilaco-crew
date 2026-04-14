/**
 * Gateway Pipeline — Discord message processing
 *
 * Message → Rate Limit → Command Router → Context Build → Agent Runtime → Response
 * Inspired by effy v4.0's 16-step gateway pipeline (simplified for Discord bot).
 */

import { Message, EmbedBuilder } from 'discord.js';
import { buildContext } from './context';
import { workingMemory } from './memory/working';
import { saveEpisodic } from './memory/episodic';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Rate limiter: simple in-memory per-user
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // messages per minute
const RATE_WINDOW = 60_000;

/**
 * Process an incoming Discord message through the gateway pipeline.
 */
export async function processMessage(message: Message): Promise<void> {
  const userId = message.author.id;
  const channelId = message.channelId;
  const threadId = message.channel.isThread() ? message.channel.id : undefined;
  const content = message.content;

  // ① Rate Limiter
  if (isRateLimited(userId)) {
    await message.reply('⏳ Too many messages. Please wait a moment.');
    return;
  }

  // ② Save user message to episodic memory (L2)
  const convKey = `${channelId}:${threadId ?? 'main'}`;
  workingMemory.add(convKey, 'user', content);

  await saveEpisodic({
    conversationKey: convKey,
    userId,
    channelId,
    threadId,
    role: 'user',
    content,
  });

  // ③ Build context (3-route parallel search)
  const context = await buildContext({
    content,
    channelId,
    userId,
    threadId,
  });

  // ④ Agent Runtime — Claude API call
  try {
    // Show typing indicator
    if ('sendTyping' in message.channel) await message.channel.sendTyping();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: context.systemPrompt,
      messages: [
        ...(context.conversationHistory
          ? [{ role: 'user' as const, content: `[Previous conversation]\n${context.conversationHistory}` }]
          : []),
        { role: 'user' as const, content },
      ],
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === 'text');
    const reply = textContent?.text ?? '응답을 생성할 수 없습니다.';

    // ⑤ Save assistant response
    workingMemory.add(convKey, 'assistant', reply);

    await saveEpisodic({
      conversationKey: convKey,
      userId: 'bot',
      channelId,
      threadId,
      role: 'assistant',
      content: reply,
    });

    // ⑥ Send response
    if (reply.length > 2000) {
      // Discord message limit — use embed for long responses
      const embed = new EmbedBuilder()
        .setDescription(reply.slice(0, 4096))
        .setColor(0xEC4899); // Pink
      await message.reply({ embeds: [embed] });
    } else {
      await message.reply(reply);
    }
  } catch (error) {
    console.error('[Gateway] Agent runtime error:', error);
    await message.reply('❌ 에러가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}

/**
 * Check and update rate limit for a user.
 * Cleans up expired entries to prevent memory leaks.
 */
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW });

    // Periodic cleanup: remove expired entries every 100 calls
    if (rateLimits.size > 100) {
      for (const [key, val] of Array.from(rateLimits)) {
        if (now > val.resetAt) rateLimits.delete(key);
      }
    }
    return false;
  }

  limit.count++;
  return limit.count > RATE_LIMIT;
}
