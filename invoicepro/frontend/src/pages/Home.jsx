import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { SUPPORT_EMAIL } from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';

const trustSignals = [
  {
    title: 'Public invoice links',
    description: 'Clients can open the invoice or proposal from a normal browser without creating an account.'
  },
  {
    title: 'Razorpay and UPI collection',
    description: 'Use a recognizable checkout flow with Razorpay and provide UPI-ready payment details.'
  },
  {
    title: 'GST and business details',
    description: 'Keep totals, tax fields, due dates, and company information visible before payment starts.'
  },
  {
    title: 'Recurring billing built in',
    description: 'Set up monthly client work once and keep repeat invoices organized from the same dashboard.'
  }
];

const workflow = [
  {
    step: '01',
    title: 'Prepare a complete invoice',
    description: 'Add client details, line items, GST fields, due dates, notes, and payment instructions in one place.'
  },
  {
    step: '02',
    title: 'Share a link clients understand',
    description: 'Send a clean invoice page by email or chat so clients see the amount, due date, and payment options clearly.'
  },
  {
    step: '03',
    title: 'Track payment status without guesswork',
    description: 'Monitor pending and paid invoices, send reminders, and manage recurring billing for repeat clients.'
  }
];

const proofBlocks = [
  {
    title: 'Clear before clients pay',
    description: 'The billing page can show the invoice number, due date, itemized amount, tax split, and who the invoice is from.',
    bullets: ['Business identity and client details on the same screen', 'Line-item totals with CGST and SGST when used', 'A payment page that feels like part of a real billing workflow']
  },
  {
    title: 'Checkout they recognize',
    description: 'When the invoice is ready to collect, clients can use a familiar Razorpay flow or pay from a UPI app.',
    bullets: ['Razorpay checkout for online collection', 'UPI QR and deep-link options on public invoices', 'Paid status reflected back into the product after collection']
  },
  {
    title: 'Support that is actually reachable',
    description: 'The homepage now shows a real contact path so the product does not feel anonymous or unfinished.',
    bullets: ['Visible support email in the landing experience', 'Pricing presented before checkout starts', 'No fake roadmap or placeholder resource links']
  }
];

const faqs = [
  {
    question: 'Do my clients need an InvoicePro account to pay?',
    answer: 'No. Invoice and proposal links open in a browser, so clients can review the document and pay without signing up.'
  },
  {
    question: 'Can I collect through UPI or Razorpay?',
    answer: 'Yes. The product supports Razorpay checkout and also exposes UPI-friendly payment details on public invoices.'
  },
  {
    question: 'Is this only for one-off invoices?',
    answer: 'No. InvoicePro also supports recurring invoice schedules for retainers and repeat monthly billing.'
  },
  {
    question: 'Can I include GST information and business details?',
    answer: 'Yes. The invoice flow includes GST-related fields, company details, due dates, and client information.'
  }
];

