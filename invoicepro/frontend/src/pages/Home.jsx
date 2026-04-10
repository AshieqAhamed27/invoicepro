import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-gray-700">

        {/* LOGO */}
        <div className="flex items-center gap-2">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            alt="logo"
            className="w-8 h-8"
          />
          <span className="text-xl font-bold">InvoicePro</span>
        </div>

        {/* NAV LINKS */}
        <div className="flex gap-4 text-sm">

          {loggedIn && (
            <Link to="/dashboard" className="hover:text-yellow-400">
              Dashboard
            </Link>
          )}

          <Link to="/payment" className="hover:text-yellow-400">
            Payment
          </Link>

          <Link to="/admin" className="hover:text-yellow-400">
            Admin
          </Link>

          {!loggedIn && (
            <>
              <Link to="/login" className="hover:text-yellow-400">
                Login
              </Link>

              <Link
                to="/signup"
                className="bg-yellow-500 text-black px-4 py-1 rounded-lg font-semibold"
              >
                Signup
              </Link>
            </>
          )}

        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="flex flex-col items-center justify-center text-center px-6 py-20">

        <img
          src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
          alt="logo"
          className="w-16 h-16 mb-6"
        />

        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
          Create Professional Invoices <br /> in Seconds
        </h1>

        <p className="text-gray-300 max-w-xl mb-8">
          Free, fast and powerful invoice generator for freelancers
          and small businesses. Get paid faster with clean invoices.
        </p>

        <div className="flex gap-4 flex-wrap justify-center">

          <button
            onClick={() => navigate('/create-invoice')}
            className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition"
          >
            Create Invoice 🚀
          </button>

          {!loggedIn && (
            <button
              onClick={() => navigate('/login')}
              className="border border-gray-500 px-6 py-3 rounded-lg hover:bg-gray-700 transition"
            >
              Login
            </button>
          )}

        </div>

      </div>

      {/* FOOTER */}
      <div className="text-center text-gray-400 text-sm pb-6">
        © {new Date().getFullYear()} InvoicePro. All rights reserved.
      </div>

    </div>
  );
}