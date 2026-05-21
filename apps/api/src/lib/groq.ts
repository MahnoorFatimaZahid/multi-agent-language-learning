import { AIError } from "./errors";
import { logger } from "./logger";

const GROQ_API_KEY = process.env["GROQ_API_KEY"];
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export const MODELS = {
  MAIN: "llama-3.3-70b-versatile",
  FAST: "llama-3.1-8b-instant",
} as const;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateResponse(
  messages: ChatMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const { model = MODELS.MAIN, temperature = 0.7, maxTokens = 600 } = options;
  const startTime = Date.now();

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "unknown");
    if (response.status === 429) {
      logger.warn("Groq rate limit hit");
      throw new AIError("Too many requests right now. Please wait a moment and try again.");
    }
    logger.error("Groq API error", { status: response.status, body: errorBody });
    throw new AIError();
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string | null } }>;
    usage: { total_tokens: number };
  };

  const content = data.choices[0]?.message.content;
  if (!content) throw new AIError("AI returned an empty response.");

  logger.debug("Groq response", {
    model,
    tokens: data.usage.total_tokens,
    durationMs: Date.now() - startTime,
  });

  return content;
}

export function buildSystemPrompt(language: string, level: string): string {
  const lang = capitalize(language);

  const levelInstructions: Record<string, string> = {

    beginner: `
STRICT BEGINNER RULES — follow these exactly, no exceptions:

1. SENTENCE LENGTH — maximum 6 words per sentence. Never more.
2. TENSE — only use present tense. Never past. Never future.
3. VOCABULARY — only use the 200 most common everyday words.
4. TRANSLATION — after EVERY sentence you write in ${lang}, add the English meaning in brackets.
   Example: "Hola! ¿Cómo estás? (Hello! How are you?)"
   Example: "Quiero agua. (I want water.)"
5. QUESTIONS — only ask yes/no questions. Never open questions.
   Good: "¿Tienes hambre? (Are you hungry?)"
   Bad: "What do you want to eat?"
6. RESPONSE LENGTH — maximum 2 sentences per reply. Never more.
7. CORRECTIONS — if student makes a mistake, say the correct word ONE TIME only, gently.
   Never explain grammar rules. Just model the correct word.
8. TONE — speak like talking to a 5-year-old learning for the first time.
   Be extremely warm, patient, and encouraging after every reply.
9. NEVER use: subjunctive, conditional, perfect tenses, complex grammar.
10. NEVER write a long paragraph. Short. Simple. Always.`,

    intermediate: `
INTERMEDIATE RULES:
1. Use natural sentences — up to 15 words is fine.
2. Mix present and simple past tense naturally.
3. Introduce ONE new word per response — explain it briefly in English in brackets.
4. Maximum 3-4 sentences per response.
5. Correct mistakes gently by using the correct form naturally in your next sentence.
6. Ask follow-up questions to keep the conversation going.
7. Occasionally use common idioms — explain them simply.
8. No need to translate every sentence — only new or difficult words.`,

    advanced: `
ADVANCED RULES:
1. Speak exactly like a native speaker — natural speed and complexity.
2. Use all tenses, idioms, regional expressions freely.
3. No English translations at all.
4. Correct mistakes only in ${lang} — never switch to English.
5. Engage with nuanced topics: opinions, culture, abstract ideas.
6. Challenge the student with complex questions.
7. Do not simplify anything — treat them as near-fluent.`,
  };

  return `You are a warm, patient, encouraging ${lang} language tutor.
Your student is practicing ${lang} at the ${level} level.

YOUR CORE ROLE:
- Speak primarily in ${lang} appropriate for the ${level} level
- Help the student practice real-world conversational language
- Never say "that is wrong" — model the correct form naturally instead
- Build confidence — your goal is NOT to test them

LEVEL INSTRUCTIONS — READ CAREFULLY AND FOLLOW STRICTLY:
${levelInstructions[level] ?? levelInstructions["beginner"]}

REMEMBER:
- You are playing a character in a realistic scenario
- Stay in character at all times
- Keep the student engaged and talking
- Celebrate their effort — even small progress`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}