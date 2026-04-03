import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getUser, clearAuth } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">

      {/* LOGO */}
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-black text-white flex items-center justify-center rounded-md font-bold text-sm">
          IP
        </div>
        <span className="font-bold text-lg text-gray-800">
          InvoicePro
        </span>

        {user?.plan === 'pro' && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
            PRO
          </span>
        )}
      </Link>

      {/* DESKTOP */}
      <div className="hidden md:flex items-center gap-6">

        <span className="text-gray-500 text-sm">
          {user?.name}
        </span>

        <Link
          to="/create-invoice"  // ✅ FIXED
          className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition"
        >
          + New Invoice
        </Link>

        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-black text-sm transition"
        >
          Logout
        </button>

      </div>

      {/* MOBILE BUTTON */}
      <button
        className="md:hidden"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {menuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-t px-6 py-4 flex flex-col gap-4 md:hidden shadow">

          <span className="text-gray-500 text-sm">
            {user?.name}
          </span>

          <Link
            to="/create-invoice"  // ✅ FIXED
            onClick={() => setMenuOpen(false)}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm text-center"
          >
            + New Invoice
          </Link>

          <button
            onClick={handleLogout}
            className="text-gray-500 text-left text-sm"
          >
            Logout
          </button>

        </div>
      )}
    </nav>
  );
}