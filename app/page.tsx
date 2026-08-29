"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle animated grid background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let raf: number;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gridSize = 48;
      const cols = Math.ceil(canvas.width / gridSize) + 1;
      const rows = Math.ceil(canvas.height / gridSize) + 1;

      ctx.strokeStyle = "rgba(56, 54, 51, 0.6)";
      ctx.lineWidth = 0.5;

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const px = x * gridSize;
          const py = y * gridSize;
          const pulse =
            Math.sin(frame * 0.012 + x * 0.3 + y * 0.3) * 0.5 + 0.5;
          ctx.globalAlpha = 0.1 + pulse * 0.08;
          ctx.beginPath();
          ctx.arc(px, py, 1, 0, Math.PI * 2);
          ctx.fillStyle = "#E8A33D";
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="bb-landing">
      <canvas ref={canvasRef} className="bb-landing-canvas" aria-hidden="true" />

      {/* Nav */}
      <header className="bb-landing-nav">
        <span className="bb-brand">BrainBridge</span>
        <div className="bb-landing-nav-actions">
          <Link href="/sign-in" className="bb-btn bb-btn-ghost">
            Sign In
          </Link>
          <Link href="/sign-up" className="bb-btn bb-btn-primary">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="bb-landing-hero">
        <div className="bb-landing-badge">
          <span className="bb-status-dot bb-status-dot--processing" />
          <span className="bb-mono" style={{ fontSize: "0.72rem", color: "var(--amber)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            V2 · AI Knowledge System
          </span>
        </div>

        <h1 className="bb-landing-title">
          Capture the thought.
          <br />
          <span className="bb-landing-title-accent">Let AI build the knowledge.</span>
        </h1>

        <p className="bb-landing-desc">
          BrainBridge is a second-brain capture tool. Type a raw idea — quick,
          deep, or research-grade — and a multi-agent AI pipeline turns it into
          structured knowledge in your Notion workspace.
        </p>

        <div className="bb-landing-cta">
          <Link href="/sign-up" className="bb-btn bb-btn-primary bb-btn-lg">
            Open Your Second Brain →
          </Link>
          <Link href="/sign-in" className="bb-btn bb-btn-ghost">
            Already have an account
          </Link>
        </div>

        {/* Feature grid */}
        <div className="bb-landing-features">
          <div className="bb-landing-feature">
            <span className="bb-landing-feature-icon">⚡</span>
            <div>
              <div className="bb-landing-feature-title">3 Depth Modes</div>
              <div className="bb-landing-feature-desc">
                Quick capture, Deep analysis, or full Research reports — choose
                per note.
              </div>
            </div>
          </div>
          <div className="bb-landing-feature">
            <span className="bb-landing-feature-icon">🤖</span>
            <div>
              <div className="bb-landing-feature-title">Multi-Agent AI</div>
              <div className="bb-landing-feature-desc">
                Gemini + Mistral-7B + Llama 3.2 work in sequence to enrich every
                thought.
              </div>
            </div>
          </div>
          <div className="bb-landing-feature">
            <span className="bb-landing-feature-icon">📱</span>
            <div>
              <div className="bb-landing-feature-title">Instagram / URL Aware</div>
              <div className="bb-landing-feature-desc">
                Paste a reel or article link — AI reads and contextualises the
                content for you.
              </div>
            </div>
          </div>
          <div className="bb-landing-feature">
            <span className="bb-landing-feature-icon">🔒</span>
            <div>
              <div className="bb-landing-feature-title">Private by Default</div>
              <div className="bb-landing-feature-desc">
                Works offline-first. All data lives in your Supabase and Notion,
                under your control.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bb-landing-footer">
        <span className="bb-mono" style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
          BrainBridge · Personal AI Knowledge System · $0/month
        </span>
      </footer>
    </div>
  );
}
