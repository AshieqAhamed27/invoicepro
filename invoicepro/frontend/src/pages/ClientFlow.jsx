import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getUser, hasProAccess } from '../utils/auth';
import useDocumentMeta from '../utils/useDocumentMeta';

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
  const proofCount = projects.reduce(
    (sum, project) => sum + (project.resources?.length || 0) + (project.wikiPages?.length || 0),
    0
  ) + cloudDocuments.length;

  return {
    leads: leadCount,
    hotLeads: (leadData.hotLeads || []).length,
    followUps: (leadData.followUpsDue || []).length,
    proposals: proposals.length,
    acceptedProposals: (leadData.acceptedProposals || []).length,
    workrooms: projects.length,
    proof: proofCount,
    invoices: invoices.length,
    pendingInvoices: getCount(invoiceData.stats?.pending),
    paidInvoices: getCount(invoiceData.stats?.paid),
    pendingAmount: getCount(invoiceData.stats?.pendingAmount),
    paidAmount: getCount(invoiceData.stats?.totalRevenue)
  };
};

const buildSteps = (counts) => [
  {
    id: 'find-client',
    label: 'Find client',
    title: 'Create one real opportunity',
    detail: 'Save or identify a client who has a real problem you can solve.',
    done: counts.leads > 0,
    route: '/client-finder',
    cta: 'Find Clients',
    metric: `${counts.leads} leads`
  },
  {
    id: 'qualify',
    label: 'Qualify',
    title: 'Check if the client is serious',
    detail: 'Look at budget, urgency, problem, and follow-up timing before spending more energy.',
    done: counts.hotLeads > 0 || counts.followUps > 0,
    route: '/leads',
    cta: 'Open Pipeline',
    metric: `${counts.hotLeads + counts.followUps} active`
  },
  {
    id: 'proposal',
    label: 'Proposal',
    title: 'Turn interest into a clear offer',
    detail: 'Prepare scope, price, timeline, deliverables, and next step so the client can say yes.',
    done: counts.proposals > 0 || counts.acceptedProposals > 0,
    route: '/proposal-writer',
    cta: 'Write Proposal',
    metric: `${counts.proposals} proposals`
  },
  {
    id: 'workroom',
    label: 'Workroom',
    title: 'Create the client workroom',
    detail: 'Keep scope, milestones, collaborators, notes, and delivery decisions in one place.',
    done: counts.workrooms > 0,
    route: '/client-workroom',
    cta: 'Open Workroom',
    metric: `${counts.workrooms} workrooms`
  },
  {
    id: 'proof',
    label: 'Delivery proof',
    title: 'Save files, links, and approvals',
    detail: 'Store proof before asking for payment: files, preview links, screenshots, approvals, and notes.',
    done: counts.proof > 0,
    route: '/cloud-documents',
    cta: 'Save Proof',
    metric: `${counts.proof} proof items`
  },
  {
    id: 'invoice',
    label: 'Invoice',
    title: 'Convert approved work into invoice',
    detail: 'Create a professional invoice with PDF, public link, currency, and payment route.',
    done: counts.invoices > 0,
    route: '/create-invoice',
    cta: 'Create Invoice',
    metric: `${counts.invoices} invoices`
  },
  {
    id: 'payment',
    label: 'Payment',
    title: 'Follow up until money is collected',
    detail: 'Track pending invoices and send the right WhatsApp/payment follow-up before it goes cold.',
    done: counts.paidInvoices > 0,
    route: '/create-invoice',
    cta: 'Collect Payment',
    metric: `${counts.pendingInvoices} pending`
  }
];

const proRoutes = ['/client-finder', '/leads', '/proposal-writer'];

