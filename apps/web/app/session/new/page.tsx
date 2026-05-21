"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { sessionsApi, ApiError, type Language, type Level } from "../../libs/api";
import { useAuth } from "../../libs/auth-context";
import { LANGUAGE_CONFIG, LEVEL_CONFIG, cn } from "../../libs/utils";

const SCENARIOS = [
  { id: "cafe",        icon: "☕",  label: "Café",        hint: "Order coffee, ask for the menu, pay the bill" },
  { id: "market",      icon: "🛒",  label: "Market",      hint: "Browse stalls, ask prices, negotiate a deal" },
  { id: "directions",  icon: "🗺️", label: "Directions",  hint: "Ask how to get somewhere, understand a route" },
  { id: "restaurant",  icon: "🍽️", label: "Restaurant",  hint: "Book a table, order food, deal with a wrong order" },
  { id: "hotel",       icon: "🏨",  label: "Hotel",       hint: "Check in, ask for amenities, report a problem" },
  { id: "transport",   icon: "🚕",  label: "Transport",   hint: "Hail a cab, buy tickets, ask about trains" },
  { id: "doctor",      icon: "🏥",  label: "Doctor",      hint: "Describe symptoms, understand advice" },
  { id: "custom",      icon: "✏️",  label: "Custom",      hint: "Describe your own scenario in detail" },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">
      {children}
    </p>
  );
}

export default function NewSessionPage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();

  const [language,   setLanguage]   = useState<Language>("spanish");
  const [level,      setLevel]      = useState<Level>("beginner");
  const [scenarioId, setScenarioId] = useState("cafe");
  const [customText, setCustomText] = useState("");
  const [creating,   setCreating]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);

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

      const params = new URLSearchParams({
        language,
        level,
        scenario: getScenarioRequest(),
      });

router.push(`/session/${session.id}?${params.toString()}`);    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
      } else {
        setError("Failed to create session. Please try again.");
        setCreating(false);
      }
    }
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-border bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="btn-ghost p-2 -ml-2">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-ink">New session</h1>
            <p className="text-xs text-muted">Configure your practice session</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-danger">
            {error}
          </div>
        )}

        <section>
          <Label>Language to practice</Label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(LANGUAGE_CONFIG) as [Language, (typeof LANGUAGE_CONFIG)[Language]][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setLanguage(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-150",
                    language === key
                      ? "border-accent bg-accent-soft ring-1 ring-accent/30"
                      : "bg-white border-border hover:border-accent/40 hover:bg-accent-soft/40"
                  )}
                >
                  <span className="text-2xl">{cfg.flag}</span>
                  <span className="text-xs font-medium text-ink">{cfg.label}</span>
                  <span className="text-[10px] text-muted">{cfg.nativeName}</span>
                </button>
              )
            )}
          </div>
        </section>

        <section>
          <Label>Your level</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(LEVEL_CONFIG) as [Level, (typeof LEVEL_CONFIG)[Level]][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setLevel(key)}
                  className={cn(
                    "py-3 px-4 rounded-xl border text-left transition-all duration-150",
                    level === key
                      ? "border-accent bg-accent-soft ring-1 ring-accent/30"
                      : "bg-white border-border hover:border-accent/40 hover:bg-accent-soft/40"
                  )}
                >
                  <p className="text-sm font-medium text-ink">{cfg.label}</p>
                  <p className="text-xs text-muted mt-0.5 leading-snug">{cfg.description}</p>
                </button>
              )
            )}
          </div>
        </section>

        <section>
          <Label>Scenario</Label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenarioId(s.id)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150",
                  scenarioId === s.id
                    ? "border-accent bg-accent-soft ring-1 ring-accent/30"
                    : "bg-white border-border hover:border-accent/40 hover:bg-accent-soft/40"
                )}
              >
                <span className="text-lg leading-none mt-0.5">{s.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">{s.label}</p>
                  <p className="text-[11px] text-muted mt-0.5 leading-snug">{s.hint}</p>
                </div>
              </button>
            ))}
          </div>

          {scenarioId === "custom" && (
            <div className="animate-slide-up">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={"Describe your scenario...\n\nExample: I'm meeting my French colleague for lunch and need to make small talk and order food."}
                rows={4}
                className="input resize-none text-sm leading-relaxed"
              />
              <p className="text-[10px] text-muted mt-1.5">
                {customText.trim().length} characters · minimum 10 to start
              </p>
            </div>
          )}
        </section>

        <button
          onClick={handleStart}
          disabled={creating || !canStart}
          className={cn(
            "btn-primary w-full py-4 text-base font-medium",
            (creating || !canStart) && "opacity-50 cursor-not-allowed"
          )}
        >
          {creating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Creating session…
            </>
          ) : (
            <>Start practicing {LANGUAGE_CONFIG[language]?.flag}</>
          )}
        </button>

        <p className="text-center text-xs text-muted -mt-4 pb-2">
          Your AI tutor will be ready in a few seconds after you start
        </p>
      </main>
    </div>
  );
}
