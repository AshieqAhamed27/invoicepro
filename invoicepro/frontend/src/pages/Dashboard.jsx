import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-IN')}`;

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const user = getUser() || {};

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

  const totalEarned = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const pending = invoices.filter(i => i.status === 'pending').length;
  const paid = invoices.filter(i => i.status === 'paid').length;

  const deleteInvoice = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;

    try {
      await api.delete(`/invoices/${id}`);
      setInvoices(prev => prev.filter(i => i._id !== id));
    } catch {
      alert("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10">
        <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-yellow-300">
              {isPro ? 'Pro workspace' : 'Free workspace'}
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Welcome, {user.name || "User"}
            </h1>
            <p className="mt-2 text-zinc-400">
              Track payments, review recent invoices, and keep cash flow moving.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {!isPro && (
              <button
                onClick={() => navigate('/payment')}
                className="btn btn-secondary w-full sm:w-auto"
              >
                Upgrade
              </button>
            )}

            <Link
              to="/create-invoice"
              className="btn btn-primary w-full text-center sm:w-auto"
            >
              New Invoice
            </Link>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <p>Total Revenue</p>
            <h2 className="mt-3 text-2xl text-emerald-300">
              {formatCurrency(totalEarned)}
            </h2>
          </div>

          <div className="card">
            <p>Pending</p>
            <h2 className="mt-3 text-2xl text-yellow-300">
              {pending}
            </h2>
          </div>

          <div className="card">
            <p>Paid</p>
            <h2 className="mt-3 text-2xl text-white">
              {paid}
            </h2>
          </div>

          <div className="card">
            <p>Total Invoices</p>
            <h2 className="mt-3 text-2xl text-white">
              {invoices.length}
            </h2>
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Invoices</h2>
              <p className="text-sm text-zinc-500">
                Your latest client bills and payment status.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p>Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <h3 className="mb-2 text-lg text-white">No invoices yet</h3>
              <p className="mx-auto mb-5 max-w-sm">
                Create your first invoice and it will appear here for quick tracking.
              </p>
              <Link to="/create-invoice" className="btn btn-primary">
                Create Invoice
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {invoices.map((inv) => (
                <div
                  key={inv._id}
                  className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-white">
                        {inv.clientName}
                      </p>
                      <span className={`badge ${inv.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                        {inv.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {inv.clientEmail}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <p className="text-lg font-semibold text-emerald-300">
                      {formatCurrency(inv.amount)}
                    </p>

                    <div className="flex gap-3">
                      <Link
                        to={`/invoice/${inv._id}`}
                        className="text-sm font-semibold text-yellow-300 hover:text-yellow-200"
                      >
                        View
                      </Link>

                      <button
                        onClick={() => deleteInvoice(inv._id)}
                        className="text-sm font-semibold text-red-300 hover:text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
