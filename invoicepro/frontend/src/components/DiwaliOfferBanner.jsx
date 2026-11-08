import React, { useState, useEffect } from 'react';

// ============================================================
// DIWALI OFFER CONFIG — Live 50% Off Campaign
// ============================================================
export const DISCOUNT_PCT = 50;

export const isDiwaliOfferActive = () => true;

export const getDiwaliDiscount = () => ({
  pct: DISCOUNT_PCT,
  label: `🪔 Diwali ${DISCOUNT_PCT}% Off`
});

export function getTimeLeft() {
  const now = new Date();
  // Target: November 15, 2026 or a guaranteed 6-day rolling window
  let target = new Date('2026-11-15T23:59:59+05:30');
  const nowMs = now.getTime();
  const targetMs = target.getTime();

  // If clock is past target or diff is unrealistic, keep a dynamic 6-day timer
  let diff = targetMs - nowMs;
  if (diff <= 0 || diff > 15 * 24 * 60 * 60 * 1000) {
    // 6 days, 14 hours, 28 mins
    const sixDaysMs = (6 * 24 * 60 * 60 * 1000) + (14 * 60 * 60 * 1000) + (28 * 60 * 1000);
    diff = sixDaysMs - (nowMs % (24 * 60 * 60 * 1000));
  }

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, expired: false };
}

export default function DiwaliOfferBanner() {
  const [visible, setVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #b45309 0%, #d97706 25%, #f59e0b 50%, #d97706 75%, #b45309 100%)',
        backgroundSize: '200% 100%',
        animation: 'diwaliSlide 4s linear infinite',
        position: 'relative',
        zIndex: 9999,
        overflow: 'hidden',
      }}
      className="w-full text-slate-950 font-bold shadow-md"
    >
      {/* Sparkle overlay */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)',
        }}
      />

      <style>{`
        @keyframes diwaliSlide { 0%{background-position:0% 0} 100%{background-position:200% 0} }
        @keyframes diwaliPulse { 0%,100%{opacity:1} 50%{opacity:.7} }
        .diwali-pulse { animation: diwaliPulse 2s ease-in-out infinite; }
      `}</style>

      <div className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs sm:text-sm">
        {/* Left sparkles */}
        <span className="text-base diwali-pulse hidden sm:inline">🪔</span>

        {/* Main message */}
        <span className="font-extrabold text-slate-950">
          Diwali Flash Sale: <span className="bg-white/80 px-2 py-0.5 rounded text-indigo-950 font-black">50% OFF Pro</span> — Get full access for ₹249/mo (was ₹499)!
        </span>

        {/* Live Countdown */}
        <div className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full text-xs font-mono font-black text-white shadow-inner">
          <span className="text-yellow-200">⏳ Ends in:</span>
          <span>{pad(timeLeft.days)}d</span>
          <span>:</span>
          <span>{pad(timeLeft.hours)}h</span>
          <span>:</span>
          <span>{pad(timeLeft.minutes)}m</span>
          <span>:</span>
          <span className="text-yellow-300">{pad(timeLeft.seconds)}s</span>
        </div>

        {/* CTA */}
        <a
          href="/payments"
          className="inline-block bg-slate-950 hover:bg-black text-white text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full transition-all shadow hover:scale-105 active:scale-95"
        >
          Claim ₹249 Pass →
        </a>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 text-lg leading-none transition-opacity text-slate-950 font-black"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    </div>
  );
}
