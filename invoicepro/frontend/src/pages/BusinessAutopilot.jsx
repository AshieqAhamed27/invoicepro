import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { trackEvent } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';

const formatCurrency = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const todayKey = () => new Date().toISOString().slice(0, 10);

const automationStages = [
  {
    id: 'lead',
    title: 'Find the right lead',
    label: 'Client finding',
    route: '/client-finder',
    cta: 'Find clients',
    tone: 'sky',
    automates: 'Chooses target client type, search source, pain angle, and first message.',
    approval: 'User approves each lead before saving or messaging.'
  },
  {
    id: 'follow-up',
    title: 'Follow up leads',
    label: 'Lead follow-up',
    route: '/leads',
    cta: 'Open pipeline',
    tone: 'emerald',
    automates: 'Ranks hot leads and prepares 1 day, 3 day, and 7 day follow-up messages.',
    approval: 'User sends messages manually through LinkedIn, WhatsApp, or email.'
  },
  {
    id: 'proposal',
    title: 'Create proposal',
    label: 'Proposal',
    route: '/create-invoice?type=proposal',
    cta: 'Write proposal',
    tone: 'yellow',
    automates: 'Turns client problem into scope, price, timeline, validity, and next step.',
    approval: 'User checks price and scope before sharing with client.'
  },
  {
    id: 'project',
    title: 'Manage delivery',
    label: 'Project control',
    route: '/team-workspace',
    cta: 'Open team work',
    tone: 'purple',
    automates: 'Creates delivery tasks, client request tracking, collaborator roles, and handover notes.',
    approval: 'Owner controls who joins and what each freelancer can access.'
  },
  {
    id: 'invoice',
    title: 'Invoice accepted work',
    label: 'Invoice',
    route: '/create-invoice',
    cta: 'Create invoice',
    tone: 'orange',
    automates: 'Prepares invoice items, totals, tax fields, currency, public invoice link, and PDF flow.',
    approval: 'User confirms client, amount, and payment method before sending.'
  },
  {
    id: 'payment',
    title: 'Collect payment',
    label: 'Payment follow-up',
    route: '/dashboard#payment-collection-agent',
    cta: 'Collect payment',
    tone: 'red',
    automates: 'Ranks unpaid invoices, detects overdue risk, and prepares the right payment message.',
    approval: 'User sends the reminder or payment link only after review.'
  },
  {
    id: 'growth',
    title: 'Grow monthly income',
    label: 'Income growth',
    route: '/growth-plan',
    cta: 'Open growth plan',
    tone: 'emerald',
    automates: 'Calculates lead, proposal, client, retainer, and daily action targets.',
    approval: 'User chooses goal and offer before following the plan.'
  }
];

const toneClasses = {
  sky: 'border-sky-300/20 bg-sky-300/[0.06] text-sky-200',
  emerald: 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200',
  yellow: 'border-yellow-300/20 bg-yellow-300/[0.06] text-yellow-200',
  purple: 'border-purple-300/20 bg-purple-300/[0.06] text-purple-200',
  orange: 'border-orange-300/20 bg-orange-300/[0.06] text-orange-200',
  red: 'border-red-300/20 bg-red-300/[0.06] text-red-200'
};

const buildFallbackTasks = () => [
  {
    id: 'fallback-lead',
    stage: 'lead',
    title: 'Find 5 relevant prospects',
    detail: 'Start with businesses that clearly need your service and have a public contact path.',
    action: '/client-finder'
  },
  {
    id: 'fallback-proposal',
    stage: 'proposal',
    title: 'Prepare one proposal template',
    detail: 'Create a reusable offer with scope, price, validity, and next step.',
    action: '/create-invoice?type=proposal'
  },
  {
    id: 'fallback-growth',
    stage: 'growth',
    title: 'Set your monthly income target',
    detail: 'Let ClientFlow AI calculate how many leads and proposals are needed.',
    action: '/growth-plan'
  }
];

