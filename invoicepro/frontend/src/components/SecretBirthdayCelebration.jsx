import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function SecretBirthdayCelebration({ user, onUserUpdated }) {
  const [dismissed, setDismissed] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [giftClaimed, setGiftClaimed] = useState(Boolean(user?.claimedBirthdayGiftYear === new Date().getFullYear()));
  const [giftResult, setGiftResult] = useState(null);

  const isBirthday = Boolean(user?.isBirthday);
  const userName = user?.name || 'Friend';
  const agentName = user?.agentConfig?.name || 'Flow';

  useEffect(() => {
    if (isBirthday && !dismissed && window.speechSynthesis && user?.agentConfig?.voiceEnabled !== false) {
      try {
        const text = `Happy Birthday ${userName}! Wishing you health, wealth, and dream clients from all of us at ClientFlow AI.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  }, [isBirthday, userName]);

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
    } catch (err) {
      setGiftResult({
        message: err.response?.data?.message || '🎉 Happy Birthday! Enjoy your special day with ClientFlow AI.'
      });
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-purple-950/40 to-slate-950 p-6 shadow-2xl backdrop-blur-2xl animate-fade-in">
      {/* Golden celebratory shimmer lines */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/10 transition"
        title="Dismiss celebration"
      >
        ✕ Standard view
      </button>

      <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left sm:justify-between sm:gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-black text-amber-300">
            <span>🎂</span>
            <span>TODAY IS YOUR SPECIAL DAY</span>
          </div>

          <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
            🎉 Happy Birthday, <span className="bg-gradient-to-r from-amber-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">{userName}</span>!
          </h2>

          <p className="mt-1.5 max-w-xl text-sm text-slate-300">
            Your entire workspace is celebrating you today. {agentName} prepared a personal gift to celebrate your journey and help you scale your freelance business!
          </p>
        </div>

        {/* 🎁 The Interactive Unboxing Gift Box */}
        <div className="mt-5 shrink-0 sm:mt-0">
          {!giftClaimed ? (
            <button
              type="button"
              onClick={handleOpenGift}
              disabled={isOpening}
              className="group relative flex flex-col items-center justify-center rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-purple-600/20 p-5 shadow-xl transition-all duration-300 hover:scale-105 hover:border-amber-300 hover:shadow-amber-500/20"
            >
              <span className="text-4xl animate-bounce">🎁</span>
              <span className="mt-2 text-xs font-black tracking-wide text-amber-200 group-hover:text-amber-100">
                {isOpening ? 'Unboxing...' : 'Tap to Open Gift'}
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/50 p-4 text-center">
              <span className="text-3xl">✨ 👑 ✨</span>
              <p className="mt-1 text-xs font-black text-emerald-300">GIFT UNLOCKED!</p>
              <p className="text-[11px] text-slate-300">14 Days of Pro Access Active</p>
            </div>
          )}
        </div>
      </div>

      {giftResult && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-center text-xs font-bold text-emerald-300">
          {giftResult.message}
        </div>
      )}
    </div>
  );
}
