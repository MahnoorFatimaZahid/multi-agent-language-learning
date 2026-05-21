import Link from "next/link";
import { LANGUAGE_CONFIG } from "./libs/utils";

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center">
            <span className="text-paper text-xs font-bold">L</span>
          </div>
          <span className="text-sm font-semibold text-ink">LinguaAI</span>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-soft border border-accent/20 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-medium text-accent">
            AI-powered · Voice + Text · Free to start
          </span>
        </div>

        <h1 className="text-5xl md:text-6xl font-semibold text-ink leading-tight tracking-tight max-w-2xl mb-6">
          Speak a new language<br />
          <span className="italic font-light text-muted">with confidence</span>
        </h1>

        <p className="text-lg text-muted max-w-lg leading-relaxed mb-10">
          Practice real conversations with an AI tutor. Speak or type.
          Get instant feedback on grammar, fluency, and vocabulary.
          No judgment — just progress.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-20">
          <Link href="/register" className="btn-primary px-8 py-3.5 text-base">
            Start for free →
          </Link>
          <Link
            href="/login?demo=true"
            className="btn-secondary px-8 py-3.5 text-base"
          >
            Try demo account
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mb-16">
          {[
            {
              icon: "🎤",
              title: "Voice conversations",
              desc: "Hold the mic button and speak naturally. Whisper transcribes your voice in real time.",
            },
            {
              icon: "🧠",
              title: "Smart feedback",
              desc: "After every session get grammar, fluency and vocabulary scores with specific corrections.",
            },
            {
              icon: "📈",
              title: "Remembers you",
              desc: "Your weaknesses are tracked across sessions. The AI adapts to focus on what you need.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="card p-5 text-left">
              <p className="text-2xl mb-3">{icon}</p>
              <h3 className="text-sm font-semibold text-ink mb-1">{title}</h3>
              <p className="text-xs text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Language grid */}
        <p className="section-label mb-4">8 languages available</p>
        <div className="grid grid-cols-4 gap-2 max-w-lg w-full">
          {Object.entries(LANGUAGE_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white border border-border hover:border-accent/30 transition-colors cursor-default"
            >
              <span className="text-2xl">{cfg.flag}</span>
              <span className="text-xs font-medium text-ink">{cfg.label}</span>
              <span className="text-[10px] text-muted">{cfg.nativeName}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-5 text-center">
        <p className="text-xs text-muted">
          Built with Hono, Next.js, Groq LLaMA 3 + Whisper ·{" "}
          <a
            href="https://github.com"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View source
          </a>
        </p>
      </footer>
    </div>
  );
}