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
    title: 'Digital product delivery',
    body: `${COMPANY_NAME} is a cloud-based software product. There is no physical shipping. Access is delivered digitally through your ClientFlow AI account after signup or successful subscription activation.`
  },
  {
    title: 'Delivery timeline',
    body: 'Free account access is generally available immediately after registration. Paid plan access is generally activated after successful payment verification from the payment provider.'
  },
  {
    title: 'What users receive',
    body: 'Users receive access to software features such as invoice creation, public invoice links, client records, payment tracking, PDF invoice generation, WhatsApp sharing, recurring billing tools, and AI billing assistance depending on the selected plan.'
  },
  {
    title: 'Failed activation',
    body: 'If payment succeeds but premium access is not visible in your account, contact support with your account email and payment details so the issue can be reviewed.'
  },
  {
    title: 'Business identity',
    body: `${COMPANY_LEGAL_DESCRIPTION} Udyam Registration Number: ${UDYAM_REGISTRATION_NUMBER}.`
  },
  {
    title: 'Support',
    body: `For delivery or account activation help, email ${SUPPORT_EMAIL}.`
  }
];

export default function DigitalDeliveryPolicy() {
  useDocumentMeta(
    'Digital Delivery Policy | ClientFlow AI',
    'ClientFlow AI is delivered digitally as cloud-based invoice and billing software. Read activation timelines and support details.',
    { path: '/shipping-policy' }
  );

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-10 sm:py-14 md:py-20">
        <section className="mx-auto max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">
            Digital Delivery Policy
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
            ClientFlow AI is delivered online, not shipped physically.
          </h1>
          <p className="mt-6 max-w-3xl text-base font-medium leading-relaxed text-zinc-400 md:text-lg">
            This page explains how software access is delivered for ClientFlow AI users and paid subscribers.
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
