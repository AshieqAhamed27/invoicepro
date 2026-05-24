import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../utils/api';
import { getUser } from '../utils/auth';
import { COMPANY_NAME, COMPANY_SHORT_NAME, SUPPORT_EMAIL } from '../utils/company';
import { trackEvent } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const getSafeMarket = (value) => (
  String(value || '').toLowerCase() === 'global' ? 'global' : 'india'
);

const detectBillingMarket = () => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const locale = navigator.language || '';
    if (timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta' || locale.toLowerCase().endsWith('-in')) {
      return 'india';
    }
  } catch {}

  return 'global';
};

const getInitialMarket = (search = '') => {
  const queryMarket = new URLSearchParams(search).get('market');
  return getSafeMarket(queryMarket || localStorage.getItem('billingMarket') || detectBillingMarket());
};

const formatMoney = (amount, currency = 'INR') => {
  const numeric = Number(amount || 0);
  if (currency === 'INR') return `Rs ${numeric.toLocaleString('en-IN')}`;
  if (currency === 'USD') return `$${numeric.toLocaleString('en-US')}`;
  return `${currency} ${numeric.toLocaleString('en-US')}`;
};

const serviceConfig = {
  agency: {
    eyebrow: 'Agency setup payment',
    title: 'Pay for Agency Setup.',
    subtitle: 'For freelancers who want the ClientFlow AI workflow set up for them.',
    description: 'Choose one setup package, share your basic details, and complete Razorpay checkout. After payment, we contact you on WhatsApp/email and start the setup.',
    path: '/payments/agency-setup',
    supportSubject: 'ClientFlow AI Agency Setup payment support',
    defaultOptionId: 'growth',
    tone: 'yellow',
    options: [
      {
        id: 'starter',
        packageId: 'starter',
        workflowType: 'freelancers',
        label: 'Starter Setup',
        badge: 'Start from zero',
        amount: { india: 999, global: 19 },
        currency: { india: 'INR', global: 'USD' },
        detail: 'One clear offer, profile checklist, invoice/payment workflow, and one proposal template.',
        defaultSkill: 'Freelancer service setup'
      },
      {
        id: 'growth',
        packageId: 'growth',
        workflowType: 'freelancers',
        label: 'Growth Setup',
        badge: 'Recommended',
        amount: { india: 2999, global: 59 },
        currency: { india: 'INR', global: 'USD' },
        detail: 'Lead plan, outreach messages, proposal/pricing support, Money GPS setup, and workspace handover.',
        defaultSkill: 'Freelancer growth setup',
        recommended: true
      },
      {
        id: 'managed',
        packageId: 'managed',
        workflowType: 'agencies',
        label: 'Managed Growth',
        badge: 'Monthly support',
        amount: { india: 4999, global: 99 },
        currency: { india: 'INR', global: 'USD' },
        detail: 'Weekly client action plan, proposal review, payment checks, and monthly growth report.',
        defaultSkill: 'Managed freelancer growth setup'
      }
    ],
    steps: [
      ['1', 'Choose package'],
      ['2', 'Fill setup intake'],
      ['3', 'Pay with Razorpay'],
      ['4', 'Receive setup plan']
    ]
  },
  enterprise: {
    eyebrow: 'Enterprise setup payment',
    title: 'Pay for Enterprise Team Setup.',
    subtitle: 'For agencies and small companies that need a guided team workflow setup.',
    description: 'This page is only for Enterprise Team Setup. It does not sell freelancer Pro access. Share team details, pay once, and we start the pilot setup process.',
    path: '/payments/enterprise',
    supportSubject: 'ClientFlow AI Enterprise Team Setup payment support',
    defaultOptionId: 'enterprise_team',
    tone: 'emerald',
    options: [
      {
        id: 'enterprise_team',
        packageId: 'enterprise_team',
        workflowType: 'enterprise',
        label: 'Enterprise Team Setup',
        badge: 'Team setup',
        amount: { india: 4999, global: 99 },
        currency: { india: 'INR', global: 'USD' },
        detail: 'Organization workspace, member roles, security settings, audit/export habits, backup policy, and first team workrooms.',
        defaultSkill: 'Enterprise team workflow setup',
        recommended: true
      }
    ],
    steps: [
      ['1', 'Share team details'],
      ['2', 'Pay setup fee'],
      ['3', 'Plan first workspace'],
      ['4', 'Run pilot setup']
    ]
  }
};

