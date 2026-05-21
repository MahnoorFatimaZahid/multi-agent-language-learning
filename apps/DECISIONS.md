# Architecture Decision Record

Every major technical decision in this project with honest reasoning.

---

## ADR-001: HTTP for sessions, WebSocket for chat

**Decision:** Session CRUD uses HTTP. Real-time chat uses WebSocket.

**Reason:** Sessions are request/response operations — create, read, end. HTTP handles this perfectly. Chat requires streaming tokens from Groq to the browser in real time, which needs a persistent connection. WebSocket solves the actual problem. Using WebSocket for everything would be over-engineering Phase 1.

---

## ADR-002: Plain TypeScript agents, no framework

**Decision:** ScenarioAgent and FeedbackAgent are plain TypeScript classes.

**Reason:** Evaluated Mastra and LangChain. Both add abstraction over Groq API calls that I can write in 20 lines. With 2 agents, there is nothing to orchestrate. Frameworks add dependency risk, version lock, and make it harder to explain internals in interviews. Plain classes mean I own every line.

---

## ADR-003: Groq over OpenAI

**Decision:** Groq API for both LLM (LLaMA 3) and STT (Whisper).

**Reason:** Free tier covers all development and demo usage. Inference speed is ~8x faster than GPT-4o which matters for streaming perception. Same API key for LLM and Whisper — no extra accounts. API is OpenAI-compatible so switching is a one-line change.

---

## ADR-004: Web Speech API for TTS

**Decision:** Browser-native TTS, not ElevenLabs or Piper.

**Reason:** Zero cost, zero latency (no network round-trip), works offline, language-aware voice selection. For a portfolio demo the quality is sufficient. ElevenLabs is a clear upgrade path when voice quality becomes a real requirement.

---

## ADR-005: Drizzle ORM over Prisma

**Decision:** Drizzle for database access.

**Reason:** SQL-close API means the mental model is accurate. When something goes wrong the query is obvious. No client generation step. Lighter runtime overhead. TypeScript inference is immediate from schema.

---

## ADR-006: No Redis

**Decision:** In-memory Map for WebSocket session state.

**Reason:** Single process, no horizontal scaling at portfolio scale. An in-memory Map is functionally identical to Redis for one process. Redis gets added when there are multiple backend instances that need to share state. That problem does not exist yet.

---

## ADR-007: Strict Mode disabled

**Decision:** reactStrictMode: false in Next.js config.

**Reason:** React Strict Mode mounts components twice in development. For most components this is fine. For WebSocket connections it causes: mount → unmount (closes WS, marks session abandoned) → mount (tries to reconnect to abandoned session). Disabling Strict Mode is the correct solution for real-time connection apps.

---

## Phase Boundary Rationale

| Boundary | Reason |
|----------|--------|
| Phase 1 → 2 | Streaming needs WebSocket. Add WebSocket when streaming is the requirement, not before. |
| Phase 2 → 3 | Voice needs streaming infrastructure. Build on proven foundation. |
| Phase 3 → 4 | Memory needs session history to exist. Personalize after data accumulates. |
| Phase 4 → 5 | Polish only valuable after features are stable. |