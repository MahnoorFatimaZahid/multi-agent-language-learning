"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Clock, MessageSquare, Plus, CheckCircle2, AlertCircle, Lightbulb, Target, TrendingUp, ChevronRight, CornerDownRight } from "lucide-react";
import { sessionsApi, ApiError, type Session, type Message } from "../../../libs/api";
import { useAuth } from "../../../libs/auth-context";
import {
  LANGUAGE_CONFIG,
  LEVEL_CONFIG,
  formatDuration,
  formatDate,
  formatTime,
  cn,
} from "../../../libs/utils";
import type { Language, Level } from "../../../libs/api";

interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  type: string;
}

interface FeedbackReport {
  grammarScore: number;
  fluencyScore: number;
  vocabScore: number;
  corrections: Correction[];
  suggestions: string[];
  strengths: string[];
  weaknessTags: string[];
}

export default function SummaryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [scenario, setScenario] = useState<{
    personaName: string;
    personaRole: string;
    setting: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    sessionsApi.get(params.id)
      .then(({ session: s, messages: m }) => {
        if (!isMounted) return;
        setSession(s);
        setMsgs(m);

        if (s.scenarioContext) {
          const ctx = s.scenarioContext as Record<string, unknown>;
          if (typeof ctx.personaName === "string") {
            setScenario({
              personaName: ctx.personaName,
              personaRole: typeof ctx.personaRole === "string" ? ctx.personaRole : "",
              setting: typeof ctx.setting === "string" ? ctx.setting : "",
            });
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/dashboard");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [user, params.id, router]);

  useEffect(() => {
    if (!user || !params.id) return;

    const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
    const token = localStorage.getItem("token");
    let attempts = 0;
    const maxAttempts = 10;

    async function pollFeedback() {
      try {
        const res = await fetch(`${API_BASE}/feedback/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setFeedbackLoading(false);
          return;
        }

        const data = (await res.json()) as {
          feedback: FeedbackReport | null;
          status: "pending" | "ready";
        };

        if (data.status === "ready" && data.feedback) {
          setFeedback(data.feedback);
          setFeedbackLoading(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          pollTimerRef.current = setTimeout(pollFeedback, 1500);
        } else {
          setFeedbackLoading(false);
        }
      } catch {
        setFeedbackLoading(false);
      }
    }

    pollTimerRef.current = setTimeout(pollFeedback, 2000);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [user, params.id]);

  if (authLoading || loading || !user || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
        <div className="w-6 h-6 border-2 border-neutral-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  const lang = LANGUAGE_CONFIG[session.language as Language];
  const level = LEVEL_CONFIG[session.level as Level];
  const userMsgCount = msgs.filter((m) => m.role === "user").length;
  
  const overallScore = feedback 
    ? (feedback.grammarScore + feedback.fluencyScore + feedback.vocabScore) / 3 
    : 0;

  return (
    <div className="min-h-screen bg-[#060911] text-neutral-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-emerald-500/[0.04] via-transparent to-transparent pointer-events-none blur-3xl z-0" />

      {/* Header Navigation */}
      <header className="border-b border-neutral-800/60 bg-[#060911]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="group p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/50 border border-transparent hover:border-neutral-800 transition-all"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div className="h-4 w-px bg-neutral-800" />
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
              <Link href="/dashboard" className="hover:text-neutral-200">Dashboard</Link>
              <ChevronRight className="w-3 h-3 text-neutral-600" />
              <span className="text-neutral-200">Review Result</span>
            </div>
          </div>

          <Link href="/session/new" className="inline-flex items-center gap-1.5 bg-white from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 px-4 py-2 rounded-xl font-bold text-xs shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all hover:scale-[1.02]">
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Keep Practicing
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 border-b border-neutral-800/40 bg-gradient-to-b from-neutral-900/30 to-transparent py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                  <span>{lang?.flag ?? "🌐"}</span> {lang?.label}
                </span>
                <span className={cn("text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border", level?.color ?? "bg-neutral-900 border-neutral-800 text-neutral-400")}>
                  {level?.label}
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-4xl italic font-medium tracking-tight text-white max-w-2xl bg-clip-text bg-white from-white via-neutral-100 to-neutral-400">
                {session.title ?? `Practice Complete!`}
              </h1>
              <p className="text-sm sm:text-base text-neutral-400 mt-2 max-w-xl leading-relaxed">
                See how well you did below. Check your scores, helpful corrections, and tips to see where you can improve next time.
              </p>
            </div>

            {/* Score Ring */}
            {feedback && (
              <div className="bg-gradient-to-b from-neutral-900 to-[#0b101d] border border-neutral-800 rounded-3xl p-6 flex items-center gap-6 shadow-xl min-w-[280px]">
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="8" fill="transparent" 
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * (overallScore * 10)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black font-mono text-white">{overallScore.toFixed(1)}</span>
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest -mt-0.5">Total</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <TrendingUp className="w-3.5 h-3.5" /> Great Job
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">Your Final Score</h4>
                  <p className="text-xs text-neutral-400 mt-1 max-w-[160px] leading-snug">Based on grammar, fluency, and vocabulary.</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-neutral-800/40">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Time Spent</p>
              <p className="text-lg font-bold text-neutral-200 mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" /> {formatDuration(session.durationSeconds)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Sentences</p>
              <p className="text-lg font-bold text-neutral-200 mt-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neutral-400" /> {userMsgCount} Turns
              </p>
            </div>
            {scenario && (
              <>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Partner</p>
                  <p className="text-lg font-bold text-neutral-200 mt-1 truncate">{scenario.personaName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Scenario</p>
                  <p className="text-lg font-bold text-neutral-200 mt-1 truncate">{scenario.setting || "Conversation"}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Scores & Feedback */}
          <section className="lg:col-span-7 space-y-8">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/60">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Your Progress Breakdown
              </h2>
            </div>

            {feedbackLoading ? (
              <div className="bg-[#0b0f19]/40 border border-neutral-800/80 rounded-2xl p-6 space-y-6 animate-pulse">
                <div className="h-4 bg-neutral-800 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 bg-neutral-800 rounded-xl" />
                </div>
              </div>
            ) : feedback ? (
              <div className="space-y-6">
                
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: "Grammar", val: feedback.grammarScore, icon: CheckCircle2, desc: "Correct sentence rules." },
                    { title: "Fluency", val: feedback.fluencyScore, icon: Clock, desc: "Natural flow and speed." },
                    { title: "Vocabulary", val: feedback.vocabScore, icon: Target, desc: "Word choice and variety." }
                  ].map((metric, idx) => (
                    <div key={idx} className="bg-gradient-to-b from-[#0d1322] to-[#070b14] border border-neutral-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">{metric.title}</span>
                        <metric.icon className="w-3.5 h-3.5 text-neutral-500" />
                      </div>
                      <p className="text-2xl font-black font-mono text-white">{metric.val.toFixed(1)}</p>
                      <div className="w-full bg-neutral-800 h-1 rounded-full mt-3 overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", 
                            metric.val >= 8 ? "bg-emerald-500" : metric.val >= 6 ? "bg-amber-500" : "bg-rose-500"
                          )} 
                          style={{ width: `${metric.val * 10}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Helpful Corrections */}
                {feedback.corrections.length > 0 && (
                  <div className="bg-[#0b101d]/60 border border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-neutral-900/40 border-b border-neutral-800/60 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Recommended Corrections
                      </h4>
                      <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md font-semibold">
                        {feedback.corrections.length} Tips
                      </span>
                    </div>
                    <div className="divide-y divide-neutral-800/60">
                      {feedback.corrections.map((c, i) => (
                        <div key={i} className="p-4 hover:bg-neutral-900/20 transition-colors space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                            <div className="flex-1 text-rose-400 bg-rose-500/[0.03] border border-rose-500/10 px-3 py-1.5 rounded-xl line-through opacity-80">
                              {c.original}
                            </div>
                            <div className="hidden sm:block text-neutral-600 shrink-0 font-mono text-xs">→</div>
                            <div className="flex-1 text-emerald-400 bg-emerald-500/[0.03] border border-emerald-500/10 px-3 py-1.5 rounded-xl font-semibold">
                              {c.corrected}
                            </div>
                          </div>
                          {c.explanation && (
                            <div className="flex items-start gap-1.5 text-xs text-neutral-400 px-1 pt-1">
                              <CornerDownRight className="w-3.5 h-3.5 text-neutral-600 mt-0.5 shrink-0" />
                              <p className="italic leading-relaxed">{c.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {feedback.strengths.length > 0 && (
                    <div className="bg-[#070b14] border border-neutral-800/80 rounded-2xl p-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> What You Did Well
                      </h4>
                      <ul className="space-y-2.5">
                        {feedback.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-neutral-300 leading-relaxed flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.suggestions.length > 0 && (
                    <div className="bg-[#070b14] border border-neutral-800/80 rounded-2xl p-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2 mb-3">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Ways to Improve
                      </h4>
                      <ul className="space-y-2.5">
                        {feedback.suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-neutral-300 leading-relaxed flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Target Topics */}
                {feedback.weaknessTags.length > 0 && (
                  <div className="bg-[#070b14] border border-neutral-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wide shrink-0">
                      <Target className="w-4 h-4 text-neutral-500" /> Grammar Topics to Focus On:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {feedback.weaknessTags.map((tag, i) => (
                        <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 uppercase tracking-wide">
                          {tag.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-2xl text-center">
                <p className="text-sm text-neutral-500">No feedback data found for this session.</p>
              </div>
            )}
          </section>

          {/* Right Column: Chat History */}
          <section className="lg:col-span-5 space-y-4 lg:sticky lg:top-24 max-h-[calc(100vh-12rem)] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/60 shrink-0">
              <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-400" /> Conversation History
              </h2>
              <span className="text-[11px] text-neutral-500 font-mono">{msgs.length} Messages</span>
            </div>

            {msgs.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl text-center">
                <p className="text-xs text-neutral-500">No chat history available.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar max-h-[500px] lg:max-h-none">
                {msgs.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={m.id} className={cn("flex w-full items-end gap-2", isUser ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm",
                        isUser
                          ? "bg-neutral-200 text-neutral-950 rounded-br-none font-medium"
                          : "bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none"
                      )}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <div className={cn("text-[9px] font-medium tracking-wide mt-1 opacity-40 font-mono", isUser ? "text-right" : "text-left")}>
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10 mt-12 border-t border-neutral-800/60 max-w-md mx-auto">
          <Link href="/session/new" className="w-full text-center bg-white from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 px-6 py-3 rounded-xl text-xs font-bold tracking-wider uppercase shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all hover:scale-[1.01]">
            Start Next Practice
          </Link>
          <Link href="/dashboard" className="w-full text-center bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 px-6 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all">
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}