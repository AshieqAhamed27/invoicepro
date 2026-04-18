import React, { useState } from 'react';
import {
  Link,
  useNavigate,
  useLocation
} from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = isLoggedIn();

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setMenuOpen(false);
  };

  const linkClass = (path) =>
    location.pathname === path
      ? 'text-yellow-400 font-semibold'
      : 'text-gray-300 hover:text-yellow-400 transition';

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-black/70 backdrop-blur-md border-b border-gray-800 text-white">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">

        {/* TOP BAR */}
        <div className="flex justify-between items-center">

          {/* LOGO */}
          <Link
            to="/"
            onClick={closeMenu}
            className="flex items-center gap-2"
          >
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="logo"
              className="w-7 h-7 sm:w-8 sm:h-8"
            />
            <span className="text-lg sm:text-xl font-bold">
              InvoicePro
            </span>
          </Link>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex gap-5 items-center text-sm">

            <Link to="/" className={linkClass('/')}>
              Home
            </Link>

            {loggedIn && (
              <>
                <Link to="/dashboard" className={linkClass('/dashboard')}>
                  Dashboard
                </Link>

                <Link to="/create-invoice" className={linkClass('/create-invoice')}>
                  Create
                </Link>

                <Link to="/settings" className={linkClass('/settings')}>
                  Settings
                </Link>
              </>
            )}

            <Link to="/payment" className={linkClass('/payment')}>
              Payment
            </Link>

            <Link to="/admin" className={linkClass('/admin')}>
              Admin
            </Link>

            {!loggedIn ? (
              <>
                <Link to="/login" className={linkClass('/login')}>
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition"
                >
                  Signup
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded-lg text-white transition"
              >
                Logout
              </button>
            )}
          </div>

          {/* MOBILE BUTTON */}
          <button
            className="md:hidden flex flex-col gap-1"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className={`block w-6 h-0.5 bg-white transition ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-white transition ${menuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-white transition ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>

        </div>

      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden bg-black/95 border-t border-gray-800 px-4 py-5 space-y-4">

          <Link to="/" onClick={closeMenu} className={linkClass('/')}>
            Home
          </Link>

          {loggedIn && (
            <>
              <Link to="/dashboard" onClick={closeMenu} className={linkClass('/dashboard')}>
                Dashboard
              </Link>

              <Link to="/create-invoice" onClick={closeMenu} className={linkClass('/create-invoice')}>
                Create Invoice
              </Link>

              <Link to="/settings" onClick={closeMenu} className={linkClass('/settings')}>
                Settings
              </Link>
            </>
          )}

          <Link to="/payment" onClick={closeMenu} className={linkClass('/payment')}>
            Payment
          </Link>

          <Link to="/admin" onClick={closeMenu} className={linkClass('/admin')}>
            Admin
          </Link>

          {!loggedIn ? (
            <>
              <Link
                to="/login"
                onClick={closeMenu}
                className="block text-center border border-gray-600 py-2 rounded-lg"
              >
                Login
              </Link>

              <Link
                to="/signup"
                onClick={closeMenu}
                className="block text-center bg-yellow-500 text-black py-2 rounded-lg font-semibold"
              >
                Signup
              </Link>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 hover:bg-red-400 py-2 rounded-lg text-white"
            >
              Logout
            </button>
          )}

        </div>
      )}

    </nav>
  );
}