const plans = [
  {
    name: 'Free',
    price: 'Rs 0',
    suffix: '/ forever',
    description: 'For testing your invoice flow with the first few client payments.',
    features: ['2 invoices included', 'Public invoice page', 'Saved client basics'],
    cta: 'Start Free',
    featured: false,
    action: 'start'
  },
  {
    name: 'Pro Monthly',
    price: 'Rs 499',
    suffix: '/ month',
    description: 'For consultants and solo operators who bill clients every month.',
    features: ['Unlimited invoices', 'Razorpay and UPI collection flow', 'Recurring invoices'],
    cta: 'Upgrade Monthly',
    featured: false,
    action: 'monthly'
  },
  {
    name: 'Pro Annual',
    price: 'Rs 4,999',
    suffix: '/ year',
    description: 'For agencies and repeat-billing teams that want the lower effective monthly cost.',
    features: ['Everything in Monthly', 'Annual savings versus paying monthly', 'Priority support'],
    cta: 'Save With Annual',
    featured: true,
    action: 'yearly'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  useDocumentMeta(
    'InvoicePro | Invoicing and Payment Links for Indian Service Businesses',
    'Create invoices, share public payment links, and manage recurring billing with a client-ready workflow.'
  );

  const handleSubscribe = (plan) => {
    localStorage.setItem('plan', plan);
    navigate(loggedIn ? '/payment' : '/signup');
  };

  const jumpToSection = (id) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePlanAction = (action) => {
    if (action === 'start') {
      navigate(loggedIn ? '/dashboard' : '/signup');
      return;
    }

    handleSubscribe(action);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-yellow-400 selection:text-black">
      <Navbar />

      <main>
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-yellow-400/8 blur-[150px]" />
            <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-emerald-400/8 blur-[120px]" />
          </div>

          <div className="container-custom relative z-10 grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="reveal inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Professional invoicing for Indian service businesses
                </p>
              </div>

              <h1 className="reveal reveal-delay-1 mt-8 max-w-4xl text-5xl font-black tracking-tight leading-[0.92] text-white md:text-7xl">
                Invoices your clients can open, trust, and pay without confusion.
              </h1>

              <p className="reveal reveal-delay-2 mt-6 max-w-2xl text-lg font-medium leading-relaxed text-zinc-300 md:text-xl">
                InvoicePro helps freelancers, agencies, and consultants send structured invoices,
                collect through public payment links, and stay on top of repeat billing with fewer manual follow-ups.
              </p>

              <div className="reveal reveal-delay-2 mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Checkout</p>
                  <p className="mt-2 text-sm font-semibold text-white">Razorpay-backed online payment flow</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Visibility</p>
                  <p className="mt-2 text-sm font-semibold text-white">Public invoice pages with totals and due dates</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Support</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2 block text-sm font-semibold text-white hover:text-yellow-300">
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>

              <div className="reveal reveal-delay-3 mt-10 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() => navigate(loggedIn ? '/dashboard' : '/signup')}
                  className="w-full rounded-2xl bg-white px-10 py-5 text-lg font-black text-black shadow-2xl shadow-white/10 transition-all hover:scale-[1.02] active:scale-95 sm:w-auto"
                >
                  {loggedIn ? 'Open Dashboard' : 'Start Free'}
                </button>
                <button
                  onClick={() => (loggedIn ? navigate('/create-invoice') : jumpToSection('pricing'))}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-10 py-5 text-lg font-black text-white transition-all hover:bg-zinc-800 sm:w-auto"
                >
                  {loggedIn ? 'Create Invoice' : 'See Pricing'}
                </button>
              </div>

              <div className="reveal reveal-delay-3 mt-8 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                <span className="rounded-full border border-white/10 px-3 py-2">No client login required</span>
                <span className="rounded-full border border-white/10 px-3 py-2">Recurring billing support</span>
                <span className="rounded-full border border-white/10 px-3 py-2">GST-ready invoice fields</span>
              </div>
            </div>

            <div className="reveal reveal-delay-3">
              <div className="rounded-[2.25rem] border border-white/10 bg-zinc-950/85 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Trust Snapshot</p>
                    <h2 className="mt-2 text-3xl font-black text-white">What feels reliable to a client</h2>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Public Flow</p>
                    <p className="mt-1 text-lg font-black text-white">Client-ready</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Before payment</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <p className="text-sm font-medium leading-relaxed text-zinc-300">
                          Invoice number, due date, line items, and tax totals are visible before a client commits.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <p className="text-sm font-medium leading-relaxed text-zinc-300">
                          Company details, client details, and payment instructions sit in the same flow.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">During payment</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Checkout path</p>
                        <p className="mt-2 text-sm font-semibold text-white">Razorpay checkout for online payment</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Alternative</p>
                        <p className="mt-2 text-sm font-semibold text-white">UPI-friendly payment route for mobile-first clients</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/15 bg-emerald-400/8 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">After payment</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-black">1</span>
                        <p className="text-sm font-semibold text-white">Invoice status can move from pending to paid</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-black">2</span>
                        <p className="text-sm font-semibold text-white">Collected amounts stay visible in the workspace dashboard</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-zinc-950/60 py-16">
          <div className="container-custom">
            <div className="mb-10 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Why it feels safer</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-white">Trust signals grounded in the actual workflow</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {trustSignals.map((signal) => (
                <div key={signal.title} className="rounded-3xl border border-white/8 bg-white/[0.02] p-6">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-yellow-300">{signal.title}</p>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">{signal.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#050505] py-24">
          <div className="container-custom">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Workflow</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
                From draft to paid, the flow stays easy to understand
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed text-zinc-400">
                A more trustworthy homepage should make the product feel operational, not hypothetical. These are the core steps the app actually supports.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {workflow.map((item) => (
                <div key={item.title} className="group rounded-[2rem] border border-white/8 bg-zinc-950/70 p-8 transition-all duration-300 hover:border-yellow-400/20 hover:bg-zinc-950">
                  <span className="text-3xl font-black text-white/15 transition-colors group-hover:text-yellow-400/40">{item.step}</span>
                  <h3 className="mt-6 text-2xl font-black text-white">{item.title}</h3>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="border-t border-white/5 bg-zinc-950/40 py-24">
          <div className="container-custom">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="rounded-[2.5rem] border border-white/8 bg-zinc-950 p-8 sm:p-10">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Client-facing view</p>
                <h2 className="mt-4 max-w-xl text-4xl font-black tracking-tight text-white">
                  What your clients see should answer their questions before they ask.
                </h2>

                <div className="mt-8 rounded-[2rem] border border-white/8 bg-black/30 p-6">
                  <div className="flex flex-col gap-6 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Invoice Summary</p>
                      <p className="mt-2 text-2xl font-black text-white">INV-2026-104</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Status</p>
                      <p className="mt-1 text-sm font-black text-white">Pending payment</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Prepared for</p>
                      <p className="mt-2 text-sm font-semibold text-white">Client identity, due date, and line items</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Prepared by</p>
                      <p className="mt-2 text-sm font-semibold text-white">Business profile, GST details, and payment instructions</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Payment options</p>
                      <p className="mt-2 text-sm font-semibold text-white">Razorpay checkout and UPI-friendly payment route</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">After collection</p>
                      <p className="mt-2 text-sm font-semibold text-white">Paid state reflected back into the invoice view</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5">
                {proofBlocks.map((block) => (
                  <div key={block.title} className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-8">
                    <h3 className="text-2xl font-black text-white">{block.title}</h3>
                    <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">{block.description}</p>
                    <div className="mt-6 space-y-3">
                      {block.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-start gap-3">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                          <p className="text-sm font-medium leading-relaxed text-zinc-300">{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-24">
          <div className="container-custom">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Pricing</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
                Transparent plans before checkout begins
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-zinc-400">
                The homepage now frames pricing more like a real billing product: clear plan scope, visible totals, and secure checkout on paid plans.
              </p>
            </div>

            <div className="mx-auto mb-8 max-w-3xl rounded-[2rem] border border-yellow-400/15 bg-yellow-400/8 px-6 py-5 text-center">
              <p className="text-sm font-semibold leading-relaxed text-yellow-100">
                Paid subscriptions use secure Razorpay checkout. The plan amount is shown before payment starts, and support is reachable at{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-black text-white hover:text-yellow-200">
                  {SUPPORT_EMAIL}
                </a>.
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={plan.featured
                    ? 'relative flex flex-col justify-between rounded-[2.75rem] border-2 border-yellow-400/40 bg-yellow-400/6 p-10 shadow-2xl shadow-yellow-400/10'
                    : 'flex flex-col justify-between rounded-[2.75rem] border border-white/8 bg-zinc-950 p-10'
                  }
                >
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-black">
                      Best Value
                    </div>
                  )}

                  <div>
                    <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{plan.description}</p>
                    <p className="mt-8 text-5xl font-black tracking-tight text-white">
                      {plan.price}
                      <span className="ml-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-500">{plan.suffix}</span>
                    </p>

                    <div className="mt-8 space-y-4">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-3">
                          <svg className={`h-5 w-5 ${plan.featured ? 'text-yellow-400' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-sm font-medium text-zinc-300">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlanAction(plan.action)}
                    className={plan.featured
                      ? 'mt-10 w-full rounded-2xl bg-yellow-400 py-5 text-base font-black text-black shadow-xl shadow-yellow-400/20 transition-all hover:bg-yellow-300 active:scale-95'
                      : 'mt-10 w-full rounded-2xl border border-white/10 bg-zinc-900 py-5 text-base font-black text-white transition-all hover:bg-zinc-800 active:scale-95'
                    }
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-white/5 bg-zinc-950/50 py-24">
          <div className="container-custom">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">FAQ</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-white">Questions a careful buyer will ask</h2>
                <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-zinc-400">
                  Adding these answers to the homepage makes the product feel more accountable and less like a generic landing page.
                </p>

                <div className="mt-8 rounded-[2rem] border border-white/8 bg-white/[0.02] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Need a human answer?</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">
                    Reach out directly before you subscribe or if you want help setting up your billing workflow.
                  </p>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="mt-5 inline-flex rounded-2xl border border-white/10 bg-zinc-900 px-5 py-3 text-sm font-black text-white transition-all hover:bg-zinc-800"
                  >
                    Email {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>

              <div className="grid gap-4">
                {faqs.map((item) => (
                  <div key={item.question} className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-6 sm:p-7">
                    <h3 className="text-xl font-black text-white">{item.question}</h3>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 py-24">
          <div className="container-custom">
            <div className="relative overflow-hidden rounded-[3rem] border border-white/8 bg-gradient-to-br from-zinc-900 to-black px-8 py-14 text-center sm:px-12 sm:py-20">
              <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-yellow-400/10 blur-[120px]" />
              <div className="absolute left-0 bottom-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-[120px]" />

              <div className="relative z-10 mx-auto max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Ready to collect more professionally?</p>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
                  Send a billing link that looks complete before the client even reaches checkout.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-zinc-400">
                  Start with the free plan, or reach out directly if you want to confirm the workflow before you upgrade.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    onClick={() => navigate(loggedIn ? '/dashboard' : '/signup')}
                    className="rounded-2xl bg-white px-10 py-5 text-lg font-black text-black shadow-2xl shadow-white/10 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {loggedIn ? 'Open Dashboard' : 'Claim Your Free Workspace'}
                  </button>
                  <button
                    onClick={() => jumpToSection('faq')}
                    className="rounded-2xl border border-white/10 bg-zinc-900 px-10 py-5 text-lg font-black text-white transition-all hover:bg-zinc-800"
                  >
                    Read FAQ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
