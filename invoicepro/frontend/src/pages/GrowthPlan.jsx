import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { openWhatsAppShare } from '../utils/whatsapp';
import { trackEvent } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_GOAL = {
  target: 50000,
  averageDeal: 12500,
  closeRate: 25,
  proposalRate: 35,
  hoursPerWeek: 20,
  service: 'Website, design, or business service package'
};

const formatMoney = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const clampNumber = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
};

const roundToNearest = (value, nearest = 500) =>
  Math.max(nearest, Math.round(Number(value || 0) / nearest) * nearest);

const normalizeGoal = (goal = {}) => ({
  target: clampNumber(goal.target, DEFAULT_GOAL.target, 1000, 100000000),
  averageDeal: clampNumber(goal.averageDeal, DEFAULT_GOAL.averageDeal, 500, 10000000),
  closeRate: clampNumber(goal.closeRate, DEFAULT_GOAL.closeRate, 5, 100),
  proposalRate: clampNumber(goal.proposalRate, DEFAULT_GOAL.proposalRate, 5, 100),
  hoursPerWeek: clampNumber(goal.hoursPerWeek, DEFAULT_GOAL.hoursPerWeek, 1, 80),
  service: String(goal.service || DEFAULT_GOAL.service).trim() || DEFAULT_GOAL.service
});

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getDaysUntil = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return Math.ceil((startOfDay(date) - startOfDay(new Date())) / DAY_MS);
};

const getDaysSince = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((startOfDay(new Date()) - startOfDay(date)) / DAY_MS));
};

const getLeadName = (lead = {}) =>
  lead.businessName || lead.contactName || lead.email || lead.phone || 'Unnamed lead';

const getClientKey = (invoice = {}) =>
  String(invoice.clientEmail || invoice.clientName || invoice._id || '').trim().toLowerCase();

const isBillableInvoice = (invoice = {}) => invoice.documentType !== 'proposal';
const isOpenLead = (lead = {}) => !['won', 'lost'].includes(String(lead.status || 'new'));
const isOpenProposal = (invoice = {}) =>
  invoice.documentType === 'proposal' &&
  !['accepted', 'rejected', 'expired'].includes(String(invoice.proposalStatus || 'draft'));

