import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getUser, hasProAccess, isLoggedIn, setPostLoginRedirect } from '../utils/auth';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME, SUPPORT_EMAIL } from '../utils/company';
import { trackCtaClick } from '../utils/analytics';

const markets = {
  india: {
    label: 'India billing',
    detail: 'INR checkout with Razorpay, UPI, cards, and supported Indian payment methods.',
    monthly: 'Rs 499',
    yearly: 'Rs 4,999',
    founder: 'Rs 999',
    setupStart: 'Rs 999',
    teamSetup: 'Rs 4,999',
    enterpriseSeat: 'Rs 299/user'
  },
  global: {
    label: 'International billing',
    detail: 'USD checkout for users outside India when international payments are enabled.',
    monthly: '$9',
    yearly: '$89',
    founder: '$19',
    setupStart: '$19',
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
    label: 'Free Access',
    title: 'Test the workflow first',
    detail: 'Use the product, understand the lead-to-payment flow, and create your workspace before paying.',
    bestFor: 'New users who are checking whether ClientFlow AI fits their freelance workflow.',
    cta: 'Start Free',
    tone: 'sky',
    points: ['Login or signup required', 'Good for learning the workflow', 'Upgrade only when the full workflow is useful']
  },
  {
    id: 'monthly',
    label: 'Pro Workflow',
    title: 'Monthly access for active freelancers',
    detail: 'Monthly access to the full lead-to-payment workflow. Best when you want to pay month by month while using the product on real client work.',
    bestFor: 'Freelancers who are actively finding clients, sending proposals, managing delivery, and collecting money.',
    cta: 'Buy Pro Monthly',
    tone: 'yellow',
    points: [
      'AI Client Coach, Client Finder, Sales Agent, Proposal Writer, Deal Room, Workroom, invoices, payment follow-up, Money GPS, Growth Plan, Profit Tracker',
      'Best for active freelancers who want flexibility and monthly billing',
      'Cancel from payment management when subscription is active'
    ]
  },
  {
    id: 'yearly',
    label: 'Pro Annual',
    title: 'Yearly access for stable workflow',
    detail: 'Same full Pro workflow as Monthly, but paid once for the year. Best when you want one stable workflow for repeat clients and retainers.',
    bestFor: 'Freelancers and small teams building a stable direct-client system.',
    cta: 'Buy Pro Yearly',
    tone: 'emerald',
    points: [
      'Everything in Pro Monthly for 12 months',
      'Better value than paying monthly for a full year',
      'Best for repeat clients, retainers, long projects, and stable income tracking'
    ]
  },
  {
    id: 'founder90',
    label: 'Founder 90 Days',
    title: 'Short paid access for early users',
    detail: 'Try the full product for 90 days without choosing a long subscription first.',
    bestFor: 'Users who want enough time to test the full workflow on real client work.',
    cta: 'Buy Founder Access',
    tone: 'purple',
    points: ['One-time checkout', '90 days full workflow', 'Good before committing monthly or yearly']
  }
];

const servicePayments = [
  {
    title: 'Agency Setup',
    priceKey: 'setupStart',
    detail: 'Done-for-you help to set up offer, lead plan, proposal flow, workroom, invoice, payment follow-up, and 7-day action plan.',
    path: '/payments/agency-setup',
    cta: 'Pay Agency Setup',
    featured: true,
    badge: 'Freelancer setup service',
    highlight: 'agency'
  },
  {
    title: 'Enterprise Seats',
    priceKey: 'enterpriseSeat',
    detail: 'Company workspace with members, roles, SSO settings, audit exports, backup export, and seat billing preview.',
    path: '/enterprise',
    cta: 'View Enterprise'
  },
  {
    title: 'Enterprise Team Setup',
    priceKey: 'teamSetup',
    detail: 'Hands-on setup for a team: organization workspace, member roles, security settings, SSO domain planning, audit exports, backup policy, and first company workrooms.',
    path: '/payments/enterprise',
    cta: 'Pay Enterprise Team Setup',
    featured: true,
    badge: 'Team setup service',
    highlight: 'enterprise'
  }
];

const whyPay = [
  ['Recover delayed money', 'If one pending invoice gets collected faster, Pro can be worth more than the monthly price.'],
  ['Close faster', 'Cleaner proposals, deal rooms, and follow-ups reduce confusion before the client pays.'],
  ['Save business time', 'One workspace reduces switching between notes, chat, invoices, files, and reminders.'],
  ['Look serious', 'A clear workroom, invoice, proof, and payment follow-up makes freelancers look more professional.']
];

const checkoutSteps = [
  ['Choose payment type', 'Free, Pro, Founder access, Agency Setup, Enterprise Seats, or Enterprise Team Setup.'],
  ['Login or signup', 'A workspace account is required so access can be attached to the correct user.'],
  ['Pay securely', 'Checkout runs through configured payment providers such as Razorpay.'],
  ['Use the workflow', 'After payment, Pro tools open inside your ClientFlow AI workspace.']
];

const toneClass = {
  sky: 'border-sky-300/25 bg-sky-300/[0.06]',
  yellow: 'border-yellow-300/35 bg-yellow-300/[0.08]',
  emerald: 'border-emerald-300/30 bg-emerald-300/[0.07]',
  purple: 'border-purple-300/25 bg-purple-300/[0.06]'
};

