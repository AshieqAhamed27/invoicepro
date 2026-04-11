import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const user = getUser() || {};

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
      setInvoices((prev) => prev.filter((i) => i._id !== id));
    } catch {
      alert('Failed to delete invoice');
    }
  };

  const isPro = user.plan === 'pro';

  const totalEarned = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0
  );

  const pendingCount = invoices.filter(
    (inv) => inv.status !== 'paid'
  ).length;

  const overdueCount = invoices.filter((inv) => {
    if (!inv.dueDate) return false;
    return (
      new Date(inv.dueDate) < new Date() &&
      inv.status !== 'paid'
    );
  }).length;

  const getStatusBadge = (inv) => {
    if (
      inv.dueDate &&
      new Date(inv.dueDate) < new Date() &&
      inv.status !== 'paid'
    ) {
      return (
        <span className="text-red-400 text-xs font-semibold">
          Overdue 🔴
        </span>
      );
    }

    if (inv.status === 'paid') {
      return (
        <span className="text-green-400 text-xs font-semibold">
          Paid 🟢
        </span>
      );
    }

    return (
      <span className="text-yellow-400 text-xs font-semibold">
        Pending 🟡
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">

          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome, {user.name || 'User'} 👋
            </h1>

            <p className="text-gray-400">
              Track invoices, earnings, and overdue payments.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap justify-center w-full md:w-auto">

            {!isPro && (
              <button
                onClick={() => navigate('/payment')}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2 rounded-lg font-semibold shadow"
              >
                Upgrade ₹99 🚀
              </button>
            )}

            <Link
              to="/create-invoice"
              className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-lg shadow font-medium"
            >
              + Create Invoice
            </Link>

          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 p-5 rounded-xl shadow">
            <p className="text-gray-400 text-sm">Invoices</p>
            <h2 className="text-2xl font-bold">{invoices.length}</h2>
          </div>

          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 p-5 rounded-xl shadow">
            <p className="text-gray-400 text-sm">Pending</p>
            <h2 className="text-2xl font-bold text-yellow-400">
              {pendingCount}
            </h2>
          </div>

          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 p-5 rounded-xl shadow">
            <p className="text-gray-400 text-sm">Overdue</p>
            <h2 className="text-2xl font-bold text-red-400">
              {overdueCount}
            </h2>
          </div>

          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 p-5 rounded-xl shadow">
            <p className="text-gray-400 text-sm">Total Earned</p>
            <h2 className="text-2xl font-bold text-green-400">
              ₹{Number(totalEarned).toLocaleString('en-IN')}
            </h2>
          </div>

        </div>

        {/* PLAN CARD */}
        <div className="mb-8 bg-gray-900/80 backdrop-blur-md border border-gray-700 p-5 rounded-xl shadow">
          <p className="text-gray-400 text-sm">Current Plan</p>
          <h2 className="text-xl font-bold mt-1">
            {isPro ? 'PRO 🚀' : 'FREE'}
          </h2>
        </div>

        {/* INVOICE LIST */}
        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-xl shadow p-4">

          <h2 className="text-lg font-semibold mb-4">
            Recent Invoices
          </h2>

          {loading ? (
            <p className="text-center py-6 text-gray-400">
              Loading...
            </p>
          ) : invoices.length === 0 ? (
            <p className="text-center py-6 text-gray-400">
              No invoices yet
            </p>
          ) : (
            <div className="flex flex-col gap-3">

              {invoices.map((inv) => (
                <div
                  key={inv._id}
                  className="flex flex-col sm:flex-row justify-between items-center border border-gray-700 bg-gray-800/50 p-4 rounded-lg hover:bg-gray-800 transition"
                >

                  {/* LEFT */}
                  <div>
                    <p className="font-semibold text-white">
                      {inv.clientName}
                    </p>

                    <p className="text-sm text-gray-400">
                      {inv.clientEmail}
                    </p>

                    <div className="mt-1">
                      {getStatusBadge(inv)}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="flex gap-4 mt-3 sm:mt-0 items-center">

                    <span className="text-green-400 font-semibold">
                      ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                    </span>

                    <Link
                      to={`/invoice/${inv._id}`}
                      className="text-blue-400 hover:underline text-sm"
                    >
                      View
                    </Link>

                    <button
                      onClick={() => handleDelete(inv._id)}
                      className="text-red-400 hover:underline text-sm"
                    >
                      Delete
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </main>
    </div>
  );
}