const isCurrentMonth = (value) => {
  const date = toDate(value);
  if (!date) return false;

  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

const buildIncomePlan = ({ goal, monthlyCollected, pendingAmount }) => {
  const target = Math.max(1000, Number(goal.target || DEFAULT_GOAL.target));
  const averageDeal = Math.max(500, Number(goal.averageDeal || DEFAULT_GOAL.averageDeal));
  const closeRate = clampNumber(goal.closeRate, DEFAULT_GOAL.closeRate, 5, 100);
  const proposalRate = clampNumber(goal.proposalRate, DEFAULT_GOAL.proposalRate, 5, 100);
  const remaining = Math.max(0, target - monthlyCollected);
  const clientsNeeded = Math.max(1, Math.ceil(remaining / averageDeal));
  const proposalsNeeded = Math.max(1, Math.ceil(clientsNeeded / (closeRate / 100)));
  const leadsNeeded = Math.max(1, Math.ceil(proposalsNeeded / (proposalRate / 100)));
  const dailyLeadTarget = Math.max(1, Math.ceil(leadsNeeded / 20));
  const weeklyLeadTarget = Math.max(dailyLeadTarget, Math.ceil(leadsNeeded / 4));
  const progress = Math.min(100, Math.round((monthlyCollected / target) * 100));
  const projectedWithPending = Math.min(100, Math.round(((monthlyCollected + pendingAmount) / target) * 100));

  return {
    target,
    averageDeal,
    closeRate,
    proposalRate,
    remaining,
    clientsNeeded,
    proposalsNeeded,
    leadsNeeded,
    dailyLeadTarget,
    weeklyLeadTarget,
    progress,
    projectedWithPending
  };
};

const buildRecurringCandidates = ({ invoices, goal }) => {
  const groups = new Map();

  invoices
    .filter((invoice) => isBillableInvoice(invoice) && invoice.status === 'paid')
    .forEach((invoice) => {
      const key = getClientKey(invoice);
      if (!key) return;

      const existing = groups.get(key) || {
        clientName: invoice.clientName || 'Client',
        clientEmail: invoice.clientEmail || '',
        paidCount: 0,
        paidAmount: 0,
        lastPaidAt: invoice.paidAt || invoice.updatedAt || invoice.createdAt,
        services: []
      };

      existing.paidCount += 1;
      existing.paidAmount += Number(invoice.amount || 0);
      existing.lastPaidAt = invoice.paidAt || existing.lastPaidAt;
      if (invoice.serviceDescription) existing.services.push(invoice.serviceDescription);
      groups.set(key, existing);
    });

  return Array.from(groups.values())
    .map((client) => {
      const averagePaid = client.paidCount ? Math.round(client.paidAmount / client.paidCount) : 0;
      const suggestedMonthly = roundToNearest(Math.max(999, averagePaid * 0.75 || goal.averageDeal * 0.55), 500);
      const score = Math.min(100, 30 + client.paidCount * 18 + Math.floor(client.paidAmount / 5000));

      return {
        ...client,
        averagePaid,
        suggestedMonthly,
        score,
        reason: client.paidCount >= 2
          ? `${client.paidCount} paid invoices show repeat trust.`
          : `Paid ${formatMoney(client.paidAmount)} once, so a small monthly support offer can be tested.`,
        pitch: `Hi ${client.clientName}, since we have already worked together, I can support you monthly with ${goal.service} for ${formatMoney(suggestedMonthly)}/month. This keeps updates, support, and billing predictable. Would you like me to send a monthly plan?`
      };
    })
    .filter((client) => client.paidCount >= 2 || client.paidAmount >= Number(goal.averageDeal || 10000))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
};

const buildRetentionMessages = ({ invoices, goal }) => {
  const paidClients = buildRecurringCandidates({ invoices, goal });
  const fallbackPaid = invoices
    .filter((invoice) => isBillableInvoice(invoice) && invoice.status === 'paid')
    .slice(0, 3)
    .map((invoice) => ({
      clientName: invoice.clientName || 'Client',
      clientEmail: invoice.clientEmail || '',
      paidAmount: Number(invoice.amount || 0),
      paidCount: 1,
      suggestedMonthly: roundToNearest(Math.max(999, Number(invoice.amount || 0) * 0.75), 500),
      reason: 'Completed paid work is the best moment to ask for repeat business.'
    }));

  const clients = paidClients.length ? paidClients : fallbackPaid;

  return clients.slice(0, 3).map((client) => ({
    clientName: client.clientName,
    paidAmount: client.paidAmount,
    testimonial: `Hi ${client.clientName}, thank you for working with me. If the work helped your business, could you share a short testimonial I can use in my portfolio?`,
    referral: `Hi ${client.clientName}, glad we completed this work. If you know another business owner who needs ${goal.service}, I would be happy if you can introduce us.`,
    monthly: `Hi ${client.clientName}, I can also support you monthly with ${goal.service} for ${formatMoney(client.suggestedMonthly)}/month so updates and improvements stay consistent. Would you like me to send a simple monthly plan?`,
    nextProject: `Hi ${client.clientName}, I reviewed the completed work and found one next improvement idea. Would you like me to share a small fixed-scope proposal?`
  }));
};

const buildPriceCoach = ({ invoices, goal }) => {
  const paidInvoices = invoices.filter((invoice) => isBillableInvoice(invoice) && invoice.status === 'paid');
  const paidTotal = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const averagePaid = paidInvoices.length ? Math.round(paidTotal / paidInvoices.length) : 0;
  const basePrice = averagePaid || goal.averageDeal;
  const nextSafePrice = roundToNearest(Math.max(goal.averageDeal, basePrice * 1.2), 500);

  return {
    averagePaid,
    nextSafePrice,
    confidence: paidInvoices.length >= 5 ? 'High' : paidInvoices.length >= 2 ? 'Medium' : 'Starting',
    reason: paidInvoices.length
      ? `Your average paid invoice is ${formatMoney(averagePaid)}. The next safe quote should move upward without shocking the buyer.`
      : `No paid invoice history yet. Start with your goal average deal of ${formatMoney(goal.averageDeal)}.`,
    packages: [
      {
        name: 'Starter',
        price: roundToNearest(nextSafePrice * 0.65, 500),
        note: 'Small first step for new clients'
      },
      {
        name: 'Growth',
        price: nextSafePrice,
        note: 'Main package for monthly target'
      },
      {
        name: 'Premium',
        price: roundToNearest(nextSafePrice * 1.6, 500),
        note: 'Urgent or deeper scope'
      }
    ]
  };
};

const buildDailyActions = ({ invoices, leads, incomePlan, goal, recurringCandidates }) => {
  const actions = [];
  const pendingInvoices = invoices
    .filter((invoice) => isBillableInvoice(invoice) && invoice.status !== 'paid')
    .map((invoice) => ({ ...invoice, daysUntilDue: getDaysUntil(invoice.dueDate) }))
    .sort((a, b) => {
      const aOverdue = a.daysUntilDue !== null && a.daysUntilDue < 0 ? 1 : 0;
      const bOverdue = b.daysUntilDue !== null && b.daysUntilDue < 0 ? 1 : 0;
      return bOverdue - aOverdue || Number(b.amount || 0) - Number(a.amount || 0);
    });
  const topInvoice = pendingInvoices[0];
  const dueLead = leads
    .filter(isOpenLead)
    .map((lead) => ({
      ...lead,
      daysUntilFollowUp: getDaysUntil(lead.nextFollowUpAt),
      ageDays: getDaysSince(lead.lastContactedAt || lead.createdAt)
    }))
    .filter((lead) => (lead.daysUntilFollowUp !== null && lead.daysUntilFollowUp <= 0) || Number(lead.ageDays || 0) >= 1)
    .sort((a, b) => Number(b.budget || 0) - Number(a.budget || 0))[0];
  const openProposal = invoices
    .filter(isOpenProposal)
    .map((invoice) => ({ ...invoice, ageDays: getDaysSince(invoice.createdAt), validDays: getDaysUntil(invoice.validUntil) }))
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];

  if (topInvoice) {
    const overdueText = topInvoice.daysUntilDue !== null && topInvoice.daysUntilDue < 0
      ? `${Math.abs(topInvoice.daysUntilDue)} day${Math.abs(topInvoice.daysUntilDue) === 1 ? '' : 's'} overdue`
      : topInvoice.daysUntilDue === 0
        ? 'due today'
        : topInvoice.daysUntilDue
          ? `due in ${topInvoice.daysUntilDue} day${topInvoice.daysUntilDue === 1 ? '' : 's'}`
          : 'missing due date';

    actions.push({
      id: `collect-${topInvoice._id}`,
      type: 'Collect',
      title: `Collect ${formatMoney(topInvoice.amount)} from ${topInvoice.clientName || 'client'}`,
      detail: `This invoice is ${overdueText}. Payment already exists in the pipeline, so collect before chasing new work.`,
      impact: formatMoney(topInvoice.amount),
      route: `/invoice/${topInvoice._id}`,
      cta: 'Open Invoice',
      message: `Hi ${topInvoice.clientName || 'there'}, quick reminder for invoice ${topInvoice.invoiceNumber || ''} of ${formatMoney(topInvoice.amount)}. Please let me know when payment can be completed. Thank you.`
    });
  }

  if (dueLead) {
    actions.push({
      id: `lead-${dueLead._id || getLeadName(dueLead)}`,
      type: 'Win',
      title: `Follow up ${getLeadName(dueLead)}`,
      detail: 'Warm leads become cold when there is no follow-up. Send a useful message and move toward a proposal.',
      impact: formatMoney(dueLead.budget),
      route: '/leads',
      cta: 'Open Leads',
      message: `Hi ${dueLead.contactName || 'there'}, I was thinking about ${dueLead.businessName || 'your business'}. I can share 2 practical improvement ideas and a fixed-price proposal if useful.`
    });
  }

  if (openProposal) {
    actions.push({
      id: `proposal-${openProposal._id}`,
      type: 'Close',
      title: `Push proposal for ${openProposal.clientName || 'client'}`,
      detail: 'A sent proposal should not sit idle. Follow up, remove doubt, and ask for a clear yes or adjustment.',
      impact: formatMoney(openProposal.amount),
      route: `/invoice/${openProposal._id}`,
      cta: 'Open Proposal',
      message: `Hi ${openProposal.clientName || 'there'}, following up on proposal ${openProposal.invoiceNumber || ''}. If the scope looks good, I can convert it into the next payment step. If anything needs change, I can adjust it.`
    });
  }

  actions.push({
    id: 'new-leads',
    type: 'Build',
    title: `Add ${incomePlan.dailyLeadTarget} new lead${incomePlan.dailyLeadTarget === 1 ? '' : 's'} today`,
    detail: `Your ${formatMoney(incomePlan.target)} target needs ${incomePlan.leadsNeeded} leads this month. Save only prospects with a real contact path.`,
    impact: `${incomePlan.dailyLeadTarget} leads`,
    route: '/client-finder',
    cta: 'Find Clients',
    message: `Daily target: find ${incomePlan.dailyLeadTarget} qualified lead${incomePlan.dailyLeadTarget === 1 ? '' : 's'} for ${goal.service}.`
  });

  if (recurringCandidates[0]) {
    actions.push({
      id: `recurring-${recurringCandidates[0].clientEmail || recurringCandidates[0].clientName}`,
      type: 'Retain',
      title: `Offer monthly work to ${recurringCandidates[0].clientName}`,
      detail: recurringCandidates[0].reason,
      impact: `${formatMoney(recurringCandidates[0].suggestedMonthly)}/month`,
      route: '/recurring',
      cta: 'Recurring',
      message: recurringCandidates[0].pitch
    });
  }

  return actions.slice(0, 6);
};

