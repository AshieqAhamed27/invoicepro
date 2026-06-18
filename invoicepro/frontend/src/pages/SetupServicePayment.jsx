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
    paymentTitle: 'Agency setup packages only.',
    paymentDetail: 'These cards are for done-for-you freelancer setup services. Software access and Pro subscription plans are separate.',
    defaultOptionId: 'growth',
    tone: 'yellow',
    options: [
      {
        id: 'starter',
        packageId: 'starter',
        workflowType: 'freelancers',
        label: 'Starter Setup',
        badge: 'Starter',
        title: 'Setup for first clear workflow',
        amount: { india: 999, global: 19 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'one-time setup',
        detail: 'Get your offer, profile checklist, invoice/payment path, and first proposal template ready.',
        bestFor: 'New freelancers who know their skill but need a clean client-ready workflow.',
        points: [
          'Clear service offer and positioning',
          'Profile checklist and trust points',
          'Invoice and payment workflow setup',
          'One proposal template to start faster'
        ],
        defaultSkill: 'Freelancer service setup'
      },
      {
        id: 'growth',
        packageId: 'growth',
        workflowType: 'freelancers',
        label: 'Growth Setup',
        badge: 'Recommended',
        title: 'Setup for finding and closing clients',
        amount: { india: 2999, global: 59 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'one-time setup',
        detail: 'Build the lead plan, outreach, pricing, proposal flow, Money GPS, and workspace handover.',
        bestFor: 'Freelancers ready to find clients, send proposals, and follow a 7-day action plan.',
        points: [
          'Lead source and outreach plan',
          'Proposal and pricing support',
          'Money GPS and payment follow-up setup',
          'Workspace handover with next actions'
        ],
        defaultSkill: 'Freelancer growth setup',
        recommended: true
      },
      {
        id: 'managed',
        packageId: 'managed',
        workflowType: 'agencies',
        label: 'Managed Growth',
        badge: 'Monthly support',
        title: 'Setup plus guided growth support',
        amount: { india: 4999, global: 99 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'first month support',
        detail: 'Weekly client actions, proposal review, payment checks, and monthly growth reporting.',
        bestFor: 'Freelancers or small agencies who want guided support after the setup is created.',
        points: [
          'Weekly client action plan',
          'Proposal and follow-up review',
          'Delivery and payment workflow checks',
          'Monthly growth report and next steps'
        ],
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
  automation: {
    eyebrow: 'Automation setup payment',
    title: 'Pay for Automation Setup.',
    subtitle: 'For freelancers and teams that want repetitive client tasks configured for them.',
    description: 'Choose an automation package, explain the repetitive task, and complete Razorpay checkout. We map, test, and hand over the approved ClientFlow AI or n8n workflow.',
    path: '/payments/automation-setup',
    supportSubject: 'ClientFlow AI Automation Setup payment support',
    paymentTitle: 'Automation setup packages only.',
    paymentDetail: 'These cards pay for hands-on workflow design, testing, activation, and handover. ClientFlow AI software access and third-party app fees remain separate.',
    fitChecks: [
      {
        title: 'The task repeats',
        detail: 'You manually do the same reminder, follow-up, notification, or handoff every week.'
      },
      {
        title: 'The trigger is clear',
        detail: 'You can describe exactly when it should start, such as an unpaid invoice reaching its due date.'
      },
      {
        title: 'The result is valuable',
        detail: 'Saving time, preventing a missed follow-up, or collecting money is worth more than the setup fee.'
      }
    ],
    notFor: 'Do not buy Automation Setup for a process that changes every time, has no clear trigger, or is still only an idea. Start by testing the manual workflow first.',
    defaultOptionId: 'automation_workflow',
    tone: 'sky',
    options: [
      {
        id: 'automation_starter',
        packageId: 'automation_starter',
        workflowType: 'automation',
        label: 'Reminder Automation',
        badge: 'Starter',
        title: 'Automate one reminder workflow',
        amount: { india: 1499, global: 29 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'one-time setup',
        detail: 'Set up one approved reminder flow for invoices, proposals, tasks, or client follow-ups.',
        bestFor: 'Freelancers who repeatedly check dates and send the same reminder manually.',
        points: [
          'One trigger and reminder workflow',
          'Safe dry run with sample data',
          'Failure alert and retry guidance',
          'Simple handover notes'
        ],
        defaultSkill: 'Client reminder automation setup'
      },
      {
        id: 'automation_workflow',
        packageId: 'automation_workflow',
        workflowType: 'automation',
        label: 'Workflow Automation',
        badge: 'Recommended',
        title: 'Automate a client workflow',
        amount: { india: 3999, global: 79 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'one-time setup',
        detail: 'Connect up to three approved steps such as lead intake, proposal follow-up, task creation, invoice reminder, or admin notification.',
        bestFor: 'Active freelancers and small teams losing time between disconnected client tasks.',
        points: [
          'Workflow map with trigger and actions',
          'Up to three connected automation steps',
          'Testing, failure path, and activation',
          'Owner handover and maintenance checklist'
        ],
        defaultSkill: 'Client workflow automation setup',
        recommended: true
      },
      {
        id: 'automation_managed',
        packageId: 'automation_managed',
        workflowType: 'automation',
        label: 'Managed Automation',
        badge: 'First month support',
        title: 'Build and monitor key automations',
        amount: { india: 7999, global: 159 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'setup plus first month',
        detail: 'Configure priority workflows, review failures, and provide guided improvements during the first month.',
        bestFor: 'Small agencies or teams that need support after automation goes live.',
        points: [
          'Up to three priority workflow builds',
          'Activation and failure monitoring setup',
          'Two workflow review sessions',
          'First-month improvement report'
        ],
        defaultSkill: 'Managed client workflow automation'
      }
    ],
    steps: [
      ['1', 'Choose workflow'],
      ['2', 'Explain manual task'],
      ['3', 'Pay setup fee'],
      ['4', 'Test and activate']
    ]
  },
  enterprise: {
    eyebrow: 'Enterprise setup payment',
    title: 'Pay for Enterprise Team Setup.',
    subtitle: 'For agencies and small companies that need a guided team workflow setup.',
    description: 'This page is only for Enterprise Team Setup. It does not sell freelancer Pro access. Share team details, pay once, and we start the pilot setup process.',
    path: '/payments/enterprise',
    supportSubject: 'ClientFlow AI Enterprise Team Setup payment support',
    paymentTitle: 'Enterprise setup packages only.',
    paymentDetail: 'These cards are for company setup services: workspace, roles, security, pilot rollout, and team onboarding. Freelancer Pro plans are separate.',
    defaultOptionId: 'enterprise_team',
    tone: 'emerald',
    options: [
      {
        id: 'enterprise_team',
        packageId: 'enterprise_team',
        workflowType: 'enterprise',
        label: 'Enterprise Team Setup',
        badge: 'Team setup',
        title: 'Team workspace setup',
        amount: { india: 4999, global: 99 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'one-time setup',
        detail: 'Create the company workspace, roles, security settings, and first team workrooms.',
        bestFor: 'Small teams that need one shared ClientFlow AI workspace with clear access rules.',
        points: [
          'Organization workspace setup',
          'Owner, manager, finance, and member roles',
          'Admin security setting guidance',
          'First team workrooms and handover'
        ],
        defaultSkill: 'Enterprise team workflow setup',
        recommended: true
      },
      {
        id: 'enterprise_pilot',
        packageId: 'enterprise_pilot',
        workflowType: 'enterprise',
        label: 'Enterprise Pilot Setup',
        badge: '30-day pilot',
        title: 'Pilot for one team or department',
        amount: { india: 9999, global: 199 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'pilot rollout',
        detail: 'Plan one department rollout with permissions, audit habits, backup policy, and admin review.',
        bestFor: 'Agencies or companies testing ClientFlow AI with one team before a wider rollout.',
        points: [
          '30-day pilot workflow plan',
          'Audit log and export routine',
          'Backup and retention policy checklist',
          'Admin review routine for team adoption'
        ],
        defaultSkill: 'Enterprise pilot workflow setup'
      },
      {
        id: 'enterprise_rollout',
        packageId: 'enterprise_rollout',
        workflowType: 'enterprise',
        label: 'Enterprise Rollout Support',
        badge: 'Rollout support',
        title: 'Guided rollout for company teams',
        amount: { india: 19999, global: 399 },
        currency: { india: 'INR', global: 'USD' },
        priceNote: 'rollout support',
        detail: 'Support multiple workrooms, onboarding, permissions review, and rollout reporting.',
        bestFor: 'Teams that want guided onboarding, permission review, and a clearer company workflow.',
        points: [
          'Multiple workroom rollout planning',
          'Team onboarding checklist',
          'Workflow and permission review',
          'Rollout support report with next actions'
        ],
        defaultSkill: 'Enterprise rollout workflow setup'
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

  if (serviceType === 'automation') {
    return {
      targetClient: 'Trigger or app involved',
      skill: 'Your business or service type',
      incomeGoal: 'Hours you want to save each week',
      problem: 'Which repetitive task should we automate?'
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
  const isAutomation = serviceType === 'automation';
  const theme = isEnterprise
    ? {
        hero: 'bg-emerald-400/[0.035]',
        eyebrow: 'text-emerald-300',
        selected: 'border-emerald-300/45 bg-emerald-300/[0.1] shadow-2xl shadow-emerald-950/25',
        recommended: 'border-emerald-300/30 bg-emerald-300/[0.065] hover:border-emerald-300/45',
        step: 'text-emerald-300',
        action: 'bg-emerald-300 text-slate-950',
        submit: 'bg-emerald-300 text-slate-950 hover:bg-emerald-200'
      }
    : isAutomation
      ? {
          hero: 'bg-sky-400/[0.035]',
          eyebrow: 'text-sky-300',
          selected: 'border-sky-300/45 bg-sky-300/[0.1] shadow-2xl shadow-sky-950/25',
          recommended: 'border-sky-300/30 bg-sky-300/[0.065] hover:border-sky-300/45',
          step: 'text-sky-300',
          action: 'bg-sky-300 text-slate-950',
          submit: 'bg-sky-300 text-slate-950 hover:bg-sky-200'
        }
      : {
          hero: 'bg-yellow-400/[0.04]',
          eyebrow: 'text-yellow-300',
          selected: 'border-yellow-300/45 bg-yellow-300/[0.1] shadow-2xl shadow-yellow-950/25',
          recommended: 'border-yellow-300/35 bg-yellow-300/[0.075] hover:border-yellow-300/50',
          step: 'text-yellow-300',
          action: 'bg-yellow-400 text-black',
          submit: 'bg-yellow-400 text-black hover:bg-yellow-300'
        };
  const relatedPaymentPages = [
    { id: 'software', path: '/payments/freelance-workflow', label: 'Freelance Workflow' },
    { id: 'agency', path: '/payments/agency-setup', label: 'Agency Setup' },
    { id: 'automation', path: '/payments/automation-setup', label: 'Automation Setup' },
    { id: 'enterprise', path: '/payments/enterprise', label: 'Enterprise Setup' }
  ].filter((item) => item.id !== serviceType);

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

  const chooseOption = (optionId) => {
    setSelectedOptionId(optionId);
    window.requestAnimationFrame(() => {
      document.getElementById('setup-payment-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
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
        preferredPlatform: isEnterprise ? 'Team rollout' : isAutomation ? 'ClientFlow AI / n8n' : 'LinkedIn',
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
          setupBookingId: booking._id,
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
        <section className={`border-b border-white/5 py-14 sm:py-16 lg:py-20 ${theme.hero}`}>
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${theme.eyebrow}`}>
                {config.eyebrow}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                {config.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-zinc-400">
                {config.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                {relatedPaymentPages.map((item) => (
                  <Link key={item.id} to={item.path} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10">
                    {item.label}
                  </Link>
                ))}
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

        {isAutomation && (
          <section className="border-b border-white/5 bg-sky-400/[0.025] py-12 sm:py-14">
            <div className="container-custom">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Buy only when it solves real repetition</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Automation should remove one clear manual problem.
                </h2>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                  Do not pay because automation sounds advanced. Pay when you can name the task you repeat, what starts it, and the useful result you expect.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {config.fitChecks.map((item, index) => (
                  <div key={item.title} className="rounded-[1.5rem] border border-sky-300/15 bg-black/25 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Check {index + 1}</p>
                    <h3 className="mt-3 text-lg font-black text-white">{item.title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{item.detail}</p>
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.06] p-5 text-sm font-bold leading-relaxed text-yellow-100">
                {config.notFor}
              </p>
            </div>
          </section>
        )}

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Choose payment</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{config.paymentTitle}</h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                {config.paymentDetail}
              </p>
            </div>

            <div className={`grid gap-5 ${config.options.length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
              {config.options.map((option) => {
                const selected = selectedOption.id === option.id;
                const amount = formatMoney(option.amount[market], option.currency[market]);
                const selectedClass = theme.selected;
                const idleClass = option.recommended
                  ? theme.recommended
                  : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]';

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => chooseOption(option.id)}
                    className={`flex min-h-[560px] flex-col rounded-[1.75rem] border p-6 text-left transition-all hover:-translate-y-1 active:scale-[0.99] ${
                      selected ? selectedClass : idleClass
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        {selected ? 'Selected' : option.badge}
                      </p>
                      <h3 className="mt-5 text-2xl font-black leading-tight text-white">
                        {option.title}
                      </h3>
                      <div className="mt-6">
                        <p className="text-4xl font-black tracking-tight text-white">
                          {amount}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          {option.priceNote}
                        </p>
                      </div>
                      <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-400">
                        {option.detail}
                      </p>
                      <p className="mt-6 rounded-xl border border-white/8 bg-black/25 p-4 text-xs font-bold leading-relaxed text-zinc-300">
                        {option.bestFor}
                      </p>
                    </div>

                    <div className="mt-6 grid gap-3">
                      {option.points.map((point) => (
                        <p key={point} className="text-xs font-semibold leading-relaxed text-zinc-500">
                          {point}
                        </p>
                      ))}
                    </div>

                    <div
                      className={`mt-auto rounded-2xl px-5 py-4 text-center text-sm font-black transition-all ${
                        selected
                          ? theme.action
                          : 'border border-white/10 bg-white/[0.04] text-white'
                      }`}
                    >
                      {selected ? `Continue with ${option.label}` : option.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {config.steps.map(([step, label]) => (
                <div key={step} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme.step}`}>{step}</p>
                  <p className="mt-2 text-sm font-black text-white">{label}</p>
                </div>
              ))}
            </div>

            <form
              id="setup-payment-form"
              onSubmit={handleSubmit}
              className="mt-10 rounded-[1.75rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/25 sm:p-6 lg:p-8"
            >
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
                <textarea name="problem" value={form.problem} onChange={updateField} placeholder={fieldCopy.problem} rows={5} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-emerald-300/50 sm:col-span-2" />
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
                className={`mt-5 w-full rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-60 ${theme.submit}`}
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
