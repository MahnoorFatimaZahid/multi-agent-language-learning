"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, StopCircle } from "lucide-react";
import { chatApi, sessionsApi, ApiError, type Message, type Session } from "../../../libs/api";
import { useAuth } from "../../../libs/auth-context";
import { LANGUAGE_CONFIG, LEVEL_CONFIG, formatDuration, cn } from "../../../libs/utils";
import type { Language, Level } from "../../../libs/api";

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-border">
        <div className="flex items-center gap-1.5 h-4">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex animate-slide-up", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
        isUser ? "bg-ink text-paper rounded-br-sm" : "bg-white border border-border text-ink rounded-bl-sm"
      )}>
        {message.content}
      </div>
    </div>
  );
}

export default function SessionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading: authLoading } = useAuth();

  const language    = (searchParams.get("language") ?? "spanish") as Language;
  const level       = (searchParams.get("level")    ?? "beginner") as Level;
  const scenarioHint = searchParams.get("scenario") ?? "";

  const [session, setSession]     = useState<Session | null>(null);
  const [msgs, setMsgs]           = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [ending, setEnding]       = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [elapsed, setElapsed]     = useState(0);
  const [error, setError]         = useState<string | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);

  // Load session + history
  useEffect(() => {
    if (!user) return;
    sessionsApi.get(params.id)
      .then(({ session: s, messages: m }) => {
        setSession(s);
        setMsgs(m);
        if (s.status === "active") {
          timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000));
          }, 1000);
        }
      })
      .catch(err => {
        if (err instanceof ApiError) {
          if (err.status === 401) logout();
          else if (err.status === 404) router.replace("/dashboard");
          else setError("Failed to load session.");
        }
      })
      .finally(() => setLoadingHistory(false));
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [user, params.id, logout, router]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, sending]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || session?.status !== "active") return;
    setInput("");
    setSending(true);
    setError(null);
    try {
      const { userMessage, aiMessage } = await chatApi.send(params.id, text);
      setMsgs(prev => [...prev, userMessage, aiMessage]);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) logout();
        else setError(err.message);
      } else {
        setError("Failed to send. Please try again.");
      }
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, sending, session, params.id, logout]);

  const handleEnd = useCallback(async () => {
    if (ending || session?.status !== "active") return;
    setEnding(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const firstUserMsg = msgs.find(m => m.role === "user");
      await sessionsApi.end(params.id, firstUserMsg?.content.slice(0, 60));
      router.push(`/session/${params.id}/summary`);
    } catch {
      setError("Failed to end session.");
      setEnding(false);
    }
  }, [ending, session, params.id, msgs, router]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  }

  if (authLoading || !user) return null;

  const lang     = LANGUAGE_CONFIG[language];
  const lvl      = LEVEL_CONFIG[level];
  const isEnded  = session?.status === "completed" || session?.status === "abandoned";
  const canSend  = input.trim().length > 0 && !sending && !isEnded;

  return (
    <div className="h-dvh flex flex-col bg-paper">
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="btn-ghost p-2 -ml-2 flex-shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{lang?.flag}</span>
              <span className="text-sm font-semibold text-ink">{lang?.label} — {lvl?.label}</span>
              {session?.status === "active" && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
                </span>
              )}
            </div>
            {elapsed > 0 && <p className="text-xs text-muted mt-0.5">{formatDuration(elapsed)} elapsed</p>}
          </div>
          <button onClick={handleEnd} disabled={ending || isEnded}
            className={cn("btn-secondary py-2 px-3 text-xs flex-shrink-0", (ending || isEnded) && "opacity-50")}>
            {ending ? <><Loader2 size={13} className="animate-spin" /> Ending…</> : <><StopCircle size={13} /> End</>}
          </button>
        </div>
      </header>

      {/* Scenario hint */}
      {scenarioHint && msgs.length === 0 && !loadingHistory && (
        <div className="border-b border-border bg-cream px-6 py-2.5">
          <p className="text-xs text-muted max-w-3xl mx-auto">
            <span className="font-medium text-ink">Scenario:</span> {decodeURIComponent(scenarioHint)}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : msgs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center py-20">
              <div>
                <p className="text-4xl mb-3">{lang?.flag}</p>
                <p className="text-sm font-medium text-ink mb-1">Your tutor is ready</p>
                <p className="text-xs text-muted">Type a message to start</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {msgs.map(m => <Bubble key={m.id} message={m} />)}
              {sending && <TypingIndicator />}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-danger flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-3 text-danger/60 hover:text-danger">×</button>
            </div>
          )}

          {isEnded && (
            <div className="mt-6 p-4 rounded-xl bg-cream border border-border text-center animate-fade-in">
              <p className="text-sm font-medium text-ink mb-3">Session ended</p>
              <div className="flex gap-2 justify-center">
                <Link href={`/session/${params.id}/summary`} className="btn-accent text-sm py-2">View summary</Link>
                <Link href="/session/new" className="btn-secondary text-sm py-2">New session</Link>
              </div>
            </div>
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* Input */}
      {!isEnded && (
        <div className="border-t border-border bg-white">
          <div className="max-w-3xl mx-auto px-6 py-4 flex gap-3 items-end">
            <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
              placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
              rows={1} disabled={sending}
              className={cn("flex-1 input resize-none py-3 leading-relaxed min-h-[44px] max-h-[150px]",
                sending && "opacity-60 cursor-not-allowed")}
              style={{ height: "44px" }} />
            <button onClick={() => void handleSend()} disabled={!canSend}
              className={cn("btn-accent h-[44px] w-[44px] p-0 rounded-xl flex-shrink-0", !canSend && "opacity-40")}>
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}