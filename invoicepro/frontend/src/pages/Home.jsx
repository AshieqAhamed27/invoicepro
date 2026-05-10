import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import { formatDate, getPlanLabel, getUser, hasProAccess, isLoggedIn } from '../utils/auth';
import { trackCtaClick } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';
import {
  COMPANY_NAME,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const coreValue = [
  {
    title: 'Daily Money Action',
    text: 'Every day, ClientFlow AI tells the freelancer the highest-value action: message a lead, send a proposal, move a project, or collect payment.'
  },
  {
    title: 'Income Stability Plan',
    text: 'Users set a monthly target and see how many leads, proposals, projects, retainers, and collections are needed to reach it.'
  },
  {
    title: 'Client Closing System',
    text: 'AI helps package the service, write outreach, handle objections, create proposals, and move serious leads toward payment.'
  },
  {
    title: 'Delivery Control Room',
    text: 'Manage tasks, client requests, GitHub sync, releases, docs, team updates, and handover notes in one project workspace.'
  },
  {
    title: 'Cashflow Protection',
    text: 'Track INR or foreign-currency invoices, payment links, overdue money, accepted proposals, and pending follow-ups before cash gets missed.'
  }
];

const productFlow = [
  ['01', 'Money GPS', 'Open one screen and see the best action to move revenue today.'],
  ['02', 'Growth Plan', 'Know how many leads, proposals, and clients are needed to hit the monthly income target.'],
  ['03', 'Client', 'Find the right type of client and prepare the first message.'],
  ['04', 'Work Ledger', 'Track client requests, project issues, releases, docs, approvals, and handover history.'],
  ['05', 'Payment', 'Send INR or international invoices, share payment link, and follow pending revenue.']
];

const whyPay = [
  'Users are not paying only for invoices. They are paying for a system that keeps client acquisition, delivery, and payment collection moving.',
  'It reduces missed opportunities by showing who to message, what proposal to send, and which payment to collect today.',
  'It helps freelancers build stable monthly income with lead targets, proposal targets, pricing guidance, and retainer ideas.',
  'It gives freelancers confidence to take bigger projects by adding teammates, GitHub sync, shared docs, issues, and release tracking.',
  'It protects cashflow by connecting accepted proposals, active projects, pending invoices, and follow-up actions in one place.'
];

const valueStack = [
  ['Find', 'AI helps identify client types, lead sources, outreach angles, and first messages.'],
  ['Close', 'Proposal, pricing, objection handling, and deal-room workflows help move conversations to paid work.'],
  ['Deliver', 'Team Work, GitHub sync, issues, releases, docs, and project updates keep client delivery organized.'],
  ['Collect', 'Invoices, payment links, WhatsApp sharing, international currencies, and payment status protect cashflow.'],
  ['Grow', 'Money GPS and Growth Plan turn monthly income goals into daily business actions.']
];

const agencyHighlights = [
  ['Offer setup', 'Shape one clear freelance service, target client, price angle, and first message.'],
  ['Lead workflow', 'Set up lead sources, follow-up timing, proposal flow, and daily Money GPS actions.'],
  ['Delivery setup', 'Organize team workspace, tasks, client requests, docs, GitHub/project notes, and handover.'],
  ['Payment setup', 'Prepare invoice, payment link, currency, and collection workflow for local or global clients.']
];

const positioningOffers = [
  {
    title: 'Use the software',
    label: 'Self-serve SaaS',
    text: 'Freelancers use ClientFlow AI to plan daily money actions, find leads, write proposals, manage projects, create invoices, and track payments.',
    cta: 'Start free',
    path: '/signup'
  },
  {
    title: 'Get the setup done for you',
    label: 'Agency setup',
    text: 'ClientFlow AI Agency helps beginners set up their offer, client plan, proposal workflow, project workspace, and payment collection system.',
    cta: 'View agency setup',
    path: '/agency'
  }
];

const verticalUseCases = [
  ['Freelancers', '/freelancers', 'Build stable income, find clients, close work, and get paid.'],
  ['Developers', '/developers', 'Track client requests, issues, releases, handover, invoices, and payments.'],
  ['Designers', '/designers', 'Manage proposals, revisions, approvals, delivery notes, and final payment.'],
  ['Agencies', '/agencies', 'Invite collaborators, split delivery, maintain project history, and collect retainers.'],
  ['Consultants', '/consultants', 'Turn conversations into proposals, retainers, invoices, and repeat clients.']
];

const previewRows = [
  ['Today', 'Message 3 warm leads', 'Sales action'],
  ['Project', 'Fix mobile navbar issue', 'High priority'],
  ['Release', 'Ship v1.2 client changes', 'Planned'],
  ['Payment', 'Follow up Rs 14,999 invoice', 'Pending']
];

const trustBadges = [
  ['Registered', UDYAM_REGISTRATION_NUMBER],
  ['Payments', 'Razorpay international + UPI'],
  ['India-first', 'Alternative to U.S. or Canada-only client-flow tools'],
  ['Support', SUPPORT_EMAIL],
  ['Built for', 'Freelancers and small teams']
];

const earlyFeedback = [
  {
    source: 'LinkedIn feedback',
    quote: 'This looks like a really interesting idea. It definitely addresses a common challenge freelancers face. I appreciate you sharing it with me.',
    author: 'Freelancer network connection'
  },
  {
    source: 'Early product feedback',
    quote: 'The interface feels clean, lightweight, and simple for an invoicing and freelancer workflow.',
    author: 'Early reviewer'
  }
];

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 'Rs 0',
    note: 'Start and test the workflow',
    features: ['Test the business workspace', 'Create limited invoices', 'See the client-to-payment workflow'],
    cta: 'Create Free Account'
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: 'Rs 499',
    note: 'For active freelancers who want steady work',
    features: ['Money GPS daily action', 'AI client coach and proposal writer', 'Team Work with GitHub sync'],
    cta: 'Start Pro'
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 'Rs 4999',
    note: 'Best for serious freelance business building',
    features: ['Everything in monthly Pro', 'Income stability and recurring client planning', 'Long-term project ledger and cashflow control'],
    cta: 'Choose Yearly'
  }
];

