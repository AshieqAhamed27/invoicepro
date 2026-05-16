import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getUser, hasProAccess } from '../utils/auth';
import useDocumentMeta from '../utils/useDocumentMeta';

const formatCurrency = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

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
    route: '/dashboard#payment-collection-agent',
    cta: 'Collect Payment',
    metric: `${counts.pendingInvoices} pending`
  }
];

const getStepState = (steps, index) => {
  if (steps[index].done) return 'done';
  const firstOpenIndex = steps.findIndex((step) => !step.done);
  return firstOpenIndex === index ? 'current' : 'next';
};

const stateClasses = {
  done: 'border-emerald-300/25 bg-emerald-300/[0.08]',
  current: 'border-yellow-300/35 bg-yellow-300/[0.09] shadow-2xl shadow-yellow-950/20',
  next: 'border-white/8 bg-white/[0.03]'
};

const statePill = {
  done: 'Done',
  current: 'Do now',
  next: 'Next'
};

const getMaturityLabel = (score) => {
  if (score >= 90) return 'Growth-ready workflow';
  if (score >= 70) return 'Active client system';
  if (score >= 45) return 'Workflow taking shape';
  if (score >= 20) return 'Early setup';
  return 'Start the first loop';
};

const getMaturityDetail = (score) => {
  if (score >= 90) return 'You have enough workflow proof to focus on repeat clients, retention, and higher-value offers.';
  if (score >= 70) return 'Your client flow is active. Keep improving proposal follow-up, delivery proof, and payment speed.';
  if (score >= 45) return 'The system is forming. Finish the missing link so work can move cleanly from lead to payment.';
  if (score >= 20) return 'You have started. The next goal is one real client opportunity and one clear proposal path.';
  return 'Begin with one service, one target client, and one saved lead. Keep the workflow small.';
};

const proRoutes = ['/client-finder', '/leads', '/proposal-writer'];

