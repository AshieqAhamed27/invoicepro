import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-black/70 backdrop-blur-md border-b border-gray-700 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            alt="logo"
            className="w-8 h-8"
          />
          <span className="text-xl font-bold">
            InvoicePro
          </span>
        </Link>

        {/* LINKS */}
        <div className="flex gap-4 items-center text-sm">

          <Link to="/" className="hover:text-yellow-400">
            Home
          </Link>

          {loggedIn ? (
            <>
              <Link to="/dashboard" className="hover:text-yellow-400">
                Dashboard
              </Link>

              <Link to="/create-invoice" className="hover:text-yellow-400">
                Create
              </Link>

              <Link to="/payment" className="hover:text-yellow-400">
                Payment
              </Link>

              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded-lg text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-yellow-400">
                Login
              </Link>

              <Link
                to="/signup"
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-400"
              >
                Signup
              </Link>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}