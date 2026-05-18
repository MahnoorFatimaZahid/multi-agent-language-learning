import { eq, asc } from "drizzle-orm";
import { db } from "../db/client";
import { sessions, messages } from "../db/schema";
import { generateResponse, MODELS } from "./groq";
import { transcribeAudio } from "./stt";
import { ScenarioAgent } from "../agents/scenario.agent";
import { logger } from "./logger";
import { type ScenarioContext, type ServerMessage } from "./ws-types";

// ── Groq streaming ─────────────────────────────────────────────────────────
async function* streamGroqResponse(
  messages_: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model = MODELS.MAIN
): AsyncGenerator<string> {
  const GROQ_API_KEY = process.env["GROQ_API_KEY"];
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: messages_,
      temperature: 0.75,
      max_tokens:  500,
      stream:      true,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Groq stream error ${res.status}: ${err}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data) as {
          choices: Array<{
            delta: { content?: string };
            finish_reason: string | null;
          }>;
        };
        const token = parsed.choices[0]?.delta.content;
        if (token) yield token;
      } catch {
        // skip malformed SSE line
      }
    }
  }
}

// ── WSSession ──────────────────────────────────────────────────────────────
export class WSSession {
  private scenarioAgent = new ScenarioAgent();
  private scenario:      ScenarioContext | null = null;
  private sessionDbId:   string | null = null;
  private language:      string = "spanish";
  private level:         string = "beginner";
  private isEnded:       boolean = false;

  constructor(private readonly sendRaw: (msg: ServerMessage) => void) {}

  // ── Public message handler ─────────────────────────────────────────────
  async handleMessage(data: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      this.sendError("PARSE_ERROR", "Invalid message format");
      return;
    }

    const msg = parsed as { type: string; [key: string]: unknown };

