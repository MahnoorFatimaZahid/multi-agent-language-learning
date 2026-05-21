"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Compass, GraduationCap, Languages, Sparkles } from "lucide-react";
import { sessionsApi, ApiError, type Language, type Level } from "../../libs/api";
import { useAuth } from "../../libs/auth-context";
import { LANGUAGE_CONFIG, LEVEL_CONFIG, cn } from "../../libs/utils";

const SCENARIOS = [
  { id: "cafe",         icon: "☕",  label: "At a Café",     hint: "Order drinks, ask for the menu, pay the bill" },
  { id: "market",       icon: "🛒",  label: "Local Market",   hint: "Browse stalls, ask prices, negotiate a deal" },
  { id: "directions",   icon: "🗺️", label: "Finding Places", hint: "Ask for directions, understand a map route" },
  { id: "restaurant",   icon: "🍽️", label: "Restaurant",   hint: "Book a table, order meals, fix a wrong order" },
  { id: "hotel",        icon: "🏨",  label: "Hotel Stay",    hint: "Check in, ask for amenities, report a problem" },
  { id: "transport",    icon: "🚕",  label: "Taking a Cab",  hint: "Hail rides, buy tickets, ask about timetables" },
  { id: "doctor",       icon: "🏥",  label: "At the Doctor",  hint: "Explain how you feel, understand health advice" },
  { id: "custom",       icon: "✨",  label: "Your Own Topic", hint: "Type your own custom roleplay scenario" },
];

