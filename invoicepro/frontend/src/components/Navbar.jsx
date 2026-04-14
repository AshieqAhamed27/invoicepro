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

  const [menuOpen, setMenuOpen] =
    useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setMenuOpen(false);
  };

  const linkClass = (path) =>
    location.pathname === path
      ? 'text-yellow-400 font-semibold'
      : 'hover:text-yellow-400 transition';

  const closeMenu = () =>
    setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-black/70 backdrop-blur-md border-b border-gray-700 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">

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
              className="w-8 h-8"
            />

            <span className="text-xl font-bold">
              InvoicePro
            </span>
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden md:flex gap-4 items-center text-sm flex-wrap">

            <Link
              to="/"
              className={linkClass('/')}
            >
              Home
            </Link>

            {loggedIn && (
              <>
                <Link
                  to="/dashboard"
                  className={linkClass(
                    '/dashboard'
                  )}
                >
                  Dashboard
                </Link>

                <Link
                  to="/create-invoice"
                  className={linkClass(
                    '/create-invoice'
                  )}
                >
                  Create
                </Link>

                <Link
                  to="/settings"
                  className={linkClass(
                    '/settings'
                  )}
                >
                  Settings
                </Link>
              </>
            )}

            <Link
              to="/payment"
              className={linkClass(
                '/payment'
              )}
            >
              Payment
            </Link>

            <Link
              to="/admin"
              className={linkClass(
                '/admin'
              )}
            >
              Admin
            </Link>

            {!loggedIn ? (
              <>
                <Link
                  to="/login"
                  className={linkClass(
                    '/login'
                  )}
                >
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
                onClick={
                  handleLogout
                }
                className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded-lg text-white transition"
              >
                Logout
              </button>
            )}

          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            className="md:hidden text-2xl"
            onClick={() =>
              setMenuOpen(
                !menuOpen
              )
            }
          >
            {menuOpen
              ? '✕'
              : '☰'}
          </button>

        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="md:hidden mt-4 flex flex-col gap-4 text-sm bg-gray-900/90 backdrop-blur-md p-4 rounded-xl border border-gray-700">

            <Link
              to="/"
              onClick={
                closeMenu
              }
              className={linkClass(
                '/'
              )}
            >
              Home
            </Link>

            {loggedIn && (
              <>
                <Link
                  to="/dashboard"
                  onClick={
                    closeMenu
                  }
                  className={linkClass(
                    '/dashboard'
                  )}
                >
                  Dashboard
                </Link>

                <Link
                  to="/create-invoice"
                  onClick={
                    closeMenu
                  }
                  className={linkClass(
                    '/create-invoice'
                  )}
                >
                  Create
                </Link>

                <Link
                  to="/settings"
                  onClick={
                    closeMenu
                  }
                  className={linkClass(
                    '/settings'
                  )}
                >
                  Settings
                </Link>
              </>
            )}

            <Link
              to="/payment"
              onClick={
                closeMenu
              }
              className={linkClass(
                '/payment'
              )}
            >
              Payment
            </Link>

            <Link
              to="/admin"
              onClick={
                closeMenu
              }
              className={linkClass(
                '/admin'
              )}
            >
              Admin
            </Link>

            {!loggedIn ? (
              <>
                <Link
                  to="/login"
                  onClick={
                    closeMenu
                  }
                  className={linkClass(
                    '/login'
                  )}
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  onClick={
                    closeMenu
                  }
                  className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold text-center hover:bg-yellow-400"
                >
                  Signup
                </Link>
              </>
            ) : (
              <button
                onClick={
                  handleLogout
                }
                className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded-lg text-white"
              >
                Logout
              </button>
            )}

          </div>
        )}

      </div>
    </nav>
  );
}