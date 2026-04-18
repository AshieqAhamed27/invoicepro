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
      title: 'Track Payments',
      desc: 'Monitor paid, pending and overdue invoices easily.'
    }
  ];

  const handleSubscribe = (plan) => {
    localStorage.setItem("plan", plan);
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">

        <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
          Invoicing made <br />
          <span className="text-yellow-400">simple & fast</span>
        </h1>

        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
          Create invoices, send them instantly, and get paid via UPI.
          Built for freelancers and small businesses.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() =>
              navigate(loggedIn ? '/dashboard' : '/signup')
            }
            className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-semibold"
          >
            {loggedIn ? 'Go to Dashboard' : 'Start Free'}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="border border-gray-600 px-6 py-3 rounded-xl"
          >
            Login
          </button>
        </div>

      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-900/50 border-y border-gray-800 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            How it works
          </h2>

          <p className="text-gray-400 text-center mb-12">
            Just 3 simple steps to get paid
          </p>

          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-black border border-gray-800 p-6 rounded-2xl">
              <p className="text-yellow-400 mb-2">Step 1</p>
              <h3 className="text-lg font-semibold mb-2">
                Create invoice
              </h3>
              <p className="text-gray-400 text-sm">
                Add client details and generate invoices instantly.
              </p>
            </div>

            <div className="bg-black border border-gray-800 p-6 rounded-2xl">
              <p className="text-yellow-400 mb-2">Step 2</p>
              <h3 className="text-lg font-semibold mb-2">
                Send to client
              </h3>
              <p className="text-gray-400 text-sm">
                Share via link, WhatsApp or email easily.
              </p>
            </div>

            <div className="bg-black border border-gray-800 p-6 rounded-2xl">
              <p className="text-yellow-400 mb-2">Step 3</p>
              <h3 className="text-lg font-semibold mb-2">
                Get paid
              </h3>
              <p className="text-gray-400 text-sm">
                Accept UPI payments and track status.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
          Everything you need
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">
                {f.title}
              </h3>
              <p className="text-gray-400 text-sm">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

      </section>

      {/* PRICING */}
      <section className="bg-gray-900/50 border-t border-gray-800 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Pricing
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {/* MONTHLY */}
            <div className="bg-black border border-gray-800 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">Monthly</h3>
              <p className="text-gray-400 mb-4">₹99 / month</p>

              <ul className="text-sm text-gray-400 space-y-2 mb-6">
                <li>✔ Unlimited invoices</li>
                <li>✔ Payment tracking</li>
                <li>✔ WhatsApp reminders</li>
              </ul>

              <button
                onClick={() => handleSubscribe('monthly')}
                className="w-full bg-yellow-500 text-black py-3 rounded-xl"
              >
                Choose Monthly
              </button>
            </div>

            {/* YEARLY */}
            <div className="bg-yellow-500 text-black p-6 rounded-2xl">
              <p className="text-xs font-semibold mb-2">BEST VALUE</p>
              <h3 className="text-lg font-semibold mb-2">Yearly</h3>
              <p className="mb-4">₹999 / year</p>

              <ul className="text-sm space-y-2 mb-6">
                <li>✔ Everything included</li>
                <li>✔ Save ₹189</li>
              </ul>

              <button
                onClick={() => handleSubscribe('yearly')}
                className="w-full bg-black text-white py-3 rounded-xl"
              >
                Choose Yearly
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-gray-500 text-sm py-8">
        © {new Date().getFullYear()} InvoicePro
      </footer>

    </div>
  );
}