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
  title = 'This feature needs active access',
  description = 'New users get 30 days of full access after signup. After that window ends, choose a paid software plan to keep these workflow tools active.'
}) {
  const location = useLocation();
  const redirectPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;

  return (
    <div className="premium-page min-h-screen text-slate-900">
      <Navbar />
      <main className="container-custom flex min-h-[calc(100vh-5rem)] items-center py-10 sm:py-16">
        <section className="mx-auto grid w-full max-w-5xl gap-8">
          <div className="premium-panel p-6 sm:p-10">
            <div className="mb-5 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">30-Day Free Access</span>
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-600">
              {description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/payments"
                state={{ from: redirectPath }}
                className="btn btn-primary px-8 py-4 text-base font-black"
              >
                View Plans
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
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">What unlocks after login</p>
            <div className="mt-6 grid gap-4">
              {proBenefits.map((benefit) => (
                <div key={benefit} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-300" />
                  <p className="text-sm font-semibold leading-relaxed text-slate-700">{benefit}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs font-semibold leading-relaxed text-slate-600">
              Software access is free for 30 days after signup. Paid setup services remain optional for users who want hands-on help.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}
