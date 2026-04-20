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
      console.error('Failed to load dashboard');
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
        <section className="reveal mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{isPro ? 'Pro Member' : 'Free Plan'}</span>
            </div>
            <h1 className="text-4xl font-black sm:text-5xl tracking-tight text-white">
              Good morning, {user.name?.split(' ')[0] || "Partner"}
            </h1>
            <p className="mt-3 text-lg text-zinc-500 font-medium">
              You have <span className="text-yellow-300 font-bold">{stats.pending} pending</span> payments to collect.
            </p>
          </div>

          <div className="flex gap-3">
            {!isPro && (
              <button
                onClick={() => navigate('/payment')}
                className="btn btn-secondary px-6 py-3 rounded-xl border-white/5 bg-white/5 hover:bg-white/10"
              >
                Upgrade to Pro
              </button>
            )}

            <Link
              to="/create-invoice"
              className="btn btn-primary px-8 py-3 rounded-xl shadow-xl shadow-yellow-400/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Create New Invoice
            </Link>
          </div>
        </section>

        <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="card hover-lift flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute -right-2 -top-2 h-16 w-16 opacity-10 text-emerald-400 group-hover:scale-125 transition-transform duration-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Net Revenue</p>
            <h2 className="mt-5 text-3xl font-black text-white decoration-emerald-500/30 decoration-2 underline-offset-8">
              {formatCurrency(stats.totalRevenue).replace('₹ ', '₹')}
            </h2>
          </div>

          <div className="card hover-lift flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute -right-2 -top-2 h-16 w-16 opacity-10 text-yellow-400 group-hover:scale-125 transition-transform duration-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Pending</p>
            <h2 className="mt-5 text-3xl font-black text-yellow-400">
              {stats.pending}
            </h2>
          </div>

          <div className="card hover-lift flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute -right-2 -top-2 h-16 w-16 opacity-10 text-white group-hover:scale-125 transition-transform duration-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Paid Items</p>
            <h2 className="mt-5 text-3xl font-black text-white">
              {stats.paid}
            </h2>
          </div>

          <div className="card hover-lift flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute -right-4 -top-4 h-20 w-20 opacity-10 text-white group-hover:scale-125 transition-transform duration-500">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Total Count</p>
            <h2 className="mt-5 text-3xl font-black text-white">
              {stats.total}
            </h2>
          </div>
        </section>

        <section className="reveal reveal-delay-1 mb-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="surface p-8 border border-yellow-400/20 bg-gradient-to-br from-zinc-950 via-zinc-950 to-yellow-400/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 pointer-events-none">
              <svg className="h-60 w-60 text-yellow-300" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16.5c0 .38-.21.71-.53.88l-7.97 4.43c-.16.09-.33.14-.5.14s-.34-.05-.5-.14l-7.97-4.43c-.31-.17-.53-.51-.53-.88V7.5c0-.38.21-.71.53-.88l7.97-4.43c.16-.09.33-.14.5-.14s.34.05.5.14l7.97 4.43c.31.17.53.51.53.88v9z" /></svg>
            </div>
            
            <div className="relative mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 mb-4 transition-all hover:bg-yellow-400/15">
                  <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-[10px] uppercase tracking-widest font-black text-yellow-300">Intelligent Copilot</p>
                </div>
                <h2 className="text-3xl font-black text-white max-w-lg leading-tight tracking-tight">
                  {aiInsights ? aiInsights.summary : 'Analyzing your patterns...'}
                </h2>
              </div>

              <div className="rounded-3xl border border-yellow-300/20 bg-black/60 backdrop-blur-xl px-8 py-6 text-center shrink-0 shadow-2xl">
                <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Finance Score</p>
                <p className="text-5xl font-black text-white">
                  {aiInsights?.cashFlowScore || '--'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 relative translate-y-0 group-hover:-translate-y-1 transition-transform duration-500">
              {(aiInsights?.cards || [
                { title: 'Payment risk', value: 'Checking', tone: 'yellow' },
                { title: 'Pending amount', value: 'Checking', tone: 'yellow' },
                { title: 'Paid rate', value: 'Checking', tone: 'yellow' }
              ]).map((card) => (
                <div key={card.title} className={`rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-lg ${toneClass(card.tone)}`}>
                  <p className="text-[10px] uppercase tracking-widest font-black opacity-50 mb-3">{card.title}</p>
                  <p className="text-2xl font-black tracking-tight">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 relative">
              <p className="mb-5 text-[10px] uppercase tracking-widest font-black text-zinc-500">Strategic Recommendations</p>
              <div className="grid gap-3">
                {(aiInsights?.recommendations || ['Generating your roadmap...']).map((item, i) => (
                  <div key={i} className="group/item flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.01] px-5 py-5 transition-all duration-300 hover:bg-white/[0.03] hover:border-white/10">
                    <div className="h-2 w-2 rounded-full bg-yellow-400 mt-2 shrink-0 group-hover/item:scale-150 transition-transform" />
                    <p className="text-sm text-zinc-400 leading-relaxed group-hover/item:text-zinc-200 transition-colors">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="surface p-8 flex flex-col justify-between border-white/5 bg-zinc-950/60 relative overflow-hidden group">
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 mb-10">
                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Priority Follow-up</p>
              </div>
              
              {aiInsights?.topRisk ? (
                <>
                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-white mb-2 leading-none">
                      {aiInsights.topRisk.clientName}
                    </h3>
                    <p className="text-[10px] font-black text-yellow-300/60 uppercase tracking-widest flex items-center gap-2">
                       {aiInsights.topRisk.invoiceNumber} <span className="h-1 w-1 rounded-full bg-yellow-300/60" /> Overdue Item
                    </p>
                  </div>
                  
                  <div className="mb-10 rounded-2xl border border-white/5 bg-black/40 p-6 relative group/msg">
                    <div className="absolute -top-4 -left-2 text-4xl opacity-10 text-yellow-300 group-hover/msg:opacity-30 transition-opacity">“</div>
                    <p className="text-sm text-zinc-400 leading-relaxed italic relative z-10">
                      {aiInsights.topRisk.reminder}
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-20 px-4 text-center">
                  <div className="h-16 w-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner">
                    <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed font-medium">All invoices are healthy. We’ll draft follow-ups when risk is detected.</p>
                </div>
              )}
            </div>

            <button 
              disabled={!aiInsights?.topRisk}
              onClick={copyReminder} 
              className="btn btn-primary w-full py-5 rounded-2xl shadow-2xl shadow-yellow-400/10 hover:shadow-yellow-400/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Copy Smart Message
            </button>
          </div>
        </section>

        <section className="reveal reveal-delay-2 surface overflow-hidden border border-white/5 bg-zinc-950/40 backdrop-blur-sm shadow-2xl">
          <div className="flex flex-col gap-2 border-b border-white/5 px-8 py-6 sm:flex-row sm:items-center sm:justify-between bg-white/[0.01]">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Recent Invoices</h2>
              <p className="mt-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live Ledger
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="divide-y divide-white/5">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="grid gap-4 px-8 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="mb-3 h-4 w-48 animate-pulse rounded-full bg-white/10"></div>
                      <div className="h-3 w-64 animate-pulse rounded-full bg-white/5"></div>
                    </div>
                    <div className="h-8 w-24 animate-pulse rounded-xl bg-white/10"></div>
                  </div>
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="px-8 py-24 text-center">
                <div className="h-20 w-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/5 text-zinc-700 shadow-inner">
                   <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="mb-3 text-2xl font-black text-white tracking-tight">No activity detected</h3>
                <p className="mx-auto mb-10 max-w-sm text-zinc-500 text-base leading-relaxed">
                  Your professional dashboard is ready. Create your first invoice to start tracking revenue.
                </p>
                <Link to="/create-invoice" className="btn btn-primary px-10 py-4 rounded-2xl shadow-xl shadow-yellow-400/20">
                  Deploy First Invoice
                </Link>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.005]">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Client Profile</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Payment Status</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Invoice Total</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoices.map((inv) => (
                    <tr 
                      key={inv._id}
                      className="group/row hover:bg-white/[0.015] transition-all duration-300"
                    >
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <p className="font-black text-white group-hover/row:text-yellow-300 transition-colors text-base leading-none mb-2">
                            {inv.clientName}
                          </p>
                          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-tighter">
                            {inv.invoiceNumber} • {inv.clientEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${inv.status === 'paid' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10 group-hover/row:border-emerald-500/20' : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10 group-hover/row:border-yellow-400/20'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-400' : 'bg-yellow-500 animate-pulse'}`} />
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className="text-lg font-black text-white tracking-tight">
                          {formatCurrency(inv.amount)}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-3 opacity-40 group-hover/row:opacity-100 transition-opacity duration-300">
                          <Link
                            to={`/invoice/${inv._id}`}
                            className="p-3 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all active:scale-90"
                            title="Open Invoice"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </Link>

                          <button
                            onClick={() => deleteInvoice(inv._id)}
                            className="p-3 rounded-xl bg-red-500/5 border border-red-500/5 text-red-500/30 hover:text-red-500 hover:bg-red-300/10 hover:border-red-500/20 transition-all active:scale-90"
                            title="Delete Securely"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
