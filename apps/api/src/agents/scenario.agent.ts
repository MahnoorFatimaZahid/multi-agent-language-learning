import { generateResponse, MODELS } from "../lib/groq";
import { type ScenarioContext } from "../lib/ws-types";
import { logger } from "../lib/logger";

export class ScenarioAgent {
  async generate(
    scenarioRequest: string,
    language: string,
    level: string
  ): Promise<ScenarioContext> {
    const langLabel = capitalize(language);

    const levelRules: Record<string, string> = {
      beginner: `
BEGINNER SYSTEM PROMPT RULES — write the systemPrompt following these EXACTLY:
1. Max 6 words per sentence. Always.
2. Present tense only. No past. No future.
3. Only 200 most common words. No difficult vocabulary.
4. After EVERY sentence in ${langLabel}, add English translation in brackets.
   Example: "Hola! (Hello!)" or "¿Quieres café? (Do you want coffee?)"
5. Only ask yes/no questions. Never open questions.
6. Maximum 2 sentences per reply. Never more.
7. If student makes mistake — say correct word ONE time only. No grammar explanations.
8. Tone: like talking to a complete beginner child. Extremely warm and simple.
9. NEVER use subjunctive, conditional, or any complex grammar.
10. The openingMessage must also follow all these rules — max 2 short sentences with English translation.`,

      intermediate: `
INTERMEDIATE SYSTEM PROMPT RULES:
1. Natural sentences up to 15 words.
2. Mix present and simple past tense.
3. Introduce ONE new word per response with brief English explanation in brackets.
4. Max 4 sentences per response.
5. Correct mistakes naturally — model correct form in your next sentence.
6. No need to translate every sentence — only new or hard words.`,

      advanced: `
ADVANCED SYSTEM PROMPT RULES:
1. Speak exactly like a native speaker.
2. All tenses, idioms, regional expressions allowed.
3. No English translations at all.
4. Correct only in ${langLabel}.
5. Complex topics and nuanced conversation expected.`,
    };

    const prompt = `You are a language learning scenario designer.

Create a roleplay scenario for a ${level} level ${langLabel} student.
Student wants to practice: "${scenarioRequest}"

Return ONLY valid JSON — no markdown, no extra text:
{
  "personaName": "a realistic local name",
  "personaRole": "their job in 3-5 words",
  "setting": "specific location in 1 sentence",
  "systemPrompt": "detailed instructions for how the AI tutor should behave",
  "openingMessage": "first thing the character says (in ${langLabel})"
}

CRITICAL — the systemPrompt field must include these rules word for word:
${levelRules[level] ?? levelRules["beginner"]}

The systemPrompt must also:
- Tell the AI to stay in character as ${langLabel} speaker
- Tell the AI to be warm, encouraging, and patient
- Tell the AI to keep corrections gentle and brief

The openingMessage must follow the level rules above strictly.
For beginner: max 2 short sentences, with English translation in brackets.
Example beginner openingMessage: "Hallo! Willkommen. (Hello! Welcome.) Was möchten Sie? (What do you want?)"`;

    try {
      const raw = await generateResponse(
        [{ role: "user", content: prompt }],
        {
          model:       MODELS.FAST,
          temperature: 0.7,
          maxTokens:   1000,
        }
      );

      const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleaned) as ScenarioContext;

      if (!parsed.personaName || !parsed.personaRole || !parsed.setting || !parsed.systemPrompt || !parsed.openingMessage) {
        throw new Error("Missing required fields");
      }

      logger.info("Scenario generated", {
        persona:  parsed.personaName,
        role:     parsed.personaRole,
        language,
        level,
      });

      return { ...parsed, language, level } as ScenarioContext & { language: string; level: string };

    } catch (err) {
      logger.warn("ScenarioAgent parse failed, using fallback", { err });
      return this.fallback(language, langLabel, level);
    }
  }

  private fallback(language: string, langLabel: string, level: string): ScenarioContext {
    const fallbacks: Record<string, ScenarioContext> = {
      spanish: {
        personaName:    "María",
        personaRole:    "Café Barista",
        setting:        "A small café in Madrid",
        systemPrompt:   level === "beginner"
          ? `You are María, a café barista. STRICT BEGINNER RULES: Max 6 words per sentence. Present tense only. After every Spanish sentence add English in brackets. Example: "Hola! (Hello!) ¿Quieres café? (Do you want coffee?)" Only yes/no questions. Max 2 sentences per reply. Be extremely warm and simple.`
          : `You are María, a friendly café barista in Madrid. Speak Spanish at ${level} level. Be warm and encouraging. Correct mistakes gently by modeling the correct form.`,
        openingMessage: level === "beginner"
          ? "¡Hola! Bienvenido. (Hello! Welcome.) ¿Quieres café? (Do you want coffee?)"
          : "¡Buenos días! Bienvenido a nuestro café. ¿Qué le puedo ofrecer hoy?",
      },
      french: {
        personaName:    "Pierre",
        personaRole:    "Boulangerie Owner",
        setting:        "A traditional boulangerie in Paris",
        systemPrompt:   level === "beginner"
          ? `You are Pierre. STRICT BEGINNER RULES: Max 6 words per sentence. Present tense only. After every French sentence add English in brackets. Example: "Bonjour! (Hello!) ¿Vous voulez du pain? (Do you want bread?)" Only yes/no questions. Max 2 sentences per reply.`
          : `You are Pierre, owner of a Parisian boulangerie. Speak French at ${level} level. Be charming and encouraging.`,
        openingMessage: level === "beginner"
          ? "Bonjour! Bienvenue. (Hello! Welcome.) Vous voulez du pain? (Do you want bread?)"
          : "Bonjour! Bienvenue dans ma boulangerie. Qu'est-ce que je peux faire pour vous?",
      },
      german: {
        personaName:    "Hans",
        personaRole:    "Café Owner",
        setting:        "A cozy café in Berlin",
        systemPrompt:   level === "beginner"
          ? `You are Hans, a café owner. STRICT BEGINNER RULES: Max 6 words per sentence. Present tense only. After EVERY German sentence add English translation in brackets immediately. Example: "Hallo! (Hello!) Möchten Sie Kaffee? (Do you want coffee?)" Only yes/no questions. Max 2 sentences per reply. NEVER write long explanations. NEVER explain grammar. Just short simple sentences with English in brackets always.`
          : `You are Hans, a friendly café owner in Berlin. Speak German at ${level} level. Be warm and encouraging. Correct mistakes gently.`,
        openingMessage: level === "beginner"
          ? "Hallo! Willkommen. (Hello! Welcome.) Möchten Sie Kaffee? (Do you want coffee?)"
          : "Guten Tag! Willkommen in meinem Café. Was kann ich für Sie tun?",
      },
    };

    return fallbacks[language] ?? {
      personaName:    "Alex",
      personaRole:    "Local Guide",
      setting:        `A typical location in a ${langLabel}-speaking area`,
      systemPrompt:   level === "beginner"
        ? `You are Alex. STRICT BEGINNER RULES: Max 6 words per sentence. Present tense only. After every sentence in ${langLabel} add English translation in brackets. Only yes/no questions. Max 2 sentences per reply. Be very warm and simple.`
        : `You are Alex, a friendly local guide. Speak ${langLabel} at ${level} level. Be helpful and encouraging.`,
      openingMessage: level === "beginner"
        ? `Hallo! Willkommen. (Hello! Welcome.) Wie geht es? (How are you?)`
        : `Hello! Welcome. I am here to help you practice ${langLabel}.`,
    };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}