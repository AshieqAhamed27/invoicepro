import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuth } from '../utils/auth';
import Navbar from '../components/Navbar';

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/signup', form);

      setAuth(res.data.token, res.data.user);

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Signup failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    'w-full border border-gray-700 bg-gray-800 text-white p-3 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <div className="flex min-h-[calc(100vh-72px)]">

        {/* LEFT PANEL */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 border-r border-gray-800">

          <div>
            <div className="flex items-center gap-3 mb-10">
              <img
                src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                alt="logo"
                className="w-10 h-10"
              />
              <span className="text-2xl font-bold">
                InvoicePro
              </span>
            </div>

            <h1 className="text-4xl font-bold leading-tight mb-6">
              Start invoicing
              <br />
              like a pro.
            </h1>

            <p className="text-gray-400 text-lg mb-8 max-w-md">
              Join freelancers and small businesses who use
              InvoicePro to send professional invoices,
              track payments, and grow faster.
            </p>

            <div className="bg-gray-800/70 border border-gray-700 rounded-2xl p-6">
              <p className="text-yellow-400 font-semibold mb-3">
                Free Plan Includes:
              </p>

              <ul className="space-y-2 text-gray-300">
                <li>✔ Up to 2 invoices</li>
                <li>✔ PDF downloads</li>
                <li>✔ Client management</li>
                <li>✔ Basic payment tracking</li>
              </ul>
            </div>
          </div>

          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} InvoicePro
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl shadow-xl p-8">

            <h2 className="text-3xl font-bold mb-2">
              Create your account
            </h2>

            <p className="text-gray-400 mb-6">
              Free forever. No credit card required.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* NAME + COMPANY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value
                    })
                  }
                  className={inputStyle}
                />

                <input
                  type="text"
                  placeholder="Company Name"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      companyName: e.target.value
                    })
                  }
                  className={inputStyle}
                />

              </div>

              {/* EMAIL */}
              <input
                type="email"
                required
                placeholder="Email address"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value
                  })
                }
                className={inputStyle}
              />

              {/* PASSWORD */}
              <input
                type="password"
                required
                placeholder="Password (min 6 characters)"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value
                  })
                }
                className={inputStyle}
              />

              {/* BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-semibold transition"
              >
                {loading
                  ? 'Creating account...'
                  : 'Create Free Account'}
              </button>

            </form>

            <p className="text-center text-sm mt-6 text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-yellow-400 hover:text-yellow-300 font-medium"
              >
                Sign in
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}