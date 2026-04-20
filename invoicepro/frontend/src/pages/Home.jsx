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
    ['01', 'Smart Invoicing', 'Itemize work, add taxes, and set due dates in seconds with AI-assisted drafting.'],
    ['02', 'Instant Sharing', 'Send a branded payment portal link via mail or WhatsApp. No PDF wrestling needed.'],
    ['03', 'Auto Reconciliation', 'Know the second a client pays. UPI and Razorpay automation mark invoices as paid for you.']
  ];

  const features = [
    ['Smart Follow-ups', 'Automated reminders draft professional messages to your late-paying clients.'],
    ['Customer CRM', 'Save client profiles for instant retrieval. Analyze lifetime value per partner.'],
    ['Growth Analytics', 'Visual revenue trends and AI-powered cashflow health scores at your fingertips.']
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-yellow-400 selection:text-black">
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-20 md:pt-32 md:pb-40 overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full opacity-20 pointer-events-none">
             <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500 rounded-full blur-[160px] animate-pulse" />
             <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[160px] opacity-40" />
          </div>

          <div className="container-custom relative z-10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="reveal inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 backdrop-blur-sm mb-8 transition-all hover:bg-yellow-400/10">
                <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">The Future of Freelancing</p>
              </div>

              <h1 className="reveal reveal-delay-1 text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] mb-8 text-white">
                Collect payments <br className="hidden md:block" /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 italic">effortlessly.</span>
              </h1>

              <p className="reveal reveal-delay-2 mx-auto max-w-2xl text-lg md:text-xl text-zinc-400 font-medium leading-relaxed mb-10">
                The all-in-one invoicing engine for modern startups & freelancers. 
                Move from "Unpaid" to "Paid" in half the time.
              </p>

              <div className="reveal reveal-delay-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate(loggedIn ? '/dashboard' : '/signup')}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-black font-black text-lg shadow-2xl shadow-white/10 hover:scale-105 active:scale-95 transition-all"
                >
                  {loggedIn ? 'Open Dashboard' : 'Get Started for Free'}
                </button>
                <button
                  onClick={() => navigate(loggedIn ? '/create-invoice' : '/login')}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-zinc-900 text-white font-black text-lg border border-white/10 hover:bg-zinc-800 transition-all"
                >
                  {loggedIn ? 'Create Invoice' : 'Sign in'}
                </button>
              </div>
            </div>

            {/* PRODUCT MOCKUP */}
            <div className="reveal reveal-delay-3 mt-20 relative px-4">
              <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-black relative group">
                 {/* Floating Glows for the mockup */}
                 <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-400/10 blur-[100px] pointer-events-none group-hover:bg-yellow-400/20 transition-all duration-700" />
                 <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-400/10 blur-[100px] pointer-events-none group-hover:bg-emerald-400/20 transition-all duration-700" />

                 <div className="rounded-[2rem] border border-white/5 bg-[#0a0a0a] overflow-hidden aspect-[16/10] sm:aspect-[16/8] relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 to-transparent z-10" />
                    
                    {/* Mock dashboard content */}
                    <div className="p-4 sm:p-10">
                      {/* Top Row: Mini Stats */}
                      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
                        <div className="h-24 sm:h-32 rounded-2xl bg-white/[0.03] border border-white/5 p-4 sm:p-6 flex flex-col justify-between">
                          <div className="h-1.5 w-8 bg-emerald-400/40 rounded shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                          <div className="space-y-2">
                             <div className="h-1.5 w-16 bg-zinc-800 rounded" />
                             <div className="h-4 sm:h-6 w-24 bg-white/10 rounded" />
                          </div>
                        </div>
                        <div className="h-24 sm:h-32 rounded-2xl bg-white/[0.03] border border-white/5 p-4 sm:p-6 flex flex-col justify-between">
                          <div className="h-1.5 w-8 bg-yellow-400/40 rounded" />
                          <div className="space-y-2">
                             <div className="h-1.5 w-16 bg-zinc-800 rounded" />
                             <div className="h-4 sm:h-6 w-20 bg-white/10 rounded" />
                          </div>
                        </div>
                        <div className="h-24 sm:h-32 rounded-2xl bg-white/[0.03] border border-white/5 p-4 sm:p-6 flex flex-col justify-between">
                          <div className="h-1.5 w-8 bg-white/10 rounded" />
                          <div className="space-y-2">
                             <div className="h-1.5 w-16 bg-zinc-800 rounded" />
                             <div className="h-4 sm:h-6 w-12 bg-white/10 rounded" />
                          </div>
                        </div>
                      </div>

                      {/* Main UI: Table Mockup */}
                      <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 lg:block hidden">
                         <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                            <div className="h-4 w-32 bg-white/10 rounded" />
                            <div className="h-8 w-24 bg-yellow-400/10 border border-yellow-400/20 rounded-lg" />
                         </div>
                         <div className="space-y-6">
                            {[1,2,3].map(i => (
                              <div key={i} className="flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-white/5" />
                                    <div className="space-y-2">
                                       <div className="h-3 w-32 bg-white/10 rounded" />
                                       <div className="h-2 w-48 bg-zinc-900 rounded" />
                                    </div>
                                 </div>
                                 <div className="h-4 w-20 bg-emerald-400/10 rounded" />
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>

                    {/* Floating elements */}
                    <div className="absolute bottom-6 left-6 sm:bottom-12 sm:left-12 p-4 sm:p-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 backdrop-blur-2xl z-20 shadow-2xl shadow-emerald-400/20 animate-[bounce_3s_ease-in-out_infinite]">
                       <p className="text-[8px] sm:text-[10px] uppercase font-black text-emerald-400 tracking-widest mb-1">Incoming Payment</p>
                       <p className="text-lg sm:text-2xl font-black text-white">₹ 12,500.00</p>
                    </div>

                    <div className="absolute top-1/2 right-12 p-6 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 backdrop-blur-2xl z-20 shadow-2xl shadow-yellow-400/20 animate-[bounce_4s_ease-in-out_infinite] hidden lg:block">
                       <p className="text-[10px] uppercase font-black text-yellow-400 tracking-widest mb-1">AI Insight</p>
                       <p className="text-sm font-bold text-white max-w-[150px]">Payment risk detected for Client Apex.</p>
                       <div className="mt-4 h-1 w-full bg-yellow-400/20 rounded-full overflow-hidden">
                          <div className="h-full w-2/3 bg-yellow-400" />
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="py-24 border-t border-white/5 bg-zinc-950/50 relative overflow-hidden">
          <div className="container-custom">
            <div className="mx-auto mb-20 max-w-2xl text-center">
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">The Fastest Way to Get Paid</h2>
              <p className="text-zinc-500 font-medium">Simple, automated, and built for high-growth creators.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {workflow.map(([step, title, desc]) => (
                <div key={title} className="group relative p-8 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500">
                  <span className="inline-block mb-6 text-3xl font-black text-white/10 group-hover:text-yellow-400/40 transition-colors">{step}</span>
                  <h3 className="mb-4 text-2xl font-bold text-white">{title}</h3>
                  <p className="text-zinc-500 leading-relaxed font-medium">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES BENTO */}
        <section className="py-24 bg-[#050505]">
          <div className="container-custom">
             <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
                <div className="md:col-span-8 group relative p-12 rounded-[2.5rem] border border-white/5 bg-zinc-950 overflow-hidden hover:border-yellow-400/20 transition-all duration-500">
                    <div className="absolute bottom-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
                       <svg className="h-60 w-60 text-yellow-300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                    </div>
                    <h3 className="text-4xl font-black text-white mb-6 max-w-md tracking-tight leading-none">Intelligence built into every invoice.</h3>
                    <p className="text-lg text-zinc-500 max-w-sm mb-12">Our AI Cashflow engine analyzes payment risk, drafts follow-ups, and optimizes your collection rate.</p>
                    <div className="flex gap-4">
                       <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] uppercase font-black text-zinc-500">Risk Scoring</div>
                       <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] uppercase font-black text-zinc-500">Auto Drafts</div>
                       <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] uppercase font-black text-zinc-500">Insights</div>
                    </div>
                </div>

                <div className="md:col-span-4 p-12 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent hover:border-emerald-400/20 transition-all duration-500">
                    <div className="h-16 w-16 mb-8 rounded-2xl bg-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-400/20">
                       <svg className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4 leading-tight">Verified <br /> Payments.</h3>
                    <p className="text-zinc-500 font-medium">Automatic verification for UPI & Razorpay transactions.</p>
                </div>

                <div className="md:col-span-4 p-12 rounded-[2.5rem] border border-white/5 bg-zinc-950 hover:border-white/10 transition-all">
                    <h3 className="text-2xl font-bold text-white mb-4">Saved Clients.</h3>
                    <p className="text-zinc-500 font-medium text-sm">One-click data entry for your recurring partners.</p>
                </div>

                <div className="md:col-span-8 p-12 rounded-[2.5rem] border border-white/5 bg-zinc-950 flex items-center justify-between group hover:border-white/10 transition-all">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Public Invoices.</h3>
                      <p className="text-zinc-500 font-medium text-sm">Interactive payment portals that look stunning on all devices.</p>
                    </div>
                    <div className="hidden sm:flex h-20 w-32 bg-white/5 rounded-2xl border border-white/5 items-center justify-center group-hover:scale-110 transition-transform">
                       <div className="h-2 w-16 bg-white/10 rounded animate-pulse" />
                    </div>
                </div>
             </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-24 relative">
          <div className="container-custom relative z-10">
            <div className="mx-auto mb-20 max-w-3xl text-center">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Transparent Pricing.</h2>
              <p className="text-zinc-500 font-medium text-lg">Start for free, scale when you grow. No hidden platform fees.</p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              <div className="p-10 rounded-[3rem] border border-white/5 bg-zinc-950 flex flex-col justify-between hover:bg-zinc-900/50 transition-all">
                <div>
                  <h3 className="mb-2 text-2xl font-bold text-white">Monthly Growth</h3>
                  <p className="text-zinc-500 mb-8 font-medium">Great for starting freelancers.</p>
                  <p className="mb-10 text-5xl font-black text-white italic">₹ 99 <span className="text-sm font-black text-zinc-600 uppercase tracking-widest">/ month</span></p>

                  <ul className="mb-10 space-y-4 text-zinc-400 font-medium">
                    <li className="flex items-center gap-3"><svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Unlimited Invoices</li>
                    <li className="flex items-center gap-3"><svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> UPI & Card Payments</li>
                    <li className="flex items-center gap-3"><svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Public Payment Portal</li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribe('monthly')}
                  className="w-full py-5 rounded-2xl bg-zinc-900 text-white font-black hover:bg-zinc-800 transition-all border border-white/5 active:scale-95"
                >
                  Start Monthly
                </button>
              </div>

              <div className="p-10 rounded-[3rem] border-2 border-yellow-400/50 bg-yellow-400/5 relative flex flex-col justify-between shadow-2xl shadow-yellow-400/10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest shadow-xl">
                    Most Popular
                </div>
                <div>
                  <h3 className="mb-2 text-2xl font-bold text-white">Annual Professional</h3>
                  <p className="text-zinc-400 mb-8 font-medium">For established startups & agencies.</p>
                  <p className="mb-10 text-5xl font-black text-white italic">₹ 999 <span className="text-sm font-black text-zinc-500 uppercase tracking-widest">/ year</span></p>

                  <ul className="mb-10 space-y-4 text-zinc-300 font-medium">
                    <li className="flex items-center gap-3"><svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Everything in Monthly</li>
                    <li className="flex items-center gap-3"><svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Full AI Cashflow Insights</li>
                    <li className="flex items-center gap-3"><svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Priority Startup Support</li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribe('yearly')}
                  className="w-full py-5 rounded-2xl bg-yellow-400 text-black font-black hover:bg-yellow-300 transition-all shadow-xl shadow-yellow-400/20 active:scale-95"
                >
                  Lock in Yearly
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 border-t border-white/5">
           <div className="container-custom">
              <div className="p-12 md:p-24 rounded-[3rem] bg-gradient-to-br from-zinc-900 to-black border border-white/5 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 blur-[100px]" />
                  <h2 className="relative z-10 text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">Ready to streamline your <br className="hidden md:block" /> revenue collection?</h2>
                  <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                     <button 
                        onClick={() => navigate('/signup')}
                        className="px-10 py-5 rounded-2xl bg-white text-black font-black hover:scale-105 active:scale-95 transition-all text-lg shadow-2xl"
                     >
                        Claim your free workspace
                     </button>
                     <p className="text-zinc-500 font-medium ml-4">Join 2,000+ freelancers already growing.</p>
                  </div>
              </div>
           </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
