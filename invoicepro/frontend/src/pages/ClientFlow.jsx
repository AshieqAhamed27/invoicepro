import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getUser, hasProAccess } from '../utils/auth';
import useDocumentMeta from '../utils/useDocumentMeta';
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
  const [countryCode, setCountryCode] = useState('91');
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccessMessage, setPhoneSuccessMessage] = useState('');
  const [dismissedPhoneModal, setDismissedPhoneModal] = useState(() => {
    return sessionStorage.getItem('cf_skip_phone_modal') === 'true';
  });

  // ─── First Win in 60s Onboarding Checklist State ───
  const [quickUpiInput, setQuickUpiInput] = useState('');
  const [savingQuickUpi, setSavingQuickUpi] = useState(false);
  const [upiSuccessMsg, setUpiSuccessMsg] = useState('');
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    return localStorage.getItem('cf_checklist_dismissed') === 'true';
  });
  const [checklistCollapsed, setChecklistCollapsed] = useState(false);
  const [invoiceShared, setInvoiceShared] = useState(() => {
    return localStorage.getItem('cf_first_invoice_shared') === 'true';
  });

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
    if (digits.length < 6) return;
    const fullPhone = `${countryCode}${digits}`;
    try {
      setSavingPhone(true);
      const res = await api.put('/auth/profile', { phone: fullPhone });
      const updatedUser = { ...user, phone: res.data?.user?.phone || fullPhone };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setPhoneSuccessMessage('✓ WhatsApp number saved! Live payment alerts active.');
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
    if (!invoice?._id) return;
    const url = `${window.location.origin}/public/invoice/${invoice._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInvoiceId(invoice._id);
      localStorage.setItem('cf_first_invoice_shared', 'true');
      setInvoiceShared(true);
      setTimeout(() => setCopiedInvoiceId(''), 2500);
    } catch {
      window.prompt('Copy public invoice link:', url);
      localStorage.setItem('cf_first_invoice_shared', 'true');
      setInvoiceShared(true);
    }
  };

  const sendInvoiceWhatsAppChaser = (invoice) => {
    if (!invoice?._id) return;
    const publicUrl = `${window.location.origin}/public/invoice/${invoice._id}`;
    const amountStr = invoice.currency === 'INR' ? `₹${invoice.amount?.toLocaleString('en-IN')}` : `${invoice.currency} ${invoice.amount}`;
    const clientPhone = invoice.clientPhone || '';
    const message = `Hi ${invoice.clientName || 'there'}! This is a polite note regarding invoice #${invoice.invoiceNumber || 'INV'} for ${amountStr}. You can view the invoice and complete payment directly via UPI / Card here:\n${publicUrl}\n\nThank you for working together!`;
    const shareUrl = getWhatsAppShareUrl(message, clientPhone);
    localStorage.setItem('cf_first_invoice_shared', 'true');
    setInvoiceShared(true);
    window.open(shareUrl, '_blank');
  };

  const handleSaveQuickUpi = async (e) => {
    e.preventDefault();
    const cleanUpi = quickUpiInput.trim();
    if (!cleanUpi) return;
    try {
      setSavingQuickUpi(true);
      const res = await api.put('/auth/profile', { upiId: cleanUpi });
      const updated = { ...user, upiId: res.data?.user?.upiId || cleanUpi };
      localStorage.setItem('user', JSON.stringify(updated));
      setCurrentUser(updated);
      setUpiSuccessMsg('✓ UPI ID saved! Your UPI QR code will now appear on all invoices.');
      setQuickUpiInput('');
      setTimeout(() => setUpiSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Could not save UPI ID. Please check and try again.');
    } finally {
      setSavingQuickUpi(false);
    }
  };

  return (
    <div className="premium-page min-h-screen">
      <Navbar />

      <main className="container-custom py-6 sm:py-8 md:py-10">

        {/* ─── 1. Pro Upgrade Card for Non-Pro ─── */}
        {!isPro ? (
          <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-indigo-500/10 p-5 shadow-sm relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-2xl border border-indigo-500/30">
                  ⚡
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      ClientFlow AI Pro
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                      ₹499/mo
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mt-1">
                    Automate WhatsApp payment reminders, generate unlimited AI proposals, and recover late client cash 3x faster.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition shadow-md active:scale-95"
              >
                Upgrade to Pro →
              </button>
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

        {/* Optional WhatsApp Setup Banner for Users without Phone */}
        {!user?.phone && !dismissedPhoneModal && (
          <div className="mb-8 rounded-3xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-5 sm:p-6 shadow-sm relative transition-all">
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('cf_skip_phone_modal', 'true');
                setDismissedPhoneModal(true);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full text-base leading-none"
              title="Dismiss"
            >
              ✕
            </button>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl border border-emerald-500/40">
                  📱
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Optional Mobile Alert</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Connect WhatsApp for Instant Payment Alerts
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 max-w-xl">
                    Get an instant ping on your phone whenever a client views an invoice or completes a payment.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePhone} className="flex flex-wrap items-center gap-2.5 shrink-0">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-11 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/60 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="91">🇮🇳 +91 (India)</option>
                  <option value="1">🇺🇸 +1 (US / Canada)</option>
                  <option value="44">🇬🇧 +44 (UK)</option>
                  <option value="971">🇦🇪 +971 (UAE)</option>
                  <option value="65">🇸🇬 +65 (Singapore)</option>
                  <option value="61">🇦🇺 +61 (Australia)</option>
                  <option value="49">🇩🇪 +49 (Germany)</option>
                </select>

                <input
                  type="tel"
                  placeholder="Phone number"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  className="h-11 w-44 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/60 px-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <button
                  type="submit"
                  disabled={savingPhone || phoneInput.replace(/\D/g, '').length < 6}
                  className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition disabled:opacity-40 shadow-sm active:scale-95"
                >
                  {savingPhone ? 'Saving...' : 'Save Phone'}
                </button>
              </form>
            </div>

            {phoneSuccessMessage && (
              <p className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {phoneSuccessMessage}
              </p>
            )}
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

        {/* ─── 3. FIRST WIN IN 60 SECONDS: ONBOARDING CHECKLIST ─── */}
        <section className="mb-10 overflow-hidden rounded-3xl border border-indigo-200 dark:border-indigo-500/25 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-[#0c1222] dark:via-[#090d18] dark:to-[#0f1426] p-6 sm:p-8 shadow-sm">
          {/* Header & Progress Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-indigo-100 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-2">
                <span>🚀 First Win in 60 Seconds</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Your 3-Step Setup to Get Paid
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium max-w-xl">
                Complete these 3 simple steps to create your first invoice and collect money directly to your account with 0% commission.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex flex-col items-start sm:items-end">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  <span>{((hasPayoutConfigured || user.upiId ? 1 : 0) + (counts.invoices > 0 ? 1 : 0) + (counts.invoices > 0 && invoiceShared ? 1 : 0))} of 3 Steps Complete</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    ((hasPayoutConfigured || user.upiId ? 1 : 0) + (counts.invoices > 0 ? 1 : 0) + (counts.invoices > 0 && invoiceShared ? 1 : 0)) === 3
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
                  }`}>
                    {Math.round((((hasPayoutConfigured || user.upiId ? 1 : 0) + (counts.invoices > 0 ? 1 : 0) + (counts.invoices > 0 && invoiceShared ? 1 : 0)) / 3) * 100)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-2.5 w-44 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      ((hasPayoutConfigured || user.upiId ? 1 : 0) + (counts.invoices > 0 ? 1 : 0) + (counts.invoices > 0 && invoiceShared ? 1 : 0)) === 3 ? 'bg-emerald-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${(((hasPayoutConfigured || user.upiId ? 1 : 0) + (counts.invoices > 0 ? 1 : 0) + (counts.invoices > 0 && invoiceShared ? 1 : 0)) / 3) * 100}%` }}
                  />
                </div>
              </div>

              {((hasPayoutConfigured || user.upiId ? 1 : 0) + (counts.invoices > 0 ? 1 : 0) + (counts.invoices > 0 && invoiceShared ? 1 : 0)) === 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !checklistDismissed;
                    setChecklistDismissed(next);
                    localStorage.setItem('cf_checklist_dismissed', String(next));
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white underline ml-2 transition"
                >
                  {checklistDismissed ? 'Show Checklist' : 'Dismiss'}
                </button>
              )}
            </div>
          </div>

          {/* Celebration banner when 3/3 done */}
          {((hasPayoutConfigured || user.upiId ? 1 : 0) + (counts.invoices > 0 ? 1 : 0) + (counts.invoices > 0 && invoiceShared ? 1 : 0)) === 3 && !checklistDismissed && (
            <div className="mt-5 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <p className="text-xs sm:text-sm font-bold">
                  <strong>You are all set!</strong> Your first invoice is out. When clients scan the QR code or pay, 100% of money arrives directly to your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setChecklistDismissed(true);
                  localStorage.setItem('cf_checklist_dismissed', 'true');
                }}
                className="shrink-0 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:underline px-2 py-1"
              >
                Got it ✓
              </button>
            </div>
          )}

          {/* 3 Step Cards Grid */}
          {!checklistDismissed && (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {/* ─── STEP 1 ─── */}
              <div className={`p-5 rounded-2xl border transition-all ${
                Boolean(hasPayoutConfigured || user.upiId)
                  ? 'border-emerald-300 dark:border-emerald-500/30 bg-white/80 dark:bg-emerald-950/10'
                  : 'border-amber-300 dark:border-amber-500/30 bg-white dark:bg-zinc-900/60 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    Boolean(hasPayoutConfigured || user.upiId)
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                  }`}>
                    {Boolean(hasPayoutConfigured || user.upiId) ? 'Step 1: Done ✓' : 'Step 1: Action Required'}
                  </span>
                  <span className="text-lg">{Boolean(hasPayoutConfigured || user.upiId) ? '✅' : '⚡'}</span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  1. Add UPI ID / Bank Details
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Where client money deposits. 100% of payments land directly in your account with 0% platform commission.
                </p>

                {Boolean(hasPayoutConfigured || user.upiId) ? (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-700 dark:text-emerald-400 break-all truncate max-w-[170px]">
                      ✓ {user.upiId || user.bankName || 'Payout Configured'}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/settings')}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-black"
                    >
                      Edit ➔
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-2.5">
                    {upiSuccessMsg && (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{upiSuccessMsg}</p>
                    )}
                    <form onSubmit={handleSaveQuickUpi} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="yourname@okhdfcbank"
                        value={quickUpiInput}
                        onChange={(e) => setQuickUpiInput(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600"
                      />
                      <button
                        type="submit"
                        disabled={savingQuickUpi || !quickUpiInput.trim()}
                        className="h-9 shrink-0 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-wider transition disabled:opacity-40"
                      >
                        {savingQuickUpi ? '...' : 'Save'}
                      </button>
                    </form>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-white"
                      >
                        Or configure Bank / IFSC in Settings ➔
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── STEP 2 ─── */}
              <div className={`p-5 rounded-2xl border transition-all ${
                counts.invoices > 0
                  ? 'border-emerald-300 dark:border-emerald-500/30 bg-white/80 dark:bg-emerald-950/10'
                  : 'border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-zinc-900/60 shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    counts.invoices > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
                  }`}>
                    {counts.invoices > 0 ? `Step 2: Done ✓` : 'Step 2: Takes 30s'}
                  </span>
                  <span className="text-lg">{counts.invoices > 0 ? '✅' : '📄'}</span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  2. Create Your First Invoice
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Bill for advance deposit or completed work. Automatically embeds your dynamic UPI QR code and GST LUT terms.
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold">
                  {counts.invoices > 0 ? (
                    <>
                      <span className="text-emerald-700 dark:text-emerald-400">
                        ✓ {counts.invoices} Invoice{counts.invoices === 1 ? '' : 's'} Created
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/create-invoice')}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-black"
                      >
                        + New Invoice ➔
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/create-invoice')}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider text-center shadow-sm transition active:scale-95"
                    >
                      + Create First Invoice (30s) →
                    </button>
                  )}
                </div>
              </div>

              {/* ─── STEP 3 ─── */}
              <div className={`p-5 rounded-2xl border transition-all ${
                Boolean(counts.invoices > 0 && invoiceShared)
                  ? 'border-emerald-300 dark:border-emerald-500/30 bg-white/80 dark:bg-emerald-950/10'
                  : counts.invoices > 0
                  ? 'border-sky-300 dark:border-sky-500/30 bg-white dark:bg-zinc-900/60 shadow-sm'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    Boolean(counts.invoices > 0 && invoiceShared)
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : counts.invoices > 0
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 animate-pulse'
                      : 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {Boolean(counts.invoices > 0 && invoiceShared) ? 'Step 3: Done ✓' : counts.invoices > 0 ? 'Step 3: Ready to Send!' : 'Step 3: Locked'}
                  </span>
                  <span className="text-lg">{Boolean(counts.invoices > 0 && invoiceShared) ? '✅' : counts.invoices > 0 ? '🔔' : '🔒'}</span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  3. Send Invoice Link to Client
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Send your live invoice link or PDF on WhatsApp. Client clicks, scans your UPI QR code, and pays in 5 seconds.
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
                  {recentInvoices[0] ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-zinc-300 truncate">
                        <span className="truncate">#{recentInvoices[0].invoiceNumber || 'INV'} to {recentInvoices[0].clientName || 'Client'}</span>
                        <span className="shrink-0 text-indigo-600 dark:text-indigo-400 ml-1">
                          {recentInvoices[0].currency === 'INR' ? '₹' : ''}{recentInvoices[0].amount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => sendInvoiceWhatsAppChaser(recentInvoices[0])}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm"
                          title="Open WhatsApp with polite note & payment link"
                        >
                          <span>📱 WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyInvoicePublicLink(recentInvoices[0])}
                          className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-white/10 dark:hover:bg-white/20 text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                          title="Copy client pay link"
                        >
                          <span>{copiedInvoiceId === recentInvoices[0]._id ? '✓ Copied!' : '📋 Copy Link'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                      Create your invoice in Step 2 to unlock your 1-click WhatsApp & copy links.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
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

        {/* ─── 6. Direct Client Profile ─── */}
        <section className="mb-10">
          {/* Direct Profile Card */}
          <div className="p-6 rounded-2xl border border-sky-200 dark:border-sky-500/20 bg-white dark:bg-zinc-950/40 shadow-sm max-w-2xl">
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
        </section>

      </main>
    </div>
  );
}
