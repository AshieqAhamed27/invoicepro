import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  getFreeAccessState,
  getPlanLabel,
  getUser,
  hasProAccess,
  isLoggedIn,
  setPostLoginRedirect
} from '../utils/auth';
import { trackCtaClick } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';
import {
  COMPANY_NAME,
  COMPANY_TAGLINE,
  SITE_URL,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const workflowSteps = [
  ['01', 'Find and qualify a lead', 'Keep the contact, need, next action, and follow-up date together.'],
  ['02', 'Send a clear proposal', 'Define scope, price, timeline, and the decision the client needs to make.'],
  ['03', 'Manage the work', 'Track tasks, approvals, files, delivery proof, and client notes in one workroom.'],
  ['04', 'Create the invoice', 'Send a professional invoice with the correct amount, due date, currency, and payment path.'],
  ['05', 'Follow up payment', 'See what is pending and send a calm reminder before an invoice is forgotten.']
];

const protectionItems = [
  {
    title: 'Check the client before starting',
    text: 'Record budget, urgency, scope clarity, deposit, and communication signals before accepting the work.'
  },
  {
    title: 'Keep scope and proof visible',
    text: 'Store revisions, approvals, milestones, and delivery evidence so extra work does not become invisible free work.'
  },
  {
    title: 'Do not let payment go quiet',
    text: 'Keep due dates and promises visible, then prepare the next professional follow-up from the same workflow.'
  }
];

const servicePaths = [
  {
    label: 'For a freelancer who needs help starting',
    title: 'Agency Setup',
    text: 'We help set up the offer, lead plan, proposal flow, workroom, invoice path, and first seven days of action.',
    fit: 'Choose this when the business workflow is unclear.',
    cta: 'Review Agency Setup',
    path: '/payments/agency-setup',
    tone: 'yellow'
  },
  {
    label: 'For a task that repeats',
    title: 'Automation Setup',
    text: 'We map and test one clear reminder, follow-up, notification, or handoff using ClientFlow AI or n8n.',
    fit: 'Choose this only when the trigger and useful result are clear.',
    cta: 'Review Automation Setup',
    path: '/payments/automation-setup',
    tone: 'cyan'
  },
  {
    label: 'For an agency or company team',
    title: 'Enterprise Setup',
    text: 'We help configure the organization workspace, roles, security controls, audit habits, and first team workrooms.',
    fit: 'Choose this when multiple people need controlled access.',
    cta: 'Review Enterprise Setup',
    path: '/payments/enterprise',
    tone: 'emerald'
  }
];

const audienceGroups = [
  ['Creative work', 'Designers, writers, editors, photographers, marketers, and branding specialists.'],
  ['Professional services', 'Consultants, coaches, trainers, virtual assistants, accountants, and operations specialists.'],
  ['Technical services', 'Developers, website builders, IT support, automation experts, and maintenance providers.'],
  ['Small teams', 'Agencies and service teams sharing sales, delivery, invoices, and client follow-up.']
];

const faqs = [
  ['Is this a job marketplace?', 'No. ClientFlow AI does not sell leads or make freelancers bid for jobs. It helps you manage clients you find directly.'],
  ['Is it only invoice software?', 'No. Invoicing is one step inside the lead, proposal, delivery, invoice, and payment workflow.'],
  ['What should a new user do first?', 'Create an account, open Client Flow, and add one real lead or invoice. You do not need to configure every feature.'],
  ['Do I need to pay before trying it?', 'No. New accounts receive 30 days of full software access. Paid setup services are optional.'],
  ['Does ClientFlow AI guarantee clients or income?', 'No. It provides structure, practical actions, and clearer follow-up. Results still depend on the user, their offer, and their client work.']
];

const structuredData = [
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
    description: 'A lead-to-payment workspace for freelancers and service teams.',
    offers: {
      '@type': 'AggregateOffer',
      url: `${SITE_URL}/payments`
    }
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

const serviceTone = {
  yellow: {
    border: 'border-yellow-300/30',
    label: 'text-yellow-200',
    button: 'bg-yellow-300 text-slate-950 hover:bg-yellow-200'
  },
  cyan: {
    border: 'border-cyan-300/30',
    label: 'text-cyan-200',
    button: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
  },
  emerald: {
    border: 'border-emerald-300/30',
    label: 'text-emerald-200',
    button: 'bg-emerald-300 text-slate-950 hover:bg-emerald-200'
  }
};

export default function HomeClear() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const user = loggedIn ? getUser() : null;
  const isPro = hasProAccess(user);
  const freeAccess = getFreeAccessState(user);

  useDocumentMeta({
    title: `${COMPANY_NAME} | Freelance client workflow`,
    description: 'Manage leads, proposals, client work, invoices, and payment follow-up in one clear freelancer workspace.',
    path: '/',
    jsonLd: structuredData
  });

  const startWorkspace = (source) => {
    const destination = loggedIn ? '/client-flow' : '/signup';
    if (!loggedIn) setPostLoginRedirect('/client-flow');
    trackCtaClick(source, 'home_clear', destination);
    navigate(destination);
  };

  const accessMessage = !loggedIn
    ? '30 days full access. No card required.'
    : isPro
      ? `${getPlanLabel(user)} is active.`
      : freeAccess.active
        ? `${freeAccess.daysLeft} day${freeAccess.daysLeft === 1 ? '' : 's'} left in your free access.`
        : 'Your free access has ended. Review plans when you are ready.';

  return (
    <div className="min-h-screen bg-[#080b11] text-white">
      <Navbar />

      <main>
        <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#080b11]">
          <img
            src="/logo-1200.png"
            alt=""
            className="pointer-events-none absolute -right-24 top-1/2 z-0 h-[min(76vw,680px)] w-[min(76vw,680px)] -translate-y-1/2 object-contain opacity-[0.16] sm:-right-16"
          />
          <div className="container-custom relative z-10 flex min-h-[min(640px,calc(100svh-8rem))] items-center py-16 sm:py-20">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase text-cyan-300">Freelance client workflow</p>
              <h1 className="mt-5 text-5xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">
                ClientFlow AI
              </h1>
              <p className="mt-6 max-w-2xl text-xl font-bold leading-relaxed text-zinc-200 sm:text-2xl">
                Keep leads, proposals, client work, invoices, and payment follow-up in one place.
              </p>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-zinc-400">
                Built for freelancers who find their own clients and want a clear next step from the first conversation to final payment.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => startWorkspace('hero_start')}
                  className="rounded-lg bg-yellow-300 px-7 py-4 text-sm font-black uppercase text-slate-950 transition hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                >
                  {loggedIn ? 'Open Client Flow' : 'Start 30 Days Free'}
                </button>
                <a
                  href="#how-it-works"
                  className="rounded-lg border border-white/15 bg-white/[0.04] px-7 py-4 text-center text-sm font-black uppercase text-white transition hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  See the workflow
                </a>
              </div>

              <p className="mt-5 text-sm font-bold text-zinc-500">{accessMessage}</p>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0d1119] py-8">
          <div className="container-custom grid gap-5 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div>
              <p className="font-black uppercase text-zinc-500">Without a system</p>
              <p className="mt-2 font-semibold leading-6 text-zinc-300">Leads in messages, scope in documents, tasks in chat, and invoices somewhere else.</p>
            </div>
            <span className="hidden text-2xl font-black text-yellow-300 md:block" aria-hidden="true">-&gt;</span>
            <div>
              <p className="font-black uppercase text-cyan-300">With ClientFlow AI</p>
              <p className="mt-2 font-semibold leading-6 text-white">One visible path with the next client and money action easy to find.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-white/10 py-16 sm:py-20">
          <div className="container-custom">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase text-yellow-300">How it works</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">One workflow from lead to payment.</h2>
              <p className="mt-4 text-base font-medium leading-7 text-zinc-400">
                Start with the step you need today. The product keeps the rest of the client journey connected.
              </p>
            </div>

            <div className="mt-10 grid gap-x-7 gap-y-8 md:grid-cols-2 xl:grid-cols-5">
              {workflowSteps.map(([step, title, text]) => (
                <div key={step} className="border-t-2 border-white/15 pt-5">
                  <p className="font-mono text-sm font-black text-yellow-300">{step}</p>
                  <h3 className="mt-3 text-lg font-black leading-snug text-white">{title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-zinc-400">{text}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => startWorkspace('workflow_start')}
              className="mt-10 rounded-lg bg-white px-6 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-zinc-200"
            >
              {loggedIn ? 'Continue your workflow' : 'Create your workspace'}
            </button>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0d1119] py-16 sm:py-20">
          <div className="container-custom grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase text-cyan-300">Your first ten minutes</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">Do one real task first.</h2>
              <p className="mt-4 text-base font-medium leading-7 text-zinc-400">
                You do not need to configure every feature. A useful account begins with one real lead, proposal, project, or invoice.
              </p>
            </div>

            <ol className="grid gap-4">
              {[
                ['Create your account', 'Your client work and free access are attached to one secure workspace.'],
                ['Open Client Flow', 'Choose the stage that matches your real work today.'],
                ['Complete one next action', 'Add the lead, send the proposal, organize delivery, or create the invoice.']
              ].map(([title, text], index) => (
                <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-white/10 pb-4 last:border-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300 text-sm font-black text-slate-950">{index + 1}</span>
                  <div>
                    <h3 className="text-lg font-black text-white">{title}</h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-zinc-400">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="freelancer-protection" className="border-b border-white/10 py-16 sm:py-20">
          <div className="container-custom">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase text-red-300">Freelancer protection</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">Protect scope, proof, and payment.</h2>
              <p className="mt-4 text-base font-medium leading-7 text-zinc-400">
                The workflow is useful before a problem becomes a dispute, not only after an invoice is overdue.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {protectionItems.map((item) => (
                <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-6">
                  <h3 className="text-xl font-black leading-snug text-white">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-zinc-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="border-b border-white/10 bg-[#0d1119] py-16 sm:py-20">
          <div className="container-custom">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase text-zinc-500">Optional paid help</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">Use the software yourself, or ask us to set up a specific part.</h2>
              <p className="mt-4 text-base font-medium leading-7 text-zinc-400">
                Start with the free software first. Choose a setup service only when you can identify the outcome you need.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {servicePaths.map((service) => {
                const tone = serviceTone[service.tone];
                return (
                  <article key={service.title} className={`flex min-h-[390px] flex-col rounded-lg border bg-black/25 p-6 ${tone.border}`}>
                    <p className={`text-xs font-black uppercase ${tone.label}`}>{service.label}</p>
                    <h3 className="mt-4 text-2xl font-black text-white">{service.title}</h3>
                    <p className="mt-4 text-sm font-medium leading-6 text-zinc-400">{service.text}</p>
                    <p className="mt-5 border-l-2 border-white/20 pl-4 text-sm font-bold leading-6 text-zinc-200">{service.fit}</p>
                    <Link to={service.path} className={`mt-auto rounded-lg px-5 py-3 text-center text-sm font-black uppercase transition ${tone.button}`}>
                      {service.cta}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="who-for" className="border-b border-white/10 py-16 sm:py-20">
          <div className="container-custom grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase text-emerald-300">Who it is for</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">Anyone selling a service directly to clients.</h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {audienceGroups.map(([title, text]) => (
                  <div key={title} className="border-t border-white/15 pt-4">
                    <h3 className="text-base font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-yellow-300/20 bg-yellow-300/[0.055] p-6 sm:p-8">
              <p className="text-xs font-black uppercase text-yellow-200">What it is not</p>
              <ul className="mt-6 grid gap-5 text-sm font-medium leading-6 text-zinc-300">
                <li><strong className="text-white">Not a job marketplace.</strong> It does not provide guaranteed gigs or client leads.</li>
                <li><strong className="text-white">Not only an invoice maker.</strong> Billing is one step in the complete client workflow.</li>
                <li><strong className="text-white">Not automatic income.</strong> It helps you execute and follow up; it cannot guarantee business results.</li>
                <li><strong className="text-white">Not fake enterprise software.</strong> Security and compliance claims are stated honestly.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0d1119] py-16 sm:py-20">
          <div className="container-custom grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-black uppercase text-cyan-300">Trust and support</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">Clear about what is real.</h2>
              <p className="mt-4 text-base font-medium leading-7 text-zinc-400">
                ClientFlow AI is operated by a Udyam-registered Indian business. Payments use configured providers, account data is protected, and support details are public.
              </p>
              <div className="mt-7 grid gap-3 text-sm font-bold text-zinc-300">
                <p>Support: <a className="text-white hover:text-cyan-200" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
                <p>Registration: <span className="text-white">{UDYAM_REGISTRATION_NUMBER}</span></p>
                <p><Link className="text-white hover:text-cyan-200" to="/security">Read security and compliance status</Link></p>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase text-zinc-500">Common questions</p>
              <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
                {faqs.map(([question, answer]) => (
                  <details key={question} className="group py-5">
                    <summary className="cursor-pointer list-none pr-8 text-base font-black text-white marker:hidden">
                      {question}
                    </summary>
                    <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-400">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container-custom flex flex-col gap-7 border-l-4 border-yellow-300 pl-6 sm:pl-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase text-yellow-300">Start with real work</p>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">Add one lead or invoice. Let the workflow show the next step.</h2>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={() => startWorkspace('final_start')}
                className="rounded-lg bg-yellow-300 px-7 py-4 text-sm font-black uppercase text-slate-950 transition hover:bg-yellow-200"
              >
                {loggedIn ? 'Open Client Flow' : 'Start 30 Days Free'}
              </button>
              <Link to="/payments" className="rounded-lg border border-white/15 px-7 py-4 text-center text-sm font-black uppercase text-white transition hover:bg-white/[0.06]">
                View plans later
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