export default function ClientFlow() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getUser() || {});
  const user = currentUser;
  const isPro = hasProAccess(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccessMessage, setPhoneSuccessMessage] = useState('');
  const [phoneDismissed, setPhoneDismissed] = useState(false);

  const handleSavePhone = async (e) => {
    e.preventDefault();
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length !== 10) return;
    try {
      setSavingPhone(true);
      await api.put('/auth/profile', { phone: digits });
      const updatedUser = { ...user, phone: `91${digits}` };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setPhoneSuccessMessage('✓ WhatsApp number connected! Instant invoice & payment alerts are now active.');
      setTimeout(() => {
        setPhoneDismissed(true);
      }, 3000);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Could not update phone number. Please try again.');
    } finally {
      setSavingPhone(false);
    }
  };
  const [data, setData] = useState({
    invoiceData: {},
    leadData: {},
    projectData: {},
    cloudData: {}
  });
  const [autopilotEnabled, setAutopilotEnabled] = useState(() => {
    try {
      return localStorage.getItem('clientflow_autopilot_enabled') === '1';
    } catch {
      return false;
    }
  });

  useDocumentMeta({
    title: 'Dashboard | ClientFlow AI',
    description: 'Clean freelancer dashboard: track cash collected, pending payments, AI proposals, and client workflow.'
  });

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
  const steps = useMemo(() => buildSteps(counts), [counts]);
  const completion = Math.round((steps.filter((step) => step.done).length / steps.length) * 100);

  const workflowSignals = useMemo(() => ([
    {
      id: 'identity',
      label: 'Business identity',
      done: Boolean(user.companyName || user.name),
      route: '/settings',
      cta: 'Open Settings',
      detail: 'Add the business name, logo, UPI, and contact details clients will see.'
    },
    {
      id: 'lead',
      label: 'Lead source',
      done: counts.leads > 0,
      route: '/client-finder',
      cta: 'Find Clients',
      detail: 'Create or save one real client opportunity before building more tools.'
    },
    {
      id: 'proposal',
      label: 'Proposal path',
      done: counts.proposals > 0 || counts.acceptedProposals > 0,
      route: '/proposal-writer',
      cta: 'Write Proposal',
      detail: 'Turn client interest into scope, price, timeline, and next step.'
    },
    {
      id: 'delivery',
      label: 'Delivery room',
      done: counts.workrooms > 0,
      route: '/client-workroom',
      cta: 'Open Workroom',
      detail: 'Keep scope, tasks, files, approvals, and handover in one client space.'
    },
    {
      id: 'proof',
      label: 'Proof saved',
      done: counts.proof > 0,
      route: '/cloud-documents',
      cta: 'Save Proof',
      detail: 'Save links, files, approvals, and delivery notes before invoicing.'
    },
    {
      id: 'invoice',
      label: 'Invoice route',
      done: counts.invoices > 0,
      route: '/create-invoice',
      cta: 'Create Invoice',
      detail: 'Send a professional invoice with due date, PDF, public link, and payment route.'
    },
    {
      id: 'collection',
      label: 'Payment collected',
      done: counts.paidInvoices > 0,
      route: '/create-invoice',
      cta: 'Collect Payment',
      detail: 'Use payment follow-up until money is actually collected.'
    }
  ]), [
    counts.acceptedProposals,
    counts.invoices,
    counts.leads,
    counts.paidInvoices,
    counts.proof,
    counts.proposals,
    counts.workrooms,
    user.companyName,
    user.name
  ]);

  const workflowBottleneck = workflowSignals.find((signal) => !signal.done) || workflowSignals[workflowSignals.length - 1];

  const directProfilePath = user.id ? `/f/${user.id}` : '';
  const directProfileUrl = directProfilePath && typeof window !== 'undefined'
    ? `${window.location.origin}${directProfilePath}`
    : '';

  const weeklyPlan = useMemo(() => ([
    {
      day: 'Day 1',
      title: 'Choose one service and target client',
      detail: 'Keep the offer narrow so outreach and proposals become easier.',
      done: Boolean(user.companyName || user.name),
      route: '/settings',
      cta: 'Set Identity'
    },
    {
      day: 'Day 2',
      title: 'Save one real client lead',
      detail: 'Find or save a prospect who needs your skill this week.',
      done: counts.leads > 0,
      route: '/client-finder',
      cta: 'Find Client'
    },
    {
      day: 'Day 3',
      title: 'Qualify the lead',
      detail: 'Check budget, urgency, and problem clarity before writing a proposal.',
      done: counts.hotLeads > 0 || counts.followUps > 0,
      route: '/leads',
      cta: 'Qualify'
    },
    {
      day: 'Day 4',
      title: 'Send a clear proposal',
      detail: 'Make scope, price, timeline, and 50% upfront payment terms transparent.',
      done: counts.proposals > 0 || counts.acceptedProposals > 0,
      route: '/proposal-writer',
      cta: 'Write Proposal'
    },
    {
      day: 'Day 5',
      title: 'Open client workroom',
      detail: 'Organize milestones, approvals, and shared preview links.',
      done: counts.workrooms > 0,
      route: '/client-workroom',
      cta: 'Open Workroom'
    },
    {
      day: 'Day 6',
      title: 'Save delivery proof',
      detail: 'Upload screenshots, links, and handover sign-offs before billing.',
      done: counts.proof > 0,
      route: '/cloud-documents',
      cta: 'Save Proof'
    },
    {
      day: 'Day 7',
      title: 'Invoice & collect cash',
      detail: 'Share GST invoice with UPI QR & Razorpay link, and run smart reminders.',
      done: counts.invoices > 0 && counts.paidInvoices > 0,
      route: '/create-invoice',
      cta: counts.invoices > 0 ? 'Collect Cash' : 'Create Invoice'
    }
  ]), [
    counts.acceptedProposals,
    counts.followUps,
    counts.hotLeads,
    counts.invoices,
    counts.leads,
    counts.paidInvoices,
    counts.proof,
    counts.proposals,
    counts.workrooms,
    user.companyName,
    user.name
  ]);

  const openRoute = (route) => {
    if (!isPro && proRoutes.includes(route)) {
      navigate('/payments');
      return;
    }
    navigate(route);
  };

  const enableAutopilot = () => {
    try {
      localStorage.setItem('clientflow_autopilot_enabled', '1');
      localStorage.setItem('clientflow_selected_workflow', 'business-autopilot');
    } catch {
      // safe fallback
    }
    setAutopilotEnabled(true);
    openRoute('/business-autopilot');
  };

  const askGuide = (question = 'What should I do next in ClientFlow AI?') => {
    window.dispatchEvent(new CustomEvent('clientflow:open-assistant', {
      detail: { question }
    }));
  };

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

  return (
    <div className="premium-page min-h-screen text-white bg-[#090d14]">
      <Navbar />

      <main className="container-custom py-6 sm:py-8 md:py-10">
        {/* ─── 1. Header & Value Proposition ─── */}
        {!isPro ? (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-xl border border-amber-500/30">
                ⭐
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">Free Plan Active</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                    ₹499/mo Pro Upgrade
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-300 mt-0.5">
                  <strong className="text-white">Why upgrade to Pro?</strong> Automate WhatsApp & Email payment reminders to recover unpaid cash 3x faster, plus generate unlimited AI proposals.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/payments')}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest hover:from-amber-300 hover:to-yellow-300 transition shadow-lg shadow-amber-500/10 active:scale-95"
            >
              Upgrade to Pro (₹499) →
            </button>
          </div>
        ) : (
          <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">Pro Active</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">All automated reminder agents & AI proposal writer unlocked</span>
          </div>
        )}

        {/* WhatsApp Mobile Number Connect Banner for Active Users without phone */}
        {!user?.phone && !phoneDismissed && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-2xl shadow-inner">
                  📱
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Add WhatsApp</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h3 className="text-base font-black text-white mt-0.5">
                    Connect your WhatsApp number for Instant Payment & Invoice Alerts
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Receive instant WhatsApp alerts when clients view proposals, accept terms, or complete payments via UPI/Razorpay.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePhone} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-black text-zinc-400 select-none">🇮🇳 +91</span>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-11 w-full sm:w-44 rounded-xl border border-white/10 bg-black/40 pl-14 pr-3 text-sm font-bold text-white placeholder-zinc-500 outline-none focus:border-emerald-500/60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPhone || phoneInput.replace(/\D/g, '').length !== 10}
                  className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                >
                  {savingPhone ? 'Connecting...' : 'Connect WhatsApp'}
                </button>
              </form>
            </div>
            {phoneSuccessMessage && (
              <p className="mt-3 text-xs font-bold text-emerald-300">
                {phoneSuccessMessage}
              </p>
            )}
          </div>
        )}

        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Welcome back, {user.name?.split(' ')[0] || 'Freelancer'} 👋
            </h1>
            <p className="mt-2 text-sm sm:text-base text-zinc-400 font-medium">
              Your freelance command center: bill clients, close proposals, and collect payments on time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/create-invoice')}
              className="btn btn-primary text-xs uppercase tracking-wider font-bold py-2.5 px-4"
            >
              + New Invoice
            </button>
            <button
              type="button"
              onClick={() => navigate('/proposal-writer')}
              className="btn btn-secondary text-xs uppercase tracking-wider font-bold py-2.5 px-4"
            >
              + New Proposal
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] p-4 text-sm font-bold text-yellow-100">
            {error}
          </div>
        )}

        {/* ─── First-Time User 3-Minute Quick Start (Shown when user has 0 invoices) ─── */}
        {!loading && counts.invoices === 0 && counts.proposals === 0 && (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl border border-yellow-400/25 bg-gradient-to-r from-yellow-400/[0.08] via-amber-400/[0.04] to-transparent shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚀</span>
                  <h2 className="text-base sm:text-lg font-black text-white">New to ClientFlow AI? Complete your 3-minute setup</h2>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">3 simple steps to start sending invoices and getting paid via UPI.</p>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                Quick Setup
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {/* Step 1 */}
              <div 
                onClick={() => navigate('/settings')}
                className="cursor-pointer p-4 rounded-xl border border-white/10 bg-black/30 hover:border-yellow-400/40 hover:bg-white/[0.04] transition group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span className="text-yellow-400">Step 1</span>
                  <span className="group-hover:text-white transition">Settings ➔</span>
                </div>
                <h3 className="mt-2 text-sm font-black text-white group-hover:text-yellow-300 transition">Add Business Name & UPI</h3>
                <p className="mt-1 text-xs text-zinc-400">Add your logo and UPI ID so clients can pay you directly.</p>
              </div>

              {/* Step 2 */}
              <div 
                onClick={() => navigate('/create-invoice')}
                className="cursor-pointer p-4 rounded-xl border border-white/10 bg-black/30 hover:border-emerald-400/40 hover:bg-white/[0.04] transition group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span className="text-emerald-400">Step 2</span>
                  <span className="group-hover:text-white transition">Create ➔</span>
                </div>
                <h3 className="mt-2 text-sm font-black text-white group-hover:text-emerald-300 transition">Create Your 1st Invoice</h3>
                <p className="mt-1 text-xs text-zinc-400">Generate a GST invoice with Razorpay link & UPI QR in 60s.</p>
              </div>

              {/* Step 3 */}
              <div 
                onClick={copyDirectProfile}
                className="cursor-pointer p-4 rounded-xl border border-white/10 bg-black/30 hover:border-sky-400/40 hover:bg-white/[0.04] transition group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span className="text-sky-400">Step 3</span>
                  <span className="group-hover:text-white transition">{copiedLink ? 'Copied! ✓' : 'Copy ➔'}</span>
                </div>
                <h3 className="mt-2 text-sm font-black text-white group-hover:text-sky-300 transition">Share Direct Portfolio</h3>
                <p className="mt-1 text-xs text-zinc-400">Share your 0% commission direct link on WhatsApp or LinkedIn.</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. Live Financial Snapshot (4 KPI Cards) ─── */}
        <section className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Cash Collected */}
          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-transparent backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
              <span>Cash Collected</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">💰</span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-white">
              {loading ? '...' : formatCurrency(counts.paidAmount)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold">{counts.paidInvoices} paid invoices</span>
              <button onClick={() => navigate('/create-invoice')} className="text-zinc-500 hover:text-white transition">Invoices →</button>
            </div>
          </div>

          {/* Card 2: Pending Receivables */}
          <div className={`p-5 rounded-2xl border ${counts.pendingInvoices > 0 ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent' : 'border-white/10 bg-white/[0.02]'} backdrop-blur-sm`}>
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
              <span>Pending Receivables</span>
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">⏳</span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-white">
              {loading ? '...' : formatCurrency(counts.pendingAmount)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-amber-300 font-semibold">{counts.pendingInvoices} unpaid invoices</span>
              {counts.pendingInvoices > 0 ? (
                <button onClick={() => navigate('/create-invoice')} className="text-amber-400 font-bold hover:underline">Chase Invoices ➔</button>
              ) : (
                <span className="text-emerald-400 font-semibold">All clear ✓</span>
              )}
            </div>
          </div>

          {/* Card 3: Active Proposals */}
          <div className="p-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/10 to-transparent backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
              <span>Active Proposals</span>
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">✍️</span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-white">
              {loading ? '...' : counts.proposals}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-indigo-300 font-semibold">{counts.acceptedProposals} accepted</span>
              <button onClick={() => navigate('/proposal-writer')} className="text-zinc-500 hover:text-white transition">Draft →</button>
            </div>
          </div>

          {/* Card 4: Qualified Leads */}
          <div className="p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-transparent backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
              <span>Client Leads</span>
              <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">🎯</span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-white">
              {loading ? '...' : counts.leads}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-violet-300 font-semibold">{counts.hotLeads} hot leads</span>
              <button onClick={() => navigate('/leads')} className="text-zinc-500 hover:text-white transition">Pipeline →</button>
            </div>
          </div>
        </section>

        {/* ─── 3. 3 Quick Actions: Instant Productivity ─── */}
        <section className="mb-10">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Quick Actions</p>
            <h2 className="text-xl sm:text-2xl font-black text-white">What do you want to accomplish right now?</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Action 1: Create Invoice */}
            <div 
              onClick={() => navigate('/create-invoice')}
              className="cursor-pointer group p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-emerald-500/40 transition-all shadow-xl hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">📄</span>
                <span className="text-xs font-bold text-zinc-500 group-hover:text-emerald-400 transition">60-Sec Create ➔</span>
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition">Create Invoice & UPI QR</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Generate a GST invoice with Razorpay payment link & instant UPI QR code for direct bank settlement.
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center text-xs font-bold text-emerald-400">
                <span>Create Invoice Now</span>
                <span className="ml-1 transition group-hover:translate-x-1">→</span>
              </div>
            </div>

            {/* Action 2: AI Proposal */}
            <div 
              onClick={() => navigate('/proposal-writer')}
              className="cursor-pointer group p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-indigo-500/40 transition-all shadow-xl hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">✍️</span>
                <span className="text-xs font-bold text-zinc-500 group-hover:text-indigo-400 transition">AI-Assisted ➔</span>
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-indigo-300 transition">Draft Winning Proposal</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Turn project scope into a professional proposal with milestone pricing & payment terms clients can sign online.
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center text-xs font-bold text-indigo-400">
                <span>Draft Proposal Now</span>
                <span className="ml-1 transition group-hover:translate-x-1">→</span>
              </div>
            </div>

            {/* Action 3: Overdue Payment Recovery */}
            <div 
              onClick={() => navigate('/create-invoice')}
              className="cursor-pointer group p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-amber-500/40 transition-all shadow-xl hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">🔔</span>
                <span className="text-xs font-bold text-zinc-500 group-hover:text-amber-400 transition">Auto-Reminder ➔</span>
              </div>
              <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition">Chase Overdue Payments</h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Send polite, automated WhatsApp or Email reminders to late clients so you get paid without awkward follow-ups.
              </p>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center text-xs font-bold text-amber-400">
                <span>Recover Unpaid Cash</span>
                <span className="ml-1 transition group-hover:translate-x-1">→</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. Client Flow Pipeline: 5-Step Clear Journey ─── */}
        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">Client Flow Lifecycle</p>
              <h2 className="text-xl sm:text-2xl font-black text-white">Your 5-Stage Work Pipeline</h2>
              <p className="text-xs text-zinc-400 mt-1">One clean path from finding client leads to money collected in your bank.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">Workflow Completion:</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
                {completion}%
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {/* Step 1: Leads */}
            <div 
              onClick={() => openRoute('/leads')}
              className={`cursor-pointer p-4 rounded-xl border transition-all text-left ${counts.leads > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">1. Find & Qualify</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${counts.leads > 0 ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
                  {counts.leads > 0 ? 'Done' : 'Start'}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 font-medium">Identify client pain points and budget.</p>
              <div className="mt-3 text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>{counts.leads} Leads</span>
                <span className="text-emerald-400">Open ➔</span>
              </div>
            </div>

            {/* Step 2: Proposal */}
            <div 
              onClick={() => openRoute('/proposal-writer')}
              className={`cursor-pointer p-4 rounded-xl border transition-all text-left ${counts.proposals > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">2. AI Proposal</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${counts.proposals > 0 ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
                  {counts.proposals > 0 ? 'Done' : 'Next'}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 font-medium">Set scope, pricing & Indian payment terms.</p>
              <div className="mt-3 text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>{counts.proposals} Proposals</span>
                <span className="text-indigo-400">Write ➔</span>
              </div>
            </div>

            {/* Step 3: Workroom */}
            <div 
              onClick={() => openRoute('/client-workroom')}
              className={`cursor-pointer p-4 rounded-xl border transition-all text-left ${counts.workrooms > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">3. Workroom</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${counts.workrooms > 0 ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
                  {counts.workrooms > 0 ? 'Done' : 'Next'}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 font-medium">Track delivery milestones & client approvals.</p>
              <div className="mt-3 text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>{counts.workrooms} Active</span>
                <span className="text-sky-400">Manage ➔</span>
              </div>
            </div>

            {/* Step 4: Invoice */}
            <div 
              onClick={() => openRoute('/create-invoice')}
              className={`cursor-pointer p-4 rounded-xl border transition-all text-left ${counts.invoices > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">4. Invoice & Link</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${counts.invoices > 0 ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
                  {counts.invoices > 0 ? 'Done' : 'Next'}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 font-medium">GST invoice with Razorpay link & UPI QR.</p>
              <div className="mt-3 text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>{counts.invoices} Invoices</span>
                <span className="text-emerald-400">Bill ➔</span>
              </div>
            </div>

            {/* Step 5: Payment Collected */}
            <div 
              onClick={() => openRoute('/create-invoice')}
              className={`cursor-pointer p-4 rounded-xl border transition-all text-left ${counts.paidInvoices > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">5. Paid & Settled</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${counts.paidInvoices > 0 ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-400'}`}>
                  {counts.paidInvoices > 0 ? 'Done' : 'Next'}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 font-medium">TDS reconciliation, Form 16A & CA export.</p>
              <div className="mt-3 text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>{formatCurrency(counts.paidAmount)}</span>
                <span className="text-amber-400">View ➔</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. Direct Profile & Autopilot Assistant ─── */}
        <section className="mb-10 grid gap-6 lg:grid-cols-2">
          {/* Direct Profile Card */}
          <div className="p-6 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-transparent to-transparent shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">Own Your Clients (0% Commission)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/30 font-bold">
                Direct Link
              </span>
            </div>
            <h3 className="text-xl font-black text-white">Share your direct portfolio & booking page</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Bypass 20% marketplace platform fees. Give clients one professional link with your services, verified proof, and direct inquiry form.
            </p>

            <div className="mt-4 p-3 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between gap-3 text-xs">
              <span className="font-mono text-zinc-300 truncate">
                {directProfileUrl || 'Syncing your public link...'}
              </span>
              <button
                type="button"
                onClick={copyDirectProfile}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-400 text-black font-black text-[11px] uppercase tracking-wider hover:bg-sky-300 transition"
              >
                {copiedLink ? 'Copied! ✓' : 'Copy Link'}
              </button>
            </div>

            <div className="mt-4 flex gap-4 text-xs">
              {directProfilePath && (
                <button
                  type="button"
                  onClick={() => navigate(directProfilePath)}
                  className="text-sky-400 font-bold hover:underline"
                >
                  Preview Public Page ↗
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="text-zinc-400 font-semibold hover:text-white transition"
              >
                Edit Profile & Services ⚙️
              </button>
            </div>
          </div>

          {/* Autopilot Recommendation */}
          <div className="p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">AI Next Recommendation</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-bold">
                Autopilot
              </span>
            </div>
            <h3 className="text-xl font-black text-white">{workflowBottleneck.label}</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {workflowBottleneck.detail}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openRoute(workflowBottleneck.route)}
                className="btn btn-primary text-xs uppercase tracking-wider font-bold py-2.5 px-5"
              >
                {workflowBottleneck.cta} →
              </button>
              <button
                type="button"
                onClick={enableAutopilot}
                className="btn btn-dark text-xs uppercase tracking-wider font-bold py-2.5 px-4"
              >
                {autopilotEnabled ? 'Open Autopilot' : 'Enable Autopilot'}
              </button>
              <button
                type="button"
                onClick={() => askGuide(`My next business step is "${workflowBottleneck.label}". What should I do right now?`)}
                className="btn btn-secondary text-xs uppercase tracking-wider font-bold py-2.5 px-4"
              >
                Ask AI Coach
              </button>
            </div>
          </div>
        </section>

        {/* ─── 6. Collapsible 7-Day Strategy Playbook ─── */}
        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-xl">
          <button 
            type="button"
            onClick={() => setPlaybookOpen(!playbookOpen)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🎓</span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white group-hover:text-yellow-300 transition">
                  Freelancer 7-Day Strategy Playbook
                </h3>
                <p className="text-xs text-zinc-400">Step-by-step habit system to land, qualify, and bill clients every week.</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-zinc-300 group-hover:bg-white/10 transition">
              {playbookOpen ? 'Hide Playbook ▴' : 'Show 7-Day Playbook ▾'}
            </span>
          </button>

          {playbookOpen && (
            <div className="mt-6 pt-6 border-t border-white/10 grid gap-3 sm:grid-cols-2 lg:grid-cols-7 animate-fadeIn">
              {weeklyPlan.map((item) => (
                <div
                  key={item.day}
                  className={`p-3.5 rounded-xl border text-left ${item.done ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-white/5 bg-black/20'}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-sky-400">
                    <span>{item.day}</span>
                    <span className={item.done ? 'text-emerald-400' : 'text-zinc-500'}>
                      {item.done ? '✓ Done' : 'Todo'}
                    </span>
                  </div>
                  <h4 className="mt-1.5 text-xs font-black text-white leading-snug">{item.title}</h4>
                  <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed line-clamp-3">{item.detail}</p>
                  <button
                    type="button"
                    onClick={() => openRoute(item.route)}
                    className="mt-3 w-full py-1.5 rounded-lg border border-white/10 text-[10px] font-black uppercase text-zinc-300 hover:bg-white/10 transition"
                  >
                    {item.cta}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        {/* ─── 7. Direct Builder WhatsApp Support & Feedback ─── */}
        <section className="mb-6 p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl border border-emerald-500/30">
              💬
            </span>
            <div>
              <p className="text-sm font-black text-white">Need help getting set up or have feedback?</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                I'm Ashieq, the builder of ClientFlow AI. Text me directly on WhatsApp anytime if you have questions or need custom workflow setup.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/919080963704?text=Hi%20Ashieq!%20I'm%20using%20ClientFlow%20AI%20and%20wanted%20to%20connect%20%2F%20ask%20a%20question."
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95"
          >
            <span>💬 Chat with Ashieq</span>
          </a>
        </section>
      </main>
    </div>
  );
}
