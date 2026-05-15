import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME, SITE_URL } from '../utils/company';

const deliveryProblems = [
  ['Deployment is unclear', 'The client says yes, but the freelancer still needs to decide GitHub, hosting, environment variables, domain, SSL, and release process.'],
  ['Handover is weak', 'Many projects end with only a ZIP file or chat message. The client needs clear links, credentials, backup notes, and maintenance terms.'],
  ['Maintenance is not sold', 'Developers finish launch work but miss the chance to offer monthly updates, monitoring, backups, and small fixes.']
];

const deliveryWorkflow = [
  ['01', 'Project repo', 'Create or connect a GitHub repository, define branch rules, and keep client delivery history organized.'],
  ['02', 'Linux/VPS checklist', 'Plan Ubuntu/VPS basics: users, SSH, firewall, Nginx, app process, environment variables, and logs.'],
  ['03', 'Domain and SSL', 'Track domain DNS, HTTPS/SSL, redirect rules, production URL, and launch checklist.'],
  ['04', 'Deploy and verify', 'Record deployment platform, build command, health URL, rollback notes, and client approval proof.'],
  ['05', 'Backup and monitoring', 'Add backup plan, uptime checks, log review, database export, and emergency contact notes.'],
  ['06', 'Handover and retainer', 'Generate handover notes and convert support into a monthly maintenance offer.']
];

const toolkitCards = [
  {
    title: 'Linux Server Checklist',
    text: 'A beginner-friendly checklist for Ubuntu/VPS projects: SSH, firewall, Nginx, process manager, logs, SSL, and backups.'
  },
  {
    title: 'GitHub Delivery Notes',
    text: 'Keep repo link, branch, commit notes, release version, issue list, and final handover details connected to the client project.'
  },
  {
    title: 'Launch Proof',
    text: 'Save production URL, test checklist, screenshots, approval status, and payment milestone proof before final invoice.'
  },
  {
    title: 'Maintenance Offer',
    text: 'Turn completed website/app work into monthly support: updates, backups, uptime checks, bug fixes, and small improvements.'
  }
];

const fitList = [
  ['Useful for', 'Freelance developers, web designers who deploy websites, small agencies, SaaS builders, and technical consultants.'],
  ['Not needed for', 'Logo design, content writing, simple social media work, or freelancers who never deliver websites/apps.'],
  ['Positioning', 'ClientFlow AI remains a freelancer business system. DevOps Delivery Kit is an optional workflow for technical client projects.']
];

const handoverItems = [
  'Production URL and admin/login access notes',
  'GitHub repository and release summary',
  'Server, deployment, and environment variable notes',
  'Domain, SSL, DNS, and backup checklist',
  'Client approval proof and final invoice link',
  'Monthly maintenance offer and support boundary'
];

export default function DevOpsDelivery() {
  useDocumentMeta({
    title: `DevOps Delivery Kit for Freelance Developers | ${COMPANY_NAME}`,
    description: 'ClientFlow AI DevOps Delivery Kit helps freelance developers manage GitHub, Linux/VPS setup, deployments, SSL, backups, handover, and maintenance offers.',
    path: '/devops-delivery',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'DevOps Delivery Kit',
      serviceType: 'Linux, VPS, GitHub, deployment, and client handover workflow for freelancers',
      provider: {
        '@type': 'Organization',
        name: COMPANY_NAME,
        url: SITE_URL
      },
      audience: {
        '@type': 'Audience',
        audienceType: 'Freelance developers and small agencies'
      },
      areaServed: ['India', 'Worldwide'],
      url: `${SITE_URL}/devops-delivery`,
      description: 'Optional developer workflow for GitHub project delivery, Linux/VPS deployment checklists, SSL, backups, handover, and maintenance retainers.'
    }
  });

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sky-400/10 via-emerald-400/5 to-transparent" />
          <div className="container-custom responsive-split-even relative py-14 sm:py-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-sky-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">
                  Optional developer workflow
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Linux-powered project delivery for freelance developers.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-semibold leading-relaxed text-zinc-300 sm:text-lg">
                ClientFlow AI stays focused on getting clients and getting paid. This DevOps Delivery Kit is an extra workflow for technical freelancers who deliver websites, apps, servers, GitHub repos, VPS setups, and maintenance.
              </p>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-500">
                Use it after a client says yes: plan the repo, deploy safely, document the server, hand over professionally, and offer monthly maintenance.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="btn btn-primary px-7 py-4 text-center text-sm">
                  Start Free
                </Link>
                <Link to="/developers" className="btn btn-secondary px-7 py-4 text-center text-sm">
                  For Developers
                </Link>
                <Link to="/agency?workflow=devops#agency-booking" className="btn btn-dark px-7 py-4 text-center text-sm">
                  Get Setup Help
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30 sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-5">
                <BrandLogo showText={false} markClassName="h-12 w-12" />
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  DevOps Kit
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {['GitHub repo ready', 'Ubuntu/VPS checklist', 'SSL and domain proof', 'Backup and handover notes'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                    <p className="text-sm font-black text-white">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-sky-400/[0.035] py-14 sm:py-16">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">Why this exists</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                It helps technical freelancers deliver like a professional company.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                Many developers can build the project, but lose trust during deployment, documentation, handover, and maintenance. This workflow fixes that gap.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {deliveryProblems.map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-6 transition-all hover:-translate-y-1 hover:border-sky-300/25">
                  <h3 className="text-xl font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-custom">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Developer delivery workflow</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                From approved project to launch, handover, and maintenance.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {deliveryWorkflow.map(([step, title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-emerald-300/25">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300 text-sm font-black text-slate-950">
                    {step}
                  </span>
                  <h3 className="mt-5 text-lg font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-yellow-400/[0.035] py-14 sm:py-16">
          <div className="container-custom responsive-heading-grid">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">What users get</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                A practical delivery checklist, not confusing server theory.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
                This is not for every freelancer. It is for developers and agencies who need to show clients a clean, reliable launch and handover process.
              </p>
            </div>

            <div className="grid gap-4">
              {toolkitCards.map((card) => (
                <div key={card.title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                  <h3 className="text-base font-black text-white">{card.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 py-14 sm:py-16">
          <div className="container-custom grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Who it is for</p>
              <div className="mt-5 grid gap-4">
                {fitList.map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <h3 className="text-sm font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/[0.06] p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Handover checklist</p>
              <h2 className="mt-3 text-2xl font-black text-white">What the freelancer can prepare for the client</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {handoverItems.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm font-semibold leading-relaxed text-zinc-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-black/25 py-14 sm:py-16">
          <div className="container-custom rounded-[2rem] border border-sky-300/20 bg-sky-300/[0.06] p-6 text-center sm:p-10">
            <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Add technical delivery to your client workflow.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              Use ClientFlow AI for the business flow, then use DevOps Delivery Kit when the project needs GitHub, Linux/VPS, domain, SSL, backup, handover, and maintenance.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/signup" className="btn btn-primary px-7 py-4 text-sm">
                Create Free Account
              </Link>
              <Link to="/client-workroom" className="btn btn-secondary px-7 py-4 text-sm">
                Open Workroom
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
