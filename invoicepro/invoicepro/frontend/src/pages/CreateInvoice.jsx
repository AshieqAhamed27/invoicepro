import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

const today = new Date().toISOString().split('T')[0];

export default function CreateInvoice() {
  const navigate = useNavigate();
  const user = getUser();
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    serviceDescription: '',
    amount: '',
    currency: 'INR',
    date: today,
    dueDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLimitReached(false);
    setLoading(true);
    try {
      const res = await api.post('/invoices', form);
      navigate(`/invoice/${res.data.invoice._id}`);
    } catch (err) {
      if (err.response?.data?.limitReached) {
        setLimitReached(true);
      } else {
        setError(err.response?.data?.message || 'Failed to create invoice.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      await api.put('/auth/upgrade');
      const updatedUser = { ...user, plan: 'pro' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setLimitReached(false);
      alert('🎉 Upgraded to Pro! You can now create unlimited invoices.');
      window.location.reload();
    } catch {
      setError('Upgrade failed. Try again.');
    }
  };

  const previewAmount = form.amount
    ? `${form.currency === 'INR' ? '₹' : '$'}${Number(form.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '—';

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-ink-400 mb-6">
          <Link to="/dashboard" className="hover:text-ink-700 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-ink-700 font-medium">New Invoice</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold text-ink-900">Create Invoice</h1>
          <div className="text-xs text-ink-400 bg-white border border-ink-100 px-3 py-1.5 rounded-full font-mono">
            {user?.plan === 'pro' ? '✨ Pro Plan' : '🔒 Free Plan'}
          </div>
        </div>

        {/* Limit Reached Banner */}
        {limitReached && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-8 fade-in">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🔒</div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-xl text-ink-900 mb-1">Free Plan Limit Reached</h3>
                <p className="text-ink-600 text-sm mb-4">
                  You've used all 2 free invoices. Upgrade to Pro to create unlimited invoices, access all features, and grow your freelance business.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleUpgrade}
                    className="bg-amber-500 hover:bg-amber-600 text-ink-900 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                  >
                    ✨ Upgrade to Pro — ₹99/month
                  </button>
                  <Link to="/dashboard" className="text-sm text-ink-500 hover:text-ink-700 flex items-center justify-center">
                    Back to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-ink-100 shadow-sm p-6 space-y-6">
              {/* Client Info */}
              <div>
                <h2 className="font-semibold text-ink-800 mb-4 pb-2 border-b border-ink-50">Client Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">Client Name *</label>
                    <input
                      name="clientName"
                      required
                      value={form.clientName}
                      onChange={handleChange}
                      className="w-full border border-ink-200 rounded-lg px-4 py-2.5 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">Client Email *</label>
                    <input
                      name="clientEmail"
                      type="email"
                      required
                      value={form.clientEmail}
                      onChange={handleChange}
                      className="w-full border border-ink-200 rounded-lg px-4 py-2.5 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all"
                      placeholder="client@acme.com"
                    />
                  </div>
                </div>
              </div>

              {/* Service */}
              <div>
                <h2 className="font-semibold text-ink-800 mb-4 pb-2 border-b border-ink-50">Service Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">Service Description *</label>
                    <textarea
                      name="serviceDescription"
                      required
                      value={form.serviceDescription}
                      onChange={handleChange}
                      rows={3}
                      className="w-full border border-ink-200 rounded-lg px-4 py-2.5 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all resize-none"
                      placeholder="Web development, UI/UX design, consulting..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1.5">Amount *</label>
                      <input
                        name="amount"
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={handleChange}
                        className="w-full border border-ink-200 rounded-lg px-4 py-2.5 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all"
                        placeholder="5000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-700 mb-1.5">Currency</label>
                      <select
                        name="currency"
                        value={form.currency}
                        onChange={handleChange}
                        className="w-full border border-ink-200 rounded-lg px-4 py-2.5 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h2 className="font-semibold text-ink-800 mb-4 pb-2 border-b border-ink-50">Dates</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">Invoice Date *</label>
                    <input
                      name="date"
                      type="date"
                      required
                      value={form.date}
                      onChange={handleChange}
                      className="w-full border border-ink-200 rounded-lg px-4 py-2.5 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1.5">Due Date</label>
                    <input
                      name="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={handleChange}
                      className="w-full border border-ink-200 rounded-lg px-4 py-2.5 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Notes (Optional)</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-ink-200 rounded-lg px-4 py-2.5 text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm transition-all resize-none"
                  placeholder="Payment terms, bank details, thank you message..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Link
                  to="/dashboard"
                  className="flex-1 text-center border border-ink-200 text-ink-700 py-3 rounded-xl font-medium text-sm hover:bg-ink-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || limitReached}
                  className="flex-1 bg-ink-900 hover:bg-ink-700 disabled:bg-ink-300 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Invoice →'}
                </button>
              </div>
            </form>
          </div>

          {/* Preview card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 sticky top-24">
              <h3 className="font-semibold text-ink-700 text-sm mb-4">Live Preview</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-400">Client</span>
                  <span className="font-medium text-ink-800 text-right max-w-32 truncate">{form.clientName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-400">Email</span>
                  <span className="font-medium text-ink-800 text-right max-w-32 truncate text-xs">{form.clientEmail || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-400">Date</span>
                  <span className="font-medium text-ink-800">{form.date || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-400">Due</span>
                  <span className="font-medium text-ink-800">{form.dueDate || 'Not set'}</span>
                </div>
                <div className="border-t border-ink-100 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-600 font-medium">Total Amount</span>
                    <span className="font-mono font-bold text-xl text-ink-900">{previewAmount}</span>
                  </div>
                </div>
                {form.serviceDescription && (
                  <div className="bg-ink-50 rounded-lg p-3 mt-2">
                    <p className="text-xs text-ink-500 italic leading-relaxed">{form.serviceDescription}</p>
                  </div>
                )}
              </div>

              {/* Pricing box */}
              {user?.plan === 'free' && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-800 mb-1">🚀 Pro Plan</p>
                  <p className="text-xs text-amber-700 mb-3">Unlimited invoices, all currencies, priority support.</p>
                  <button onClick={handleUpgrade} className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-ink-900 font-bold py-2 rounded-lg transition-colors">
                    Upgrade — ₹99/month
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
