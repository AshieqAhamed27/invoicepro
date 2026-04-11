import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import Navbar from '../components/Navbar';

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">

      <Navbar />

      {/* HERO SECTION */}
      <div className="flex flex-col items-center justify-center text-center px-6 py-24">

        <img
          src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
          alt="logo"
          className="w-16 h-16 mb-6"
        />

        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
          Create Professional Invoices <br /> in Seconds
        </h1>

        <p className="text-gray-300 max-w-xl mb-6">
          Free, fast and powerful invoice generator for freelancers
          and small businesses. Get paid faster with clean invoices.
        </p>

        {loggedIn && (
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition"
          >
            Go to Dashboard →
          </button>
        )}

      </div>

      {/* FOOTER */}
      <div className="text-center text-gray-400 text-sm pb-6">
        © {new Date().getFullYear()} InvoicePro. All rights reserved.
      </div>

    </div>
  );
}