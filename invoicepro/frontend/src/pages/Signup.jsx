import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuth } from '../utils/auth';
import Navbar from '../components/Navbar';
import BrandLogo from '../components/BrandLogo';

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

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom grid min-h-[calc(100vh-76px)] items-center gap-10 py-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden lg:block">
          <div className="max-w-lg">
            <div className="mb-8">
              <BrandLogo markClassName="h-12 w-12" />
            </div>

            <h1 className="mb-5 text-4xl font-semibold leading-tight">
              Start billing clients with less back-office noise.
            </h1>

            <p className="mb-8 text-lg text-zinc-400">
              Create an account, save your business details, and send your first invoice in minutes.
            </p>

            <div className="surface p-5">
              <p className="mb-4 text-sm font-semibold text-yellow-300">
                Free plan includes
              </p>

              <ul className="space-y-3 text-sm text-zinc-300">
                <li>Up to 2 invoices</li>
                <li>PDF downloads</li>
                <li>Client details and tax fields</li>
                <li>Basic payment tracking</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="reveal mx-auto w-full max-w-md">
          <div className="surface p-6 sm:p-8">
            <p className="mb-2 text-sm font-semibold text-yellow-300">Get started</p>
            <h2 className="mb-2 text-3xl font-semibold">
              Create your account
            </h2>

            <p className="mb-6 text-zinc-400">
              Free forever. No credit card required.
            </p>

            {error && (
              <div className="mb-5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value
                    })
                  }
                  className="input"
                />

                <input
                  type="text"
                  placeholder="Company name"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      companyName: e.target.value
                    })
                  }
                  className="input"
                />
              </div>

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
                className="input"
              />

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
                className="input"
              />

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? 'Creating account...' : 'Create Free Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-yellow-300 hover:text-yellow-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
