import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAuth, isLoggedIn, getUser } from '../utils/auth';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = getUser();
  const isAdmin = user?.role === 'admin';
  const isPro = user?.plan && user.plan !== 'free';

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
    setMenuOpen(false);
  };

  const navClass = ({ isActive }) =>
    isActive
      ? "text-white bg-white/10 border-white/15"
      : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.06]";

  const mobileNavClass = ({ isActive }) =>
    isActive
      ? "text-white bg-white/10"
      : "text-zinc-400 hover:text-white hover:bg-white/[0.06]";

  return (
    <nav className="sticky top-0 z-50 px-3 pt-3 pb-0 sm:px-4 sm:pt-4">
      <div className="container-custom flex h-14 items-center justify-between rounded-lg border border-white/10 bg-[#090d14]/80 px-4 backdrop-blur-2xl shadow-2xl shadow-black/35 sm:h-16 sm:px-6">
        <NavLink to="/" className="group flex min-w-0 items-center gap-3">
          <BrandLogo markClassName="transition-transform duration-300 group-hover:scale-110" />
        </NavLink>

        <div className="hidden items-center gap-2 text-sm lg:flex">
          <NavLink to="/" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
            Home
          </NavLink>

          {!loggedIn && (
            <>
              <a href="/#pricing" className="rounded-lg border border-transparent px-3 py-2 font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06]">
                Pricing
              </a>
              <a href="/#faq" className="rounded-lg border border-transparent px-3 py-2 font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.06]">
                FAQ
              </a>
              <NavLink to="/contact" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Contact
              </NavLink>
            </>
          )}

          {loggedIn && (
            <>
              <NavLink to="/dashboard" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Dashboard
              </NavLink>
              <NavLink to="/launch" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Launch
              </NavLink>
              <NavLink to="/client-finder" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Find Clients
              </NavLink>
              <NavLink to="/leads" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Pipeline
              </NavLink>
              <NavLink to="/clients" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Clients
              </NavLink>
              <NavLink to="/recurring" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Recurring
              </NavLink>
              <NavLink to="/create-invoice" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Create Deal
              </NavLink>
              {!isPro && (
                <NavLink to="/payment" className="rounded-lg border border-yellow-400/20 px-3 py-2 font-semibold text-yellow-300 hover:bg-yellow-400/10">
                  Upgrade Pro
                </NavLink>
              )}
              <NavLink to="/settings" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Settings
              </NavLink>
            </>
          )}

          {isAdmin && (
            <NavLink to="/admin" className="rounded-lg px-3 py-2 font-semibold text-yellow-300 hover:bg-yellow-400/10">
              Admin
            </NavLink>
          )}

          {!loggedIn ? (
            <>
              <NavLink to="/login" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Login
              </NavLink>
              <button onClick={() => navigate('/signup')} className="btn btn-primary">
                Start Free
              </button>
            </>
          ) : (
            <button onClick={handleLogout} className="btn btn-dark">
              Logout
            </button>
          )}
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="btn btn-secondary shrink-0 px-3 py-2 lg:hidden"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <div className="animate-menu-drop mx-3 mt-3 max-h-[calc(100vh-5.75rem)] overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-[#090d14]/95 shadow-2xl shadow-black/35 backdrop-blur-2xl lg:hidden sm:mx-4">
          <div className="flex flex-col space-y-2 px-4 py-4 text-base sm:space-y-3 sm:px-6 sm:py-6">
            <NavLink to="/" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
              Home
            </NavLink>

            {!loggedIn && (
              <>
                <a href="/#pricing" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5">
                  Pricing
                </a>
                <a href="/#faq" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5">
                  FAQ
                </a>
                <NavLink to="/contact" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Contact
                </NavLink>
              </>
            )}

            {loggedIn && (
              <>
                <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Dashboard
                </NavLink>
                <NavLink to="/launch" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Launch Center
                </NavLink>
                <NavLink to="/client-finder" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Find Clients
                </NavLink>
                <NavLink to="/leads" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Lead Pipeline
                </NavLink>
                <NavLink to="/clients" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Clients
                </NavLink>
                <NavLink to="/recurring" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Recurring
                </NavLink>
                <NavLink to="/create-invoice" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Create Deal
                </NavLink>
                {!isPro && (
                  <NavLink to="/payment" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 font-semibold text-yellow-300 hover:bg-yellow-400/10">
                    Upgrade Pro
                  </NavLink>
                )}
                <NavLink to="/settings" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Settings
                </NavLink>
              </>
            )}

            {isAdmin && (
              <NavLink to="/admin" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-yellow-300 hover:bg-yellow-400/10">
                Admin
              </NavLink>
            )}

            {!loggedIn ? (
              <>
                <NavLink to="/login" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Login
                </NavLink>
                <button
                  onClick={() => {
                    navigate('/signup');
                    setMenuOpen(false);
                  }}
                  className="btn btn-primary w-full"
                >
                  Start Free
                </button>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="btn btn-dark w-full"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
