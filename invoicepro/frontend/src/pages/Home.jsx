import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import { formatDate, getPlanLabel, getUser, hasProAccess, isLoggedIn, setPostLoginRedirect } from '../utils/auth';
import { trackCtaClick } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';
import { featurePageCards } from '../utils/featurePages';
import {
  COMPANY_NAME,
  COMPANY_TAGLINE,
  SITE_URL,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const problemCards = [
  ['Finding clients feels random', 'Freelancers often know their skill, but do not know who to message or what to say.'],
  ['Projects become messy', 'Client requests, tasks, collaborators, approvals, and files get scattered across chat.'],
  ['Payments get delayed', 'Invoices, follow-ups, payment links, and pending money are hard to track manually.']
];

const simpleFlow = [
  ['01', 'Find a client', 'Choose a target client and prepare the first message.'],
  ['02', 'Send a proposal', 'Turn interest into clear scope, price, timeline, and next step.'],
  ['03', 'Manage the work', 'Track tasks, client requests, teammates, notes, and delivery.'],
  ['04', 'Create invoice', 'Send a professional invoice with PDF, public link, and currency support.'],
  ['05', 'Collect payment', 'See pending money and send the right follow-up before it goes cold.']
];

const serviceOffers = [
  {
    title: 'ClientFlow AI Software',
    label: 'Self-serve product',
    text: 'Freelancers use the web app to find clients, send proposals, manage projects, create invoices, and collect payments.',
    cta: 'Start free',
    path: '/signup'
  },
  {
    title: 'Agency Setup',
    label: 'Done-for-you setup',
    text: 'We help freelancers set up their offer, lead plan, proposal flow, project workspace, invoice, and 7-day action plan.',
    cta: 'See agency setup',
    path: '/agency'
  }
];

const whoFor = [
  ['Freelancers', 'Build stable client flow, proposals, invoices, and payments.'],
  ['Developers', 'Manage client requirements, GitHub delivery, Linux/VPS launch, handover, maintenance, and payment.'],
  ['Designers', 'Handle briefs, revisions, approvals, proposals, and final invoice.'],
  ['Consultants', 'Turn conversations into proposals, retainers, and paid milestones.'],
  ['Small agencies', 'Bring other freelancers into bigger projects and manage delivery together.']
];

const devOpsHighlights = [
  ['GitHub and delivery notes', 'Keep repo, release, issue, proof, and handover information connected to the client project.'],
  ['Linux/VPS checklist', 'Plan Ubuntu, SSH, firewall, Nginx, SSL, environment variables, logs, backups, and uptime checks.'],
  ['Maintenance upsell', 'Turn finished website/app delivery into monthly support, monitoring, backups, and small fixes.']
];

const previewActions = [
  ['Today', 'Message 3 warm leads'],
  ['Proposal', 'Follow up website package'],
  ['Project', 'Finish client delivery task'],
  ['Payment', 'Collect pending invoice']
];

const PLAN_EXPIRY_REMINDER_DAYS = 2;

const plans = [
  {
    id: 'early_access',
    name: 'Early Access',
    price: 'Rs 0',
    note: '30 days Pro free for first 50 freelancers',
    features: ['Full Pro workflow for 30 days', 'No card required', 'Give feedback and help shape the product'],
    cta: 'Get Early Access'
  },
  {
    id: 'free',
    name: 'Free',
    price: 'Rs 0',
    note: 'Try the basic workflow',
    features: ['Create limited invoices', 'See the product flow', 'Start your client workroom'],
    cta: 'Create Free Account'
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: 'Rs 499',
    note: 'For active freelancers',
    features: ['Money GPS and AI tools', 'Unlimited invoices', 'Client finder, proposals, profit tracker'],
    cta: 'Start Pro'
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 'Rs 4999',
    note: 'For serious freelance growth',
    features: ['Everything in Pro Monthly', 'Best yearly value', 'Growth planning and payment collection'],
    cta: 'Choose Yearly'
  }
];

const trustBadges = [
  ['Udyam registered', UDYAM_REGISTRATION_NUMBER],
  ['Payments', 'Razorpay, UPI, and international payment support'],
  ['India-first', 'Built for Indian freelancers, usable with global clients'],
  ['Support', SUPPORT_EMAIL]
];

const feedback = [
  {
    quote: 'This looks like a really interesting idea. It definitely addresses a common challenge freelancers face.',
    author: 'LinkedIn feedback'
  },
  {
    quote: 'The interface feels clean, lightweight, and simple for an invoicing and freelancer workflow.',
    author: 'Early product feedback'
  }
];

const faqs = [
  ['Is ClientFlow AI only for invoices?', 'No. Invoices are one part. The product helps freelancers find clients, send proposals, manage work, create invoices, and collect payments.'],
  ['Why should freelancers use it?', 'Because freelancers lose time and money when leads, proposals, projects, and payment follow-ups are scattered. ClientFlow AI puts the process in one place.'],
  ['Is the Linux/DevOps feature for everyone?', 'No. DevOps Delivery Kit is optional and mainly useful for developers, technical freelancers, and small agencies who deliver websites, apps, VPS, GitHub, or maintenance work.'],
  ['Can beginners use it?', 'Yes. Beginners can use the free software or choose Agency Setup if they want help setting up their offer and client workflow.'],
  ['Can foreign clients pay?', 'Yes, if the seller has international payments enabled in Razorpay. Invoices can support INR, USD, EUR, GBP, AED, SGD, AUD, and CAD.'],
  ['Do you guarantee income?', 'No. ClientFlow AI does not guarantee income. It gives freelancers a clearer system, daily actions, and payment workflow so they can execute better.']
];

const homeStructuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-1200.png`,
    email: SUPPORT_EMAIL,
    identifier: UDYAM_REGISTRATION_NUMBER,
    description: COMPANY_TAGLINE
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: COMPANY_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    image: `${SITE_URL}/logo-1200.png`,
    description: 'ClientFlow AI helps freelancers find clients, send proposals, manage projects, create invoices, and collect payments in one workspace.',
    audience: {
      '@type': 'Audience',
      audienceType: 'Freelancers, consultants, developers, designers, and small agencies'
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'INR'
      },
      {
        '@type': 'Offer',
        name: 'Pro Monthly',
        price: '499',
        priceCurrency: 'INR'
      },
      {
        '@type': 'Offer',
        name: 'Pro Yearly',
        price: '4999',
        priceCurrency: 'INR'
      }
    ]
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer
      }
    }))
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
    expiringSoon: daysLeft > 0 && daysLeft <= PLAN_EXPIRY_REMINDER_DAYS
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
        ? 'Your Pro access has expired. Renew to keep AI tools, unlimited invoices, and team workspace active.'
        : `Your ${planLabel} expires in ${expiryState.daysLeft} day${expiryState.daysLeft === 1 ? '' : 's'}. Renew early so your workflow does not stop.`
      : hasActivePro
        ? expiryState.expiresAt
          ? `Your ${planLabel} is active until ${formatDate(expiryState.expiresAt)}.`
          : `Your ${planLabel} is active.`
        : 'You are using the Free version. Start the trial when you want Pro tools.';

  useDocumentMeta({
    title: `${COMPANY_NAME} - Get clients, manage work, and get paid`,
    description: 'ClientFlow AI helps freelancers find clients, send proposals, manage projects, create invoices, and collect payments in one workspace.',
    path: '/',
    jsonLd: homeStructuredData
  });

  const goToApp = (target, label) => {
    const nextPath = loggedIn ? target : '/signup';
    trackCtaClick(label, 'home', nextPath);
    navigate(nextPath);
  };

  const openFeature = (path, title) => {
    if (path.startsWith('/features/')) {
      trackCtaClick(`feature_${title}`, 'home_features', path);
      navigate(path);
      return;
    }

    if (path === '/agency' || path === '/devops-delivery') {
      trackCtaClick(`feature_${title}`, 'home_features', path);
      navigate(path);
      return;
    }

    if (path.startsWith('/dashboard#')) {
      trackCtaClick(`feature_${title}`, 'home_features', loggedIn ? path : '/signup');
      navigate(loggedIn ? path : '/signup');
      return;
    }

    goToApp(path, `feature_${title}`);
  };

  const selectPlan = (planId) => {
    if (planId === 'early_access') {
      const earlyAccessPath = '/payment?early=1';
      if (!loggedIn) {
        setPostLoginRedirect(earlyAccessPath);
      }

      trackCtaClick('select_early_access', 'home_pricing', loggedIn ? earlyAccessPath : '/signup');
      navigate(loggedIn ? earlyAccessPath : '/signup');
      return;
    }

    if (planId !== 'free') {
      localStorage.setItem('plan', planId);
    }

    const nextPath = planId === 'free'
      ? (loggedIn ? '/client-flow' : '/signup')
      : (loggedIn ? '/payment' : '/signup');

    if (!loggedIn && planId !== 'free') {
      setPostLoginRedirect('/payment');
    }

    trackCtaClick(`select_${planId}`, 'home_pricing', nextPath);
    navigate(nextPath);
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-yellow-400/10 via-emerald-400/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                  Freelancer business system
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Get clients, manage work, and get paid faster.
              </h1>

              <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                ClientFlow AI helps freelancers run the full client process in one place: find leads, send proposals, manage client workrooms, create invoices, and collect payments.
              </p>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                Simple promise: open the app and know the next business action.
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
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                        Your account
                      </p>
                      <p className="mt-1 text-base font-black text-white">{accountStatus}</p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-300">{accountDetail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => goToApp(hasActivePro && !showExpiryAlert ? '/client-flow' : '/payment', 'home_plan_status')}
                      className="shrink-0 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-zinc-200 active:scale-95"
                    >
                      {showExpiryAlert ? 'Renew Pro' : hasActivePro ? 'Open Flow' : 'Start Trial'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => selectPlan('early_access')}
                  className="rounded-2xl bg-emerald-300 px-7 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-emerald-200 active:scale-95"
                >
                  Get 30 Days Free
                </button>
                <button
                  type="button"
                  onClick={() => goToApp('/client-flow', loggedIn ? 'hero_open_client_flow' : 'hero_start_free')}
                  className="btn btn-primary px-7 py-4 text-sm"
                >
                  {loggedIn ? 'Open Client Flow' : 'Start Free'}
                </button>
                <a href="#features" className="btn btn-secondary px-7 py-4 text-center text-sm">
                  See Features
                </a>
                <Link to="/agency" className="btn btn-dark px-7 py-4 text-center text-sm">
                  Agency Setup
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/30">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/30 p-5">
                <div className="flex items-center justify-between gap-4">
                  <BrandLogo showText={false} markClassName="h-12 w-12" />
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    Today
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Next business action</p>
                  <p className="mt-2 text-xl font-black leading-tight text-white">
                    Follow up the pending proposal before creating new work.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {previewActions.map(([label, title]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                      <p className="mt-1 text-sm font-black text-white">{title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/45 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">What the product does</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                It connects client finding, project work, and payment collection.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Most freelancers use separate notes, chats, invoices, and payment links. ClientFlow AI brings the workflow together so money actions do not get missed.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {problemCards.map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                  <h3 className="text-xl font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-yellow-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">What we provide</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                One product, plus setup help when freelancers need guidance.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                ClientFlow AI is the software. Agency Setup is the support service for freelancers who want help setting up their workflow.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2">
              {serviceOffers.map((offer) => {
                const offerPath = offer.path === '/signup' && loggedIn ? '/client-flow' : offer.path;
                const offerCta = offer.path === '/signup' && loggedIn ? 'Open client flow' : offer.cta;

                return (
                  <Link
                    key={offer.title}
                    to={offerPath}
                    className="rounded-[1.75rem] border border-white/8 bg-black/25 p-6 transition-all hover:-translate-y-1 hover:border-yellow-300/30 hover:bg-yellow-300/[0.06]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{offer.label}</p>
                    <h3 className="mt-4 text-2xl font-black text-white">{offer.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{offer.text}</p>
                    <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-white">{offerCta}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">How it works</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                One simple path from lead to payment.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              {simpleFlow.map(([step, title, text]) => (
                <div key={step} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-slate-950">
                    {step}
                  </span>
                  <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Optional for developers</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Linux-powered delivery when the project needs real deployment.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                This is not the main product for every freelancer. It is an extra workflow for developers and agencies who deliver websites/apps and need GitHub, Linux/VPS, SSL, backups, handover, and maintenance.
              </p>
              <Link to="/devops-delivery" className="mt-6 inline-flex btn btn-secondary px-6 py-3 text-sm">
                See DevOps Delivery Kit
              </Link>
            </div>

            <div className="grid gap-4">
              {devOpsHighlights.map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                  <h3 className="text-base font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Features</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                What each feature does for freelancers.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                The features are not separate random tools. They support one goal: help freelancers win work, deliver it, and collect payment.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => (
                <button
                  key={feature.title}
                  type="button"
                  onClick={() => openFeature(feature.path, feature.title)}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6 text-left transition-all hover:-translate-y-1 hover:border-yellow-300/25 hover:bg-yellow-300/[0.05]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{feature.title}</p>
                  <h3 className="mt-3 text-xl font-black text-white">{feature.benefit}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{feature.detail}</p>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Open feature</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Who should use it</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Built for service businesses, not only invoice creation.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                ClientFlow AI is useful when a freelancer needs a repeatable system for getting clients, managing delivery, and getting paid.
              </p>
            </div>

            <div className="grid gap-3">
              {whoFor.map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                  <p className="text-base font-black text-white">{title}</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-yellow-400/[0.04] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Need help setting it up?</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                ClientFlow AI Agency sets up the system for beginners.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                If a freelancer is confused, we help set up their offer, lead plan, proposal template, project workspace, invoice, payment follow-up, and 7-day action plan.
              </p>
              <Link to="/agency" className="mt-6 inline-flex btn btn-primary px-6 py-3 text-sm">
                See Agency Setup
              </Link>
            </div>

            <div className="rounded-[1.5rem] border border-yellow-300/20 bg-black/25 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Agency setup result</p>
              <p className="mt-3 text-2xl font-black leading-tight text-white">
                The user knows who to message, what to offer, how to manage the project, and how to collect payment.
              </p>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">
                This is a setup and action plan service. It does not guarantee income, but it gives the freelancer a clearer system to execute.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-b border-white/5 bg-zinc-950/55 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Pricing</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Start free. Upgrade when the workflow helps.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-[1.75rem] border p-6 transition-all hover:-translate-y-1 ${
                    plan.id === 'early_access'
                      ? 'border-emerald-300/35 bg-emerald-300/[0.08] shadow-2xl shadow-emerald-950/20'
                      : plan.id === 'monthly'
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
                    onClick={() => selectPlan(plan.id)}
                    className={`mt-6 w-full rounded-2xl px-5 py-4 text-sm font-black transition-all active:scale-95 ${
                      plan.id === 'early_access'
                        ? 'bg-emerald-300 text-slate-950 hover:bg-emerald-200'
                        : plan.id === 'monthly'
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

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {trustBadges.map(([label, value]) => (
                <div key={label} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">{label}</p>
                  <p className="mt-2 text-sm font-black leading-relaxed text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Early feedback</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Freelancers understand the problem.
              </h2>
            </div>

            <div className="grid gap-4">
              {feedback.map((item) => (
                <div key={item.quote} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                  <p className="text-base font-semibold leading-relaxed text-zinc-200">"{item.quote}"</p>
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-500">{item.author}</p>
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
                Simple answers for new users.
              </h2>
            </div>
            <div className="grid gap-4">
              {faqs.map(([question, answer]) => (
                <div key={question} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <h3 className="text-base font-black text-white">{question}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-black/25 py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[0.06] p-6 text-center sm:p-10">
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Build a clearer freelance business.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              Start with one client action today. ClientFlow AI keeps the next step visible.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => goToApp('/client-flow', 'final_start')}
                className="btn btn-primary px-7 py-4 text-sm"
              >
                {loggedIn ? 'Open Client Flow' : 'Create Free Account'}
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
