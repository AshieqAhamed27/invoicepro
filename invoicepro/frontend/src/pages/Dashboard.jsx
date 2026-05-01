import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import Navbar from '../components/Navbar';

const formatCurrency = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return 'not specified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not specified';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getDocumentMeta = (doc) => {
  const isProposal = doc.documentType === 'proposal';
  const statusLabel = isProposal ? (doc.proposalStatus || 'draft') : doc.status;

  if (!isProposal) {
    return {
      isProposal,
      typeLabel: 'Invoice',
      statusLabel,
      statusClass: statusLabel === 'paid'
        ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
        : 'bg-yellow-400/5 text-yellow-500 border-yellow-400/10'
    };
  }

  return {
    isProposal,
    typeLabel: 'Proposal',
    statusLabel,
    statusClass: statusLabel === 'accepted'
      ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
      : statusLabel === 'expired'
        ? 'bg-red-400/5 text-red-400 border-red-400/10'
        : 'bg-sky-400/5 text-sky-300 border-sky-400/10'
  };
};

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
  const [dashboardError, setDashboardError] = useState('');
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [convertingProposalId, setConvertingProposalId] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try {
      return localStorage.getItem('onboarding_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const navigate = useNavigate();
  const user = getUser() || {};
  const isPro = user.plan && user.plan !== 'free';

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setDashboardError('');
      const res = await api.get('/invoices/dashboard');

      setInvoices((res.data.invoices || []).slice(0, 20));
      setStats({
        totalRevenue: res.data.stats?.totalRevenue || 0,
        pending: res.data.stats?.pending || 0,
        paid: res.data.stats?.paid || 0,
        total: res.data.stats?.total || 0,
        trends: res.data.stats?.trends || []
      });

      setLoading(false);
      loadExtraData();
    } catch (err) {
      console.error('Failed to load dashboard', err);
      setDashboardError(
        err.friendlyMessage ||
          err.response?.data?.message ||
          'Dashboard could not be loaded. Please retry after checking your connection.'
      );
      setLoading(false);
    }
  };

  const loadExtraData = async () => {
    try {
      const aiResult = await api.get('/ai/insights');
      setAiInsights(aiResult.data);
    } catch { }
  };

  const dismissOnboarding = () => {
    try {
      localStorage.setItem('onboarding_dismissed', '1');
    } catch { }
    setOnboardingDismissed(true);
  };

  const sendReminder = async (id) => {
    try {
      setSendingReminderId(id);
      await api.post(`/invoices/${id}/reminder`);
      alert('Reminder email sent to client.');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to send reminder.');
    } finally {
      setSendingReminderId(null);
    }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchDashboard();
    } catch {
      alert('Delete failed');
    }
  };

  const convertProposal = async (id) => {
    try {
      setConvertingProposalId(id);
      const res = await api.post(`/invoices/${id}/convert`);
      navigate(`/invoice/${res.data.invoice._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert proposal.');
    } finally {
      setConvertingProposalId(null);
    }
  };

  const sendWhatsAppReminder = (invoice) => {
    const publicUrl = `${window.location.origin}/public/invoice/${invoice._id}`;
    const message = [
      `Hi ${invoice.clientName},`,
      `This is a quick reminder for invoice ${invoice.invoiceNumber} of ${formatCurrency(invoice.amount)}.`,
      `Due date: ${formatDate(invoice.dueDate)}.`,
      `You can view and pay here: ${publicUrl}`,
      'Thank you.'
    ].join('\n\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const copyAiReminder = async () => {
    const reminder = aiInsights?.topRisk?.reminder;
    if (!reminder) return;

    try {
      await navigator.clipboard.writeText(reminder);
      alert('AI reminder copied. Send it on email or WhatsApp.');
    } catch {
      window.prompt('Copy this reminder:', reminder);
    }
  };

  const maxTrend = useMemo(() => {
    return stats.trends.length
      ? Math.max(...stats.trends.map((t) => t.value), 1000)
      : 1000;
  }, [stats.trends]);

  const renderedInvoices = useMemo(() => {
    return invoices.map((inv) => {
      const meta = getDocumentMeta(inv);

      return (
        <tr key={inv._id} className="group hover:bg-white/[0.02] transition-colors">
          <td className="px-10 py-6">
            <p className="font-black text-white text-base leading-none mb-2">{inv.clientName}</p>
            <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.1em]">
              {meta.typeLabel} • {inv.invoiceNumber} • {inv.clientEmail}
            </p>
          </td>

          <td className="px-10 py-6">
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${meta.statusClass}`}>
              {meta.statusLabel}
            </span>
          </td>

          <td className="px-10 py-6 text-right">
            <p className="text-lg font-black text-white italic tracking-tighter">
              {formatCurrency(inv.amount)}
            </p>
          </td>

          <td className="px-10 py-6 text-right">
            <div className="flex justify-end gap-2">
              <Link
                to={`/invoice/${inv._id}`}
                className="btn btn-secondary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                View
              </Link>

              {!meta.isProposal && inv.status !== 'paid' && (
                <>
                  <button
                    type="button"
                    onClick={() => sendWhatsAppReminder(inv)}
                    className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-400/15 hover:text-emerald-200"
                  >
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    disabled={sendingReminderId === inv._id}
                    onClick={() => sendReminder(inv._id)}
                    className="btn btn-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    {sendingReminderId === inv._id ? 'Sending...' : 'Email'}
                  </button>
                </>
              )}

              {meta.isProposal && inv.proposalStatus === 'accepted' && !inv.convertedToInvoiceId && (
                <button
                  type="button"
                  disabled={convertingProposalId === inv._id}
                  onClick={() => convertProposal(inv._id)}
                  className="btn btn-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {convertingProposalId === inv._id ? 'Converting...' : 'Convert'}
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteInvoice(inv._id)}
                className="px-4 py-2 rounded-xl border border-red-400/10 bg-red-400/5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10 transition-all"
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      );
    });
  }, [convertingProposalId, invoices, sendingReminderId]);

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{isPro ? 'Pro Plan' : 'Free Plan'}</span>
            </div>
            <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl tracking-tight text-white leading-none">
              Good morning, {user.name?.split(' ')[0] || 'there'}.
            </h1>
            <p className="mt-4 text-base sm:text-xl text-zinc-500 font-medium">
              You currently have <span className="text-white font-black italic">{stats.pending} unpaid</span> invoices in play.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3 md:flex md:flex-wrap md:gap-4">
            <Link
              to="/launch"
              className="btn btn-dark px-5 sm:px-8 py-4 sm:py-5 font-black uppercase text-xs tracking-widest"
            >
              Launch Center
            </Link>
            <Link
              to="/create-invoice?type=proposal"
              className="btn btn-secondary px-5 sm:px-8 py-4 sm:py-5 font-black uppercase text-xs tracking-widest"
            >
              New Proposal
            </Link>
            <Link
              to="/create-invoice"
              className="btn btn-primary px-5 sm:px-10 py-4 sm:py-5 shadow-2xl shadow-black/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all font-black uppercase text-xs tracking-widest"
            >
              New Invoice
            </Link>
          </div>
        </section>

        {dashboardError && (
          <section className="reveal reveal-delay-1 mb-12 rounded-2xl border border-red-400/20 bg-red-400/5 p-5 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">Dashboard Error</p>
            <h2 className="mt-3 text-2xl font-black text-white">Could not load your dashboard.</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-300">{dashboardError}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={fetchDashboard}
                className="btn btn-primary px-6 py-3 text-xs font-black uppercase tracking-widest"
              >
                Retry Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn btn-secondary px-6 py-3 text-xs font-black uppercase tracking-widest"
              >
                Sign In Again
              </button>
            </div>
          </section>
        )}

        {!dashboardError && !loading && invoices.length === 0 && !onboardingDismissed && (
          <section className="reveal reveal-delay-1 mb-12 premium-panel p-5 sm:p-8 lg:p-10 relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">
                  Quick Start
                </p>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-none">
                  Create your first invoice or proposal in 60 seconds.
                </h2>
                <p className="mt-4 text-zinc-500 font-medium text-sm sm:text-base leading-relaxed">
                  Start with a proposal for new work, then convert it into an invoice once the client accepts.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/create-invoice')}
                    className="btn btn-primary px-6 sm:px-8 py-4 rounded-2xl text-base font-black shadow-xl shadow-yellow-500/10"
                  >
                    Create First Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/create-invoice?type=proposal')}
                    className="btn btn-dark px-6 sm:px-8 py-4 rounded-2xl text-base font-black"
                  >
                    Create First Proposal
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissOnboarding}
                className="btn btn-secondary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest self-start"
              >
                Dismiss
              </button>
            </div>

            <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-3">
              {[
                { t: '1. Create Proposal', d: 'Package the scope, amount, and validity in one shareable document.' },
                { t: '2. Get Approval', d: 'Let the client review and accept it from the public link.' },
                { t: '3. Convert to Invoice', d: 'Turn accepted work into a payable invoice when it is ready.' }
              ].map((step) => (
                <div key={step.t} className="p-6 rounded-2xl border border-white/5 bg-black/10">
                  <p className="text-xs font-black text-white mb-2">{step.t}</p>
                  <p className="text-xs font-bold text-zinc-500 leading-relaxed">{step.d}</p>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-8 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-5">
              <p className="text-xs font-bold text-zinc-400">
                Tip: If you bill monthly, turn on <span className="text-yellow-300 font-black">Recurring Invoice</span> on the creation page.
              </p>
            </div>
          </section>
        )}

        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {[
            { label: 'Collected Revenue', val: formatCurrency(stats.totalRevenue), color: 'text-white' },
            { label: 'Pending Invoices', val: stats.pending, color: 'text-yellow-400' },
            { label: 'Paid Invoices', val: stats.paid, color: 'text-white' },
            { label: 'Total Invoices', val: stats.total, color: 'text-white' }
          ].map((item, i) => (
            <div key={i} className="card p-5 sm:p-8 hover:scale-[1.02] transition-transform relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={i === 0 ? 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} /></svg>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-black text-zinc-600 mb-6">{item.label}</p>
              <h2 className={`text-3xl sm:text-4xl font-black ${item.color} tracking-tight break-words`}>{item.val}</h2>
            </div>
          ))}
        </section>

        <section className="reveal reveal-delay-1 mb-12 grid gap-8 lg:grid-cols-[2fr_1fr] lg:gap-10">
          <div className="premium-panel p-5 sm:p-8 lg:p-10 relative overflow-hidden">
            <div className="mb-8 sm:mb-12 flex justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Revenue Trend</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Performance Over Recent Billing Periods</p>
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
                        Rs {t.value.toLocaleString()}
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

          <div className="premium-panel p-5 sm:p-8 lg:p-10 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 mb-8">
                <p className="text-[10px] uppercase tracking-widest font-black text-yellow-300">AI Revenue Coach</p>
              </div>

              {aiInsights ? (
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Cash Flow Score</p>
                    <p className="text-5xl font-black text-white tracking-tight">{aiInsights.cashFlowScore}%</p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-400 leading-relaxed">
                    "{aiInsights.summary}"
                  </p>
                  {aiInsights.moneyActions?.length > 0 && (
                    <div className="space-y-3">
                      {aiInsights.moneyActions.map((action) => (
                        <div key={`${action.title}-${action.value}`} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-black text-white">{action.title}</p>
                              <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{action.description}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                              {action.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiInsights.topRisk?.reminder && (
                    <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Suggested follow-up</p>
                      <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-300">
                        {aiInsights.topRisk.reminder}
                      </p>
                      <button
                        type="button"
                        onClick={copyAiReminder}
                        className="mt-4 rounded-xl border border-yellow-400/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition-all hover:bg-yellow-400 hover:text-black"
                      >
                        Copy Reminder
                      </button>
                    </div>
                  )}
                  {aiInsights.recommendations?.length > 0 && (
                    <div className="space-y-2">
                      {aiInsights.recommendations.slice(0, 3).map((item) => (
                        <div key={item} className="flex gap-3 text-xs font-semibold leading-relaxed text-zinc-500">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-8 border-t border-white/5">
                    <div className="grid gap-3">
                      <button
                        onClick={() => navigate('/create-invoice')}
                        className="w-full py-4 rounded-xl border border-yellow-400/30 text-yellow-400 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all"
                      >
                        Create Invoice
                      </button>
                      {!isPro && (
                        <button
                          type="button"
                          onClick={() => navigate('/payment')}
                          className="w-full rounded-xl bg-white py-4 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-yellow-300"
                        >
                          Upgrade Pro
                        </button>
                      )}
                    </div>
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

        <section className="reveal reveal-delay-2 premium-panel overflow-hidden">
          <div className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Recent Billing Documents</h2>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">Track proposals, invoices, approvals, and follow-ups</p>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center">Status Tracking Active</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 space-y-6">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-6 sm:p-10 lg:p-16 text-center">
                <p className="text-zinc-600 font-black uppercase tracking-widest text-xs mb-6">No billing documents yet.</p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate('/create-invoice')}
                    className="btn btn-primary px-6 sm:px-10 py-4 rounded-2xl text-base font-black shadow-xl shadow-yellow-500/10"
                  >
                    Create Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/create-invoice?type=proposal')}
                    className="btn btn-secondary px-6 sm:px-10 py-4 rounded-2xl text-base font-black"
                  >
                    Create Proposal
                  </button>
                </div>
              </div>
            ) : (
              <table className="premium-table w-full text-left min-w-[800px]">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-zinc-700 bg-white/[0.005]">
                    <th className="px-10 py-5">Client</th>
                    <th className="px-10 py-5">Status</th>
                    <th className="px-10 py-5 text-right">Amount</th>
                    <th className="px-10 py-5 text-right">Actions</th>
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
