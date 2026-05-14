import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME, SITE_URL, UDYAM_REGISTRATION_NUMBER } from '../utils/company';
import { trackCtaClick } from '../utils/analytics';
import { isLoggedIn } from '../utils/auth';

const verticals = {
  freelancers: {
    path: '/freelancers',
    eyebrow: 'ClientFlow AI for freelancers',
    title: 'Freelancer Business Workspace | Find Clients and Get Paid | ClientFlow AI',
    description: 'ClientFlow AI helps freelancers build stable income, find clients, manage work, send proposals and invoices, and collect payments.',
    headline: 'Build stable freelance income without going back to confusion.',
    subhead: 'ClientFlow AI gives freelancers one place to find clients, close work, manage delivery, send invoices, collect payments, and build repeat income.',
    audience: 'Solo freelancers',
    promise: 'Stable freelance income plan',
    primaryCta: 'Start Free as Freelancer',
    appPath: '/money-gps',
    workflowPath: '/workflows/freelancers',
    secondaryCta: 'See Growth Plan',
    secondaryPath: '/growth-plan',
    problems: [
      'Too many leads and payments are scattered across WhatsApp, notes, spreadsheets, and memory.',
      'Freelancers do not know which action matters today: find clients, send proposal, deliver work, or collect payment.',
      'Income feels unstable because leads, proposals, prices, and follow-ups are not connected.'
    ],
    outcomes: [
      'Know the next best money action every day.',
      'Turn monthly income goals into lead, proposal, client, and payment targets.',
      'Send professional proposals, invoices, reminders, and retention messages.'
    ],
    workflow: [
      'Set monthly income target',
      'Find and save client leads',
      'Send proposal or close message',
      'Deliver and track client work',
      'Invoice, collect, and retain'
    ],
    features: [
      'Money GPS for the best action today',
      'Freelancer Growth Plan with stability score',
      'AI Client Coach for messages and objection handling',
      'Client Workroom for delivery proof and payment',
      'Local and international invoice workflow'
    ]
  },
  developers: {
    path: '/developers',
    eyebrow: 'ClientFlow AI for developers',
    title: 'Freelance Developer Project Workspace | ClientFlow AI',
    description: 'Manage freelance coding clients, bugs, releases, handover notes, proposals, invoices, and payments in one workspace.',
    headline: 'A client-work system for freelance developers.',
    subhead: 'Use ClientFlow AI to manage client coding work beyond code: scope, issues, releases, docs, handover, invoices, and payment collection.',
    audience: 'Freelance developers',
    promise: 'From client request to paid release',
    primaryCta: 'Start as Developer',
    appPath: '/client-workroom',
    workflowPath: '/workflows/developers',
    secondaryCta: 'Open Client Workroom',
    secondaryPath: '/client-workroom',
    problems: [
      'Client requests arrive in chat and become hard to track.',
      'Bugs, releases, handover notes, and invoices are separated from the actual client workflow.',
      'Developers finish work but delay proposals, approvals, payment links, and final collection.'
    ],
    outcomes: [
      'Track scope, tasks, proof links, docs, handover, and payment in one client workroom.',
      'Use AI to decide the next delivery, proposal, or payment action.',
      'Create invoices and payment links after approved work.'
    ],
    workflow: [
      'Save client requirement',
      'Create tasks and issues',
      'Plan release and QA',
      'Write handover notes',
      'Invoice and collect payment'
    ],
    features: [
      'Client Workroom for scope, delivery proof, and handover',
      'Workroom plan for next delivery steps',
      'Collaborator invites for larger builds',
      'Proposal writer and deal room',
      'Razorpay, UPI, and international invoice flow'
    ]
  },
  designers: {
    path: '/designers',
    eyebrow: 'ClientFlow AI for designers',
    title: 'Freelance Designer Client Workflow | Proposals, Revisions, Invoices | ClientFlow AI',
    description: 'ClientFlow AI helps designers manage leads, proposals, revisions, approvals, handover notes, invoices, and payments.',
    headline: 'Manage design clients from first message to final payment.',
    subhead: 'ClientFlow AI helps designers keep proposals, revisions, client approvals, project notes, invoices, and payment follow-ups organized.',
    audience: 'Freelance designers',
    promise: 'Cleaner approvals and faster payment',
    primaryCta: 'Start as Designer',
    appPath: '/create-invoice?type=proposal',
    workflowPath: '/workflows/designers',
    secondaryCta: 'Create Proposal',
    secondaryPath: '/create-invoice?type=proposal',
    problems: [
      'Design feedback and approvals get lost in chat.',
      'Scope changes are hard to explain when there is no client work history.',
      'Designers spend too much time chasing final approval and payment.'
    ],
    outcomes: [
      'Prepare fixed-scope proposals before starting work.',
      'Track revisions, client requests, docs, and release notes.',
      'Invoice only after the work path is clear and share a professional payment link.'
    ],
    workflow: [
      'Find design client',
      'Send fixed-scope proposal',
      'Track revision requests',
      'Share delivery notes',
      'Invoice and follow up'
    ],
    features: [
      'AI proposal writer for scope and pricing',
      'Client Workroom for revisions, approvals, and proof',
      'Deal Closure Room for buyer doubts',
      'PDF invoice and public payment page',
      'Recurring client detector for monthly design support'
    ]
  },
  agencies: {
    path: '/agencies',
    eyebrow: 'ClientFlow AI for small agencies',
    title: 'Small Agency Client Management Workspace | ClientFlow AI',
    description: 'Manage agency leads, client projects, collaborators, delivery issues, proposals, invoices, and payments from one workspace.',
    headline: 'Run client delivery, teamwork, and payments without enterprise software.',
    subhead: 'ClientFlow AI helps small agencies and freelancer teams manage clients, split work, maintain project history, send proposals, invoice, and collect payments.',
    audience: 'Small agencies',
    promise: 'Team delivery plus payment control',
    primaryCta: 'Start Agency Workspace',
    appPath: '/client-workroom',
    workflowPath: '/workflows/agencies',
    secondaryCta: 'Open Client Workroom',
    secondaryPath: '/client-workroom',
    problems: [
      'Small agencies manage people, clients, scope, and payment in too many separate tools.',
      'Project status becomes unclear when tasks, issues, release notes, and invoices are not connected.',
      'Clients ask for updates but the team has no simple delivery ledger to show progress.'
    ],
    outcomes: [
      'Invite freelancers into project-specific workspaces.',
      'Track scope, tasks, delivery proof, notes, collaborators, and client handover.',
      'Use invoices and payment collection as part of the same delivery loop.'
    ],
    workflow: [
      'Create client project',
      'Invite collaborators',
      'Split delivery tasks',
      'Track issues and releases',
      'Invoice and retain client'
    ],
    features: [
      'Client Workroom for freelancer teams',
      'Delivery proof and handover history',
      'Workroom plan and delivery risk checks',
      'Proposal, deal, and invoice workflow',
      'Recurring billing for retainers'
    ]
  },
  consultants: {
    path: '/consultants',
    eyebrow: 'ClientFlow AI for consultants',
    title: 'Consultant Proposal and Payment Workspace | ClientFlow AI',
    description: 'ClientFlow AI helps consultants manage leads, proposals, retainers, client follow-ups, invoices, and payment collection.',
    headline: 'Turn consulting conversations into proposals, retainers, and paid work.',
    subhead: 'ClientFlow AI helps consultants structure offers, follow up with leads, write proposals, send invoices, and turn paid clients into repeat retainers.',
    audience: 'Consultants',
    promise: 'Proposal to retainer workflow',
    primaryCta: 'Start as Consultant',
    appPath: '/proposal-writer',
    workflowPath: '/workflows/consultants',
    secondaryCta: 'Use Proposal Writer',
    secondaryPath: '/proposal-writer',
    problems: [
      'Consulting leads stay in conversation mode too long without a clear proposal.',
      'Pricing, scope, and next steps are hard to communicate consistently.',
      'Retainer opportunities are missed after the first paid project.'
    ],
    outcomes: [
      'Convert discovery calls into structured proposals.',
      'Use follow-up and objection messages to close work professionally.',
      'Create monthly offers for clients who need ongoing support.'
    ],
    workflow: [
      'Qualify client problem',
      'Write proposal',
      'Handle objections',
      'Invoice first milestone',
      'Offer retainer'
    ],
    features: [
      'AI Client Coach for sales conversations',
      'AI Proposal and RFP Writer',
      'Deal Closure Room for trust and objections',
      'Income Goal Agent and Growth Plan',
      'Recurring client builder'
    ]
  }
};

