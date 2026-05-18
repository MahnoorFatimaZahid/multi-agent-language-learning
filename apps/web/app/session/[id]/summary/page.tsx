"use client";

import { useEffect, useState } from "react";
import { useRouter }           from "next/navigation";
import Link                    from "next/link";
import { ArrowLeft, Plus }     from "lucide-react";
import { sessionsApi, ApiError, type Session, type Message } from "../../../libs/api";
import { useAuth }             from "../../../libs/auth-context";
import {
  LANGUAGE_CONFIG, LEVEL_CONFIG,
  formatDuration, formatDate, formatTime, cn,
} from "../../../libs/utils";
import type { Language, Level } from "../../../libs/api";

// ── Feedback types ─────────────────────────────────────────────────────────
interface Correction {
  original:    string;
  corrected:   string;
  explanation: string;
  type:        string;
}

interface FeedbackReport {
  grammarScore: number;
  fluencyScore: number;
  vocabScore:   number;
  corrections:  Correction[];
  suggestions:  string[];
  strengths:    string[];
  weaknessTags: string[];
}

// ── Score card ─────────────────────────────────────────────────────────────
function ScoreCard({
  label,
  score,
  emoji,
}: {
  label: string;
  score: number;
  emoji: string;
}) {
  const color =
    score >= 8 ? "text-success" :
    score >= 6 ? "text-amber-600" :
    "text-danger";

  const bg =
    score >= 8 ? "bg-emerald-50 border-emerald-200" :
    score >= 6 ? "bg-amber-50 border-amber-200" :
    "bg-red-50 border-red-200";

  return (
    <div className={cn("card p-4 text-center border", bg)}>
      <p className="text-2xl mb-1">{emoji}</p>
      <p className={cn("text-2xl font-bold", color)}>
        {score.toFixed(1)}
        <span className="text-sm font-normal text-muted">/10</span>
      </p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}

// ── Feedback skeleton ──────────────────────────────────────────────────────
function FeedbackSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-cream rounded-2xl" />
        ))}
      </div>
      <div className="h-32 bg-cream rounded-2xl" />
      <div className="h-24 bg-cream rounded-2xl" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function SummaryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();

  const [session,  setSession]  = useState<Session | null>(null);
  const [msgs,     setMsgs]     = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [scenario, setScenario] = useState<{
    personaName: string;
    personaRole: string;
    setting:     string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Session + messages load karo
  useEffect(() => {
    if (!user) return;

    sessionsApi.get(params.id)
      .then(({ session: s, messages: m }) => {
        setSession(s);
        setMsgs(m);

        if (s.scenarioContext) {
          const ctx = s.scenarioContext as {
            personaName?: string;
            personaRole?: string;
            setting?:     string;
          };
          if (ctx.personaName) {
            setScenario({
              personaName: ctx.personaName,
              personaRole: ctx.personaRole ?? "",
              setting:     ctx.setting     ?? "",
            });
          }
        }
      })
      .catch(err => {
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/dashboard");
        }
      })
      .finally(() => setLoading(false));
  }, [user, params.id, router]);

  // Feedback load karo — poll karo jab tak ready na ho
  // Kyunki feedback background mein generate hoti hai
  useEffect(() => {
    if (!user || !params.id) return;

    const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
    const token    = localStorage.getItem("token");

    let attempts = 0;
    const maxAttempts = 10; // max 10 attempts = 10 seconds

    async function pollFeedback() {
      try {
        const res = await fetch(`${API_BASE}/feedback/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFeedbackLoading(false);
          return;
        }

        const data = await res.json() as {
          feedback: FeedbackReport | null;
          status:   "pending" | "ready";
        };

        if (data.status === "ready" && data.feedback) {
          setFeedback(data.feedback);
          setFeedbackLoading(false);
          return;
        }

        // Abhi tak ready nahi — dobara try karo
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollFeedback, 1500);
        } else {
          setFeedbackLoading(false);
        }

      } catch {
        setFeedbackLoading(false);
      }
    }

    // 2 second baad start karo — feedback generate hone ka time do
    setTimeout(pollFeedback, 2000);

  }, [user, params.id]);

  if (authLoading || loading || !user || !session) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-paper">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lang  = LANGUAGE_CONFIG[session.language as Language];
  const level = LEVEL_CONFIG[session.level as Level];
  const userMsgCount = msgs.filter(m => m.role === "user").length;

  return (
    <div className="min-h-dvh bg-paper">

      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="btn-ghost p-2 -ml-2">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-ink">
              {session.title ?? `${lang?.label} session`}
            </h1>
            <p className="text-xs text-muted">{formatDate(session.startedAt)}</p>
          </div>
          <Link href="/session/new" className="btn-primary text-sm py-2">
            <Plus size={15} /> New session
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl">{lang?.flag ?? "🌐"}</p>
            <p className="text-xs text-muted mt-1">{lang?.label}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-ink">{userMsgCount}</p>
            <p className="text-xs text-muted mt-1">Messages sent</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-lg font-semibold text-ink">
              {formatDuration(session.durationSeconds)}
            </p>
            <p className="text-xs text-muted mt-1">Duration</p>
          </div>
        </div>

        {/* Persona */}
        {scenario && (
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-paper font-semibold">
              {scenario.personaName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{scenario.personaName}</p>
              <p className="text-xs text-muted">
                {scenario.personaRole} · {scenario.setting}
              </p>
            </div>
          </div>
        )}

        {/* ── Feedback Section ─────────────────────────────────────── */}
        <div>
          <h2 className="section-label mb-4">Session feedback</h2>

          {feedbackLoading ? (
            <div>
              <p className="text-xs text-muted mb-3 flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                Analyzing your conversation…
              </p>
              <FeedbackSkeleton />
            </div>
          ) : feedback ? (
            <div className="space-y-4">

              {/* Scores */}
              <div className="grid grid-cols-3 gap-3">
                <ScoreCard label="Grammar"   score={feedback.grammarScore} emoji="📝" />
                <ScoreCard label="Fluency"   score={feedback.fluencyScore} emoji="🗣️" />
                <ScoreCard label="Vocabulary" score={feedback.vocabScore}  emoji="📚" />
              </div>

              {/* Strengths */}
              {feedback.strengths.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-ink mb-2">
                    ✅ What you did well
                  </h3>
                  <ul className="space-y-1">
                    {feedback.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted flex gap-2">
                        <span className="text-success">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Corrections */}
              {feedback.corrections.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-ink mb-3">
                    ✏️ Corrections
                  </h3>
                  <div className="space-y-3">
                    {feedback.corrections.map((c, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-start gap-2">
                          <span className="line-through text-danger/70 mt-0.5">
                            {c.original}
                          </span>
                          <span className="text-muted">→</span>
                          <span className="font-medium text-success">
                            {c.corrected}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5 ml-0">
                          {c.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {feedback.suggestions.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-ink mb-2">
                    💡 Suggestions
                  </h3>
                  <ul className="space-y-1.5">
                    {feedback.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-muted flex gap-2">
                        <span className="text-accent">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weakness tags */}
              {feedback.weaknessTags.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-ink mb-2">
                    🎯 Areas to practice
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {feedback.weaknessTags.map((tag, i) => (
                      <span
                        key={i}
                        className="badge bg-amber-50 text-amber-700 border border-amber-200"
                      >
                        {tag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="card p-6 text-center">
              <p className="text-sm text-muted">
                Feedback not available for this session.
              </p>
            </div>
          )}
        </div>

        {/* Level badge */}
        <div className="flex items-center gap-2">
          <span className={cn("badge", level?.color ?? "bg-gray-100 text-gray-600")}>
            {level?.label}
          </span>
          <span className="text-xs text-muted">level session</span>
        </div>

        {/* Transcript */}
        <div>
          <h2 className="section-label mb-4">Full conversation</h2>
          {msgs.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-muted">No messages in this session.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {msgs.map(m => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={cn("flex", isUser ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                      isUser
                        ? "bg-ink text-paper rounded-br-sm"
                        : "bg-white border border-border text-ink rounded-bl-sm"
                    )}>
                      <p>{m.content}</p>
                      <p className={cn(
                        "text-[10px] mt-1 opacity-40",
                        isUser ? "text-right" : ""
                      )}>
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center pb-8">
          <Link href="/session/new" className="btn-accent">
            <Plus size={16} /> Practice again
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
        </div>

      </main>
    </div>
  );
}