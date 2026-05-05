import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  COMPANY_LEGAL_DESCRIPTION,
  COMPANY_NAME,
  LEGAL_EFFECTIVE_DATE,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';

const sections = [
  {
    title: 'Business identity',
    body: `${COMPANY_LEGAL_DESCRIPTION} Udyam Registration Number: ${UDYAM_REGISTRATION_NUMBER}. This registration identifies the business as an MSME/proprietorship and does not represent a Private Limited company or LLP.`
  },
  {
    title: 'Using the service',
    body: `${COMPANY_NAME} is designed to help businesses create invoices, proposals, client records, and payment links. You are responsible for using the service lawfully and for making sure the business, client, and billing information you add is accurate.`
  },
  {
    title: 'Accounts and access',
    body: 'You are responsible for keeping your login credentials secure and for activity that happens under your account. If you believe your account has been accessed without permission, contact support as soon as possible.'
  },
  {
    title: 'Payments',
    body: 'If you use online payments, payment collection may be handled through third-party processors such as Razorpay. Those processors may apply their own terms, policies, and verification requirements.'
  },
  {
    title: 'Availability and updates',
    body: 'We work to keep the service available and useful, but we may improve, update, or change parts of the product over time. We may also suspend access in cases of misuse, fraud risk, or actions that threaten the stability of the service.'
  },
  {
    title: 'Support and contact',
    body: `For product questions, support requests, or terms-related issues, contact ${SUPPORT_EMAIL}.`
  }
];

export default function Terms() {
  useDocumentMeta(
    'Terms of Use | ClientFlow AI',
    'Read the ClientFlow AI terms covering product use, account responsibility, payments, support, and service updates.'
  );

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-10 sm:py-14 md:py-20">
        <section className="mx-auto max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Terms of Use</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
            Simple terms for using ClientFlow AI responsibly.
          </h1>
          <p className="mt-6 max-w-3xl text-base font-medium leading-relaxed text-zinc-400 md:text-lg">
            These terms summarize the basic expectations for using {COMPANY_NAME} as a billing and invoicing product.
          </p>
          <p className="mt-4 text-sm font-semibold text-zinc-500">Effective date: {LEGAL_EFFECTIVE_DATE}</p>

          <div className="mt-12 space-y-5">
            {sections.map((section) => (
              <div key={section.title} className="rounded-[2rem] border border-white/8 bg-zinc-950/70 p-5 sm:p-8">
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
