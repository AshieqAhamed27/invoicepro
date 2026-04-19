import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const handleSubscribe = (plan) => {
    localStorage.setItem("plan", plan);
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-black text-white">

      <Navbar />

      {/* HERO */}
      <section className="container-custom py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">

        {/* LEFT */}
        <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight mb-6">
            Invoicing made <br />
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-200 text-transparent bg-clip-text">
              simple & fast
            </span>
          </h1>

          <p className="text-gray-400 mb-8 text-base sm:text-lg">
            Create invoices, send them instantly and get paid faster
            with built-in UPI payments.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">

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

        {/* RIGHT */}
        <div className="flex justify-center">

          <div className="relative w-full max-w-sm">

            <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-20"></div>

            <div className="relative card p-6 shadow-xl">

              <p className="text-sm text-gray-400 mb-3">Invoice Preview</p>

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

        </div>

      </section>

      {/* HOW IT WORKS */}
      <section className="container-custom py-16">

        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2>How it works</h2>
          <p className="text-gray-400 mt-2">
            Simple 3-step workflow to get paid faster
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {[
            ['Create invoice', 'Add details and generate instantly'],
            ['Send to client', 'Share link or WhatsApp easily'],
            ['Get paid', 'Receive UPI payments instantly']
          ].map(([title, desc], i) => (
            <div key={i} className="card text-center">
              <p className="text-yellow-400 text-sm mb-2">
                Step {i + 1}
              </p>
              <h3 className="mb-2">{title}</h3>
              <p>{desc}</p>
            </div>
          ))}

        </div>

      </section>

      {/* FEATURES */}
      <section className="container-custom py-16">

        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2>Everything you need</h2>
          <p className="text-gray-400 mt-2">
            Built for freelancers & small businesses
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {[
            ['Fast invoices', 'Create invoices in seconds'],
            ['UPI payments', 'Accept instant payments'],
            ['Track status', 'Monitor paid & pending']
          ].map(([title, desc], i) => (
            <div key={i} className="card text-center">
              <h3 className="mb-2">{title}</h3>
              <p>{desc}</p>
            </div>
          ))}

        </div>

      </section>

      {/* PRICING */}
      <section className="container-custom py-16">

        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2>Pricing</h2>
          <p className="text-gray-400 mt-2">
            Simple and transparent pricing
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* MONTHLY */}
          <div className="card flex flex-col justify-between">

            <div>
              <h3 className="mb-2">Monthly</h3>
              <p className="text-gray-400 mb-6">₹99 / month</p>

              <ul className="space-y-2 text-sm text-gray-400 mb-6">
                <li>✔ Unlimited invoices</li>
                <li>✔ UPI payments</li>
                <li>✔ Basic tracking</li>
              </ul>
            </div>

            <button
              onClick={() => handleSubscribe('monthly')}
              className="btn btn-primary w-full"
            >
              Choose Monthly
            </button>

          </div>

          {/* YEARLY */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-yellow-400 to-yellow-600">

            <div className="bg-black rounded-2xl p-6 flex flex-col justify-between h-full">

              <div>
                <p className="text-yellow-400 text-xs mb-2 font-semibold">
                  BEST VALUE
                </p>

                <h3 className="mb-2">Yearly</h3>

                <p className="text-3xl font-bold mb-6">₹999</p>

                <ul className="space-y-2 text-sm text-gray-400 mb-6">
                  <li>✔ Everything in monthly</li>
                  <li>✔ Advanced analytics</li>
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

      <Footer />

    </div>
  );
}