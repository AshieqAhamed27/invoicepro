import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { COMPANY_NAME, LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';

const sections = [
  {
    title: 'Information we collect',
    body: `${COMPANY_NAME} collects the information you provide when you create an account, set up your business profile, add clients, create invoices or proposals, and contact support. This can include your name, email address, company details, client billing information, invoice line items, and payment-related events that are required to operate the product.`
  },
  {
    title: 'How we use product data',
    body: 'We use this information to deliver the service, generate invoices and public invoice links, process product access, respond to support requests, improve the product experience, and protect the platform from misuse.'
  },
  {
    title: 'Payments and third parties',
    body: 'When online payments are enabled, payment processing may be handled by third-party providers such as Razorpay. We may also rely on infrastructure, email, and hosting providers to run the product. These providers only receive the information needed for their part of the service.'
  },
  {
    title: 'Your control over account data',
    body: 'You can update your account details, business profile, and invoice content from within the product. If you need help with account access or a support request related to your data, contact us directly.'
  },
  {
    title: 'Contact',
    body: `For privacy questions or account-related requests, email ${SUPPORT_EMAIL}.`
  }
];

export default function Privacy() {
  useDocumentMeta(
    'Privacy Policy | InvoicePro',
    'Read the InvoicePro privacy policy for account data, client records, invoices, support interactions, and payment-related information.'
  );

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-14 md:py-20">
        <section className="mx-auto max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Privacy Policy</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight text-white md:text-6xl">
            Plain-language privacy information for InvoicePro.
          </h1>
          <p className="mt-6 max-w-3xl text-base font-medium leading-relaxed text-zinc-400 md:text-lg">
            This page explains, at a high level, how {COMPANY_NAME} handles product data for accounts, clients,
            invoices, and support interactions.
          </p>
          <p className="mt-4 text-sm font-semibold text-zinc-500">Effective date: {LEGAL_EFFECTIVE_DATE}</p>

          <div className="mt-12 space-y-5">
            {sections.map((section) => (
              <div key={section.title} className="rounded-[2rem] border border-white/8 bg-zinc-950/70 p-7 sm:p-8">
                <h2 className="text-2xl font-black text-white">{section.title}</h2>
                <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">{section.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
