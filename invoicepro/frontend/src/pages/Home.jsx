import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { isLoggedIn } from '../utils/auth';
import {
  COMPANY_NAME,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackCtaClick } from '../utils/analytics';

const services = [
  {
    title: 'Find clients',
    description: 'Use AI to choose target customers, prepare search ideas, and write better first messages.'
  },
  {
    title: 'Send clear offers',
    description: 'Create simple service packages, proposal copy, discovery questions, and next-step messages.'
  },
  {
    title: 'Create invoices',
    description: 'Generate professional invoices with client details, due dates, line items, tax, logo, and PDF download.'
  },
  {
    title: 'Collect payments',
    description: 'Share invoice links, Razorpay payment flow, UPI details, WhatsApp follow-ups, and payment status tracking.'
  }
];

const steps = [
  {
    step: '1',
    title: 'Add your client or lead',
    description: 'Save who you want to work with and what service you want to sell.'
  },
  {
    step: '2',
    title: 'Create proposal or invoice',
    description: 'Use AI help, add work items, calculate totals, and prepare a client-ready invoice.'
  },
  {
    step: '3',
    title: 'Share and track payment',
    description: 'Send the link on WhatsApp, collect payment, and see what is paid, pending, or overdue.'
  }
];

const plans = [
  {
    name: 'Free',
    price: 'Rs 0',
    suffix: '/ forever',
    description: 'Try the basic workflow and create your first invoices.',
    features: ['2 invoices', 'Client records', 'Public invoice page'],
    cta: 'Create Free Account',
    action: 'start'
  },
  {
    name: 'Pro Monthly',
    price: 'Rs 499',
    suffix: '/ month',
    description: 'For freelancers who want client finding, invoicing, payments, and follow-up in one place.',
    features: ['Unlimited invoices', 'AI client finder', 'Razorpay, UPI, and WhatsApp sharing'],
    cta: 'Upgrade Monthly',
    action: 'monthly',
    featured: true
  },
  {
    name: 'Pro Annual',
    price: 'Rs 4,999',
    suffix: '/ year',
    description: 'For serious freelancers and small teams who want a full client-to-cash system.',
    features: ['Everything in Monthly', 'Recurring invoices', 'Best yearly value'],
    cta: 'Upgrade Yearly',
    action: 'yearly'
  }
];

