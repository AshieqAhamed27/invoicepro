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
    <nav className="bg-ink-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center font-mono font-bold text-ink-900 text-sm">IP</div>
        <span className="font-display font-bold text-lg tracking-tight">InvoicePro</span>
        {user?.plan === 'pro' && (
          <span className="text-xs bg-amber-500 text-ink-900 px-2 py-0.5 rounded-full font-semibold">PRO</span>
        )}
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
        <span className="text-ink-300 text-sm">{user?.name}</span>
        <Link
          to="/create-invoice"
          className="bg-amber-500 hover:bg-amber-600 text-ink-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + New Invoice
        </Link>
        <button
          onClick={handleLogout}
          className="text-ink-300 hover:text-white text-sm transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Mobile menu */}
      <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {menuOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          }
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-ink-800 px-6 py-4 flex flex-col gap-4 md:hidden shadow-xl">
          <span className="text-ink-300 text-sm">{user?.name}</span>
          <Link
            to="/create-invoice"
            className="bg-amber-500 text-ink-900 font-semibold px-4 py-2 rounded-lg text-sm text-center"
            onClick={() => setMenuOpen(false)}
          >
            + New Invoice
          </Link>
          <button onClick={handleLogout} className="text-ink-300 text-sm text-left">Logout</button>
        </div>
      )}
    </nav>
  );
}