const paymentPages = [
  {
    title: 'Freelance Workflow',
    label: 'Software subscription',
    detail: 'Use this page only for Free, Pro Monthly, Pro Annual, and Founder 90 Days access.',
    path: '/payments/freelance-workflow',
    cta: 'Open Workflow Payment',
    tone: 'yellow'
  },
  {
    title: 'Agency Setup',
    label: 'Done-for-you freelancer setup',
    detail: 'Use this page only for setup packages: Starter Setup, Growth Setup, and Managed Growth.',
    path: '/payments/agency-setup',
    cta: 'Open Agency Payment',
    tone: 'sky'
  },
  {
    title: 'Enterprise Team Setup',
    label: 'Guided team setup',
    detail: 'Use this page only for team setup: roles, security, audit/export habits, and first workrooms.',
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
  const [market, setMarket] = useState(() => {
    const queryMarket = new URLSearchParams(location.search).get('market');
    return getSafeMarket(queryMarket || localStorage.getItem('billingMarket'));
  });
  const currentMarket = markets[market];

  useDocumentMeta({
    title: `${COMPANY_NAME} Payments - Free, Pro, Agency Setup, and Enterprise`,
    description: 'See ClientFlow AI payment options for free access, Pro workflow, agency setup, and enterprise seat billing.',
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
    if (planId === 'free') {
      startFree();
      return;
    }

    localStorage.setItem('plan', planId);
    localStorage.setItem('billingMarket', market);
    const checkoutPath = `/payments/freelance-workflow?market=${market}`;

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
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Payments and plans</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Choose how you want to use ClientFlow AI.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-zinc-400">
                Choose one clear payment page. Freelance workflow, Agency Setup, and Enterprise Team Setup now have separate checkout paths.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={startFree} className="btn btn-primary px-7 py-4 text-sm">
                  {loggedIn ? 'Open Workspace' : 'Start Free'}
                </button>
                <Link to="/payments/agency-setup" className="rounded-2xl bg-yellow-400 px-7 py-4 text-center text-sm font-black uppercase tracking-widest text-black transition hover:bg-yellow-300">
                  Agency Setup
                </Link>
                <Link to="/payments/enterprise" className="rounded-2xl bg-emerald-300 px-7 py-4 text-center text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-200">
                  Enterprise Setup
                </Link>
                <Link to="/contact" className="btn btn-secondary px-7 py-4 text-sm">
                  Ask Before Paying
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Billing region</p>
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
              <p className="mt-4 text-xs font-semibold leading-6 text-zinc-600">
                Checkout verifies live backend pricing before payment. International payments also need international payments enabled in the payment provider account.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Separate payment pages</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Pick the correct payment page first.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                This avoids mixing subscription software, freelancer setup, and company setup in one checkout screen.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {paymentPages.map((item) => {
                const className = item.tone === 'emerald'
                  ? 'border-emerald-300/30 bg-emerald-300/[0.08] hover:border-emerald-300/45'
                  : item.tone === 'sky'
                    ? 'border-sky-300/30 bg-sky-300/[0.08] hover:border-sky-300/45'
                    : 'border-yellow-300/35 bg-yellow-300/[0.08] hover:border-yellow-300/50';

                return (
                  <Link key={item.title} to={item.path} className={`rounded-[1.75rem] border p-6 transition-all hover:-translate-y-1 ${className}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{item.label}</p>
                    <h3 className="mt-3 text-2xl font-black text-white">{item.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{item.detail}</p>
                    <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-white">{item.cta}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Software access</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Pay only when the full workflow helps your business.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {paymentOptions.map((option) => (
                <div key={option.id} className={`rounded-[1.75rem] border p-6 transition-all hover:-translate-y-1 ${toneClass[option.tone] || toneClass.sky}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{option.label}</p>
                  <h3 className="mt-3 text-xl font-black leading-tight text-white">{option.title}</h3>
                  <p className="mt-4 text-3xl font-black text-white">{priceFor(option)}</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{option.detail}</p>
                  <p className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3 text-xs font-bold leading-relaxed text-zinc-300">
                    {option.bestFor}
                  </p>
                  <div className="mt-5 grid gap-2">
                    {option.points.map((point) => (
                      <p key={point} className="text-xs font-semibold leading-relaxed text-zinc-500">{point}</p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => startCheckout(option.id)}
                    className={`mt-6 w-full rounded-2xl px-5 py-4 text-sm font-black transition-all active:scale-95 ${
                      option.id === 'monthly'
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                        : 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/10'
                    }`}
                  >
                    {option.id === 'monthly' && isPro ? 'Manage Pro' : option.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="setup-service-payments" className="border-b border-white/5 bg-yellow-400/[0.04] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Setup services</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Setup help is available for solo freelancers and company teams.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Use Agency Setup when one freelancer needs help starting. Use Enterprise Team Setup when a team needs roles, permissions, security settings, audit/export habits, and first company workrooms configured.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/payments/agency-setup" className="inline-flex btn btn-primary px-6 py-3 text-sm">
                  Pay Agency Setup
                </Link>
                <Link to="/payments/enterprise" className="inline-flex rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-200">
                  Pay Enterprise Team Setup
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {servicePayments.map((item) => {
                const isAgencySetup = item.highlight === 'agency';
                const isEnterpriseSetup = item.highlight === 'enterprise';

                return (
                  <Link
                    key={item.title}
                    to={item.path}
                    className={`rounded-[1.5rem] border p-5 transition-all hover:-translate-y-1 ${
                      isAgencySetup
                        ? 'border-yellow-300/35 bg-yellow-300/[0.1] shadow-2xl shadow-yellow-950/20 hover:border-yellow-300/50'
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
                      isAgencySetup ? 'text-yellow-200' : isEnterpriseSetup ? 'text-emerald-200' : 'text-sky-300'
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
