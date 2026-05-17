import React, { useMemo, useState } from 'react';

const countryOptions = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Europe',
  'Middle East',
  'Singapore',
  'India'
];

const currencyOptions = ['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'INR'];

const paymentPathOptions = [
  'Payment link when supported',
  'Bank transfer instructions',
  'Razorpay + UPI for India clients',
  'Manual collection until partner integration'
];

const defaultProfile = {
  targetCountry: 'United States',
  currency: 'USD',
  paymentPath: 'Payment link when supported'
};

const accessProblems = [
  {
    id: 'cross-border-payments',
    title: 'Cross-border payments',
    gap: 'Freelancers can win foreign clients but still struggle to send a trusted invoice, choose a payment path, and prove payment status.',
    solution: 'Create a country-ready invoice, attach the best payment route, keep verified status, and follow up before money gets stuck.',
    status: 'Workflow live',
    later: 'Add Stripe, Payoneer, Wise, or bank payout APIs for more countries.',
    route: '/create-invoice',
    cta: 'Create Invoice',
    ready: ({ stats }) => Number(stats.paymentLinks || 0) > 0 || Number(stats.total || 0) > 0
  },
  {
    id: 'payment-protection',
    title: 'Payment protection',
    gap: 'Outside big freelance marketplaces, direct clients usually do not offer escrow, milestone protection, or safe release rules.',
    solution: 'Use deposit-first proposals, milestone invoices, approval notes, delivery proof, and payment follow-up from one workroom.',
    status: 'Workflow now',
    later: 'Real escrow needs a licensed payment or escrow partner.',
    route: '/client-workroom',
    cta: 'Open Workroom',
    ready: ({ stats }) => Number(stats.total || 0) > 0
  },
  {
    id: 'scope-contracts',
    title: 'Scope and contracts',
    gap: 'Many freelancers cannot access simple legal-style scope control, change limits, validity dates, and approval records.',
    solution: 'Turn conversations into proposals with scope, price, timeline, validity, next step, and approval-ready wording.',
    status: 'Built in',
    later: 'Add country-specific legal templates after review.',
    route: '/create-invoice?type=proposal',
    cta: 'Write Proposal',
    ready: ({ stats }) => Number(stats.proposals || 0) > 0
  },
  {
    id: 'tax-invoice',
    title: 'Tax-ready invoices',
    gap: 'International clients often expect clean invoices, tax fields, currency clarity, and records that can be shared with an accountant.',
    solution: 'Prepare invoices with client details, items, tax fields, PDF/public links, currency plan, and payment history.',
    status: 'Built in',
    later: 'Tax filing and local compliance should connect to accounting partners.',
    route: '/create-invoice',
    cta: 'Create Invoice',
    ready: ({ stats }) => Number(stats.total || 0) > 0
  },
  {
    id: 'trust-proof',
    title: 'Client trust proof',
    gap: 'Freelancers in another country need proof of credibility before a client is comfortable paying directly.',
    solution: 'Show a portfolio, professional proposal, public invoice page, delivery proof, and consistent client communication.',
    status: 'Built in',
    later: 'Add verified reviews and identity checks later.',
    route: '/portfolio',
    cta: 'Build Proof',
    ready: () => false
  },
  {
    id: 'client-access',
    title: 'Affordable client access',
    gap: 'Platforms can block discovery behind fees, algorithms, country bias, or limited invite systems.',
    solution: 'Use Client Finder, outbound autopilot, lead pipeline, proposal follow-up, and daily next-action routing.',
    status: 'Built in',
    later: 'Add live marketplace and partner lead sources later.',
    route: '/client-finder',
    cta: 'Find Clients',
    ready: ({ leadSummary }) => Number(leadSummary?.total || 0) > 0 || Number(leadSummary?.hot || 0) > 0
  },
  {
    id: 'stable-income',
    title: 'Stable income',
    gap: 'Most tools help with one invoice, but not with repeat revenue, monthly targets, retainers, and payment discipline.',
    solution: 'Convert income goals into leads, proposals, retainers, invoices, collection tasks, and weekly review actions.',
    status: 'Built in',
    later: 'Add deeper forecasting and provider billing APIs.',
    route: '/growth-plan',
    cta: 'Open Growth Plan',
    ready: ({ stats }) => Number(stats.paidAmount || 0) > 0 || Number(stats.pendingAmount || 0) > 0
  }
];

const loadProfile = () => {
  try {
    return {
      ...defaultProfile,
      ...(JSON.parse(localStorage.getItem('clientflow_global_access_profile') || '{}'))
    };
  } catch {
    return defaultProfile;
  }
};

const getStatusClass = (status) => {
  if (status === 'Built in') return 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200';
  if (status === 'Workflow live') return 'border-sky-300/25 bg-sky-300/[0.08] text-sky-200';
  return 'border-yellow-300/25 bg-yellow-300/[0.08] text-yellow-100';
};

export default function GlobalFreelancerAccessCenter({
  stats = {},
  leadSummary = {},
  compact = false,
  onOpenWorkflow
}) {
  const [profile, setProfile] = useState(loadProfile);
  const [saved, setSaved] = useState(false);
  const [activeProblemId, setActiveProblemId] = useState(accessProblems[0].id);

  const scoredProblems = useMemo(
    () => accessProblems.map((problem) => ({
      ...problem,
      solved: Boolean(problem.ready?.({ stats, leadSummary, profile }))
    })),
    [leadSummary, profile, stats]
  );

  const activeProblem = scoredProblems.find((problem) => problem.id === activeProblemId) || scoredProblems[0];
  const solvedCount = scoredProblems.filter((problem) => problem.solved).length;
  const accessScore = Math.round((solvedCount / scoredProblems.length) * 100);

  const updateProfile = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const saveProfile = () => {
    try {
      localStorage.setItem('clientflow_global_access_profile', JSON.stringify(profile));
      localStorage.setItem('clientflow_selected_workflow', 'business-autopilot');
    } catch {
      // The access plan still works as an on-screen guide when storage is blocked.
    }

    setSaved(true);
  };

  return (
    <section className={`reveal reveal-delay-1 mb-12 rounded-[2rem] border border-violet-300/20 bg-violet-300/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-8 ${compact ? '' : 'lg:p-10'}`}>
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,0.35fr)] lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">Global freelancer access</p>
          <h2 className={`${compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} mt-3 font-black tracking-tight text-white`}>
            Solve the access gaps freelancers face with clients in other countries.
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
            ClientFlow AI turns the missing pieces into a guided workflow: client access, proposal protection, delivery proof, invoice records, payment collection, and stable income planning.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Access readiness</p>
          <p className="mt-2 text-5xl font-black text-white">{accessScore}%</p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">
            {solvedCount}/{scoredProblems.length} access problems have an active workflow signal.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target client country</span>
          <select
            value={profile.targetCountry}
            onChange={(event) => updateProfile('targetCountry', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-300/50"
          >
            {countryOptions.map((country) => <option key={country}>{country}</option>)}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Invoice currency</span>
          <select
            value={profile.currency}
            onChange={(event) => updateProfile('currency', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-300/50"
          >
            {currencyOptions.map((currency) => <option key={currency}>{currency}</option>)}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Payment path</span>
          <select
            value={profile.paymentPath}
            onChange={(event) => updateProfile('paymentPath', event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-300/50"
          >
            {paymentPathOptions.map((path) => <option key={path}>{path}</option>)}
          </select>
        </label>

        <button
          type="button"
          onClick={saveProfile}
          className="rounded-2xl bg-violet-300 px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-violet-200 active:scale-95"
        >
          {saved ? 'Plan Saved' : 'Save Plan'}
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)]">
        <div className="grid gap-3 md:grid-cols-2">
          {scoredProblems.map((problem) => (
            <button
              key={problem.id}
              type="button"
              onClick={() => setActiveProblemId(problem.id)}
              className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 active:scale-[0.99] ${
                activeProblem.id === problem.id
                  ? 'border-violet-300/35 bg-violet-300/[0.08]'
                  : 'border-white/8 bg-black/20 hover:border-violet-300/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-black text-white">{problem.title}</h3>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                  problem.solved
                    ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200'
                    : 'border-yellow-300/20 bg-yellow-300/10 text-yellow-100'
                }`}>
                  {problem.solved ? 'Active' : 'Start'}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-500">{problem.gap}</p>
            </button>
          ))}
        </div>

        <aside className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">Selected problem</p>
              <h3 className="mt-3 text-2xl font-black text-white">{activeProblem.title}</h3>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${getStatusClass(activeProblem.status)}`}>
              {activeProblem.status}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">What we solve now</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{activeProblem.solution}</p>
            </div>
            <div className="rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Needs partner later</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">{activeProblem.later}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Configured plan</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-300">
              Target {profile.targetCountry} clients, invoice in {profile.currency}, and collect through {profile.paymentPath.toLowerCase()}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenWorkflow?.(activeProblem.route)}
            className="mt-5 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-zinc-200 active:scale-95"
          >
            {activeProblem.cta}
          </button>
        </aside>
      </div>
    </section>
  );
}
