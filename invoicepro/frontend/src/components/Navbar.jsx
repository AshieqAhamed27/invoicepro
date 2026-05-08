import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAuth, isLoggedIn, getUser, hasProAccess, getPlanLabel } from '../utils/auth';
import BrandLogo from './BrandLogo';

const appLinks = [
  { to: '/money-gps', label: 'Money GPS', detail: 'One best action today' },
  { to: '/client-finder', label: 'Find Clients', detail: 'Find client opportunities', requiresPro: true },
  { to: '/team-workspace', label: 'Projects', detail: 'Team, issues, releases' },
  { to: '/create-invoice', label: 'Invoice', detail: 'Proposal or invoice' }
];

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const mobileNavClass = ({ isActive }) =>
    isActive
      ? 'text-white bg-white/10'
      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]';

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 px-3 pt-3 pb-0 sm:px-4 sm:pt-4">
      <div className="container-custom flex h-14 items-center justify-between rounded-2xl border border-white/10 bg-[#090d14]/85 px-4 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:h-16 sm:px-6">
        <NavLink
          to="/"
          className="group flex min-w-0 items-center gap-3"
          aria-label="ClientFlow AI home"
        >
          <BrandLogo markClassName="transition-transform duration-300 group-hover:scale-110" />
        </NavLink>

        <div className="hidden items-center gap-1 text-sm xl:flex">
          {!loggedIn ? (
            <>
              <NavLink to="/" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Home
              </NavLink>
              <a href="/#pricing" className="rounded-lg border border-transparent px-3 py-2 font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white">
                Pricing
              </a>
              <a href="/#faq" className="rounded-lg border border-transparent px-3 py-2 font-semibold text-zinc-400 hover:bg-white/[0.06] hover:text-white">
                FAQ
              </a>
              <NavLink to="/contact" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Contact
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
              {appLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                  <span className="inline-flex items-center gap-2">
                    {link.label}
                    {link.requiresPro && !isPro && (
                      <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-yellow-200">
                        Pro
                      </span>
                    )}
                  </span>
                </NavLink>
              ))}
              <NavLink to="/settings" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Settings
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className="rounded-lg px-3 py-2 font-semibold text-yellow-300 hover:bg-yellow-400/10">
                  Admin
                </NavLink>
              )}
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
          className="btn btn-secondary shrink-0 px-3 py-2 xl:hidden"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {menuOpen && (
        <div className="animate-menu-drop mx-3 mt-3 max-h-[calc(100vh-5.75rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#090d14]/95 shadow-2xl shadow-black/35 backdrop-blur-2xl sm:mx-4 xl:hidden">
          <div className="flex flex-col gap-5 px-4 py-4 text-base sm:px-6 sm:py-6">
            <div className="grid gap-2">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Main</p>
              <NavLink to="/" onClick={closeMenu} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                Home
              </NavLink>
              {!loggedIn ? (
                <>
                  <a href="/#pricing" onClick={closeMenu} className="rounded-lg px-3 py-2 text-zinc-400 hover:bg-white/5 hover:text-white">
                    Pricing
                  </a>
                  <a href="/#faq" onClick={closeMenu} className="rounded-lg px-3 py-2 text-zinc-400 hover:bg-white/5 hover:text-white">
                    FAQ
                  </a>
                  <NavLink to="/contact" onClick={closeMenu} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                    Contact
                  </NavLink>
                </>
              ) : (
                <NavLink to="/dashboard" onClick={closeMenu} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Dashboard
                </NavLink>
              )}
            </div>

            {loggedIn && (
              <div className="grid gap-2">
                <p className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Core workflow</p>
                {appLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} onClick={closeMenu} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                    <span className="flex items-center justify-between gap-3">
                      <span>{link.label}</span>
                      {link.requiresPro && !isPro && <span className="text-[10px] font-black uppercase text-yellow-300">Pro</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-600">{link.detail}</span>
                  </NavLink>
                ))}
              </div>
            )}

            <div className="grid gap-2 border-t border-white/5 pt-4">
              {!loggedIn ? (
                <>
                  <NavLink to="/login" onClick={closeMenu} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                    Login
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/signup');
                      closeMenu();
                    }}
                    className="btn btn-primary w-full"
                  >
                    Start Free
                  </button>
                </>
              ) : (
                <>
                  {!isPro ? (
                    <NavLink to="/payment" onClick={closeMenu} className="rounded-lg px-3 py-2 font-semibold text-yellow-300 hover:bg-yellow-400/10">
                      Upgrade Pro
                    </NavLink>
                  ) : (
                    <span className="rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-300">
                      {planLabel}
                    </span>
                  )}
                  <NavLink to="/settings" onClick={closeMenu} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                    Settings
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/admin" onClick={closeMenu} className="rounded-lg px-3 py-2 text-yellow-300 hover:bg-yellow-400/10">
                      Admin
                    </NavLink>
                  )}
                  <button type="button" onClick={handleLogout} className="btn btn-dark w-full">
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
