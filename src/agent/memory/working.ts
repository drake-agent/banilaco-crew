/**
 * L1: Working Memory — In-process conversation context
 *
 * Stores recent messages per conversation key (guild:channel:thread).
 * 30-minute TTL, auto-summarization at 30+ messages.
 * Inspired by effy v4.0's WorkingMemory class.
 */

interface WorkingEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ConversationState {
  entries: WorkingEntry[];
  timer: NodeJS.Timeout | null;
  summary: string | null;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ENTRIES = 50; // 25 turns
const SUMMARIZE_THRESHOLD = 30; // 15 turns

export class WorkingMemory {
  private store = new Map<string, ConversationState>();

  /**
   * Add a message to the working memory for a conversation.
   */
  add(convKey: string, role: 'user' | 'assistant', content: string): void {
    let state = this.store.get(convKey);

    if (!state) {
      state = { entries: [], timer: null, summary: null };
      this.store.set(convKey, state);
    }

    // Reset TTL
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => this.expire(convKey), TTL_MS);

    // Add entry
    state.entries.push({ role, content, timestamp: Date.now() });

    // Trim if over max
    if (state.entries.length > MAX_ENTRIES) {
      state.entries = state.entries.slice(-MAX_ENTRIES);
    }
  }

  /**
   * Get conversation context for prompt assembly.
   * Returns summary (if exists) + recent entries.
   */
  getContext(convKey: string): string {
    const state = this.store.get(convKey);
    if (!state || state.entries.length === 0) return '';

    const parts: string[] = [];

    if (state.summary) {
      parts.push(`[Previous conversation summary]\n${state.summary}`);
    }

    // Format recent messages
    const recent = state.entries.slice(-20); // Last 10 turns
    for (const entry of recent) {
      const prefix = entry.role === 'user' ? 'Creator' : 'Squad Bot';
      parts.push(`${prefix}: ${entry.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Check if conversation needs summarization.
   */
  needsSummary(convKey: string): boolean {
    const state = this.store.get(convKey);
    return (state?.entries.length ?? 0) >= SUMMARIZE_THRESHOLD;
  }

  /**
   * Apply a summary to compress old messages.
   * Keeps the last 10 entries raw, summarizes the rest.
   */
  applySummary(convKey: string, summary: string): void {
    const state = this.store.get(convKey);
    if (!state) return;

    state.summary = summary;
    // Keep only last 10 entries
    state.entries = state.entries.slice(-10);
  }

  /**
   * Get raw entries for summarization.
   */
  getEntriesForSummary(convKey: string): WorkingEntry[] {
    const state = this.store.get(convKey);
    if (!state) return [];
    // Return everything except the last 10
    return state.entries.slice(0, -10);
  }

  /**
   * Expire a conversation after TTL.
   */
  private expire(convKey: string): void {
    this.store.delete(convKey);
  }

  /**
   * Check if a conversation exists in working memory.
   */
  has(convKey: string): boolean {
    return this.store.has(convKey);
  }

  /**
   * Clear all conversations (for testing/shutdown).
   */
  clear(): void {
    for (const [, state] of Array.from(this.store)) {
      if (state.timer) clearTimeout(state.timer);
    }
    this.store.clear();
  }
}

// Singleton instance
export const workingMemory = new WorkingMemory();
