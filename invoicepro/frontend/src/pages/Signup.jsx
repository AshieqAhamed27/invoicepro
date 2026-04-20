import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { setAuth } from '../utils/auth';
import Navbar from '../components/Navbar';
import BrandLogo from '../components/BrandLogo';

export default function Signup() {
  const navigate = useNavigate();

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
      navigate('/dashboard');
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
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom grid min-h-[calc(100vh-120px)] items-center gap-16 py-12 lg:grid-cols-[1fr_420px]">
        <section className="hidden lg:block relative text-left">
           <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-emerald-500/10 blur-[140px] pointer-events-none" />
          
           <div className="max-w-xl relative">
              <div className="mb-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                 <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Free forever workspace</p>
              </div>

              <h1 className="mb-6 text-5xl font-black leading-none tracking-tight">
                Scale your <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white">Consultancy.</span>
              </h1>

              <p className="mb-12 text-lg text-zinc-500 font-medium leading-relaxed">
                Join 2,000+ professionals using InvoicePro to automate their billing, 
                track interactive payments, and impress clients.
              </p>

              <div className="grid gap-6">
                {[
                  { t: 'Unlimited Invoices', d: 'Issue as many bills as your business needs.' },
                  { t: 'UPI Automation', d: 'Scan & Pay built directly into your portals.' },
                  { t: 'AI Analytics', d: 'Get insights into your cashflow health instantly.' }
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

        <section className="reveal mx-auto w-full">
          <div className="surface p-10 sm:p-12 border-white/5 bg-zinc-950/40 backdrop-blur-2xl rounded-[3rem] shadow-2xl">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-white leading-none mb-3">
                Create Account.
              </h2>
              <p className="text-sm font-medium text-zinc-500">
                No credit card required to start.
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
                {loading ? 'Creating workspace...' : 'Deploy Workspace'}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-sm font-medium text-zinc-500">
                Already have a workspace?{' '}
                <Link to="/login" className="font-black text-yellow-300 hover:text-white transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
