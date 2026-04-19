import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import logo from '../assets/logo.png';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.email === "ashieqahamed27@gmail.com";

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setMenuOpen(false);
  };

  const navClass = ({ isActive }) =>
    isActive
      ? "text-white bg-white/10 border-white/10"
      : "text-zinc-400 border-transparent hover:text-white hover:bg-white/5";

  const mobileNavClass = ({ isActive }) =>
    isActive
      ? "text-white bg-white/10"
      : "text-zinc-400 hover:text-white hover:bg-white/5";

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="container-custom flex items-center justify-between py-3">
        <NavLink to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="InvoicePro logo"
            className="h-10 w-10 rounded-lg object-contain"
          />
          <span className="text-lg font-semibold text-white">
            InvoicePro
          </span>
        </NavLink>

        <div className="hidden items-center gap-2 text-sm md:flex">
          <NavLink to="/" className={(state) => `rounded-lg border px-3 py-2 ${navClass(state)}`}>
            Home
          </NavLink>

          {loggedIn && (
            <>
              <NavLink to="/dashboard" className={(state) => `rounded-lg border px-3 py-2 ${navClass(state)}`}>
                Dashboard
              </NavLink>
              <NavLink to="/create-invoice" className={(state) => `rounded-lg border px-3 py-2 ${navClass(state)}`}>
                Create
              </NavLink>
              <NavLink to="/settings" className={(state) => `rounded-lg border px-3 py-2 ${navClass(state)}`}>
                Settings
              </NavLink>
            </>
          )}

          {isAdmin && (
            <NavLink to="/admin" className="rounded-lg px-3 py-2 text-yellow-300 hover:bg-yellow-400/10">
              Admin
            </NavLink>
          )}

          {!loggedIn ? (
            <>
              <NavLink to="/login" className={(state) => `rounded-lg border px-3 py-2 ${navClass(state)}`}>
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
          className="btn btn-secondary px-3 py-2 md:hidden"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-black/95 md:hidden">
          <div className="flex flex-col space-y-3 px-6 py-6 text-base">
            <NavLink to="/" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
              Home
            </NavLink>

            {loggedIn && (
              <>
                <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Dashboard
                </NavLink>
                <NavLink to="/create-invoice" onClick={() => setMenuOpen(false)} className={(state) => `rounded-lg px-3 py-2 ${mobileNavClass(state)}`}>
                  Create Invoice
                </NavLink>
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
