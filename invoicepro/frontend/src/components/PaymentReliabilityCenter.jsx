import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

const formatCurrency = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const getCheckClass = (ready) =>
  ready
    ? 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200'
    : 'border-yellow-300/20 bg-yellow-300/[0.08] text-yellow-100';

const getLabel = (ready) => (ready ? 'Ready' : 'Needs setup');

export default function PaymentReliabilityCenter({
  stats = {},
  invoices = [],
  insights = null,
  onOpenPayments,
  onOpenInvoice
}) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadReadiness = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/health/launch-readiness');
        if (active) setReadiness(res.data || null);
      } catch (err) {
        if (active) {
          setError(err?.friendlyMessage || 'Payment readiness could not be checked right now.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReadiness();

    return () => {
      active = false;
    };
  }, []);

  const pendingInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.documentType !== 'proposal' && invoice.status !== 'paid'),
    [invoices]
  );
  const topPendingInvoice = useMemo(
    () => [...pendingInvoices].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0] || null,
    [pendingInvoices]
  );

  const env = readiness?.envSanity || {};
  const payments = env.payments || {};
  const launch = readiness?.readiness || {};
  const checks = [
    {
      id: 'checkout',
      label: 'Razorpay checkout',
      ready: payments.simulationEnabled || (payments.razorpayKeyId && payments.razorpayKeySecret),
      detail: payments.simulationEnabled
        ? 'Simulation mode is on for testing.'
        : 'Key ID and key secret are configured.'
    },
    {
      id: 'webhook',
      label: 'Webhook verification',
      ready: Boolean(payments.razorpayWebhookSecret),
      detail: payments.razorpayWebhookSecret
        ? 'Webhook secret is configured for payment updates.'
        : `Add webhook secret and point Razorpay to ${launch.webhookPath || '/api/payment/webhook'}.`
    },
    {
      id: 'plans',
      label: 'Plan IDs',
      ready: Boolean(payments.razorpayMonthlyPlanId && payments.razorpayYearlyPlanId),
      detail: 'Monthly and yearly subscription plan IDs keep checkout pricing controlled by backend.'
    },
    {
      id: 'links',
      label: 'Invoice payment links',
      ready: Number(stats.paymentLinks || 0) > 0,
      detail: Number(stats.paymentLinks || 0) > 0
        ? `${stats.paymentLinks} invoice payment link${Number(stats.paymentLinks) === 1 ? '' : 's'} created.`
        : 'Create one payment link from an unpaid invoice to validate the money loop.'
    }
  ];
  const readyCount = checks.filter((check) => check.ready).length;
  const reliabilityScore = Math.round((readyCount / checks.length) * 100);
  const recoverable = insights?.revenueOpportunity?.recoverableThisWeek ?? stats.pendingAmount ?? 0;

  return (
    <section className="reveal reveal-delay-1 mb-12 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.35fr)] lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Payment reliability center</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Make payment collection feel real and trustworthy.
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
            This checks checkout configuration, webhook readiness, payment links, and pending money so users know whether the collection workflow is live or still in setup mode.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Reliability score</p>
          <p className="mt-2 text-5xl font-black text-white">{loading ? '--' : `${reliabilityScore}%`}</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">
            {error || `${readyCount}/${checks.length} payment checks ready.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => (
          <article key={check.id} className={`rounded-[1.5rem] border p-5 ${getCheckClass(check.ready)}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-current">{check.label}</p>
              <span className="rounded-full border border-current/20 bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest">
                {loading ? 'Checking' : getLabel(check.ready)}
              </span>
            </div>
            <p className="text-sm font-semibold leading-relaxed text-zinc-300">{check.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
        <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Money to protect</p>
          <p className="mt-2 text-4xl font-black text-white">{formatCurrency(recoverable)}</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">
            {pendingInvoices.length} pending invoice{pendingInvoices.length === 1 ? '' : 's'} need payment link, reminder, or follow-up.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Recommended action</p>
          <h3 className="mt-2 text-xl font-black text-white">
            {topPendingInvoice ? `Open ${topPendingInvoice.clientName || 'top pending invoice'}` : 'Create first payable invoice'}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">
            {topPendingInvoice
              ? `Check the Razorpay link and send the prepared payment follow-up for ${formatCurrency(topPendingInvoice.amount)}.`
              : 'Create an invoice, generate a payment link, and test the public pay page before selling harder.'}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => topPendingInvoice ? onOpenInvoice?.(topPendingInvoice) : onOpenPayments?.()}
              className="rounded-2xl bg-emerald-300 px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-200 active:scale-95"
            >
              {topPendingInvoice ? 'Open Invoice' : 'Open Payments'}
            </button>
            <button
              type="button"
              onClick={onOpenPayments}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/[0.08] active:scale-95"
            >
              Payment Page
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
