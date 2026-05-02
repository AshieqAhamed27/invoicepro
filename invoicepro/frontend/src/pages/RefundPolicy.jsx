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
    body: `${COMPANY_LEGAL_DESCRIPTION} Udyam Registration Number: ${UDYAM_REGISTRATION_NUMBER}.`
  },
  {
    title: 'Subscription payments',
    body: `${COMPANY_NAME} offers software access for invoice creation, billing management, payment tracking, and related productivity features. Paid plans are charged through supported payment providers before premium access is activated.`
  },
  {
    title: 'Cancellation',
    body: 'You may stop using the service at any time. If subscription management is available through the product or payment provider, cancellation will apply from the next billing period unless otherwise stated during checkout.'
  },
  {
    title: 'Refund requests',
    body: 'Refunds may be reviewed for duplicate payments, accidental payments, failed service activation after successful payment, or other genuine billing issues. Refunds are not normally provided for a used billing period after premium access has been activated.'
  },
  {
    title: 'Processing time',
    body: 'Approved refunds are processed through the original payment method where possible. Bank or payment-provider timelines may vary after the refund is initiated.'
  },
  {
    title: 'Contact for billing issues',
    body: `For cancellation or refund support, email ${SUPPORT_EMAIL} with your account email, payment date, amount, and a short description of the issue.`
  }
];

export default function RefundPolicy() {
  useDocumentMeta(
    'Cancellation & Refund Policy | InvoicePro',
    'Read the InvoicePro cancellation and refund policy for subscription payments, billing issues, and support contact details.',
    { path: '/refund-policy' }
  );

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-10 sm:py-14 md:py-20">
        <section className="mx-auto max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">
            Cancellation & Refund Policy
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
            Clear refund rules for InvoicePro subscriptions.
          </h1>
          <p className="mt-6 max-w-3xl text-base font-medium leading-relaxed text-zinc-400 md:text-lg">
            This policy explains how cancellation and refund requests are handled for paid InvoicePro software access.
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
