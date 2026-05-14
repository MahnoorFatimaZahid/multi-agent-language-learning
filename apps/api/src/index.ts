import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { authRouter }     from "./routes/auth";
import { sessionsRouter } from "./routes/sessions";
import { chatRouter }     from "./routes/chat";
import { AppError }       from "./lib/errors";
import { logger }         from "./lib/logger";

const app = new Hono();

app.use("*", secureHeaders());

app.use("*", cors({
  origin: (origin) => {
    const allowed = [
      process.env["FRONTEND_URL"] ?? "http://localhost:3000",
      "http://localhost:3000",
    ];
    if (!origin || allowed.includes(origin)) return origin ?? "*";
    return null;
  },
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use("*", honoLogger());

// Routes
app.route("/auth",     authRouter);
app.route("/sessions", sessionsRouter);
app.route("/chat",     chatRouter);

// Health check — Railway pings this to verify the service is alive
app.get("/health", (c) =>
  c.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() })
);

app.notFound((c) =>
  c.json({ error: `Route ${c.req.method} ${c.req.path} not found`, code: "NOT_FOUND" }, 404)
);

// Global error handler — catches all throws from route handlers
app.onError((err, c) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${err.code}] ${err.message}`, { path: c.req.path });
    } else {
      logger.warn(`[${err.code}] ${err.message}`, { path: c.req.path });
    }
    return c.json({ error: err.message, code: err.code }, err.statusCode as any);
  }

  logger.error("Unhandled error", { message: err.message, stack: err.stack, path: c.req.path });
  return c.json({ error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" }, 500);
});

const PORT = parseInt(process.env["PORT"] ?? "3001");

Bun.serve({ port: PORT, fetch: app.fetch });

logger.info(`API running on http://localhost:${PORT}`);