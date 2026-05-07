import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const proBenefits = [
  'AI client finder and lead pipeline',
  'AI sales agent and outbound autopilot',
  'AI proposal writer and deal closure room',
  'Recurring revenue tools and advanced automation'
];

export default function ProFeatureGate({
  title = 'This is a Pro feature',
  description = 'Upgrade to unlock the growth and automation tools that help you find clients, close deals, and collect payment faster.'
}) {
  const location = useLocation();
  const redirectPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />
      <main className="container-custom flex min-h-[calc(100vh-5rem)] items-center py-10 sm:py-16">
        <section className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
          <div className="premium-panel p-6 sm:p-10">
            <div className="mb-5 inline-flex rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">Pro Only</span>
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-zinc-400">
              {description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/payment"
                state={{ from: redirectPath }}
                className="btn btn-primary px-8 py-4 text-base font-black"
              >
                Upgrade Pro
              </Link>
              <Link
                to="/dashboard"
                className="btn btn-secondary px-8 py-4 text-base font-black"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          <aside className="premium-panel p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">What unlocks after payment</p>
            <div className="mt-6 grid gap-4">
              {proBenefits.map((benefit) => (
                <div key={benefit} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-300" />
                  <p className="text-sm font-semibold leading-relaxed text-zinc-300">{benefit}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs font-semibold leading-relaxed text-zinc-500">
              Free users can still use the basic dashboard and limited invoice creation. Pro unlocks the tools designed to help users earn more, not just create documents.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}
