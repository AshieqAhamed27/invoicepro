import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import useDocumentMeta from '../utils/useDocumentMeta';
import { openWhatsAppShare } from '../utils/whatsapp';

const formatCurrency = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDate = (date) => {
  if (!date) return 'No date';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getDaysLate = (date) => {
  if (!date) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.max(0, Math.ceil((today - target) / (1000 * 60 * 60 * 24)));
};

const buildActionCandidates = ({ invoices = [], leadDashboard = {}, projects = [] }) => {
  const candidates = [];
  const pendingInvoices = invoices
    .filter((invoice) => invoice.documentType !== 'proposal' && invoice.status !== 'paid')
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));

  const overdueInvoice = pendingInvoices
    .map((invoice) => ({ invoice, daysLate: getDaysLate(invoice.dueDate) }))
    .filter((item) => item.daysLate > 0)
    .sort((a, b) => (b.daysLate * Number(b.invoice.amount || 0)) - (a.daysLate * Number(a.invoice.amount || 0)))[0];

  if (overdueInvoice) {
    const invoice = overdueInvoice.invoice;
    candidates.push({
      type: 'Collect payment',
      title: `Recover ${formatCurrency(invoice.amount)} from ${invoice.clientName || 'client'}`,
      priority: 98,
      value: Number(invoice.amount || 0),
      route: `/invoice/${invoice._id}`,
      cta: 'Open Invoice',
      reason: `This invoice is ${overdueInvoice.daysLate} day${overdueInvoice.daysLate === 1 ? '' : 's'} overdue. Collecting existing money is faster than finding new work.`,
      message: [
        `Hi ${invoice.clientName || 'there'},`,
        `Quick reminder for invoice ${invoice.invoiceNumber || ''} of ${formatCurrency(invoice.amount)}.`,
        `Due date: ${formatDate(invoice.dueDate)}.`,
        'Please confirm when you can complete the payment. Thank you.'
      ].join('\n\n')
    });
  }

  const acceptedProposal = (leadDashboard.acceptedProposals || [])[0];
  if (acceptedProposal) {
    candidates.push({
      type: 'Convert proposal',
      title: `Turn accepted proposal into invoice`,
      priority: 90,
      value: Number(acceptedProposal.amount || 0),
      route: `/invoice/${acceptedProposal._id}`,
      cta: 'Open Proposal',
      reason: 'Accepted work should become a payable invoice quickly so collection can start.',
      message: `Hi ${acceptedProposal.clientName || 'there'}, I am preparing the invoice and next steps for the accepted proposal. Please confirm the billing details.`
    });
  }

  const topPending = pendingInvoices[0];
  if (topPending) {
    candidates.push({
      type: 'Collect payment',
      title: `Follow up ${formatCurrency(topPending.amount)} pending invoice`,
      priority: 82,
      value: Number(topPending.amount || 0),
      route: `/invoice/${topPending._id}`,
      cta: 'Open Invoice',
      reason: 'This is pending revenue already created inside your business.',
      message: [
        `Hi ${topPending.clientName || 'there'},`,
        `This is a friendly follow-up for invoice ${topPending.invoiceNumber || ''} of ${formatCurrency(topPending.amount)}.`,
        'Please let me know if you need anything from my side to complete the payment.'
      ].join('\n\n')
    });
  }

  const hotLead = (leadDashboard.hotLeads || [])[0] || (leadDashboard.followUpsDue || [])[0];
  if (hotLead) {
    candidates.push({
      type: 'Win client',
      title: `Message ${hotLead.name || hotLead.company || 'a warm lead'}`,
      priority: 74,
      value: Number(hotLead.estimatedValue || 0),
      route: '/leads',
      cta: 'Open Pipeline',
      reason: 'Warm leads go cold when follow-up is delayed. A simple useful message can restart the deal.',
      message: `Hi ${hotLead.name || 'there'}, I was thinking about your requirement. I can help with a clear plan, timeline, and price. Would you like me to send a short proposal?`
    });
  }

  const activeProject = projects
    .map((project) => ({
      project,
      openTasks: (project.tasks || []).filter((task) => task.status !== 'done').length,
      openIssues: (project.maintenanceIssues || []).filter((issue) => issue.status !== 'done').length
    }))
    .filter((item) => item.openTasks || item.openIssues)
    .sort((a, b) => (b.openIssues + b.openTasks) - (a.openIssues + a.openTasks))[0];

  if (activeProject) {
    candidates.push({
      type: 'Protect delivery',
      title: `Move ${activeProject.project.title} forward`,
      priority: 66,
      value: Number(activeProject.project.budget || 0),
      route: '/team-workspace',
      cta: 'Open Project',
      reason: 'Delivery risk can delay payment. Clearing project blockers protects the invoice.',
      message: `Team update: let us move the highest priority task or open issue forward today so ${activeProject.project.title} stays on track.`
    });
  }

  if (!candidates.length) {
    candidates.push({
      type: 'Create opportunity',
      title: 'Find one new client opportunity today',
      priority: 55,
      value: 0,
      route: '/client-finder',
      cta: 'Find Clients',
      reason: 'There is no pending collection or warm lead yet. Start by creating one sales opportunity.',
      message: 'Hi, I help small businesses with websites, invoices, payment links, and client workflow setup. Can I share one idea that may help your business?'
    });
  }

  return candidates.sort((a, b) => b.priority - a.priority);
};

