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

  const openStep = (step) => {
    if (!isPro && ['/client-finder', '/leads', '/proposal-writer'].includes(step.route)) {
      navigate('/payment');
      return;
    }

    navigate(step.route);
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
              <button
                type="button"
                onClick={() => openStep(currentStep)}
                className="mt-4 rounded-xl bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-yellow-200 active:scale-95"
              >
                {currentStep.cta}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <section className="mb-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] p-4">
            <p className="text-sm font-bold text-yellow-100">{error}</p>
          </section>
        )}

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

        <section className="mb-8 rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Use this order</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Lead → Proposal → Workroom → Invoice → Payment</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-dark"
            >
              Open Dashboard
            </button>
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
