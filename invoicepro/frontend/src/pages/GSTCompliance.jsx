import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME } from '../utils/company';

const currentSupport = [
  ['GST-ready invoices', 'Add GSTIN, HSN/SAC codes, line items, and CGST/SGST/IGST amounts to your invoice.'],
  ['PDF invoice output', 'Create a clear invoice PDF with business, client, tax, total, and payment details.'],
  ['Payment workflow', 'Use Razorpay payment links and keep invoices and payment follow-up connected.']
];

const roadmap = [
  ['IRN and e-invoicing', 'IRN generation and direct e-invoice submission are not available today. They are planned before being described as supported.'],
  ['HSN code auto-suggestion', 'HSN/SAC codes can be entered today. Smart code suggestions are on the product roadmap.'],
  ['GSTR export compatibility', 'A GSTR-friendly export is planned. Until it is released, verify your final filing data with your accountant or GST practitioner.']
];

export default function GSTCompliance() {
  useDocumentMeta({ title: `${COMPANY_NAME} GST compliance status`, description: 'A clear summary of ClientFlow AI GST invoice support and planned e-invoicing, HSN suggestions, and GSTR exports.', path: '/gst-compliance' });

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />
      <main>
        <section className="border-b border-white/10 bg-zinc-950/70 py-16 sm:py-20"><div className="container-custom max-w-4xl"><p className="text-xs font-black uppercase tracking-widest text-yellow-300">GST compliance status</p><h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">Clear about what works today and what is next.</h1><p className="mt-5 max-w-3xl text-base font-medium leading-7 text-zinc-400">Tax compliance is too important for vague promises. This page separates current invoice capabilities from the work still on the roadmap.</p></div></section>
        <section className="border-b border-white/10 py-16"><div className="container-custom"><h2 className="text-3xl font-black">Available today</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{currentSupport.map(([title, text]) => <article key={title} className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-6"><h3 className="text-lg font-black text-emerald-100">{title}</h3><p className="mt-3 text-sm font-medium leading-6 text-zinc-300">{text}</p></article>)}</div></div></section>
        <section className="border-b border-white/10 bg-[#0d1119] py-16"><div className="container-custom"><h2 className="text-3xl font-black">Roadmap and compatibility</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{roadmap.map(([title, text]) => <article key={title} className="rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.05] p-6"><p className="text-xs font-black uppercase tracking-widest text-yellow-200">Planned</p><h3 className="mt-3 text-lg font-black text-white">{title}</h3><p className="mt-3 text-sm font-medium leading-6 text-zinc-300">{text}</p></article>)}</div><p className="mt-8 text-sm leading-6 text-zinc-500">ClientFlow AI does not provide tax, accounting, or legal advice. Always confirm filing requirements with a qualified professional.</p></div></section>
        <section className="py-16"><div className="container-custom flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-3xl font-black">See plans before you sign up.</h2><p className="mt-3 text-zinc-400">No hidden plan changes: pricing is public and the product roadmap is visible.</p></div><Link to="/payments" className="rounded-lg bg-yellow-300 px-6 py-4 text-center text-sm font-black uppercase text-slate-950 hover:bg-yellow-200">View pricing</Link></div></section>
      </main>
      <Footer />
    </div>
  );
}
