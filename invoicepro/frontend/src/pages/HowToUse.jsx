import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME } from '../utils/company';

const steps = [
  ['1', 'Choose one goal', 'Start with the one thing you need today: find a lead, send a proposal, create an invoice, or follow up on payment.'],
  ['2', 'Complete the next action', 'Open the matching workspace and add one real item. Do not try to configure every feature before doing useful work.'],
  ['3', 'Come back for the next stage', 'ClientFlow AI keeps leads, proposals, delivery, invoices, and payment follow-up connected as your work progresses.']
];

const features = [
  ['Find clients', 'Client Finder, lead pipeline, and outreach tools for your direct-client work.', '/client-finder'],
  ['Win the work', 'Proposal writer, deal room, and scope tools to make the next decision clear.', '/create-invoice?type=proposal'],
  ['Deliver the work', 'Client workroom, files, tasks, and approvals in one place.', '/client-workroom'],
  ['Invoice and collect', 'GST-ready invoices, Razorpay links, and calm payment follow-up.', '/create-invoice'],
  ['Plan the business', 'Money GPS, profit tracking, and a practical growth plan.', '/money-gps'],
  ['Get a next step', 'Business Autopilot turns your existing data into one recommended action.', '/business-autopilot']
];

export default function HowToUse() {
  useDocumentMeta({ title: `How to use ${COMPANY_NAME}`, description: 'A simple step-by-step guide to ClientFlow AI features for new and returning users.', path: '/how-to-use' });
  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />
      <main>
        <section className="border-b border-white/10 bg-zinc-950/70 py-16 sm:py-20"><div className="container-custom max-w-4xl"><p className="text-xs font-black uppercase tracking-widest text-cyan-300">Start here</p><h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">Use one step at a time.</h1><p className="mt-5 max-w-3xl text-base font-medium leading-7 text-zinc-400">ClientFlow AI has many tools, but you do not need to learn all of them. Pick your current goal, complete one useful action, then return when you need the next stage.</p><Link to="/signup" className="mt-7 inline-flex rounded-lg bg-yellow-300 px-6 py-4 text-sm font-black uppercase text-slate-950 hover:bg-yellow-200">Start with one real task</Link></div></section>
        <section className="border-b border-white/10 py-16"><div className="container-custom"><h2 className="text-3xl font-black">The simple path</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{steps.map(([number, title, text]) => <article key={number} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p className="text-3xl font-black text-yellow-300">{number}</p><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-3 text-sm font-medium leading-6 text-zinc-400">{text}</p></article>)}</div></div></section>
        <section className="py-16"><div className="container-custom"><p className="text-xs font-black uppercase tracking-widest text-emerald-300">Choose your goal</p><h2 className="mt-3 text-3xl font-black">What do you want to do today?</h2><p className="mt-3 max-w-3xl text-zinc-400">Open only the tool that matches your current work. The dashboard also provides this guided choice after you sign in.</p><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(([title, text, path]) => <Link key={title} to={path} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]"><h3 className="text-xl font-black">{title}</h3><p className="mt-3 text-sm font-medium leading-6 text-zinc-400">{text}</p><p className="mt-6 text-xs font-black uppercase tracking-widest text-cyan-200">Open this step →</p></Link>)}</div></div></section>
      </main>
      <Footer />
    </div>
  );
}