export default function ClientFlow() {
  const navigate = useNavigate();
  const user = getUser() || {};
  const isPro = hasProAccess(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    title: 'Client Flow | ClientFlow AI',
    description: 'A guided freelancer workflow from finding clients to proposal, workroom, invoice, and payment follow-up.'
  });

  useEffect(() => {
    const loadFlow = async () => {
      setLoading(true);
      setError('');

      const [invoiceRes, leadRes, projectRes, cloudRes] = await Promise.allSettled([
        api.get('/invoices/dashboard'),
        api.get('/leads/dashboard'),
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
  }, []);

  const counts = useMemo(() => buildCounts(data), [data]);
  const steps = useMemo(() => buildSteps(counts), [counts]);
  const currentStep = steps.find((step) => !step.done) || steps[steps.length - 1];
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
      route: '/dashboard#payment-collection-agent',
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
  const workflowHealth = Math.round((workflowSignals.filter((signal) => signal.done).length / workflowSignals.length) * 100);
  const workflowBottleneck = workflowSignals.find((signal) => !signal.done) || workflowSignals[workflowSignals.length - 1];
  const maturityLabel = getMaturityLabel(workflowHealth);
  const maturityDetail = getMaturityDetail(workflowHealth);
  const weeklyPlan = useMemo(() => ([
    {
      day: 'Day 1',
      title: 'Choose one service and one target client',
      detail: 'Keep the offer narrow so outreach and proposals become easier.',
      done: Boolean(user.companyName || user.name),
      route: '/settings',
      cta: 'Set Identity'
    },
    {
      day: 'Day 2',
      title: 'Create one real client opportunity',
      detail: 'Find or save a lead that has a problem you can solve this week.',
      done: counts.leads > 0,
      route: '/client-finder',
      cta: 'Find Client'
    },
    {
      day: 'Day 3',
      title: 'Qualify the lead before proposing',
      detail: 'Check budget, urgency, problem clarity, and decision maker before writing a long proposal.',
      done: counts.hotLeads > 0 || counts.followUps > 0,
      route: '/leads',
      cta: 'Qualify Lead'
    },
    {
      day: 'Day 4',
      title: 'Send a clear proposal',
      detail: 'Make scope, price, timeline, validity, and next payment step easy to understand.',
      done: counts.proposals > 0 || counts.acceptedProposals > 0,
      route: '/proposal-writer',
      cta: 'Write Proposal'
    },
    {
      day: 'Day 5',
      title: 'Open the client workroom',
      detail: 'Move accepted work into tasks, milestones, links, notes, proof, and handover.',
      done: counts.workrooms > 0,
      route: '/client-workroom',
      cta: 'Open Workroom'
    },
    {
      day: 'Day 6',
      title: 'Save delivery proof',
      detail: 'Add files, preview links, screenshots, approvals, and notes before requesting payment.',
      done: counts.proof > 0,
      route: '/cloud-documents',
      cta: 'Save Proof'
    },
    {
      day: 'Day 7',
      title: 'Invoice and follow up',
      detail: 'Create the invoice, share the public link or PDF, and follow up until payment is collected.',
      done: counts.invoices > 0 && counts.paidInvoices > 0,
      route: counts.invoices > 0 ? '/dashboard#payment-collection-agent' : '/create-invoice',
      cta: counts.invoices > 0 ? 'Collect Payment' : 'Create Invoice'
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
      navigate('/payment');
      return;
    }

    navigate(route);
  };

  const openStep = (step) => {
    openRoute(step.route);
  };

  const enableAutopilot = () => {
    try {
      localStorage.setItem('clientflow_autopilot_enabled', '1');
      localStorage.setItem('clientflow_selected_workflow', 'business-autopilot');
    } catch {
      // Autopilot can still open even if the browser blocks local storage.
    }

    setAutopilotEnabled(true);
    openRoute('/business-autopilot');
  };

  const askGuide = (question = 'What should I do next in ClientFlow AI?') => {
    window.dispatchEvent(new CustomEvent('clientflow:open-assistant', {
      detail: { question }
    }));
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-14">
        <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-yellow-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                Guided client workflow
              </span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
              One path from client lead to collected payment.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
              Follow this order so ClientFlow AI feels simple: find a client, qualify, send proposal, manage delivery, create invoice, and collect payment.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current progress</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-5xl font-black text-white">{completion}%</p>
                <p className="mt-1 text-sm font-semibold text-zinc-500">workflow complete</p>
              </div>
              <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">
                Next action
              </span>
            </div>
            <div className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] p-4">
              <p className="text-sm font-black text-white">{currentStep.title}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-yellow-100/80">{currentStep.detail}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openStep(currentStep)}
                  className="rounded-xl bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-yellow-200 active:scale-95"
                >
                  {currentStep.cta}
                </button>
                <button
                  type="button"
                  onClick={() => askGuide(`I am on the Client Flow page. My next action is "${currentStep.title}". Explain exactly what I should do next.`)}
                  className="rounded-xl border border-yellow-300/25 px-4 py-2 text-xs font-black uppercase tracking-widest text-yellow-100 transition hover:bg-yellow-300/10 active:scale-95"
                >
                  Ask AI Guide
                </button>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <section className="mb-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] p-4">
            <p className="text-sm font-bold text-yellow-100">{error}</p>
          </section>
        )}

        <section className="mb-8 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-5 shadow-2xl shadow-black/20 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(280px,0.42fr)] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Automate the process</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {autopilotEnabled ? 'Autopilot is ready to guide the next step.' : 'Let Autopilot choose the next action for the user.'}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
                Autopilot scans the workflow and turns many tools into one simple action list: find lead, follow up, write proposal, manage delivery, invoice, and collect payment. It prepares work, but the user approves before anything is sent.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current automation target</p>
              <p className="mt-2 text-lg font-black text-white">{workflowBottleneck.label}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{workflowBottleneck.detail}</p>
              <button
                type="button"
                onClick={enableAutopilot}
                className="mt-4 w-full rounded-2xl bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-200 active:scale-95"
              >
                {autopilotEnabled ? 'Open Autopilot' : 'Enable Autopilot'}
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Leads', counts.leads],
            ['Proposals', counts.proposals],
            ['Workrooms', counts.workrooms],
            ['Invoices', counts.invoices],
            ['Pending', formatCurrency(counts.pendingAmount)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{label}</p>
              <p className="mt-3 text-2xl font-black text-white">{loading ? '...' : value}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Workflow health</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-5xl font-black text-white">{workflowHealth}%</p>
                <p className="mt-1 text-sm font-black text-emerald-100">{maturityLabel}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                8/10 path
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-emerald-50/80">{maturityDetail}</p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current bottleneck</p>
              <h3 className="mt-2 text-lg font-black text-white">{workflowBottleneck.label}</h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{workflowBottleneck.detail}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openRoute(workflowBottleneck.route)}
                  className="rounded-xl bg-emerald-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-200 active:scale-95"
                >
                  {workflowBottleneck.cta}
                </button>
                <button
                  type="button"
                  onClick={() => askGuide(`My ClientFlow AI bottleneck is "${workflowBottleneck.label}". Give me the next 3 practical actions.`)}
                  className="rounded-xl border border-emerald-300/25 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-300/10 active:scale-95"
                >
                  Ask AI
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Quality gates</p>
                <h2 className="mt-2 text-2xl font-black text-white">What makes this workflow stronger</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/launch')}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10"
              >
                Launch Center
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {workflowSignals.map((signal) => (
                <button
                  key={signal.id}
                  type="button"
                  onClick={() => openRoute(signal.route)}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    signal.done
                      ? 'border-emerald-300/20 bg-emerald-300/[0.08]'
                      : 'border-white/8 bg-black/25 hover:border-yellow-300/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black text-white">{signal.label}</p>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                      signal.done
                        ? 'bg-emerald-300 text-slate-950'
                        : 'border border-white/10 text-zinc-400'
                    }`}>
                      {signal.done ? 'Done' : 'Open'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{signal.detail}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Use this order</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Lead → Proposal → Workroom → Invoice → Payment</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-dark"
              >
                Open Dashboard
              </button>
              <button
                type="button"
                onClick={() => askGuide('Explain the ClientFlow AI workflow in simple steps and tell me where to begin today.')}
                className="btn btn-primary"
              >
                Ask AI Guide
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {steps.map((step, index) => {
              const state = getStepState(steps, index);

              return (
                <article
                  key={step.id}
                  className={`rounded-[1.5rem] border p-5 transition-all hover:-translate-y-1 hover:border-yellow-300/25 ${stateClasses[state]}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
                          {index + 1}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                          {step.label}
                        </span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          {statePill[state]}
                        </span>
                      </div>
                      <h3 className="mt-4 text-xl font-black text-white">{step.title}</h3>
                      <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{step.detail}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl border border-white/8 bg-black/25 px-4 py-3 text-left sm:text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Status</p>
                      <p className="mt-1 text-sm font-black text-white">{loading ? 'Loading' : step.metric}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openStep(step)}
                    className={`mt-5 w-full rounded-2xl px-5 py-3 text-sm font-black transition-all active:scale-95 ${
                      state === 'current'
                        ? 'bg-yellow-300 text-slate-950 hover:bg-yellow-200'
                        : 'border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {step.cta}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mb-8 rounded-[2rem] border border-sky-300/20 bg-sky-300/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">7-day execution path</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Turn the product into a weekly habit.</h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                This is the simplest path to an 8/10 workflow: complete one real business action each day, then repeat the loop with better clients.
              </p>
            </div>
            <button
              type="button"
              onClick={() => askGuide('Create a 7-day ClientFlow AI execution plan for my current workflow state.')}
              className="btn btn-secondary"
            >
              Ask AI Plan
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            {weeklyPlan.map((item) => (
              <article
                key={item.day}
                className={`rounded-[1.5rem] border p-4 transition hover:-translate-y-1 ${
                  item.done
                    ? 'border-emerald-300/20 bg-emerald-300/[0.08]'
                    : 'border-white/8 bg-black/25 hover:border-sky-300/25'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">{item.day}</p>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                    item.done
                      ? 'bg-emerald-300 text-slate-950'
                      : 'border border-white/10 text-zinc-400'
                  }`}>
                    {item.done ? 'Done' : 'Do'}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-black leading-tight text-white">{item.title}</h3>
                <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-500">{item.detail}</p>
                <button
                  type="button"
                  onClick={() => openRoute(item.route)}
                  className="mt-4 w-full rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                >
                  {item.cta}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">For beginners</p>
            <h2 className="mt-3 text-xl font-black text-white">Do not open every tool.</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              Open this Client Flow page first. It tells you the next step, then sends you to the correct feature.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">For active work</p>
            <h2 className="mt-3 text-xl font-black text-white">Use Workroom after proposal.</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              Once the client is serious, keep scope, milestones, proof, collaborators, and payment follow-up in the Client Workroom.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">For money</p>
            <h2 className="mt-3 text-xl font-black text-white">Invoice only after proof.</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              Delivery proof gives confidence to the client and makes payment follow-up more professional.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
