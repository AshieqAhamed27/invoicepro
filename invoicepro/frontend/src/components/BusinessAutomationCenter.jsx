import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { openWhatsAppShare } from '../utils/whatsapp';
import { trackEvent } from '../utils/analytics';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatMoney = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getDaysSince = (value) => {
  const date = toValidDate(value);
  if (!date) return null;

  return Math.max(0, Math.floor((startOfDay(new Date()) - startOfDay(date)) / DAY_MS));
};

const getDaysUntil = (value) => {
  const date = toValidDate(value);
  if (!date) return null;

  return Math.ceil((startOfDay(date) - startOfDay(new Date())) / DAY_MS);
};

const getLeadName = (lead = {}) =>
  lead.businessName || lead.contactName || lead.email || lead.phone || 'Unnamed lead';

const getClientKey = (value = '') => String(value || '').trim().toLowerCase();

const isOpenLead = (lead = {}) => !['won', 'lost'].includes(lead.status);

const isOpenProposal = (proposal = {}) =>
  proposal.documentType === 'proposal' &&
  !['accepted', 'rejected', 'expired'].includes(proposal.proposalStatus);

const getPaymentToneLabel = (tone = '') => {
  if (tone === 'final') return 'Final';
  if (tone === 'firm') return 'Firm';
  if (tone === 'polite') return 'Polite';
  return 'Friendly';
};

const buildPaymentMessage = (target = {}) => {
  if (target.messageVariants?.[target.tone]) return target.messageVariants[target.tone];
  if (target.followUpMessage) return target.followUpMessage;

  const dueLine = target.dueDate ? `Due date: ${formatDate(target.dueDate)}.` : 'Due date was not set.';
  const publicUrl = target.id && typeof window !== 'undefined'
    ? `${window.location.origin}/public/invoice/${target.id}`
    : '';

  return [
    `Hi ${target.clientName || 'there'},`,
    `Quick reminder for invoice ${target.invoiceNumber || ''} of ${formatMoney(target.amount)}.`,
    dueLine,
    publicUrl ? `You can review it here: ${publicUrl}` : 'Please let me know when payment can be completed.',
    'Thank you.'
  ].filter(Boolean).join('\n\n');
};

const buildLeadMessage = (lead = {}, stage = {}) => {
  const name = lead.contactName || 'there';
  const business = lead.businessName || 'your business';
  const pain = lead.pain || 'improving enquiries, trust, or payment workflow';

  if (stage.cadence === 'day7') {
    return `Hi ${name}, last quick follow-up about ${business}.\n\nI had shared an idea around ${pain}. If this is not a priority now, no problem. If useful, I can send a small fixed-scope proposal you can review.`;
  }

  if (stage.cadence === 'day3') {
    return `Hi ${name}, following up on ${business}.\n\nOne useful next step could be to fix ${pain} with a small starter package first. Would you like me to share a simple proposal?`;
  }

  return `Hi ${name}, I wanted to follow up about ${business}.\n\nI noticed an opportunity around ${pain}. Would you like me to share 2 practical improvement ideas and a fixed-price proposal?`;
};

const buildProposalMessage = (proposal = {}) => {
  const publicUrl = proposal._id && typeof window !== 'undefined'
    ? `${window.location.origin}/public/invoice/${proposal._id}`
    : '';

  return [
    `Hi ${proposal.clientName || 'there'},`,
    `Following up on proposal ${proposal.invoiceNumber || ''} for ${formatMoney(proposal.amount)}.`,
    'Please review the scope when you get a moment. If anything needs to be adjusted, I can update it.',
    publicUrl ? `Proposal link: ${publicUrl}` : '',
    'Thank you.'
  ].filter(Boolean).join('\n\n');
};

const copyText = async (text, successMessage, eventName, eventParams = {}) => {
  try {
    await navigator.clipboard.writeText(text);
    trackEvent(eventName, eventParams);
    alert(successMessage);
  } catch {
    window.prompt('Copy this:', text);
  }
};

