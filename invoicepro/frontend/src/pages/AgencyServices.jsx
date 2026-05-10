import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import useDocumentMeta from '../utils/useDocumentMeta';
import {
  COMPANY_NAME,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const outcomes = [
  {
    title: 'Clear freelancer offer',
    text: 'We help shape one simple service offer, target client type, pricing angle, and first outreach message.'
  },
  {
    title: 'Client finding workflow',
    text: 'We set up lead sources, follow-up timing, proposal flow, and daily actions inside ClientFlow AI.'
  },
  {
    title: 'Project delivery system',
    text: 'We organize tasks, documents, client requests, GitHub/project notes, and handover flow for active work.'
  },
  {
    title: 'Invoice and payment setup',
    text: 'We prepare invoice, proposal, payment link, currency, and collection follow-up workflow.'
  }
];

const packages = [
  {
    name: 'Starter Setup',
    price: 'Rs 999',
    note: 'For freelancers starting from zero',
    features: [
      'One clear service offer',
      'Profile and positioning checklist',
      'Invoice and payment workflow setup',
      'One proposal template'
    ]
  },
  {
    name: 'Growth Setup',
    price: 'Rs 2999',
    note: 'For freelancers ready to get clients',
    features: [
      'Lead source plan and outreach messages',
      'Proposal, pricing, and objection replies',
      'Money GPS and income target setup',
      'ClientFlow AI workspace handover'
    ],
    featured: true
  },
  {
    name: 'Managed Growth',
    price: 'Rs 4999/mo',
    note: 'For ongoing weekly business support',
    features: [
      'Weekly client action plan',
      'Proposal and follow-up review',
      'Project delivery and payment checks',
      'Monthly growth report'
    ]
  }
];

const process = [
  ['01', 'Understand your service', 'We collect your skill, target client, current problem, and income goal.'],
  ['02', 'Build your system', 'We set up ClientFlow AI workflows for leads, proposals, delivery, invoices, and payments.'],
  ['03', 'Give daily actions', 'You receive simple next steps: who to message, what to offer, what to collect, and what to improve.']
];

const whoItHelps = [
  'Freelancers who know a skill but do not know how to find clients',
  'Developers and designers who need better proposals and delivery control',
  'Consultants who want retainers instead of random one-time work',
  'Small agency owners who want to bring another freelancer into bigger projects'
];

export default function AgencyServices() {
  useDocumentMeta({
    title: `${COMPANY_NAME} Agency - Done-for-you freelancer business setup`,
    description: 'ClientFlow AI Agency helps freelancers set up client finding, proposal, project delivery, invoice, and payment workflows.',
    path: '/agency'
  });

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-400/10 via-yellow-300/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                  Software plus setup service
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                ClientFlow AI Agency.
                <span className="block bg-gradient-to-r from-yellow-200 via-emerald-200 to-sky-200 bg-clip-text text-transparent">
                  We set up your freelancer business system for you.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-zinc-400 sm:text-lg">
                If a freelancer is confused about finding clients, writing proposals, managing delivery, and collecting payment, we help set up the full workflow inside ClientFlow AI.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/contact" className="btn btn-primary px-7 py-4 text-center text-sm">
                  Request Setup Help
                </Link>
                <Link to="/signup" className="btn btn-secondary px-7 py-4 text-center text-sm">
                  Try Software Free
                </Link>
              </div>

              <p className="mt-5 max-w-xl text-xs font-semibold leading-relaxed text-zinc-500">
                Honest note: we do not guarantee income. We help create the system, strategy, daily actions, and payment workflow so the freelancer can execute with clarity.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/30">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/30 p-5">
                <div className="flex items-center justify-between gap-4">
                  <BrandLogo showText={false} markClassName="h-12 w-12" />
                  <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">
                    Agency setup
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Main outcome</p>
                  <p className="mt-2 text-xl font-black leading-tight text-white">
                    A freelancer knows who to message, what to propose, how to deliver, and how to collect payment.
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  {['Offer', 'Leads', 'Proposal', 'Delivery', 'Payment'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                      <p className="text-sm font-black text-white">{item} workflow</p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">Configured inside ClientFlow AI</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/45 py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">What we do</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                A done-for-you setup service built around the product.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {outcomes.map((item) => (
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
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">How it works</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Simple enough for beginners, useful enough for serious freelancers.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                This lets you sell a real service now: setup, guidance, and workflow support. The SaaS becomes the system used to deliver that service.
              </p>
            </div>

            <div className="grid gap-4">
              {process.map(([step, title, text]) => (
                <div key={step} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">{step}</p>
                  <h3 className="mt-3 text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Service packages</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Earn from setup services while the SaaS grows.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">
                These packages can be sold through LinkedIn, WhatsApp, referrals, and direct freelancer communities.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {packages.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-[1.75rem] border p-6 transition-all hover:-translate-y-1 ${
                    plan.featured
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
                  <Link
                    to="/contact"
                    className={`mt-6 flex w-full justify-center rounded-2xl px-5 py-4 text-sm font-black transition-all active:scale-95 ${
                      plan.featured
                        ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                        : 'border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    Ask for this setup
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-400/[0.045] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Best for</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Freelancers who need clarity before they need more tools.
              </h2>
            </div>
            <div className="grid gap-3">
              {whoItHelps.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/25 p-4">
                  <p className="text-sm font-semibold leading-relaxed text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-6 text-center sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
              Udyam registered: {UDYAM_REGISTRATION_NUMBER}
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Start with the agency offer. Convert happy users into SaaS subscribers.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
              Contact: <a href={`mailto:${SUPPORT_EMAIL}`} className="font-black text-white hover:text-yellow-300">{SUPPORT_EMAIL}</a>
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/contact" className="btn btn-primary px-7 py-4 text-sm">
                Request Setup Help
              </Link>
              <Link to="/payment" className="btn btn-secondary px-7 py-4 text-sm">
                View Pro Plan
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
