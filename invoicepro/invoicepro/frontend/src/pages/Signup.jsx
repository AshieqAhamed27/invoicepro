import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuth } from '../utils/auth';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', form);
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
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
          <h2 className="text-white text-3xl font-display font-bold mb-4">Start invoicing<br /><em>like a pro.</em></h2>
          <p className="text-ink-400 text-sm leading-relaxed mb-8">
            Join thousands of freelancers who use InvoicePro to send professional invoices, track payments, and grow their business.
          </p>
          <div className="bg-ink-800 rounded-xl p-6 border border-ink-700">
            <p className="text-amber-400 font-semibold text-sm mb-1">Free Plan includes:</p>
            <ul className="text-ink-300 text-sm space-y-1">
              <li>• Up to 2 invoices</li>
              <li>• PDF download</li>
              <li>• Client management</li>
            </ul>
          </div>
        </div>
        <p className="text-ink-600 text-sm">© 2024 InvoicePro</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center font-mono font-bold text-ink-900 text-sm">IP</div>
            <span className="font-display font-bold text-xl">InvoicePro</span>
          </div>

          <h1 className="text-3xl font-display font-bold text-ink-900 mb-2">Create your account</h1>
          <p className="text-ink-500 mb-8">Free forever. No credit card required.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm slide-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-ink-200 rounded-lg px-4 py-3 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  placeholder="Arjun Sharma"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => setForm({ ...form, companyName: e.target.value })}
                  className="w-full border border-ink-200 rounded-lg px-4 py-3 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  placeholder="Freelance Studio"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">Email address *</label>
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
              <label className="block text-sm font-medium text-ink-700 mb-2">Password *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-ink-200 rounded-lg px-4 py-3 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                placeholder="Min. 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink-900 hover:bg-ink-700 disabled:bg-ink-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>

          <p className="text-center text-ink-500 mt-6 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-amber-600 font-semibold hover:text-amber-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
