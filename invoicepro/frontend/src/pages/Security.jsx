import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  COMPANY_LEGAL_DESCRIPTION,
  COMPANY_NAME,
  LEGAL_EFFECTIVE_DATE,
  SITE_URL,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';

const availableControls = [
  ['Protected accounts', 'Login is required for product workspaces, invoices, clients, dashboards, organization controls, and paid workflow access.'],
  ['Admin-only access', 'Admin analytics, revenue signals, AI status, and sensitive product status pages are separated from normal user workflow.'],
  ['Organization roles', 'Enterprise workspaces support owner, admin, billing, security, member, and viewer roles with clear permission boundaries.'],
  ['Audit history', 'Organization actions can be recorded and exported so teams can review member, billing, security, project, and backup activity.'],
  ['Backup exports', 'Company admins can export organization and workroom data for backup and internal review habits.'],
  ['Payment safety', 'Payments are handled through payment providers such as Razorpay. ClientFlow AI does not store card numbers.'],
  ['API safety controls', 'The backend includes CORS origin checks, request IDs, rate limits, JSON size limits, and unsafe Mongo key rejection.'],
  ['Automation secrets', 'Automation endpoints can be protected with configured secrets so scheduled jobs do not run openly.']
];

const complianceStatus = [
  {
    title: 'SOC 2',
    status: 'Not certified yet',
    detail: 'SOC 2 requires a formal audit by an independent auditor. ClientFlow AI can prepare the product controls, logs, policies, and evidence, but certification is a manual external process.'
  },
  {
    title: 'ISO/IEC 27001',
    status: 'Not certified yet',
    detail: 'ISO 27001 requires a documented information security management system and certification audit. This is useful later when enterprise customers require it.'
  },
  {
    title: 'Current honest claim',
    status: 'Security-ready foundation',
    detail: 'The product can describe its current security controls, role permissions, audit exports, backup exports, payment handling, and support process without claiming certification.'
  }
];

const manualItems = [
  ['External audit', 'Hire a SOC 2 auditor or ISO certification body when enterprise customers ask for certified proof.'],
  ['Legal review', 'Have privacy, terms, DPA, refund, and support policies reviewed by a qualified professional before large contracts.'],
  ['Vendor review', 'Review contracts and security details for hosting, database, email, AI, payment, analytics, and automation providers.'],
  ['Penetration test', 'Schedule a real security test before selling to bigger companies or handling sensitive enterprise data.'],
  ['Incident process', 'Document who responds, how users are notified, and how evidence is preserved if a security incident happens.'],
  ['Backup drill', 'Regularly test whether exported or stored backups can actually be restored when needed.']
];

const userResponsibilities = [
  ['Protect your login', 'Use a secure Google/GitHub account and avoid sharing login access between team members.'],
  ['Invite carefully', 'Give finance, delivery, security, and viewer roles only to the people who need that access.'],
  ['Limit sensitive data', 'Do not add passwords, private keys, or unnecessary sensitive client information into notes, proposals, or AI prompts.'],
  ['Review exports', 'Treat audit logs, backups, invoices, and client records as business-sensitive files after downloading them.']
];

const securityStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: `${COMPANY_NAME} Security`,
  url: `${SITE_URL}/security`,
  description: 'ClientFlow AI security readiness, compliance status, enterprise controls, responsible disclosure contact, and manual SOC 2/ISO next steps.',
  publisher: {
    '@type': 'Organization',
    name: COMPANY_NAME,
    identifier: UDYAM_REGISTRATION_NUMBER
  }
};

