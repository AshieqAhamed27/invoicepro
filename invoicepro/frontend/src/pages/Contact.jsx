import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { COMPANY_LOCATION, COMPANY_NAME, SUPPORT_EMAIL } from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';

const contactTopics = [
  'Getting started with your workspace',
  'Questions about billing flows or recurring invoices',
  'Help with public invoice links or client payments',
  'General product feedback and support requests'
];

export default function Contact() {
  useDocumentMeta(
    'Contact | InvoicePro',
    'Contact InvoicePro for setup help, billing questions, and support related to invoices or client payments.'
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-10 sm:py-14 md:py-20">
        <section className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Contact</p>
            <h1 className="mt-4 max-w-[11ch] break-words text-[2.5rem] font-black tracking-tight leading-[0.97] text-white sm:max-w-none sm:text-5xl md:text-6xl">
              Reach a real person when you need help with billing.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-zinc-400 md:text-lg">
              {COMPANY_NAME} is built for freelancers, consultants, and agencies that want a cleaner invoicing workflow.
              The fastest way to contact us is email.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-5 sm:p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Support email</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 block break-all text-lg font-black text-white hover:text-yellow-300 sm:text-xl sm:break-normal">
                  {SUPPORT_EMAIL}
                </a>
                <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">
                  Best for setup help, product questions, and issues related to invoices or payments.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-5 sm:p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Location</p>
                <p className="mt-3 text-xl font-black text-white">{COMPANY_LOCATION}</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">
                  Support is handled from India. We aim to respond on business days as quickly as possible.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/8 bg-zinc-950 p-6 sm:rounded-[2.5rem] sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">What to include</p>
            <h2 className="mt-4 max-w-[12ch] break-words text-2xl font-black text-white sm:max-w-none sm:text-3xl">Make your support request easier to solve</h2>

            <div className="mt-8 space-y-4">
              {contactTopics.map((topic) => (
                <div key={topic} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <p className="text-sm font-medium leading-relaxed text-zinc-300">{topic}</p>
                </div>
              ))}
            </div>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=InvoicePro%20Support`}
              className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 text-sm font-black text-black transition-all hover:scale-[1.02] active:scale-95"
            >
              Email Support
            </a>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}
