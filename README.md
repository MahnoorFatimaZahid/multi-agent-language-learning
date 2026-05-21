# LinguaAI — AI Language Practice Platform

> Practice real conversations with an AI tutor. Speak or type. Get instant feedback. No judgment — just progress.

**Live demo:** [lingua-ai-multi-agent.vercel.app](https://lingua-ai.vercel.app)
**Demo login:** `demo@lingua-ai.com` / `demo1234`

---

## What It Does

LinguaAI lets you practice speaking a foreign language with an AI tutor that:
- Plays a realistic character (café barista, hotel receptionist, etc.)
- Speaks back to you in the target language
- Corrects your mistakes naturally without breaking the conversation
- Gives you a detailed feedback report after each session
- Remembers your weaknesses and adapts future sessions

## Tech Stack

| Layer     | Technology                        | Why                                              |
|-----------|-----------------------------------|--------------------------------------------------|
| Frontend  | Next.js 14 + TypeScript           | Industry standard, App Router                    |
| Styling   | Tailwind CSS                      | Fast iteration, consistent design                |
| Backend   | Hono on Bun                       | Fast, typed, lightweight                         |
| Database  | PostgreSQL via Drizzle ORM        | Type-safe, SQL-close, real migrations            |
| AI (LLM)  | Groq API — LLaMA 3.3 70B         | Free tier, ~500 tok/sec streaming                |
| AI (STT)  | Groq Whisper API                  | Same API key, no self-hosting                    |
| TTS       | Web Speech API (browser-native)   | Free, zero latency, language-aware               |
| Auth      | JWT (jose) + bcrypt               | Simple, correct for this scale                   |
| Hosting   | Vercel (frontend) + Railway (API) | Free tiers, automatic CI/CD                      |

## Architecture
