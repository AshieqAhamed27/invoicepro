import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, isLoggedIn, getUser, hasProAccess, getPlanLabel, setPostLoginRedirect } from '../utils/auth';
import BrandLogo from './BrandLogo';

const appLinks = [
  { to: '/client-flow', label: 'Client Flow', detail: 'Lead to payment workflow' },
  { to: '/money-gps', label: 'Money GPS', detail: 'One best action today' },
  { to: '/business-autopilot', label: 'Autopilot', detail: 'Lead to payment automation', requiresPro: true },
  { to: '/profit-tracker', label: 'Profit Tracker', detail: 'AI/software cost and project profit', requiresPro: true },
  { to: '/growth-plan', label: 'Growth', detail: 'Stability and daily plan', requiresPro: true },
  { to: '/ai-coach', label: 'AI Coach', detail: 'Find, talk, close, collect', requiresPro: true },
  { to: '/client-finder', label: 'Find Clients', detail: 'Find client opportunities', requiresPro: true },
  { to: '/proposal-writer', label: 'Proposal', detail: 'Write and improve proposals', requiresPro: true },
  { to: '/deal-room', label: 'Deal Room', detail: 'Move leads to paid work', requiresPro: true },
  { to: '/leads', label: 'Lead Pipeline', detail: 'Track prospects and follow-up', requiresPro: true },
  { to: '/client-workroom', label: 'Workroom', detail: 'Scope, tasks, files, proof, payment' },
  { to: '/cloud-documents', label: 'Cloud Docs', detail: 'Store invoices, contracts, and project files' },
  { to: '/create-invoice', label: 'Invoice', detail: 'Proposal or invoice' }
];

const primaryAppLinks = [
  { to: '/client-flow', label: 'Client Flow' },
  { to: '/money-gps', label: 'Money GPS' },
  { to: '/client-workroom', label: 'Workroom' },
  { to: '/create-invoice', label: 'Invoice' },
  { to: '/cloud-documents', label: 'Files' }
];

const moreAppLinks = [
  { to: '/client-flow', label: 'Client Flow', detail: 'Lead to payment workflow' },
  { to: '/business-autopilot', label: 'Business Autopilot', detail: 'Lead to payment automation', requiresPro: true },
  { to: '/profit-tracker', label: 'Profit Tracker', detail: 'AI tool cost and project profit', requiresPro: true },
  { to: '/growth-plan', label: 'Growth Plan', detail: 'Income stability plan', requiresPro: true },
  { to: '/ai-coach', label: 'AI Coach', detail: 'Find, talk, close, collect', requiresPro: true },
  { to: '/client-finder', label: 'Find Clients', detail: 'Client opportunities', requiresPro: true },
  { to: '/proposal-writer', label: 'Proposal Writer', detail: 'AI proposal support', requiresPro: true },
  { to: '/deal-room', label: 'Deal Room', detail: 'Close serious leads', requiresPro: true },
  { to: '/leads', label: 'Lead Pipeline', detail: 'Manage prospects', requiresPro: true },
  { to: '/client-workroom', label: 'Client Workroom', detail: 'Scope, tasks, files, proof, payment' },
  { to: '/cloud-documents', label: 'Cloud Documents', detail: 'Invoices, contracts, files' },
  { to: '/agency', label: 'Agency Setup', detail: 'Done-for-you freelancer system' },
  { to: '/settings', label: 'Settings', detail: 'Profile, logo, payments' }
];

