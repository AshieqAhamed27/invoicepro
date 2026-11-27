import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME } from '../utils/company';

const entries = [
  { date: 'August 2026', title: 'Trust and clarity update', notes: ['Public pricing is visible before signup.', 'Added the GST compliance status page and data-portability promise.', 'Added a landing-page invoice PDF layout preview.'] },
  { date: 'July 2026', title: 'Client workflow improvements', notes: ['Expanded the client-to-payment workflow.', 'Improved invoice, payment, and freelancer workspace guidance.'] }
];

export default function Changelog() {
  useDocumentMeta({ title: `${COMPANY_NAME} changelog`, description: 'Public product updates and maintenance notes from ClientFlow AI.', path: '/changelog' });

  return (
    <div className="premium-page min-h-screen text-slate-900">
      <Navbar />
      <main>
        <section className="border-b border-slate-200 bg-white py-16 sm:py-20"><div className="container-custom max-w-4xl"><p className="text-xs font-black uppercase tracking-widest text-indigo-700">Built in public</p><h1 className="mt-4 text-4xl font-black sm:text-6xl">Product changelog</h1><p className="mt-5 max-w-3xl text-base font-medium leading-7 text-slate-600">A simple record of meaningful product, trust, and maintenance updates. We will say clearly when something is live, planned, or still being tested.</p></div></section>
        <section className="py-16"><div className="container-custom max-w-4xl space-y-6">{entries.map((entry) => <article key={entry.date} className="rounded-2xl border border-slate-200 bg-slate-50 p-7"><p className="text-xs font-black uppercase tracking-widest text-slate-600">{entry.date}</p><h2 className="mt-3 text-2xl font-black">{entry.title}</h2><ul className="mt-5 grid gap-3 text-sm font-medium leading-6 text-slate-700">{entry.notes.map((note) => <li key={note}>• {note}</li>)}</ul></article>)}<div className="rounded-2xl border border-amber-200 bg-yellow-300/[0.05] p-7"><h2 className="text-xl font-black">Have feedback?</h2><p className="mt-2 text-sm text-slate-600">Tell us what would make the workflow more useful for your freelance business.</p><Link to="/contact" className="mt-5 inline-flex text-sm font-black uppercase text-amber-700 hover:text-indigo-700">Contact the team →</Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
