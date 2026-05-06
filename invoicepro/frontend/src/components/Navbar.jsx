import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, isLoggedIn, getUser } from '../utils/auth';
import BrandLogo from './BrandLogo';

const growthLinks = [
  { to: '/client-finder', label: 'Find Clients', detail: 'Search real prospects' },
  { to: '/outbound-autopilot', label: 'Autopilot', detail: 'Daily outreach plan' },
  { to: '/leads', label: 'Pipeline', detail: 'Follow up and close' }
];

const billingLinks = [
  { to: '/create-invoice', label: 'Create Deal', detail: 'Proposal or invoice' },
  { to: '/clients', label: 'Clients', detail: 'Client records' },
  { to: '/recurring', label: 'Recurring', detail: 'Monthly revenue' }
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopMenu, setDesktopMenu] = useState('');

  const user = getUser();
  const isAdmin = user?.role === 'admin';
  const isPro = user?.plan && user.plan !== 'free';

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
    setMenuOpen(false);
    setDesktopMenu('');
  };

  const navClass = ({ isActive }) =>
    isActive
      ? 'text-white bg-white/10 border-white/15'
      : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.06]';

  const mobileNavClass = ({ isActive }) =>
    isActive
      ? 'text-white bg-white/10'
      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]';

  const groupActive = (links) =>
    links.some((link) => location.pathname === link.to || location.pathname.startsWith(`${link.to}/`));

  const groupButtonClass = (isActive) =>
    `rounded-lg border px-3 py-2 font-semibold transition-all ${
      isActive
        ? 'border-white/15 bg-white/10 text-white'
        : 'border-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white'
    }`;

  const dropdownLinkClass = ({ isActive }) =>
    `block rounded-xl border px-4 py-3 transition-all ${
      isActive
        ? 'border-yellow-300/25 bg-yellow-300/10 text-yellow-100'
        : 'border-white/5 bg-white/[0.02] text-zinc-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
    }`;

  const closeMenus = () => {
    setMenuOpen(false);
    setDesktopMenu('');
  };

  const renderDesktopGroup = (id, label, links) => {
    const isOpen = desktopMenu === id;
    const isActive = groupActive(links);

    return (
      <div key={id}>
        <button
          type="button"
          onClick={() => setDesktopMenu(isOpen ? '' : id)}
          className={groupButtonClass(isActive)}
          aria-expanded={isOpen}
        >
          <span className="inline-flex items-center gap-2">
            {label}
            <svg
              className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </span>
        </button>
      </div>
    );
  };

  const desktopPanel = desktopMenu === 'growth'
    ? { title: 'Growth Tools', links: growthLinks }
    : desktopMenu === 'billing'
      ? { title: 'Billing Tools', links: billingLinks }
      : null;

  return (
    <nav className="sticky top-0 z-50 px-3 pt-3 pb-0 sm:px-4 sm:pt-4">
      <div className="container-custom flex h-14 items-center justify-between rounded-2xl border border-white/10 bg-[#090d14]/85 px-4 backdrop-blur-2xl shadow-2xl shadow-black/35 sm:h-16 sm:px-6">
        <NavLink
          to="/"
          onClick={() => setDesktopMenu('')}
          className="group flex min-w-0 items-center gap-3"
          aria-label="ClientFlow AI home"
        >
          <BrandLogo markClassName="transition-transform duration-300 group-hover:scale-110" />
        </NavLink>

        <div className="hidden items-center gap-2 text-sm lg:flex">
          {!loggedIn && (
            <>
              <NavLink to="/" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Home
              </NavLink>
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
              <NavLink to="/" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Home
              </NavLink>
              <NavLink to="/dashboard" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Dashboard
              </NavLink>
              {renderDesktopGroup('growth', 'Growth', growthLinks)}
              {renderDesktopGroup('billing', 'Billing', billingLinks)}
              <NavLink to="/launch" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Launch
              </NavLink>
              <NavLink to="/settings" className={(state) => `rounded-lg border px-3 py-2 font-semibold ${navClass(state)}`}>
                Settings
              </NavLink>
              {!isPro && (
                <NavLink to="/payment" className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 font-semibold text-yellow-200 hover:bg-yellow-400/15">
                  Upgrade
                </NavLink>
              )}
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
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {loggedIn && desktopPanel && (
        <div className="container-custom hidden lg:block">
          <div className="mt-3 rounded-2xl border border-white/10 bg-[#090d14]/95 p-3 shadow-2xl shadow-black/35 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4">
              <p className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                {desktopPanel.title}
              </p>
              <button
                type="button"
                onClick={() => setDesktopMenu('')}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {desktopPanel.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setDesktopMenu('')}
                  className={dropdownLinkClass}
                >
                  <span className="block text-sm font-black">{link.label}</span>
                  <span className="mt-1 block text-xs font-medium text-zinc-500">{link.detail}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="animate-menu-drop mx-3 mt-3 max-h-[calc(100vh-5.75rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#090d14]/95 shadow-2xl shadow-black/35 backdrop-blur-2xl lg:hidden sm:mx-4">
          <div className="flex flex-col gap-5 px-4 py-4 text-base sm:px-6 sm:py-6">
            <div className="grid gap-2">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Main</p>
              <NavLink to="/" onClick={closeMenus} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                Home
              </NavLink>

              {!loggedIn && (
                <>
                  <a href="/#pricing" onClick={closeMenus} className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5">
                    Pricing
                  </a>
                  <a href="/#faq" onClick={closeMenus} className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5">
                    FAQ
                  </a>
                  <NavLink to="/contact" onClick={closeMenus} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                    Contact
                  </NavLink>
                </>
              )}

              {loggedIn && (
                <>
                  <NavLink to="/dashboard" onClick={closeMenus} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/launch" onClick={closeMenus} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                    Launch Center
                  </NavLink>
                </>
              )}
            </div>

            {loggedIn && (
              <>
                <div className="grid gap-2">
                  <p className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Growth</p>
                  {growthLinks.map((link) => (
                    <NavLink key={link.to} to={link.to} onClick={closeMenus} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                      {link.label}
                    </NavLink>
                  ))}
                </div>

                <div className="grid gap-2">
                  <p className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Billing</p>
                  {billingLinks.map((link) => (
                    <NavLink key={link.to} to={link.to} onClick={closeMenus} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                      {link.label}
                    </NavLink>
                  ))}
                </div>

                <div className="grid gap-2">
                  <p className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">Account</p>
                  {!isPro && (
                    <NavLink to="/payment" onClick={closeMenus} className="rounded-lg px-3 py-2 font-semibold text-yellow-300 hover:bg-yellow-400/10">
                      Upgrade Pro
                    </NavLink>
                  )}
                  <NavLink to="/settings" onClick={closeMenus} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                    Settings
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/admin" onClick={closeMenus} className="rounded-lg px-3 py-2 text-yellow-300 hover:bg-yellow-400/10">
                      Admin
                    </NavLink>
                  )}
                </div>
              </>
            )}

            {!loggedIn ? (
              <div className="grid gap-2 border-t border-white/5 pt-4">
                <NavLink to="/login" onClick={closeMenus} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Login
                </NavLink>
                <button
                  onClick={() => {
                    navigate('/signup');
                    closeMenus();
                  }}
                  className="btn btn-primary w-full"
                >
                  Start Free
                </button>
              </div>
            ) : (
              <button onClick={handleLogout} className="btn btn-dark w-full">
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