export const verticalPagePaths = Object.values(verticals).map((page) => page.path);

export default function VerticalLanding({ pageKey }) {
  const page = verticals[pageKey];
  const loggedIn = isLoggedIn();

  if (!page) return <Navigate to="/" replace />;

  const pageStructuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: page.title,
      serviceType: 'Freelancer business workflow software',
      provider: {
        '@type': 'Organization',
        name: COMPANY_NAME,
        url: SITE_URL
      },
      audience: {
        '@type': 'Audience',
        audienceType: page.audience
      },
      areaServed: ['India', 'Worldwide'],
      url: `${SITE_URL}${page.path}`,
      description: page.description
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.audience,
          item: `${SITE_URL}${page.path}`
        }
      ]
    }
  ];

  useDocumentMeta(page.title, page.description, { path: page.path, jsonLd: pageStructuredData });

  const primaryPath = page.workflowPath;
  const secondaryPath = loggedIn ? page.secondaryPath : '/signup';
  const bottomPath = page.workflowPath;
  const bottomLabel = `Open ${page.audience} Workflow`;

  const trackPrimary = () => trackCtaClick(page.primaryCta, page.path, primaryPath);
  const trackSecondary = () => trackCtaClick(page.secondaryCta, page.path, secondaryPath);

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-yellow-400/10 via-sky-500/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                  {page.eyebrow}
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {page.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
                {page.subhead}
              </p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                Same ClientFlow AI product, focused on the exact workflow and pain points of {page.audience.toLowerCase()}.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={primaryPath}
                  onClick={trackPrimary}
                  className="btn btn-primary px-7 py-4 text-center text-sm"
                >
                  {page.primaryCta}
                </Link>
                <Link
                  to={secondaryPath}
                  onClick={trackSecondary}
                  className="btn btn-secondary px-7 py-4 text-center text-sm"
                >
                  {page.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-5">
                <BrandLogo showText={false} markClassName="h-12 w-12" />
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  {page.promise}
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {page.workflow.map((step, index) => (
                  <div key={step} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-xs font-black text-slate-950">
                        {index + 1}
                      </span>
                      <p className="text-sm font-black text-white">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/40 py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Problem</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                What this solves for {page.audience.toLowerCase()}.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {page.problems.map((problem) => (
                <div key={problem} className="rounded-[1.5rem] border border-red-400/15 bg-red-400/[0.055] p-6">
                  <p className="text-sm font-semibold leading-relaxed text-zinc-300">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Outcome</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                A business workflow, not just another tool.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                The goal is not to replace specialist tools. The goal is to connect client work, sales,
                delivery, invoices, and payment collection in one freelancer business workflow.
              </p>
            </div>

            <div className="grid gap-4">
              {page.outcomes.map((outcome) => (
                <div key={outcome} className="rounded-[1.5rem] border border-emerald-400/15 bg-emerald-400/[0.07] p-5">
                  <p className="text-sm font-semibold leading-relaxed text-emerald-50/90">{outcome}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-400/[0.045] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Features</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Same product, specific value.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {page.features.map((feature, index) => (
                <div key={feature} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                  <p className="text-3xl font-black text-white/15">0{index + 1}</p>
                  <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-300">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[0.06] p-6 text-center sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">
              India-first, global-ready
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              ClientFlow AI helps freelancers build stable income, find clients, close work, and get paid.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
              Built as an alternative to U.S. or Canada-only client-flow tools, with Indian payment workflows
              and international invoice support. Udyam No: {UDYAM_REGISTRATION_NUMBER}.
            </p>
            <Link
              to={bottomPath}
              onClick={() => trackCtaClick('vertical_bottom_cta', page.path, bottomPath)}
              className="btn btn-primary mt-7 inline-flex px-7 py-4 text-sm"
            >
              {bottomLabel}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
