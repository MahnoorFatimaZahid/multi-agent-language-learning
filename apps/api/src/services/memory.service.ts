import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { userMemory } from "../db/schema";
import { logger } from "../lib/logger";
import type { FeedbackResult } from "../agents/feedback.agent";

export const memoryService = {

  // User ki memory load karo
  async load(userId: string, language: string) {
    const [row] = await db
      .select()
      .from(userMemory)
      .where(
        and(
          eq(userMemory.userId,   userId),
          eq(userMemory.language, language)
        )
      )
      .limit(1);

    return row ?? null;
  },

  // Session ke baad memory update karo
  async save(
    userId:   string,
    language: string,
    feedback: FeedbackResult
  ): Promise<void> {
    const existing = await this.load(userId, language);

    // Weakness tags merge karo — frequency count badhao
    const currentTags = (existing?.weaknessTags ?? {}) as Record<string, number>;
    for (const tag of feedback.weaknessTags) {
      currentTags[tag] = (currentTags[tag] ?? 0) + 1;
    }

    const totalSessions = (existing?.totalSessions ?? 0) + 1;
    const n = totalSessions;

    // Running average calculate karo
    const avgGrammar = (
      ((existing?.avgGrammarScore ?? 0) * (n - 1) + feedback.grammarScore) / n
    );
    const avgFluency = (
      ((existing?.avgFluencyScore ?? 0) * (n - 1) + feedback.fluencyScore) / n
    );
    const avgVocab = (
      ((existing?.avgVocabScore ?? 0) * (n - 1) + feedback.vocabScore) / n
    );

    await db
      .insert(userMemory)
      .values({
        userId,
        language,
        weaknessTags:    currentTags,
        totalSessions,
        avgGrammarScore: avgGrammar,
        avgFluencyScore: avgFluency,
        avgVocabScore:   avgVocab,
        lastSessionAt:   new Date(),
      })
      .onConflictDoUpdate({
        target:     [userMemory.userId, userMemory.language],
        set: {
          weaknessTags:    currentTags,
          totalSessions,
          avgGrammarScore: avgGrammar,
          avgFluencyScore: avgFluency,
          avgVocabScore:   avgVocab,
          lastSessionAt:   new Date(),
        },
      });

    logger.info("Memory updated", { userId, language, totalSessions });
  },

  // Top 3 weaknesses return karo for prompt injection
  getTopWeaknesses(
    memory: { weaknessTags: unknown } | null
  ): string[] {
    if (!memory) return [];

    const tags = memory.weaknessTags as Record<string, number>;

    return Object.entries(tags)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);
  },
};