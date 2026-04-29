import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import useDocumentMeta from '../../utils/useDocumentMeta';

export default function GSTInvoiceFormatIndia() {

  useDocumentMeta(
    "GST Invoice Format India – Freelancer Guide (2026)",
    "Learn GST invoice format for freelancers in India. Includes GST fields, invoice example, and how to create invoices easily."
  );

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-16 max-w-3xl">

        <h1 className="text-4xl font-black">
          GST Invoice Format for Freelancers in India (2026)
        </h1>

        <p className="mt-4 text-zinc-400">
          If you're a freelancer in India, creating a GST-compliant invoice is important.
          This guide explains the correct invoice format and required fields.
        </p>

        <h2 className="mt-10 text-2xl font-bold">
          Required Fields in GST Invoice
        </h2>
        <p className="mt-3 text-zinc-400">
          A GST invoice must include invoice number, date, supplier details,
          GSTIN, client details, item description, tax breakdown, and total amount.
        </p>

        <h2 className="mt-10 text-2xl font-bold">
          GST Invoice Example
        </h2>
        <p className="mt-3 text-zinc-400">
          A typical invoice includes line items, CGST and SGST or IGST, and total payable amount.
        </p>

        <h2 className="mt-10 text-2xl font-bold">
          How to Create GST Invoice Easily
        </h2>
        <p className="mt-3 text-zinc-400">
          Instead of manual work, you can use tools like InvoicePro to generate GST invoices
          and send payment links instantly.
        </p>

        <h2 className="mt-10 text-2xl font-bold">
          Accept Payments via UPI or Razorpay
        </h2>
        <p className="mt-3 text-zinc-400">
          After creating invoice, share link and collect payments using UPI apps or Razorpay checkout.
        </p>

      </main>

      <Footer />
    </div>
  );
}