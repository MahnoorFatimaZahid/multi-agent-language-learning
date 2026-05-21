"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [isLoggedIn] = useState(false);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const [isActive,     setIsActive]     = useState(false);
  const [currentLang,  setCurrentLang]  = useState("Spanish");

  const accentColor = isActive ? "text-indigo-400" : "text-neutral-400";
  const borderGlow  = isActive ? "border-indigo-500/50" : "border-white/[0.04]";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let frame = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width  = parent.clientWidth  * window.devicePixelRatio;
      canvas.height = parent.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w  = canvas.width  / window.devicePixelRatio;
      const h  = canvas.height / window.devicePixelRatio;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);
      frame += isActive ? 0.08 : 0.02;

      // Background glow
      const fluidGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, isActive ? 240 : 180);
      fluidGlow.addColorStop(0,   isActive ? "rgba(99,102,241,0.25)" : "rgba(37,99,235,0.12)");
      fluidGlow.addColorStop(0.5, isActive ? "rgba(168,85,247,0.05)" : "rgba(29,78,216,0.02)");
      fluidGlow.addColorStop(1,   "transparent");
      ctx.fillStyle = fluidGlow;
      ctx.fillRect(0, 0, w, h);

      // Morphing sphere
      ctx.beginPath();
      const baseRadius  = isActive ? 110 : Math.min(125, Math.min(w, h) * 0.38);
      const totalPoints = 120;
      for (let i = 0; i <= totalPoints; i++) {
        const angle = (i / totalPoints) * Math.PI * 2;
        const wave1 = Math.sin(angle * 4 + frame) * (isActive ? 14 : 5);
        const wave2 = Math.cos(angle * 7 - frame * 1.5) * (isActive ? 8 : 3);
        const r = baseRadius + wave1 + wave2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      ctx.shadowColor = isActive ? "#c084fc" : "#60a5fa";
      ctx.shadowBlur  = isActive ? 60 : 30;

      const coreGrad = ctx.createRadialGradient(cx - 30, cy - 30, 20, cx, cy, baseRadius * 1.2);
      if (isActive) {
        coreGrad.addColorStop(0,   "#f5f3ff");
        coreGrad.addColorStop(0.3, "#a78bfa");
        coreGrad.addColorStop(0.7, "#4f46e5");
        coreGrad.addColorStop(1,   "#1e1b4b");
      } else {
        coreGrad.addColorStop(0,   "#ffffff");
        coreGrad.addColorStop(0.2, "#93c5fd");
        coreGrad.addColorStop(0.6, "#2563eb");
        coreGrad.addColorStop(1,   "#0f172a");
      }
      ctx.fillStyle = coreGrad;
      ctx.fill();

      ctx.shadowBlur  = 0;
      ctx.shadowColor = "transparent";

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isActive]);

  return (
    <div
      className="min-h-dvh w-full bg-[#020205] text-white font-sans antialiased flex flex-col overflow-x-hidden"
      style={{ padding: "clamp(14px, 4vw, 48px)" }}
    >
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-40 opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+")`,
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="relative z-50 flex items-center justify-between w-full max-w-7xl mx-auto gap-3 flex-shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isActive ? "bg-indigo-400 animate-ping" : "bg-indigo-500 animate-pulse"
          }`} />
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-400 whitespace-nowrap">
            LinguaAI
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
          {/* Language switcher */}
          <div className={`bg-neutral-900/60 border ${borderGlow} p-0.5 sm:p-1 rounded-full flex gap-0.5 backdrop-blur-md transition-all`}>
            {["Spanish", "French", "German", "Japanese"].map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLang(lang)}
                className={`text-[9px] sm:text-[10px] uppercase tracking-wider px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full transition-all ${
                  currentLang === lang
                    ? "bg-white text-black font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {lang.slice(0, 2)}
              </button>
            ))}
          </div>

          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="text-[9px] sm:text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white transition-colors whitespace-nowrap"
          >
            {isLoggedIn ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto">

        {/* Headline — above bubble on mobile, overlay on desktop */}
        <div className="w-full flex flex-col items-center text-center gap-4 sm:gap-6 mb-4 sm:mb-6 md:mb-0 md:absolute md:inset-0 md:justify-between md:py-12 md:pointer-events-none md:z-10">
          <h1
            className="font-light tracking-tighter leading-[1.05] text-white max-w-xl px-2"
            style={{ fontSize: "clamp(22px, 3.5vw, 42px)" }}
          >
            Practice{" "}
            <span className={`${accentColor} transition-colors duration-500`}>
              {currentLang}
            </span>
            <br />
            <span className="font-serif italic text-neutral-400">
              without fear of mistakes.
            </span>
          </h1>

          <p
            className="text-neutral-500 font-light tracking-wide leading-relaxed px-4"
            style={{ fontSize: "clamp(11px, 2vw, 14px)", maxWidth: "min(340px, 90vw)" }}
          >
            {isActive
              ? `AI is currently listening for ${currentLang} input...`
              : "Talk to an AI tutor in your chosen language. Speak or type. Get feedback after every session."
            }
          </p>
        </div>

        {/* Canvas bubble */}
        <div
          className="relative flex items-center justify-center z-20 flex-shrink-0"
          style={{
            width:  "min(420px, 82vw)",
            height: "min(420px, 82vw)",
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={() => setIsActive(!isActive)}
            className="w-full h-full cursor-pointer transition-transform active:scale-95"
          />
          <div className="absolute pointer-events-none text-center flex flex-col items-center justify-center select-none">
            <p className={`font-bold tracking-[0.25em] uppercase drop-shadow-md ${
              isActive ? "text-indigo-400" : "text-white"
            }`}
              style={{ fontSize: "clamp(9px, 1.8vw, 11px)" }}
            >
              {isActive ? "LISTENING" : "TAP TO START"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="relative z-50 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/[0.03] flex-shrink-0 mt-4 sm:mt-0">

        <Link href="/how-it-works" className="text-center sm:text-left group">
          <p className="text-[10px] uppercase font-mono tracking-widest text-indigo-400 group-hover:text-neutral-400 transition-colors">
            // HOW IT WORKS
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Speak → AI responds → Get feedback
          </p>
        </Link>

        <Link
          href={isLoggedIn ? "/practice" : "/register"}
          className="px-5 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs uppercase tracking-widest font-bold bg-white text-black rounded-full hover:bg-neutral-100 transition-all whitespace-nowrap flex-shrink-0"
          style={{ boxShadow: "0 0 30px rgba(255,255,255,0.15)" }}
        >
          {isLoggedIn ? "Continue Session →" : "Start practicing free →"}
        </Link>
      </footer>
    </div>
  );
}