export default function MoneyGPS() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    invoices: [],
    stats: {},
    leadDashboard: {},
    projects: []
  });

  useDocumentMeta({
    title: 'Money GPS - ClientFlow AI',
    description: 'One best action for freelancers to win clients, protect projects, and collect payments today.'
  });

  useEffect(() => {
    const loadMoneyGps = async () => {
      setLoading(true);
      setError('');

      const [invoiceRes, leadRes, projectRes] = await Promise.allSettled([
        api.get('/invoices/dashboard'),
        api.get('/leads/dashboard'),
        api.get('/team-projects')
      ]);

      if (invoiceRes.status === 'rejected' && leadRes.status === 'rejected') {
        setError('Money GPS could not load your business data. Please retry after checking the backend.');
      }

      setData({
        invoices: invoiceRes.status === 'fulfilled' ? invoiceRes.value.data?.invoices || [] : [],
        stats: invoiceRes.status === 'fulfilled' ? invoiceRes.value.data?.stats || {} : {},
        leadDashboard: leadRes.status === 'fulfilled' ? leadRes.value.data || {} : {},
        projects: projectRes.status === 'fulfilled' ? projectRes.value.data?.projects || [] : []
      });

      setLoading(false);
    };

    loadMoneyGps();
  }, []);

  const actions = useMemo(() => buildActionCandidates(data), [data]);
  const topAction = actions[0];
  const moneyScore = Math.max(12, Math.min(100, Math.round(
    100
      - Number(data.stats.pending || 0) * 8
      + Number(data.stats.paid || 0) * 3
      + Number(data.leadDashboard.stats?.interested || 0) * 4
  )));

  const copyMessage = async () => {
    if (!topAction?.message) return;

    try {
      await navigator.clipboard.writeText(topAction.message);
      alert('Message copied.');
    } catch {
      window.prompt('Copy message:', topAction.message);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Flagship feature</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Money GPS: one action to move your business today.
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-zinc-400">
                ClientFlow AI checks leads, proposals, projects, and invoices, then chooses the highest-value action so freelancers know exactly what to do next.
              </p>
            </div>

            <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Money readiness</p>
              <p className="mt-2 text-4xl font-black text-white">{loading ? '--' : moneyScore}</p>
              <p className="mt-1 text-xs font-semibold text-zinc-400">Higher score means fewer blocked money actions.</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <section className="premium-panel p-8">
            <div className="h-6 w-56 animate-pulse rounded-full bg-white/5" />
            <div className="mt-6 h-52 animate-pulse rounded-3xl bg-white/5" />
          </section>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="premium-panel p-5 sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    {topAction.type}
                  </span>
                  <h2 className="mt-4 text-3xl font-black leading-tight text-white">
                    {topAction.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                    {topAction.reason}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Priority</p>
                  <p className="mt-1 text-3xl font-black text-yellow-300">{topAction.priority}</p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Ready message</p>
                <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-zinc-200">
                  {topAction.message}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(topAction.route)}
                  className="btn btn-primary px-6 py-3 text-sm"
                >
                  {topAction.cta}
                </button>
                <button
                  type="button"
                  onClick={copyMessage}
                  className="btn btn-secondary px-6 py-3 text-sm"
                >
                  Copy Message
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsAppShare(topAction.message)}
                  className="btn btn-secondary px-6 py-3 text-sm"
                >
                  Share WhatsApp
                </button>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Business snapshot</p>
                <div className="mt-4 grid gap-3">
                  {[
                    ['Collected', formatCurrency(data.stats.totalRevenue || 0)],
                    ['Pending', formatCurrency(data.stats.pendingAmount || 0)],
                    ['Open invoices', data.stats.pending || 0],
                    ['Hot leads', data.leadDashboard.hotLeads?.length || 0]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                      <p className="mt-1 text-lg font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Next best actions</p>
                <div className="mt-4 space-y-3">
                  {actions.slice(1, 5).map((action) => (
                    <button
                      key={`${action.type}-${action.title}`}
                      type="button"
                      onClick={() => navigate(action.route)}
                      className="w-full rounded-2xl border border-white/8 bg-black/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-yellow-300/25"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{action.type}</p>
                      <p className="mt-1 text-sm font-black text-white">{action.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