export default function NewSessionPage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();

  const [language,    setLanguage]    = useState<Language>("spanish");
  const [level,       setLevel]       = useState<Level>("beginner");
  const [scenarioId,  setScenarioId]  = useState("cafe");
  const [customText,  setCustomText]  = useState("");
  const [creating,    setCreating]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  function getScenarioRequest(): string {
    if (scenarioId === "custom") return customText.trim();
    return SCENARIOS.find((s) => s.id === scenarioId)?.hint ?? scenarioId;
  }

  const canStart = scenarioId !== "custom" || customText.trim().length >= 10;

  async function handleStart() {
    if (!canStart || creating) return;
    setCreating(true);
    setError(null);

    try {
      const { session } = await sessionsApi.create({ language, level });
      const params = new URLSearchParams({ language, level, scenario: getScenarioRequest() });
      router.push(`/session/${session.id}?${params.toString()}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
      } else {
        setError("Could not launch your tutor. Please try again in a moment.");
        setCreating(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#020205] text-white font-sans antialiased relative flex flex-col justify-between">
      
      {/* Background Lighting Visual Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.03),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZHRoPSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDE1Ii8+Cjwvc3ZnPg==')] opacity-30 pointer-events-none" />

      <div>
        {/* Simplified Header Navigation */}
        <header className="border-b border-white/[0.04] bg-[#020205]/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="p-2 rounded-xl border border-white/[0.04] bg-neutral-950 text-neutral-400 hover:text-white hover:border-white/[0.1] transition-all"
              >
                <ArrowLeft size={15} />
              </Link>
              <div>
                <h1 className="text-xs font-bold tracking-widest text-neutral-400 uppercase">LinguaAI</h1>
                <p className="text-sm font-normal text-white mt-0.5">Create Practice Room</p>
              </div>
            </div>
            <div className="text-xs text-neutral-500 font-light hidden sm:block">
              Logged in as {user.displayName.split(" ")[0]}
            </div>
          </div>
        </header>

        {/* Improved Asymmetric Split Content Layout */}
        <main className="max-w-6xl w-full mx-auto px-6 py-8 lg:py-12 relative z-10">
          {error && (
            <div className="p-4 mb-8 rounded-2xl bg-red-950/20 border border-red-900/30 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Content Side: Language and Skill Level Selectors (5/12 Columns) */}
            <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
              
              {/* Target Language Selection Block */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <Languages size={14} className="text-indigo-400" /> Target Language
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(LANGUAGE_CONFIG) as [Language, (typeof LANGUAGE_CONFIG)[Language]][]).map(
                    ([key, cfg]) => {
                      const isSelected = language === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setLanguage(key)}
                          className={cn(
                            "flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-300 relative group",
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/[0.03] shadow-[0_0_20px_rgba(99,102,241,0.08)] text-white"
                              : "bg-neutral-950 border-white/[0.04] text-neutral-400 hover:border-white/[0.1] hover:bg-neutral-950/70"
                          )}
                        >
                          <span className="text-2xl filter drop-shadow-sm group-hover:scale-105 transition-transform">{cfg.flag}</span>
                          <div className="min-w-0">
                            <p className={cn("text-xs font-semibold tracking-wide transition-colors", isSelected ? "text-white" : "text-neutral-300")}>{cfg.label}</p>
                            <p className="text-[10px] text-neutral-500 font-light mt-0.5 truncate">{cfg.nativeName}</p>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Skill Level Selection Block */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={14} className="text-indigo-400" /> Skill Level
                </h2>
                <div className="space-y-2.5">
                  {(Object.entries(LEVEL_CONFIG) as [Level, (typeof LEVEL_CONFIG)[Level]][]).map(
                    ([key, cfg]) => {
                      const isSelected = level === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setLevel(key)}
                          className={cn(
                            "w-full p-4 rounded-2xl border text-left transition-all duration-300 flex items-start gap-4",
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/[0.03] shadow-[0_0_20px_rgba(99,102,241,0.08)]"
                              : "bg-neutral-950 border-white/[0.04] hover:border-white/[0.1] hover:bg-neutral-950/70"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 rounded-full border flex items-center justify-center mt-0.5 transition-all flex-shrink-0",
                            isSelected ? "border-indigo-500 bg-indigo-500" : "border-neutral-700"
                          )}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className={cn("text-xs font-semibold tracking-wide", isSelected ? "text-indigo-400" : "text-white")}>{cfg.label}</p>
                            <p className="text-xs text-neutral-400 mt-1 font-light leading-normal">{cfg.description}</p>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

            </div>

            {/* Right Content Side: Conversation Topics Grid (7/12 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Compass size={14} className="text-indigo-400" /> Choose a Conversation Topic
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCENARIOS.map((s) => {
                  const isSelected = scenarioId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setScenarioId(s.id)}
                      className={cn(
                        "flex gap-4 p-4 rounded-2xl border text-left transition-all duration-300 min-h-[90px]",
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/[0.03] shadow-[0_0_20px_rgba(99,102,241,0.08)]"
                          : "bg-neutral-950 border-white/[0.04] hover:border-white/[0.1] hover:bg-neutral-950/70"
                      )}
                    >
                      <span className="text-xl p-2.5 rounded-xl bg-neutral-900 border border-white/[0.04] flex-shrink-0 h-11 w-11 flex items-center justify-center">{s.icon}</span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-xs font-semibold text-white tracking-wide">{s.label}</p>
                        <p className="text-xs text-neutral-400 mt-1 font-light leading-normal">{s.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Text Area for Custom Prompts */}
              {scenarioId === "custom" && (
                <div className="pt-2 animate-fade-in space-y-2">
                  <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Describe your custom scenario in plain English... &#10;&#10;Example: I'm buying train tickets at Berlin station, but my train is running late and I need to ask for a refund."
                    rows={5}
                    className="w-full bg-neutral-950 border border-white/[0.06] focus:border-indigo-500/50 rounded-2xl p-4 text-sm text-white placeholder-neutral-700 outline-none resize-none leading-relaxed transition-all shadow-inner"
                  />
                  <div className="flex justify-between items-center text-[10px] text-neutral-500 px-1">
                    <span>Minimum 10 characters required</span>
                    <span className={cn(customText.trim().length >= 10 ? "text-indigo-400 font-medium" : "text-neutral-500")}>
                      {customText.trim().length} characters typed
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* Global Unified Action Footer Control */}
      <footer className="border-t border-white/[0.04] bg-neutral-950/40 backdrop-blur-md py-6 px-6 relative z-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-xs font-medium text-white flex items-center justify-center md:justify-start gap-2">
              <Sparkles size={13} className="text-indigo-400 animate-pulse" />
              Ready to practice {LANGUAGE_CONFIG[language]?.label || "speaking"}
            </p>
            <p className="text-[11px] text-neutral-500 font-light mt-0.5">
              Your session initializes an encrypted audio channel immediately upon starting.
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={creating || !canStart}
            className={cn(
              "w-full md:w-auto md:min-w-[240px] py-3.5 px-6 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2.5",
              creating || !canStart
                ? "bg-neutral-900 text-neutral-600 border border-neutral-800/80 cursor-not-allowed opacity-60"
                : "bg-white text-black hover:bg-neutral-100 active:scale-[0.99] shadow-[0_4px_25px_rgba(255,255,255,0.08)]"
            )}
          >
            {creating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Connecting Audio...
              </>
            ) : (
              <>Initialize Room {LANGUAGE_CONFIG[language]?.flag}</>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}