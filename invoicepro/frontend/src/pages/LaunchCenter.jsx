import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { getUser } from '../utils/auth';

const statusClass = (ready) =>
  ready
    ? 'border-emerald-400/15 bg-emerald-400/10 text-emerald-300'
    : 'border-yellow-400/15 bg-yellow-400/10 text-yellow-200';

const formatMoney = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const CheckPill = ({ ready }) => (
  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass(ready)}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-300' : 'bg-yellow-300 animate-pulse'}`} />
    {ready ? 'Ready' : 'Action'}
  </span>
);

const LaunchCheck = ({ check }) => (
  <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.02] p-6">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{check.category}</p>
        <h3 className="mt-2 text-lg font-black leading-tight text-white">{check.label}</h3>
      </div>
      <CheckPill ready={check.ready} />
    </div>
    <p className="text-sm font-medium leading-relaxed text-zinc-400">{check.ready ? check.doneText : check.action}</p>
    {check.path && !check.ready && (
      <Link
        to={check.path}
        className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-white transition-all hover:bg-white/10"
      >
        Open
      </Link>
    )}
  </div>
);

export default function LaunchCenter() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getUser() || {});
  const [health, setHealth] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLaunchData = async () => {
      setLoading(true);
      setError('');

      const loadHealth = async () => {
        try {
          return await api.get('/health/launch-readiness');
        } catch {
          return api.get('/health/details');
        }
      };

      const [healthRes, dashboardRes, pricingRes, subscriptionRes, userRes] = await Promise.allSettled([
        loadHealth(),
        api.get('/invoices/dashboard'),
        api.get('/payment/plans'),
        api.get('/payment/subscription/status'),
        api.get('/auth/me')
      ]);

      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data || null);
      if (dashboardRes.status === 'fulfilled') setDashboard(dashboardRes.value.data || null);
      if (pricingRes.status === 'fulfilled') setPricing(pricingRes.value.data || null);
      if (subscriptionRes.status === 'fulfilled') setSubscription(subscriptionRes.value.data?.subscription || null);
      if (userRes.status === 'fulfilled' && userRes.value.data?.user) {
        setUser(userRes.value.data.user);
        localStorage.setItem('user', JSON.stringify(userRes.value.data.user));
      }

      if (healthRes.status === 'rejected') {
        setError('Backend readiness could not be loaded. Check the Render deployment and VITE_API_URL.');
      }

      setLoading(false);
    };

    loadLaunchData();
  }, []);

  const stats = dashboard?.stats || {};
  const readiness = health?.readiness || {};
  const runtimeChecks = readiness.checks || [];
  const isPro = user?.plan && user.plan !== 'free';

  const workspaceChecks = useMemo(() => ([
    {
      id: 'business-profile',
      category: 'Workspace',
      label: 'Business identity saved',
      ready: Boolean(user?.companyName || user?.name),
      action: 'Add your business name, address, logo, GST, and UPI details.',
      doneText: 'Business identity is available for invoice pages.',
      path: '/settings'
    },
    {
      id: 'upi',
      category: 'Collection',
      label: 'UPI collection route',
      ready: Boolean(user?.upiId),
      action: 'Add a UPI ID so public invoices show a direct payment route.',
      doneText: 'UPI route is available on future invoices.',
      path: '/settings'
    },
    {
      id: 'first-document',
      category: 'Activation',
      label: 'First invoice or proposal',
      ready: Number(stats.total || 0) > 0,
      action: 'Create the first billing document and share it with a client.',
      doneText: `${stats.total || 0} billing document${Number(stats.total || 0) === 1 ? '' : 's'} created.`,
      path: '/create-invoice'
    },
    {
      id: 'paid-document',
      category: 'Validation',
      label: 'Payment proof in dashboard',
      ready: Number(stats.paid || 0) > 0,
      action: 'Collect the first verified Razorpay invoice payment to validate the money loop.',
      doneText: `${stats.paid || 0} paid invoice${Number(stats.paid || 0) === 1 ? '' : 's'} tracked.`
    },
    {
      id: 'razorpay-payment-link',
      category: 'Collection',
      label: 'Razorpay invoice link created',
      ready: Number(stats.paymentLinks || 0) > 0,
      action: 'Open an unpaid invoice and click Create Razorpay Link before sharing it with a client.',
      doneText: `${stats.paymentLinks || 0} invoice payment link${Number(stats.paymentLinks || 0) === 1 ? '' : 's'} created.`,
      path: '/dashboard'
    },
    {
      id: 'pro-plan',
      category: 'Monetization',
      label: 'Founder account on Pro',
      ready: Boolean(isPro || subscription),
      action: 'Test the upgrade path and confirm Pro access changes in the dashboard.',
      doneText: 'Pro access is active or a subscription record exists.',
      path: '/payment'
    }
  ]), [isPro, stats.paid, stats.paymentLinks, stats.total, subscription, user?.companyName, user?.name, user?.upiId]);

  const allChecks = useMemo(() => {
    const normalizedRuntime = runtimeChecks.map((check) => ({
      ...check,
      doneText: `${check.label} is configured.`
    }));

    return [...normalizedRuntime, ...workspaceChecks];
  }, [runtimeChecks, workspaceChecks]);

  const companyScore = useMemo(() => {
    if (!allChecks.length) return 0;
    return Math.round((allChecks.filter((check) => check.ready).length / allChecks.length) * 100);
  }, [allChecks]);

  const priorityActions = allChecks.filter((check) => !check.ready).slice(0, 4);
  const plans = pricing?.plans || [];
  const pricingReady = plans.some((plan) => plan.id === 'monthly') && plans.some((plan) => plan.id === 'yearly');
  const pendingAmount = useMemo(() => {
    if (dashboard?.stats?.pendingAmount !== undefined) {
      return Number(dashboard.stats.pendingAmount || 0);
    }

    return (dashboard?.invoices || [])
      .filter((invoice) => invoice.documentType !== 'proposal' && invoice.status === 'pending')
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  }, [dashboard?.invoices, dashboard?.stats?.pendingAmount]);

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-12 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Company Launch Center</p>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              Make InvoicePro ready to sell, collect, and retain.
            </h1>
            <p className="mt-5 max-w-2xl text-base sm:text-lg font-medium leading-relaxed text-zinc-400">
              One operating screen for the business setup, payment engine, AI layer, client billing loop, and launch blockers.
            </p>
          </div>

          <div className="premium-panel p-5 text-center sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Go-live score</p>
            <p className="mt-4 text-5xl font-black tracking-tighter text-white sm:text-7xl">{loading ? '--' : companyScore}%</p>
            <p className="mt-3 text-sm font-bold text-zinc-500">
              {readiness.moneyReady ? 'Ready for real checkout traffic' : 'Finish blockers before paid launch'}
            </p>
          </div>
        </section>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        <section className="reveal reveal-delay-1 mb-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Collected', value: formatMoney(stats.totalRevenue), tone: 'text-emerald-300' },
            { label: 'Unpaid invoices', value: Number(stats.pending || 0), tone: 'text-yellow-300' },
            { label: 'Paid invoices', value: Number(stats.paid || 0), tone: 'text-white' },
            { label: 'Checkout pricing', value: pricingReady ? 'Live' : 'Check', tone: pricingReady ? 'text-emerald-300' : 'text-yellow-300' }
          ].map((item) => (
            <div key={item.label} className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{item.label}</p>
              <p className={`mt-4 text-4xl font-black tracking-tight ${item.tone}`}>{loading ? '--' : item.value}</p>
            </div>
          ))}
        </section>

        <section className="reveal reveal-delay-2 mb-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="premium-panel p-5 sm:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Priority actions</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Next moves that unlock revenue</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/create-invoice')}
                className="btn btn-primary px-6 py-3 text-sm font-black"
              >
                New Invoice
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : priorityActions.length ? (
              <div className="space-y-4">
                {priorityActions.map((action, index) => (
                  <div key={action.id} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                    <div className="flex items-start gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-black">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white">{action.label}</p>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500">{action.action}</p>
                      </div>
                      {action.path && (
                        <Link to={action.path} className="shrink-0 rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/10">
                          Fix
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-emerald-400/15 bg-emerald-400/10 p-8">
                <p className="text-2xl font-black text-white">Launch checklist complete.</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-emerald-100/80">
                  Keep testing real customer flows, monitor payments, and collect feedback from the first paying users.
                </p>
              </div>
            )}
          </div>

          <div className="premium-panel p-5 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Revenue machine</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">The loop this SaaS must repeat</h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { step: '01', title: 'Convert visitor', detail: 'Landing page sends them to signup or pricing.' },
                { step: '02', title: 'Create document', detail: 'User sends an invoice, proposal, or payment link.' },
                { step: '03', title: 'Collect payment', detail: 'Razorpay, UPI, email reminders, and public invoice links move cash.' },
                { step: '04', title: 'Retain customer', detail: 'AI insights and recurring invoices make Pro worth keeping.' }
              ].map((item) => (
                <div key={item.step} className="rounded-[1.75rem] border border-white/8 bg-black/20 p-6">
                  <p className="text-3xl font-black text-white/15">{item.step}</p>
                  <h3 className="mt-4 text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="reveal reveal-delay-2 mb-12 premium-panel overflow-hidden">
          <div className="border-b border-white/5 p-5 sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Readiness checklist</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Company setup and product operations</h2>
              </div>
              <span className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${readiness.moneyReady ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200'}`}>
                {readiness.stage || 'checking'}
              </span>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-8 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? [1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-48 rounded-[1.75rem] bg-white/5 animate-pulse" />)
              : allChecks.map((check) => <LaunchCheck key={check.id} check={check} />)}
          </div>
        </section>

        <section className="reveal reveal-delay-3 grid gap-8 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Razorpay webhook</p>
            <p className="mt-4 break-all text-sm font-black leading-relaxed text-white">
              {readiness.webhookUrlHint || 'https://your-render-backend.onrender.com/api/payment/webhook'}
            </p>
            <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-500">
              Replace the domain with your real Render backend URL.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Open revenue</p>
            <p className="mt-4 text-4xl font-black tracking-tight text-white">{formatMoney(pendingAmount)}</p>
            <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-500">
              Pending amount becomes useful once due dates, reminders, and payment links are consistent.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Checkout plans</p>
            <div className="mt-4 space-y-3">
              {plans.length ? plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-sm font-black capitalize text-white">{plan.label || plan.id}</p>
                  <p className="text-sm font-black text-yellow-300">Rs {plan.amount}</p>
                </div>
              )) : (
                <p className="text-sm font-medium leading-relaxed text-zinc-500">Pricing endpoint is not available yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