export default function Security() {
  useDocumentMeta({
    title: `Security & Compliance Readiness | ${COMPANY_NAME}`,
    description: 'See ClientFlow AI security readiness, current controls, SOC 2/ISO status, responsible disclosure contact, and enterprise security next steps.',
    path: '/security',
    jsonLd: securityStructuredData
  });

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="border-b border-white/5">
          <div className="container-custom grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:py-20">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                Security readiness
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Honest security posture for freelancers, agencies, and teams.
              </h1>
              <p className="mt-6 max-w-3xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                {COMPANY_NAME} is building the controls enterprise buyers expect: protected accounts, role-based
                permissions, audit exports, backup exports, payment-provider handling, and clear support channels.
              </p>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-relaxed text-zinc-500">
                We do not claim SOC 2 or ISO 27001 certification today. Those require external audit and certification.
                This page separates what is already in the product from what must be done manually later.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to="/organization" className="btn btn-primary px-7 py-4 text-sm">
                  Open Organization Controls
                </Link>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=ClientFlow AI Security Question`}
                  className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-7 py-4 text-center text-sm font-black uppercase tracking-widest text-emerald-100 transition hover:bg-emerald-300/15"
                >
                  Contact Security
                </a>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-6 shadow-2xl shadow-black/25">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Current status</p>
              <h2 className="mt-3 text-2xl font-black text-white">Security-ready foundation</h2>
              <div className="mt-6 grid gap-3">
                {[
                  ['SOC 2', 'Not certified yet'],
                  ['ISO 27001', 'Not certified yet'],
                  ['Audit logs', 'Product control available'],
                  ['Role permissions', 'Product control available'],
                  ['Backup export', 'Product control available']
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/25 p-4">
                    <span className="text-sm font-black text-white">{label}</span>
                    <span className="text-right text-xs font-bold text-zinc-400">{value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs font-semibold leading-relaxed text-zinc-500">
                Effective date: {LEGAL_EFFECTIVE_DATE}
              </p>
            </aside>
          </div>
        </section>

        <section className="container-custom py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Available now</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Product controls that can support enterprise trust.
            </h2>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              These are the security and operating controls users can understand before they buy or invite a team.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {availableControls.map(([title, text]) => (
              <article key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25 hover:bg-emerald-300/[0.04]">
                <h3 className="text-base font-black text-white">{title}</h3>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/5 bg-sky-400/[0.035]">
          <div className="container-custom py-12 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">SOC 2 and ISO</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Compliance wording must stay truthful.
                </h2>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                  For marketing and enterprise sales, use this wording: security-ready foundation with audit logs,
                  role permissions, backup exports, payment-provider handling, and data retention controls.
                </p>
              </div>

              <div className="grid gap-4">
                {complianceStatus.map((item) => (
                  <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="text-xl font-black text-white">{item.title}</h3>
                      <span className="w-fit rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-200">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-custom py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Manual later</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                These cannot be completed by code alone.
              </h2>
              <div className="mt-8 grid gap-4">
                {manualItems.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-yellow-300/15 bg-yellow-300/[0.045] p-5">
                    <p className="text-base font-black text-white">{title}</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">User responsibility</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Security also depends on how each workspace is used.
              </h2>
              <div className="mt-8 grid gap-4">
                {userResponsibilities.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                    <p className="text-base font-black text-white">{title}</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-zinc-950/70">
          <div className="container-custom grid gap-8 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-300">Responsible disclosure</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Report security issues privately.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                If you believe you found a security issue, please do not post it publicly. Email enough detail for us
                to reproduce and review the issue safely.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Security report for ClientFlow AI`}
                className="mt-6 inline-flex rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-zinc-200"
              >
                Email Security Report
              </a>
            </div>

            <div className="rounded-[2rem] border border-white/8 bg-black/25 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Business identity</p>
              <h3 className="mt-3 text-2xl font-black text-white">{COMPANY_NAME}</h3>
              <div className="mt-5 grid gap-3 text-sm font-semibold leading-relaxed text-zinc-400">
                <p>{COMPANY_LEGAL_DESCRIPTION}</p>
                <p className="break-all">Udyam Registration Number: {UDYAM_REGISTRATION_NUMBER}</p>
                <p className="break-all">Security contact: {SUPPORT_EMAIL}</p>
                <p>
                  Also read the <Link className="font-black text-yellow-200 hover:text-yellow-100" to="/privacy">Privacy Policy</Link>
                  {' '}and <Link className="font-black text-yellow-200 hover:text-yellow-100" to="/terms">Terms of Use</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
