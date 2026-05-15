"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, X } from "lucide-react";
import { useAuth } from "../../../libs/auth-context";
import { useChatSocket } from "../../../libs/use-chat-socket";
import type { Language, Level } from "../../../libs/api";
import { LANGUAGE_CONFIG, cn } from "../../../libs/utils";

export default function SessionChatPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const language = (searchParams.get("language") ?? "spanish") as Language;
  const level    = (searchParams.get("level")    ?? "beginner") as Level;
  const scenario =  searchParams.get("scenario") ?? "";

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    connectionState,
    scenario: scenarioCtx,
    messages,
    streamingContent,
    error,
    sendMessage,
    endSession,
  } = useChatSocket(params.id, language, level, scenario);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (connectionState === "ended") {
   router.push(`/session/new/${params.id}/summary`);
    }
  }, [connectionState, params.id, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (authLoading || !user) return null;

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  }

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="btn-ghost p-2 -ml-2">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-ink">
              {scenarioCtx?.personaName
                ? `Practicing with ${scenarioCtx.personaName}`
                : `${LANGUAGE_CONFIG[language]?.label ?? language} session`}
            </h1>
            <p className="text-xs text-muted">
              {connectionState === "connecting" || connectionState === "reconnecting"
                ? "Connecting…"
                : connectionState === "ready"
                ? "Connected"
                : connectionState}
            </p>
          </div>
          <button
            onClick={endSession}
            className="btn-ghost text-sm flex items-center gap-1.5 px-3"
          >
            <X size={15} />
            End
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-2 text-sm text-danger text-center">
          {error}
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-6 py-6 space-y-3">
        {connectionState === "connecting" && messages.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted" />
            <span className="ml-2 text-sm text-muted">Setting up your session…</span>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={cn("flex", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  isUser
                    ? "bg-ink text-paper rounded-br-sm"
                    : "bg-white border border-border text-ink rounded-bl-sm"
                )}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-white border border-border text-ink">
              {streamingContent}
              <span className="inline-block w-1 h-3.5 bg-ink/40 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <div className="border-t border-border bg-white sticky bottom-0">
        <div className="max-w-2xl mx-auto px-6 py-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            disabled={connectionState !== "ready"}
            className="input flex-1 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={connectionState !== "ready" || !input.trim()}
            className="btn-primary px-4 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