const fallbackPaymentQueue = (invoices = []) => {
  return invoices
    .filter((invoice) => invoice.documentType !== 'proposal' && invoice.status !== 'paid')
    .map((invoice) => {
      const daysUntilDue = getDaysUntil(invoice.dueDate);
      const missingLink = !invoice.paymentLink?.shortUrl;
      const overdue = daysUntilDue !== null && daysUntilDue < 0;
      const dueSoon = daysUntilDue !== null && daysUntilDue <= 3;
      const priorityScore = Math.min(
        100,
        25 +
          (overdue ? 38 : dueSoon ? 22 : 0) +
          (missingLink ? 10 : 0) +
          Math.min(22, Math.floor(Number(invoice.amount || 0) / 2500))
      );

      return {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        daysUntilDue,
        priorityScore,
        tone: overdue ? 'firm' : 'friendly',
        reason: overdue
          ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`
          : daysUntilDue === 0
            ? 'Due today'
            : daysUntilDue
              ? `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`
              : 'No due date set',
        suggestedAction: overdue ? 'Send firm reminder' : 'Send friendly reminder'
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6);
};

export default function BusinessAutomationCenter({
  invoices = [],
  stats = {},
  leadDashboard = {},
  aiInsights = null,
  incomePlan = null,
  incomeGoal = null
}) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clientflow_dismissed_risk_alerts') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let active = true;

    const loadAutomationSignals = async () => {
      const [leadResult, recurringResult] = await Promise.allSettled([
        api.get('/leads'),
        api.get('/invoices/recurring')
      ]);

      if (!active) return;

      if (leadResult.status === 'fulfilled') {
        setLeads(Array.isArray(leadResult.value.data?.leads) ? leadResult.value.data.leads : []);
      } else {
        const fallbackLeads = [
          ...(leadDashboard.followUpsDue || []),
          ...(leadDashboard.hotLeads || [])
        ];
        setLeads(fallbackLeads);
      }

      if (recurringResult.status === 'fulfilled') {
        setRecurringSchedules(Array.isArray(recurringResult.value.data?.schedules) ? recurringResult.value.data.schedules : []);
      }

      setLoadingSignals(false);
    };

    loadAutomationSignals();

    return () => {
      active = false;
    };
  }, [leadDashboard.followUpsDue, leadDashboard.hotLeads]);

  const paymentQueue = useMemo(() => {
    const plan = Array.isArray(aiInsights?.collectionPlan) ? aiInsights.collectionPlan : [];
    return plan.length ? plan : fallbackPaymentQueue(invoices);
  }, [aiInsights, invoices]);

  const leadFollowUps = useMemo(() => {
    return leads
      .filter(isOpenLead)
      .map((lead) => {
        const daysSinceContact = getDaysSince(lead.lastContactedAt);
        const daysSinceCreated = getDaysSince(lead.createdAt);
        const daysUntilFollowUp = getDaysUntil(lead.nextFollowUpAt);
        const scheduledDue = daysUntilFollowUp !== null && daysUntilFollowUp <= 0;

        let cadence = '';
        let title = '';
        let reason = '';
        let priority = 0;

        if (scheduledDue) {
          cadence = 'scheduled';
          title = 'Scheduled lead follow-up is due';
          reason = `Follow-up date was ${formatDate(lead.nextFollowUpAt)}.`;
          priority = 96;
        } else if (daysSinceContact !== null && daysSinceContact >= 7) {
          cadence = 'day7';
          title = 'Day 7 final follow-up';
          reason = `Last contacted ${daysSinceContact} days ago.`;
          priority = 86;
        } else if (daysSinceContact !== null && daysSinceContact >= 3) {
          cadence = 'day3';
          title = 'Day 3 value follow-up';
          reason = `Last contacted ${daysSinceContact} days ago.`;
          priority = 76;
        } else if (daysSinceContact !== null && daysSinceContact >= 1) {
          cadence = 'day1';
          title = 'Day 1 gentle follow-up';
          reason = `Last contacted ${daysSinceContact} day${daysSinceContact === 1 ? '' : 's'} ago.`;
          priority = 66;
        } else if (daysSinceContact === null && daysSinceCreated !== null && daysSinceCreated >= 1) {
          cadence = 'day1';
          title = 'First lead touch is due';
          reason = `Saved ${daysSinceCreated} day${daysSinceCreated === 1 ? '' : 's'} ago.`;
          priority = 58;
        }

        if (!cadence) return null;

        const budgetBoost = Math.min(12, Math.floor(Number(lead.budget || 0) / 5000));
        const fitBoost = Math.min(12, Math.floor(Number(lead.fitScore || 0) / 10));

        return {
          ...lead,
          cadence,
          title,
          reason,
          priority: priority + budgetBoost + fitBoost,
          message: buildLeadMessage(lead, { cadence })
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6);
  }, [leads]);

  const proposalFollowUps = useMemo(() => {
    const dashboardProposals = leadDashboard.openProposals || [];
    const invoiceProposals = invoices.filter(isOpenProposal);
    const merged = [...dashboardProposals, ...invoiceProposals].reduce((acc, proposal) => {
      const key = proposal._id || proposal.id || proposal.invoiceNumber;
      if (key && !acc.some((item) => (item._id || item.id || item.invoiceNumber) === key)) {
        acc.push(proposal);
      }
      return acc;
    }, []);

    return merged
      .map((proposal) => {
        const ageDays = getDaysSince(proposal.createdAt) || 0;
        const validDays = getDaysUntil(proposal.validUntil);
        const nearExpiry = validDays !== null && validDays <= 3;
        const ignored = ageDays >= 2;

        if (!nearExpiry && !ignored) return null;

        return {
          ...proposal,
          ageDays,
          validDays,
          priority: (nearExpiry ? 90 : 65) + Math.min(15, ageDays) + Math.min(15, Math.floor(Number(proposal.amount || 0) / 5000)),
          title: nearExpiry
            ? validDays < 0
              ? 'Proposal validity passed'
              : `Proposal expires in ${validDays} day${validDays === 1 ? '' : 's'}`
            : 'Proposal follow-up is due',
          reason: ignored
            ? `Sent ${ageDays} day${ageDays === 1 ? '' : 's'} ago and still not accepted.`
            : `Validity date is ${formatDate(proposal.validUntil)}.`,
          message: buildProposalMessage(proposal)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6);
  }, [invoices, leadDashboard.openProposals]);

  const recurringCandidates = useMemo(() => {
    const existingRecurring = new Set(
      recurringSchedules.map((schedule) =>
        getClientKey(schedule.template?.clientEmail || schedule.template?.clientName)
      )
    );
    const groups = new Map();

    invoices
      .filter((invoice) => invoice.documentType !== 'proposal' && invoice.status === 'paid')
      .forEach((invoice) => {
        const key = getClientKey(invoice.clientEmail || invoice.clientName || invoice._id);
        const existing = groups.get(key) || {
          clientName: invoice.clientName,
          clientEmail: invoice.clientEmail,
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
      .filter((client) => !existingRecurring.has(getClientKey(client.clientEmail || client.clientName)))
      .map((client) => {
        const averagePaid = client.paidCount ? Math.round(client.paidAmount / client.paidCount) : 0;
        const suggestedMonthly = Math.max(999, Math.round((averagePaid * 0.75 || incomePlan?.averageDeal || 4999) / 500) * 500);
        const recurringScore = Math.min(
          100,
          35 + Math.min(30, client.paidCount * 15) + Math.min(25, Math.floor(client.paidAmount / 5000))
        );

        return {
          ...client,
          averagePaid,
          suggestedMonthly,
          recurringScore,
          reason: client.paidCount >= 2
            ? `${client.paidCount} paid invoices show repeat trust.`
            : `Paid ${formatMoney(client.paidAmount)}, good for a maintenance offer.`,
          pitch: `Hi ${client.clientName}, since we have already worked together, I can support you monthly with ${incomeGoal?.service || 'ongoing service work'} for ${formatMoney(suggestedMonthly)}/month. This keeps updates, support, and billing predictable. Would you like me to send a monthly plan?`
        };
      })
      .filter((client) => client.paidCount >= 2 || client.paidAmount >= Number(incomePlan?.averageDeal || 10000))
      .sort((a, b) => b.recurringScore - a.recurringScore)
      .slice(0, 4);
  }, [incomeGoal?.service, incomePlan?.averageDeal, invoices, recurringSchedules]);

  const riskAlerts = useMemo(() => {
    const alerts = [];
    const pendingInvoices = invoices.filter((invoice) => invoice.documentType !== 'proposal' && invoice.status !== 'paid');
    const missingPaymentLinks = pendingInvoices.filter((invoice) => !invoice.paymentLink?.shortUrl);
    const noDueDates = pendingInvoices.filter((invoice) => !invoice.dueDate);
    const overdueAmount = Number(aiInsights?.revenueOpportunity?.overdueAmount || 0);
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const expectedProgress = Math.min(100, Math.round((dayOfMonth / daysInMonth) * 100));
    const goalBehind = incomePlan && incomePlan.progress + 10 < expectedProgress;
    const leadsThisWeek = leads.filter((lead) => {
      const days = getDaysSince(lead.createdAt);
      return days !== null && days <= 7;
    }).length;

    if (overdueAmount > 0) {
      alerts.push({
        id: 'overdue-payment-risk',
        level: 'High',
        title: 'Overdue payment risk',
        detail: `${formatMoney(overdueAmount)} is overdue. Send the highest-priority follow-up first.`,
        actionLabel: 'Open Collection',
        action: () => document.getElementById('payment-collection-agent')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      });
    }

    if (paymentQueue.length > 0 && paymentQueue[0]?.priorityScore >= 70) {
      alerts.push({
        id: 'high-priority-collection',
        level: 'High',
        title: 'High-priority invoice follow-up',
        detail: `${paymentQueue[0].clientName} is ranked ${paymentQueue[0].priorityScore}/100 for collection urgency.`,
        actionLabel: 'Open Invoice',
        action: () => navigate(`/invoice/${paymentQueue[0].id || paymentQueue[0]._id}`)
      });
    }

    if (missingPaymentLinks.length > 0) {
      alerts.push({
        id: 'missing-payment-links',
        level: 'Medium',
        title: 'Payment links missing',
        detail: `${missingPaymentLinks.length} pending invoice${missingPaymentLinks.length === 1 ? '' : 's'} need payment links or UPI instructions.`,
        actionLabel: 'Fix First',
        action: () => navigate(`/invoice/${missingPaymentLinks[0]._id}`)
      });
    }

    if (noDueDates.length > 0) {
      alerts.push({
        id: 'missing-due-dates',
        level: 'Medium',
        title: 'Due dates missing',
        detail: `${noDueDates.length} pending invoice${noDueDates.length === 1 ? '' : 's'} cannot be followed up accurately without due dates.`,
        actionLabel: 'Open Invoice',
        action: () => navigate(`/invoice/${noDueDates[0]._id}`)
      });
    }

    if (leadFollowUps.length > 0) {
      alerts.push({
        id: 'lead-followups-due',
        level: 'Medium',
        title: 'Lead follow-ups are due',
        detail: `${leadFollowUps.length} lead${leadFollowUps.length === 1 ? '' : 's'} need 1/3/7-day follow-up today.`,
        actionLabel: 'Open Leads',
        action: () => navigate('/leads')
      });
    }

    if (proposalFollowUps.length > 0) {
      alerts.push({
        id: 'proposal-followups-due',
        level: 'Medium',
        title: 'Proposal follow-up needed',
        detail: `${proposalFollowUps.length} proposal${proposalFollowUps.length === 1 ? '' : 's'} are waiting for client action.`,
        actionLabel: 'Review Proposals',
        action: () => navigate('/leads')
      });
    }

    if (goalBehind) {
      alerts.push({
        id: 'income-goal-behind',
        level: 'High',
        title: 'Income goal is behind pace',
        detail: `Month progress should be around ${expectedProgress}%, but collected progress is ${incomePlan.progress}%. Add leads or collect pending invoices today.`,
        actionLabel: 'Find Clients',
        action: () => navigate('/client-finder')
      });
    }

    if (!leadsThisWeek) {
      alerts.push({
        id: 'no-new-leads-week',
        level: 'Low',
        title: 'No new leads this week',
        detail: 'A paid product should create a weekly client-finding habit. Add verified prospects today.',
        actionLabel: 'Find Clients',
        action: () => navigate('/client-finder')
      });
    }

    if (recurringCandidates.length > 0) {
      alerts.push({
        id: 'recurring-opportunity',
        level: 'Low',
        title: 'Recurring revenue opportunity',
        detail: `${recurringCandidates[0].clientName} could become a monthly client.`,
        actionLabel: 'Create Offer',
        action: () => startRecurringDraft(recurringCandidates[0])
      });
    }

    return alerts.filter((alert) => !dismissedAlerts[alert.id]).slice(0, 6);
  }, [
    aiInsights,
    dismissedAlerts,
    incomePlan,
    invoices,
    leadFollowUps,
    leads,
    navigate,
    paymentQueue,
    proposalFollowUps,
    recurringCandidates
  ]);

  const automationSummary = [
    { label: 'Payment follow-ups', value: paymentQueue.length, note: 'Ranked by urgency' },
    { label: 'Lead follow-ups', value: leadFollowUps.length, note: '1/3/7-day cadence' },
    { label: 'Proposal nudges', value: proposalFollowUps.length, note: 'Waiting for approval' },
    { label: 'Recurring chances', value: recurringCandidates.length, note: 'Monthly client potential' },
    { label: 'Risk alerts', value: riskAlerts.length, note: 'Needs attention' }
  ];

  function dismissRiskAlert(id) {
    setDismissedAlerts((prev) => {
      const next = { ...prev, [id]: true };
      try {
        localStorage.setItem('clientflow_dismissed_risk_alerts', JSON.stringify(next));
      } catch { }
      return next;
    });
  }

  function startRecurringDraft(candidate) {
    try {
      localStorage.setItem('invoicepro_ai_invoice_draft', JSON.stringify({
        documentType: 'invoice',
        clientName: candidate.clientName,
        clientEmail: candidate.clientEmail,
        serviceDescription: `Monthly ${incomeGoal?.service || 'service'} retainer for ${candidate.clientName}. Includes planned support, priority response, and predictable billing.`,
        items: [
          {
            name: `Monthly ${incomeGoal?.service || 'service'} retainer`,
            price: candidate.suggestedMonthly
          }
        ],
        dueDate: new Date(Date.now() + 7 * DAY_MS).toISOString().slice(0, 10)
      }));
    } catch { }

    trackEvent('start_recurring_client_offer', {
      value: Number(candidate.suggestedMonthly || 0),
      currency: 'INR'
    });
    navigate('/create-invoice');
  }

  const sendPaymentFollowUp = (target) => {
    openWhatsAppShare(buildPaymentMessage(target));
    trackEvent('automation_payment_followup', {
      value: Number(target.amount || 0),
      currency: 'INR',
      priority_score: target.priorityScore || 0
    });
  };

  const sendLeadFollowUp = (lead) => {
    openWhatsAppShare(lead.message, lead.phone);
    trackEvent('automation_lead_followup', {
      lead_status: lead.status || 'new',
      cadence: lead.cadence,
      value: Number(lead.budget || 0),
      currency: 'INR'
    });
  };

  const sendProposalFollowUp = (proposal) => {
    openWhatsAppShare(proposal.message);
    trackEvent('automation_proposal_followup', {
      value: Number(proposal.amount || 0),
      currency: 'INR'
    });
  };

  return (
    <section className="reveal reveal-delay-1 mb-12 overflow-hidden rounded-[2rem] border border-sky-400/20 bg-sky-400/[0.035] shadow-2xl shadow-black/20">
      <div className="border-b border-white/10 p-5 sm:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div>
            <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-300" />
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">
                Automation Center
              </p>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                Manual-send safe
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              All money-moving automations in one place.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              The app now watches payments, leads, proposals, income goal pace, recurring revenue chances,
              and risk alerts. It prepares the work automatically, while the user stays in control of sending.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Automation Health</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-4xl font-black text-white">
                {automationSummary.reduce((sum, item) => sum + Number(item.value || 0), 0)}
              </p>
              <p className="max-w-[12rem] text-right text-xs font-semibold leading-relaxed text-zinc-400">
                active recommendations waiting across the business.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {automationSummary.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.label}</p>
              <p className="mt-3 text-3xl font-black text-white">{item.value}</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{item.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-2 lg:p-10">
        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Smart Payment Follow-up</p>
              <h3 className="mt-2 text-2xl font-black text-white">Unpaid invoices ranked by urgency.</h3>
            </div>
            <Link to="/dashboard" className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white">
              Dashboard
            </Link>
          </div>

          <div className="space-y-3">
            {paymentQueue.slice(0, 3).length ? (
              paymentQueue.slice(0, 3).map((target) => (
                <div key={target.id || target._id || target.invoiceNumber} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-red-300">
                          Score {target.priorityScore || 0}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                          {getPaymentToneLabel(target.tone)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-black text-white">{target.clientName}</p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">
                        {target.invoiceNumber} / {formatMoney(target.amount)} / {target.reason || target.automationReason}
                      </p>
                    </div>
                    <div className="grid shrink-0 gap-2 sm:min-w-[180px]">
                      <button
                        type="button"
                        onClick={() => navigate(`/invoice/${target.id || target._id}`)}
                        className="rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => sendPaymentFollowUp(target)}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15"
                      >
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No payment follow-ups" detail="Create invoices with due dates and payment links to activate this queue." />
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Lead Follow-up Automation</p>
              <h3 className="mt-2 text-2xl font-black text-white">1-day, 3-day, 7-day lead nudges.</h3>
            </div>
            <Link to="/leads" className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white">
              Open Leads
            </Link>
          </div>

          <div className="space-y-3">
            {leadFollowUps.slice(0, 3).length ? (
              leadFollowUps.slice(0, 3).map((lead) => (
                <div key={lead._id || getLeadName(lead)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-yellow-300">
                        {lead.cadence.replace('day', 'Day ')}
                      </span>
                      <p className="mt-3 text-sm font-black text-white">{getLeadName(lead)}</p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{lead.title} / {lead.reason}</p>
                    </div>
                    <div className="grid shrink-0 gap-2 sm:min-w-[180px]">
                      <button
                        type="button"
                        onClick={() => sendLeadFollowUp(lead)}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(lead.message, 'Lead follow-up copied.', 'copy_automation_lead_followup', { cadence: lead.cadence })}
                        className="rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title={loadingSignals ? 'Checking lead cadence' : 'No lead follow-ups due'}
                detail="Save leads and mark contact dates to activate day 1, day 3, and day 7 follow-up prompts."
              />
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Proposal Follow-up</p>
              <h3 className="mt-2 text-2xl font-black text-white">Nudge proposals before they go cold.</h3>
            </div>
            <Link to="/leads" className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white">
              Pipeline
            </Link>
          </div>

          <div className="space-y-3">
            {proposalFollowUps.slice(0, 3).length ? (
              proposalFollowUps.slice(0, 3).map((proposal) => (
                <div key={proposal._id || proposal.id || proposal.invoiceNumber} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-sky-300">
                        {proposal.title}
                      </span>
                      <p className="mt-3 text-sm font-black text-white">{proposal.clientName}</p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">
                        {proposal.invoiceNumber} / {formatMoney(proposal.amount)} / {proposal.reason}
                      </p>
                    </div>
                    <div className="grid shrink-0 gap-2 sm:min-w-[180px]">
                      <button
                        type="button"
                        onClick={() => navigate(`/invoice/${proposal._id || proposal.id}`)}
                        className="rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => sendProposalFollowUp(proposal)}
                        className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-sky-300 transition hover:bg-sky-400/15"
                      >
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No proposal follow-ups" detail="Sent proposals will appear here when they need a client nudge." />
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">Recurring Client Detector</p>
              <h3 className="mt-2 text-2xl font-black text-white">Find clients who can become monthly.</h3>
            </div>
            <Link to="/recurring" className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white">
              Recurring
            </Link>
          </div>

          <div className="space-y-3">
            {recurringCandidates.slice(0, 3).length ? (
              recurringCandidates.slice(0, 3).map((candidate) => (
                <div key={candidate.clientEmail || candidate.clientName} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-purple-300">
                        Score {candidate.recurringScore}
                      </span>
                      <p className="mt-3 text-sm font-black text-white">{candidate.clientName}</p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">
                        {candidate.reason} Suggested: {formatMoney(candidate.suggestedMonthly)}/month
                      </p>
                    </div>
                    <div className="grid shrink-0 gap-2 sm:min-w-[180px]">
                      <button
                        type="button"
                        onClick={() => startRecurringDraft(candidate)}
                        className="rounded-xl border border-purple-400/20 bg-purple-400/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-purple-300 transition hover:bg-purple-400/15"
                      >
                        Create Offer
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(candidate.pitch, 'Recurring pitch copied.', 'copy_recurring_pitch', { value: candidate.suggestedMonthly })}
                        className="rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                      >
                        Copy Pitch
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No recurring candidates yet" detail="Paid repeat clients will appear here when a monthly offer makes sense." />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 p-5 sm:p-8 lg:p-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Risk Alerts</p>
            <h3 className="mt-2 text-2xl font-black text-white">Problems the app is watching for.</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissedAlerts({});
              try {
                localStorage.removeItem('clientflow_dismissed_risk_alerts');
              } catch { }
            }}
            className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10"
          >
            Reset Alerts
          </button>
        </div>

        {riskAlerts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {riskAlerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-red-400/15 bg-red-400/[0.08] p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                    alert.level === 'High'
                      ? 'border-red-400/20 bg-red-400/10 text-red-300'
                      : alert.level === 'Medium'
                        ? 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300'
                        : 'border-sky-400/20 bg-sky-400/10 text-sky-300'
                  }`}>
                    {alert.level}
                  </span>
                  <button
                    type="button"
                    onClick={() => dismissRiskAlert(alert.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-600 transition hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
                <h4 className="text-lg font-black text-white">{alert.title}</h4>
                <p className="mt-2 min-h-[54px] text-sm font-semibold leading-relaxed text-zinc-400">{alert.detail}</p>
                <button
                  type="button"
                  onClick={alert.action}
                  className="mt-5 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                >
                  {alert.actionLabel}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No risk alerts right now" detail="ClientFlow AI will warn you when payments, leads, proposals, or income goals need attention." />
        )}
      </div>
    </section>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{detail}</p>
    </div>
  );
}
