"use client";

import { useEffect, useRef } from "react";

export function Hero3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resize();
    window.addEventListener("resize", resize);

    // Floating orbs config
    const orbs = [
      { x: 0.2, y: 0.3, r: 120, speed: 0.0008, phase: 0,    color: "rgba(26,86,219,0.15)" },
      { x: 0.8, y: 0.6, r: 90,  speed: 0.0012, phase: 2,    color: "rgba(124,58,237,0.12)" },
      { x: 0.5, y: 0.8, r: 150, speed: 0.0006, phase: 4,    color: "rgba(26,86,219,0.08)" },
      { x: 0.7, y: 0.2, r: 70,  speed: 0.0015, phase: 1.5,  color: "rgba(14,165,233,0.10)" },
      { x: 0.1, y: 0.7, r: 80,  speed: 0.0010, phase: 3,    color: "rgba(124,58,237,0.08)" },
    ];

    // Grid lines
    const GRID_COLS = 12;
    const GRID_ROWS = 8;

    function drawGrid(w: number, h: number) {
      if (!ctx) return;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth   = 0.5;

      for (let i = 0; i <= GRID_COLS; i++) {
        const x = (i / GRID_COLS) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let j = 0; j <= GRID_ROWS; j++) {
        const y = (j / GRID_ROWS) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    // Particles
    const particles = Array.from({ length: 60 }, () => ({
      x:     Math.random(),
      y:     Math.random(),
      size:  Math.random() * 2 + 0.5,
      speed: Math.random() * 0.0002 + 0.0001,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0,   "#0A0F1C");
      bg.addColorStop(0.5, "#0D1428");
      bg.addColorStop(1,   "#0A0F1C");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Grid
      drawGrid(w, h);

      // Orbs
      orbs.forEach(orb => {
        const cx = orb.x * w + Math.sin(t * orb.speed + orb.phase) * 60;
        const cy = orb.y * h + Math.cos(t * orb.speed * 0.7 + orb.phase) * 40;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, "transparent");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Particles
      particles.forEach(p => {
        const px = p.x * w;
        const py = (p.y * h + t * p.speed * h) % h;
        const alpha = p.alpha * (0.6 + 0.4 * Math.sin(t * 0.003 + p.phase));

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Connecting lines between nearby particles
      ctx.strokeStyle = "rgba(26,86,219,0.15)";
      ctx.lineWidth   = 0.5;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pi = particles[i]!;
          const pj = particles[j]!;
          const dx  = (pi.x - pj.x) * w;
          const dy  = ((pi.y * h + t * pi.speed * h) % h) - ((pj.y * h + t * pj.speed * h) % h);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const alpha = (1 - dist / 100) * 0.3;
            ctx.strokeStyle = `rgba(26,86,219,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(pi.x * w, (pi.y * h + t * pi.speed * h) % h);
            ctx.lineTo(pj.x * w, (pj.y * h + t * pj.speed * h) % h);
            ctx.stroke();
          }
        }
      }

      // Center glow
      const centerGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 300);
      centerGrad.addColorStop(0,   "rgba(26,86,219,0.06)");
      centerGrad.addColorStop(0.5, "rgba(124,58,237,0.03)");
      centerGrad.addColorStop(1,   "transparent");
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, w, h);

      t++;
      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
}