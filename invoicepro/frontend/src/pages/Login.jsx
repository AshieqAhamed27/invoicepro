import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuth } from '../utils/auth';
import { jwtDecode } from 'jwt-decode';
import Navbar from '../components/Navbar';
import logo from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async (response) => {
    const decoded = jwtDecode(response.credential);

    try {
      const res = await api.post('/auth/google', {
        name: decoded.name,
        email: decoded.email
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      window.location.href = '/dashboard';
    } catch (err) {
      console.log(err);
      alert('Google login failed');
    }
  };

  useEffect(() => {
    const loadGoogleScript = () => {
      return new Promise((resolve) => {
        const existingScript = document.querySelector(
          'script[src="https://accounts.google.com/gsi/client"]'
        );

        if (existingScript) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = resolve;

        document.body.appendChild(script);
      });
    };

    loadGoogleScript().then(() => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id:
            '251597134759-nfkq6fmlnvsgn8lniia3colbfer62gum.apps.googleusercontent.com',
          callback: handleGoogleLogin
        });

        const googleBtn = document.getElementById('googleBtn');
        if (googleBtn) {
          googleBtn.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtn, {
            theme: 'outline',
            size: 'large',
            width: 300
          });
        }
      } else {
        console.log('Google not loaded');
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', form);

      localStorage.clear();
      setAuth(res.data.token, res.data.user);

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Login failed. Please try again.'
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
            <div className="mb-8 flex items-center gap-3">
              <img
                src={logo}
                alt="InvoicePro logo"
                className="h-12 w-12 rounded-lg object-contain"
              />
              <span className="text-2xl font-bold">InvoicePro</span>
            </div>

            <h1 className="mb-5 text-4xl font-semibold leading-tight">
              Welcome back. Keep the cash flow moving.
            </h1>

            <p className="mb-8 text-lg text-zinc-400">
              Sign in to create invoices, track payments, and download polished records for your clients.
            </p>

            <div className="grid gap-3 text-sm text-zinc-300">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">Create invoices in seconds</div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">Track paid and pending work</div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">Download invoice PDFs instantly</div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="surface p-6 sm:p-8">
            <p className="mb-2 text-sm font-semibold text-yellow-300">Sign in</p>
            <h2 className="mb-2 text-3xl font-semibold">
              Access your account
            </h2>

            <p className="mb-6 text-zinc-400">
              Continue where your invoices left off.
            </p>

            {error && (
              <div className="mb-5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div
              id="googleBtn"
              className="mb-5 flex justify-center"
            ></div>

            <div className="mb-5 flex items-center gap-3 text-xs uppercase text-zinc-500">
              <span className="h-px flex-1 bg-white/10"></span>
              or
              <span className="h-px flex-1 bg-white/10"></span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                placeholder="Email"
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
                placeholder="Password"
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
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              Do not have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-yellow-300 hover:text-yellow-200"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
