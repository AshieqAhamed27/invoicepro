import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, isLoggedIn, getUser, hasProAccess, getPlanLabel, setPostLoginRedirect } from '../utils/auth';
import BrandLogo from './BrandLogo';

// ─── 4 Core Navigation Links for Freelancers ───
const primaryAppLinks = [
  { to: '/client-flow', label: '📊 Dashboard' },
  { to: '/create-invoice', label: '📄 Invoices & QR' },
  { to: '/proposal-writer', label: '✍️ AI Proposals' },
  { to: '/clients', label: '👥 Clients' }
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getUser();
  const isAdmin = user?.role === 'admin';
  const isPro = hasProAccess(user);
  const planLabel = getPlanLabel(user);

  const isDiwaliOffer = useMemo(() => {
    const now = new Date();
    const start = new Date('2026-11-08T00:00:00+05:30');
    const end = new Date('2026-11-15T23:59:59+05:30');
    return now >= start && now <= end;
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
    setMenuOpen(false);
  };

  const navClass = ({ isActive }) =>
    isActive
      ? 'text-indigo-600 bg-indigo-50 border-indigo-200 font-bold'
      : 'text-slate-600 border-transparent hover:text-slate-950 hover:bg-slate-100/80 font-semibold';

  const closeMenu = () => setMenuOpen(false);

  const openStartFree = () => {
    setPostLoginRedirect('/client-flow');
    navigate('/signup');
    closeMenu();
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1280px)');
    const handleDesktopChange = (event) => {
      if (event.matches) closeMenu();
    };

    handleDesktopChange(desktopQuery);
    desktopQuery.addEventListener('change', handleDesktopChange);

    return () => {
      desktopQuery.removeEventListener('change', handleDesktopChange);
    };
  }, []);

  const mobileItemClass = (state) =>
    `rounded-xl border px-3.5 py-3 transition-all sm:px-4 ${
      state.isActive
        ? 'border-indigo-200 bg-indigo-50/80 text-indigo-950'
        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950'
    }`;
  const mobileStaticItemClass = 'rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 sm:px-4';

  return (
    <>
      {user?.isDemo && (
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white text-xs font-bold py-2 px-4 text-center border-b border-indigo-700 flex items-center justify-center gap-3">
          <span>👀 You are exploring ClientFlow AI in <strong>Interactive Demo Mode</strong>.</span>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="bg-white text-indigo-950 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-zinc-100 transition shadow-sm"
          >
            Start Your 30-Day Free Trial →
          </button>
        </div>
      )}
      <nav className="sticky top-0 z-50 px-2 pb-0 pt-[max(0.55rem,env(safe-area-inset-top))] sm:px-4 sm:pt-4">
      <div className="container-custom flex h-14 min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/85 px-3 shadow-sm backdrop-blur-xl sm:h-16 sm:rounded-2xl sm:px-5 lg:px-6">
        <NavLink
          to="/"
          onClick={closeMenu}
          className="group flex min-w-0 shrink items-center gap-3"
          aria-label="ClientFlow AI home"
        >
          <BrandLogo
            className="min-w-0"
            markClassName="h-8 w-8 transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10"
            textColor="slate"
          />
        </NavLink>

        <div className="hidden min-w-0 items-center gap-1.5 text-sm xl:flex">
          {!loggedIn ? (
            <>
              <NavLink to="/" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Home
              </NavLink>
              <a href="/#how-it-works" className="rounded-lg border border-transparent px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                How it works
              </a>
              <a href="/#freelancer-protection" className="rounded-lg border border-transparent px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                Protection
              </a>
              <a href="/#who-for" className="rounded-lg border border-transparent px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                Who it helps
              </a>
              <NavLink to="/payments" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Pricing
              </NavLink>
              <NavLink to="/login" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Login
              </NavLink>
              <button type="button" onClick={openStartFree} className="btn btn-primary py-2 px-4 text-xs uppercase tracking-wider">
                Start 30 Days Free
              </button>
            </>
          ) : (
            <>
              {primaryAppLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={(state) => `rounded-lg border px-3.5 py-2 font-bold text-sm tracking-wide ${navClass(state)}`}>
                  {link.label}
                </NavLink>
              ))}
              <NavLink to="/settings" className={(state) => `rounded-lg border px-3 py-2 font-bold text-sm ${navClass(state)}`}>
                Settings
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-amber-900 hover:bg-amber-100"
                >
                  Admin
                </NavLink>
              )}
              {!isPro ? (
                <NavLink to="/payments" className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-sm hover:from-amber-300 hover:to-yellow-300 transition">
                  {isDiwaliOffer ? '🪔 Pro ₹249 (50% OFF)' : 'Upgrade Pro (₹499)'}
                </NavLink>
              ) : (
                <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                  {planLabel}
                </span>
              )}
              <button type="button" onClick={handleLogout} className="btn btn-secondary text-xs py-2 px-3">
                Logout
              </button>
            </>
          )}
        </div>

        <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex xl:hidden">
          {!loggedIn ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openStartFree}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-indigo-700 transition hover:bg-indigo-100"
              >
                Start Free
              </button>
            </div>
          ) : isAdmin ? (
            <NavLink
              to="/admin"
              onClick={closeMenu}
              className={(state) => `rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-widest transition ${
                state.isActive
                  ? 'border-amber-300 bg-amber-100 text-amber-950'
                  : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              Admin
            </NavLink>
          ) : !isPro ? (
            <NavLink
              to="/payments"
              onClick={closeMenu}
              className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-black uppercase tracking-widest text-amber-950 hover:bg-amber-200"
            >
              Upgrade
            </NavLink>
          ) : (
            <span className="max-w-[10rem] truncate rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-800">
              {planLabel}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all xl:hidden ${
            menuOpen
              ? 'border-indigo-300 bg-indigo-50 text-indigo-950'
              : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
          }`}
          aria-expanded={menuOpen}
          aria-controls="primary-mobile-navigation"
          aria-label="Toggle navigation menu"
        >
          <span className="relative h-4 w-5">
            <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-all ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
            <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-all ${menuOpen ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition-all ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
          </span>
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm xl:hidden"
            onClick={closeMenu}
          />
          <div
            id="primary-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="mobile-nav-panel animate-menu-drop fixed inset-x-2 top-[4.45rem] z-50 flex overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-2xl sm:inset-x-4 sm:top-[5.25rem] sm:rounded-2xl md:left-1/2 md:right-auto md:w-[min(44rem,calc(100vw-2rem))] md:-translate-x-1/2 xl:hidden"
          >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3 text-base sm:gap-5 sm:p-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                {loggedIn ? 'Signed in workspace' : 'ClientFlow AI'}
              </p>
              {loggedIn ? (
                <>
                  <p className="mt-2 text-lg font-black leading-tight text-slate-900">{user?.name || 'Your account'}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{user?.email}</p>
                  <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    isPro
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                  }`}>
                    {isPro ? planLabel : 'Free plan'}
                  </span>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg font-black leading-tight text-slate-900">Find clients and get paid faster.</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">Start free, then upgrade when Pro helps your business.</p>
                </>
              )}
            </div>

            <div className="grid gap-2">
              <p className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Core Actions</p>
              {loggedIn ? (
                <>
                  <NavLink to="/client-flow" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">📊 Dashboard</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Cash collected, unpaid invoices & payment alerts</span>
                  </NavLink>
                  <NavLink to="/create-invoice" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">📄 Invoices & UPI QR</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Create GST invoices & share payment links</span>
                  </NavLink>
                  <NavLink to="/proposal-writer" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">✍️ AI Proposals</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Generate 60-sec proposals with 50% advance milestone</span>
                  </NavLink>
                  <NavLink to="/clients" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">👥 Clients Directory</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Saved clients, contacts & payment history</span>
                  </NavLink>
                  <NavLink to="/settings" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">⚙️ Settings & Bank UPI</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Profile, company logo & UPI payment ID</span>
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">Home</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Product overview</span>
                  </NavLink>
                  <a href="/#how-it-works" onClick={closeMenu} className={mobileStaticItemClass}>
                    <span className="block text-sm font-black">How it works</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Lead to payment steps</span>
                  </a>
                  <a href="/#freelancer-protection" onClick={closeMenu} className={mobileStaticItemClass}>
                    <span className="block text-sm font-black">Protection</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Risk, scope, and payment guard</span>
                  </a>
                  <a href="/#who-for" onClick={closeMenu} className={mobileStaticItemClass}>
                    <span className="block text-sm font-black">Who it helps</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Freelancers & service professionals</span>
                  </a>
                  <NavLink to="/payments" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">{isDiwaliOffer ? '🪔 Diwali Pricing (50% OFF)' : 'Pricing'}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">{isDiwaliOffer ? 'Special ₹249/mo (Normally ₹499)' : 'Simple ₹499/mo Pro plan'}</span>
                  </NavLink>
                </>
              )}


            </div>

            <div className="grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
              {!loggedIn ? (
                <>
                  <NavLink to="/login" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">Login</span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">Open your workspace</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={openStartFree}
                    className="rounded-xl bg-slate-950 px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl hover:bg-black transition active:scale-[0.98] sm:rounded-2xl"
                  >
                    Create Free Account
                  </button>
                </>
              ) : (
                <>
                  {!isPro ? (
                    <NavLink to="/payments" onClick={closeMenu} className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 px-4 py-3 font-black text-slate-950 text-center uppercase tracking-wider text-xs shadow-md">
                      {isDiwaliOffer ? '🪔 Upgrade to Pro ₹249/mo (50% OFF)' : 'Upgrade to Pro (₹499/mo)'}
                    </NavLink>
                  ) : (
                    <NavLink to="/payment" onClick={closeMenu} className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 font-black text-emerald-800 text-center text-xs">
                      Manage Plan ({planLabel})
                    </NavLink>
                  )}
                  {isAdmin && (
                    <NavLink to="/admin" onClick={closeMenu} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-black text-amber-900 text-center text-xs">
                      Admin Panel
                    </NavLink>
                  )}
                  <button type="button" onClick={handleLogout} className="rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 transition">
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
          </div>
        </>
      )}
    </nav>
  </>
  );
}
