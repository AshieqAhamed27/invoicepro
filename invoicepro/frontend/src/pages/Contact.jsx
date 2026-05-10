import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  COMPANY_LEGAL_DESCRIPTION,
  COMPANY_LOCATION,
  COMPANY_NAME,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';

const contactTopics = [
  'Agency setup help for your freelancer offer and client workflow',
  'Getting started with your ClientFlow AI workspace',
  'Questions about invoices, payment links, or client payments',
  'General product feedback and support requests'
];

export default function Contact() {
  useDocumentMeta(
    'Contact | ClientFlow AI',
    'Contact ClientFlow AI for setup help, billing questions, and support related to invoices or client payments.'
  );

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-10 sm:py-14 md:py-20">
        <section className="responsive-heading-grid">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Contact</p>
            <h1 className="mt-4 max-w-[11ch] break-words text-[2.5rem] font-black tracking-tight leading-[0.97] text-white sm:max-w-none sm:text-5xl md:text-6xl">
              Reach a real person when you need help with billing.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-zinc-400 md:text-lg">
              {COMPANY_NAME} is built for freelancers, consultants, and agencies that want a cleaner system for clients, projects, proposals, invoices, and payments.
              For paid setup help, use the agency booking flow.
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
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Business registration</p>
                <p className="mt-3 text-xl font-black text-white">{COMPANY_LOCATION}</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">
                  {COMPANY_LEGAL_DESCRIPTION}
                </p>
                <p className="mt-3 break-all text-xs font-black uppercase tracking-widest text-yellow-300">
                  Udyam No: {UDYAM_REGISTRATION_NUMBER}
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
              href={`mailto:${SUPPORT_EMAIL}?subject=ClientFlow AI%20Support`}
              className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 text-sm font-black text-black transition-all hover:scale-[1.02] active:scale-95"
            >
              Email Support
            </a>
            <Link
              to="/agency#agency-booking"
              className="ml-0 mt-3 inline-flex rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-6 py-4 text-sm font-black text-yellow-200 transition-all hover:scale-[1.02] active:scale-95 sm:ml-3"
            >
              Book Agency Setup
            </Link>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}
