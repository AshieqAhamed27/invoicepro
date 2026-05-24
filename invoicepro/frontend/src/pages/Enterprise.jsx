import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackCtaClick } from '../utils/analytics';
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
  ['Advanced roles', 'Owner, manager, finance, delivery, and collaborator permissions for larger teams.'],
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

export default function Enterprise() {
  useDocumentMeta({
    title: `${COMPANY_NAME} Enterprise - Client workflow for teams`,
    description: 'ClientFlow AI Enterprise helps service teams manage direct clients, proposals, delivery, invoices, payments, admin visibility, and automation readiness.',
    path: '/enterprise'
  });

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
                Enterprise direction
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Turn ClientFlow AI into a team-ready business system.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                For bigger users, ClientFlow AI should not only create invoices. It should connect client acquisition,
                proposal approval, delivery, proof, payment collection, admin visibility, and automation in one operating flow.
              </p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                The current product is strongest for freelancers and small teams. This page shows the enterprise path honestly:
                what is available now, what can be configured, and what should come next.
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
                  to="/agency"
                  onClick={() => trackEnterpriseCta('enterprise_agency_setup', '/agency')}
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
