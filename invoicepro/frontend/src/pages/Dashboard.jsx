import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const navigate = useNavigate();
  const user = getUser() || {};

  // ✅ NEW PLAN LOGIC
  const plan = localStorage.getItem("userPlan");
  const isPro = plan === "monthly" || plan === "yearly";

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.invoices || []);
    } catch {
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices((prev) =>
        prev.filter((i) => i._id !== id)
      );
    } catch {
      alert('Failed to delete invoice');
    }
  };

  const totalEarned = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  const pendingCount = invoices.filter(
    (inv) => inv.status !== 'paid'
  ).length;

  const overdueCount = invoices.filter((inv) => {
    if (!inv.dueDate) return false;
    return new Date(inv.dueDate) < new Date() && inv.status !== 'paid';
  }).length;

  const getStatusBadge = (inv) => {
    const isOverdue =
      inv.dueDate &&
      new Date(inv.dueDate) < new Date() &&
      inv.status !== 'paid';

    if (isOverdue)
      return <span className="text-red-400 text-xs">Overdue 🔴</span>;

    if (inv.status === 'paid')
      return <span className="text-green-400 text-xs">Paid 🟢</span>;

    return <span className="text-yellow-400 text-xs">Pending 🟡</span>;
  };

  const filteredInvoices = invoices.filter((inv) => {
    const term = search.toLowerCase();

    const matchesSearch =
      inv.clientName?.toLowerCase().includes(term) ||
      inv.clientEmail?.toLowerCase().includes(term);

    const isOverdue =
      inv.dueDate &&
      new Date(inv.dueDate) < new Date() &&
      inv.status !== 'paid';

    let matchesFilter = true;

    if (filter === 'paid') matchesFilter = inv.status === 'paid';
    else if (filter === 'pending') matchesFilter = inv.status !== 'paid';
    else if (filter === 'overdue') matchesFilter = isOverdue;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">
            Welcome, {user.name || 'User'} 👋
          </h1>

          <div className="flex flex-col sm:flex-row gap-3">

            {!isPro && (
              <button
                onClick={() => navigate('/payment')}
                className="w-full sm:w-auto bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
              >
                Upgrade to Pro 🚀
              </button>
            )}

            <Link
              to="/create-invoice"
              className="w-full sm:w-auto bg-white text-black px-4 py-2 rounded-lg text-center"
            >
              + Create Invoice
            </Link>

          </div>
        </div>

        {/* FREE LIMIT WARNING */}
        {!isPro && invoices.length >= 2 && (
          <div className="bg-red-500/20 border border-red-500 p-4 rounded-xl mb-6 text-sm">
            <p className="text-red-300 mb-2">
              Free plan limit reached (2 invoices)
            </p>
            <button
              onClick={() => navigate('/payment')}
              className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold"
            >
              Upgrade Now
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 p-4 rounded-xl">
            <p className="text-xs text-gray-400">Invoices</p>
            <h2 className="text-xl font-bold">{invoices.length}</h2>
          </div>

          <div className="bg-gray-900 p-4 rounded-xl">
            <p className="text-xs text-gray-400">Pending</p>
            <h2 className="text-xl text-yellow-400">{pendingCount}</h2>
          </div>

          <div className="bg-gray-900 p-4 rounded-xl">
            <p className="text-xs text-gray-400">Overdue</p>
            <h2 className="text-xl text-red-400">{overdueCount}</h2>
          </div>

          <div className="bg-gray-900 p-4 rounded-xl">
            <p className="text-xs text-gray-400">Revenue</p>
            <h2 className="text-xl text-green-400">
              ₹{Number(totalEarned).toLocaleString('en-IN')}
            </h2>
          </div>
        </div>

        {/* SEARCH */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-gray-900 p-3 rounded-xl"
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-900 p-3 rounded-xl"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* INVOICES */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-gray-400">Loading...</p>
          ) : filteredInvoices.length === 0 ? (
            <p className="text-center text-gray-400">No invoices</p>
          ) : (
            filteredInvoices.map((inv) => (
              <div
                key={inv._id}
                className="bg-gray-900 p-4 rounded-xl border border-gray-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{inv.clientName}</p>
                    <p className="text-xs text-gray-400">{inv.clientEmail}</p>
                    {getStatusBadge(inv)}
                  </div>

                  <p className="text-green-400 font-semibold">
                    ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="flex gap-4 mt-3 text-sm">
                  <Link to={`/invoice/${inv._id}`} className="text-blue-400">
                    View
                  </Link>

                  <button
                    onClick={() => handleDelete(inv._id)}
                    className="text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
}