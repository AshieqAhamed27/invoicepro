import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

export default function SecretBirthdayCelebration({ user, onUserUpdated }) {
  const [dismissed, setDismissed] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [giftClaimed, setGiftClaimed] = useState(Boolean(user?.claimedBirthdayGiftYear === new Date().getFullYear()));
  const [giftResult, setGiftResult] = useState(null);
  const canvasRef = useRef(null);

  const isBirthday = Boolean(user?.isBirthday);
  const userName = user?.name || 'Friend';
  const agentName = user?.agentConfig?.name || 'Flow';

  // 1. 60 FPS Golden Stardust Canvas Particle System (Apple / Spotify Caliber)
  useEffect(() => {
    if (!isBirthday || dismissed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.7 + 0.3,
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.7 + 0.3,
      pulse: Math.random() * 0.03 + 0.01
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.opacity += Math.sin(Date.now() * p.pulse) * 0.01;

        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0.1, Math.min(0.9, p.opacity))})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f59e0b';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isBirthday, dismissed]);

  if (!isBirthday || dismissed) return null;

  const handleOpenGift = async () => {
    setIsOpening(true);
    try {
      const res = await api.post('/auth/claim-birthday-gift');
      setGiftResult(res.data);
      setGiftClaimed(true);
      if (res.data?.user && onUserUpdated) {
        onUserUpdated(res.data.user);
      }
      // Speak warm birthday greeting when user explicitly opens their gift
      if (window.speechSynthesis && user?.agentConfig?.voiceEnabled !== false) {
        try {
          window.speechSynthesis.cancel();
          const text = `Happy birthday ${userName}! Your exclusive 14-day Pro workspace upgrade is officially active. Enjoy your special day!`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-IN';
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch {}
      }
    } catch (err) {
      setGiftResult({
        message: err.response?.data?.message || '🎉 Happy Birthday! Enjoy your special celebration with ClientFlow AI.'
      });
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-950 via-amber-950/20 to-black p-6 sm:p-8 shadow-[0_20px_60px_rgba(245,158,11,0.15)] backdrop-blur-3xl animate-fade-in">
      
      {/* 60 FPS Golden Stardust Canvas Background */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
      />

      {/* Radial Specular Lighting */}
      <div className="pointer-events-none absolute -top-32 left-1/3 h-64 w-96 rounded-full bg-gradient-to-r from-amber-500/20 via-pink-500/10 to-purple-600/15 blur-3xl" />

      {/* Top Controls: Dismiss anytime */}
      <div className="relative z-10 flex items-center justify-between pb-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-50 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-amber-700 shadow-sm">
          <span className="animate-spin">✨</span>
          <span>A SPECIAL DAY IN YOUR STUDIO</span>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-indigo-700"
          title="Return to standard view"
        >
          ✕ Standard view
        </button>
      </div>

      <div className="relative z-10 mt-4 flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
        <div className="max-w-xl">
          <h2 className="text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
            🎉 Happy Birthday,{' '}
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              {userName}
            </span>!
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base font-normal">
            Your entire workspace is celebrating you today. {agentName} prepared a personal gift to celebrate your journey and help you scale your freelance studio.
          </p>

          <p className="mt-2 text-xs font-semibold text-amber-700/80">
            ⭐ Exclusive Founder Unlock • Available Today Only
          </p>
        </div>

        {/* 🎁 3D Metallic Holographic Gift Box */}
        <div className="shrink-0">
          {!giftClaimed ? (
            <button
              type="button"
              onClick={handleOpenGift}
              disabled={isOpening}
              className="group relative flex flex-col items-center justify-center rounded-3xl border border-amber-400/50 bg-gradient-to-b from-amber-500/20 via-slate-900 to-black p-6 shadow-[0_10px_30px_rgba(245,158,11,0.25)] transition-all duration-300 hover:scale-110 hover:border-amber-300 active:scale-95"
            >
              {/* Outer Glow Halo */}
              <span className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-400/30 to-purple-500/30 blur-lg transition group-hover:opacity-100 opacity-60" />

              <span className="relative text-5xl transition-transform duration-300 group-hover:scale-110 animate-bounce">
                🎁
              </span>
              <span className="relative mt-3 text-xs font-black uppercase tracking-wider text-amber-700 group-hover:text-indigo-700">
                {isOpening ? 'Unboxing...' : 'Tap to Open Gift'}
              </span>
            </button>
          ) : (
            <div className="rounded-3xl border border-emerald-400/50 bg-gradient-to-b from-emerald-950/80 to-slate-950 p-6 text-center shadow-xl shadow-emerald-500/10">
              <span className="text-4xl animate-pulse">👑</span>
              <p className="mt-2 text-xs font-black tracking-widest text-emerald-700 uppercase">GIFT ACTIVE</p>
              <p className="mt-1 text-xs font-semibold text-slate-800">14 Days of Pro Access Unlocked</p>
            </div>
          )}
        </div>
      </div>

      {giftResult && (
        <div className="relative z-10 mt-5 rounded-2xl border border-emerald-200 bg-emerald-950/60 p-4 text-center text-xs font-bold text-emerald-700 backdrop-blur-md animate-fade-in">
          {giftResult.message}
        </div>
      )}
    </div>
  );
}
