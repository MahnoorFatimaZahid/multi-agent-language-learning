import { generateResponse, MODELS } from "../lib/groq";
import { logger } from "../lib/logger";

export interface FeedbackResult {
  grammarScore:  number;   // 0-10
  fluencyScore:  number;   // 0-10
  vocabScore:    number;   // 0-10
  corrections:   Correction[];
  suggestions:   string[];
  strengths:     string[];
  weaknessTags:  string[];
}

export interface Correction {
  original:    string;
  corrected:   string;
  explanation: string;
  type:        "grammar" | "vocabulary" | "syntax" | "spelling";
}

export class FeedbackAgent {
  async analyze(
    transcript: Array<{ role: string; content: string }>,
    language:   string,
    level:      string
  ): Promise<FeedbackResult> {
    // Sirf user ke messages analyze karo — AI ke nahi
    const userMessages = transcript.filter(m => m.role === "user");

    if (userMessages.length === 0) {
      return this.emptyResult();
    }

    const conversationText = transcript
      .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n");

    const prompt = `You are an expert ${language} language teacher analyzing a student's conversation.

Student level: ${level}
Language: ${language}

Conversation:
${conversationText}

Analyze ONLY the student's messages. Return ONLY valid JSON, no markdown, no extra text:
{
  "grammarScore": number between 0-10,
  "fluencyScore": number between 0-10,
  "vocabScore": number between 0-10,
  "corrections": [
    {
      "original": "what student said wrong",
      "corrected": "correct version",
      "explanation": "brief explanation in English",
      "type": "grammar" or "vocabulary" or "syntax" or "spelling"
    }
  ],
  "suggestions": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "strengths": ["what they did well 1", "what they did well 2"],
  "weaknessTags": ["past_tense", "gender_agreement"]
}

weaknessTags rules:
- Short snake_case identifiers only
- Max 4 tags
- Be specific: "past_tense" not "verbs"
- Examples: "past_tense", "gender_agreement", "verb_conjugation", "article_usage", "word_order", "subjunctive", "pronunciation_r"

Be honest but encouraging. If student did well give high scores.`;

    try {
      const raw = await generateResponse(
        [{ role: "user", content: prompt }],
        {
          model:       MODELS.FAST, // fast model kaafi hai feedback ke liye
          temperature: 0.3,         // low temperature = consistent scores
          maxTokens:   1000,
        }
      );

      // Markdown fences hatin agar model ne add kiye
      const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleaned) as FeedbackResult;

      // Scores 0-10 ke beech clip karo
      return {
        grammarScore: Math.min(10, Math.max(0, parsed.grammarScore)),
        fluencyScore: Math.min(10, Math.max(0, parsed.fluencyScore)),
        vocabScore:   Math.min(10, Math.max(0, parsed.vocabScore)),
        corrections:  parsed.corrections  ?? [],
        suggestions:  parsed.suggestions  ?? [],
        strengths:    parsed.strengths    ?? [],
        weaknessTags: parsed.weaknessTags ?? [],
      };

    } catch (err) {
      logger.warn("FeedbackAgent parse failed", { err });
      return this.emptyResult();
    }
  }

  private emptyResult(): FeedbackResult {
    return {
      grammarScore: 0,
      fluencyScore: 0,
      vocabScore:   0,
      corrections:  [],
      suggestions:  ["Have a conversation to receive feedback!"],
      strengths:    [],
      weaknessTags: [],
    };
  }
}