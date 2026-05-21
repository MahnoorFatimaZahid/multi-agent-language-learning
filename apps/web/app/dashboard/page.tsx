"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, LogOut, Clock, MessageSquare,
  Globe, ChevronRight, TrendingUp,
} from "lucide-react";
import { sessionsApi, ApiError, type Session } from "../libs/api";
import { useAuth } from "../libs/auth-context";
import { LANGUAGE_CONFIG, LEVEL_CONFIG, formatDuration, formatDate, cn } from "../libs/utils";

function Skeleton() {
  return (
    <div className="card p-4 flex items-center gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-cream flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-cream rounded w-48" />
        <div className="h-3 bg-cream rounded w-32" />
      </div>
      <div className="h-6 w-20 bg-cream rounded-full" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-accent" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-ink leading-none">{value}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// Language breakdown
function LanguageBar({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const s of sessions) {
    counts[s.language] = (counts[s.language] ?? 0) + 1;
  }

  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="card p-4">
      <h3 className="section-label mb-3">Languages practiced</h3>
      <div className="space-y-2">
        {sorted.map(([lang, count]) => {
          const cfg = LANGUAGE_CONFIG[lang as keyof typeof LANGUAGE_CONFIG];
          const pct = Math.round((count / sessions.length) * 100);
          return (
            <div key={lang} className="flex items-center gap-3">
              <span className="text-lg w-6 flex-shrink-0">{cfg?.flag ?? "🌐"}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-medium text-ink">{cfg?.label ?? lang}</span>
                  <span className="text-xs text-muted">{count} session{count !== 1 ? "s" : ""}</span>
                </div>
                <div className="h-1.5 bg-cream rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    sessionsApi.list({ limit: 20 })
      .then(({ sessions: data }) => setSessions(data))
      .catch(err => {
        if (err instanceof ApiError && err.status === 401) logout();
        else setError("Failed to load sessions.");
      })
      .finally(() => setLoading(false));
  }, [user, logout]);

  if (authLoading || !user) return null;

  const completed   = sessions.filter(s => s.status === "completed");
  const totalMins   = Math.floor(
    completed.reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0) / 60
  );
  const uniqueLangs = new Set(sessions.map(s => s.language)).size;
  const streak      = getStreak(sessions);

  return (
    <div className="min-h-dvh bg-paper">

      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-ink rounded-md flex items-center justify-center">
              <span className="text-paper text-[10px] font-bold">L</span>
            </div>
            <span className="text-sm font-semibold text-ink">LinguaAI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:block">{user.displayName}</span>
            <button onClick={logout} className="btn-ghost py-1.5 px-3 text-xs">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* Welcome */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              Hey, {user.displayName.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-muted mt-1">
              {sessions.length === 0
                ? "Start your first conversation below."
                : `${sessions.length} practice session${sessions.length === 1 ? "" : "s"} total.`}
            </p>
          </div>
          <Link href="/session/new" className="btn-primary text-sm flex-shrink-0">
            <Plus size={16} /> New session
          </Link>
        </div>

        {/* Stats */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard icon={MessageSquare} label="Sessions"       value={sessions.length} />
            <StatCard icon={Clock}         label="Min practiced"  value={totalMins} />
            <StatCard icon={Globe}         label="Languages"      value={uniqueLangs} />
            <StatCard icon={TrendingUp}    label="Day streak"     value={streak} />
          </div>
        )}

        {/* Language breakdown */}
        {sessions.length > 2 && (
          <div className="mb-6">
            <LanguageBar sessions={sessions} />
          </div>
        )}

        {/* Session list */}
        <h2 className="section-label mb-3">Recent sessions</h2>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-danger mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🗣️</div>
            <h3 className="text-base font-semibold text-ink mb-2">No sessions yet</h3>
            <p className="text-sm text-muted mb-6 max-w-xs mx-auto">
              Start a conversation with your AI tutor.
              Pick a language and begin — no preparation needed.
            </p>
            <Link href="/session/new" className="btn-accent">
              <Plus size={16} /> Start your first session
            </Link>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {sessions.map(s => {
              const lang  = LANGUAGE_CONFIG[s.language as keyof typeof LANGUAGE_CONFIG];
              const level = LEVEL_CONFIG[s.level as keyof typeof LEVEL_CONFIG];
              return (
                <Link
                  key={s.id}
                  href={`/session/${s.id}/summary`}
                  className="card p-4 flex items-center gap-4 hover:border-accent/30 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center text-xl flex-shrink-0">
                    {lang?.flag ?? "🌐"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {s.title ?? `${lang?.label ?? s.language} session`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted">{formatDate(s.startedAt)}</span>
                      {s.durationSeconds && (
                        <>
                          <span className="text-xs text-border">·</span>
                          <span className="text-xs text-muted">{formatDuration(s.durationSeconds)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("badge text-[10px]", level?.color ?? "bg-gray-100 text-gray-600")}>
                      {level?.label}
                    </span>
                    <ChevronRight size={15} className="text-muted group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// Day streak calculator
function getStreak(sessions: Session[]): number {
  if (sessions.length === 0) return 0;

  const days = new Set(
    sessions.map(s => new Date(s.startedAt).toDateString())
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}