const faqs = [
  {
    question: 'Is this only for invoice creation?',
    answer: 'No. Invoices are only one part. The main feature is Money GPS: one screen that tells freelancers which client, project, proposal, or payment needs action today.'
  },
  {
    question: 'Why would freelancers pay for it?',
    answer: 'Because the product helps them avoid missed money actions: warm leads, accepted proposals, blocked projects, pending invoices, retainer chances, and follow-ups that can turn into revenue.'
  },
  {
    question: 'How does it help me avoid going back to a job?',
    answer: 'The Growth Plan turns your monthly income target into daily leads, proposals, prices, collection tasks, recurring client ideas, and retention messages. It does not guarantee income, but it keeps the right actions visible.'
  },
  {
    question: 'Can I use it without a domain?',
    answer: 'Yes. You can use the core app, invoices, Razorpay or UPI links, and WhatsApp sharing without buying a domain.'
  },
  {
    question: 'Can foreign clients pay?',
    answer: 'Yes, when Razorpay international payments are enabled on the seller account. Users can create invoices in USD, EUR, GBP, AED, SGD, AUD, or CAD and collect through Razorpay payment links.'
  },
  {
    question: 'Who is this best for?',
    answer: 'Freelancers, small agencies, developers, designers, marketers, consultants, and service businesses that need one place to manage client work and payments.'
  },
  {
    question: 'Is this like GitHub or GitLab?',
    answer: 'Not exactly. GitHub and GitLab are mainly for code. ClientFlow AI has a Client Work Ledger for freelancers to track client requests, issues, releases, approvals, docs, handover notes, invoices, and payments in one business workflow.'
  }
];

