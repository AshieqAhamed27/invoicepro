import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackCtaClick } from '../utils/analytics';
import { isLoggedIn, setPostLoginRedirect } from '../utils/auth';
import {
  COMPANY_NAME,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const availableNow = [
  ['Direct-client workspace', 'Manage leads, proposals, workrooms, invoices, and payment follow-ups without using a marketplace.'],
  ['Team delivery flow', 'Use workrooms, collaborator invites, delivery notes, proof links, invoices, and payment status in one project path.'],
  ['Admin visibility', 'View product usage, free and paid access, revenue signals, AI status, and user activity from the admin page.'],
  ['Payment-ready invoices', 'Create professional invoices with PDF, public links, Razorpay/UPI-friendly flow, and international payment direction.'],
  ['Automation layer', 'Use configured notification automation for user digests, proposal reminders, and client invoice follow-ups.'],
  ['AI support layer', 'Use the AI coach and business tools to guide next actions, proposals, pricing, follow-ups, and payment messages.']
];

const enterpriseRoadmap = [
  ['Advanced role packs', 'Current workroom roles support owner, editor, and viewer. Next enterprise step is manager, finance, delivery lead, and client approver packs.'],
  ['SSO and policy controls', 'SAML/OIDC login, domain controls, and stricter session policies for company teams.'],
  ['Audit trail', 'Track who created, changed, sent, approved, or paid key client workflow records.'],
  ['Custom workflows', 'Company-specific proposal stages, invoice approval rules, notification templates, and client handover steps.'],
  ['Data export and API', 'CSV exports, reporting endpoints, webhooks, and deeper integrations with finance and CRM systems.'],
  ['Enterprise support', 'Setup calls, migration help, documented onboarding, and priority issue review.']
];

const teamProblems = [
  {
    title: 'Sales and delivery are disconnected',
    text: 'A client conversation becomes a proposal, then project work, then invoice and payment. Teams lose context when every step lives in a different tool.'
  },
  {
    title: 'Payment follow-up is not owned',
    text: 'Invoices are created, but no one clearly owns the next payment action, client reminder, promise date, or proof of delivery.'
  },
  {
    title: 'Managers cannot see the real workflow',
    text: 'A team may look busy, but the owner needs to know which leads, proposals, projects, and payments need attention today.'
  }
];

const enterpriseSignals = [
  ['Trust', 'Clear support contact, business registration display, honest feature status, and policy pages.'],
  ['Control', 'Admin-only pages, protected routes, payment verification, and configurable automation secrets.'],
  ['Scale path', 'Free users can start simple, Pro users can grow, and teams can request managed enterprise setup.'],
  ['Global readiness', 'India-first billing with international payment direction for non-India customers when payment provider setup is enabled.']
];

const fitRows = [
  ['Freelancer team', 'Use ClientFlow AI when two or more people manage leads, delivery, invoices, or payment follow-up together.'],
  ['Small agency', 'Use it to keep client scope, collaborator work, delivery proof, invoices, and collection actions visible.'],
  ['Consulting business', 'Use it for retainers, proposals, recurring invoices, follow-ups, and client status tracking.'],
  ['Enterprise pilot', 'Use it first with one service team before requesting custom roles, exports, SSO, or deeper integrations.']
];

const enterpriseWorkflow = [
  {
    id: 'fit',
    step: '01',
    title: 'Fit and routing',
    owner: 'Founder or team owner',
    problem: 'Users get confused when one page sells to freelancers, agencies, and bigger teams at the same time.',
    productAction: 'Route solo users to Free/Pro, small teams to Client Workroom, and bigger teams to an enterprise pilot or setup request.',
    userSees: 'A clear choice: start free, open team workflow, or request managed setup.',
    available: 'Available now'
  },
  {
    id: 'workspace',
    step: '02',
    title: 'Company workspace',
    owner: 'Owner',
    problem: 'Client work becomes scattered across WhatsApp, docs, spreadsheets, and payment tools.',
    productAction: 'Create one client workroom with scope, milestones, collaborators, files, proof links, invoice, and payment follow-up.',
    userSees: 'One place for the whole client project.',
    available: 'Available now'
  },
  {
    id: 'roles',
    step: '03',
    title: 'Roles and access',
    owner: 'Owner or manager',
    problem: 'Everyone should not have the same access. Finance, delivery, and viewers need different control.',
    productAction: 'Use owner, editor, and viewer roles now; expand later into manager, finance, delivery lead, and client approver.',
    userSees: 'Invite people with simple access instead of exposing everything.',
    available: 'Foundation live'
  },
  {
    id: 'proposal',
    step: '04',
    title: 'Proposal approval',
    owner: 'Sales or manager',
    problem: 'Teams lose deals when scope, price, timeline, and approval are not clear.',
    productAction: 'Use proposal writer, deal room, project brief, and follow-up messages to move from lead to approved work.',
    userSees: 'A clean proposal path before delivery starts.',
    available: 'Available now'
  },
  {
    id: 'delivery',
    step: '05',
    title: 'Delivery control',
    owner: 'Delivery lead',
    problem: 'Client requests, tasks, proof, handover, and bugs get mixed together.',
    productAction: 'Use tasks, resources, wiki pages, GitHub/dev delivery notes, releases, and maintenance issues inside the workroom.',
    userSees: 'Who owns the task, what is blocked, what is ready for review, and what proof exists.',
    available: 'Available now'
  },
  {
    id: 'finance',
    step: '06',
    title: 'Invoice and payment',
    owner: 'Finance or owner',
    problem: 'Work may be delivered, but payment follow-up is unclear or forgotten.',
    productAction: 'Create invoices, public payment pages, payment links, promise dates, payment reminders, and collection priority.',
    userSees: 'Which payment should be collected next and what message to send.',
    available: 'Available now'
  },
  {
    id: 'automation',
    step: '07',
    title: 'Notifications and automation',
    owner: 'Admin',
    problem: 'Teams forget follow-ups when the system depends only on memory.',
    productAction: 'Use configured n8n/backend automation for user digests, proposal reminders, and invoice follow-ups.',
    userSees: 'Daily actions and client follow-ups without manually checking every page.',
    available: 'Setup ready'
  },
  {
    id: 'review',
    step: '08',
    title: 'Admin review',
    owner: 'Admin',
    problem: 'Owners need to know usage, revenue, paid users, AI status, and product health.',
    productAction: 'Use admin analytics, revenue overview, free/paid user lists, AI status, and live activity graph.',
    userSees: 'A management view without touching normal user workflow.',
    available: 'Available now'
  }
];

const roleMatrix = [
  {
    role: 'Owner',
    responsibility: 'Create workspace, invite team, approve proposal/payment flow, see admin-level business status.',
    current: 'Owner role exists in team projects.',
    next: 'Company-level controls and policy settings.'
  },
  {
    role: 'Manager',
    responsibility: 'Track leads, proposals, delivery progress, blockers, and daily team actions.',
    current: 'Use editor role and workroom visibility now.',
    next: 'Dedicated manager role with team reporting.'
  },
  {
    role: 'Delivery',
    responsibility: 'Update tasks, proof links, releases, project notes, bugs, and handover status.',
    current: 'Use editor role, tasks, resources, wiki, releases, and issues now.',
    next: 'Delivery-only permissions.'
  },
  {
    role: 'Finance',
    responsibility: 'Create invoices, track pending payments, review paid users, and manage collection messages.',
    current: 'Owner/admin can manage invoices and payment tracking now.',
    next: 'Finance-only invoice and payment permissions.'
  },
  {
    role: 'Client viewer',
    responsibility: 'Review agreed work, proof, invoice, and payment link without editing internal work.',
    current: 'Public invoice/proposal pages and viewer invite foundation.',
    next: 'Dedicated client portal view.'
  }
];

const userRouting = [
  {
    title: 'Solo freelancer',
    decision: 'Start free',
    detail: 'Use this when one person wants to understand the workflow before paying.',
    path: '/signup',
    cta: 'Start Free'
  },
  {
    title: 'Small team',
    decision: 'Use Client Workroom',
    detail: 'Use this when 2-10 people manage client delivery, tasks, proof, and payments together.',
    path: '/client-workroom',
    cta: 'Open Workroom',
    requiresLogin: true
  },
  {
    title: 'Agency or company',
    decision: 'Request pilot setup',
    detail: 'Use this when the buyer needs guided setup, roles, reporting, and a team rollout plan.',
    path: '/agency?workflow=agencies#agency-booking',
    cta: 'Request Setup'
  }
];

const pilotOptions = [
  {
    id: 'agency',
    label: 'Small agency',
    teamSize: '3-15 people',
    goal: 'Control delivery, collaborator work, proof, invoices, and payment collection.',
    start: 'Create one agency workroom and run one client project end to end.'
  },
  {
    id: 'consulting',
    label: 'Consulting team',
    teamSize: '2-12 people',
    goal: 'Move client conversations into proposals, retainers, invoices, and recurring follow-up.',
    start: 'Use one retainer client as the pilot and track proposal to payment.'
  },
  {
    id: 'delivery',
    label: 'Service company',
    teamSize: '5-25 people',
    goal: 'Make project ownership, delivery review, finance follow-up, and reports visible.',
    start: 'Run one department or one service line before expanding.'
  }
];

const pilotTimeline = [
  ['Week 1', 'Set up identity, team owner, first workroom, roles, and one real client project.'],
  ['Week 2', 'Move proposal, scope, tasks, delivery proof, and client updates into the workroom.'],
  ['Week 3', 'Create invoice/payment flow, reminders, promise tracking, and admin review habits.'],
  ['Week 4', 'Review usage, blockers, revenue signal, and decide whether to expand roles or integrations.']
];

export default function Enterprise() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState('fit');
  const [selectedPilotId, setSelectedPilotId] = useState('agency');
  const loggedIn = isLoggedIn();

  useDocumentMeta({
    title: `${COMPANY_NAME} Enterprise - Client workflow for teams`,
    description: 'ClientFlow AI Enterprise helps service teams manage direct clients, proposals, delivery, invoices, payments, admin visibility, and automation readiness.',
    path: '/enterprise'
  });

  const activeStep = enterpriseWorkflow.find((step) => step.id === activeWorkflowStep) || enterpriseWorkflow[0];
  const selectedPilot = useMemo(
    () => pilotOptions.find((option) => option.id === selectedPilotId) || pilotOptions[0],
    [selectedPilotId]
  );

  const trackEnterpriseCta = (label, destination) => {
    trackCtaClick(label, 'enterprise', destination);
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="border-b border-white/5">
          <div className="container-custom grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center lg:py-20">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Enterprise workflow
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                A clear team workflow without confusing solo users.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                For bigger users, ClientFlow AI should not only create invoices. It should connect client acquisition,
                proposal approval, delivery, proof, payment collection, admin visibility, and automation in one operating flow.
              </p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                The normal product stays simple for freelancers. Enterprise sits as a separate path for teams that need
                roles, delivery control, finance follow-up, admin visibility, and guided rollout.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to="/signup"
                  onClick={() => trackEnterpriseCta('enterprise_start_free', '/signup')}
                  className="rounded-2xl bg-yellow-400 px-7 py-4 text-center text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-yellow-950/20 transition-all hover:-translate-y-0.5 hover:bg-yellow-300 active:scale-95"
                >
                  Start Free Pilot
                </Link>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=ClientFlow AI Enterprise Setup`}
                  onClick={() => trackEnterpriseCta('enterprise_contact_setup', `mailto:${SUPPORT_EMAIL}`)}
                  className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-7 py-4 text-center text-sm font-black uppercase tracking-widest text-emerald-100 transition-all hover:-translate-y-0.5 hover:bg-emerald-300/15 active:scale-95"
                >
                  Request Team Setup
                </a>
                <Link
                  to="/agency?workflow=agencies#agency-booking"
                  onClick={() => trackEnterpriseCta('enterprise_agency_setup', '/agency?workflow=agencies#agency-booking')}
                  className="btn btn-dark px-7 py-4 text-center text-sm"
                >
                  See Setup Service
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/30">
              <div className="border-b border-white/5 bg-white/[0.03] px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Team command view</p>
                    <p className="mt-1 text-lg font-black text-white">Lead to payment status</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    Pilot ready
                  </span>
                </div>
              </div>

              <div className="grid gap-3 p-5">
                {[
                  ['Lead', 'Follow up with 8 active opportunities', '72%'],
                  ['Proposal', '3 offers waiting for client response', '48%'],
                  ['Delivery', '2 projects need proof or approval', '64%'],
                  ['Payment', 'Rs 42,000 pending collection', '81%']
                ].map(([label, detail, width]) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-white">{label}</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{detail}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                        Live
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-yellow-300" style={{ width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-custom py-12 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-3">
            {teamProblems.map((problem) => (
              <article key={problem.title} className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-6 transition-all hover:-translate-y-1 hover:border-yellow-300/20 hover:bg-yellow-300/[0.04]">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Problem</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-white">{problem.title}</h2>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">{problem.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/5 bg-emerald-400/[0.035]">
          <div className="container-custom py-12 sm:py-16">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">No confusion routing</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Every user gets the right path before they touch the product.
                </h2>
              </div>
              <p className="max-w-xl text-sm font-semibold leading-relaxed text-zinc-400">
                This keeps the core workflow safe: solo users start simple, teams use the workroom, and bigger buyers enter a guided pilot path.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {userRouting.map((item) => {
                const destination = item.requiresLogin && !loggedIn ? '/signup' : item.path;

                return (
                  <div key={item.title} className="rounded-[2rem] border border-white/8 bg-black/20 p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{item.title}</p>
                    <h3 className="mt-3 text-2xl font-black text-white">{item.decision}</h3>
                    <p className="mt-3 min-h-16 text-sm font-semibold leading-relaxed text-zinc-400">{item.detail}</p>
                    <Link
                      to={destination}
                      onClick={() => {
                        if (item.requiresLogin && !loggedIn) {
                          setPostLoginRedirect(item.path);
                        }
                        trackEnterpriseCta(`route_${item.title.toLowerCase().replace(/\s+/g, '_')}`, destination);
                      }}
                      className="mt-5 inline-flex rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                    >
                      {item.requiresLogin && !loggedIn ? 'Create Account' : item.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container-custom py-12 sm:py-16">
          <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Deep workflow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Enterprise flow from first inquiry to final payment.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">
                Each stage tells the user what to do, who owns it, and where it belongs in ClientFlow AI. That removes confusion without changing the existing freelancer flow.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="grid gap-2">
                {enterpriseWorkflow.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveWorkflowStep(step.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      activeStep.id === step.id
                        ? 'border-yellow-300/30 bg-yellow-300/10 text-white shadow-lg shadow-yellow-950/20'
                        : 'border-white/8 bg-white/[0.02] text-zinc-400 hover:border-white/15 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{step.step}</span>
                    <span className="mt-1 block text-sm font-black">{step.title}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-[2rem] border border-white/8 bg-zinc-950 p-5 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{activeStep.step} / {activeStep.owner}</p>
                    <h3 className="mt-2 text-3xl font-black tracking-tight text-white">{activeStep.title}</h3>
                  </div>
                  <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    {activeStep.available}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    ['Problem', activeStep.problem],
                    ['Product action', activeStep.productAction],
                    ['User sees', activeStep.userSees]
                  ].map(([label, text]) => (
                    <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
                      <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-black/15">
          <div className="container-custom grid gap-10 py-12 sm:py-16 lg:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Available now</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Enterprise value starts with the existing workflow.
              </h2>
              <div className="mt-8 grid gap-4">
                {availableNow.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
                    <p className="text-base font-black text-white">{title}</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Roadmap for enterprise</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Add these only when team demand is real.
              </h2>
              <div className="mt-8 grid gap-4">
                {enterpriseRoadmap.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-black text-white">{title}</p>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">{text}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-sky-200">
                        Next
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-custom py-12 sm:py-16">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Role clarity</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                Team permissions should feel simple, even when the company is bigger.
              </h2>
            </div>
            <p className="max-w-xl text-sm font-semibold leading-relaxed text-zinc-400">
              The product already has owner, editor, and viewer foundations in the team workroom. The enterprise model explains how those roles should grow without changing normal user behavior.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/8">
            {roleMatrix.map((row, index) => (
              <div key={row.role} className={`grid gap-4 p-5 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:p-6 ${
                index !== roleMatrix.length - 1 ? 'border-b border-white/5' : ''
              }`}>
                <p className="text-sm font-black uppercase tracking-widest text-white">{row.role}</p>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Responsibility</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{row.responsibility}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Current product</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{row.current}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Enterprise next</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{row.next}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-300/[0.04]">
          <div className="container-custom grid gap-8 py-12 sm:py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Pilot builder</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Start enterprise with one controlled pilot.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">
                This avoids the common enterprise mistake: adding too many features before one team proves the workflow. Pick one team type, run four weeks, then expand.
              </p>

              <div className="mt-6 grid gap-3">
                {pilotOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedPilotId(option.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      selectedPilot.id === option.id
                        ? 'border-yellow-300/35 bg-yellow-300/10 text-white'
                        : 'border-white/8 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <span className="block text-sm font-black">{option.label}</span>
                    <span className="mt-1 block text-xs font-semibold text-zinc-500">{option.teamSize}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/8 bg-zinc-950 p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Selected pilot</p>
                  <h3 className="mt-2 text-3xl font-black tracking-tight text-white">{selectedPilot.label}</h3>
                  <p className="mt-2 text-sm font-semibold text-yellow-200">{selectedPilot.teamSize}</p>
                </div>
                <Link
                  to="/agency?workflow=agencies#agency-booking"
                  onClick={() => trackEnterpriseCta(`pilot_${selectedPilot.id}_setup`, '/agency?workflow=agencies#agency-booking')}
                  className="rounded-2xl bg-white px-5 py-3 text-center text-xs font-black uppercase tracking-widest text-black transition hover:bg-zinc-200"
                >
                  Start Pilot
                </Link>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Pilot goal</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">{selectedPilot.goal}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Start here</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">{selectedPilot.start}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {pilotTimeline.map(([week, action]) => (
                  <div key={week} className="flex gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                    <span className="shrink-0 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">
                      {week}
                    </span>
                    <p className="text-sm font-semibold leading-relaxed text-zinc-400">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-custom py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Enterprise posture</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                The product should earn trust before asking for bigger contracts.
              </h2>
              <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-400">
                Enterprise buyers need proof that the product has control, clarity, support, and a path to scale. ClientFlow AI can start with a pilot, then add deeper controls when a team really needs them.
              </p>
              <p className="mt-5 break-all text-xs font-black uppercase tracking-widest text-zinc-600">
                Udyam No: {UDYAM_REGISTRATION_NUMBER}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {enterpriseSignals.map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.02] p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-300/20">
                  <p className="text-lg font-black text-white">{title}</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/5">
          <div className="container-custom py-12 sm:py-16">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Best fit</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Start with one team workflow, not the whole company.
                </h2>
              </div>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=ClientFlow AI Enterprise Pilot`}
                onClick={() => trackEnterpriseCta('enterprise_request_pilot', `mailto:${SUPPORT_EMAIL}`)}
                className="rounded-2xl bg-white px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-black transition-all hover:-translate-y-0.5 hover:bg-zinc-200 active:scale-95"
              >
                Request Pilot
              </a>
            </div>

            <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/8">
              {fitRows.map(([type, text], index) => (
                <div key={type} className={`grid gap-3 p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-6 ${
                  index !== fitRows.length - 1 ? 'border-b border-white/5' : ''
                }`}>
                  <p className="text-sm font-black uppercase tracking-widest text-white">{type}</p>
                  <p className="text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
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
