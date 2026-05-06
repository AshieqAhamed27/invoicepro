import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { resolvePostLoginRedirect, setAuth } from '../utils/auth';
import Navbar from '../components/Navbar';
import { SUPPORT_EMAIL } from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackEvent } from '../utils/analytics';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  useDocumentMeta(
    'Create Your Account | ClientFlow AI',
    'Start your India-ready ClientFlow AI workspace to find leads, send invoices, share Razorpay or UPI payment links, and organize follow-ups.'
  );

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/signup', form);
      setAuth(res.data.token, res.data.user);
      trackEvent('sign_up', {
        method: 'email',
        has_company_name: Boolean(form.companyName)
      });
      navigate(resolvePostLoginRedirect(location.state), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Signup failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom grid items-start gap-8 py-8 sm:gap-10 sm:py-12 lg:min-h-[calc(100vh-120px)] lg:items-center lg:gap-16 lg:grid-cols-[1fr_420px]">
        <section className="hidden lg:block relative text-left">
           <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-emerald-500/10 blur-[140px] pointer-events-none" />
          
           <div className="max-w-xl relative">
              <div className="mb-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                 <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Set up your billing workspace</p>
              </div>

              <h1 className="mb-6 text-4xl font-black leading-none tracking-tight xl:text-5xl">
                Start finding clients <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white">and getting paid faster.</span>
              </h1>

              <p className="mb-12 text-lg text-zinc-500 font-medium leading-relaxed">
                Create your India-ready workspace to manage leads, proposals, invoices,
                Razorpay or UPI collection, and daily follow-ups from day one.
              </p>

              <div className="grid gap-6">
                {[
                  { t: 'India-first workspace', d: 'Built for Rs invoices, GST-ready fields, UPI, Razorpay, and WhatsApp sharing.' },
                  { t: 'Invoice and proposal links', d: 'Share documents clients can open in a browser without creating an account.' },
                  { t: 'UPI and Razorpay collection', d: 'Offer a recognizable payment flow once the invoice is ready to collect.' },
                  { t: 'Support when you need it', d: `Reach us at ${SUPPORT_EMAIL} if you need help getting set up.` }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-5 transition-transform hover:translate-x-2 duration-300">
                     <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                     </div>
                     <div>
                        <p className="font-bold text-white text-base leading-none mb-1">{item.t}</p>
                        <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">{item.d}</p>
                     </div>
                  </div>
                ))}
              </div>
           </div>
        </section>

        <section className="reveal mx-auto w-full max-w-xl lg:max-w-none">
          <div className="premium-panel p-6 sm:p-10 lg:p-12">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-white leading-none mb-3">
                Create Account.
              </h2>
              <p className="text-sm font-medium text-zinc-500">
                No credit card required. Not limited to U.S. or Canada-only workflows.
              </p>
            </div>

            {error && (
              <div className="mb-8 p-4 rounded-2xl border border-red-400/20 bg-red-400/5 text-xs font-bold text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Full Name</p>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Company</p>
                    <input
                      type="text"
                      autoComplete="organization"
                      placeholder="Optional"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                    />
                </div>
              </div>

              <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Email Address</p>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                  />
              </div>

              <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Password</p>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="6+ characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                  />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-5 rounded-2xl shadow-xl shadow-emerald-500/10 font-black text-lg mt-4 bg-emerald-400 hover:bg-emerald-300"
              >
                {loading ? 'Creating workspace...' : 'Create Workspace'}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-sm font-medium text-zinc-500">
                Already have a workspace?{' '}
                <Link to="/login" className="font-black text-yellow-300 hover:text-white transition-colors">
                  Sign in here
                </Link>
              </p>
              <p className="mt-4 text-xs font-medium text-zinc-600">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