const buildJobEscapeScore = ({ incomePlan, leads, invoices, recurringCandidates }) => {
  const openLeads = leads.filter(isOpenLead).length;
  const paidInvoices = invoices.filter((invoice) => isBillableInvoice(invoice) && invoice.status === 'paid').length;
  const pendingInvoices = invoices.filter((invoice) => isBillableInvoice(invoice) && invoice.status !== 'paid');
  const overdueCount = pendingInvoices.filter((invoice) => {
    const days = getDaysUntil(invoice.dueDate);
    return days !== null && days < 0;
  }).length;

  const progressScore = Math.min(100, Math.max(incomePlan.progress, incomePlan.projectedWithPending * 0.75));
  const pipelineScore = Math.min(100, Math.round((openLeads / Math.max(1, incomePlan.leadsNeeded)) * 100));
  const collectionScore = Math.max(10, 100 - overdueCount * 18 - pendingInvoices.length * 4);
  const proofScore = Math.min(100, paidInvoices * 12 + recurringCandidates.length * 22);
  const score = Math.round(progressScore * 0.4 + pipelineScore * 0.2 + collectionScore * 0.25 + proofScore * 0.15);

  const label = score >= 78
    ? 'Stable freelancer'
    : score >= 58
      ? 'Building stability'
      : score >= 38
        ? 'Needs more pipeline'
        : 'High 9-to-5 risk';

  const advice = score >= 78
    ? 'Keep collecting on time and turn paid clients into monthly retainers.'
    : score >= 58
      ? 'You are building momentum. Add leads daily and convert open proposals quickly.'
      : score >= 38
        ? 'The business needs more leads, proposals, and payment collection this week.'
        : 'Prioritize cash collection and daily outreach before taking more unpaid work.';

  return {
    score,
    label,
    advice,
    parts: [
      ['Income progress', `${incomePlan.progress}%`, 'Collected against monthly target'],
      ['Pipeline coverage', `${pipelineScore}%`, `${openLeads}/${incomePlan.leadsNeeded} open leads`],
      ['Collection health', `${collectionScore}%`, `${pendingInvoices.length} pending, ${overdueCount} overdue`],
      ['Repeat potential', `${proofScore}%`, `${recurringCandidates.length} retainer candidates`]
    ]
  };
};

