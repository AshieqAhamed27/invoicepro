import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import Navbar from '../components/Navbar';

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const features = [
    {
      title: 'Create Invoices Fast',
      desc: 'Generate clean, professional invoices in seconds.'
    },
    {
      title: 'UPI QR Payments',
      desc: 'Let clients pay instantly using UPI QR.'
    },
    {
      title: 'Track Paid & Pending',
      desc: 'Monitor revenue, overdue invoices and reminders.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">

      <Navbar />

      {/* HERO */}
      <section className="px-6 py-20 text-center max-w-6xl mx-auto">

        <img
          src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
          alt="InvoicePro Logo"
          className="w-20 h-20 mx-auto mb-6"
        />

        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          Create Invoices. <br />
          Get Paid Faster.
        </h1>

        <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
          InvoicePro helps freelancers and small businesses
          create beautiful invoices, track payments,
          send reminders, and grow revenue.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() =>
              navigate(
                loggedIn
                  ? '/dashboard'
                  : '/signup'
              )
            }
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-semibold shadow-lg"
          >
            {loggedIn
              ? 'Go to Dashboard'
              : 'Start Free'}
          </button>

          <button
            onClick={() =>
              navigate('/login')
            }
            className="border border-gray-500 hover:border-gray-300 px-8 py-4 rounded-xl font-semibold"
          >
            Login
          </button>
        </div>

      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose InvoicePro?
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl shadow-lg hover:scale-105 transition"
            >
              <h3 className="text-xl font-semibold mb-3">
                {feature.title}
              </h3>

              <p className="text-gray-400">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* UPDATED SECTION (REPLACED IMAGE SECTION) */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">
          How InvoicePro Works
        </h2>

        <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
          A simple 3-step process to create invoices, send them to clients,
          and get paid instantly using UPI.
        </p>

        <div className="grid md:grid-cols-3 gap-6">

          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl text-center shadow-lg hover:scale-105 transition">
            <div className="text-5xl mb-4">🧾</div>
            <h3 className="text-xl font-semibold mb-2">
              Create Invoice
            </h3>
            <p className="text-gray-400 text-sm">
              Generate clean, professional invoices in seconds with all details included.
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl text-center shadow-lg hover:scale-105 transition">
            <div className="text-5xl mb-4">📤</div>
            <h3 className="text-xl font-semibold mb-2">
              Send to Client
            </h3>
            <p className="text-gray-400 text-sm">
              Share invoices easily via WhatsApp or email directly from the platform.
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl text-center shadow-lg hover:scale-105 transition">
            <div className="text-5xl mb-4">💸</div>
            <h3 className="text-xl font-semibold mb-2">
              Get Paid Instantly
            </h3>
            <p className="text-gray-400 text-sm">
              Accept payments using UPI QR and track paid & pending invoices easily.
            </p>
          </div>

        </div>
      </section>

      {/* PRICING */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Simple Pricing
        </h2>

        <div className="grid md:grid-cols-2 gap-8">

          <div className="bg-gray-900/80 border border-gray-700 p-8 rounded-2xl shadow">
            <h3 className="text-2xl font-bold mb-4">
              Free
            </h3>

            <p className="text-gray-400 mb-6">
              Best for getting started.
            </p>

            <ul className="space-y-3 text-gray-300">
              <li>✔ 2 invoices free</li>
              <li>✔ PDF download</li>
              <li>✔ UPI QR support</li>
            </ul>
          </div>

          <div className="bg-yellow-500 text-black p-8 rounded-2xl shadow-xl">
            <h3 className="text-2xl font-bold mb-4">
              Pro ₹99
            </h3>

            <p className="mb-6">
              Best for freelancers.
            </p>

            <ul className="space-y-3">
              <li>✔ Unlimited invoices</li>
              <li>✔ Email reminders</li>
              <li>✔ Payment tracking</li>
              <li>✔ Priority support</li>
            </ul>
          </div>

        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Loved by Freelancers
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl shadow-lg">
            <p className="text-gray-300 leading-relaxed">
              “InvoicePro helped me create invoices quickly and made my freelance work feel professional.”
            </p>

            <p className="mt-5 font-semibold text-yellow-400">
              — Graphic Designer
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl shadow-lg">
            <p className="text-gray-300 leading-relaxed">
              “The UPI QR payment and WhatsApp reminders made getting paid much easier.”
            </p>

            <p className="mt-5 font-semibold text-yellow-400">
              — Freelancer
            </p>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 py-16">
        <h2 className="text-3xl font-bold mb-4">
          Ready to simplify invoicing?
        </h2>

        <p className="text-gray-400 mb-8">
          Start sending invoices in less than 2 minutes.
        </p>

        <button
          onClick={() =>
            navigate(
              loggedIn
                ? '/dashboard'
                : '/signup'
            )
          }
          className="bg-white text-black px-8 py-4 rounded-xl font-semibold hover:bg-gray-200"
        >
          Get Started →
        </button>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-gray-400 text-sm py-8 border-t border-gray-800">
        © {new Date().getFullYear()} InvoicePro.
        All rights reserved.
      </footer>

    </div>
  );
}