const buildAutomationTasks = ({ invoiceData, leadData }) => {
  const stats = invoiceData?.stats || {};
  const invoices = invoiceData?.invoices || [];
  const pendingInvoices = invoices.filter((invoice) => invoice.documentType !== 'proposal' && invoice.status === 'pending');
  const acceptedProposals = leadData?.acceptedProposals || [];
  const openProposals = leadData?.openProposals || [];
  const followUpsDue = leadData?.followUpsDue || [];
  const hotLeads = leadData?.hotLeads || [];
  const tasks = [];

  if (followUpsDue.length) {
    tasks.push({
      id: 'lead-follow-up',
      stage: 'follow-up',
      title: `Follow up ${followUpsDue.length} lead${followUpsDue.length === 1 ? '' : 's'}`,
      detail: 'These leads are due for contact today. Review the suggested message and send manually.',
      action: '/leads'
    });
  }

  if (hotLeads.length) {
    tasks.push({
      id: 'hot-leads',
      stage: 'lead',
      title: `Work ${Math.min(3, hotLeads.length)} hot lead${hotLeads.length === 1 ? '' : 's'}`,
      detail: 'High-fit leads should become a conversation, proposal, or clean rejection.',
      action: '/client-finder'
    });
  }

  if (openProposals.length) {
    tasks.push({
      id: 'proposal-follow-up',
      stage: 'proposal',
      title: `Follow up ${openProposals.length} open proposal${openProposals.length === 1 ? '' : 's'}`,
      detail: 'Ask if the scope needs changes or if the client is ready for the next step.',
      action: '/leads'
    });
  }

  if (acceptedProposals.length) {
    tasks.push({
      id: 'accepted-proposal',
      stage: 'invoice',
      title: 'Convert accepted proposal to invoice',
      detail: 'Accepted work should quickly become a payable invoice so collection can start.',
      action: `/invoice/${acceptedProposals[0]._id}`
    });
  }

  if (pendingInvoices.length || Number(stats.pending || 0) > 0) {
    const amount = Number(stats.pendingAmount || 0);
    tasks.push({
      id: 'pending-payment',
      stage: 'payment',
      title: `Collect pending payment${amount ? `: ${formatCurrency(amount)}` : ''}`,
      detail: 'Open the highest-priority unpaid invoice and send the right follow-up.',
      action: '/dashboard#payment-collection-agent'
    });
  }

  if (!tasks.length && Number(stats.total || 0) === 0) {
    return buildFallbackTasks();
  }

  if (!tasks.length) {
    tasks.push({
      id: 'growth-review',
      stage: 'growth',
      title: 'Review your next growth target',
      detail: 'Cashflow looks calm. Set the next weekly target for leads, proposals, and retainers.',
      action: '/growth-plan'
    });
  }

  return tasks.slice(0, 5);
};

