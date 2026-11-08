import React, { useState, useEffect } from 'react';

// ============================================================
// DIWALI OFFER CONFIG — Change these to adjust the offer
// ============================================================
const OFFER_START = new Date('2026-11-08T00:00:00+05:30');
const OFFER_END   = new Date('2026-11-15T23:59:59+05:30');
const DISCOUNT_PCT = 50;
// ============================================================

export const isDiwaliOfferActive = () => {
  const now = new Date();
  return now >= OFFER_START && now <= OFFER_END;
};

export const getDiwaliDiscount = () => {
  if (!isDiwaliOfferActive()) return null;
  return { pct: DISCOUNT_PCT, label: `🪔 Diwali ${DISCOUNT_PCT}% Off` };
};

function getTimeLeft() {
  const diff = Math.max(0, OFFER_END.getTime() - Date.now());
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, expired: diff === 0 };
}

export default function DiwaliOfferBanner() {
  const [visible, setVisible]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    if (!isDiwaliOfferActive()) return;
    const dismissed = sessionStorage.getItem('diwali_banner_dismissed');
    if (!dismissed) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      const t = getTimeLeft();
      setTimeLeft(t);
      if (t.expired) {
        setVisible(false);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  const dismiss = () => {
    sessionStorage.setItem('diwali_banner_dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #7c2d12 0%, #9a3412 25%, #c2410c 50%, #9a3412 75%, #7c2d12 100%)',
        backgroundSize: '200% 100%',
        animation: 'diwaliSlide 4s linear infinite',
        position: 'relative',
        zIndex: 9999,
        overflow: 'hidden',
      }}
      className="w-full text-white"
    >
      {/* Sparkle overlay */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 20% 50%, rgba(251,191,36,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(251,191,36,0.15) 0%, transparent 60%)',
        }}
      />

      <style>{`
        @keyframes diwaliSlide { 0%{background-position:0% 0} 100%{background-position:200% 0} }
        @keyframes diwaliPulse { 0%,100%{opacity:1} 50%{opacity:.7} }
        .diwali-pulse { animation: diwaliPulse 2s ease-in-out infinite; }
      `}</style>

      <div className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center">
        {/* Left sparkles */}
        <span className="text-lg diwali-pulse hidden sm:inline">✨🪔✨</span>

        {/* Main message */}
        <span className="font-bold text-sm sm:text-base">
          🎉 Diwali Special — <span className="text-yellow-300 font-black">{DISCOUNT_PCT}% OFF</span> all paid plans!
        </span>

        {/* Countdown */}
        <div className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full text-xs font-mono font-bold">
          <span className="text-yellow-300">⏰</span>
          <span>{pad(timeLeft.days)}d</span>
          <span className="opacity-60">:</span>
          <span>{pad(timeLeft.hours)}h</span>
          <span className="opacity-60">:</span>
          <span>{pad(timeLeft.minutes)}m</span>
          <span className="opacity-60">:</span>
          <span>{pad(timeLeft.seconds)}s</span>
        </div>

        {/* CTA */}
        <a
          href="/checkout/monthly"
          className="inline-block bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black px-3 py-1 rounded-full transition-all hover:scale-105 active:scale-95"
        >
          Grab Offer →
        </a>

        {/* Right sparkles */}
        <span className="text-lg diwali-pulse hidden sm:inline">✨🪔✨</span>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 text-lg leading-none transition-opacity"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
