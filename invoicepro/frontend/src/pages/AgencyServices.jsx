import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import api from '../utils/api';
import { isLoggedIn } from '../utils/auth';
import useDocumentMeta from '../utils/useDocumentMeta';
import { getWorkflowMode, workflowModeList } from '../utils/workflowModes';
import {
  COMPANY_NAME,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const outcomes = [
  {
    title: 'Clear freelancer offer',
    text: 'We help shape one simple service offer, target client type, pricing angle, and first outreach message.'
  },
  {
    title: 'Client finding workflow',
    text: 'We set up lead sources, follow-up timing, proposal flow, and daily actions inside ClientFlow AI.'
  },
  {
    title: 'Project delivery system',
    text: 'We organize tasks, documents, client requests, proof links, project notes, and handover flow for active work.'
  },
  {
    title: 'Invoice and payment setup',
    text: 'We prepare invoice, proposal, payment link, currency, and collection follow-up workflow.'
  }
];

const packages = [
  {
    id: 'starter',
    name: 'Starter Setup',
    amount: 999,
    price: 'Rs 999',
    note: 'For freelancers starting from zero',
    features: [
      'One clear service offer',
      'Profile and positioning checklist',
      'Invoice and payment workflow setup',
      'One proposal template'
    ]
  },
  {
    id: 'growth',
    name: 'Growth Setup',
    amount: 2999,
    price: 'Rs 2999',
    note: 'For freelancers ready to get clients',
    features: [
      'Lead source plan and outreach messages',
      'Proposal, pricing, and objection replies',
      'Money GPS and income target setup',
      'ClientFlow AI workspace handover'
    ],
    featured: true
  },
  {
    id: 'managed',
    name: 'Managed Growth',
    amount: 4999,
    price: 'Rs 4999/mo',
    note: 'For ongoing weekly business support',
    features: [
      'Weekly client action plan',
      'Proposal and follow-up review',
      'Project delivery and payment checks',
      'Monthly growth report'
    ]
  }
];

const initialBookingForm = {
  customerName: '',
  email: '',
  whatsapp: '',
  skill: '',
  problem: '',
  targetClient: '',
  incomeGoal: '',
  portfolioUrl: '',
  preferredPlatform: 'LinkedIn',
  workflowType: 'freelancers',
  packageId: 'growth'
};

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

const process = [
  ['01', 'Understand your service', 'We collect your skill, target client, current problem, and income goal.'],
  ['02', 'Build your system', 'We set up ClientFlow AI workflows for leads, proposals, delivery, invoices, and payments.'],
  ['03', 'Give daily actions', 'You receive simple next steps: who to message, what to offer, what to collect, and what to improve.']
];

const agencyAutomationSteps = [
  {
    id: 'choose',
    step: '01',
    title: 'Choose setup path',
    userAction: 'User chooses package and workflow type.',
    aiAction: 'ClientFlow AI shows the correct setup path for freelancer, developer, designer, agency, or consultant.',
    output: 'One clear setup direction',
    cta: 'Choose workflow'
  },
  {
    id: 'intake',
    step: '02',
    title: 'Smart intake',
    userAction: 'User fills skill, problem, target client, income goal, and main platform.',
    aiAction: 'AI turns the answers into setup requirements, missing fields, and delivery checklist.',
    output: 'Complete setup brief',
    cta: 'Fill intake'
  },
  {
    id: 'payment',
    step: '03',
    title: 'Payment and confirmation',
    userAction: 'User pays for the chosen setup package.',
    aiAction: 'System creates the booking, payment order, and admin delivery record.',
    output: 'Paid setup request',
    cta: 'Book setup'
  },
  {
    id: 'build',
    step: '04',
    title: 'Build the system',
    userAction: 'User waits for setup delivery and answers clarifying questions if needed.',
    aiAction: 'We prepare offer, lead plan, proposal flow, project workspace, invoice/payment flow, and daily actions.',
    output: 'Ready-to-use ClientFlow system',
    cta: 'See deliverables'
  },
  {
    id: 'handover',
    step: '05',
    title: 'Handover and action plan',
    userAction: 'User receives the setup and starts using daily actions.',
    aiAction: 'ClientFlow AI gives the next actions: who to message, what to propose, what to invoice, and what to collect.',
    output: '7-day execution plan',
    cta: 'Start execution'
  }
];

const setupDeliverables = [
  ['Offer', 'One clear service, target client, result promise, and starter price angle.'],
  ['Lead plan', 'Where to find prospects, what to search, and what message to send first.'],
  ['Proposal flow', 'Scope, timeline, price, objection replies, and follow-up structure.'],
  ['Project flow', 'Tasks, client requests, delivery notes, collaborator roles, and handover.'],
  ['Payment flow', 'Invoice, payment link, currency, follow-up message, and collection priority.'],
  ['Daily actions', 'Simple 7-day plan so the user knows what to do next.']
];

const whoItHelps = [
  'Freelancers who know a skill but do not know how to find clients',
  'Developers and designers who need better proposals and delivery control',
  'Consultants who want retainers instead of random one-time work',
  'Small agency owners who want to bring another freelancer into bigger projects'
];

export default function AgencyServices() {
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const softwarePath = loggedIn ? '/money-gps' : '/signup';
  const softwareLabel = loggedIn ? 'Open Software' : 'Try Software Free';
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [activeAutomationStep, setActiveAutomationStep] = useState('choose');

  useDocumentMeta({
    title: `${COMPANY_NAME} Agency - Done-for-you freelancer business setup`,
    description: 'ClientFlow AI Agency helps freelancers set up client finding, proposal, project delivery, invoice, and payment workflows.',
    path: '/agency'
  });

  const selectedPackage = packages.find((plan) => plan.id === bookingForm.packageId) || packages[1];
  const selectedWorkflow = getWorkflowMode(bookingForm.workflowType);
  const selectedAutomation = agencyAutomationSteps.find((step) => step.id === activeAutomationStep) || agencyAutomationSteps[0];
  const bookingProgress = useMemo(() => {
    const requiredKeys = ['customerName', 'email', 'whatsapp', 'skill', 'problem'];
    const optionalKeys = ['targetClient', 'incomeGoal', 'portfolioUrl', 'preferredPlatform'];
    const completedRequired = requiredKeys.filter((key) => String(bookingForm[key] || '').trim()).length;
    const completedOptional = optionalKeys.filter((key) => String(bookingForm[key] || '').trim()).length;
    const total = requiredKeys.length + optionalKeys.length;
    return {
      completed: completedRequired + completedOptional,
      total,
      requiredDone: completedRequired === requiredKeys.length,
      percent: Math.round(((completedRequired + completedOptional) / total) * 100)
    };
  }, [bookingForm]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const workflow = params.get('workflow');
    if (workflow) {
      setBookingForm((current) => ({
        ...current,
        workflowType: getWorkflowMode(workflow).key
      }));
    }
  }, [location.search]);

  const updateBookingForm = (event) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const selectPackage = (packageId) => {
    setBookingForm((current) => ({
      ...current,
      packageId
    }));

    window.setTimeout(() => {
      document.getElementById('agency-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const selectWorkflow = (workflowType) => {
    setBookingForm((current) => ({
      ...current,
      workflowType: getWorkflowMode(workflowType).key
    }));

    window.setTimeout(() => {
      document.getElementById('agency-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const confirmSimulationPayment = async(booking, order) => {
    const verifyRes = await api.post(`/agency/bookings/${booking._id}/verify`, {
      razorpay_order_id: order.id
    });

    setBookingSuccess(`Payment received for ${verifyRes.data?.booking?.packageName || selectedPackage.name}. We will contact you on WhatsApp/email for setup.`);
    setBookingForm(initialBookingForm);
    setBookingLoading(false);
  };

  const handleBookingSubmit = async(event) => {
    event.preventDefault();
    setBookingError('');
    setBookingSuccess('');
    setBookingLoading(true);

    try {
      const bookingRes = await api.post('/agency/bookings', {
        ...bookingForm,
        source: 'agency_page'
      });
      const booking = bookingRes.data?.booking;

      if (!booking?._id) {
        throw new Error('Booking was not created. Please try again.');
      }

      const orderRes = await api.post(`/agency/bookings/${booking._id}/order`);
      const { keyId, order, simulation } = orderRes.data || {};

      if (!order?.id) {
        throw new Error('Payment order was not created. Please contact support.');
      }

      if (simulation) {
        await confirmSimulationPayment(booking, order);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Razorpay checkout failed to load. Please retry.');
      }

      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'ClientFlow AI Agency',
        description: selectedPackage.name,
        order_id: order.id,
        prefill: {
          name: bookingForm.customerName,
          email: bookingForm.email,
          contact: bookingForm.whatsapp.replace(/\D/g, '')
        },
        notes: {
          agencySetupId: booking._id,
          packageId: selectedPackage.id
        },
        modal: {
          ondismiss: () => {
            setBookingLoading(false);
          }
        },
        handler: async(response) => {
          try {
            const verifyRes = await api.post(`/agency/bookings/${booking._id}/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            setBookingSuccess(`Payment received for ${verifyRes.data?.booking?.packageName || selectedPackage.name}. We will contact you on WhatsApp/email for setup.`);
            setBookingForm(initialBookingForm);
          } catch (verifyErr) {
            setBookingError(verifyErr?.response?.data?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setBookingLoading(false);
          }
        }
      });

      checkout.open();
    } catch (err) {
      setBookingError(err?.response?.data?.message || err?.message || 'Unable to create agency setup booking.');
      setBookingLoading(false);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-400/10 via-yellow-300/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                  Software plus setup service
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                ClientFlow AI Agency.
                <span className="block bg-gradient-to-r from-yellow-200 via-emerald-200 to-sky-200 bg-clip-text text-transparent">
                  We set up your freelancer business system for you.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-zinc-400 sm:text-lg">
                If a freelancer is confused about finding clients, writing proposals, managing delivery, and collecting payment, we help set up the full workflow inside ClientFlow AI.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => document.getElementById('agency-setup-process')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="btn btn-primary px-7 py-4 text-center text-sm"
                >
                  See Setup Process
                </button>
                <Link to={softwarePath} className="btn btn-secondary px-7 py-4 text-center text-sm">
                  {softwareLabel}
                </Link>
              </div>

              <p className="mt-5 max-w-xl text-xs font-semibold leading-relaxed text-zinc-500">
                Honest note: we do not guarantee income. We help create the system, strategy, daily actions, and payment workflow so the freelancer can execute with clarity.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/30">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/30 p-5">
                <div className="flex items-center justify-between gap-4">
                  <BrandLogo showText={false} markClassName="h-12 w-12" />
                  <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">
                    Agency setup
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Main outcome</p>
                  <p className="mt-2 text-xl font-black leading-tight text-white">
                    A freelancer knows who to message, what to propose, how to deliver, and how to collect payment.
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  {['Offer', 'Leads', 'Proposal', 'Delivery', 'Payment'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                      <p className="text-sm font-black text-white">{item} workflow</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">Configured inside ClientFlow AI</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="agency-setup-process" className="border-b border-yellow-300/15 bg-yellow-300/[0.06] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Start here</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                How ClientFlow AI Agency setup works.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-300 sm:text-base">
                The user does not need to understand every tool. They only follow these 5 steps.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {agencyAutomationSteps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setActiveAutomationStep(step.id);
                    document.getElementById('agency-setup-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="rounded-[1.5rem] border border-yellow-300/20 bg-black/25 p-5 text-left transition-all hover:-translate-y-1 hover:border-yellow-300/40 hover:bg-yellow-300/[0.08]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-300 text-sm font-black text-slate-950">
                    {step.step}
                  </span>
                  <h3 className="mt-4 text-base font-black leading-tight text-white">{step.title}</h3>
                  <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-400">{step.output}</p>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/[0.08] p-5 text-center">
              <p className="text-base font-black text-white">
                Simple meaning: we set up their offer, leads, proposal, project workspace, invoice, payment follow-up, and 7-day action plan.
              </p>
              <button
                type="button"
                onClick={() => document.getElementById('agency-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="mt-5 rounded-2xl bg-emerald-300 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:bg-emerald-200 active:scale-[0.98]"
              >
                Book Setup
              </button>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/45 py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">What we do</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                A done-for-you setup service built around the product.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {outcomes.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
                  <h3 className="text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="agency-setup-details" className="border-b border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Agency Setup Autopilot</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  The user sees one guided setup process.
                </h2>
                <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                  Instead of asking buyers to understand every feature, the agency page explains the exact path: choose setup, fill intake, pay, receive the system, then follow daily actions.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/[0.08] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Current selected setup</p>
                <p className="mt-2 text-2xl font-black text-white">{selectedPackage.name}</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
                  {selectedWorkflow.label}: {selectedWorkflow.setupOutcome}
                </p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.62fr)]">
              <div className="grid gap-3 md:grid-cols-5 xl:grid-cols-1">
                {agencyAutomationSteps.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveAutomationStep(step.id)}
                    className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                      activeAutomationStep === step.id
                        ? 'border-emerald-300/35 bg-emerald-300/[0.1]'
                        : 'border-white/8 bg-white/[0.03] hover:border-emerald-300/25'
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">{step.step}</p>
                    <h3 className="mt-2 text-sm font-black text-white">{step.title}</h3>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{step.output}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/25 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                      Step {selectedAutomation.step}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-white">{selectedAutomation.title}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                    {selectedAutomation.output}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">User does</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{selectedAutomation.userAction}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">AI / team prepares</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{selectedAutomation.aiAction}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.08] p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Why this removes confusion</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
                    The buyer never has to decide between many tools. Each setup step tells them what to do, what we prepare, and what they receive next.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => document.getElementById('agency-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="mt-6 w-full rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-emerald-200 active:scale-[0.98]"
                >
                  {selectedAutomation.cta}
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {setupDeliverables.map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">{title}</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Choose setup workflow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Each buyer gets a different setup path.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">
                This keeps users from feeling lost. A developer gets a developer workflow, a designer gets a designer workflow, and an agency gets a team workflow.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {workflowModeList.map((workflow) => (
                <button
                  key={workflow.key}
                  type="button"
                  onClick={() => selectWorkflow(workflow.key)}
                  className={`rounded-[1.5rem] border p-5 text-left transition-all hover:-translate-y-1 ${
                    bookingForm.workflowType === workflow.key
                      ? 'border-sky-300/35 bg-sky-300/[0.1]'
                      : 'border-white/8 bg-white/[0.03] hover:border-sky-300/25'
                  }`}
                >
                  <p className="text-lg font-black text-white">{workflow.label}</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{workflow.setupOutcome}</p>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-sky-300">
                    Select workflow
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">How it works</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Simple enough for beginners, useful enough for serious freelancers.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                This lets you sell a real service now: setup, guidance, and workflow support. The SaaS becomes the system used to deliver that service.
              </p>
            </div>

            <div className="grid gap-4">
              {process.map(([step, title, text]) => (
                <div key={step} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">{step}</p>
                  <h3 className="mt-3 text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Service packages</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Earn from setup services while the SaaS grows.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">
                These packages can be sold through LinkedIn, WhatsApp, referrals, and direct freelancer communities.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {packages.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-[1.75rem] border p-6 transition-all hover:-translate-y-1 ${
                    plan.featured
                      ? 'border-yellow-300/35 bg-yellow-300/[0.08] shadow-2xl shadow-yellow-950/20'
                      : 'border-white/8 bg-white/[0.03]'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{plan.name}</p>
                  <p className="mt-4 text-4xl font-black text-white">{plan.price}</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-400">{plan.note}</p>
                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <p key={feature} className="rounded-xl border border-white/8 bg-black/20 p-3 text-sm font-semibold leading-relaxed text-zinc-300">
                        {feature}
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => selectPackage(plan.id)}
                    className={`mt-6 flex w-full justify-center rounded-2xl px-5 py-4 text-sm font-black transition-all active:scale-95 ${
                      plan.featured
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                        : 'border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    Choose this setup
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="agency-booking" className="border-y border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Book and pay</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Tell us your skill. We prepare your setup.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                This is the onboarding flow after someone chooses a setup package. It collects the exact details needed to create their offer, outreach plan, proposal flow, workspace, and payment process.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-yellow-300/20 bg-yellow-300/[0.08] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">Selected package</p>
                <p className="mt-2 text-2xl font-black text-white">{selectedPackage.name}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-400">{selectedPackage.price} - {selectedPackage.note}</p>
                <p className="mt-3 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-3 text-sm font-black text-sky-100">
                  Workflow: {selectedWorkflow.label}
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  'After payment, the setup becomes visible in your admin delivery checklist.',
                  'If setup is not delivered, the setup fee can be refunded.',
                  'This is not an income guarantee. It is a delivered setup and action plan.'
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                    <p className="text-sm font-semibold leading-relaxed text-zinc-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/25 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Full name</span>
                  <input
                    required
                    name="customerName"
                    value={bookingForm.customerName}
                    onChange={updateBookingForm}
                    className="input mt-2"
                    placeholder="Your name"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Email</span>
                  <input
                    required
                    type="email"
                    name="email"
                    value={bookingForm.email}
                    onChange={updateBookingForm}
                    className="input mt-2"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">WhatsApp number</span>
                  <input
                    required
                    name="whatsapp"
                    value={bookingForm.whatsapp}
                    onChange={updateBookingForm}
                    className="input mt-2"
                    placeholder="+91..."
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Package</span>
                  <select
                    name="packageId"
                    value={bookingForm.packageId}
                    onChange={updateBookingForm}
                    className="input mt-2"
                  >
                    {packages.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {plan.price}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Workflow type</span>
                  <select
                    name="workflowType"
                    value={bookingForm.workflowType}
                    onChange={updateBookingForm}
                    className="input mt-2"
                  >
                    {workflowModeList.map((workflow) => (
                      <option key={workflow.key} value={workflow.key}>
                        {workflow.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">
                    {selectedWorkflow.setupOutcome}
                  </p>
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">What skill/service do you sell?</span>
                <input
                  required
                  name="skill"
                  value={bookingForm.skill}
                  onChange={updateBookingForm}
                  className="input mt-2"
                  placeholder="Example: React websites, logo design, social media marketing"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Biggest problem now</span>
                <textarea
                  required
                  name="problem"
                  value={bookingForm.problem}
                  onChange={updateBookingForm}
                  className="input mt-2 min-h-[110px]"
                  placeholder="Example: I do not know who to message, what price to offer, or how to close clients."
                />
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target client</span>
                  <input
                    name="targetClient"
                    value={bookingForm.targetClient}
                    onChange={updateBookingForm}
                    className="input mt-2"
                    placeholder="Small shops, SaaS founders, coaches..."
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Monthly income goal</span>
                  <input
                    name="incomeGoal"
                    value={bookingForm.incomeGoal}
                    onChange={updateBookingForm}
                    className="input mt-2"
                    placeholder="Example: Rs 50,000"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Portfolio link</span>
                  <input
                    name="portfolioUrl"
                    value={bookingForm.portfolioUrl}
                    onChange={updateBookingForm}
                    className="input mt-2"
                    placeholder="LinkedIn, GitHub, Behance, website"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Main platform</span>
                  <select
                    name="preferredPlatform"
                    value={bookingForm.preferredPlatform}
                    onChange={updateBookingForm}
                    className="input mt-2"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Upwork/Fiverr">Upwork/Fiverr</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              {bookingError && (
                <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
                  {bookingError}
                </div>
              )}

              {bookingSuccess && (
                <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-300">
                  {bookingSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={bookingLoading}
                className="btn btn-primary mt-6 w-full py-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bookingLoading ? 'Creating setup payment...' : `Book ${selectedPackage.name} - ${selectedPackage.price}`}
              </button>
            </form>
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-400/[0.045] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Best for</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Freelancers who need clarity before they need more tools.
              </h2>
            </div>
            <div className="grid gap-3">
              {whoItHelps.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                  <p className="text-sm font-semibold leading-relaxed text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/45 py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Proof and guarantee</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Make buying feel safer for first users.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                Early users need trust before they pay. The page now explains what gets delivered, what does not get promised, and what happens if setup is not delivered.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Early feedback</p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">
                  The interface feels clean, lightweight, and simple for an invoicing and freelancer workflow.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/[0.08] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Delivery guarantee</p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">
                  If the paid setup is not delivered, the setup fee can be refunded. This is a delivery guarantee, not an income guarantee.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Outreach scripts</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Use this to find first setup clients.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">
                These are simple LinkedIn or WhatsApp messages. Ask for feedback first, then offer setup help only if they show a real problem.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                ['First message', 'Hi [Name], I noticed you do freelance [skill]. I am building a system to help freelancers get clients, send proposals, manage projects, and collect payment. Can I ask one quick question about your current client workflow?'],
                ['If they reply', 'Thanks. What is harder for you right now: finding clients, writing proposals, managing projects, or collecting payment? I am using the answers to improve the product.'],
                ['Soft offer', 'If useful, I can help set up your first client workflow: offer, outreach message, proposal template, project workspace, invoice, and payment flow. No pressure, only if it solves your current problem.']
              ].map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">{title}</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-6 text-center sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
              Udyam registered: {UDYAM_REGISTRATION_NUMBER}
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Start with the agency offer. Convert happy users into SaaS subscribers.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
              Contact: <a href={`mailto:${SUPPORT_EMAIL}`} className="font-black text-white hover:text-yellow-300">{SUPPORT_EMAIL}</a>
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/contact" className="btn btn-primary px-7 py-4 text-sm">
                Request Setup Help
              </Link>
              <Link to="/payment" className="btn btn-secondary px-7 py-4 text-sm">
                View Pro Plan
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
