import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getFreeAccessState, getUser, hasProAccess, isFreeFullAccessEnabled, isLoggedIn, setPostLoginRedirect } from '../utils/auth';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME, SUPPORT_EMAIL } from '../utils/company';
import { trackCtaClick } from '../utils/analytics';

const markets = {
  india: {
    label: 'India billing',
    detail: 'INR checkout with Razorpay, UPI, cards, and supported Indian payment methods.',
    monthly: 'Rs 499',
    yearly: 'Rs 4,999',
    founder: 'Rs 899',
    setupStart: 'Rs 999',
    automationStart: 'Rs 1,499',
    teamSetup: 'Rs 4,999',
    enterpriseSeat: 'Rs 299/user'
  },
  global: {
    label: 'International billing',
    detail: 'USD checkout for users outside India when international payments are enabled.',
    monthly: '$9',
    yearly: '$89',
    founder: '$16',
    setupStart: '$19',
    automationStart: '$29',
    teamSetup: '$99',
    enterpriseSeat: '$5/user'
  }
};

const getSafeMarket = (value) => (
  String(value || '').toLowerCase() === 'global' ? 'global' : 'india'
);

const paymentOptions = [
  {
    id: 'free',
    label: 'Free Trial',
    badge: '30 DAYS FREE',
    title: '30 days full software access',
    detail: 'Try the complete lead-to-payment workflow, create GST invoices, and test AI tools on real client work for 30 days after login.',
    bestFor: 'New users testing ClientFlow AI before committing to a paid software plan.',
    cta: 'Start Free Access',
    tone: 'sky',
    points: [
      'Full software access for 30 days — no credit card needed',
      'GST invoicing, Razorpay links & AI proposal generator',
      'Data is never locked — free read-only access & export anytime'
    ]
  },
  {
    id: 'monthly',
    label: 'Pro Monthly',
    badge: 'POPULAR',
    title: 'Monthly flexible access',
    detail: 'Full monthly access to all freelancer tools, GST invoicing, payment follow-up, and AI client workspace.',
    bestFor: 'Active freelancers who want complete flexibility with monthly billing.',
    cta: 'Get Pro Monthly',
    tone: 'yellow',
    points: [
      'Includes all AI tools: Proposal Generator, Client Coach & Sales Agent',
      'Unlimited GST invoices, Razorpay links & payment reminders',
      'Cancel or pause your subscription anytime from settings'
    ]
  },
  {
    id: 'founder90',
    label: 'Founder 90-Day Pass',
    badge: 'SAVE 40%',
    title: '3-Month quarterly access',
    detail: 'Get 90 days of full Pro software access for just Rs 899 (approx. Rs 299/mo). One-time checkout with zero auto-recurring renewals.',
    bestFor: 'Freelancers testing the full workflow across multiple project cycles.',
    cta: 'Claim Founder Pass',
    tone: 'purple',
    points: [
      '90 days of full Pro workspace access for Rs 899 (Rs 299/mo)',
      'One-time payment — NO auto-recurring monthly charges',
      'Save 40% compared to paying Rs 499 monthly for 3 months'
    ]
  },
  {
    id: 'yearly',
    label: 'Pro Annual',
    badge: '2 MONTHS FREE',
    title: 'Yearly stable workflow',
    detail: 'Same complete Pro features as Monthly, billed once per year at Rs 4,999/yr (~Rs 416/mo). Best value for retainer & long-term work.',
    bestFor: 'Established freelancers and small studios managing recurring retainers.',
    cta: 'Get Pro Annual',
    tone: 'emerald',
    points: [
      '12 full months of Pro workspace access for Rs 4,999/yr',
      'Save over 17% compared to monthly billing (2 months free)',
      'Best for retainer invoicing, long projects & stable income tracking'
    ]
  }
];

const servicePayments = [
  {
    title: '1-on-1 Managed Growth Setup (Done-For-You)',
    priceKey: 'setupStart',
    detail: 'Complete done-for-you setup: offer structure, lead tracking pipeline, proposal templates, workrooms, GST invoicing, payment reminders, and 7-day action plan with direct founder support.',
    path: '/payments/agency-setup',
    cta: 'Book 1-on-1 Managed Setup',
    featured: true,
    badge: 'Done-For-You Setup Service',
    highlight: 'agency'
  }
];

const whyPay = [
  ['Recover delayed money', 'If one pending invoice gets collected faster, Pro can be worth more than the monthly price.'],
  ['Close faster', 'Cleaner proposals, deal rooms, and follow-ups reduce confusion before the client pays.'],
  ['Save business time', 'One workspace reduces switching between notes, chat, invoices, files, and reminders.'],
  ['Look serious', 'A clear workroom, invoice, proof, and payment follow-up makes freelancers look more professional.']
];

