import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser, clearAuth } from '../utils/auth';
import Navbar from '../components/Navbar';

const STATUS_COLORS = {
  draft: 'bg-ink-100 text-ink-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

const formatCurrency = (amount, currency) => {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const user = getUser();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.invoices);
      if (user?.plan === 'free' && res.data.count >= 2) setShowUpgrade(true);
    } catch {
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(prev => prev.filter(inv => inv._id !== id));
      setDeleteId(null);
      if (invoices.length - 1 < 2) setShowUpgrade(false);
    } catch {
      setError('Failed to delete invoice.');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await api.put(`/invoices/${id}/status`, { status });
      setInvoices(prev => prev.map(inv => inv._id === id ? res.data.invoice : inv));
    } catch {
      setError('Failed to update status.');
    }
  };

  const handleUpgrade = async () => {
    try {
      await api.put('/auth/upgrade');
      const updatedUser = { ...user, plan: 'pro' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setShowUpgrade(false);
      alert('🎉 Upgraded to Pro! You can now create unlimited invoices.');
      window.location.reload();
    } catch {
      setError('Upgrade failed. Try again.');
    }
  };

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingCount = invoices.filter(i => i.status !== 'paid').length;

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink-900">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              <span className="italic">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-ink-500 mt-1">Here's your invoicing overview.</p>
          </div>
          <Link
            to="/create-invoice"
            className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Invoices', value: invoices.length, icon: '📄' },
            { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, icon: '✅' },
            { label: 'Pending', value: pendingCount, icon: '⏳' },
            { label: 'Revenue Collected', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: '💰' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-ink-100 shadow-sm fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-ink-900 font-mono">{stat.value}</div>
              <div className="text-xs text-ink-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Upgrade Banner */}
        {showUpgrade && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 fade-in">
            <div>
              <p className="font-semibold text-ink-900">🔒 Free plan limit reached (2/2 invoices)</p>
              <p className="text-sm text-ink-600 mt-0.5">Upgrade to Pro for unlimited invoices, priority support & more.</p>
            </div>
            <button
              onClick={handleUpgrade}
              className="bg-amber-500 hover:bg-amber-600 text-ink-900 font-bold px-6 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              Upgrade to Pro — ₹99/mo
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        {/* Invoice List */}
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
            <h2 className="font-semibold text-ink-800">All Invoices</h2>
            <span className="text-xs text-ink-400 font-mono bg-ink-50 px-2 py-1 rounded">{invoices.length} total</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-ink-400">
              <div className="w-8 h-8 border-2 border-ink-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3"></div>
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center fade-in">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-ink-600 font-medium mb-2">No invoices yet</p>
              <p className="text-ink-400 text-sm mb-6">Create your first invoice to get started.</p>
              <Link to="/create-invoice" className="bg-ink-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-ink-700 transition-colors">
                Create Invoice
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-ink-50 text-left">
                    <tr>
                      {['Invoice #', 'Client', 'Date', 'Amount', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {invoices.map((inv, i) => (
                      <tr key={inv._id} className="hover:bg-ink-50/50 transition-colors fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-ink-700">{inv.invoiceNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-ink-900 text-sm">{inv.clientName}</div>
                          <div className="text-xs text-ink-400">{inv.clientEmail}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-600">{formatDate(inv.date)}</td>
                        <td className="px-6 py-4 font-mono font-semibold text-ink-900 text-sm">
                          {formatCurrency(inv.amount, inv.currency)}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={inv.status}
                            onChange={e => handleStatusChange(inv._id, e.target.value)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[inv.status]}`}
                          >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link to={`/invoice/${inv._id}`} className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                              View
                            </Link>
                            <button
                              onClick={() => setDeleteId(inv._id)}
                              className="text-red-400 hover:text-red-600 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-ink-50">
                {invoices.map(inv => (
                  <div key={inv._id} className="p-4 fade-in">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-xs text-ink-500">{inv.invoiceNumber}</span>
                        <p className="font-semibold text-ink-900">{inv.clientName}</p>
                      </div>
                      <span className="font-mono font-bold text-ink-900">{formatCurrency(inv.amount, inv.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[inv.status]}`}>
                        {inv.status}
                      </span>
                      <div className="flex gap-4">
                        <Link to={`/invoice/${inv._id}`} className="text-amber-600 text-sm font-medium">View</Link>
                        <button onClick={() => setDeleteId(inv._id)} className="text-red-400 text-sm">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Plan info */}
        {user?.plan === 'free' && !showUpgrade && (
          <div className="mt-6 flex items-center justify-between bg-white rounded-xl border border-ink-100 p-4 px-6">
            <div>
              <p className="text-sm font-medium text-ink-700">Free Plan — {invoices.length}/2 invoices used</p>
              <div className="w-48 h-1.5 bg-ink-100 rounded-full mt-2">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${(invoices.length / 2) * 100}%` }}
                />
              </div>
            </div>
            <button onClick={handleUpgrade} className="text-sm text-amber-600 font-semibold hover:text-amber-700">
              Upgrade → ₹99/mo
            </button>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl fade-in">
            <h3 className="font-display font-bold text-xl text-ink-900 mb-2">Delete Invoice?</h3>
            <p className="text-ink-500 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-ink-200 text-ink-700 py-2.5 rounded-lg font-medium text-sm hover:bg-ink-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
