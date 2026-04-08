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

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

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
    await api.delete(`/invoices/${id}`);
    setInvoices((prev) => prev.filter((i) => i._id !== id));
    setDeleteId(null);
  };

  const isPro = user.plan === 'pro';

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">

          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Welcome, {user.name || 'User'} 👋
            </h1>
            <p className="text-gray-500 text-sm">
              Manage your invoices easily
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">

            {!isPro && (
              <button
                onClick={() => navigate('/payment')}
                className="w-full sm:w-auto bg-yellow-500 py-2 px-4 rounded-lg font-semibold"
              >
                Upgrade ₹99 🚀
              </button>
            )}

            <Link
              to="/create-invoice"
              className="w-full sm:w-auto bg-black text-white py-2 px-4 rounded-lg text-center"
            >
              + Create Invoice
            </Link>

          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Invoices</p>
            <h2 className="text-xl font-bold">{invoices.length}</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Status</p>
            <h2 className="text-green-600 font-bold">Active</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Plan</p>
            <h2 className="font-bold">{isPro ? 'PRO 🚀' : 'FREE'}</h2>
          </div>
        </div>

        {/* LIST */}
        <div className="bg-white rounded-xl shadow">
          {loading ? (
            <p className="p-6 text-center">Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="p-6 text-center">No invoices</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv._id} className="p-4 border-b flex flex-col sm:flex-row justify-between gap-2">

                <div>
                  <p className="font-medium">{inv.clientName}</p>
                  <p className="text-sm text-gray-500">{inv.clientEmail}</p>
                </div>

                <div className="flex gap-3">
                  <Link to={`/invoice/${inv._id}`} className="text-blue-600 text-sm">
                    View
                  </Link>

                  <button onClick={() => setDeleteId(inv._id)} className="text-red-500 text-sm">
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