const getExpiryState = (user) => {
  if (!user?.planExpiresAt) {
    return {
      expiresAt: '',
      daysLeft: null,
      expired: false,
      expiringSoon: false
    };
  }

  const expiresAt = new Date(user.planExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return {
      expiresAt: '',
      daysLeft: null,
      expired: false,
      expiringSoon: false
    };
  }

  const diffMs = expiresAt.getTime() - Date.now();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    expiresAt,
    daysLeft,
    expired: daysLeft <= 0,
    expiringSoon: daysLeft > 0 && daysLeft <= 7
  };
};

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const currentUser = loggedIn ? getUser() : null;
  const planLabel = getPlanLabel(currentUser);
  const hasActivePro = hasProAccess(currentUser);
  const expiryState = getExpiryState(currentUser);
  const hasPlanWithExpiry = Boolean(currentUser?.plan && currentUser.plan !== 'free' && expiryState.expiresAt);
  const showExpiryAlert = loggedIn && hasPlanWithExpiry && (expiryState.expiringSoon || expiryState.expired);
  const accountStatus = !loggedIn
    ? null
    : showExpiryAlert && expiryState.expired
      ? `${planLabel} expired`
    : hasActivePro
      ? `${planLabel} active`
      : 'Free version active';
  const accountDetail = !loggedIn
    ? ''
    : showExpiryAlert
      ? expiryState.expired
        ? 'Your Pro access has expired. Renew now to keep AI tools, unlimited invoices, and team workspace active.'
        : `Your ${planLabel} expires in ${expiryState.daysLeft} day${expiryState.daysLeft === 1 ? '' : 's'}. Renew early so your workflow does not stop.`
      : hasActivePro
        ? expiryState.expiresAt
          ? `Your ${planLabel} is active until ${formatDate(expiryState.expiresAt)}.`
          : `Your ${planLabel} is active.`
        : 'You are currently using the Free version. Start the 7-day trial to unlock Pro tools.';

  useDocumentMeta({
    title: `${COMPANY_NAME} - Freelancer business system`,
    description: 'ClientFlow AI helps freelancers get clients, manage projects, send proposals, create invoices, and collect payments.'
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
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                  Freelancer business system
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Get clients, run projects, and collect payment.{' '}
                <span className="bg-gradient-to-r from-yellow-200 via-emerald-200 to-sky-200 bg-clip-text text-transparent">
                  Without losing control.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-zinc-400 sm:text-lg">
                ClientFlow AI is a freelancer business system. It helps freelancers choose what to sell, find leads, write proposals, manage delivery, team up on bigger projects, and collect local or international payments.
              </p>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                Use the software yourself, or use ClientFlow AI Agency when you want the setup done with you.
              </p>

              {loggedIn && (
                <div className={`mt-6 rounded-[1.5rem] border p-4 sm:max-w-2xl sm:p-5 ${
                  showExpiryAlert
                    ? 'border-yellow-300/25 bg-yellow-300/[0.08]'
                    : hasActivePro
                      ? 'border-emerald-300/20 bg-emerald-300/[0.08]'
                      : 'border-sky-300/20 bg-sky-300/[0.08]'
                }`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${
                        showExpiryAlert ? 'text-yellow-200' : hasActivePro ? 'text-emerald-200' : 'text-sky-200'
                      }`}>
                        {showExpiryAlert ? 'Plan expiry alert' : 'Your plan status'}
                      </p>
                      <p className="mt-1 text-base font-black text-white">{accountStatus}</p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-300">
                        {accountDetail}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => goToApp(hasActivePro && !showExpiryAlert ? '/dashboard' : '/payment', showExpiryAlert ? 'hero_renew_pro' : hasActivePro ? 'hero_open_dashboard_plan_status' : 'hero_start_trial_from_free_status')}
                      className={`shrink-0 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest transition-all hover:-translate-y-0.5 active:scale-95 ${
                        showExpiryAlert
                          ? 'bg-yellow-300 text-slate-950 hover:bg-yellow-200'
                          : hasActivePro
                            ? 'bg-emerald-300 text-slate-950 hover:bg-emerald-200'
                            : 'bg-sky-300 text-slate-950 hover:bg-sky-200'
                      }`}
                    >
                      {showExpiryAlert ? 'Renew Pro' : hasActivePro ? 'Open App' : 'Start Trial'}
                    </button>
                  </div>
                </div>
              )}

              {!loggedIn && (
              <div className="mt-6 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-300/[0.08] p-4 sm:max-w-2xl sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                      Try Pro free
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-300">
                      Start the 7-day free trial and test Money GPS, AI client coach, proposals, team workspace, and unlimited invoices.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToApp('/payment', 'hero_start_free_trial')}
                    className="shrink-0 rounded-2xl bg-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-emerald-200 active:scale-95"
                  >
                    Start Free Trial
                  </button>
                </div>
              </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => goToApp('/money-gps', loggedIn ? 'open_money_gps' : 'start_free')}
                  className="btn btn-primary px-7 py-4 text-sm"
                >
                  {loggedIn ? 'Open Money GPS' : 'Start Free'}
                </button>
                <Link to="/agency" className="btn btn-secondary px-7 py-4 text-center text-sm">
                  Agency Setup
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {['Find clients', 'Close proposals', 'Manage delivery', 'Collect payments'].map((item) => (
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Money GPS action</p>
                  <p className="mt-2 text-xl font-black leading-tight text-white">
                    Collect the pending invoice before starting new outreach.
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

        <section className="border-b border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Correct positioning</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                We sell the result: a clearer freelancer business.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                The app features support the outcome. The outcome is simple: know who to message, what to offer, how to deliver, and how to collect payment.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {positioningOffers.map((offer) => {
                const isSoftwareOffer = offer.path === '/signup';
                const offerPath = isSoftwareOffer && loggedIn ? '/money-gps' : offer.path;
                const offerCta = isSoftwareOffer && loggedIn ? 'Open software' : offer.cta;

                return (
                  <div key={offer.title} className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-6 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                    <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-sky-200">
                      {offer.label}
                    </span>
                    <h3 className="mt-5 text-2xl font-black text-white">{offer.title}</h3>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{offer.text}</p>
                    <Link to={offerPath} className="mt-6 inline-flex rounded-2xl border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-white/10">
                      {offerCta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/40 py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">What it does</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                One product, one clear promise: help freelancers win, deliver, and collect.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {coreValue.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
                  <h3 className="text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Why it is valuable</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Users pay for the business system, not just the invoice.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                Invoices are the final step. The real value is helping freelancers know what to do before the invoice: find the right client, close the work, manage delivery, and collect without losing control.
              </p>
              <button
                type="button"
                onClick={() => goToApp('/payment', 'value_stack_start_trial')}
                className="mt-6 btn btn-primary px-6 py-3 text-sm"
              >
                Start Free Trial
              </button>
            </div>

            <div className="grid gap-3">
              {valueStack.map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-black/25 p-4 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-black text-white">{title}</h3>
                    <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-200">
                      Business step
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-yellow-400/[0.04] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">New service offer</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                ClientFlow AI Agency sets up the system for freelancers.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                Some users do not want another empty tool. They want help choosing what service to sell, who to message, what proposal to send, how to deliver, and how to collect payment. The agency offer lets you sell setup help while the SaaS grows.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/agency" className="btn btn-primary px-6 py-3 text-center text-sm">
                  See Agency Setup
                </Link>
                <Link to="/contact" className="btn btn-secondary px-6 py-3 text-center text-sm">
                  Request Help
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              {agencyHighlights.map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-black/25 p-4 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-black text-white">{title}</h3>
                    <span className="rounded-full border border-yellow-300/15 bg-yellow-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-yellow-200">
                      Done for you
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Use cases</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Same product, specific workflow for different service businesses.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                Each page explains the exact problem ClientFlow AI solves for that type of user.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {verticalUseCases.map(([label, path, text]) => (
                <Link
                  key={path}
                  to={path}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/[0.06]"
                >
                  <p className="text-lg font-black text-white">For {label}</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{text}</p>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-sky-300">View page</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Simple workflow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                From confusion to one next action.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                Instead of showing many tools first, ClientFlow AI starts with the most useful question: what should you do now to earn, deliver, or collect?
              </p>
              <button
                type="button"
                onClick={() => goToApp('/money-gps', 'workflow_start')}
                className="mt-6 btn btn-primary px-6 py-3 text-sm"
              >
                Open Money GPS
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
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Why users pay</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Because it tells them what to do next.
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {trustBadges.map(([label, value]) => (
                <div key={label} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{label}</p>
                  <p className="mt-2 text-sm font-black leading-relaxed text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Early feedback</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Real people are already seeing the problem.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                ClientFlow AI is being shaped with freelancer feedback, so the product stays focused on practical client, project, and payment problems.
              </p>
            </div>

            <div className="grid gap-4">
              {earlyFeedback.map((item) => (
                <div key={item.quote} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">{item.source}</p>
                  <p className="mt-4 text-base font-semibold leading-relaxed text-zinc-200">
                    "{item.quote}"
                  </p>
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-500">{item.author}</p>
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
                Keep the free plan for testing. Use Pro when you want Money GPS, unlimited invoices, client finding, and project workspace.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
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
          <div className="container-custom responsive-heading-grid">
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
              Start with one lead, one project, or one invoice. ClientFlow AI keeps the next money action visible.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => goToApp('/money-gps', 'final_start')}
                className="btn btn-primary px-7 py-4 text-sm"
              >
                {loggedIn ? 'Open Money GPS' : 'Create Free Account'}
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
