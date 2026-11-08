import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getUser, hasProAccess } from '../utils/auth';
import useDocumentMeta from '../utils/useDocumentMeta';
import { getTimeLeft, DISCOUNT_PCT } from '../components/DiwaliOfferBanner';
import { getWhatsAppShareUrl } from '../utils/whatsapp';

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const getCount = (value) => Number(value || 0);

const buildCounts = ({ invoiceData = {}, leadData = {}, projectData = {}, cloudData = {} }) => {
  const documents = invoiceData.invoices || [];
  const proposals = documents.filter((item) => item.documentType === 'proposal');
  const invoices = documents.filter((item) => item.documentType !== 'proposal');
  const projects = projectData.projects || [];
  const cloudDocuments = cloudData.documents || [];
  const leadCount = getCount(leadData.total || leadData.totalLeads || leadData.count) ||
    getCount((leadData.hotLeads || []).length + (leadData.followUpsDue || []).length + (leadData.recentLeads || []).length);

  return {
    leads: leadCount,
    hotLeads: (leadData.hotLeads || []).length,
    followUps: (leadData.followUpsDue || []).length,
    proposals: proposals.length,
    acceptedProposals: (leadData.acceptedProposals || []).length,
    workrooms: projects.length,
    proof: cloudDocuments.length,
    invoices: invoices.length,
    pendingInvoices: getCount(invoiceData.stats?.pending),
    paidInvoices: getCount(invoiceData.stats?.paid),
    pendingAmount: getCount(invoiceData.stats?.pendingAmount),
    paidAmount: getCount(invoiceData.stats?.totalRevenue)
  };
};

