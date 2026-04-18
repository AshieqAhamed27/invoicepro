import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import Navbar from '../components/Navbar';

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const handleSubscribe = (plan) => {
    localStorage.setItem("plan", plan);
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">

      <Navbar />

      {/* HERO */}
      <section className="container-custom py-12 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

        {/* LEFT */}
        <div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight mb-5">
            Invoicing made <br />
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-200 text-transparent bg-clip-text">
              simple & fast
            </span>
          </h1>

          <p className="text-gray-400 mb-6 max-w-md">
            Create invoices, send them instantly and get paid faster
            with built-in UPI payments.
          </p>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() =>
                navigate(loggedIn ? '/dashboard' : '/signup')
              }
              className="btn btn-primary"
            >
              {loggedIn ? 'Go to Dashboard' : 'Start Free'}
            </button>

            <button
              onClick={() => navigate('/login')}
              className="btn btn-secondary"
            >
              Login
            </button>
          </div>

        </div>

        {/* RIGHT VISUAL */}
        <div className="relative flex justify-center">

          <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-20"></div>

          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl w-full max-w-sm">

            <p className="text-sm text-gray-400 mb-2">Invoice Preview</p>

            <div className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span>Client</span>
                <span className="text-gray-300">John</span>
              </p>
              <p className="flex justify-between">
                <span>Amount</span>
                <span className="text-green-400">₹5,000</span>
              </p>
              <p className="flex justify-between">
                <span>Status</span>
                <span className="text-yellow-400">Pending</span>
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* HOW IT WORKS */}
      <section className="section container-custom">

        <h2 className="text-center mb-8 sm:mb-12">
          How it works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">

          {[
            ['Create invoice', 'Add details and generate instantly'],
            ['Send to client', 'Share link or WhatsApp easily'],
            ['Get paid', 'Receive UPI payments instantly']
          ].map(([title, desc], i) => (
            <div key={i} className="card card-hover">
              <p className="text-yellow-400 text-sm mb-2">
                Step {i + 1}
              </p>
              <h3 className="mb-2">{title}</h3>
              <p className="text-sm text-gray-400">{desc}</p>
            </div>
          ))}

        </div>

      </section>

      {/* FEATURES */}
      <section className="section container-custom">

        <h2 className="text-center mb-8 sm:mb-12">
          Everything you need
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">

          {[
            ['Fast invoices', 'Create invoices in seconds'],
            ['UPI payments', 'Accept instant payments'],
            ['Track status', 'Monitor paid & pending']
          ].map(([title, desc], i) => (
            <div key={i} className="card card-hover">
              <h3 className="mb-2">{title}</h3>
              <p className="text-sm text-gray-400">{desc}</p>
            </div>
          ))}

        </div>

      </section>

      {/* PRICING */}
      <section className="section container-custom">

        <h2 className="text-center mb-8 sm:mb-12">
          Pricing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* MONTHLY */}
          <div className="card h-full flex flex-col justify-between">

            <div>
              <h3 className="text-lg font-semibold mb-2">
                Monthly
              </h3>

              <p className="text-gray-400 mb-4">
                ₹99 / month
              </p>

              <ul className="text-sm text-gray-400 space-y-2 mb-6">
                <li>✔ Unlimited invoices</li>
                <li>✔ UPI payments</li>
                <li>✔ Basic tracking</li>
                <li>✔ WhatsApp reminders</li>
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe('monthly')}
              className="btn btn-primary w-full"
            >
              Choose Plan
            </button>

          </div>

          {/* YEARLY */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-yellow-400 to-yellow-600">

            <div className="bg-black rounded-2xl p-5 sm:p-6 h-full flex flex-col justify-between">

              <div>
                <p className="text-xs text-yellow-400 mb-2 font-semibold">
                  BEST VALUE
                </p>

                <h3 className="text-lg font-semibold mb-2">
                  Yearly Plan
                </h3>

                <p className="text-3xl font-bold text-white mb-4">
                  ₹999
                </p>

                <ul className="text-sm text-gray-400 space-y-2 mb-6">
                  <li>✔ Everything in monthly</li>
                  <li>✔ Advanced analytics</li>
                  <li>✔ Custom branding</li>
                  <li>✔ Priority support</li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('yearly')}
                className="btn btn-primary w-full"
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