const copyText = async (text, successMessage, eventName) => {
  try {
    await navigator.clipboard.writeText(text);
    if (eventName) trackEvent(eventName);
    alert(successMessage);
  } catch {
    window.prompt('Copy this:', text);
  }
};

export default function GrowthPlan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [saving, setSaving] = useState(false);

  useDocumentMeta({
    title: 'Growth Plan - ClientFlow AI',
    description: 'A freelancer stability plan that turns income goals into daily lead, proposal, payment, price, and retention actions.'
  });

  useEffect(() => {
    let active = true;

    const loadGrowthPlan = async () => {
      setLoading(true);
      setError('');

      const [invoiceResult, leadResult, goalResult] = await Promise.allSettled([
        api.get('/invoices'),
        api.get('/leads'),
        api.get('/business-goal')
      ]);

      if (!active) return;

      if (invoiceResult.status === 'fulfilled') {
        setInvoices(invoiceResult.value.data?.invoices || []);
      } else {
        setError('Growth Plan could not load invoices. Please retry after checking the backend.');
      }

      if (leadResult.status === 'fulfilled') {
        setLeads(leadResult.value.data?.leads || []);
      }

      if (goalResult.status === 'fulfilled') {
        setGoal(normalizeGoal(goalResult.value.data?.goal));
      } else {
        try {
          setGoal(normalizeGoal(JSON.parse(localStorage.getItem('invoicepro_income_goal') || '{}')));
        } catch {
          setGoal(DEFAULT_GOAL);
        }
      }

      setLoading(false);
    };

    loadGrowthPlan();

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const billable = invoices.filter(isBillableInvoice);
    const paid = billable.filter((invoice) => invoice.status === 'paid');
    const pending = billable.filter((invoice) => invoice.status !== 'paid');
    const monthlyCollected = paid
      .filter((invoice) => isCurrentMonth(invoice.paidAt || invoice.updatedAt || invoice.createdAt))
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const pendingAmount = pending.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    const paidAmount = paid.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

    return {
      paid,
      pending,
      paidAmount,
      pendingAmount,
      monthlyCollected,
      openProposals: invoices.filter(isOpenProposal),
      openLeads: leads.filter(isOpenLead)
    };
  }, [invoices, leads]);

  const incomePlan = useMemo(
    () => buildIncomePlan({ goal, monthlyCollected: metrics.monthlyCollected, pendingAmount: metrics.pendingAmount }),
    [goal, metrics.monthlyCollected, metrics.pendingAmount]
  );

  const recurringCandidates = useMemo(
    () => buildRecurringCandidates({ invoices, goal }),
    [goal, invoices]
  );

  const retentionMessages = useMemo(
    () => buildRetentionMessages({ invoices, goal }),
    [goal, invoices]
  );

  const priceCoach = useMemo(
    () => buildPriceCoach({ invoices, goal }),
    [goal, invoices]
  );

  const jobEscape = useMemo(
    () => buildJobEscapeScore({ incomePlan, leads, invoices, recurringCandidates }),
    [incomePlan, leads, invoices, recurringCandidates]
  );

  const dailyActions = useMemo(
    () => buildDailyActions({ invoices, leads, incomePlan, goal, recurringCandidates }),
    [goal, incomePlan, invoices, leads, recurringCandidates]
  );

  const saveGoal = async () => {
    const nextGoal = normalizeGoal(goal);
    setGoal(nextGoal);
    setSaving(true);

    try {
      await api.put('/business-goal', nextGoal);
      localStorage.setItem('invoicepro_income_goal', JSON.stringify(nextGoal));
      alert('Growth goal saved.');
      trackEvent('save_growth_plan_goal');
    } catch (err) {
      alert(err?.response?.data?.message || 'Could not save growth goal.');
    } finally {
      setSaving(false);
    }
  };

  const updateGoal = (field, value) => {
    setGoal((prev) => ({
      ...prev,
      [field]: field === 'service' ? value : Number(value || 0)
    }));
  };

  const createPackageDraft = (pkg) => {
    try {
      localStorage.setItem('invoicepro_ai_invoice_draft', JSON.stringify({
        documentType: 'proposal',
        serviceDescription: `${pkg.name} package for ${goal.service}`,
        items: [{ name: `${pkg.name} package`, price: pkg.price }],
        validUntil: new Date(Date.now() + 7 * DAY_MS).toISOString().slice(0, 10)
      }));
    } catch { }

    trackEvent('create_growth_plan_package_draft', { value: Number(pkg.price || 0), currency: 'INR' });
    navigate('/create-invoice?type=proposal');
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-10 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-stretch">
          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                Freelancer survival and growth plan
              </p>
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Build stable freelance income so going back to a 9-to-5 is not the backup plan.
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              Set a monthly income target. ClientFlow AI works backward into leads, proposals, prices,
              payment collection, recurring clients, and daily actions.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => document.getElementById('daily-growth-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="btn btn-primary px-6 py-3 text-sm"
              >
                See Today Plan
              </button>
              <button
                type="button"
                onClick={() => navigate('/client-finder')}
                className="btn btn-secondary px-6 py-3 text-sm"
              >
                Find Clients
              </button>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Freelance Stability Score</p>
            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="text-6xl font-black tracking-tight text-white">{loading ? '--' : jobEscape.score}</p>
              <span className={`mb-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                jobEscape.score >= 78
                  ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                  : jobEscape.score >= 58
                    ? 'border-sky-300/20 bg-sky-300/10 text-sky-200'
                    : 'border-yellow-300/20 bg-yellow-300/10 text-yellow-200'
              }`}>
                {loading ? 'Checking' : jobEscape.label}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">{jobEscape.advice}</p>
            <div className="mt-6 grid gap-3">
              {jobEscape.parts.map(([label, value, note]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-black text-white">{label}</p>
                    <p className="shrink-0 text-sm font-black text-emerald-300">{value}</p>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-zinc-600">{note}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <section className="premium-panel p-6 sm:p-8">
            <div className="h-6 w-56 animate-pulse rounded-full bg-white/5" />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-40 animate-pulse rounded-3xl bg-white/5" />
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="reveal reveal-delay-1 mb-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-400/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Income Goal</p>
                    <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Work backward plan
                    </span>
                  </div>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {formatMoney(incomePlan.target)} monthly target.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                    The plan converts your income target into how many clients, proposals, and leads you need this month.
                  </p>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Collected this month</p>
                      <p className="text-xs font-black text-white">{incomePlan.progress}%</p>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${incomePlan.progress}%` }} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricMini label="Collected" value={formatMoney(metrics.monthlyCollected)} />
                      <MetricMini label="Pending" value={formatMoney(metrics.pendingAmount)} tone="yellow" />
                      <MetricMini label="Remaining" value={formatMoney(incomePlan.remaining)} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <GoalInput label="Monthly Target" prefix="Rs" value={goal.target} min="1000" onChange={(value) => updateGoal('target', value)} />
                    <GoalInput label="Average Deal" prefix="Rs" value={goal.averageDeal} min="500" onChange={(value) => updateGoal('averageDeal', value)} />
                    <GoalInput label="Close Rate %" value={goal.closeRate} min="5" max="100" onChange={(value) => updateGoal('closeRate', value)} />
                    <GoalInput label="Lead to Proposal %" value={goal.proposalRate} min="5" max="100" onChange={(value) => updateGoal('proposalRate', value)} />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Service You Sell</p>
                    <input
                      type="text"
                      value={goal.service}
                      onChange={(event) => updateGoal('service', event.target.value)}
                      className="input mt-3 bg-black/30 py-3 text-sm font-bold"
                      placeholder="Website design, marketing, consulting..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveGoal}
                    disabled={saving}
                    className="btn btn-primary px-6 py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Growth Goal'}
                  </button>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                {[
                  ['Clients needed', incomePlan.clientsNeeded, `At ${formatMoney(incomePlan.averageDeal)} average deal`],
                  ['Proposals needed', incomePlan.proposalsNeeded, `${incomePlan.closeRate}% close rate`],
                  ['Leads needed', incomePlan.leadsNeeded, `${incomePlan.proposalRate}% proposal rate`],
                  ['Daily leads', incomePlan.dailyLeadTarget, `${incomePlan.weeklyLeadTarget} per week`],
                  ['With pending', `${incomePlan.projectedWithPending}%`, 'Collected plus pending'],
                  ['Open leads', metrics.openLeads.length, 'Active sales pipeline']
                ].map(([label, value, note]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                    <p className="mt-3 text-3xl font-black text-white">{value}</p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="daily-growth-actions" className="reveal reveal-delay-1 mb-10">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Daily Freelancer Action Plan</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Do these before the day ends.
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(
                    dailyActions.map((action, index) => `${index + 1}. ${action.title} - ${action.detail}`).join('\n'),
                    'Daily growth plan copied.',
                    'copy_growth_daily_plan'
                  )}
                  className="btn btn-secondary px-6 py-3 text-xs"
                >
                  Copy Plan
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {dailyActions.map((action, index) => (
                  <article key={action.id} className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-sky-300/25">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-300 text-sm font-black text-slate-950">
                          {index + 1}
                        </span>
                        <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-200">
                          {action.type}
                        </span>
                      </div>
                      <p className="shrink-0 text-xs font-black text-emerald-300">{action.impact}</p>
                    </div>
                    <h3 className="text-lg font-black leading-tight text-white">{action.title}</h3>
                    <p className="mt-3 min-h-[70px] text-sm font-semibold leading-relaxed text-zinc-400">{action.detail}</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => navigate(action.route)}
                        className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                      >
                        {action.cta}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(action.message, 'Message copied.', 'copy_growth_action_message')}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.08]"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => openWhatsAppShare(action.message)}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15"
                      >
                        WhatsApp
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="reveal reveal-delay-2 mb-10 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-[2rem] border border-purple-400/20 bg-purple-400/[0.045] p-5 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-300">Price Upgrade Coach</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Charge better without guessing.</h2>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{priceCoach.reason}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                  {priceCoach.packages.map((pkg) => (
                    <button
                      key={pkg.name}
                      type="button"
                      onClick={() => createPackageDraft(pkg)}
                      className="rounded-2xl border border-white/10 bg-black/25 p-5 text-left transition hover:-translate-y-1 hover:border-purple-300/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-black text-white">{pkg.name}</p>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{pkg.note}</p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-purple-200">{formatMoney(pkg.price)}</p>
                      </div>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-purple-200">Create proposal</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 sm:p-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Recurring Client Builder</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Turn paid clients into monthly income.</h2>
                  </div>
                  <Link to="/recurring" className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white">
                    Recurring
                  </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {recurringCandidates.length ? recurringCandidates.map((client) => (
                    <div key={client.clientEmail || client.clientName} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-base font-black text-white">{client.clientName}</p>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{client.reason}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-200">
                          {client.score}
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-black text-emerald-300">{formatMoney(client.suggestedMonthly)}/month</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => copyText(client.pitch, 'Monthly client pitch copied.', 'copy_growth_recurring_pitch')}
                          className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                        >
                          Copy Pitch
                        </button>
                        <button
                          type="button"
                          onClick={() => openWhatsAppShare(client.pitch)}
                          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15"
                        >
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  )) : (
                    <EmptyState
                      title="No recurring candidates yet"
                      detail="Paid repeat clients will appear here when a monthly support offer makes sense."
                    />
                  )}
                </div>
              </div>
            </section>

            <section className="reveal reveal-delay-2 rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 sm:p-8 lg:p-10">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Client Retention Agent</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-white">After payment, ask for the next business move.</h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn btn-secondary px-6 py-3 text-xs"
                >
                  Dashboard
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {retentionMessages.length ? retentionMessages.map((client) => (
                  <div key={client.clientName} className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
                    <p className="text-lg font-black text-white">{client.clientName}</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">{formatMoney(client.paidAmount)} paid history</p>
                    <div className="mt-5 grid gap-3">
                      {[
                        ['Testimonial', client.testimonial],
                        ['Referral', client.referral],
                        ['Monthly Plan', client.monthly],
                        ['Next Project', client.nextProject]
                      ].map(([label, message]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => copyText(message, `${label} message copied.`, 'copy_growth_retention_message')}
                          className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-yellow-300/25 hover:bg-yellow-300/10"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{label}</p>
                          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-zinc-400">{message}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )) : (
                  <EmptyState
                    title="No paid clients yet"
                    detail="After your first paid invoice, ClientFlow AI will prepare testimonial, referral, monthly plan, and next project messages."
                  />
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function MetricMini({ label, value, tone = 'white' }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone === 'yellow' ? 'text-yellow-300' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function GoalInput({ label, prefix = '', value, min, max, onChange }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        {prefix && <span className="text-sm font-black text-zinc-500">{prefix}</span>}
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input bg-black/30 py-3 text-lg font-black"
        />
      </div>
    </div>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center md:col-span-2 xl:col-span-3">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-relaxed text-zinc-500">{detail}</p>
    </div>
  );
}
