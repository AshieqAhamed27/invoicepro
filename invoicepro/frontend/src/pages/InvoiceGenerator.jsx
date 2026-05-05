import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useDocumentMeta from '../utils/useDocumentMeta';

export default function InvoiceGenerator() {

  useDocumentMeta(
    "Invoice Generator India – Create GST Invoices Online | ClientFlow AI",
    "Free invoice generator for India. Create GST invoices, send payment links, and accept UPI or Razorpay payments easily."
  );

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-16">

        {/* HERO */}
        <h1 className="text-4xl md:text-5xl font-black">
          Invoice Generator India
        </h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Create professional GST invoices online for freelancers, agencies, and businesses in India.
          Send invoice links and get paid faster using UPI or Razorpay.
        </p>

        {/* CTA */}
        <div className="mt-8">
          <Link
            to="/create-invoice"
            className="inline-block bg-yellow-400 text-black px-6 py-3 font-bold rounded-lg"
          >
            Create Invoice Now
          </Link>
        </div>

        {/* SECTION 1 */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold">
            Create GST Invoices Online
          </h2>
          <p className="mt-3 text-zinc-400 max-w-2xl">
            ClientFlow AI allows you to create GST-ready invoices with tax fields, client details,
            due dates, and payment instructions. Perfect for Indian freelancers and consultants.
          </p>
        </section>

        {/* SECTION 2 */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Accept UPI and Razorpay Payments
          </h2>
          <p className="mt-3 text-zinc-400 max-w-2xl">
            Share invoice links with your clients and collect payments using Razorpay checkout
            or UPI apps like Google Pay, PhonePe, and Paytm.
          </p>
        </section>

        {/* SECTION 3 */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">
            Built for Freelancers and Agencies
          </h2>
          <p className="mt-3 text-zinc-400 max-w-2xl">
            Whether you are a freelancer, agency, or consultant, ClientFlow AI helps you manage
            billing, recurring invoices, and payment tracking in one place.
          </p>
        </section>

      </main>

      <Footer />
    </div>
  );
}