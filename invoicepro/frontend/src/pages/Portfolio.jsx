import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import useDocumentMeta from '../utils/useDocumentMeta';
import {
  COMPANY_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const builderName = 'Ashieq Ahamed';

const highlights = [
  ['Builder', 'Building ClientFlow AI for freelancers and small service businesses.'],
  ['India-first', 'Focused on Indian freelancers who also work with global clients.'],
  ['AI-assisted builder', 'Uses AI, product thinking, and real user feedback to ship faster.'],
  ['Registered business', `Udyam registered: ${UDYAM_REGISTRATION_NUMBER}.`]
];

const projects = [
  {
    title: 'ClientFlow AI',
    label: 'Main product',
    description: 'A freelancer business system to find clients, send proposals, manage projects, create invoices, and collect payments.',
    link: '/',
    cta: 'View product'
  },
  {
    title: 'ClientFlow AI Agency Setup',
    label: 'Service workflow',
    description: 'A done-for-you setup offer that helps freelancers create their offer, lead plan, proposal flow, workroom, invoice, and 7-day action plan.',
    link: '/agency',
    cta: 'View setup'
  },
  {
    title: 'AI Cost Optimization',
    label: 'New product direction',
    description: 'A separate SaaS idea focused on helping businesses understand AI usage, reduce tool waste, and control monthly AI costs.',
    link: '#contact',
    cta: 'Ask about it'
  }
];

const capabilities = [
  'AI SaaS product planning',
  'Freelancer workflow design',
  'Invoice and payment flow setup',
  'Razorpay and payment collection thinking',
  'Landing page and positioning',
  'User feedback and product iteration',
  'Vercel, Render, MongoDB Atlas, and Cloudinary setup',
  'AI-assisted development and testing'
];

const timeline = [
  ['Started', 'Built the first invoice and payment workflow for ClientFlow AI.'],
  ['Expanded', 'Moved from invoice-only to a full client-to-cash freelancer system.'],
  ['Registered', 'Completed Udyam registration and payment provider setup steps.'],
  ['Now', 'Improving SEO, LinkedIn outreach, agency setup, and early user onboarding.']
];

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: builderName,
    jobTitle: 'AI-assisted SaaS product builder',
    email: SUPPORT_EMAIL,
    url: `${SITE_URL}/portfolio`,
    worksFor: {
      '@type': 'Organization',
      name: COMPANY_NAME,
      url: SITE_URL
    },
    knowsAbout: [
      'AI SaaS products',
      'Freelancer workflow systems',
      'Invoice software',
      'Payment collection',
      'Client management'
    ]
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${builderName} Portfolio`,
    url: `${SITE_URL}/portfolio`,
    about: {
      '@type': 'Person',
      name: builderName
    }
  }
];

export default function Portfolio() {
  useDocumentMeta({
    title: `${builderName} | AI SaaS Builder Portfolio`,
    description: `${builderName} is building ClientFlow AI, an India-first freelancer business system for client finding, proposals, project management, invoices, and payment collection.`,
    path: '/portfolio',
    jsonLd: structuredData
  });

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-yellow-400/10 via-emerald-400/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                  Builder portfolio
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                I build AI-assisted products that help freelancers get clients and get paid.
              </h1>

              <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                I am {builderName}, the builder behind {COMPANY_NAME}. I am building practical AI business systems for freelancers, developers, designers, consultants, and small agencies.
              </p>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                My focus is simple: turn confusing freelance work into a clear workflow from lead to payment.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/" className="btn btn-primary px-7 py-4 text-center text-sm">
                  View ClientFlow AI
                </Link>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-secondary px-7 py-4 text-center text-sm">
                  Contact Me
                </a>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-5">
                <BrandLogo showText={false} markClassName="h-12 w-12" />
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  Building in public
                </span>
              </div>

              <div className="mt-6">
                <p className="text-3xl font-black text-white">{builderName}</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">
                  Product builder and AI-assisted SaaS maker based in India.
                </p>
              </div>

              <div className="mt-6 grid gap-3">
                {highlights.map(([title, detail]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-sm font-black text-white">{title}</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{detail}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/40 py-14 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Products</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                What I am building now.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {projects.map((project) => (
                <article key={project.title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-6 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{project.label}</p>
                  <h3 className="mt-4 text-2xl font-black text-white">{project.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{project.description}</p>
                  <Link to={project.link} className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10">
                    {project.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Capabilities</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                The work I can do with AI-assisted execution.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                I use AI tools, product research, user feedback, and modern web platforms to move from idea to working product faster.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {capabilities.map((capability) => (
                <div key={capability} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm font-black text-white">{capability}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-400/[0.045] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Journey</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                From invoice tool to freelancer business system.
              </h2>
            </div>

            <div className="grid gap-4">
              {timeline.map(([title, detail], index) => (
                <div key={title} className="flex gap-4 rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-yellow-300 text-sm font-black text-slate-950">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-lg font-black text-white">{title}</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-400">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-6 text-center sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Contact</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Want to discuss ClientFlow AI, AI cost optimization, or freelancer workflows?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
              Send a message and I will reply with the clearest next step.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-primary mt-7 inline-flex px-7 py-4 text-sm">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
