import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import { openWhatsAppShare } from '../utils/whatsapp';
import Navbar from '../components/Navbar';
import AIBillingAgent from '../components/AIBillingAgent';
import PaymentCollectionAgent from '../components/PaymentCollectionAgent';
import { trackEvent } from '../utils/analytics';

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

const isDatePastEndOfDay = (value) => {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  date.setHours(23, 59, 59, 999);
  return date < new Date();
};

const getDocumentMeta = (doc) => {
  const isProposal = doc.documentType === 'proposal';
  const statusLabel = isProposal
    ? (doc.proposalStatus || 'draft')
    : doc.status === 'pending' && isDatePastEndOfDay(doc.dueDate)
      ? 'overdue'
      : doc.status;

  if (!isProposal) {
    return {
      isProposal,
      typeLabel: 'Invoice',
      statusLabel,
      statusClass: statusLabel === 'paid'
        ? 'bg-emerald-400/5 text-emerald-400 border-emerald-400/10'
        : statusLabel === 'overdue'
          ? 'bg-red-400/5 text-red-400 border-red-400/10'
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

const getLeadName = (lead = {}) =>
  lead.businessName || lead.contactName || lead.email || lead.phone || 'Unnamed lead';

const getLeadStatusLabel = (status = '') => ({
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost'
}[status] || 'New');

const buildLeadFollowUpMessage = (lead = {}) => {
  const name = lead.contactName || 'there';
  const business = lead.businessName || 'your business';
  const pain = lead.pain
    ? `I was thinking about this opportunity: ${lead.pain}`
    : 'I had a quick idea that could help improve enquiries or trust.';

  return `Hi ${name}, following up about ${business}.\n\n${pain}\n\nWould you like me to share 2 simple improvement ideas and a fixed-price proposal?`;
};

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    pending: 0,
    paid: 0,
    total: 0,
    paymentLinks: 0,
    trends: []
  });
  const [aiInsights, setAiInsights] = useState(null);
  const [leadDashboard, setLeadDashboard] = useState({
    stats: {},
    summary: {},
    followUpsDue: [],
    hotLeads: [],
    openProposals: [],
    acceptedProposals: []
  });
  const [leadDashboardError, setLeadDashboardError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [convertingProposalId, setConvertingProposalId] = useState(null);
  const [whatsAppShared, setWhatsAppShared] = useState(() => {
    try {
      return localStorage.getItem('invoicepro_whatsapp_invoice_shared') === '1';
    } catch {
      return false;
    }
  });
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
        pendingAmount: res.data.stats?.pendingAmount || 0,
        pending: res.data.stats?.pending || 0,
        paid: res.data.stats?.paid || 0,
        total: res.data.stats?.total || 0,
        paymentLinks: res.data.stats?.paymentLinks || 0,
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
    const [aiResult, leadResult] = await Promise.allSettled([
      api.get('/ai/insights'),
      api.get('/leads/dashboard')
    ]);

    if (aiResult.status === 'fulfilled') {
      setAiInsights(aiResult.value.data);
    }

    if (leadResult.status === 'fulfilled') {
      setLeadDashboard({
        stats: leadResult.value.data?.stats || {},
        summary: leadResult.value.data?.summary || {},
        followUpsDue: leadResult.value.data?.followUpsDue || [],
        hotLeads: leadResult.value.data?.hotLeads || [],
        openProposals: leadResult.value.data?.openProposals || [],
        acceptedProposals: leadResult.value.data?.acceptedProposals || []
      });
      setLeadDashboardError('');
    } else {
      setLeadDashboardError(
        leadResult.reason?.friendlyMessage ||
          leadResult.reason?.response?.data?.message ||
          'Lead revenue dashboard is not available yet.'
      );
    }
  };

  const dismissOnboarding = () => {
    try {
      localStorage.setItem('onboarding_dismissed', '1');
    } catch { }
    setOnboardingDismissed(true);
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
    const paymentUrl = invoice.paymentLink?.shortUrl || publicUrl;
    const message = [
      `Hi ${invoice.clientName},`,
      `This is a quick reminder for invoice ${invoice.invoiceNumber} of ${formatCurrency(invoice.amount)}.`,
      `Due date: ${formatDate(invoice.dueDate)}.`,
      `You can view and pay here: ${paymentUrl}`,
      'Thank you.'
    ].join('\n\n');

    openWhatsAppShare(message);
    try {
      localStorage.setItem('invoicepro_whatsapp_invoice_shared', '1');
      setWhatsAppShared(true);
    } catch { }
    trackEvent('share_whatsapp_reminder', {
      location: 'dashboard',
      invoice_status: invoice.status,
      value: Number(invoice.amount || 0),
      currency: 'INR'
    });
  };

  const sendLeadFollowUp = (lead) => {
    openWhatsAppShare(buildLeadFollowUpMessage(lead), lead.phone);
    trackEvent('share_lead_followup', {
      location: 'dashboard',
      lead_status: lead.status || 'new',
      value: Number(lead.budget || 0),
      currency: 'INR'
    });
  };

  const copyAiReminder = async () => {
    const reminder = aiInsights?.topRisk?.reminder;
    if (!reminder) return;

    try {
      await navigator.clipboard.writeText(reminder);
      trackEvent('copy_ai_reminder', { location: 'dashboard' });
      alert('AI reminder copied. Send it on email or WhatsApp.');
    } catch {
      window.prompt('Copy this reminder:', reminder);
    }
  };

  const openAiDraftInBuilder = (draft) => {
    try {
      localStorage.setItem('invoicepro_ai_invoice_draft', JSON.stringify(draft));
    } catch { }

    navigate('/create-invoice?ai=draft');
    trackEvent('apply_ai_invoice_draft', { location: 'dashboard' });
  };

  const maxTrend = useMemo(() => {
    return stats.trends.length
      ? Math.max(...stats.trends.map((t) => t.value), 1000)
      : 1000;
  }, [stats.trends]);

  const acquisitionSummary = leadDashboard.summary || {};
  const acquisitionStats = leadDashboard.stats || {};
  const dueLeadList = leadDashboard.followUpsDue || [];
  const hotLeadList = leadDashboard.hotLeads || [];
  const acceptedProposalList = leadDashboard.acceptedProposals || [];

  const acquisitionCards = useMemo(() => ([
    {
      label: 'Lead Pipeline Value',
      value: formatCurrency(acquisitionSummary.pipelineValue || 0),
      note: `${acquisitionStats.total || 0} total leads`
    },
    {
      label: 'Open Proposal Value',
      value: formatCurrency(acquisitionSummary.openProposalValue || 0),
      note: `${acquisitionStats.proposal_sent || 0} in proposal stage`
    },
    {
      label: 'Won Lead Value',
      value: formatCurrency(acquisitionSummary.wonLeadValue || acquisitionSummary.acceptedProposalValue || 0),
      note: `${acquisitionStats.won || 0} won leads`
    },
    {
      label: 'Conversion Rate',
      value: `${Number(acquisitionSummary.conversionRate || 0)}%`,
      note: `${acquisitionStats.followUpsDue || 0} follow-ups due`
    }
  ]), [acquisitionStats, acquisitionSummary]);

  const setupChecklist = useMemo(() => {
    const hasLogo = Boolean(user.logo);
    const hasInvoice = Number(stats.total || 0) > 0;
    const hasPaymentLink = Number(stats.paymentLinks || 0) > 0;
    const hasPaidInvoice = Number(stats.paid || 0) > 0;
    const firstPendingInvoice = invoices.find((invoice) => invoice.documentType !== 'proposal' && invoice.status !== 'paid');

    return [
      {
        id: 'logo',
        label: 'Add logo and business profile',
        detail: 'Make every invoice look like it came from a real company.',
        done: hasLogo,
        cta: 'Open Settings',
        action: () => navigate('/settings')
      },
      {
        id: 'invoice',
        label: 'Create first invoice',
        detail: 'Add client, service, due date, and amount.',
        done: hasInvoice,
        cta: 'Create Invoice',
        action: () => navigate('/create-invoice')
      },
      {
        id: 'payment-link',
        label: 'Create Razorpay payment link',
        detail: 'Open an unpaid invoice and create a real hosted payment link.',
        done: hasPaymentLink,
        cta: firstPendingInvoice ? 'Open Invoice' : 'Create Invoice',
        action: () => navigate(firstPendingInvoice ? `/invoice/${firstPendingInvoice._id}` : '/create-invoice')
      },
      {
        id: 'whatsapp',
        label: 'Share invoice on WhatsApp',
        detail: 'Send the invoice or payment link where clients actually reply.',
        done: whatsAppShared,
        cta: firstPendingInvoice ? 'Send WhatsApp' : 'Create Invoice',
        action: () => firstPendingInvoice ? sendWhatsAppReminder(firstPendingInvoice) : navigate('/create-invoice')
      },
      {
        id: 'paid',
        label: 'Collect first verified payment',
        detail: 'Razorpay webhook should mark the invoice paid automatically.',
        done: hasPaidInvoice,
        cta: firstPendingInvoice ? 'Collect Payment' : 'View Dashboard',
        action: () => firstPendingInvoice ? navigate(`/invoice/${firstPendingInvoice._id}`) : window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      }
    ];
  }, [invoices, navigate, stats.paid, stats.paymentLinks, stats.total, user.logo, whatsAppShared]);

  const setupCompleted = setupChecklist.filter((step) => step.done).length;

  const nextMoneyActions = useMemo(() => {
    const actions = [];

    if (dueLeadList.length > 0) {
      actions.push({
        title: `Follow up ${dueLeadList.length} lead${dueLeadList.length === 1 ? '' : 's'} today`,
        detail: 'These leads already have a follow-up date due.',
        cta: 'Open Pipeline',
        action: () => navigate('/leads'),
        tone: 'yellow'
      });
    }

    if (acceptedProposalList.length > 0) {
      actions.push({
        title: 'Convert accepted proposal',
        detail: `${acceptedProposalList[0].clientName} has accepted. Turn it into an invoice.`,
        cta: 'Open Proposal',
        action: () => navigate(`/invoice/${acceptedProposalList[0]._id}`),
        tone: 'emerald'
      });
    }

    if ((acquisitionStats.interested || 0) > 0) {
      actions.push({
        title: 'Send proposal to interested leads',
        detail: 'Interested leads should not stay idle. Package an offer and move them forward.',
        cta: 'Create Proposal',
        action: () => navigate('/leads'),
        tone: 'sky'
      });
    }

    if ((stats.pending || 0) > 0) {
      actions.push({
        title: 'Collect pending invoices',
        detail: `${stats.pending} invoice${stats.pending === 1 ? ' is' : 's are'} waiting for payment.`,
        cta: 'Review Invoices',
        action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
        tone: 'zinc'
      });
    }

    if (actions.length === 0) {
      actions.push({
        title: 'Add 5 verified leads',
        detail: 'Start by saving real prospects from Google Maps, LinkedIn, or Instagram.',
        cta: 'Find Clients',
        action: () => navigate('/client-finder'),
        tone: 'emerald'
      });
    }

    return actions.slice(0, 4);
  }, [acceptedProposalList, acquisitionStats, dueLeadList, navigate, stats.pending]);

  const firstPendingInvoice = useMemo(
    () => invoices.find((invoice) => invoice.documentType !== 'proposal' && invoice.status !== 'paid'),
    [invoices]
  );

  const moneyPipelineStages = useMemo(() => {
    const leadCount = Number(acquisitionStats.new || 0) +
      Number(acquisitionStats.contacted || 0) +
      Number(acquisitionStats.interested || 0);
    const proposalCount = Number(acquisitionStats.proposal_sent || 0);
    const acceptedCount = acceptedProposalList.length;
    const pendingAmount = Number(stats.pendingAmount || 0);

    return [
      {
        id: 'lead-pool',
        label: 'Lead Pool',
        title: 'Find real prospects',
        count: leadCount,
        value: formatCurrency(acquisitionSummary.pipelineValue || 0),
        detail: 'Save businesses that match your service, budget, urgency, and contact quality.',
        cta: 'Find Leads',
        tone: 'sky',
        action: () => navigate('/client-finder')
      },
      {
        id: 'proposal',
        label: 'Proposal',
        title: 'Package the offer',
        count: proposalCount,
        value: formatCurrency(acquisitionSummary.openProposalValue || 0),
        detail: 'Turn interested leads into a clear scope, price, validity date, and public proposal link.',
        cta: 'Send Proposal',
        tone: 'yellow',
        action: () => navigate('/create-invoice?type=proposal')
      },
      {
        id: 'accepted',
        label: 'Accepted',
        title: 'Convert won work',
        count: acceptedCount,
        value: formatCurrency(acquisitionSummary.acceptedProposalValue || 0),
        detail: 'Accepted proposals should become invoices quickly so collection can start.',
        cta: acceptedProposalList[0] ? 'Convert Now' : 'Open Pipeline',
        tone: 'emerald',
        action: () => navigate(acceptedProposalList[0] ? `/invoice/${acceptedProposalList[0]._id}` : '/leads')
      },
      {
        id: 'payment-pending',
        label: 'Payment Pending',
        title: 'Collect money',
        count: Number(stats.pending || 0),
        value: formatCurrency(pendingAmount),
        detail: 'Create or open Razorpay links, share invoices on WhatsApp, and follow up before money goes cold.',
        cta: firstPendingInvoice ? 'Collect' : 'Create Invoice',
        tone: 'orange',
        action: () => navigate(firstPendingInvoice ? `/invoice/${firstPendingInvoice._id}` : '/create-invoice')
      },
      {
        id: 'paid-repeat',
        label: 'Paid + Repeat',
        title: 'Grow repeat revenue',
        count: Number(stats.paid || 0),
        value: formatCurrency(stats.totalRevenue || 0),
        detail: 'Use paid clients, recurring billing, and client history to build monthly cashflow.',
        cta: 'Recurring',
        tone: 'purple',
        action: () => navigate('/recurring')
      }
    ];
  }, [
    acceptedProposalList,
    acquisitionStats,
    acquisitionSummary,
    firstPendingInvoice,
    navigate,
    stats.paid,
    stats.pending,
    stats.pendingAmount,
    stats.totalRevenue
  ]);

  const operatingScore = useMemo(() => {
    const completedStages = moneyPipelineStages.filter((stage) => Number(stage.count || 0) > 0 || Number(String(stage.value).replace(/\D/g, '') || 0) > 0).length;
    return Math.round((completedStages / moneyPipelineStages.length) * 100);
  }, [moneyPipelineStages]);

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
                <button
                  type="button"
                  onClick={() => sendWhatsAppReminder(inv)}
                  className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition-all hover:bg-emerald-400/15 hover:text-emerald-200"
                >
                  WhatsApp
                </button>
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
  }, [convertingProposalId, invoices]);

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
              Run your client-to-cash system: find leads, close proposals, collect payments, and build repeat revenue.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-4 md:flex md:flex-wrap md:gap-4">
            <Link
              to="/launch"
              className="btn btn-dark px-5 sm:px-8 py-4 sm:py-5 font-black uppercase text-xs tracking-widest"
            >
              Launch Center
            </Link>
            <Link
              to="/client-finder"
              className="btn btn-dark px-5 sm:px-8 py-4 sm:py-5 font-black uppercase text-xs tracking-widest"
            >
              Find Clients
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
              New Deal
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
                    onClick={() => navigate('/client-finder')}
                    className="btn btn-secondary px-6 sm:px-8 py-4 rounded-2xl text-base font-black"
                  >
                    Find First Client
                  </button>
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

        {!dashboardError && !loading && setupCompleted < setupChecklist.length && (
          <section className="reveal reveal-delay-1 mb-12 rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[0.035] p-5 shadow-2xl shadow-black/10 sm:p-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">First Customer Setup</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Complete the path from signup to paid invoice.
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                  These are the actions a real user must understand fast: profile, invoice, Razorpay link, WhatsApp share, and verified payment.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Progress</p>
                <p className="mt-1 text-3xl font-black text-white">{setupCompleted}/{setupChecklist.length}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {setupChecklist.map((step, index) => (
                <div key={step.id} className={`rounded-2xl border p-5 transition-all ${
                  step.done
                    ? 'border-emerald-400/15 bg-emerald-400/10'
                    : 'border-white/8 bg-black/20 hover:border-yellow-400/20'
                }`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                      step.done ? 'bg-emerald-400 text-black' : 'bg-white/10 text-zinc-300'
                    }`}>
                      {step.done ? 'OK' : index + 1}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                      step.done
                        ? 'border-emerald-400/20 text-emerald-300'
                        : 'border-yellow-400/20 text-yellow-300'
                    }`}>
                      {step.done ? 'Done' : 'Next'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black leading-tight text-white">{step.label}</h3>
                  <p className="mt-2 min-h-[48px] text-xs font-semibold leading-relaxed text-zinc-500">{step.detail}</p>
                  {!step.done && (
                    <button
                      type="button"
                      onClick={step.action}
                      className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/[0.08]"
                    >
                      {step.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {!dashboardError && !loading && (
          <section className="reveal reveal-delay-1 mb-12 rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
            <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Business Operating System
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Your money pipeline from lead to repeat revenue.
                </h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                  InvoicePro now works as one connected system: lead discovery, proposal, invoice,
                  payment collection, and recurring client revenue.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">System Health</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <p className="text-4xl font-black text-white">{operatingScore}%</p>
                  <p className="max-w-[12rem] text-right text-xs font-semibold leading-relaxed text-zinc-400">
                    Add activity in every stage to make this a real money machine.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-5">
              {moneyPipelineStages.map((stage, index) => (
                <div
                  key={stage.id}
                  className={`rounded-[1.75rem] border p-5 transition-all hover:-translate-y-1 ${
                    stage.tone === 'emerald'
                      ? 'border-emerald-400/20 bg-emerald-400/10'
                      : stage.tone === 'yellow'
                        ? 'border-yellow-400/20 bg-yellow-400/10'
                        : stage.tone === 'sky'
                          ? 'border-sky-400/20 bg-sky-400/10'
                          : stage.tone === 'orange'
                            ? 'border-orange-400/20 bg-orange-400/10'
                            : 'border-purple-400/20 bg-purple-400/10'
                  }`}
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                      {stage.label}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white">{stage.title}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Count</p>
                      <p className="mt-1 text-2xl font-black text-white">{stage.count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Value</p>
                      <p className="mt-1 break-words text-sm font-black text-white">{stage.value}</p>
                    </div>
                  </div>
                  <p className="mt-4 min-h-[72px] text-xs font-semibold leading-relaxed text-zinc-400">{stage.detail}</p>
                  <button
                    type="button"
                    onClick={stage.action}
                    className="mt-5 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white/10"
                  >
                    {stage.cta}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Today's Focus</p>
                <h3 className="mt-2 text-xl font-black text-white">{nextMoneyActions[0]?.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
                  {nextMoneyActions[0]?.detail}
                </p>
                {nextMoneyActions[0] && (
                  <button
                    type="button"
                    onClick={nextMoneyActions[0].action}
                    className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-yellow-300"
                  >
                    {nextMoneyActions[0].cta}
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">What this means</p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
                  A user should open InvoicePro and immediately know the next money action:
                  find a prospect, send a proposal, convert accepted work, collect pending payment, or turn a paid client into repeat income.
                </p>
              </div>
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

        <section className="reveal reveal-delay-1 mb-12 rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[0.035] p-5 sm:p-8 lg:p-10">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                Client Acquisition Revenue
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Where your next money is coming from.
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                Track leads, proposals, won opportunities, and follow-ups in one revenue view.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/leads" className="btn btn-secondary px-6 py-3">
                Open Pipeline
              </Link>
              <Link to="/client-finder" className="btn btn-primary px-6 py-3">
                Find Clients
              </Link>
            </div>
          </div>

          {leadDashboardError && (
            <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4">
              <p className="text-xs font-semibold leading-relaxed text-yellow-100/80">
                {leadDashboardError}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {acquisitionCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{card.label}</p>
                <p className="mt-3 break-words text-3xl font-black text-white">{card.value}</p>
                <p className="mt-2 text-xs font-bold text-zinc-500">{card.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Next Money Actions</p>
                  <h3 className="mt-2 text-xl font-black text-white">Do these first today.</h3>
                </div>
                <p className="text-xs font-semibold text-zinc-500">
                  Leads to proposal to invoice to payment
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {nextMoneyActions.map((action) => (
                  <button
                    key={action.title}
                    type="button"
                    onClick={action.action}
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                      action.tone === 'emerald'
                        ? 'border-emerald-400/20 bg-emerald-400/10'
                        : action.tone === 'yellow'
                          ? 'border-yellow-400/20 bg-yellow-400/10'
                          : action.tone === 'sky'
                            ? 'border-sky-400/20 bg-sky-400/10'
                            : 'border-white/10 bg-white/[0.04]'
                    }`}
                  >
                    <p className="text-sm font-black text-white">{action.title}</p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400">{action.detail}</p>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                      {action.cta}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Hot Leads</p>
              <h3 className="mt-2 text-xl font-black text-white">Best prospects to contact.</h3>

              <div className="mt-5 space-y-3">
                {hotLeadList.length ? (
                  hotLeadList.slice(0, 4).map((lead) => (
                    <div key={lead._id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">{getLeadName(lead)}</p>
                          <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-zinc-600">
                            {getLeadStatusLabel(lead.status)} / {formatCurrency(lead.budget)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase text-zinc-400">
                          {lead.urgency || 'normal'}
                        </span>
                      </div>

                      {lead.pain && (
                        <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-500">{lead.pain}</p>
                      )}

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => sendLeadFollowUp(lead)}
                          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15"
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/leads')}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.08]"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-center">
                    <p className="text-sm font-bold text-zinc-400">No hot leads yet.</p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-600">
                      Save leads with budget, urgency, or fit score to see them here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <PaymentCollectionAgent
          insights={aiInsights}
          onPromiseSaved={fetchDashboard}
        />

        <section className="reveal reveal-delay-1 mb-12">
          <AIBillingAgent
            mode="dashboard"
            context={{ stats, invoices }}
            onApplyDraft={openAiDraftInBuilder}
            applyDraftLabel="Open In Builder"
          />
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
