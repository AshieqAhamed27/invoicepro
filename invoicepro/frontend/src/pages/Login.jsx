import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuth } from '../utils/auth';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-ink-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-sm flex items-center justify-center font-mono font-bold text-ink-900">IP</div>
          <span className="font-display font-bold text-2xl text-white">InvoicePro</span>
        </div>
        <div>
          <blockquote className="text-ink-200 text-2xl font-display italic leading-relaxed mb-6">
            "Professional invoices that get you paid faster."
          </blockquote>
          <div className="flex flex-col gap-4">
            {['Create beautiful invoices in seconds', 'Track payments & client info', 'Download as PDF instantly'].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-ink-300">
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-ink-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-ink-600 text-sm">© 2024 InvoicePro. For freelancers, by freelancers.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center font-mono font-bold text-ink-900 text-sm">IP</div>
            <span className="font-display font-bold text-xl">InvoicePro</span>
          </div>

          <h1 className="text-3xl font-display font-bold text-ink-900 mb-2">Welcome back</h1>
          <p className="text-ink-500 mb-8">Sign in to your account to continue.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm slide-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-ink-200 rounded-lg px-4 py-3 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-ink-200 rounded-lg px-4 py-3 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink-900 hover:bg-ink-700 disabled:bg-ink-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-ink-500 mt-6 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-amber-600 font-semibold hover:text-amber-700">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
