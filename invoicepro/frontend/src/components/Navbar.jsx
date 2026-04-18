import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import logo from '../assets/logo.png';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = true; // keep true for now

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setMenuOpen(false);
  };

  const navClass = ({ isActive }) =>
    isActive
      ? "text-white font-semibold"
      : "text-gray-400";

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-gray-800">

      {/* TOP BAR */}
      <div className="container-custom flex justify-between items-center py-4">

        {/* LOGO */}
        <NavLink to="/" className="flex items-center gap-2">
          <img
            src={logo}
            alt="logo"
            className="h-10 w-auto"
          />
          <span className="text-white font-semibold text-lg tracking-tight">
            InvoicePro
          </span>
        </NavLink>

        {/* DESKTOP */}
        <div className="hidden md:flex items-center gap-6 text-sm">

          <NavLink to="/" className={navClass}>Home</NavLink>

          {loggedIn && (
            <>
              <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
              <NavLink to="/create-invoice" className={navClass}>Create</NavLink>
              <NavLink to="/settings" className={navClass}>Settings</NavLink>
            </>
          )}

          {isAdmin && (
            <NavLink to="/admin" className="text-yellow-400">
              Admin
            </NavLink>
          )}

          {!loggedIn ? (
            <>
              <NavLink to="/login" className={navClass}>Login</NavLink>
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

        {/* MOBILE BUTTON */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-2xl p-2"
        >
          {menuOpen ? "✕" : "☰"}
        </button>

      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-black border-t border-gray-800">

          <div className="flex flex-col px-6 py-6 space-y-4 text-base">

            <NavLink to="/" onClick={() => setMenuOpen(false)} className={navClass}>
              Home
            </NavLink>

            {loggedIn && (
              <>
                <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className={navClass}>
                  Dashboard
                </NavLink>

                <NavLink to="/create-invoice" onClick={() => setMenuOpen(false)} className={navClass}>
                  Create Invoice
                </NavLink>

                <NavLink to="/settings" onClick={() => setMenuOpen(false)} className={navClass}>
                  Settings
                </NavLink>
              </>
            )}

            {isAdmin && (
              <NavLink to="/admin" onClick={() => setMenuOpen(false)} className="text-yellow-400">
                Admin
              </NavLink>
            )}

            {!loggedIn ? (
              <>
                <NavLink to="/login" onClick={() => setMenuOpen(false)} className={navClass}>
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