export default function BusinessAutopilot() {
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState(null);
  const [leadData, setLeadData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doneMap, setDoneMap] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('clientflow_process_autopilot_done') || '{}');
      return stored.date === todayKey() ? stored.done || {} : {};
    } catch {
      return {};
    }
  });

  useDocumentMeta({
    title: 'Business Autopilot | ClientFlow AI',
    description: 'Automate the freelancer process from lead finding to proposals, delivery, invoicing, payment follow-up, and growth.'
  });

  useEffect(() => {
    let active = true;

    const loadAutopilot = async () => {
      setLoading(true);
      setError('');

      const [invoiceResult, leadResult] = await Promise.allSettled([
        api.get('/invoices/dashboard'),
        api.get('/leads/dashboard')
      ]);

      if (!active) return;

      if (invoiceResult.status === 'fulfilled') {
        setInvoiceData(invoiceResult.value.data || null);
      } else {
        setError(invoiceResult.reason?.friendlyMessage || 'Some automation data could not load. You can still use the manual flow.');
      }

      if (leadResult.status === 'fulfilled') {
        setLeadData(leadResult.value.data || null);
      }

      setLoading(false);
    };

    loadAutopilot();

    return () => {
      active = false;
    };
  }, []);

  const tasks = useMemo(() => buildAutomationTasks({ invoiceData, leadData }), [invoiceData, leadData]);
  const completedCount = tasks.filter((task) => doneMap[task.id]).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const nextTask = tasks.find((task) => !doneMap[task.id]) || tasks[0];

  const toggleDone = (taskId) => {
    setDoneMap((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };

      try {
        localStorage.setItem('clientflow_process_autopilot_done', JSON.stringify({
          date: todayKey(),
          done: next
        }));
      } catch { }

      trackEvent('toggle_process_autopilot_task', {
        task_id: taskId,
        done: Boolean(next[taskId])
      });

      return next;
    });
  };

  const runTask = (task) => {
    trackEvent('run_process_autopilot_task', {
      task_id: task.id,
      stage: task.stage
    });

    if (task.action.startsWith('/dashboard#')) {
      navigate('/dashboard');
      setTimeout(() => {
        const target = document.getElementById(task.action.split('#')[1]);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
      return;
    }

    navigate(task.action);
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                Full process automation
              </span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Automate the path from lead to paid work.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
              Business Autopilot keeps every freelancer process simple: find the right lead, follow up, create proposal, manage delivery, send invoice, collect payment, and grow income.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Today progress</p>
            <p className="mt-3 text-5xl font-black text-white">{progress}%</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
              {completedCount}/{tasks.length || 0} automation actions completed today.
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/30">
              <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>

        {error && (
          <section className="mb-8 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.06] p-5">
            <p className="text-sm font-semibold leading-relaxed text-yellow-100/85">{error}</p>
          </section>
        )}

        <section className="mb-12 rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Next best action</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                {loading ? 'Finding your next action...' : nextTask?.title}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
                {loading
                  ? 'Autopilot is checking your leads, proposals, invoices, and payment status.'
                  : nextTask?.detail}
              </p>
              {!loading && nextTask && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => runTask(nextTask)}
                    className="btn btn-primary px-6 py-4 text-sm"
                  >
                    Run This Step
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDone(nextTask.id)}
                    className="btn btn-secondary px-6 py-4 text-sm"
                  >
                    {doneMap[nextTask.id] ? 'Mark Not Done' : 'Mark Done'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-3">
              {(loading ? buildFallbackTasks() : tasks).map((task, index) => {
                const stage = automationStages.find((item) => item.id === task.stage) || automationStages[0];
                const done = Boolean(doneMap[task.id]);

                return (
                  <div key={task.id} className={`rounded-2xl border p-4 transition-all ${done ? 'border-emerald-300/25 bg-emerald-300/[0.08]' : 'border-white/8 bg-black/20'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${stage.tone === 'red' ? 'text-red-200' : stage.tone === 'yellow' ? 'text-yellow-200' : 'text-emerald-200'}`}>
                          {index + 1}. {stage.label}
                        </p>
                        <h3 className="mt-1 text-base font-black text-white">{task.title}</h3>
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{task.detail}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => runTask(task)}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDone(task.id)}
                          className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                            done
                              ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
                              : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/10'
                          }`}
                        >
                          {done ? 'Done' : 'Mark'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-6 max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Automation map</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Every process is automated, but user stays in control.
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              This avoids confusion and avoids unsafe automation. AI prepares the work; the freelancer approves the action.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {automationStages.map((stage) => (
              <article key={stage.id} className={`rounded-[1.5rem] border p-5 transition-all hover:-translate-y-1 ${toneClasses[stage.tone] || toneClasses.sky}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-current">{stage.label}</p>
                <h3 className="mt-3 text-xl font-black text-white">{stage.title}</h3>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI prepares</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{stage.automates}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Human approval</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{stage.approval}</p>
                  </div>
                </div>
                <Link to={stage.route} className="mt-5 inline-flex rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10">
                  {stage.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[0.06] p-6 text-center sm:p-10">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">Simple promise</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            The user should not think about tools. They should know the next business action.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
            Business Autopilot makes ClientFlow AI feel like an assistant that runs the process with them: client, proposal, project, invoice, payment, growth.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/dashboard" className="btn btn-primary px-7 py-4 text-sm">
              Open Dashboard
            </Link>
            <Link to="/outbound-autopilot" className="btn btn-secondary px-7 py-4 text-sm">
              Open Outbound Autopilot
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