const checkoutSteps = [
  ['Choose payment type', 'Free, Pro, Founder access, Agency Setup, Automation Setup, Enterprise Seats, or Enterprise Team Setup.'],
  ['Login or signup', 'A workspace account is required so access can be attached to the correct user.'],
  ['Pay securely', 'Checkout runs through configured payment providers such as Razorpay.'],
  ['Use the workflow', 'New users get 30 days free. After that, paid software plans or setup services can be used when needed.']
];

const toneClass = {
  sky: 'border-sky-300/25 bg-sky-300/[0.06]',
  yellow: 'border-yellow-300/35 bg-yellow-300/[0.08]',
  emerald: 'border-emerald-300/30 bg-emerald-300/[0.07]',
  purple: 'border-purple-300/25 bg-purple-300/[0.06]'
};

const checkoutTypes = [
  {
    title: 'Freelance Workflow',
    label: 'Software subscription',
    detail: 'Free, Pro Monthly, Pro Annual, and Founder 90 Days software access.',
    path: '/payments/freelance-workflow',
    cta: 'Open Workflow Payment',
    tone: 'yellow'
  },
  {
    title: 'Agency Setup',
    label: 'Done-for-you freelancer setup',
    detail: 'Starter Setup, Growth Setup, and Managed Growth for freelancer workflow setup.',
    path: '/payments/agency-setup',
    cta: 'Open Agency Payment',
    tone: 'sky'
  },
  {
    title: 'Automation Setup',
    label: 'Done-for-you automation',
    detail: 'Reminder automation, connected client workflow automation, and managed automation support.',
    path: '/payments/automation-setup',
    cta: 'Open Automation Payment',
    tone: 'purple'
  },
  {
    title: 'Enterprise Team Setup',
    label: 'Guided team setup',
    detail: 'Team setup for roles, security, audit/export habits, and first workrooms.',
    path: '/payments/enterprise',
    cta: 'Open Enterprise Payment',
    tone: 'emerald'
  }
];

