"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, LogOut, Clock, MessageSquare,
  Globe, ChevronRight, TrendingUp, BarChart3, LayoutDashboard
} from "lucide-react";
import { sessionsApi, ApiError, type Session } from "../libs/api";
import { useAuth } from "../libs/auth-context";
import { LANGUAGE_CONFIG, LEVEL_CONFIG, formatDuration, formatDate, cn } from "../libs/utils";

function Skeleton() {
  return (
    <div className="w-full bg-neutral-950/40 border border-white/[0.04] p-5 rounded-2xl flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-neutral-900/60 flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-4 bg-neutral-900/60 rounded-md w-48" />
        <div className="h-3 bg-neutral-900/60 rounded-md w-32" />
      </div>
      <div className="h-7 w-20 bg-neutral-900/60 rounded-full" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-neutral-950 border border-white/[0.04] p-5 rounded-2xl flex items-center gap-4 hover:border-indigo-500/20 hover:bg-neutral-950/80 transition-all duration-300">
      <div className="w-10 h-10 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-indigo-400" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-white tracking-tight leading-none">{value}</p>
        <p className="text-xs text-neutral-400 mt-1.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    sessionsApi.list({ limit: 20 })
      .then(({ sessions: data }) => setSessions(data))
      .catch(err => {
        if (err instanceof ApiError && err.status === 401) logout();
        else setError("Could not load your history. Please refresh the page.");
      })
      .finally(() => setLoading(false));
  }, [user, logout]);

  if (authLoading || !user) return null;

  const completed = sessions.filter(s => s.status === "completed");
  const totalMins = Math.floor(
    completed.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0) / 60
  );
  const uniqueLangs = new Set(sessions.map(s => s.language)).size;
  const streak = getStreak(sessions);

  // Group languages for breakdown cards
  const langCounts: Record<string, number> = {};
  sessions.forEach(s => { langCounts[s.language] = (langCounts[s.language] ?? 0) + 1; });
  const topLanguages = Object.entries(langCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#020205] text-white font-sans antialiased relative flex flex-col lg:flex-row">
      
      {/* Background Visual Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(99,102,241,0.04),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZHRoPSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDE1Ii8+Cjwvc3ZnPg==')] opacity-40 pointer-events-none" />

      {/* 1. Left Sidebar Navigation (Desktop Only) */}
      <aside className="hidden lg:flex flex-col justify-between w-64 border-r border-white/[0.04] bg-[#020205]/40 p-6 sticky top-0 h-screen z-20">
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-3 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            <span className="text-sm font-bold tracking-wider uppercase">LinguaAI</span>
          </Link>

          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] text-white text-sm font-medium transition-all">
              <LayoutDashboard size={16} className="text-indigo-400" />
              Dashboard
            </Link>
          </nav>
        </div>

        <button 
          onClick={logout} 
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-950 border border-transparent hover:border-white/[0.04] text-sm font-medium transition-all"
        >
          <LogOut size={16} /> 
          Sign out
        </button>
      </aside>

      {/* 2. Top Header Navigation (Mobile Only) */}
      <header className="lg:hidden border-b border-white/[0.04] bg-[#020205]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-xs font-bold tracking-wider uppercase">LinguaAI</span>
        </Link>
        <button 
          onClick={logout} 
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white border border-white/[0.06] bg-neutral-950 px-3 py-1.5 rounded-lg transition-all"
        >
          <LogOut size={14} /> Sign out
        </button>
      </header>

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 lg:py-12 space-y-10 relative z-10">

        {/* Welcome Block and Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
          <div>
            <h1 className="text-3xl font-normal tracking-tight text-white">
              Hello, <span className="font-serif italic text-neutral-400">{user.displayName.split(" ")[0]}</span>
            </h1>
            <p className="text-sm text-neutral-400 mt-1 font-light">
              {sessions.length === 0
                ? "Ready to practice speaking? Start your first chat below."
                : `You have completed ${sessions.length} speech practice session${sessions.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          <Link 
            href="/session/new" 
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider bg-white text-black rounded-xl hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-[0_4px_25px_rgba(255,255,255,0.08)]"
          >
            <Plus size={15} /> Start Speaking
          </Link>
        </div>

        {/* Dynamic Multi-Column Grid Layout */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Side: Stats and Progress */}
            <div className="md:col-span-7 space-y-6">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={14} className="text-indigo-400" /> Progress Overview
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={MessageSquare} label="Total Chats" value={sessions.length} />
                <StatCard icon={Clock} label="Minutes Spoken" value={totalMins} />
                <StatCard icon={Globe} label="Languages" value={uniqueLangs} />
                <StatCard icon={TrendingUp} label="Day Streak" value={streak} />
              </div>
            </div>

            {/* Right Side: Language Breakdown */}
            {sessions.length > 0 && topLanguages.length > 0 && (
              <div className="md:col-span-5 space-y-6">
                <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Favorite Languages</h2>
                <div className="bg-neutral-950 border border-white/[0.04] p-5 rounded-2xl space-y-4 h-[calc(100%-2rem)] flex flex-col justify-center">
                  {topLanguages.map(([lang, count]) => {
                    const cfg = LANGUAGE_CONFIG[lang as keyof typeof LANGUAGE_CONFIG];
                    const pct = Math.round((count / sessions.length) * 100);
                    return (
                      <div key={lang} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-white flex items-center gap-2">
                            <span>{cfg?.flag ?? "🌐"}</span> {cfg?.label ?? lang}
                          </span>
                          <span className="text-neutral-400">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Practice History List */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Recent Activity</h2>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="border border-white/[0.04] bg-neutral-950/30 rounded-2xl p-12 text-center max-w-md mx-auto">
              <div className="text-4xl mb-4 opacity-80">🗣️</div>
              <h3 className="text-base font-medium text-white mb-2">No conversations yet</h3>
              <p className="text-sm text-neutral-400 mb-6 font-light leading-relaxed">
                Start a session with your AI agent to pick a language and practice speaking instantly.
              </p>
              <Link 
                href="/session/new" 
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-white text-black rounded-xl hover:bg-neutral-100 transition-all"
              >
                <Plus size={14} /> Start your first chat
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => {
                const lang = LANGUAGE_CONFIG[s.language as keyof typeof LANGUAGE_CONFIG];
                const level = LEVEL_CONFIG[s.level as keyof typeof LEVEL_CONFIG];
                return (
                  <Link
                    key={s.id}
                    href={`/session/${s.id}/summary`}
                    className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950 border border-white/[0.04] hover:border-indigo-500/30 hover:bg-neutral-950/80 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center text-2xl flex-shrink-0 border border-white/[0.04]">
                        {lang?.flag ?? "🌐"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
                          {s.title ?? `${lang?.label ?? s.language} Session`}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400 font-light">
                          <span>{formatDate(s.startedAt)}</span>
                          {s.durationSeconds && (
                            <>
                              <span className="text-neutral-800">•</span>
                              <span>{formatDuration(s.durationSeconds)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-semibold border uppercase tracking-wider",
                        level?.color ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-400" : "bg-neutral-900 border-neutral-800 text-neutral-400"
                      )}>
                        {level?.label ?? "General"}
                      </span>
                      <ChevronRight size={16} className="text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

function getStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map(s => new Date(s.startedAt).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else break;
  }
  return streak;
}