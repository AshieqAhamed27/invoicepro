import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn, setPostLoginRedirect } from '../utils/auth';
import { trackCtaClick } from '../utils/analytics';

export default function StickyTrialBar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loggedIn) return;

    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loggedIn]);

  if (loggedIn || !visible) return null;

  const handleClick = () => {
    setPostLoginRedirect('/client-flow');
    trackCtaClick('sticky_bar', 'home', '/signup');
    navigate('/signup');
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden"
      style={{
        animation: 'slideUpBar 0.35s cubic-bezier(0.22, 1, 0.36, 1) both'
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, rgba(8,11,17,0.97), rgba(13,17,25,0.97))',
          borderTop: '1px solid rgba(250, 204, 21, 0.25)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
      >
        <div className="min-w-0">
          <p className="text-sm font-black text-white truncate">Start your 30-day free trial</p>
          <p className="text-xs font-medium text-zinc-400 truncate">No card required. Full access.</p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="shrink-0 rounded-lg bg-yellow-300 px-5 py-2.5 text-xs font-black uppercase text-slate-950 transition hover:bg-yellow-200 active:scale-[0.97]"
        >
          Start Free
        </button>
      </div>

      <style>{`
        @keyframes slideUpBar {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