export default function PaymentsOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = isLoggedIn();
  const user = loggedIn ? getUser() : null;
  const isPro = hasProAccess(user);
  const freeFullAccessEnabled = isFreeFullAccessEnabled();
  const freeAccessState = getFreeAccessState(user);
  const [market, setMarket] = useState(() => {
    const queryMarket = new URLSearchParams(location.search).get('market');
    return getSafeMarket(queryMarket || localStorage.getItem('billingMarket'));
  });
  const currentMarket = markets[market];

  useDocumentMeta({
    title: `${COMPANY_NAME} Payment Center`,
    description: 'One ClientFlow AI payment center for free access, Pro workflow, agency setup, automation setup, and enterprise services.',
    path: '/payments'
  });

  const updateMarket = (nextMarket) => {
    const safeMarket = getSafeMarket(nextMarket);
    localStorage.setItem('billingMarket', safeMarket);
    setMarket(safeMarket);
    trackCtaClick(`select_${safeMarket}_billing`, 'payments_page', `/payments?market=${safeMarket}`);
  };

  const startFree = () => {
    if (!loggedIn) {
      setPostLoginRedirect('/client-flow');
      trackCtaClick('payments_start_free', 'payments_page', '/signup');
      navigate('/signup');
      return;
    }

    trackCtaClick('payments_open_free_workspace', 'payments_page', '/client-flow');
    navigate('/client-flow');
  };

  const startCheckout = (planId) => {
    localStorage.setItem('plan', planId);
    localStorage.setItem('billingMarket', market);
    const checkoutPath = `/checkout/${planId}?market=${market}`;

    if (!loggedIn) {
      setPostLoginRedirect(checkoutPath);
      trackCtaClick(`payments_${planId}`, 'payments_page', '/signup');
      navigate('/signup');
      return;
    }

    trackCtaClick(`payments_${planId}`, 'payments_page', checkoutPath);
    navigate(checkoutPath);
  };

  const priceFor = (option) => {
    if (option.id === 'free') return 'Rs 0 / $0';
    if (option.id === 'monthly') return `${currentMarket.monthly}/month`;
    if (option.id === 'yearly') return `${currentMarket.yearly}/year`;
    if (option.id === 'founder90') return `${currentMarket.founder}/90 days`;
    return '';
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="border-b border-white/5 bg-zinc-950/70 py-14 sm:py-16 lg:py-20">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Simple Freelancer Pricing</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Transparent plans. Zero hidden fees.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-zinc-400">
                Start with 30 days of full software access — no credit card required. Pick a software plan when you're ready to power your freelance career.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button type="button" onClick={startFree} className="btn btn-primary px-7 py-4 text-sm">
                  {loggedIn ? 'Open Workspace' : 'Start 30 Days Free →'}
                </button>
                <a href="#setup-service-payments" className="rounded-2xl border border-white/15 bg-white/[0.04] px-7 py-4 text-center text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/[0.09]">
                  1-on-1 Setup Help →
                </a>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Select Currency / Region</p>
              <div className="mt-4 grid gap-3">
                {Object.entries(markets).map(([id, option]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateMarket(id)}
                    className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                      market === id
                        ? 'border-yellow-300/45 bg-yellow-300/10 text-white'
                        : 'border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="block text-sm font-black">{option.label}</span>
                    <span className="mt-1 block text-xs font-semibold leading-relaxed text-zinc-500">{option.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Software Access Plans</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Choose the plan that fits your business.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                All plans include full software capabilities: GST invoicing, Razorpay payment links, AI proposal writer, client deal rooms, and payment reminders.
              </p>
              {loggedIn && freeAccessState.active && (
                <p className="mt-3 text-sm font-black text-emerald-200">
                  Your free trial has {freeAccessState.daysLeft} day{freeAccessState.daysLeft === 1 ? '' : 's'} remaining.
                </p>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {paymentOptions.map((option) => (
                <div key={option.id} className={`relative flex flex-col justify-between rounded-[1.75rem] border p-6 transition-all hover:-translate-y-1 ${toneClass[option.tone] || toneClass.sky}`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{option.label}</p>
                      {option.badge && (
                        <span className="rounded-full bg-yellow-400/20 border border-yellow-400/40 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-yellow-300">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-xl font-black leading-tight text-white">{option.title}</h3>
                    <p className="mt-4 text-3xl font-black text-white">{priceFor(option)}</p>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">{option.detail}</p>
                    <p className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3 text-xs font-bold leading-relaxed text-zinc-300">
                      {option.bestFor}
                    </p>
                    <div className="mt-5 grid gap-2">
                      {option.points.map((point) => (
                        <p key={point} className="text-xs font-semibold leading-relaxed text-zinc-400 flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                          {point}
                        </p>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startCheckout(option.id)}
                    className={`mt-6 w-full rounded-2xl px-5 py-4 text-sm font-black transition-all active:scale-95 ${
                      option.id === 'monthly' || option.id === 'founder90'
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/10'
                        : 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/10'
                    }`}
                  >
                    {freeFullAccessEnabled && option.id !== 'free' && freeAccessState.active
                      ? 'Free Window Active'
                      : option.id === 'monthly' && isPro
                        ? 'Open Workspace'
                        : option.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="setup-service-payments" className="border-b border-white/5 bg-yellow-400/[0.04] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">1-on-1 Setup Service</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Need hands-on help setting up your freelance business workflow?
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Get direct 1-on-1 done-for-you setup: we help configure your offer, lead pipeline, proposal templates, GST invoicing, payment follow-up, and 7-day growth plan.
              </p>
              <div className="mt-6">
                <Link to="/payments/agency-setup" className="inline-flex btn btn-primary px-6 py-3 text-sm">
                  Book 1-on-1 Managed Setup →
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {servicePayments.map((item) => {
                const isAgencySetup = item.highlight === 'agency';
                const isAutomationSetup = item.highlight === 'automation';
                const isEnterpriseSetup = item.highlight === 'enterprise';

                return (
                  <Link
                    key={item.title}
                    to={item.path}
                    className={`rounded-[1.5rem] border p-5 transition-all hover:-translate-y-1 ${
                      isAgencySetup
                        ? 'border-yellow-300/35 bg-yellow-300/[0.1] shadow-2xl shadow-yellow-950/20 hover:border-yellow-300/50'
                        : isAutomationSetup
                          ? 'border-sky-300/35 bg-sky-300/[0.1] shadow-2xl shadow-sky-950/20 hover:border-sky-300/50'
                        : isEnterpriseSetup
                          ? 'border-emerald-300/35 bg-emerald-300/[0.1] shadow-2xl shadow-emerald-950/20 hover:border-emerald-300/50'
                          : 'border-white/8 bg-black/25 hover:border-sky-300/25'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        {item.badge && (
                          <span className={`mb-3 inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                            isEnterpriseSetup
                              ? 'border-emerald-300/20 bg-emerald-300/15 text-emerald-100'
                              : isAutomationSetup
                                ? 'border-sky-300/20 bg-sky-300/15 text-sky-100'
                              : 'border-yellow-300/20 bg-yellow-300/15 text-yellow-100'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        <h3 className="text-xl font-black text-white">{item.title}</h3>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{item.detail}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
                        From {currentMarket[item.priceKey]}
                      </span>
                    </div>
                    <p className={`mt-4 text-[10px] font-black uppercase tracking-widest ${
                      isAgencySetup ? 'text-yellow-200' : isAutomationSetup ? 'text-sky-200' : isEnterpriseSetup ? 'text-emerald-200' : 'text-sky-300'
                    }`}>{item.cta}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Why pay?</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                The value is business control, not just buttons.
              </h2>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {whyPay.map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                  <h3 className="text-lg font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Payment flow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Simple path before checkout.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Users should understand what they are paying for before they reach the checkout page.
              </p>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-500">
                Billing support: {SUPPORT_EMAIL}
              </p>
            </div>

            <div className="grid gap-4">
              {checkoutSteps.map(([title, text], index) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
