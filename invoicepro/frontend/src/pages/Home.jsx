import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import { isLoggedIn } from '../utils/auth';
import { trackCtaClick } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';
import {
  COMPANY_NAME,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const coreValue = [
  {
    title: 'Find clients',
    text: 'Use AI to turn your skill into lead ideas, search links, outreach messages, and saved client opportunities.'
  },
  {
    title: 'Manage projects',
    text: 'Create proposals, invite another freelancer, split tasks, track issues, save docs, and keep delivery clear.'
  },
  {
    title: 'Get paid',
    text: 'Create invoices, share Razorpay or UPI-ready payment links, and track paid, pending, and overdue money.'
  }
];

const productFlow = [
  ['01', 'Lead', 'Find the right type of client and prepare the first message.'],
  ['02', 'Proposal', 'Write scope, timeline, price, and follow-up message.'],
  ['03', 'Project', 'Assign work, track issues, plan releases, and save handover notes.'],
  ['04', 'Payment', 'Send invoice, share payment link, and follow pending revenue.']
];

const whyPay = [
  'It helps freelancers earn more by finding and following up with clients.',
  'It helps solo freelancers take bigger projects with another freelancer.',
  'It keeps long-term client work organized with issues, releases, and docs.',
  'It protects cashflow by showing what payment or proposal needs action today.'
];

const previewRows = [
  ['Today', 'Message 3 warm leads', 'Sales action'],
  ['Project', 'Fix mobile navbar issue', 'High priority'],
  ['Release', 'Ship v1.2 client changes', 'Planned'],
  ['Payment', 'Follow up Rs 14,999 invoice', 'Pending']
];

const trustBadges = [
  ['Registered', UDYAM_REGISTRATION_NUMBER],
  ['Payments', 'Razorpay + UPI flow'],
  ['Support', SUPPORT_EMAIL],
  ['Built for', 'Freelancers and small teams']
];

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 'Rs 0',
    note: 'Start and test the workflow',
    features: ['Create limited invoices', 'Public invoice page', 'Basic client workflow'],
    cta: 'Create Free Account'
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: 'Rs 499',
    note: 'For active freelancers',
    features: ['Unlimited invoices', 'AI client finder and proposal writer', 'Team workspace and project maintenance'],
    cta: 'Start Pro'
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 'Rs 4999',
    note: 'Best for long-term business',
    features: ['Everything in Pro monthly', 'Recurring client workflow', 'Better value for serious freelancers'],
    cta: 'Choose Yearly'
  }
];

