import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import useDocumentMeta from '../utils/useDocumentMeta';
import {
  COMPANY_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

const builderName = 'Ashieq Ahamed';

const quickLinks = [
  ['Try ClientFlow AI', '/', 'See the freelancer business system'],
  ['Builder Portfolio', '/portfolio', 'Learn more about the builder'],
  ['Agency Setup', '/agency', 'Done-for-you workflow setup'],
  ['Contact', `mailto:${SUPPORT_EMAIL}`, 'Share feedback or ask a question']
];

const focusAreas = [
  'Helping freelancers find clients with a clearer daily action plan.',
  'Turning client conversations into proposals, project workrooms, invoices, and payments.',
  'Building India-first SaaS workflows that can also support global clients.',
  'Learning from real user feedback and improving the product in public.'
];

const proofPoints = [
  ['Live product', 'ClientFlow AI is already deployed and usable.'],
  ['Registered business', `Udyam No: ${UDYAM_REGISTRATION_NUMBER}.`],
  ['Payment workflow', 'Razorpay, UPI, invoice links, and international payment direction.'],
  ['Product direction', 'Freelancer business system, not just invoice creation.']
];

export default function LinkedInPortfolio() {
  useDocumentMeta({
    title: `${builderName} | LinkedIn Portfolio`,
    description: `${builderName} is building ClientFlow AI, an AI-assisted freelancer business system for finding clients, managing work, creating invoices, and collecting payments.`,
    path: '/linkedin',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: `${builderName} LinkedIn Portfolio`,
      url: `${SITE_URL}/linkedin`,
      about: {
        '@type': 'Person',
        name: builderName,
        jobTitle: 'Builder of ClientFlow AI',
        email: SUPPORT_EMAIL
      }
    }
  });

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-sky-400/10 via-yellow-300/5 to-transparent" />
          <div className="container-custom relative py-12 sm:py-16 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 flex justify-center">
                <BrandLogo showText={false} markClassName="h-14 w-14" />
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">
                LinkedIn introduction
              </p>
              <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Hi, I’m {builderName}. I’m building {COMPANY_NAME}.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                ClientFlow AI helps freelancers build stable income, find clients, manage projects, create invoices, and collect payments from one simple workflow.
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                I’m currently looking for honest feedback, early users, and conversations with freelancers, developers, designers, consultants, and small agencies.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/" className="btn btn-primary px-7 py-4 text-center text-sm">
                  Try ClientFlow AI
                </Link>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-secondary px-7 py-4 text-center text-sm">
                  Send Feedback
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-zinc-950/40 py-12 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">What I am building</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                A freelancer business system for the full client journey.
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                The product is not only invoice creation. The goal is to help freelancers move from lead to proposal, project delivery, invoice, and payment collection.
              </p>
            </div>

            <div className="grid gap-3">
              {focusAreas.map((item, index) => (
                <div key={item} className="flex gap-4 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-300 text-sm font-black text-slate-950">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-relaxed text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Quick proof</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Current stage.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-4">
              {proofPoints.map(([title, detail]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5">
                  <p className="text-lg font-black text-white">{title}</p>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-400/[0.045] py-12 sm:py-16">
          <div className="container-custom">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Useful links</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                If you came from LinkedIn, start here.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {quickLinks.map(([title, href, detail]) => {
                const isMail = href.startsWith('mailto:');
                const className = 'rounded-[1.5rem] border border-white/8 bg-black/25 p-5 transition-all hover:-translate-y-1 hover:border-yellow-300/25';

                const content = (
                  <>
                    <p className="text-lg font-black text-white">{title}</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{detail}</p>
                  </>
                );

                return isMail ? (
                  <a key={title} href={href} className={className}>
                    {content}
                  </a>
                ) : (
                  <Link key={title} to={href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
