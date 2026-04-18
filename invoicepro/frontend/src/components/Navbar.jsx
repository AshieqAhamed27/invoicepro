import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gray-800">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            alt="logo"
            className="w-8 h-8"
          />
          <span className="text-lg font-semibold">
            InvoicePro
          </span>
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">

          {loggedIn && (
            <>
              <Link to="/dashboard" className="hover:text-white">
                Dashboard
              </Link>

              <Link to="/create-invoice" className="hover:text-white">
                Create
              </Link>
            </>
          )}

          <Link to="/" className="hover:text-white">
            Home
          </Link>

          {/* CTA */}
          {!loggedIn ? (
            <>
              <Link to="/login" className="hover:text-white">
                Login
              </Link>

              <button
                onClick={() => navigate('/signup')}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
              >
                Start Free
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Logout
            </button>
          )}

        </div>

        {/* MOBILE BUTTON */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden"
        >
          <div className="w-6 h-5 flex flex-col justify-between">
            <span className="block h-0.5 bg-white"></span>
            <span className="block h-0.5 bg-white"></span>
            <span className="block h-0.5 bg-white"></span>
          </div>
        </button>

      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-black border-t border-gray-800 px-4 py-6 space-y-4 text-gray-300">

          <Link to="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>

          {loggedIn && (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>

              <Link to="/create-invoice" onClick={() => setMenuOpen(false)}>
                Create Invoice
              </Link>
            </>
          )}

          {!loggedIn ? (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                Login
              </Link>

              <button
                onClick={() => {
                  navigate('/signup');
                  setMenuOpen(false);
                }}
                className="w-full bg-yellow-500 text-black py-2 rounded-lg"
              >
                Start Free
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full bg-gray-800 py-2 rounded-lg"
            >
              Logout
            </button>
          )}

        </div>
      )}

    </nav>
  );
}