const getFieldCopy = (serviceType) => {
  if (serviceType === 'enterprise') {
    return {
      targetClient: 'Team size / company type',
      skill: 'Business or service type',
      incomeGoal: 'Setup goal',
      problem: 'What is messy in your team workflow now?'
    };
  }

  return {
    targetClient: 'Target client type',
    skill: 'Your skill or service',
    incomeGoal: 'Monthly income goal',
    problem: 'What is confusing in your freelancer workflow now?'
  };
};

export default function SetupServicePayment({ serviceType = 'agency' }) {
  const location = useLocation();
  const config = serviceConfig[serviceType] || serviceConfig.agency;
  const user = getUser() || {};
  const [market, setMarket] = useState(() => getInitialMarket(location.search));
  const [selectedOptionId, setSelectedOptionId] = useState(config.defaultOptionId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    customerName: user.name || '',
    email: user.email || '',
    whatsapp: '',
    skill: '',
    targetClient: '',
    incomeGoal: '',
    problem: ''
  });

  const selectedOption = useMemo(
    () => config.options.find((option) => option.id === selectedOptionId) || config.options[0],
    [config.options, selectedOptionId]
  );
  const fieldCopy = getFieldCopy(serviceType);
  const isEnterprise = serviceType === 'enterprise';

  useDocumentMeta({
    title: `${config.title} - ${COMPANY_NAME}`,
    description: config.subtitle,
    path: config.path
  });

  const selectMarket = (nextMarket) => {
    const safeMarket = getSafeMarket(nextMarket);
    localStorage.setItem('billingMarket', safeMarket);
    setMarket(safeMarket);
    trackEvent('select_setup_billing_market', { service_type: serviceType, market: safeMarket });
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const confirmSimulationPayment = async(booking, order) => {
    const verifyRes = await api.post(`/agency/bookings/${booking._id}/verify`, {
      razorpay_order_id: order.id
    });

    setSuccess(`Payment received for ${verifyRes.data?.booking?.packageName || selectedOption.label}. We will contact you on WhatsApp/email for setup.`);
    setLoading(false);
  };

  const handleSubmit = async(event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const name = form.customerName.trim();
    const email = form.email.trim();
    const whatsapp = form.whatsapp.trim();
    const problem = form.problem.trim();

    if (!name || !email || !whatsapp || !problem) {
      setError('Name, email, WhatsApp, and setup problem are required before payment.');
      return;
    }

    try {
      setLoading(true);
      trackEvent('begin_setup_checkout', {
        service_type: serviceType,
        package_id: selectedOption.packageId,
        market,
        value: Number(selectedOption.amount[market] || 0),
        currency: selectedOption.currency[market] || 'INR'
      });

      const bookingRes = await api.post('/agency/bookings', {
        packageId: selectedOption.packageId,
        market,
        workflowType: selectedOption.workflowType,
        customerName: name,
        email,
        whatsapp,
        skill: form.skill.trim() || selectedOption.defaultSkill,
        problem,
        targetClient: form.targetClient.trim(),
        incomeGoal: form.incomeGoal.trim(),
        preferredPlatform: isEnterprise ? 'Team rollout' : 'LinkedIn',
        source: `${serviceType}_payment_page`
      });

      const booking = bookingRes.data?.booking;
      if (!booking?._id) throw new Error('Setup booking was not created. Please try again.');

      const orderRes = await api.post(`/agency/bookings/${booking._id}/order`);
      const { keyId, order, simulation } = orderRes.data || {};
      if (!order?.id) throw new Error('Setup payment order was not created. Please contact support.');

      if (simulation) {
        await confirmSimulationPayment(booking, order);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay checkout failed to load. Please retry.');

      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency || selectedOption.currency[market] || 'INR',
        name: COMPANY_SHORT_NAME,
        description: selectedOption.label,
        order_id: order.id,
        prefill: {
          name,
          email,
          contact: whatsapp.replace(/\D/g, '')
        },
        notes: {
          agencySetupId: booking._id,
          packageId: selectedOption.packageId,
          setupService: selectedOption.id
        },
        modal: {
          ondismiss: () => setLoading(false)
        },
        handler: async(response) => {
          try {
            const verifyRes = await api.post(`/agency/bookings/${booking._id}/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            setSuccess(`Payment received for ${verifyRes.data?.booking?.packageName || selectedOption.label}. We will contact you on WhatsApp/email for setup.`);
            trackEvent('setup_payment_success', {
              service_type: serviceType,
              package_id: selectedOption.packageId,
              market,
              value: Number(booking.amount || selectedOption.amount[market] || 0),
              currency: booking.currency || selectedOption.currency[market] || 'INR'
            });
          } catch (verifyErr) {
            setError(verifyErr?.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        }
      });

      checkout.open();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to create setup payment.');
      setLoading(false);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className={`border-b border-white/5 py-14 sm:py-16 lg:py-20 ${isEnterprise ? 'bg-emerald-400/[0.035]' : 'bg-yellow-400/[0.04]'}`}>
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${isEnterprise ? 'text-emerald-300' : 'text-yellow-300'}`}>
                {config.eyebrow}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {config.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-zinc-400">
                {config.description}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/payments/freelance-workflow" className="btn btn-secondary px-6 py-3 text-sm">
                  Freelance Workflow Payment
                </Link>
                <Link to={isEnterprise ? '/payments/agency-setup' : '/payments/enterprise'} className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-center text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/10">
                  {isEnterprise ? 'Agency Setup Payment' : 'Enterprise Setup Payment'}
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Billing region</p>
              <div className="mt-4 grid gap-3">
                {[
                  ['india', 'India billing', 'Pay in INR using Razorpay-supported Indian methods.'],
                  ['global', 'International billing', 'Pay in USD when international payments are enabled in Razorpay.']
                ].map(([id, label, detail]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectMarket(id)}
                    className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                      market === id
                        ? isEnterprise
                          ? 'border-emerald-300/45 bg-emerald-300/10 text-white'
                          : 'border-yellow-300/45 bg-yellow-300/10 text-white'
                        : 'border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="block text-sm font-black">{label}</span>
                    <span className="mt-1 block text-xs font-semibold leading-relaxed text-zinc-500">{detail}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Choose payment</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {isEnterprise ? 'One enterprise setup option. No freelancer plans here.' : 'Agency setup packages only. No Pro subscription here.'}
              </h2>
              <div className="mt-6 grid gap-4">
                {config.options.map((option) => {
                  const selected = selectedOption.id === option.id;
                  const amount = formatMoney(option.amount[market], option.currency[market]);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`rounded-[1.5rem] border p-5 text-left transition-all hover:-translate-y-1 ${
                        selected
                          ? isEnterprise
                            ? 'border-emerald-300/40 bg-emerald-300/[0.1]'
                            : 'border-yellow-300/40 bg-yellow-300/[0.1]'
                          : 'border-white/8 bg-black/25 hover:border-white/15 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                            isEnterprise
                              ? 'border-emerald-300/20 bg-emerald-300/15 text-emerald-100'
                              : 'border-yellow-300/20 bg-yellow-300/15 text-yellow-100'
                          }`}>
                            {selected ? 'Selected' : option.badge}
                          </span>
                          <h3 className="mt-3 text-xl font-black text-white">{option.label}</h3>
                          <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{option.detail}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                          {amount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {config.steps.map(([step, label]) => (
                  <div key={step} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isEnterprise ? 'text-emerald-300' : 'text-yellow-300'}`}>{step}</p>
                    <p className="mt-2 text-sm font-black text-white">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/25 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Payment form</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{selectedOption.label}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">
                    Amount: {formatMoney(selectedOption.amount[market], selectedOption.currency[market])}
                  </p>
                </div>
                <Link to="/payments" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10">
                  All Payments
                </Link>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <input name="customerName" value={form.customerName} onChange={updateField} placeholder="Your name" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-emerald-300/50" />
                <input name="email" type="email" value={form.email} onChange={updateField} placeholder="Email" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-emerald-300/50" />
                <input name="whatsapp" value={form.whatsapp} onChange={updateField} placeholder="WhatsApp number" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-emerald-300/50" />
                <input name="targetClient" value={form.targetClient} onChange={updateField} placeholder={fieldCopy.targetClient} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-emerald-300/50" />
                <input name="skill" value={form.skill} onChange={updateField} placeholder={fieldCopy.skill} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-emerald-300/50" />
                <input name="incomeGoal" value={form.incomeGoal} onChange={updateField} placeholder={fieldCopy.incomeGoal} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-emerald-300/50" />
                <textarea name="problem" value={form.problem} onChange={updateField} placeholder={fieldCopy.problem} rows={5} className="sm:col-span-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-emerald-300/50" />
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-200">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`mt-5 w-full rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  isEnterprise
                    ? 'bg-emerald-300 text-slate-950 hover:bg-emerald-200'
                    : 'bg-yellow-400 text-black hover:bg-yellow-300'
                }`}
              >
                {loading ? 'Opening Razorpay...' : `Pay ${formatMoney(selectedOption.amount[market], selectedOption.currency[market])}`}
              </button>

              <p className="mt-4 text-center text-xs font-semibold leading-relaxed text-zinc-600">
                Need help before paying? Email {SUPPORT_EMAIL}.
              </p>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
