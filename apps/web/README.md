# LinguaAI — AI Language Practice Platform

> Practice real conversations with an AI tutor. Get gentle corrections on grammar and vocabulary. No embarrassment — just progress.

**Live demo:** [https://lingua-ai.vercel.app](https://lingua-ai.vercel.app)  
**Demo login:** `demo@lingua-ai.com` / `demo1234`

---

## What It Is

LinguaAI is a full-stack AI-powered language learning platform. Users select a language and level, choose a practice scenario (café, job interview, directions, etc.), and have a natural conversation with an AI tutor that corrects mistakes inline without breaking the flow.

**Phase 1 (current):** Text-based AI conversations with full history.  
**Phase 2 (next):** Real-time streaming responses via WebSockets.  
**Phase 3 (planned):** Voice input (Whisper STT) + speech output (TTS).  
**Phase 4 (planned):** Memory system — AI adapts based on your recorded weaknesses.

---

## Tech Stack

| Layer     | Technology                          | Why                                                                 |
|-----------|-------------------------------------|---------------------------------------------------------------------|
| Frontend  | Next.js 14 (App Router) + TypeScript | Industry standard. App Router is current best practice.            |
| Styling   | Tailwind CSS + custom design tokens | Fast iteration. Cohesive design without a heavyweight component lib.|
| Backend   | Hono on Bun                         | Bun is genuinely fast. Hono is typed and lightweight.              |
| Database  | PostgreSQL via Drizzle ORM          | Type-safe queries. SQL-close syntax. Real migrations.              |
| Hosting   | Supabase (DB) + Vercel + Railway    | Free tiers cover everything. No DevOps needed.                     |
| AI        | Groq API (LLaMA 3.3 70B)           | Free tier. ~500 tok/sec. OpenAI-compatible.                        |
| Auth      | JWT (jose) + bcrypt                 | Simple and correct for this scale.                                 |

---

## Architecture

```
Browser (Next.js)
  │
  │  HTTP (POST /chat, GET /sessions, etc.)
  ▼
Hono API (Bun)
  ├── /auth      → register, login, me
  ├── /sessions  → CRUD for practice sessions
  └── /chat      → sends message to Groq, saves to DB, returns response
        │
        ├── Load history from PostgreSQL (last 20 messages)
        ├── Build system prompt (language + level + scenario)
        ├── Call Groq API (LLaMA 3.3 70B)
        ├── Save user + AI message to DB
        └── Return both messages to client
```

**Phase 1 keeps it simple:** No WebSockets, no streaming, no agents. A user sends a message → the API calls Groq → both messages are saved → the response is returned. That's it.

---

## Database Schema

```sql
users          (id, email, password_hash, display_name, created_at)
sessions       (id, user_id, language, level, status, title, started_at, ended_at, duration_seconds)
messages       (id, session_id, role, content, created_at)
```

Phase 1 uses exactly 3 tables. No premature columns for features that don't exist yet.

---

## Local Setup

### Prerequisites
- [Bun](https://bun.sh) v1.0+
- A [Supabase](https://supabase.com) account (free)
- A [Groq](https://console.groq.com) API key (free)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/lingua-ai
cd lingua-ai
bun install
```

### 2. Configure environment variables

```bash
# Backend
cp apps/api/.env.example apps/api/.env
# Fill in DATABASE_URL, GROQ_API_KEY, JWT_SECRET

# Frontend
cp apps/web/.env.local.example apps/web/.env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run database migrations

```bash
# From apps/api/
bun run db:push
```

### 4. Seed demo data (optional)

```bash
bun run db:seed
```

### 5. Start development servers

```bash
# From root — starts both frontend and backend
bun run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Backend health: http://localhost:3001/health

---

## Deployment

### Backend → Railway

1. Create a new Railway project
2. Connect your GitHub repo
3. Set root directory: `apps/api`
4. Set start command: `bun run start`
5. Add environment variables (DATABASE_URL, GROQ_API_KEY, JWT_SECRET, FRONTEND_URL)

### Frontend → Vercel

1. Import repo on Vercel
2. Set root directory: `apps/web`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app`

---

## Architecture Decisions

### Why not use an agent framework (Mastra, LangChain)?

Evaluated both. Mastra is too immature — you'd be debugging framework internals instead of product bugs. LangChain adds abstraction overhead without meaningful benefit when you have 1 AI call site. Plain TypeScript functions are readable, testable, and I can explain every line.

### Why Groq instead of OpenAI?

Groq's free tier is more generous for development. Inference speed is ~8x faster (important for streaming in Phase 2). The API is OpenAI-compatible, so the switch costs zero refactoring if needed.

### Why HTTP and not WebSockets from the start?

WebSockets solve a real-time problem. In Phase 1, the user sends a message and waits for a response — that's a request/response pattern, and HTTP handles it perfectly. WebSockets are added in Phase 2 when streaming requires a persistent connection. Adding them early would be solving an imaginary problem.

### Why not add Redis for session caching?

An in-memory Map on the server process is effectively Redis for a single-process application. There are 0 concurrent users at portfolio scale. Redis gets added when there are multiple backend processes that need to share state.

### Why Drizzle over Prisma?

Drizzle's API is SQL-close, which means the mental model stays accurate. Prisma's abstraction is powerful but opaque when something goes wrong. Drizzle also has lighter runtime overhead.

---

## Project Structure

```
lingua-ai/
├── apps/
│   ├── api/                    ← Hono + Bun backend
│   │   └── src/
│   │       ├── index.ts        ← Server entry point
│   │       ├── routes/         ← auth.ts, sessions.ts, chat.ts
│   │       ├── middleware/     ← auth.ts (JWT validation)
│   │       ├── db/             ← schema.ts, client.ts, seed.ts
│   │       └── lib/            ← groq.ts, errors.ts, logger.ts
│   │
│   └── web/                    ← Next.js frontend
│       ├── app/                ← Pages (App Router)
│       │   ├── page.tsx        ← Landing
│       │   ├── login/          ← Login
│       │   ├── register/       ← Register
│       │   ├── dashboard/      ← Session history
│       │   └── session/        ← New session + active chat + summary
│       └── lib/                ← api.ts, auth-context.tsx, utils.ts
│
└── turbo.json                  ← Turborepo pipeline
```

---

## Running Tests

```bash
# All tests
bun run test

# Watch mode
cd apps/api && bun run test:watch
```

Tests cover: system prompt generation, error class hierarchy, JWT round-trip, tampered token rejection.

---

## What's Next (Phase 2)

- WebSocket server for real-time streaming
- Tokens appear word-by-word instead of all at once
- ScenarioAgent generates custom personas per session
- Typed WebSocket message protocol

See `DECISIONS.md` for the full rationale on each phase boundary.