export default function ClientFlow() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getUser() || {});
  const user = currentUser;
  const isPro = hasProAccess(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccessMessage, setPhoneSuccessMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  // Ticking countdown timer for Diwali offer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [data, setData] = useState({
    invoiceData: {},
    leadData: {},
    projectData: {},
    cloudData: {}
  });

  useDocumentMeta({
    title: 'Dashboard | ClientFlow AI',
    description: 'Clean freelancer dashboard: 3-step billing, UPI payouts, and payment recovery.'
  });

  const handleSavePhone = async (e) => {
    e.preventDefault();
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length !== 10) return;
    try {
      setSavingPhone(true);
      const res = await api.put('/auth/profile', { phone: digits });
      const updatedUser = { ...user, phone: res.data?.user?.phone || `91${digits}` };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setPhoneSuccessMessage('✓ WhatsApp number verified! Activating workspace...');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Could not update phone number. Please try again.');
    } finally {
      setSavingPhone(false);
    }
  };

  useEffect(() => {
    const loadFlow = async () => {
      setLoading(true);
      setError('');

      const [invoiceRes, leadRes, projectRes, cloudRes] = await Promise.allSettled([
        api.get('/invoices/dashboard'),
        isPro ? api.get('/leads/dashboard') : Promise.resolve({ data: {} }),
        api.get('/team-projects'),
        api.get('/cloud-documents')
      ]);

      if (invoiceRes.status === 'rejected' && projectRes.status === 'rejected') {
        setError('Could not load your workflow data. The backend may be waking up.');
      }

      setData({
        invoiceData: invoiceRes.status === 'fulfilled' ? invoiceRes.value.data || {} : {},
        leadData: leadRes.status === 'fulfilled' ? leadRes.value.data || {} : {},
        projectData: projectRes.status === 'fulfilled' ? projectRes.value.data || {} : {},
        cloudData: cloudRes.status === 'fulfilled' ? cloudRes.value.data || {} : {}
      });
      setLoading(false);
    };

    loadFlow();
  }, [isPro]);

  const counts = useMemo(() => buildCounts(data), [data]);
  const recentInvoices = useMemo(() => {
    const list = data.invoiceData?.invoices || [];
    return list.slice(0, 5);
  }, [data.invoiceData]);

  const hasPayoutConfigured = Boolean(
    user.upiId ||
    user.accountNumber ||
    user.internationalPaymentLink ||
    user.bankName
  );

  const directProfilePath = user.id ? `/f/${user.id}` : '';
  const directProfileUrl = directProfilePath && typeof window !== 'undefined'
    ? `${window.location.origin}${directProfilePath}`
    : '';

  const copyDirectProfile = async () => {
    if (!directProfileUrl) return;
    try {
      await navigator.clipboard.writeText(directProfileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      window.prompt('Copy your direct client profile link:', directProfileUrl);
    }
  };

  const copyInvoicePublicLink = async (invoice) => {
    const url = `${window.location.origin}/public/invoice/${invoice._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInvoiceId(invoice._id);
      setTimeout(() => setCopiedInvoiceId(''), 2500);
    } catch {
      window.prompt('Copy public invoice link:', url);
    }
  };

  const sendInvoiceWhatsAppChaser = (invoice) => {
    const publicUrl = `${window.location.origin}/public/invoice/${invoice._id}`;
    const amountStr = invoice.currency === 'INR' ? `₹${invoice.amount?.toLocaleString('en-IN')}` : `${invoice.currency} ${invoice.amount}`;
    const clientPhone = invoice.clientPhone || '';
    const message = `Hi ${invoice.clientName || 'there'}! This is a polite note regarding invoice #${invoice.invoiceNumber || 'INV'} for ${amountStr}. You can view the invoice and complete payment directly via UPI / Card here:\n${publicUrl}\n\nThank you for working together!`;
    const shareUrl = getWhatsAppShareUrl(message, clientPhone);
    window.open(shareUrl, '_blank');
  };

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="premium-page min-h-screen">
      <Navbar />

      <main className="container-custom py-6 sm:py-8 md:py-10">

        {/* ─── 1. Prominent Live Diwali Countdown Offer Banner ─── */}
        {!isPro ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 p-5 shadow-lg relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl border border-amber-500/40 shadow-inner">
                  🪔
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Diwali Flash Sale • {DISCOUNT_PCT}% OFF PRO
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      ₹249/mo (was ₹499)
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mt-1">
                    Automate WhatsApp payment reminders, generate unlimited AI proposals, and recover late client cash 3x faster.
                  </p>
                </div>
              </div>

              {/* Live Ticking Countdown Box */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-black/80 px-3.5 py-2 font-mono font-black text-white text-xs shadow-inner">
                  <span className="text-yellow-400">⏳ Sale Ends:</span>
                  <span className="text-white">{pad(timeLeft.days)}d</span>
                  <span className="text-yellow-400">:</span>
                  <span className="text-white">{pad(timeLeft.hours)}h</span>
                  <span className="text-yellow-400">:</span>
                  <span className="text-white">{pad(timeLeft.minutes)}m</span>
                  <span className="text-yellow-400">:</span>
                  <span className="text-yellow-400">{pad(timeLeft.seconds)}s</span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/payments')}
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:from-amber-300 hover:to-yellow-300 transition shadow-md active:scale-95"
                >
                  Claim ₹249 Pro Pass →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">Pro Active</span>
            <span className="text-slate-400 dark:text-zinc-500">•</span>
            <span>All automated WhatsApp reminders & AI proposal writer unlocked</span>
          </div>
        )}

        {/* WhatsApp Mobile Number Modal for Users without Phone */}
        {!user?.phone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-white dark:bg-[#0a0f1d] p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3.5 mb-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl border border-emerald-500/40">
                  📱
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Required Step</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">Enter WhatsApp Number</h2>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed mb-6">
                ClientFlow AI requires your WhatsApp number to activate your workspace and send instant alerts when clients view invoices or complete UPI payments.
              </p>

              <form onSubmit={handleSavePhone} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest block ml-1">
                    WhatsApp Mobile Number <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-black text-slate-500 dark:text-zinc-400 select-none">🇮🇳 +91</span>
                    <input
                      type="tel"
                      required
                      autoFocus
                      placeholder="98765 43210"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="h-12 w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/60 pl-16 pr-4 text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-emerald-500 transition shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPhone || phoneInput.replace(/\D/g, '').length !== 10}
                  className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-[0.99]"
                >
                  {savingPhone ? 'Activating Workspace...' : 'Activate Workspace →'}
                </button>
              </form>

              {phoneSuccessMessage && (
                <p className="mt-3 text-center text-xs font-bold text-emerald-600 dark:text-emerald-300">
                  {phoneSuccessMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── 2. Header: Purpose & Quick Actions ─── */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-2">
              <span>⚡ Freelancer Command Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              Welcome back, {user.name?.split(' ')[0] || 'Freelancer'} 👋
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-zinc-400 font-medium max-w-2xl">
              <strong>ClientFlow AI</strong> is your 3-step billing and cash recovery operating system. Setup your bank details, send invoices with instant UPI QR & Wise links, and recover overdue client payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/create-invoice')}
              className="btn btn-primary text-xs uppercase tracking-wider font-bold py-2.5 px-4 shadow-sm"
            >
              + Create Invoice & QR
            </button>
            <button
              type="button"
              onClick={() => navigate('/proposal-writer')}
              className="btn btn-secondary text-xs uppercase tracking-wider font-bold py-2.5 px-4"
            >
              + Write AI Proposal
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-bold text-xs uppercase tracking-wider transition"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-yellow-300/40 bg-yellow-50 dark:bg-yellow-300/[0.08] p-4 text-sm font-bold text-yellow-800 dark:text-yellow-100">
            {error}
          </div>
        )}

        {/* ─── 3. THE 3-STEP ORDERLY WORKFLOW: CLEAR PURPOSE ─── */}
        <section className="mb-10">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Orderly Fast Track</p>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
              The 3-Step Flow to Getting Paid
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Follow these three orderly steps to bill clients and collect money directly into your account with 0% platform commission.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* STEP 1: Set Payout Destination */}
            <div
              onClick={() => navigate('/settings')}
              className={`cursor-pointer group p-5 rounded-2xl border transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                hasPayoutConfigured
                  ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/[0.05]'
                  : 'border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  hasPayoutConfigured
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                }`}>
                  Step 1: Payout Setup
                </span>
                <span className="text-lg">{hasPayoutConfigured ? '✓' : '⚠️'}</span>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                1. Add Bank & UPI Details
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Add your UPI ID, Bank Account/IFSC, or Wise link. Money deposits directly to you with 0% commission.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs font-bold">
                <span className={hasPayoutConfigured ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                  {hasPayoutConfigured ? 'Direct Payouts Ready ✓' : 'Action Required'}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition">Configure ➔</span>
              </div>
            </div>

            {/* STEP 2: Bill Client */}
            <div
              onClick={() => navigate('/create-invoice')}
              className="cursor-pointer group p-5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-500/[0.05] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                  Step 2: Invoicing
                </span>
                <span className="text-lg">📄</span>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                2. Create Invoice & UPI QR
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Bill clients in INR, USD, GBP, or EUR with GST LUT compliance, dynamic UPI QR code, and Razorpay links.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400">
                <span>{counts.invoices} Created</span>
                <span className="group-hover:translate-x-1 transition">+ New Bill ➔</span>
              </div>
            </div>

            {/* STEP 3: Collect & Chase */}
            <div
              onClick={() => navigate('/clients')}
              className="cursor-pointer group p-5 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/40 dark:bg-sky-500/[0.05] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">
                  Step 3: Recovery
                </span>
                <span className="text-lg">🔔</span>
              </div>

              <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                3. Collect & Chase Overdue
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Send 1-click polite WhatsApp payment reminders to clients so you recover unpaid invoices without awkward phone calls.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-400">
                <span>{counts.pendingInvoices} Pending</span>
                <span className="group-hover:translate-x-1 transition">Open Tracker ➔</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. Live Financial Snapshot (4 KPI Cards) ─── */}
        <section className="mb-10 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Cash Collected */}
          <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-emerald-950/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>Cash Collected</span>
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">💰</span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              {loading ? (
                <div className="h-8 w-28 rounded-lg bg-emerald-100 dark:bg-emerald-400/10 animate-pulse my-1" />
              ) : (
                formatCurrency(counts.paidAmount)
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">{counts.paidInvoices} paid invoices</span>
              <button onClick={() => navigate('/create-invoice')} className="text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white transition font-medium">Invoices →</button>
            </div>
          </div>

          {/* Card 2: Pending Receivables */}
          <div className={`p-5 rounded-2xl border shadow-sm ${counts.pendingInvoices > 0 ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]'}`}>
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>Pending Receivables</span>
              <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">⏳</span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              {loading ? (
                <div className="h-8 w-28 rounded-lg bg-amber-100 dark:bg-amber-400/10 animate-pulse my-1" />
              ) : (
                formatCurrency(counts.pendingAmount)
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-amber-800 dark:text-amber-300 font-bold">{counts.pendingInvoices} unpaid invoices</span>
              {counts.pendingInvoices > 0 ? (
                <button onClick={() => navigate('/clients')} className="text-amber-600 dark:text-amber-400 font-bold hover:underline">Chase Cash ➔</button>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">All settled ✓</span>
              )}
            </div>
          </div>

          {/* Card 3: Active Proposals */}
          <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-white dark:bg-indigo-950/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>Active Proposals</span>
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">✍️</span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              {loading ? (
                <div className="h-8 w-16 rounded-lg bg-indigo-100 dark:bg-indigo-400/10 animate-pulse my-1" />
              ) : (
                counts.proposals
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-indigo-700 dark:text-indigo-300 font-bold">{counts.acceptedProposals} accepted</span>
              <button onClick={() => navigate('/proposal-writer')} className="text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white transition font-medium">Draft →</button>
            </div>
          </div>

          {/* Card 4: Qualified Leads */}
          <div className="p-5 rounded-2xl border border-sky-200 dark:border-sky-500/20 bg-white dark:bg-sky-950/10 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-semibold">
              <span>Client Contacts</span>
              <span className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">👥</span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
              {loading ? (
                <div className="h-8 w-16 rounded-lg bg-sky-100 dark:bg-sky-400/10 animate-pulse my-1" />
              ) : (
                counts.leads || counts.invoices
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-sky-700 dark:text-sky-300 font-bold">{counts.hotLeads} hot leads</span>
              <button onClick={() => navigate('/clients')} className="text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white transition font-medium">Clients →</button>
            </div>
          </div>
        </section>

        {/* ─── 5. Recent Invoices & 1-Click WhatsApp Reminder Table ─── */}
        <section className="mb-10 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-950/40 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Cash Recovery Center</p>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">Recent Invoices & Payment Reminders</h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">Copy public link or send 1-click WhatsApp payment reminders directly to clients.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create-invoice')}
              className="btn btn-primary text-xs uppercase tracking-wider font-bold py-2 px-4 self-start sm:self-auto"
            >
              + Create New Invoice
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl block mb-3">📄</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">No Invoices Created Yet</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                Create your first invoice in 60 seconds with instant UPI QR, bank account details, and Wise international link.
              </p>
              <button
                type="button"
                onClick={() => navigate('/create-invoice')}
                className="mt-4 btn btn-primary text-xs uppercase tracking-wider py-2.5 px-5 font-bold"
              >
                Create Your First Invoice →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 text-[11px] font-black uppercase tracking-wider">
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Client</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {recentInvoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    const amountStr = inv.currency === 'INR' ? `₹${inv.amount?.toLocaleString('en-IN')}` : `${inv.currency} ${inv.amount}`;
                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          #{inv.invoiceNumber || 'INV'}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                          {inv.clientName || 'Client'}
                        </td>
                        <td className="py-3.5 px-3 font-black text-slate-900 dark:text-white">
                          {amountStr}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                          }`}>
                            {isPaid ? 'Paid ✓' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => copyInvoicePublicLink(inv)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white transition"
                            title="Copy public link to share with client"
                          >
                            {copiedInvoiceId === inv._id ? 'Copied! ✓' : 'Copy Link 🔗'}
                          </button>

                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => sendInvoiceWhatsAppChaser(inv)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black uppercase tracking-wider transition shadow-sm"
                              title="Send friendly payment reminder on WhatsApp"
                            >
                              💬 Remind
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => navigate(`/invoice/${inv._id}`)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-100 transition"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── 6. Direct Client Profile & Direct Builder WhatsApp Support ─── */}
        <section className="mb-10 grid gap-6 lg:grid-cols-2">
          {/* Direct Profile Card */}
          <div className="p-6 rounded-2xl border border-sky-200 dark:border-sky-500/20 bg-white dark:bg-zinc-950/40 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
                0% Commission Direct Link
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200 font-bold">
                Portfolio
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Share your direct portfolio & booking link</h3>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Bypass 20% marketplace platform commissions. Give clients one professional link with your verified services, bank info, and booking form.
            </p>

            <div className="mt-4 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 flex items-center justify-between gap-3 text-xs">
              <span className="font-mono text-slate-700 dark:text-zinc-300 truncate">
                {directProfileUrl || 'Syncing your public link...'}
              </span>
              <button
                type="button"
                onClick={copyDirectProfile}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-black text-[11px] uppercase tracking-wider hover:bg-sky-400 transition"
              >
                {copiedLink ? 'Copied! ✓' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Direct WhatsApp Founder Support */}
          <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-zinc-950/40 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  Direct Founder Contact
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 font-bold">
                  WhatsApp Support
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-950 dark:text-white">Have questions or need custom setup?</h3>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                I'm Ashieq, the builder of ClientFlow AI. Feel free to WhatsApp me directly if you need help with bank integrations, GST LUT, or payment reminders.
              </p>
            </div>

            <div className="mt-5">
              <a
                href="https://wa.me/919080963704?text=Hi%20Ashieq!%20I'm%20using%20ClientFlow%20AI%20and%20wanted%20to%20connect%20%2F%20ask%20a%20question."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-sm active:scale-95"
              >
                <span>💬 Chat with Ashieq on WhatsApp (+91 90809 63704)</span>
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
