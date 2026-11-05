import React from 'react';
import { COMPANY_SHORT_NAME, COMPANY_TAGLINE } from '../utils/company';

/**
 * Premium Loading Screen & Spinner Component
 * Features dual-ring glowing orbits, radar pulse, top indeterminate progress sweep,
 * and ambient backdrop glow.
 *
 * @param {boolean} fullScreen - Renders full-screen backdrop with top progress bar
 * @param {boolean} inline - Compact inline version for panels and cards
 * @param {string} message - Primary status message
 * @param {string} subtext - Secondary hint or tagline
 * @param {'sm' | 'md' | 'lg'} size - Spinner scale
 */
export default function LoadingScreen({
  fullScreen = true,
  inline = false,
  message = 'Loading workspace...',
  subtext = 'Multi-currency & GST Invoices · UPI & Card Payments',
  size = 'md'
}) {
  const isCompact = inline || size === 'sm';

  const spinnerContent = (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Ambient Breathing Glow Orb */}
      <div
        className={`pointer-events-none absolute rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-indigo-500/20 loader-glow-orb ${
          isCompact ? 'h-32 w-32' : 'h-72 w-72 sm:h-96 sm:w-96'
        }`}
      />

      {/* Spinner Container */}
      <div className={`relative flex items-center justify-center ${isCompact ? 'h-16 w-16' : 'h-24 w-24 sm:h-28 sm:w-28'}`}>
        {/* Radar Ring Wave */}
        <div
          className={`absolute rounded-full border border-emerald-400/30 loader-radar ${
            isCompact ? 'inset-0' : '-inset-2'
          }`}
        />

        {/* Outer Orbit Ring (Clockwise) */}
        <div
          className={`absolute rounded-full border-2 border-transparent border-t-emerald-400 border-r-teal-300 loader-orbit-outer ${
            isCompact ? 'inset-0' : 'inset-0 shadow-[0_0_24px_rgba(52,211,153,0.35)]'
          }`}
        >
          {/* Orbiting Satellite Particle */}
          <div className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_10px_#34d399]" />
        </div>

        {/* Inner Orbit Ring (Counter-Clockwise) */}
        <div
          className={`absolute rounded-full border-2 border-transparent border-b-indigo-400 border-l-cyan-400 loader-orbit-inner ${
            isCompact ? 'inset-2' : 'inset-3 sm:inset-3.5'
          }`}
        >
          {/* Inner Satellite Particle */}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]" />
        </div>

        {/* Center Brand Glyph */}
        <div className="relative flex items-center justify-center rounded-2xl border border-white/10 bg-[#0d111a]/80 p-2 shadow-inner backdrop-blur-sm">
          <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25">
            CF
          </div>
        </div>
      </div>

      {/* Typography & Status Section */}
      <div className="relative mt-6 flex flex-col items-center text-center">
        {/* Brand Label Pill */}
        {!isCompact && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              {COMPANY_SHORT_NAME}
            </span>
          </div>
        )}

        {/* Shimmering Animated Message */}
        <div className="flex items-center gap-1 text-center">
          <h3 className={`font-black tracking-tight loader-shimmer-title ${isCompact ? 'text-xs' : 'text-base sm:text-lg'}`}>
            {message}
          </h3>

          {/* Bouncing Triple Dots */}
          <span className="inline-flex items-center gap-0.5 ml-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 loader-dot-1" />
            <span className="h-1.5 w-1.5 rounded-full bg-teal-300 loader-dot-2" />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 loader-dot-3" />
          </span>
        </div>

        {/* Subtext */}
        {subtext && !isCompact && (
          <p className="mt-2 max-w-xs sm:max-w-md text-xs font-semibold leading-relaxed text-zinc-500">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );

  // Inline / Panel Version
  if (inline) {
    return (
      <div className="flex w-full items-center justify-center py-12 sm:py-16">
        {spinnerContent}
      </div>
    );
  }

  // Full-Screen Page / Route Transition Version
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center bg-[#07090e] text-white overflow-hidden px-4"
    >
      {/* Top Indeterminate Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-black/60 overflow-hidden z-[10000]">
        <div className="h-full w-1/3 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 shadow-[0_0_16px_rgba(52,211,153,0.9)] loader-top-bar" />
      </div>

      {/* Decorative Subtle Background Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1f293d_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

      {/* Main Content */}
      {spinnerContent}
    </div>
  );
}
