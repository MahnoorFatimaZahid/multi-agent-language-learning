"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, ChevronRight, Zap } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Choose your language and scene",
    desc: "Pick from 8 languages — Spanish, French, German, Italian, Japanese, Mandarin, Portuguese, or Arabic. Set your level (beginner, intermediate, advanced) and choose a real-world scenario like ordering at a café, checking into a hotel, or a job interview. Or describe your own custom scene.",
    tag: "Next.js frontend → POST /sessions → PostgreSQL",
  },
  {
    num: "02",
    title: "AI builds your tutor persona",
    desc: "A ScenarioAgent sends your request to Groq's LLaMA 3 model. It generates a real character — a name, a job, a setting, and a detailed system prompt that defines how the AI will speak, correct mistakes, and stay in character throughout your session.",
    tag: "ScenarioAgent → Groq LLaMA 3.3 70B → WebSocket session_ready",
  },
  {
    num: "03",
    title: "Speak or type — response streams live",
    desc: "Type a message or hold the mic button to record. Your voice is captured by the browser's AudioWorklet at 16kHz, encoded as WAV, and sent to Groq Whisper for transcription. The AI response streams back token by token in real time. The browser's built-in text-to-speech reads the response aloud in the target language.",
    tag: "Groq Whisper STT → LLaMA 3 streaming → Web Speech TTS",
  },
  {
    num: "04",
    title: "End session — get a full feedback report",
    desc: "When you click End, a FeedbackAgent sends your full conversation transcript to Groq LLaMA 3 8B for analysis. You receive grammar, fluency, and vocabulary scores from 0–10, a list of specific corrections with explanations, actionable suggestions, and weakness tags like 'past_tense' or 'gender_agreement'.",
    tag: "FeedbackAgent → Groq LLaMA 3 8B → feedback_reports table",
  },
  {
    num: "05",
    title: "AI adapts to your weaknesses next time",
    desc: "Your weakness tags are saved in a user_memory table with frequency counts — so if you make the same mistake three sessions in a row, its count goes up. Before your next conversation starts, the top 3 most frequent weaknesses are injected directly into the AI's system prompt. It automatically focuses corrections on what you struggle with most.",
    tag: "MemoryService → JSONB weakness_tags → prompt injection",
  },
];

const STACK = [
  { layer: "Frontend",       name: "Next.js 14",          why: "App Router + TypeScript" },
  { layer: "Styling",        name: "Tailwind CSS",         why: "Utility-first, fast" },
  { layer: "Backend",        name: "Hono on Bun",          why: "Fast, typed, WebSocket" },
  { layer: "Database",       name: "PostgreSQL",           why: "Drizzle ORM + Supabase" },
  { layer: "AI — chat",      name: "Groq LLaMA 3.3 70B",  why: "~500 tokens/sec streaming" },
  { layer: "AI — feedback",  name: "Groq LLaMA 3 8B",     why: "Fast JSON analysis" },
  { layer: "AI — voice",     name: "Groq Whisper",         why: "Same API key, accurate STT" },
  { layer: "Text to speech", name: "Web Speech API",       why: "Browser-native, zero cost" },
  { layer: "Real-time",      name: "WebSockets (Bun)",     why: "Native support, no extra lib" },
  { layer: "Auth",           name: "JWT + bcrypt",         why: "Simple, correct at this scale" },
  { layer: "Hosting — web",  name: "Vercel",               why: "Zero config, auto deploy" },
  { layer: "Hosting — API",  name: "Render",               why: "Free tier, Bun support" },
];

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);
  const step = STEPS[activeStep]!;

  return (
    <div className="min-h-screen bg-[#030307] text-zinc-300 selection:bg-white/10 selection:text-white">

      {/* Nav */}
      <nav className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs uppercase tracking-widest font-medium">Back</span>
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <header className="mb-20">
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-zinc-400 mb-6">
            <Sparkles className="w-3 h-3" /> How the platform works
          </div> */}
          <h1 className="text-4xl sm:text-5xl font-medium  font-serif text-white mb-4 tracking-tight">
            Simple steps to <br />
            <span className="text-zinc-300 italic">better language skills.</span>
          </h1>
          <p className="text-sm text-zinc-600 max-w-lg leading-relaxed">
            Built on Groq LLaMA 3, Groq Whisper, Hono, Bun, PostgreSQL, and WebSockets.
            Every step below shows exactly what runs under the hood.
          </p>
        </header>

        {/* Steps grid */}
        <div className="grid md:grid-cols-12 gap-16 mb-32">

          {/* Step list */}
          <div className="md:col-span-5 space-y-2">
            {STEPS.map((s, i) => (
              <button
                key={s.num}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                  activeStep === i ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-mono ${activeStep === i ? "text-indigo-400" : "text-zinc-700"}`}>
                    {s.num}
                  </span>
                  <span className={`text-sm font-semibold ${activeStep === i ? "text-white" : "text-zinc-500"}`}>
                    {s.title}
                  </span>
                  {activeStep === i && (
                    <ChevronRight className="w-4 h-4 ml-auto text-indigo-400 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Detail pane */}
          <div className="md:col-span-7 flex flex-col justify-center" key={activeStep}>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-5xl font-mono font-bold text-white/5">{step.num}</span>
                <h2 className="text-2xl font-medium  font-serif  italic text-white">{step.title}</h2>
              </div>

              <p className="text-base leading-relaxed text-zinc-400">
                {step.desc}
              </p>

              <div className="pt-6 border-t border-white/5 flex items-center gap-3">
                <Zap className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
                  {step.tag}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech stack */}
        <section className="mb-32">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
              Full tech stack
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {STACK.map(({ layer, name, why }) => (
              <div
                key={name}
                className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1 font-mono">
                  {layer}
                </p>
                <p className="text-sm font-semibold text-white mb-0.5">{name}</p>
                <p className="text-[11px] text-zinc-500 leading-snug">{why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why decisions */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">
              Architecture decisions
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Why Groq instead of OpenAI?",
                a: "Groq's free tier is more generous and inference runs ~8x faster. For real-time streaming, speed matters. The API is OpenAI-compatible so switching costs zero refactoring.",
              },
              {
                q: "Why WebSockets only for chat — not everything?",
                a: "Session creation, auth, and history are request/response — HTTP is the correct tool. Only streaming responses need a persistent connection. Right tool for the right job.",
              },
              {
                q: "Why no agent framework like LangChain or Mastra?",
                a: "With 2 agents, a framework adds more complexity than it removes. Plain TypeScript classes are readable, debuggable, and every line can be explained clearly.",
              },
              {
                q: "Why Web Speech API for text-to-speech?",
                a: "Browser-native, completely free, zero latency overhead, and it automatically selects the correct voice for the target language. ElevenLabs is a clean upgrade path later.",
              },
              {
                q: "Why store memory as a JSONB column — not a vector database?",
                a: "The memory system is a frequency counter: { past_tense: 3, gender_agreement: 2 }. That is a JSONB column and a WHERE clause. RAG and vector DBs solve a retrieval problem you don't have yet.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.02]"
              >
                <p className="text-sm font-medium  text-white mb-2">{q}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 text-xs text-zinc-600">
        <p>© 2026 LinguaAI — AI Language Practice Platform</p>
        <Link
          href="/register"
          className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-zinc-200 transition-colors"
        >
          Start practicing free →
        </Link>
      </footer>
    </div>
  );
}