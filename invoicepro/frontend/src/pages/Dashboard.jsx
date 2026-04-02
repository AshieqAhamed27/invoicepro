import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

const formatCurrency = (amount, currency) => {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  const user = getUser();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.invoices);
    } catch {
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices((prev) => prev.filter((inv) => inv._id !== id));
      setDeleteId(null);
    } catch {
      alert('Delete failed');
    }
  };

  const totalRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome, {user?.name || 'User'} 👋
            </h1>
            <p className="text-gray-500 text-sm">
              Manage your invoices easily
            </p>
          </div>

          <Link
            to="/create"
            className="bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800"
          >
            + Create Invoice
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

          <div className="bg-white p-5 rounded-xl shadow hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Total Invoices</p>
            <h2 className="text-xl font-bold">{invoices.length}</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Revenue</p>
            <h2 className="text-xl font-bold">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow hover:shadow-md transition">
            <p className="text-gray-500 text-sm">Status</p>
            <h2 className="text-green-600 font-bold">Active</h2>
          </div>

        </div>

        {/* INVOICE LIST */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="px-6 py-3 border-b font-semibold">
            Invoices
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-400">
              Loading...
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No invoices yet
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv._id}
                className="flex justify-between items-center px-6 py-4 border-b hover:bg-gray-50 transition"
              >
                <div>
                  <p className="font-medium">{inv.clientName}</p>
                  <p className="text-sm text-gray-500">
                    {inv.clientEmail}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold">
                    {formatCurrency(inv.amount, inv.currency)}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[inv.status]}`}
                  >
                    {inv.status}
                  </span>
                </div>

                <div className="flex gap-4">
                  <Link
                    to={`/invoice/${inv._id}`}
                    className="text-blue-600 text-sm"
                  >
                    View
                  </Link>

                  <button
                    onClick={() => setDeleteId(inv._id)}
                    className="text-red-500 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </main>

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="mb-4">Delete this invoice?</p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-500 text-white rounded"
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