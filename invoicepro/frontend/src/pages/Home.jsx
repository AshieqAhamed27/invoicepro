import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BrandLogo from '../components/BrandLogo';

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  const handleSubscribe = (plan) => {
    localStorage.setItem("plan", plan);
    navigate("/payment");
  };

  const workflow = [
    ['01', 'Create invoice', 'Add client details, line items, tax, and due dates without wrestling a spreadsheet.'],
    ['02', 'Share payment link', 'Send a clean invoice link over email, WhatsApp, or your usual client channel.'],
    ['03', 'Track the money', 'See pending and paid invoices from one dashboard, then download the invoice when needed.']
  ];

  const features = [
    ['Fast invoices', 'Reusable business details, itemized billing, and instant totals.'],
    ['UPI-ready payments', 'Clients can scan, pay, and send proof in a familiar flow.'],
    ['Simple records', 'Know what is paid, what is pending, and what needs attention.']
  ];

  const aiFeatures = [
    ['Cashflow Copilot', 'Finds overdue invoices, scores payment risk, and tells you what to follow up on first.'],
    ['Reminder Drafts', 'Writes polite payment reminders using invoice amount, due date, and client details.'],
    ['Invoice Coach', 'Checks weak descriptions, missing due dates, missing UPI IDs, and unusual tax values before sending.']
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main>
        <section className="border-b border-white/10">
          <div className="container-custom grid min-h-[calc(100vh-76px)] items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-18">
            <div className="reveal max-w-2xl text-center lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-sm font-semibold text-yellow-200">
                Built for freelancers and small businesses
              </div>

              <h1 className="mb-6 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
                Professional invoices, paid faster.
              </h1>

              <p className="mx-auto mb-8 max-w-xl text-base text-zinc-400 sm:text-lg lg:mx-0">
                Create polished invoices, share them instantly, and collect UPI payments without adding more admin to your day.
              </p>

              <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <button
                  onClick={() => navigate(loggedIn ? '/dashboard' : '/signup')}
                  className="btn btn-primary"
                >
                  {loggedIn ? 'Go to Dashboard' : 'Start Free'}
                </button>

                <button
                  onClick={() => navigate(loggedIn ? '/create-invoice' : '/login')}
                  className="btn btn-secondary"
                >
                  {loggedIn ? 'Create Invoice' : 'Login'}
                </button>
              </div>
            </div>

            <div className="reveal reveal-delay-1 mx-auto w-full max-w-md lg:max-w-lg">
              <div className="surface overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <BrandLogo showText={false} markClassName="h-10 w-10" />
                    <div>
                      <p className="text-xs uppercase text-zinc-500">Invoice Preview</p>
                      <h2 className="text-base font-semibold">Apex Design Studio</h2>
                    </div>
                  </div>
                  <span className="badge badge-yellow">Pending</span>
                </div>

                <div className="space-y-5 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs text-zinc-500">Client</p>
                      <p className="mt-1 font-semibold text-white">John Mathew</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs text-zinc-500">Due</p>
                      <p className="mt-1 font-semibold text-white">24 Apr 2026</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <div className="grid grid-cols-[1fr_auto] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-300">
                      <span>Item</span>
                      <span>Amount</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] border-t border-white/10 px-4 py-3 text-sm">
                      <span className="text-zinc-300">Brand package</span>
                      <span className="font-semibold text-white">Rs. 5,000</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] border-t border-white/10 px-4 py-3 text-sm">
                      <span className="text-zinc-300">GST</span>
                      <span className="font-semibold text-white">Rs. 900</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-emerald-400/10 px-4 py-4">
                    <span className="text-sm font-semibold text-emerald-200">Total due</span>
                    <span className="text-2xl font-bold text-emerald-200">Rs. 5,900</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-custom py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2>How it works</h2>
            <p className="mt-2 text-zinc-400">
              A short path from billable work to payment.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workflow.map(([step, title, desc]) => (
              <div key={title} className="card hover-lift">
                <p className="mb-4 text-sm font-semibold text-yellow-300">{step}</p>
                <h3 className="mb-2 text-lg">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="container-custom py-16">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2>Everything you need</h2>
              <p className="mt-2 text-zinc-400">
                Built around the billing tasks small teams repeat every week.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(([title, desc]) => (
                <div key={title} className="card hover-lift">
                  <h3 className="mb-2 text-lg">{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-custom py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-2 text-sm font-semibold text-yellow-300">AI features</p>
            <h2>Smarter than a basic invoice maker</h2>
            <p className="mt-2 text-zinc-400">
              InvoicePro helps you notice payment problems early and send better invoices before they slow you down.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {aiFeatures.map(([title, desc], index) => (
              <div key={title} className={`card hover-lift reveal reveal-delay-${index > 1 ? 2 : index}`}>
                <p className="mb-4 text-sm font-semibold text-yellow-300">AI 0{index + 1}</p>
                <h3 className="mb-2 text-lg">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container-custom py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2>Pricing</h2>
            <p className="mt-2 text-zinc-400">
              Start small, upgrade when invoicing becomes a habit.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
            <div className="card hover-lift flex flex-col justify-between">
              <div>
                <h3 className="mb-2 text-xl">Monthly</h3>
                <p className="mb-6 text-3xl font-bold text-white">Rs. 99 <span className="text-sm font-medium text-zinc-500">/ month</span></p>

                <ul className="mb-6 space-y-3 text-sm text-zinc-400">
                  <li>Unlimited invoices</li>
                  <li>UPI payments</li>
                  <li>Basic payment tracking</li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('monthly')}
                className="btn btn-secondary w-full"
              >
                Choose Monthly
              </button>
            </div>

            <div className="card hover-lift flex flex-col justify-between border-yellow-300/35 bg-yellow-300/10">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-yellow-200">
                  Best value
                </p>

                <h3 className="mb-2 text-xl">Yearly</h3>
                <p className="mb-6 text-3xl font-bold text-white">Rs. 999 <span className="text-sm font-medium text-zinc-500">/ year</span></p>

                <ul className="mb-6 space-y-3 text-sm text-zinc-300">
                  <li>Everything in Monthly</li>
                  <li>Advanced analytics</li>
                  <li>Priority support</li>
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
