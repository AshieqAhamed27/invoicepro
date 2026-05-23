import React, { useState } from 'react';
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

const realWorldOutcomes = [
  {
    title: 'Stop losing leads after the first message',
    problem: 'Many freelancers talk to interested people, then forget to follow up.',
    result: 'ClientFlow AI keeps the next action visible so the lead does not go cold.'
  },
  {
    title: 'Turn interest into a clear proposal',
    problem: 'Clients disappear when scope, price, timeline, and next step are unclear.',
    result: 'The proposal workflow helps the freelancer send a cleaner offer faster.'
  },
  {
    title: 'Finish work with proof and fewer disputes',
    problem: 'Delivery becomes confusing when tasks, notes, approvals, and files stay in chat.',
    result: 'The workroom keeps milestones, proof, collaborators, and invoice flow connected.'
  },
  {
    title: 'Collect pending money professionally',
    problem: 'Unpaid invoices are easy to ignore because follow-up feels awkward.',
    result: 'Payment Collection Agent shows which payment matters first and prepares the message.'
  }
];

const proWorthReasons = [
  ['If one proposal closes faster', 'A single won project can be worth far more than the monthly Pro price.'],
  ['If one pending invoice is collected sooner', 'The product pays for itself when it helps recover cash that was stuck.'],
  ['If the freelancer saves weekly admin time', 'Less time switching between notes, chats, invoices, and reminders means more time for paid work.'],
  ['If the freelancer wants stable monthly income', 'Growth Plan and Money GPS turn income goals into weekly actions instead of guesswork.']
];

const marketplaceDifference = [
  {
    label: 'Upwork/Fiverr model',
    title: 'Marketplace competition',
    text: 'Freelancers compete inside a platform for visibility, jobs, ratings, bids, and algorithm attention.'
  },
  {
    label: 'ClientFlow AI model',
    title: 'Direct-client business system',
    text: 'Freelancers use their own leads, brand, proposals, workroom, invoice links, and follow-up process.'
  },
  {
    label: 'Money angle',
    title: 'Subscription, not seller commission',
    text: 'ClientFlow AI can earn from Pro plans and setup services without taking a large cut from every client project.'
  }
];

const directClientAdvantages = [
  ['Own the client relationship', 'The freelancer keeps the lead, conversation, proposal, delivery proof, and invoice history in their workspace.'],
  ['Sell packaged services', 'Instead of waiting for job posts, freelancers can create offers, message target clients, and follow up.'],
  ['Look professional outside marketplaces', 'Proposals, workrooms, payment pages, delivery proof, and reminders make direct selling safer.'],
  ['Earn with subscriptions and setup help', 'The product makes money from Pro access and done-for-you setup instead of only marketplace commissions.']
];

const honestFit = [
  ['Use Free if', 'You only want to test the workflow or create a small number of invoices.'],
  ['Use Pro if', 'You actively manage leads, proposals, projects, invoices, payment follow-ups, and monthly income goals.'],
  ['Do not pay if', 'You only need one basic invoice once and do not want a freelancer business workflow.']
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
    text: 'Freelancers create a free account to find clients, send proposals, manage projects, create invoices, and collect payments.',
    cta: 'Create free account',
    path: '/signup'
  },
  {
    title: 'Business Autopilot',
    label: 'Easy mode',
    text: 'The app scans leads, proposals, invoices, and payment status, then shows the next best action so users do not feel lost.',
    cta: 'Open autopilot',
    path: '/business-autopilot'
  },
  {
    title: 'Agency Setup',
    label: 'Done-for-you setup',
    text: 'We help freelancers set up their offer, lead plan, proposal flow, project workspace, invoice, and 7-day action plan.',
    cta: 'See agency setup',
    path: '/agency'
  }
];