const useCaseLinks = [
  { to: '/freelancers', label: 'Freelancers', detail: 'Find clients and get paid' },
  { to: '/developers', label: 'Developers', detail: 'Manage builds and releases' },
  { to: '/designers', label: 'Designers', detail: 'Handle revisions and approvals' },
  { to: '/agencies', label: 'Agencies', detail: 'Run teams and retainers' },
  { to: '/consultants', label: 'Consultants', detail: 'Close retainers and invoices' }
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);
  const [useCasesOpen, setUseCasesOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);

  const user = getUser();
  const isAdmin = user?.role === 'admin';
  const isPro = hasProAccess(user);
  const planLabel = getPlanLabel(user);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
    setMenuOpen(false);
  };

  const navClass = ({ isActive }) =>
    isActive
      ? 'text-white bg-white/10 border-white/15'
      : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.06]';

  const closeMenu = () => setMenuOpen(false);
  const closeAllMenus = () => {
    setMenuOpen(false);
    setUseCasesOpen(false);
    setAppMenuOpen(false);
  };

  const openEarlyAccess = () => {
    const earlyAccessPath = '/payment?early=1';

    if (!loggedIn) {
      setPostLoginRedirect(earlyAccessPath);
      navigate('/signup');
    } else {
      navigate(earlyAccessPath);
    }

    closeAllMenus();
  };

  useEffect(() => {
    setMenuOpen(false);
    setUseCasesOpen(false);
    setAppMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpen]);

  const mobileItemClass = (state) =>
    `rounded-2xl border px-4 py-3 transition-all ${
      state.isActive
        ? 'border-white/15 bg-white/10 text-white'
        : 'border-white/8 bg-white/[0.03] text-zinc-300 hover:border-white/15 hover:bg-white/[0.07] hover:text-white'
    }`;
  const moreMenuActive = moreAppLinks.some((link) => location.pathname === link.to) || (isAdmin && location.pathname === '/admin');

  return (
    <nav className="sticky top-0 z-50 px-3 pt-3 pb-0 sm:px-4 sm:pt-4">
      <div className="container-custom flex h-16 items-center justify-between rounded-[1.35rem] border border-white/10 bg-[#090d14]/90 px-3 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:h-16 sm:px-6">
        <NavLink
          to="/"
          onClick={closeMenu}
          className="group flex min-w-0 items-center gap-3"
          aria-label="ClientFlow AI home"
        >
          <BrandLogo
            className="min-w-0"
            markClassName="h-9 w-9 transition-transform duration-300 group-hover:scale-110 sm:h-11 sm:w-11"
          />
        </NavLink>

        <div className="hidden items-center gap-1 text-sm xl:flex">
          {!loggedIn ? (
            <>
              <NavLink to="/" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Home
              </NavLink>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setAppMenuOpen(false);
                    setUseCasesOpen((open) => !open);
                  }}
                  className={`rounded-lg border px-3 py-2 font-semibold transition ${
                    useCaseLinks.some((link) => location.pathname === link.to)
                      ? 'border-white/15 bg-white/10 text-white'
                      : 'border-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  aria-expanded={useCasesOpen}
                >
                  Use Cases
                </button>
                {useCasesOpen && (
                  <div className="absolute left-0 top-full mt-3 w-72 rounded-2xl border border-white/10 bg-[#090d14] p-2 shadow-2xl shadow-black/40">
                    {useCaseLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={closeAllMenus}
                        className={(state) => `block rounded-xl px-4 py-3 transition ${
                          state.isActive
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span className="block text-sm font-black">{link.label}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-zinc-600">{link.detail}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
              <a href="/#pricing" className="rounded-lg border border-transparent px-3 py-2 font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white">
                Pricing
              </a>
              <NavLink to="/agency" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Agency Setup
              </NavLink>
              <NavLink to="/login" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Login
              </NavLink>
              <button type="button" onClick={() => navigate('/signup')} className="btn btn-primary">
                Start Free
              </button>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Dashboard
              </NavLink>
              {primaryAppLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                  {link.label}
                </NavLink>
              ))}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUseCasesOpen(false);
                    setAppMenuOpen((open) => !open);
                  }}
                  className={`rounded-lg border px-3 py-2 font-semibold transition ${
                    moreMenuActive
                      ? 'border-white/15 bg-white/10 text-white'
                      : 'border-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  aria-expanded={appMenuOpen}
                >
                  More
                </button>
                {appMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 max-h-[min(32rem,calc(100vh-6rem))] w-80 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#090d14] p-2 shadow-2xl shadow-black/40">
                    {moreAppLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={closeAllMenus}
                        className={(state) => `block rounded-xl px-4 py-3 transition ${
                          state.isActive
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black">{link.label}</span>
                          {link.requiresPro && !isPro && (
                            <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-yellow-200">
                              Pro
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-zinc-600">{link.detail}</span>
                      </NavLink>
                    ))}
                    {isAdmin && (
                      <NavLink
                        to="/admin"
                        onClick={closeAllMenus}
                        className="block rounded-xl px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/10"
                      >
                        Admin
                      </NavLink>
                    )}
                  </div>
                )}
              </div>
              {!isPro ? (
                <NavLink to="/payment" className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 font-semibold text-yellow-200 hover:bg-yellow-400/15">
                  Upgrade
                </NavLink>
              ) : (
                <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  {planLabel}
                </span>
              )}
              <button type="button" onClick={handleLogout} className="btn btn-dark">
                Logout
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all xl:hidden ${
            menuOpen
              ? 'border-yellow-300/30 bg-yellow-300/15 text-yellow-100'
              : 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
          }`}
          aria-expanded={menuOpen}
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
            className="fixed inset-0 top-20 z-40 bg-black/45 backdrop-blur-sm xl:hidden"
            onClick={closeMenu}
          />
          <div className="animate-menu-drop fixed inset-x-3 top-[5.2rem] z-50 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain rounded-[1.75rem] border border-white/10 bg-[#090d14]/98 shadow-2xl shadow-black/45 backdrop-blur-2xl sm:inset-x-4 xl:hidden">
          <div className="flex flex-col gap-5 p-4 text-base sm:p-6">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                {loggedIn ? 'Signed in workspace' : 'ClientFlow AI'}
              </p>
              {loggedIn ? (
                <>
                  <p className="mt-2 text-lg font-black leading-tight text-white">{user?.name || 'Your account'}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{user?.email}</p>
                  <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    isPro
                      ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                      : 'border-yellow-300/20 bg-yellow-300/10 text-yellow-200'
                  }`}>
                    {isPro ? planLabel : 'Free plan'}
                  </span>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg font-black leading-tight text-white">Find clients and get paid faster.</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-500">Start free, then upgrade when Pro helps your business.</p>
                </>
              )}
            </div>

            <div className="grid gap-3">
              <p className="px-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Main</p>
              <NavLink to="/" onClick={closeMenu} className={mobileItemClass}>
                <span className="block text-sm font-black">Home</span>
                <span className="mt-0.5 block text-xs font-semibold text-zinc-600">Product overview</span>
              </NavLink>
              <NavLink to="/agency" onClick={closeMenu} className={mobileItemClass}>
                <span className="block text-sm font-black">Agency Setup</span>
                <span className="mt-0.5 block text-xs font-semibold text-zinc-600">Done-for-you freelancer system</span>
              </NavLink>
              <div className="grid gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="px-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Use cases</p>
                {useCaseLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">{link.label}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-600">{link.detail}</span>
                  </NavLink>
                ))}
              </div>
              {!loggedIn ? (
                <>
                  <a href="/#pricing" onClick={closeMenu} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-zinc-300 hover:border-white/15 hover:bg-white/[0.07] hover:text-white">
                    <span className="block text-sm font-black">Pricing</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-600">Free, monthly, yearly</span>
                  </a>
                  <a href="/#faq" onClick={closeMenu} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-zinc-300 hover:border-white/15 hover:bg-white/[0.07] hover:text-white">
                    <span className="block text-sm font-black">FAQ</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-600">Common questions</span>
                  </a>
                  <NavLink to="/contact" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">Contact</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-600">Support and business details</span>
                  </NavLink>
                </>
              ) : (
                <NavLink to="/client-flow" onClick={closeMenu} className={mobileItemClass}>
                  <span className="block text-sm font-black">Client Flow</span>
                  <span className="mt-0.5 block text-xs font-semibold text-zinc-600">Lead to payment workflow</span>
                </NavLink>
              )}
            </div>

            {loggedIn && (
              <div className="grid gap-3">
                <p className="px-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Core workflow</p>
                {appLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} onClick={closeMenu} className={mobileItemClass}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black">{link.label}</span>
                      {link.requiresPro && !isPro && (
                        <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-yellow-200">
                          Pro
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-600">{link.detail}</span>
                  </NavLink>
                ))}
              </div>
            )}

            <div className="grid gap-3 border-t border-white/5 pt-4">
              {!loggedIn ? (
                <>
                  <NavLink to="/login" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">Login</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-600">Open your workspace</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/signup');
                      closeMenu();
                    }}
                    className="rounded-2xl bg-yellow-300 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-950 shadow-xl shadow-yellow-950/20 transition active:scale-[0.98]"
                  >
                    Create Free Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/payment');
                      closeMenu();
                    }}
                    className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-sm font-black uppercase tracking-widest text-emerald-200 transition active:scale-[0.98]"
                  >
                    Start Free Trial
                  </button>
                </>
              ) : (
                <>
                  {!isPro ? (
                    <NavLink to="/payment" onClick={closeMenu} className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 font-black text-yellow-200 hover:bg-yellow-300/15">
                      Upgrade Pro
                      <span className="mt-0.5 block text-xs font-semibold text-yellow-100/60">Unlock AI growth tools</span>
                    </NavLink>
                  ) : (
                    <NavLink to="/payment" onClick={closeMenu} className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 font-black text-emerald-200 hover:bg-emerald-300/15">
                      Manage Plan
                      <span className="mt-0.5 block text-xs font-semibold text-emerald-100/60">{planLabel}</span>
                    </NavLink>
                  )}
                  <NavLink to="/settings" onClick={closeMenu} className={mobileItemClass}>
                    <span className="block text-sm font-black">Settings</span>
                    <span className="mt-0.5 block text-xs font-semibold text-zinc-600">Profile, logo, payments</span>
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/admin" onClick={closeMenu} className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 font-black text-yellow-200 hover:bg-yellow-300/15">
                      Admin
                    </NavLink>
                  )}
                  <button type="button" onClick={handleLogout} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black uppercase tracking-widest text-zinc-300 transition active:scale-[0.98]">
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
  );
}
