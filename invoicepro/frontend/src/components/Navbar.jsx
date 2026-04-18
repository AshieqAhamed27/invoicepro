import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const [menuOpen, setMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  const isAdmin = user?.email === "your-email@gmail.com"; // change this

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-gray-800">

      <div className="container-custom flex justify-between items-center py-4">

        {/* LOGO */}
        <Link to="/" className="text-lg font-semibold">
          InvoicePro
        </Link>

        {/* DESKTOP */}
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">

          <Link to="/" className="hover:text-white">Home</Link>

          {loggedIn && (
            <>
              <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
              <Link to="/create-invoice" className="hover:text-white">Create</Link>
              <Link to="/settings" className="hover:text-white">Settings</Link>
            </>
          )}

          {isAdmin && (
            <Link to="/admin" className="text-yellow-400">
              Admin
            </Link>
          )}

          {!loggedIn ? (
            <>
              <Link to="/login" className="hover:text-white">Login</Link>

              <button
                onClick={() => navigate('/signup')}
                className="btn btn-primary"
              >
                Start Free
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="btn btn-dark"
            >
              Logout
            </button>
          )}

        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden"
        >
          ☰
        </button>

      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 px-4 py-4 space-y-3 text-gray-300">

          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>

          {loggedIn && (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/create-invoice" onClick={() => setMenuOpen(false)}>Create</Link>
              <Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
            </>
          )}

          {isAdmin && (
            <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>
          )}

          {!loggedIn ? (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <button
                onClick={() => navigate('/signup')}
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
      )}

    </nav>
  );
}