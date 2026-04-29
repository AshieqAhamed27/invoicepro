import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { isLoggedIn } from '../utils/auth';

export default function NotFound() {
  const loggedIn = isLoggedIn();

  const primaryHref = loggedIn ? '/dashboard' : '/';
  const primaryLabel = loggedIn ? 'Back to Dashboard' : 'Back Home';
  const secondaryHref = loggedIn ? '/create-invoice' : '/login';
  const secondaryLabel = loggedIn ? 'Create Invoice' : 'Sign In';

  return (
    <div className="premium-page min-h-screen text-white selection:bg-yellow-400 selection:text-black">
      <Navbar />

      <main className="container-custom py-20 md:py-28">
        <section className="premium-panel relative overflow-hidden p-10 sm:p-14">
          <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-yellow-400/10 blur-[140px]" />
          <div className="absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-[160px]" />

          <div className="relative max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-600">
              Error 404
            </p>

            <h1 className="mt-5 text-5xl sm:text-6xl font-black tracking-tight leading-[0.95] text-white">
              Lost in the ledger.
            </h1>

            <p className="mt-6 text-zinc-500 font-medium leading-relaxed">
              This page does not exist or has moved. Use the shortcuts below to get back on track.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to={primaryHref}
                className="btn btn-primary px-8 py-4 rounded-2xl text-base font-black shadow-xl shadow-yellow-500/10"
              >
                {primaryLabel}
              </Link>

              <Link to={secondaryHref} className="btn btn-dark px-8 py-4 rounded-2xl text-base font-black">
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
