import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';
import { useMemo } from 'react';

const formatCurrency = (amount) =>
  `₹ ${Number(amount || 0).toLocaleString('en-IN')}`;

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pending: 0,
    paid: 0,
    total: 0,
    trends: []
  });
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminderId, setSendingReminderId] = useState(null);

  const navigate = useNavigate();
  const user = getUser() || {};
  const isPro = user.plan && user.plan !== 'free';

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      // 🔥 Load core data first (fast)
      const res = await api.get('/invoices/dashboard');

      setInvoices((res.data.invoices || []).slice(0, 20));
      setStats({
        totalRevenue: res.data.stats?.totalRevenue || 0,
        pending: res.data.stats?.pending || 0,
        paid: res.data.stats?.paid || 0,
        total: res.data.stats?.total || 0,
        trends: [] // load later
      });

      setLoading(false); // ✅ show UI immediately

      // 🔥 Load AI + trends in background
      loadExtraData();

    } catch {
      console.error('Failed to load dashboard');
      setLoading(false);
    }
  };

  const loadExtraData = async () => {
    try {
      const aiResult = await api.get('/ai/insights');
      setAiInsights(aiResult.data);

      if (dashboardResult.status === 'fulfilled') {
        setStats(prev => ({
          ...prev,
          trends: dashboardResult.value.data.stats?.trends || []
        }));
      }

      if (aiResult.status === 'fulfilled') {
        setAiInsights(aiResult.value.data);
      }
    } catch { }
  };

  const sendReminder = async (id) => {
    try {
      setSendingReminderId(id);
      await api.post(`/invoices/${id}/reminder`);
      alert('Reminder email sent to client.');
    } catch (err) {
      alert('Failed to send reminder.');
    } finally {
      setSendingReminderId(null);
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

  const toneClass = (tone) => {
    if (tone === 'green') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
    if (tone === 'red') return 'border-red-400/20 bg-red-500/10 text-red-200';
    return 'border-yellow-300/20 bg-yellow-300/10 text-yellow-200';
  };

  const maxTrend = useMemo(() => {
    return stats.trends.length
      ? Math.max(...stats.trends.map(t => t.value), 1000)
      : 1000;
  }, [stats.trends]);

  const renderedInvoices = useMemo(() => {
    return invoices.map((inv) => (
      <tr key={inv._id} className="group hover:bg-white/[0.02] transition-colors">
        <td className="px-10 py-6">
          <p className="font-black text-white text-base leading-none mb-2">{inv.clientName}</p>
          <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.1em]">
            {inv.invoiceNumber} • {inv.clientEmail}
          </p>
        </td>

        <td className="px-10 py-6">
          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${inv.status === 'paid'
            ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
            : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10'
            }`}>
            {inv.status}
          </span>
        </td>

        <td className="px-10 py-6 text-right">
          <p className="text-lg font-black text-white italic tracking-tighter">
            {formatCurrency(inv.amount)}
          </p>
        </td>

        <td className="px-10 py-6 text-right">
          {/* actions */}
        </td>
      </tr>
    ));
  }, [invoices]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-10 md:py-16">
        <section className="reveal mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{isPro ? 'Platinum Workspace' : 'Trial Environment'}</span>
            </div>
            <h1 className="text-4xl font-black sm:text-6xl tracking-tighter text-white leading-none">
              Morning, {user.name?.split(' ')[0] || "Partner"}.
            </h1>
            <p className="mt-4 text-xl text-zinc-500 font-medium">
              You are currently managing <span className="text-white font-black italic">{stats.pending} pending</span> settlements.
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              to="/create-invoice"
              className="btn btn-primary px-10 py-5 rounded-[2rem] shadow-2xl shadow-yellow-400/20 hover:scale-[1.05] active:scale-[0.95] transition-all font-black uppercase text-xs tracking-widest bg-yellow-400 text-black"
            >
              Deploy Invoice
            </Link>
          </div>
        </section>

        <section className="mb-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[
            { label: 'Net Liquidity', val: formatCurrency(stats.totalRevenue), color: 'text-white' },
            { label: 'Pending Liquidity', val: stats.pending, color: 'text-yellow-400' },
            { label: 'Settled Items', val: stats.paid, color: 'text-white' },
            { label: 'Active Ledger', val: stats.total, color: 'text-white' }
          ].map((item, i) => (
            <div key={i} className="card p-8 hover:scale-[1.02] transition-transform relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={i === 0 ? "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-zinc-600 mb-6">{item.label}</p>
              <h2 className={`text-4xl font-black ${item.color} tracking-tighter italic`}>{item.val}</h2>
            </div>
          ))}
        </section>

        {/* ANALYTICS SECTION */}
        <section className="reveal reveal-delay-1 mb-12 grid gap-10 lg:grid-cols-[2fr_1fr]">
          {/* REVENUE TRENDS */}
          <div className="surface p-10 border-white/5 bg-zinc-950 shadow-2xl rounded-[3rem] relative overflow-hidden">
            <div className="mb-12 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-white italic mb-1">Growth Forecast</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Performance Over Last 6 Periods</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
            </div>

            {stats.trends.length > 0 ? (
              <div className="flex items-end justify-between gap-4 h-60">
                {stats.trends.map((t, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 group">
                    <div className="w-full relative mb-4 flex items-end justify-center">
                      <div
                        className="w-1/2 bg-gradient-to-t from-yellow-400/20 to-yellow-400 rounded-t-xl transition-all duration-700 group-hover:to-yellow-300 group-hover:scale-x-110"
                        style={{ height: `${(t.value / maxTrend) * 100}%`, minHeight: '4px' }}
                      />
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black text-white pointer-events-none">
                        ₹{t.value.toLocaleString()}
                      </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 group-hover:text-yellow-400 transition-colors">{t.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-zinc-700 border-2 border-dashed border-white/5 rounded-[2rem]">
                <p className="text-xs font-black uppercase tracking-[0.2em]">Awaiting historical data...</p>
                <p className="text-[10px] font-medium mt-2">Charts populate after your first settled invoices.</p>
              </div>
            )}
          </div>

          {/* AI INSIGHTS SIDEBAR */}
          <div className="surface p-10 border-yellow-400/20 bg-gradient-to-br from-zinc-950 to-yellow-400/5 shadow-2xl rounded-[3rem] relative overflow-hidden group">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 mb-8">
                <p className="text-[10px] uppercase tracking-widest font-black text-yellow-300 uppercase">Copilot Engine</p>
              </div>

              {aiInsights ? (
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Workspace Health</p>
                    <p className="text-5xl font-black text-white italic tracking-tighter">{aiInsights.cashFlowScore}%</p>
                  </div>
                  <p className="text-sm font-bold text-zinc-500 leading-relaxed italic">
                    "{aiInsights.summary}"
                  </p>
                  <div className="pt-8 border-t border-white/5">
                    <button
                      onClick={() => navigate('/create-invoice')}
                      className="w-full py-4 rounded-xl border border-yellow-400/30 text-yellow-400 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all"
                    >
                      Optimize Cashflow
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="h-10 w-48 bg-white/5 rounded-full animate-pulse" />
                  <div className="h-20 w-full bg-white/5 rounded-2xl animate-pulse" />
                  <div className="h-10 w-full bg-white/5 rounded-2xl animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="reveal reveal-delay-2 surface overflow-hidden border-white/5 bg-zinc-950/40 backdrop-blur-xl rounded-[3rem] shadow-2xl">
          <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white italic">Active Ledger</h2>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">Real-time settlement tracking</p>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center">Live Updates Active</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 space-y-6">
                {[1, 2, 3].map(i => <div key={i} className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">No records found in active workspace.</p>
              </div>
            ) : (
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-700 bg-white/[0.005]">
                    <th className="px-10 py-5">Profile</th>
                    <th className="px-10 py-5">Protocol Status</th>
                    <th className="px-10 py-5 text-right">Settlement</th>
                    <th className="px-10 py-5 text-right">Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {renderedInvoices}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