const earlyUserClarity = [
  {
    title: 'What we provide',
    text: 'A web app for client finding, lead follow-up, proposals, project delivery, invoices, payment links, and cashflow tracking.'
  },
  {
    title: 'What problem we solve',
    text: 'Freelancers lose money when client work is scattered across memory, WhatsApp, notes, spreadsheets, and separate invoice tools.'
  },
  {
    title: 'What example values mean',
    text: 'Some screens show sample names, amounts, and tasks only to help new users understand the workflow. Replace them with real client data when you start.'
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
    note: 'Login or signup required',
    features: ['Free account saves your workspace', 'Try the lead to payment flow', 'Create limited invoices', 'Understand if the product fits your work'],
    cta: 'Create Free Account'
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: 'Rs 499',
    note: 'For active freelancers',
    features: ['Daily money action', 'Client finder, proposals, workroom, and payment agent', 'Unlimited invoices and profit tracking'],
    cta: 'Buy Pro Monthly'
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: 'Rs 4999',
    note: 'For serious freelance growth',
    features: ['Everything in Pro Monthly', 'Best yearly value', 'For freelancers building stable monthly income'],
    cta: 'Buy Pro Yearly'
  }
];

const billingMarkets = {
  india: {
    label: 'Indian payment',
    shortLabel: 'India',
    detail: 'Pay in INR using Razorpay, cards, UPI, and supported India methods.'
  },
  global: {
    label: 'International payment',
    shortLabel: 'International',
    detail: 'Pay in USD using supported international cards through Razorpay.'
  }
};

const planPrices = {
  early_access: { india: 'Rs 0', global: '$0' },
  free: { india: 'Rs 0', global: '$0' },
  monthly: { india: 'Rs 499', global: '$9' },
  yearly: { india: 'Rs 4999', global: '$89' }
};

const getSafeBillingMarket = (value) => (
  String(value || '').toLowerCase() === 'global' ? 'global' : 'india'
);

const getInitialBillingMarket = () => {
  if (typeof window === 'undefined') return 'india';
  return getSafeBillingMarket(window.localStorage?.getItem('billingMarket'));
};

const getPlanPrice = (planId, market) => (
  planPrices[planId]?.[getSafeBillingMarket(market)] || planPrices[planId]?.india || ''
);

const buyerPathCards = [
  {
    title: 'Try it first',
    price: 'Rs 0',
    text: 'Create a free account, use the workflow, create invoices, and understand if ClientFlow AI fits your freelance work.',
    action: 'Create Free Account',
    planId: 'free'
  },
  {
    title: 'Buy Pro',
    price: 'Rs 499/month',
    text: 'Unlock the full client finder, proposal, workroom, payment follow-up, profit, and growth workflow.',
    action: 'Buy Pro Monthly',
    planId: 'monthly',
    recommended: true
  },
  {
    title: 'Get setup help',
    price: 'Done-for-you',
    text: 'Use this if you are confused and want help setting your offer, lead plan, invoice, and 7-day action plan.',
    action: 'Book Agency Setup',
    path: '/agency'
  }
];

const fitAdvisorProblems = [
  {
    id: 'clients',
    label: 'Finding clients',
    title: 'Start with client flow and outreach.',
    text: 'Build a list of target clients, prepare the first message, and keep follow-ups visible before leads go cold.',
    tools: ['Client Flow', 'Client Finder', 'Lead Pipeline']
  },
  {
    id: 'proposal',
    label: 'Sending proposals',
    title: 'Turn interest into a clear offer.',
    text: 'Use proposal, deal room, and scope notes so the client sees price, timeline, deliverables, and next step clearly.',
    tools: ['Proposal Writer', 'Deal Room', 'Client Workroom']
  },
  {
    id: 'delivery',
    label: 'Managing work',
    title: 'Keep delivery proof in one place.',
    text: 'Track tasks, client requests, files, approvals, teammates, and handover so work does not stay scattered in chat.',
    tools: ['Client Workroom', 'Cloud Documents', 'DevOps Kit']
  },
  {
    id: 'payment',
    label: 'Getting paid',
    title: 'Make pending money visible.',
    text: 'Create invoices, track unpaid amounts, and prepare follow-up messages before delayed payments become normal.',
    tools: ['Invoices', 'Payment Agent', 'Money GPS']
  }
];

const fitAdvisorStages = [
  {
    id: 'new',
    label: 'I am testing',
    result: 'Start free first',
    action: 'Start Free',
    planId: 'free'
  },
  {
    id: 'active',
    label: 'I have real client work',
    result: 'Pro is the better fit',
    action: 'Buy Pro Monthly',
    planId: 'monthly'
  },
  {
    id: 'confused',
    label: 'I need setup help',
    result: 'Setup help is the fastest path',
    action: 'Book Setup Help',
    path: '/agency'
  }
];

