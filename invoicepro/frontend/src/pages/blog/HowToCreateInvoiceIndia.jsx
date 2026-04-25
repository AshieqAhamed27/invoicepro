import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import useDocumentMeta from '../../utils/useDocumentMeta';

export default function HowToCreateInvoiceIndia() {

  useDocumentMeta(
    "How to Create Invoice in India (2026 Guide)",
    "Learn how to create invoices in India with GST, payment links, and UPI. Step-by-step guide for freelancers and businesses."
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-16 max-w-3xl">

        <h1 className="text-4xl font-black">
          How to Create Invoice in India (2026 Guide)
        </h1>

        <p className="mt-4 text-zinc-400">
          Creating a professional invoice is important for freelancers and businesses in India.
          This guide explains how to create GST invoices and get paid faster.
        </p>

        <h2 className="mt-10 text-2xl font-bold">
          1. Add Business and Client Details
        </h2>
        <p className="mt-3 text-zinc-400">
          Include your business name, GST number, and client details clearly.
        </p>

        <h2 className="mt-10 text-2xl font-bold">
          2. Include GST and Invoice Number
        </h2>
        <p className="mt-3 text-zinc-400">
          Every invoice should have GST fields and a unique invoice number.
        </p>

        <h2 className="mt-10 text-2xl font-bold">
          3. Add Payment Options
        </h2>
        <p className="mt-3 text-zinc-400">
          Use UPI or Razorpay to collect payments easily.
        </p>

        <h2 className="mt-10 text-2xl font-bold">
          4. Use an Invoice Tool
        </h2>
        <p className="mt-3 text-zinc-400">
          Tools like InvoicePro help automate invoice creation and payment tracking.
        </p>

      </main>

      <Footer />
    </div>
  );
}