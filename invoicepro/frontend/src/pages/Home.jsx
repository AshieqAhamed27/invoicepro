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

  // ✅ NEW FUNCTION
  const handleSubscribe = (plan) => {
    localStorage.setItem("plan", plan);
    navigate("/payment");
  };

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
                loggedIn ? '/dashboard' : '/signup'
              )
            }
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-semibold shadow-lg"
          >
            {loggedIn ? 'Go to Dashboard' : 'Start Free'}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="border border-gray-500 hover:border-gray-300 px-8 py-4 rounded-xl font-semibold"
          >
            Login
          </button>
        </div>

      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

        <h2 className="text-3xl font-bold text-center mb-4">
          How InvoicePro Works
        </h2>

        <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
          A simple 3-step process to create invoices, send them to clients,
          and get paid instantly using UPI.
        </p>

        <div className="grid md:grid-cols-3 gap-6">

          {/* STEP 1 */}
          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl text-center shadow-lg">

            <div className="text-4xl mb-4">🧾</div>

            <h3 className="text-xl font-semibold mb-2">
              Create Invoice
            </h3>

            <p className="text-gray-400 text-sm">
              Generate clean, professional invoices in seconds
              with all details included.
            </p>

          </div>

          {/* STEP 2 */}
          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl text-center shadow-lg">

            <div className="text-4xl mb-4">📤</div>

            <h3 className="text-xl font-semibold mb-2">
              Send to Client
            </h3>

            <p className="text-gray-400 text-sm">
              Share invoices easily via WhatsApp or email
              directly from the platform.
            </p>

          </div>

          {/* STEP 3 */}
          <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl text-center shadow-lg">

            <div className="text-4xl mb-4">💸</div>

            <h3 className="text-xl font-semibold mb-2">
              Get Paid Instantly
            </h3>

            <p className="text-gray-400 text-sm">
              Accept payments using UPI QR and track paid
              & pending invoices easily.
            </p>

          </div>

        </div>

      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose InvoicePro?
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl shadow-lg">
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

      {/* 🚀 NEW PRICING */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Simple Pricing
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          {/* MONTHLY */}
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl text-center">
            <h3 className="text-xl font-bold mb-2">
              Monthly Plan
            </h3>

            <p className="text-gray-400 mb-4">
              Flexible billing
            </p>

            <h2 className="text-3xl font-bold mb-6">
              ₹99 / month
            </h2>

            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>✔ Unlimited invoices</li>
              <li>✔ UPI payments</li>
              <li>✔ Payment tracking</li>
              <li>✔ WhatsApp reminders</li>
            </ul>

            <button
              onClick={() => handleSubscribe('monthly')}
              className="w-full bg-yellow-500 text-black py-3 rounded-xl font-semibold"
            >
              Choose Monthly
            </button>
          </div>

          {/* YEARLY */}
          <div className="bg-yellow-500 text-black p-6 rounded-2xl text-center shadow-xl">
            <p className="text-xs font-semibold mb-2">
              BEST VALUE
            </p>

            <h3 className="text-xl font-bold mb-2">
              Yearly Plan
            </h3>

            <p className="mb-4">
              Save more
            </p>

            <h2 className="text-3xl font-bold mb-6">
              ₹999 / year
            </h2>

            <ul className="text-sm space-y-2 mb-6">
              <li>✔ Everything in Monthly</li>
              <li>✔ Save ₹189</li>
            </ul>

            <button
              onClick={() => handleSubscribe('yearly')}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold"
            >
              Choose Yearly
            </button>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-gray-400 text-sm py-8 border-t border-gray-800">
        © {new Date().getFullYear()} InvoicePro.
      </footer>

    </div>
  );
}