const faqs = [
  {
    question: 'Is this only for invoice creation?',
    answer: 'No. Invoices are only one part. ClientFlow AI also helps with client finding, proposals, project delivery, team work, issues, releases, docs, and payment follow-up.'
  },
  {
    question: 'Why would freelancers pay for it?',
    answer: 'Because the product helps them manage the full money flow: get client opportunities, close work, deliver projects, and collect payment faster.'
  },
  {
    question: 'Can I use it without a domain?',
    answer: 'Yes. You can use the core app, invoices, Razorpay or UPI links, and WhatsApp sharing without buying a domain.'
  },
  {
    question: 'Who is this best for?',
    answer: 'Freelancers, small agencies, developers, designers, marketers, consultants, and service businesses that need one place to manage client work and payments.'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  useDocumentMeta({
    title: `${COMPANY_NAME} - Find clients, manage projects, get paid`,
    description: 'ClientFlow AI helps freelancers find clients, manage delivery, create invoices, and collect payment from one workspace.'
  });

  const goToApp = (target, label) => {
    const nextPath = loggedIn ? target : '/signup';
    trackCtaClick(label, 'home', nextPath);
    navigate(nextPath);
  };

  const selectPlan = (planId) => {
    if (planId !== 'free') {
      localStorage.setItem('plan', planId);
    }

    const nextPath = planId === 'free'
      ? (loggedIn ? '/dashboard' : '/signup')
      : (loggedIn ? '/payment' : '/signup');

    trackCtaClick(`select_${planId}`, 'home_pricing', nextPath);
    navigate(nextPath);
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-yellow-400/10 via-sky-500/5 to-transparent" />
          <div className="container-custom relative grid gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                  Freelancer business workspace
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Find clients. Manage projects. Get paid.
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-zinc-400 sm:text-lg">
                ClientFlow AI helps freelancers turn leads into proposals, projects, invoices, and payments without jumping between many tools.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => goToApp('/dashboard', loggedIn ? 'open_dashboard' : 'start_free')}
                  className="btn btn-primary px-7 py-4 text-sm"
                >
                  {loggedIn ? 'Open Dashboard' : 'Create Free Account'}
                </button>
                <button
                  type="button"
                  onClick={() => goToApp('/client-finder', 'open_client_finder')}
                  className="btn btn-secondary px-7 py-4 text-sm"
                >
                  Try AI Client Finder
                </button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {['Lead to proposal', 'Project to invoice', 'Payment follow-up'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/30">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/30 p-5">
                <div className="flex items-center justify-between gap-4">
                  <BrandLogo showText={false} markClassName="h-12 w-12 sm:h-12 sm:w-12" />
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    Live workspace
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Today&apos;s business action</p>
                  <p className="mt-2 text-xl font-black leading-tight text-white">
                    Follow up the pending invoice, then message the warm proposal lead.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {previewRows.map(([label, title, status]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                          <p className="mt-1 text-sm font-black text-white">{title}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300">
                          {status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/40 py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">What it does</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                One workspace for the full freelancer business flow.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {coreValue.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
                  <h3 className="text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Simple workflow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                From first client message to final payment.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                The product is not trying to be everything. It focuses on the work that directly helps a freelancer earn and collect money.
              </p>
              <button
                type="button"
                onClick={() => goToApp('/dashboard', 'workflow_start')}
                className="mt-6 btn btn-primary px-6 py-3 text-sm"
              >
                Start Workflow
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {productFlow.map(([step, title, text]) => (
                <div key={step} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">{step}</p>
                  <h3 className="mt-3 text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-400/[0.045] py-14 sm:py-16">
          <div className="container-custom grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Why users pay</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Because it helps them make money, not just create invoices.
              </h2>
            </div>
            <div className="grid gap-3">
              {whyPay.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                  <p className="text-sm font-semibold leading-relaxed text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustBadges.map(([label, value]) => (
                <div key={label} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{label}</p>
                  <p className="mt-2 text-sm font-black leading-relaxed text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-white/5 bg-zinc-950/55 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Pricing</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Start free. Upgrade when ClientFlow helps your business.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">
                Keep the free plan for testing. Use Pro when you want AI agents, unlimited invoices, team projects, and project maintenance.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-[1.75rem] border p-6 transition-all hover:-translate-y-1 ${
                    plan.id === 'monthly'
                      ? 'border-yellow-300/35 bg-yellow-300/[0.08] shadow-2xl shadow-yellow-950/20'
                      : 'border-white/8 bg-white/[0.03]'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{plan.name}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    {plan.id !== 'free' && <span className="pb-1 text-xs font-bold text-zinc-500">/ plan</span>}
                  </div>
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
                    onClick={() => selectPlan(plan.id)}
                    className={`mt-6 w-full rounded-2xl px-5 py-4 text-sm font-black transition-all active:scale-95 ${
                      plan.id === 'monthly'
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                        : 'border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-14 sm:py-16">
          <div className="container-custom grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">FAQ</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Clear answers for new users.
              </h2>
            </div>
            <div className="grid gap-4">
              {faqs.map((item) => (
                <div key={item.question} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <h3 className="text-base font-black text-white">{item.question}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-black/25 py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[0.06] p-6 text-center sm:p-10">
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Build a cleaner freelancer business today.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
              Start with one lead, one proposal, one project, or one invoice. ClientFlow AI keeps the next money action visible.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => goToApp('/dashboard', 'final_start')}
                className="btn btn-primary px-7 py-4 text-sm"
              >
                {loggedIn ? 'Open Dashboard' : 'Create Free Account'}
              </button>
              <Link to="/contact" className="btn btn-secondary px-7 py-4 text-sm">
                Contact Support
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
