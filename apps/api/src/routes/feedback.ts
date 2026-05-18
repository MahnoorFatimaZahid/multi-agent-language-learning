import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client";
import { feedbackReports, sessions, userMemory } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { NotFoundError, ForbiddenError } from "../lib/errors";

export const feedbackRouter = new Hono();
feedbackRouter.use("*", authMiddleware);

// GET /feedback/:sessionId — ek session ki feedback
feedbackRouter.get("/:sessionId", async (c) => {
  const userId    = c.get("userId");
  const sessionId = c.req.param("sessionId");

  // Verify session belongs to user
  const [session] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) throw new NotFoundError("Session");
  if (session.userId !== userId) throw new ForbiddenError();

  const [report] = await db
    .select()
    .from(feedbackReports)
    .where(eq(feedbackReports.sessionId, sessionId))
    .limit(1);

  // Feedback abhi ban rahi ho sakti hai
  if (!report) {
    return c.json({ feedback: null, status: "pending" });
  }

  return c.json({ feedback: report, status: "ready" });
});

// GET /feedback/memory/:language — user ki language memory
feedbackRouter.get("/memory/:language", async (c) => {
  const userId   = c.get("userId");
  const language = c.req.param("language");

  const [memory] = await db
    .select()
    .from(userMemory)
    .where(
      and(
        eq(userMemory.userId,   userId),
        eq(userMemory.language, language)
      )
    )
    .limit(1);

  return c.json({ memory: memory ?? null });
});