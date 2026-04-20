import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

const formatCurrency = (amount) =>
  `₹ ${Number(amount || 0).toLocaleString('en-IN')}`;

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pending: 0,
    paid: 0,
    total: 0
  });
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const user = getUser() || {};
  const isPro = user.plan && user.plan !== 'free';

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [dashboardResult, aiResult] = await Promise.allSettled([
        api.get('/invoices/dashboard'),
        api.get('/ai/insights')
      ]);

      if (dashboardResult.status !== 'fulfilled') {
        throw dashboardResult.reason;
      }

      const res = dashboardResult.value;
      setInvoices(res.data.invoices || []);
      setStats({
        totalRevenue: res.data.stats?.totalRevenue || 0,
        pending: res.data.stats?.pending || 0,
        paid: res.data.stats?.paid || 0,
        total: res.data.stats?.total || 0
      });

      if (aiResult.status === 'fulfilled') {
        setAiInsights(aiResult.value.data);
      }
    } catch {
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;

    try {
      await api.delete(`/invoices/${id}`);
      fetchDashboard();
    } catch {
      alert("Delete failed");
    }
  };

  const copyReminder = async () => {
    if (!aiInsights?.topRisk?.reminder) return;

    try {
      await navigator.clipboard.writeText(aiInsights.topRisk.reminder);
      alert('Reminder copied');
    } catch {
      alert(aiInsights.topRisk.reminder);
    }
  };

  const toneClass = (tone) => {
    if (tone === 'green') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
    if (tone === 'red') return 'border-red-400/20 bg-red-500/10 text-red-200';
    return 'border-yellow-300/20 bg-yellow-300/10 text-yellow-200';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10">
        <section className="reveal mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
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
          <div className="card hover-lift">
            <p>Total Revenue</p>
            <h2 className="mt-3 text-2xl text-emerald-300">
              {formatCurrency(stats.totalRevenue)}
            </h2>
          </div>

          <div className="card hover-lift">
            <p>Pending</p>
            <h2 className="mt-3 text-2xl text-yellow-300">
              {stats.pending}
            </h2>
          </div>

          <div className="card hover-lift">
            <p>Paid</p>
            <h2 className="mt-3 text-2xl text-white">
              {stats.paid}
            </h2>
          </div>

          <div className="card hover-lift">
            <p>Total Invoices</p>
            <h2 className="mt-3 text-2xl text-white">
              {stats.total}
            </h2>
          </div>
        </section>

        <section className="reveal reveal-delay-1 mb-8 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="surface p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold text-yellow-300">AI Cashflow Copilot</p>
                <h2 className="text-xl font-semibold">
                  {aiInsights ? aiInsights.summary : 'Analyzing your invoice patterns...'}
                </h2>
              </div>

              <div className="rounded-lg border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-center">
                <p className="text-xs uppercase text-yellow-200/80">Score</p>
                <p className="text-2xl font-bold text-yellow-100">
                  {aiInsights?.cashFlowScore || '--'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(aiInsights?.cards || [
                { title: 'Payment risk', value: 'Checking', tone: 'yellow' },
                { title: 'Pending amount', value: 'Checking', tone: 'yellow' },
                { title: 'Paid rate', value: 'Checking', tone: 'yellow' }
              ]).map((card) => (
                <div key={card.title} className={`rounded-lg border p-4 ${toneClass(card.tone)}`}>
                  <p className="text-xs uppercase opacity-80">{card.title}</p>
                  <p className="mt-2 text-lg font-semibold">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-zinc-300">Recommended next moves</p>
              <div className="grid gap-2">
                {(aiInsights?.recommendations || ['AI recommendations will appear once your invoices load.']).map((item) => (
                  <p key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <p className="mb-2 text-sm font-semibold text-yellow-300">AI Reminder Draft</p>
            {aiInsights?.topRisk ? (
              <>
                <h3 className="mb-2 text-lg text-white">
                  {aiInsights.topRisk.clientName}
                </h3>
                <p className="mb-4">
                  {aiInsights.topRisk.invoiceNumber} needs attention.
                </p>
                <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-zinc-300">
                    {aiInsights.topRisk.reminder}
                  </p>
                </div>
                <button onClick={copyReminder} className="btn btn-primary w-full">
                  Copy Reminder
                </button>
              </>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p>No risky invoices right now. AI will draft reminders when payment follow-up is needed.</p>
              </div>
            )}
          </div>
        </section>

        <section className="reveal reveal-delay-1 surface overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Invoices</h2>
              <p className="text-sm text-zinc-500">
                Your latest client bills and payment status.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-white/10">
              {[0, 1, 2].map((item) => (
                <div key={item} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="mb-3 h-4 w-40 animate-pulse rounded bg-white/10"></div>
                    <div className="h-3 w-56 animate-pulse rounded bg-white/5"></div>
                  </div>
                  <div className="h-5 w-24 animate-pulse rounded bg-white/10"></div>
                </div>
              ))}
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
