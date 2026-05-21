"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi, ApiError } from "../libs/api";
import { useAuth } from "../libs/auth-context";
import { cn } from "../libs/utils";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    if (params.get("demo") === "true") {
      setEmail("demo@lingua-ai.com");
      setPassword("demo1234");
    }
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user: u } = await authApi.login({ email, password });
      login(token, u);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 md:p-12 bg-[#020205] text-white font-sans antialiased relative overflow-hidden">
      
      {/* Background Ambient Glow (Matches Hero Theme) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(99,102,241,0.06),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZHRoPSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-40 pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-50 flex items-center justify-between w-full max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:animate-ping transition-all" />
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-white transition-colors">
            Back to home
          </span>
        </Link>
        <span className="text-xs text-neutral-500 tracking-wider">
          LinguaAI Secure Sign In
        </span>
      </header>

      {/* Centered Login Card */}
      <div className="relative z-10 w-full max-w-sm mx-auto my-auto py-8">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-light tracking-tight text-white">
            Welcome <span className="font-serif italic text-neutral-400">back</span>
          </h1>
          <p className="text-sm text-neutral-400 font-light">
            Sign in to continue your language learning sessions
          </p>
        </div>

        {params.get("demo") === "true" && (
          <div className="mb-6 p-4 text-center rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            Demo credentials are filled in — click Sign In below to explore.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/40 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-400">
              Email address
            </label>
            <input
              type="email"
              value={email}
              required
              autoComplete="email"
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="you@example.com"
              className="w-full bg-neutral-950 border border-white/[0.06] focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-700 outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-400">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                required
                onChange={e => { setPassword(e.target.value); setError(null); }}
                placeholder="Enter your password"
                className="w-full bg-neutral-950 border border-white/[0.06] focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-700 outline-none transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-3.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2",
              loading 
                ? "bg-neutral-900 text-neutral-500 cursor-not-allowed border border-neutral-800" 
                : "bg-white text-black hover:bg-neutral-100 active:scale-[0.98] shadow-[0_4px_20px_rgba(255,255,255,0.1)]"
            )}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing you in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-400 mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Register for free
          </Link>
        </p>
      </div>

      {/* Simple Footer */}
      <footer className="relative z-50 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.03] text-xs text-neutral-500">
        <p>Your data is protected with secure encryption.</p>
        <p>© 2026 LinguaAI. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#020205]">
        <div className="w-6 h-6 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}