    switch (msg.type) {
      case "start_session":
        await this.handleStartSession(
          msg.sessionId       as string,
          msg.language        as string,
          msg.level           as string,
          msg.scenarioRequest as string
        );
        break;

      case "send_message":
        await this.handleSendMessage(msg.content as string);
        break;

      case "send_audio":
        await this.handleSendAudio(
          msg.audio    as string,
          msg.mimeType as string
        );
        break;

      case "end_session":
        await this.handleEndSession();
        break;

      case "ping":
        this.sendRaw({ type: "pong" });
        break;

      default:
        this.sendError("UNKNOWN_MESSAGE", `Unknown type: ${String(msg.type)}`);
    }
  }

  // ── start_session ──────────────────────────────────────────────────────
  private async handleStartSession(
    sessionId:       string,
    language:        string,
    level:           string,
    scenarioRequest: string
  ): Promise<void> {
    if (this.sessionDbId) {
      this.sendError("ALREADY_STARTED", "Session already started");
      return;
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      this.sendError("SESSION_NOT_FOUND", "Session not found");
      return;
    }

    this.sessionDbId = sessionId;
    this.language    = language;
    this.level       = level;

    logger.info("WS session starting", { sessionId, language, level });

    const scenario = await this.scenarioAgent.generate(
      scenarioRequest,
      language,
      level
    );
    this.scenario = scenario;

    await db
      .update(sessions)
      .set({ scenarioContext: scenario as any })
      .where(eq(sessions.id, sessionId));

    this.sendRaw({ type: "session_ready", scenario });

    await this.saveAndSendAiMessage(scenario.openingMessage);
  }

  // ── send_message ───────────────────────────────────────────────────────
  private async handleSendMessage(content: string): Promise<void> {
    if (!this.sessionDbId || !this.scenario) {
      this.sendError("NOT_STARTED", "Session not started");
      return;
    }
    if (this.isEnded) {
      this.sendError("SESSION_ENDED", "Session has already ended");
      return;
    }
    if (!content?.trim()) {
      this.sendError("EMPTY_MESSAGE", "Message cannot be empty");
      return;
    }

    const text = content.trim();

    // Save user message
    const [savedUserMsg] = await db
      .insert(messages)
      .values({ sessionId: this.sessionDbId, role: "user", content: text })
      .returning();

    if (!savedUserMsg) throw new Error("Failed to save user message");

    this.sendRaw({
      type:    "user_message_saved",
      message: {
        id:        savedUserMsg.id,
        role:      "user",
        content:   savedUserMsg.content,
        createdAt: savedUserMsg.createdAt.toISOString(),
      },
    });

    // Load history
    const history = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.sessionId, this.sessionDbId))
      .orderBy(asc(messages.createdAt))
      .limit(20);

    // Build Groq messages
    const groqMessages = [
      { role: "system" as const, content: this.scenario.systemPrompt },
      ...history.map(m => ({
        role:    m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Stream AI response
    let fullResponse = "";
    try {
      for await (const token of streamGroqResponse(groqMessages)) {
        fullResponse += token;
        this.sendRaw({ type: "token", token });
      }
    } catch (err) {
      logger.error("Groq stream error", err);
      this.sendError("AI_ERROR", "AI service temporarily unavailable. Please try again.");
      return;
    }

    if (!fullResponse.trim()) {
      this.sendError("EMPTY_RESPONSE", "AI returned an empty response.");
      return;
    }

    await this.saveAndSendAiMessage(fullResponse);

    // Auto-set title from first user message
    const [currentSession] = await db
      .select({ title: sessions.title })
      .from(sessions)
      .where(eq(sessions.id, this.sessionDbId))
      .limit(1);

    if (!currentSession?.title) {
      const title = text.length > 60 ? text.slice(0, 57) + "..." : text;
      await db
        .update(sessions)
        .set({ title })
        .where(eq(sessions.id, this.sessionDbId));
    }
  }

  // ── send_audio ─────────────────────────────────────────────────────────
  private async handleSendAudio(
    audioBase64: string,
    mimeType:    string
  ): Promise<void> {
    if (!this.sessionDbId || !this.scenario) { //check session started hai ya nahi, aur scenario loaded hai ya nahi, kyunki bina inke audio process nahi kar sakte.
      this.sendError("NOT_STARTED", "Session not started");
      return;
    }
    if (this.isEnded) {
      this.sendError("SESSION_ENDED", "Session has already ended");
      return;
    }

    try {
      // Transcribe via Groq Whisper
      const transcript = await transcribeAudio(
        audioBase64,
        mimeType,
        this.language
      );
 
      if (!transcript) { //Agar kuch sunai nahi diya:
        this.sendError(
          "EMPTY_TRANSCRIPT",
          "Could not hear anything. Please try again."
        );
        return;
      }

      // Send transcript back so the frontend can show what was heard
      this.sendRaw({ type: "stt_result", transcript });

      // Reuse text message handler — no duplication
      await this.handleSendMessage(transcript);

    } catch (err) {
      logger.error("STT error", err);
      this.sendError("STT_ERROR", "Could not transcribe audio. Please try again.");
    }
  }

  // ── end_session ────────────────────────────────────────────────────────
  private async handleEndSession(): Promise<void> {
    if (!this.sessionDbId || this.isEnded) return;
    this.isEnded = true;

    const [session] = await db
      .select({ startedAt: sessions.startedAt })
      .from(sessions)
      .where(eq(sessions.id, this.sessionDbId))
      .limit(1);

    const endedAt         = new Date();
    const durationSeconds = session
      ? Math.floor(
          (endedAt.getTime() - new Date(session.startedAt).getTime()) / 1000
        )
      : 0;

    await db
      .update(sessions)
      .set({ status: "completed", endedAt, durationSeconds })
      .where(eq(sessions.id, this.sessionDbId));

    logger.info("WS session ended", {
      sessionId: this.sessionDbId,
      durationSeconds,
    });

    this.sendRaw({ type: "session_ended" });
  }

  // ── onDisconnect ───────────────────────────────────────────────────────
  async onDisconnect(): Promise<void> {
    if (!this.sessionDbId || this.isEnded) return;
    await db
      .update(sessions)
      .set({ status: "abandoned", endedAt: new Date() })
      .where(eq(sessions.id, this.sessionDbId));
    logger.info("WS session abandoned", { sessionId: this.sessionDbId });
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  private async saveAndSendAiMessage(content: string): Promise<void> {
    if (!this.sessionDbId) return;

    const [saved] = await db
      .insert(messages)
      .values({ sessionId: this.sessionDbId, role: "assistant", content })
      .returning();

    if (!saved) return;

    this.sendRaw({
      type:    "message_done",
      message: {
        id:        saved.id,
        role:      "assistant",
        content:   saved.content,
        createdAt: saved.createdAt.toISOString(),
      },
    });
  }

  private sendError(code: string, message: string): void {
    this.sendRaw({ type: "error", code, message });
  }
}