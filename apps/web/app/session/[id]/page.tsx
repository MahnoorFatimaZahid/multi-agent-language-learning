"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, StopCircle,
  Mic, Volume2, VolumeX, Wifi, WifiOff, Sparkles, Languages
} from "lucide-react";
import { useAuth }            from "../../libs/auth-context";
import { useChatSocket }      from "../../libs/use-chat-socket";
import { useAudioCapture }    from "../../libs/use-audio-capture";
import { useSpeechSynthesis } from "../../libs/use-speech-synthesis";
import { LANGUAGE_CONFIG, LEVEL_CONFIG, formatDuration, cn } from "../../libs/utils";
import type { Language, Level } from "../../libs/api";
import type { ChatMessage }   from "../../libs/use-chat-socket";

function TypingDots() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="px-4 py-3 rounded-2xl bg-neutral-900 border border-white/[0.04] shadow-sm flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
      </div>
    </div>
  );
}

function Bubble({ message, streaming }: { message?: ChatMessage; streaming?: string }) {
  const isUser  = message?.role === "user";
  const content = message?.content ?? streaming ?? "";
  if (!message && !streaming) return <TypingDots />;

  return (
    <div className={cn("flex w-full mb-1", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
        isUser
          ? "bg-white text-black font-medium rounded-br-none"
          : "bg-neutral-900 border border-white/[0.04] text-neutral-200 rounded-bl-none"
      )}>
        {content}
        {streaming !== undefined && !message && (
          <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 rounded-full align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
}

function AudioVisualizer({ level }: { level: number }) {
  const scaleValue = 1 + Math.min(1, level * 2);
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl">
      <div
        className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-sm opacity-40 transition-transform duration-75"
        style={{ transform: `scale(${scaleValue})` }}
      />
      <Mic size={18} className="text-white relative z-10" />
    </div>
  );
}

function StatusBar({ state, error }: { state: string; error: string | null }) {
  if (state === "ready" && !error) return null;

  const configs: Record<string, { icon: React.ReactNode; text: string; classes: string }> = {
    connecting:   { icon: <Loader2 size={12} className="animate-spin text-indigo-400" />, text: "Connecting to your live tutor...",    classes: "bg-indigo-950/30 text-indigo-300 border-indigo-900/30" },
    reconnecting: { icon: <Wifi size={12} className="animate-pulse" />,                   text: error ?? "Connection lost. Reconnecting...", classes: "bg-amber-950/30 text-amber-300 border-amber-900/30" },
    error:        { icon: <WifiOff size={12} />,                                           text: error ?? "Failed to connect",         classes: "bg-red-950/30 text-red-300 border-red-900/30" },
    ended:        { icon: null,                                                             text: "Session finished",                   classes: "bg-neutral-950 text-neutral-500 border-white/[0.03]" },
  };

  const cfg = configs[state];
  if (!cfg) return null;

  return (
    <div className={cn("border-b px-4 py-2 text-center font-medium text-xs tracking-wide", cfg.classes)}>
      <div className="flex items-center justify-center gap-2">
        {cfg.icon}
        <span>{cfg.text}</span>
      </div>
    </div>
  );
}

function SessionContent({ id }: { id: string }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const language        = (searchParams.get("language") ?? "spanish") as Language;
  const level           = (searchParams.get("level")    ?? "beginner") as Level;
  const scenarioRequest = decodeURIComponent(searchParams.get("scenario") ?? "general conversation");

  const [input,        setInput]        = useState("");
  const [elapsed,      setElapsed]      = useState(0);
  const [isMuted,      setIsMuted]      = useState(false);
  const [showSidebar,  setShowSidebar]  = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const startRef   = useRef(Date.now());

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { speak, cancel: cancelSpeech, isSpeaking } = useSpeechSynthesis(language);

  const {
    connectionState, scenario, messages,
    streamingContent, error, sendMessage, sendAudio, endSession,
  } = useChatSocket({
    sessionId: id, language, level, scenarioRequest,
    onSTTResult: (transcript) => {
      setInput(transcript);
      setTimeout(() => setInput(""), 3000);
    },
  });

  const { isRecording, hasPermission, audioLevel, startRecording, stopRecording } =
    useAudioCapture({
      onAudioReady: (audioBase64, mimeType) => {
        sendAudio(audioBase64, mimeType);
        setInput("");
      },
    });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (isMuted) return undefined;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && streamingContent === "") speak(last.content);
    return undefined;
  }, [messages, streamingContent, isMuted, speak]);

  useEffect(() => {
    if (isRecording) cancelSpeech();
  }, [isRecording, cancelSpeech]);

  useEffect(() => {
    if (connectionState === "ended") {
      const t = setTimeout(() => router.push(`/session/${id}/summary`), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [connectionState, id, router]);

  function handleSend() {
    const text = input.trim();
    if (!text || connectionState !== "ready" || streamingContent) return;
    sendMessage(text);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  }

  if (authLoading || !user) return null;

  const lang        = LANGUAGE_CONFIG[language];
  const lvl         = LEVEL_CONFIG[level];
  const isEnded     = connectionState === "ended";
  const isStreaming  = streamingContent.length > 0;
  const canSend     = input.trim().length > 0 && connectionState === "ready" && !isStreaming;

  return (
    <div className="h-dvh flex flex-col bg-[#020205] text-white antialiased overflow-hidden font-sans relative">

      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+")`,
        }}
      />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.03] bg-[#020205]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">

          {/* Left */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl border border-white/[0.04] bg-neutral-950 text-neutral-400 hover:text-white transition-all flex-shrink-0"
            >
              <ArrowLeft size={15} />
            </Link>
            <div className="hidden sm:block h-4 w-px bg-white/[0.04]" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg sm:text-xl">{lang?.flag}</span>
              <div className="min-w-0">
                <h1 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 truncate">
                  {lang?.label} Practice
                </h1>
                {elapsed > 0 && (
                  <p className="text-xs sm:text-sm font-semibold text-white font-mono">
                    {formatDuration(elapsed)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile: show sidebar toggle */}
            {scenario && (
              <button
                onClick={() => setShowSidebar(v => !v)}
                className="sm:hidden p-2 rounded-xl border border-white/[0.04] bg-neutral-950 text-neutral-400 hover:text-white transition-all"
                title="Show tutor info"
              >
                <Sparkles size={15} />
              </button>
            )}

            <button
              onClick={() => { setIsMuted(m => !m); if (!isMuted) cancelSpeech(); }}
              className={cn(
                "p-2 sm:p-2.5 rounded-xl border transition-all",
                isMuted
                  ? "bg-red-950/40 border-red-900 text-red-400"
                  : "bg-neutral-950 border-white/[0.04] text-neutral-400 hover:text-white"
              )}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <button
              onClick={endSession}
              disabled={connectionState !== "ready"}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-semibold bg-neutral-900 border border-white/[0.04] text-white hover:bg-red-950/40 hover:text-red-400 hover:border-red-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
            >
              <StopCircle size={13} />
              <span className="hidden sm:inline">End</span>
            </button>
          </div>
        </div>
      </header>

      <StatusBar state={connectionState} error={error} />

      {/* ── Main layout ───────────────────────────────────────────────── */}
      <div className="flex-1 max-w-5xl w-full mx-auto flex overflow-hidden relative z-20 p-3 sm:p-4 md:p-6 gap-4">

        {/* Sidebar — hidden on mobile unless toggled */}
        <div className={cn(
          "flex-col gap-4 flex-shrink-0 transition-all duration-300",
          // Mobile: absolute overlay
          "absolute inset-0 z-40 bg-[#020205] p-4 sm:relative sm:z-auto sm:bg-transparent sm:p-0",
          showSidebar ? "flex" : "hidden sm:flex",
          "sm:w-[280px] md:w-[300px] lg:w-[320px]"
        )}>
          {/* Close button on mobile */}
          <button
            onClick={() => setShowSidebar(false)}
            className="sm:hidden self-end p-2 rounded-xl border border-white/[0.04] bg-neutral-950 text-neutral-400 mb-2"
          >
            ✕
          </button>

          <div className="w-full bg-neutral-950 border border-white/[0.04] rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col gap-4 h-full overflow-y-auto">

            {/* Level + Language */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-lg uppercase bg-neutral-900 text-neutral-300 border border-white/[0.04]">
                {lvl?.label}
              </span>
              <div className="flex items-center gap-1 text-neutral-400">
                <Languages size={13} />
                <span className="text-[10px] font-semibold uppercase">{language}</span>
              </div>
            </div>

            {/* Persona info */}
            {scenario ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-black font-bold text-base transition-all duration-300 shadow-sm flex-shrink-0",
                    isSpeaking ? "bg-indigo-500 text-white scale-105 ring-4 ring-indigo-500/20" : "bg-white"
                  )}>
                    {scenario.personaName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white truncate">{scenario.personaName}</h2>
                    <p className="text-xs text-neutral-400 font-medium truncate">{scenario.personaRole}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.04]">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Setting</span>
                  <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-900/50 p-3 rounded-xl border border-white/[0.04]">
                    {scenario.setting}
                  </p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-10 bg-neutral-900 rounded-xl w-2/3" />
                <div className="h-16 bg-neutral-900/60 rounded-xl" />
              </div>
            )}

            {/* Speaking indicator — only on larger screens */}
            <div className="hidden sm:flex flex-col items-center justify-center p-4 bg-neutral-900/30 border border-white/[0.04] rounded-[18px] mt-auto">
              <div className="relative w-14 h-14 flex items-center justify-center">
                {isSpeaking && (
                  <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                )}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all duration-300",
                  isSpeaking ? "bg-indigo-500 text-white" : "bg-neutral-900 text-neutral-500"
                )}>
                  <Sparkles size={15} className={cn(isSpeaking && "animate-pulse")} />
                </div>
              </div>
              <p className="text-[10px] tracking-wider font-bold uppercase text-neutral-500 mt-2 text-center">
                {isSpeaking ? "Tutor is speaking" : "Awaiting your reply"}
              </p>
            </div>

          </div>
        </div>

        {/* ── Chat panel ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-neutral-950 border border-white/[0.04] rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-sm min-w-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 sm:py-5">
            <div className="space-y-2">
              {messages.length === 0 && !streamingContent && connectionState === "connecting" ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow animate-spin" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Setting up</h3>
                    <p className="text-xs text-neutral-400 mt-1">Preparing your session...</p>
                  </div>
                </div>
              ) : (
                messages.map(msg => <Bubble key={msg.id} message={msg} />)
              )}

              {isStreaming && <Bubble streaming={streamingContent} />}

              {connectionState === "ready" &&
               !isStreaming &&
               messages.length > 0 &&
               messages[messages.length - 1]?.role === "user" && (
                <TypingDots />
              )}

              {isEnded && (
                <div className="py-4 text-center">
                  <p className="text-xs font-bold text-neutral-400 bg-neutral-900 max-w-xs mx-auto py-2 px-4 rounded-xl border border-white/[0.04] flex items-center justify-center gap-2">
                    <Loader2 size={12} className="animate-spin text-indigo-500" />
                    Creating summary...
                  </p>
                </div>
              )}
              <div ref={bottomRef} className="h-2" />
            </div>
          </div>

          {/* Input */}
          {!isEnded && (
            <div className="p-3 sm:p-4 bg-neutral-900/40 border-t border-white/[0.04]">
              <div className="flex gap-2 sm:gap-3 items-center">

                {/* Textarea */}
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isRecording         ? "Listening to your voice..." :
                      connectionState === "connecting" ? "Connecting..." :
                      isStreaming         ? "Tutor is responding..." :
                      "Type or hold mic to talk..."
                    }
                    rows={1}
                    disabled={connectionState !== "ready" || isStreaming || isRecording}
                    className={cn(
                      "w-full resize-none bg-neutral-900 border border-white/[0.04] text-white text-sm py-3 pl-4 pr-12 rounded-xl focus:outline-none focus:border-indigo-500 transition-all duration-200 leading-relaxed shadow-sm",
                      (connectionState !== "ready" || isStreaming || isRecording) && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ height: "46px", maxHeight: "120px" }}
                  />
                  <div className="absolute right-2 bottom-1.5">
                    <button
                      onClick={handleSend}
                      disabled={!canSend}
                      className={cn(
                        "h-[34px] w-[34px] rounded-lg flex items-center justify-center bg-white text-black transition-all active:scale-95",
                        !canSend && "opacity-20 cursor-not-allowed bg-neutral-800 text-neutral-500"
                      )}
                    >
                      {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>

                {/* Mic button */}
                <div className="relative h-[46px] w-[46px] flex-shrink-0">
                  <button
                    onMouseDown={() => void startRecording()}
                    onMouseUp={stopRecording}
                    onTouchStart={(e) => { e.preventDefault(); void startRecording(); }}
                    onTouchEnd={(e)   => { e.preventDefault(); stopRecording(); }}
                    disabled={connectionState !== "ready" || isStreaming}
                    className={cn(
                      "absolute inset-0 rounded-xl flex items-center justify-center transition-all duration-300 border border-white/[0.04]",
                      isRecording
                        ? "bg-transparent border-transparent scale-105 z-30"
                        : connectionState === "ready" && !isStreaming
                        ? "bg-neutral-900 text-neutral-400 hover:text-white hover:border-white/[0.1]"
                        : "bg-neutral-900 opacity-40 cursor-not-allowed text-neutral-600"
                    )}
                    title="Hold to speak"
                  >
                    {isRecording ? <AudioVisualizer level={audioLevel} /> : <Mic size={18} />}
                  </button>
                </div>
              </div>

              {/* Hint */}
              <p className="text-[10px] font-bold tracking-wide text-neutral-500 text-center mt-2 sm:mt-3 uppercase">
                {isRecording
                  ? "Release to send"
                  : hasPermission === false
                  ? "Mic blocked — text only"
                  : "Hold mic · Enter to send"
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SessionPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="h-dvh flex items-center justify-center bg-[#020205]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SessionContent id={params.id} />
    </Suspense>
  );
}