const trustBadges = [
  ['Udyam registered', UDYAM_REGISTRATION_NUMBER],
  ['Payments', 'Razorpay, UPI, and international payment support'],
  ['India-first', 'Built for Indian freelancers, usable with global clients'],
  ['Support', SUPPORT_EMAIL]
];

const operatingStandards = [
  {
    title: 'Real business identity',
    text: 'Shows legal registration, support contact, terms, privacy, refund policy, and honest limits instead of pretending to be a large corporation.'
  },
  {
    title: 'One workflow discipline',
    text: 'Every major tool supports the same flow: lead, proposal, workroom, proof, invoice, and payment collection.'
  },
  {
    title: 'Client-ready documentation',
    text: 'Workrooms, proposal details, invoice links, proof notes, and DevOps handover items make the freelancer look more organized to clients.'
  },
  {
    title: 'Technical delivery option',
    text: 'Developers can add GitHub, Linux/VPS, SSL, backup, release evidence, and maintenance notes when the project needs real deployment.'
  }
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
  ['When is Pro worth paying for?', 'Pro makes sense when the freelancer is actively trying to win clients, send proposals, manage projects, collect payments, and grow monthly income. If it helps close one client or collect one delayed payment, it can be worth more than the subscription.'],
  ['When should someone stay on Free?', 'Stay on Free if you only want to test the product, create a few invoices, or you are not yet managing real leads and client work.'],
  ['Is the Linux/DevOps feature for everyone?', 'No. DevOps Delivery Kit is optional and mainly useful for developers, technical freelancers, and small agencies who deliver websites, apps, VPS, GitHub, or maintenance work.'],
  ['Can beginners use it?', 'Yes. Beginners can use the free software or choose Agency Setup if they want help setting up their offer and client workflow.'],
  ['Is this another Upwork or Fiverr?', 'No. ClientFlow AI is not a job marketplace. It is a direct-client business system for freelancers who want to manage their own leads, proposals, work, invoices, and payments.'],
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
  const [advisorProblem, setAdvisorProblem] = useState('clients');
  const [advisorStage, setAdvisorStage] = useState('active');
  const [billingMarket, setBillingMarket] = useState(getInitialBillingMarket);
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
  const selectedAdvisorProblem = fitAdvisorProblems.find((item) => item.id === advisorProblem) || fitAdvisorProblems[0];
  const selectedAdvisorStage = fitAdvisorStages.find((item) => item.id === advisorStage) || fitAdvisorStages[0];

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
    if (path.startsWith('/work/')) {
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

  const selectBillingMarket = (market) => {
    const safeMarket = getSafeBillingMarket(market);
    localStorage.setItem('billingMarket', safeMarket);
    setBillingMarket(safeMarket);
    trackCtaClick(`select_${safeMarket}_billing`, 'home_billing_switch', `/payment?market=${safeMarket}`);
  };

  const getPaymentPath = (extra = '') => `/payment?market=${billingMarket}${extra ? `&${extra}` : ''}`;

  const selectPlan = (planId) => {
    if (planId === 'early_access') {
      const earlyAccessPath = getPaymentPath('early=1');
      if (!loggedIn) {
        setPostLoginRedirect(earlyAccessPath);
      }

      trackCtaClick('select_early_access', 'home_pricing', loggedIn ? earlyAccessPath : '/signup');
      navigate(loggedIn ? earlyAccessPath : '/signup');
      return;
    }

    if (planId !== 'free') {
      localStorage.setItem('plan', planId);
      localStorage.setItem('billingMarket', billingMarket);
    }

    if (planId === 'free' && !loggedIn) {
      setPostLoginRedirect('/client-flow');
    }

    const nextPath = planId === 'free'
      ? (loggedIn ? '/client-flow' : '/signup')
      : (loggedIn ? getPaymentPath() : '/signup');

    if (!loggedIn && planId !== 'free') {
      setPostLoginRedirect(getPaymentPath());
    }

    trackCtaClick(`select_${planId}`, 'home_pricing', nextPath);
    navigate(nextPath);
  };

  const runAdvisorAction = () => {
    if (selectedAdvisorStage.path) {
      trackCtaClick(`advisor_${selectedAdvisorProblem.id}_${selectedAdvisorStage.id}`, 'home_fit_advisor', selectedAdvisorStage.path);
      navigate(selectedAdvisorStage.path);
      return;
    }

    selectPlan(selectedAdvisorStage.planId);
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
                Run your freelance business without losing leads, work, or payments.
              </h1>

              <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                ClientFlow AI helps freelancers turn conversations into proposals, manage delivery, create invoices, and collect payment without keeping the whole business in memory.
              </p>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                Simple promise: know who to contact, what to send, what to deliver, and which payment to collect next.
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
                      onClick={() => goToApp(hasActivePro && !showExpiryAlert ? '/client-flow' : getPaymentPath(), 'home_plan_status')}
                      className="shrink-0 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-zinc-200 active:scale-95"
                    >
                      {showExpiryAlert ? 'Renew Pro' : hasActivePro ? 'Open Flow' : 'Start Trial'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-7 flex max-w-xl flex-col gap-3 rounded-[1.25rem] border border-white/8 bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="px-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Billing</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(billingMarkets).map(([id, option]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectBillingMarket(id)}
                      className={`rounded-xl px-4 py-3 text-left text-xs font-black uppercase tracking-widest transition-all ${
                        billingMarket === id
                          ? 'bg-yellow-400 text-black'
                          : 'border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {option.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => goToApp('/client-flow', loggedIn ? 'hero_open_client_flow' : 'hero_start_free')}
                  className="rounded-2xl bg-yellow-400 px-7 py-4 text-center text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-yellow-950/20 transition-all hover:-translate-y-0.5 hover:bg-yellow-300 active:scale-95"
                >
                  {loggedIn ? 'Open Client Flow' : 'Start Free'}
                </button>
                <button
                  type="button"
                  onClick={() => selectPlan('early_access')}
                  className="rounded-2xl bg-emerald-300 px-7 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-emerald-200 active:scale-95"
                >
                  Try 30 Days Free
                </button>
                <button
                  type="button"
                  onClick={() => selectPlan('monthly')}
                  className="btn btn-primary px-7 py-4 text-sm"
                >
                  Buy Pro {getPlanPrice('monthly', billingMarket)}/month
                </button>
                <Link to="/agency" className="btn btn-dark px-7 py-4 text-center text-sm">
                  Need Setup Help?
                </Link>
              </div>
              <p className="mt-4 max-w-xl text-xs font-bold leading-relaxed text-zinc-600">
                No card required for free access. Login or signup saves the workspace; Pro is for serious freelancers who want the full workflow.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/30">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/30 p-5">
                <div className="flex items-center justify-between gap-4">
                  <BrandLogo showText={false} markClassName="h-12 w-12" />
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    Example preview
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

                <p className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-xs font-bold leading-relaxed text-zinc-400">
                  These are example values for understanding the product. Your real dashboard uses your own leads, proposals, projects, invoices, and payments.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-yellow-400/[0.035] py-12 sm:py-14">
          <div className="container-custom">
            <div className="responsive-heading-grid">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Choose today</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  New users should understand the product and know where to buy.
                </h2>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                  ClientFlow AI is not only an invoice maker. It is a daily business workflow for freelancers who want clients, cleaner delivery, invoices, and payment follow-up in one place.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-yellow-300/20 bg-black/25 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">What users buy</p>
                <p className="mt-3 text-2xl font-black leading-tight text-white">
                  Pro gives the full lead-to-payment system. Setup help gives a beginner a clear starting plan.
                </p>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">
                  No income guarantee. The value is making money actions visible and easier to execute.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {buyerPathCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => card.path ? navigate(card.path) : selectPlan(card.planId)}
                  className={`rounded-[1.75rem] border p-6 text-left transition-all hover:-translate-y-1 ${
                    card.recommended
                      ? 'border-yellow-300/35 bg-yellow-300/[0.1] shadow-2xl shadow-yellow-950/20'
                      : 'border-white/8 bg-black/25 hover:border-yellow-300/25 hover:bg-yellow-300/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-black text-white">{card.title}</h3>
                      <p className="mt-2 text-3xl font-black tracking-tight text-yellow-200">
                        {card.planId === 'monthly'
                          ? `${getPlanPrice('monthly', billingMarket)}/month`
                          : card.planId === 'free'
                            ? getPlanPrice('free', billingMarket)
                            : card.price}
                      </p>
                    </div>
                    {card.recommended && (
                      <span className="rounded-full border border-yellow-300/20 bg-yellow-300/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-yellow-100">
                        Best next step
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">{card.text}</p>
                  <span className={`mt-6 inline-flex w-full justify-center rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-widest transition ${
                    card.recommended
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'border border-white/10 text-white hover:bg-white/10'
                  }`}>
                    {card.action}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/[0.045] p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                    New feature
                  </p>
                  <h3 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                    Freelance Fit Advisor
                  </h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
                    Pick the main problem and current stage. The full advisor shows whether Free, Pro, or setup help is the right first path.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {fitAdvisorProblems.map((problem) => (
                      <button
                        key={problem.id}
                        type="button"
                        onClick={() => setAdvisorProblem(problem.id)}
                        className={`rounded-2xl border p-4 text-left transition-all ${
                          advisorProblem === problem.id
                            ? 'border-emerald-300/35 bg-emerald-300/15 text-white'
                            : 'border-white/8 bg-black/25 text-zinc-400 hover:border-emerald-300/20 hover:text-white'
                        }`}
                      >
                        <span className="text-sm font-black">{problem.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Current stage</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {fitAdvisorStages.map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setAdvisorStage(stage.id)}
                        className={`rounded-2xl border px-4 py-3 text-left text-xs font-black uppercase tracking-widest transition-all ${
                          advisorStage === stage.id
                            ? 'border-yellow-300/35 bg-yellow-300/15 text-yellow-100'
                            : 'border-white/8 bg-white/[0.03] text-zinc-500 hover:border-yellow-300/20 hover:text-white'
                        }`}
                      >
                        {stage.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">
                      {selectedAdvisorStage.result}
                    </p>
                    <h4 className="mt-3 text-2xl font-black leading-tight text-white">
                      {selectedAdvisorProblem.title}
                    </h4>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
                      {selectedAdvisorProblem.text}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedAdvisorProblem.tools.map((tool) => (
                        <span
                          key={tool}
                          className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-100"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={runAdvisorAction}
                      className="mt-5 w-full rounded-2xl bg-yellow-400 px-5 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:-translate-y-0.5 hover:bg-yellow-300 active:scale-95"
                    >
                      {selectedAdvisorStage.action}
                    </button>
                    <Link
                      to="/freelance-fit-advisor"
                      className="mt-3 inline-flex w-full justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] px-5 py-4 text-sm font-black uppercase tracking-widest text-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-300/35"
                      onClick={() => trackCtaClick('open_full_fit_advisor', 'home_fit_advisor', '/freelance-fit-advisor')}
                    >
                      Open full advisor
                    </Link>
                  </div>
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
                It solves the boring problems that actually cost freelancers money.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Most freelancers do not fail because they cannot create an invoice. They lose money because leads go cold, proposals are delayed, client work gets messy, and payments are not followed up.
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

        <section className="border-b border-white/5 bg-emerald-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="responsive-heading-grid">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Real-world value</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Users pay when the product protects their cashflow.
                </h2>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                  ClientFlow AI is designed around outcomes a freelancer can feel: fewer forgotten leads, faster proposals, cleaner delivery, and more professional payment follow-up.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-emerald-300/20 bg-black/25 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Why Pro can be worth it</p>
                <p className="mt-3 text-2xl font-black leading-tight text-white">
                  If it helps recover one delayed payment or close one client faster, the subscription can pay for itself.
                </p>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">
                  No income guarantee. The value is giving freelancers a clearer system so important money actions do not disappear.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {realWorldOutcomes.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <h3 className="text-lg font-black leading-tight text-white">{item.title}</h3>
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-600">Problem</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{item.problem}</p>
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-emerald-300">Result</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-200">{item.result}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-cyan-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="responsive-heading-grid">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Different from marketplaces</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  ClientFlow AI is for freelancers who want direct clients, not another bidding platform.
                </h2>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                  Upwork and Fiverr make money by owning the marketplace transaction. ClientFlow AI should make money by helping freelancers own their client workflow and pay for software that protects their cashflow.
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-cyan-300/20 bg-black/25 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Positioning</p>
                <p className="mt-3 text-2xl font-black leading-tight text-white">
                  Not "find cheap gigs". Build a repeatable client-to-payment system.
                </p>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">
                  This makes the product easier to sell as a monthly tool, a founder plan, and a setup service for freelancers who are serious about direct client work.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {marketplaceDifference.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-6 transition-all hover:-translate-y-1 hover:border-cyan-300/25">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">{item.label}</p>
                  <h3 className="mt-3 text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {directClientAdvantages.map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <h3 className="text-lg font-black text-white">{title}</h3>
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
                ClientFlow AI is the software. Free access still needs login or signup so each freelancer gets their own saved workspace. Agency Setup is the support service for freelancers who want help setting up their workflow.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-6xl gap-5 md:grid-cols-3">
              {serviceOffers.map((offer) => {
                const offerPath = offer.path === '/signup' && loggedIn
                  ? '/client-flow'
                  : offer.path === '/business-autopilot' && !loggedIn
                    ? '/signup'
                    : offer.path;
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

        <section className="border-b border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">For new users</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Clear product promise for beginners.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                The product is simple: organize the client-to-payment workflow so freelancers know what to do next and stop losing money through missed follow-ups, unclear offers, messy delivery, and delayed invoices.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {earlyUserClarity.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-6 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                  <h3 className="text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{item.text}</p>
                </div>
              ))}
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
              {featurePageCards.map((feature) => (
                <button
                  key={feature.title}
                  type="button"
                  onClick={() => openFeature(feature.path, feature.title)}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-6 text-left transition-all hover:-translate-y-1 hover:border-yellow-300/25 hover:bg-yellow-300/[0.05]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{feature.title}</p>
                  <h3 className="mt-3 text-xl font-black text-white">{feature.benefit}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{feature.detail}</p>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">View work page</p>
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

        <section className="border-b border-white/5 bg-zinc-950/70 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Pay for outcomes, not buttons</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Pro is for freelancers already doing real client work.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                A user should not feel forced to pay just to create one invoice. They pay when ClientFlow AI becomes their daily business control room.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-4 md:grid-cols-2">
                {proWorthReasons.map(([title, text]) => (
                  <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                    <h3 className="text-lg font-black text-white">{title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Honest fit</p>
                <div className="mt-4 space-y-3">
                  {honestFit.map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                      <p className="text-sm font-black text-white">{title}</p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-b border-white/5 bg-zinc-950/55 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Pricing</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Start free or buy Pro when you want the full workflow.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Free is for testing after signup. Pro is for freelancers who want daily client, delivery, invoice, and payment actions.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
              {Object.entries(billingMarkets).map(([id, option]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectBillingMarket(id)}
                  className={`rounded-[1.25rem] border p-4 text-left transition-all hover:-translate-y-0.5 ${
                    billingMarket === id
                      ? 'border-yellow-300/45 bg-yellow-300/10 text-white'
                      : 'border-white/8 bg-black/25 text-zinc-400 hover:border-white/15 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em]">{option.label}</p>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      {getPlanPrice('monthly', id)}/mo
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{option.detail}</p>
                </button>
              ))}
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
                  <p className="mt-4 text-4xl font-black text-white">{getPlanPrice(plan.id, billingMarket)}</p>
                  {plan.id !== 'free' && plan.id !== 'early_access' && (
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-cyan-200/80">
                      {billingMarket === 'india' ? 'International' : 'India'}: {getPlanPrice(plan.id, billingMarket === 'india' ? 'global' : 'india')}
                    </p>
                  )}
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

        <section className="border-b border-white/5 bg-slate-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Company-grade standards</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Professional without fake enterprise claims.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                The product should help a freelancer look organized, reliable, and serious to clients. That is useful. Fake MNC branding is not.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {operatingStandards.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                  <h3 className="text-lg font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{item.text}</p>
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