const faqs = [
  {
    question: 'What does ClientFlow AI do?',
    answer: 'It helps freelancers and small businesses find clients, create invoices, share payment links, and track pending payments.'
  },
  {
    question: 'Is it only an invoice maker?',
    answer: 'No. It also includes AI client finding, proposal help, payment tracking, WhatsApp sharing, and recurring billing support.'
  },
  {
    question: 'Can clients pay without creating an account?',
    answer: 'Yes. You can share a public invoice link, and the client can view payment details without signing up.'
  },
  {
    question: 'Does it support India payments?',
    answer: 'Yes. It is built for Indian freelancers and small businesses with Razorpay, UPI-friendly details, and GST-ready invoice fields.'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  useDocumentMeta(
    'ClientFlow AI | Find Clients, Create Invoices, and Get Paid',
    'ClientFlow AI helps freelancers and small businesses find clients, create invoices, share payment links, and track pending payments.'
  );

  const goToApp = (source) => {
    const destination = loggedIn ? '/dashboard' : '/signup';
    trackCtaClick(loggedIn ? 'open_dashboard' : 'start_free', source, destination);
    navigate(destination);
  };

  const handlePlanAction = (action) => {
    if (action === 'start') {
      goToApp('home_pricing');
      return;
    }

    localStorage.setItem('plan', action);
    trackCtaClick(`select_${action}_plan`, 'home_pricing', loggedIn ? '/payment' : '/signup');
    navigate(loggedIn ? '/payment' : '/signup');
  };

  return (
    <div className="premium-page min-h-screen text-white selection:bg-emerald-300 selection:text-black">
      <Navbar />

      <main>
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24">
          <div className="container-custom grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] lg:items-center">
            <div className="max-w-3xl">
              <div className="premium-eyebrow w-full max-w-full flex-wrap sm:w-auto">
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400 text-emerald-400" />
                <p className="text-[10px] font-black uppercase leading-relaxed tracking-[0.16em] text-emerald-300 sm:text-[11px] sm:tracking-[0.22em]">
                  For freelancers and small businesses
                </p>
              </div>

              <h1 className="balance-copy mt-6 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
                Find clients, create invoices, and <span className="animated-gradient-text">get paid faster</span>.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-zinc-300 sm:text-lg">
                {COMPANY_NAME} is one simple workspace for client finding, proposals, invoices, Razorpay or UPI payment links, WhatsApp sharing, and payment tracking.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() => goToApp('home_hero')}
                  className="btn btn-primary px-8 py-5 text-base font-black shadow-2xl shadow-black/20 transition-all hover:-translate-y-0.5 active:scale-95 sm:text-lg"
                >
                  {loggedIn ? 'Open Dashboard' : 'Create Free Account'}
                </button>
                <a
                  href="#pricing"
                  className="btn btn-secondary px-8 py-5 text-center text-base font-black transition-all hover:-translate-y-0.5 sm:text-lg"
                >
                  See Pricing
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {['AI client finder', 'Invoice + PDF', 'Payment tracking'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black text-zinc-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-panel p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">What you get</p>
              <div className="mt-5 space-y-4">
                {services.map((service) => (
                  <div key={service.title} className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                    <h2 className="text-xl font-black text-white">{service.title}</h2>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">{service.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-zinc-950/50 py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Simple service</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                One product for the full client-to-payment workflow
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-zinc-400">
                Instead of using separate tools for leads, proposals, invoices, payment links, and reminders, keep everything connected in one place.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.title} className="rounded-[2rem] border border-white/8 bg-zinc-950 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-lg font-black text-black">
                    {item.step}
                  </span>
                  <h3 className="mt-5 text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container-custom grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Who is it for?</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Built for people who sell services, not products.
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-zinc-400">
                Perfect for web developers, designers, video editors, marketers, consultants, agencies, and small service businesses that need clients and payment collection.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Freelancers',
                'Small agencies',
                'Consultants',
                'Local service businesses'
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-white/8 bg-white/[0.03] p-6">
                  <p className="text-lg font-black text-white">{item}</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">
                    Manage leads, invoices, follow-ups, and payment status from one simple dashboard.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-zinc-950/40 py-16">
          <div className="container-custom">
            <div className="premium-panel p-6 sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Product preview</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Clear dashboard. Clear next action.
                  </h2>
                  <p className="mt-4 text-base font-medium leading-relaxed text-zinc-400">
                    See which invoices are paid, pending, or overdue. Create invoices, share payment links, and follow up through WhatsApp.
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/8 bg-black/30 p-5">
                  <div className="flex items-center justify-between border-b border-white/8 pb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">This month</p>
                      <p className="mt-1 text-2xl font-black text-white">Rs 42,500</p>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300">
                      Tracking
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {[
                      ['Paid invoices', 'Rs 24,000', 'text-emerald-300'],
                      ['Pending invoices', 'Rs 13,500', 'text-yellow-300'],
                      ['Overdue follow-up', 'Rs 5,000', 'text-red-300']
                    ].map(([label, value, color]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <p className="text-sm font-bold text-zinc-300">{label}</p>
                        <p className={`text-sm font-black ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16 sm:py-20">
          <div className="container-custom">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Pricing</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Start free. Upgrade when it helps your business.
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-zinc-400">
                Paid plans are for users who want unlimited invoicing, AI client finding, payment collection, and follow-up tools.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={
                    plan.featured
                      ? 'relative flex h-full flex-col rounded-[2rem] border-2 border-yellow-400/40 bg-yellow-400/8 p-6 shadow-2xl shadow-yellow-400/10'
                      : 'flex h-full flex-col rounded-[2rem] border border-white/8 bg-zinc-950 p-6'
                  }
                >
                  {plan.featured && (
                    <span className="mb-4 w-max rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
                      Most useful
                    </span>
                  )}
                  <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{plan.description}</p>
                  <p className="mt-7 text-4xl font-black text-white">
                    {plan.price}
                    <span className="ml-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{plan.suffix}</span>
                  </p>

                  <div className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        <p className="text-sm font-medium leading-relaxed text-zinc-300">{feature}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePlanAction(plan.action)}
                    className={
                      plan.featured
                        ? 'mt-8 w-full rounded-2xl bg-yellow-400 py-4 text-base font-black text-black transition-all hover:bg-yellow-300 active:scale-95 lg:mt-auto'
                        : 'mt-8 w-full rounded-2xl border border-white/10 bg-zinc-900 py-4 text-base font-black text-white transition-all hover:bg-zinc-800 active:scale-95 lg:mt-auto'
                    }
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-center text-sm font-medium leading-relaxed text-zinc-500">
              Questions before paying? Email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-black text-zinc-300 hover:text-yellow-300">
                {SUPPORT_EMAIL}
              </a>.
            </p>
          </div>
        </section>

        <section className="border-y border-white/5 bg-zinc-950/50 py-16">
          <div className="container-custom grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Trust</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Real business details, simple policies.
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-zinc-400">
                {COMPANY_NAME} is built in India for service businesses. Public policy pages and support details are available before users pay.
              </p>
              <div className="mt-6 rounded-3xl border border-emerald-400/15 bg-emerald-400/8 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Udyam registered</p>
                <p className="mt-2 break-all text-sm font-black text-white">{UDYAM_REGISTRATION_NUMBER}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Privacy Policy', '/privacy'],
                ['Terms of Use', '/terms'],
                ['Refund Policy', '/refund-policy'],
                ['Digital Delivery', '/shipping-policy']
              ].map(([label, to]) => (
                <Link
                  key={label}
                  to={to}
                  className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 text-lg font-black text-white transition-all hover:-translate-y-1 hover:border-yellow-400/25"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-16 sm:py-20">
          <div className="container-custom">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">FAQ</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Quick answers
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {faqs.map((item) => (
                <div key={item.question} className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
                  <h3 className="text-lg font-black text-white">{item.question}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 py-16 sm:py-20">
          <div className="container-custom">
            <div className="premium-panel px-6 py-12 text-center sm:px-10">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Start simple</p>
              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                Create your free workspace and send your first invoice.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed text-zinc-400">
                You can test the product free, then upgrade only when it helps you manage clients and payments better.
              </p>
              <button
                onClick={() => goToApp('home_bottom')}
                className="btn btn-primary mt-8 px-8 py-5 text-base font-black shadow-2xl shadow-black/20 transition-all hover:-translate-y-0.5 active:scale-95 sm:text-lg"
              >
                {loggedIn ? 'Open Dashboard' : 'Create Free Account'}
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
