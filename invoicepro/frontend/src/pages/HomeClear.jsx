import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StickyTrialBar from '../components/StickyTrialBar';
import api from '../utils/api';
import {
  getFreeAccessState,
  getPlanLabel,
  getUser,
  hasProAccess,
  isLoggedIn,
  setAuth,
  setPostLoginRedirect
} from '../utils/auth';
import { trackCtaClick } from '../utils/analytics';
import useDocumentMeta from '../utils/useDocumentMeta';
import { getWhatsAppShareUrl } from '../utils/whatsapp';
import {
  COMPANY_NAME,
  COMPANY_TAGLINE,
  SITE_URL,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER,
  SUPPORT_WHATSAPP_PHONE,
  GOOGLE_REVIEW_URL,
  TRUSTPILOT_REVIEW_URL,
} from '../utils/company';

const workflowSteps = [
  ['01', 'Find and qualify a lead', 'Keep the contact, budget, next action, and follow-up date organized in one place.'],
  ['02', 'Send a 60-sec proposal', 'Define clear scope, milestones, upfront deposit, and get client sign-off online.'],
  ['03', 'Manage the delivery', 'Track milestones, deliverables, approvals, and client requests in one workroom.'],
  ['04', '1-Sec AI Invoice & UPI QR', 'Type in plain English to auto-create invoices with dynamic UPI QR code on web and downloaded PDF.'],
  ['05', 'Track, Chase & Legal Notice', '1-click mark as paid, automate WhatsApp chasers, and generate formal legal demand notices if clients delay or ghost.']
];

const freeIncludes = [
  { icon: '✨', title: 'Plain English AI Invoicing', text: 'Type what you worked on in 1 simple sentence. AI auto-fills client name, price, deliverables, and due dates in 1 second.' },
  { icon: '⚡', title: 'Direct UPI QR (0% Escrow)', text: 'Clients scan with GPay, PhonePe, or Paytm. 100% direct bank settlement in 10s with ₹0 platform cuts and zero middleman holds.' },
  { icon: '📄', title: 'QR Code Embedded in PDF', text: 'Every downloaded or printed PDF invoice has your live UPI QR code right on the page for instant scan-to-pay convenience.' },
  { icon: '⚖️', title: 'Legal Demand Notice Engine', text: '1-click formal legal demand notice citing Section 73 Indian Contract Act & MSME Samadhaan with a 7-day cure period for delayed or ghosting clients.' },
  { icon: '🌍', title: 'Foreign Client Rails (Wise/Wire)', text: 'Direct 1-click Wise, PayPal, or SWIFT wire transfer details in USD, EUR, GBP with 0% GST export LUT compliance.' },
  { icon: '✓', title: '1-Click Payment Tracker', text: 'Real-time payment tracking with 1-click "Mark as Paid", automated calm WhatsApp chasers, and 1-click CA tax export.' }
];

const protectionItems = [
  {
    icon: '⚖️',
    title: 'Formal Legal Demand Notice',
    text: 'Pre-action recovery notice under Indian Contract Act, 1872 & MSME Samadhaan with 7-day cure period for overdue invoices.'
  },
  {
    icon: '🛡️',
    title: 'Zero Escrow & Direct Payouts',
    text: 'We never hold your funds. All payments route directly from your client to your personal bank account or UPI ID.'
  },
  {
    icon: '🔒',
    title: 'Scope Lock & Revision Limits',
    text: 'Client signs off on included deliverables and extra revision charges before work starts to prevent scope creep.'
  },
  {
    icon: '🔔',
    title: 'Zero Awkward Payment Follow-ups',
    text: 'Calm, automated WhatsApp and email reminders handle the chasing professionally so your client relationship stays healthy.'
  }
];

const faqs = [
  ['Is ClientFlow AI a job marketplace?', 'No. ClientFlow AI does not sell leads or take a 20% platform cut. You keep 100% of your earnings from clients you source directly.'],
  ['How does ClientFlow AI make money if there is 0% commission on my payments?', 'We never touch, hold, or take a percentage cut from your client payments. 100% goes straight from your client to your bank account or UPI ID. ClientFlow AI operates as a pure software product and makes money solely through our affordable Pro subscription (₹249/month or ₹1,999/year).'],
  ['How do Indian clients pay?', 'They scan the dynamic UPI QR code on the invoice or downloaded PDF using any UPI app (GPay, PhonePe, Paytm, BHIM) or pay via cards/netbanking. Money deposits directly into your bank account in seconds.'],
  ['Can clients pay directly from the downloaded PDF invoice?', 'Yes! Every invoice PDF generated and downloaded has your dynamic UPI QR code embedded directly into the document. Clients can print it or scan it straight off their laptop or tablet screen using any phone camera or UPI app.'],
  ['What if a client delays, refuses to pay, or ghosts me?', 'ClientFlow AI includes a built-in 1-Click Formal Legal Demand Notice Generator. If a client is overdue, you can instantly export a formal pre-action recovery notice citing Section 73 of the Indian Contract Act, 1872 and MSME Samadhaan terms, setting a strict 7-day cure period before statutory recovery proceedings.'],
  ['How do US, UK, and foreign clients pay?', 'They pay in USD, EUR, or GBP via credit/debit card, Wise, PayPal, or direct SWIFT international bank wire. Under Section 16 of the IGST Act, cross-border freelance service export is 100% zero-rated under LUT.'],
  ['How does the 1-Click Payment Tracker work?', 'When a client pays, toggle "Mark as Paid" with 1 click. ClientFlow AI instantly flags the invoice as paid, automatically pauses all pending WhatsApp/email payment chasers, and updates your monthly revenue analytics in real time.'],
  ['Does ClientFlow AI hold or escrow my money?', 'Never. We never touch, hold, or deduct any fees from your client money. When clients pay via UPI QR, Wise, or Bank Transfer, 100% of the funds go straight into your personal bank account. We only make money when you subscribe to our software Pro plan.'],
  ['What happens to my data if my trial ends?', 'Your data is 100% safe and never locked. You retain full access to view, download, and export all your past invoices and client history to Excel anytime.']
];

const trustBadges = [
  { label: 'Udyam Registered', detail: UDYAM_REGISTRATION_NUMBER },
  { label: 'Direct Bank Deposits', detail: 'Zero Escrow or Holds' },
  { label: '256-bit SSL Security', detail: 'Encrypted Cloud Storage' },
  { label: '100% Data Portability', detail: 'Free Excel Export Anytime' }
];

const comparisonRows = [
  {
    problem: 'Creating an Invoice',
    free: 'Fill out 15 tedious manual form inputs, tax calculators, and date pickers every time',
    cf: 'Plain English AI Auto-Fill: Type "Built landing page for Acme for ₹25,000 due next Friday" — created in 1 second'
  },
  {
    problem: 'How Clients Pay in India',
    free: 'Bank account number typed on a static PDF (clients delay for weeks)',
    cf: 'Dynamic UPI QR Code right on the web & inside the downloaded PDF — client scans & pays in 10s via GPay, PhonePe, or Paytm'
  },
  {
    problem: 'Delayed, Ghosting, or Non-Paying Clients',
    free: 'Zero recourse. You get left on "Read" with awkward messages and unpaid bills',
    cf: '1-Click Formal Legal Demand Notice citing Section 73 Indian Contract Act, 1872 & MSME Samadhaan (7-day cure period)'
  },
  {
    problem: 'Overdue Follow-ups & Tracking',
    free: 'Manual emails lost in spam; manual spreadsheet updating',
    cf: 'Automated WhatsApp & Email payment chasers + 1-Click "Mark as Paid" real-time status tracker'
  },
  {
    problem: 'International Clients (US/UK/EU)',
    free: 'Hands off to PayPal with 5–8% hidden FX loss',
    cf: 'Direct transparent Wise, PayPal, and SWIFT bank wire rails with zero platform commission and 0% GST export LUT'
  },
  {
    problem: 'Payout Speed & Escrow Holds',
    free: 'Delayed by multi-day settlement holds, platform reserves, and verification roadblocks',
    cf: '100% Direct: Money routes directly into your bank / UPI ID with zero middleman or escrow hold'
  }
];

// Marquee Brand Items
const marqueeItems = [
  '⚡ Instant UPI QR',
  'Google Pay',
  'PhonePe',
  'Paytm',
  '✨ 1-Sec AI Invoicing',
  '⚖️ Legal Demand Notice',
  '0% Escrow Holds',
  'Wise USD/EUR Rail',
  'SWIFT Wire Ready',
  'GST & LUT Compliant',
  'Zero Platform Cuts',
  'Udyam Registered'
];

export default function HomeClear() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const user = loggedIn ? getUser() : null;
  const isPro = hasProAccess(user);
  const freeAccess = getFreeAccessState(user);

  // Parallax & Interactive Invoice State
  const [activeCurrency, setActiveCurrency] = useState('INR');
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const heroCardRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: x * 10, y: -y * 10 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseTilt({ x: 0, y: 0 });
  }, []);

  useDocumentMeta({
    title: `${COMPANY_NAME} | Get Paid 3x Faster. Zero Payment Chasing.`,
    description: 'The smart invoicing and billing workspace built for Indian freelancers. Accept UPI and international payments, automate WhatsApp payment follow-ups, and get direct bank deposits.',
    path: '/'
  });

  const startWorkspace = (source) => {
    const destination = loggedIn ? '/client-flow' : '/signup';
    if (!loggedIn) setPostLoginRedirect('/client-flow');
    trackCtaClick(source, 'home_bright', destination);
    navigate(destination);
  };

  const accessMessage = !loggedIn
    ? '30 days full access. No card required.'
    : isPro
      ? `${getPlanLabel(user)} is active.`
      : freeAccess.active
        ? `${freeAccess.daysLeft} day${freeAccess.daysLeft === 1 ? '' : 's'} left in your free access.`
        : 'Your free access has ended. Review plans when you are ready.';

  const isDiwaliOffer = true;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Aurora Radiant Glow Orbs */}
      <div className="aurora-mesh" aria-hidden="true">
        <div className="aurora-orb-1" />
        <div className="aurora-orb-2" />
        <div className="aurora-orb-3" />
      </div>

      <Navbar />

      <main className="relative z-10">
        {/* ═════════════════════════════════════════════
            HERO SECTION WITH PARALLAX & LIVE SIMULATOR
        ═════════════════════════════════════════════ */}
        <section className="relative px-4 pt-12 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32">
          <div className="container-custom">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              
              {/* Left Column: Value Proposition & High-Converting CTAs */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-sm backdrop-blur-md mb-6 animate-pulse-soft">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>The Invoicing & Payout Tool Built for Indian Freelancers</span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.05]">
                  Get paid 3x faster.<br />
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 bg-clip-text text-transparent">
                    Zero payment chasing.
                  </span>
                </h1>

                <p className="mt-6 text-lg sm:text-xl font-medium leading-relaxed text-slate-600 max-w-2xl">
                  Send high-trust invoices with dynamic UPI QR & foreign currency rails. Automatically follow up on WhatsApp & email when clients delay. Money settles straight into your bank account with zero platform cut.
                </p>

                {/* Quick Trust Highlights */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
                  <div className="rounded-xl border border-emerald-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                    <p className="text-xs font-black text-emerald-700">⚡ Direct UPI QR</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">Scan & pay in 10s via GPay/PhonePe</p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                    <p className="text-xs font-black text-purple-700">✨ Plain English AI</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">Auto-fill invoice in 1 second</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                    <p className="text-xs font-black text-rose-700">⚖️ Legal Notice</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">Contract Act & MSME Samadhaan</p>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                    <p className="text-xs font-black text-indigo-700">🌍 Wise & SWIFT</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">0% GST export under LUT</p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startWorkspace('hero_cta_bright')}
                    className="btn btn-primary py-4 px-8 rounded-xl text-sm font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>{loggedIn ? 'Open Workspace' : 'Start 30 Days Free →'}</span>
                  </button>

                  {!loggedIn && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await api.post('/auth/demo-login');
                          setAuth(res.data.token, res.data.user);
                          navigate('/client-flow');
                        } catch {
                          navigate('/login');
                        }
                      }}
                      className="btn btn-secondary py-4 px-7 rounded-xl text-sm font-black uppercase tracking-wider text-center"
                    >
                      Try Interactive Demo
                    </button>
                  )}

                  <Link
                    to="/payments"
                    className="py-4 px-5 text-sm font-bold text-slate-600 hover:text-indigo-600 text-center transition"
                  >
                    View Pricing (₹249/mo)
                  </Link>
                </div>

                {/* Micro-trust copy */}
                <p className="mt-4 text-xs font-bold text-slate-400">
                  {accessMessage} · No credit card required · Free 30-day trial · Cancel anytime
                </p>

                {/* Stats Row */}
                <div className="mt-10 flex flex-wrap gap-8 border-t border-slate-200/80 pt-6">
                  <div>
                    <p className="text-2xl font-black text-slate-900">30 Days</p>
                    <p className="text-xs font-semibold text-slate-500">Full Free Trial</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900">₹0 / $0</p>
                    <p className="text-xs font-semibold text-slate-500">No Card Needed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-900">₹ & USD</p>
                    <p className="text-xs font-semibold text-slate-500">Global & Domestic</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-emerald-600">100% Direct</p>
                    <p className="text-xs font-semibold text-slate-500">To Your Bank A/C</p>
                  </div>
                </div>
              </div>

              {/* Right Column: 3D Mouse Parallax Live Invoice Simulator */}
              <div
                ref={heroCardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative lg:pl-4 perspective-1000"
              >
                {/* Floating Notification Pill 1: Top Right */}
                <div className="absolute -top-6 -right-2 sm:-right-6 z-30 animate-float-slow hidden sm:flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-xl border border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">
                    ⚡
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">₹25,000 Settled</p>
                    <p className="text-[10px] font-bold text-emerald-600">Via UPI · 10s instant deposit</p>
                  </div>
                </div>

                {/* Floating Notification Pill 2: Left Middle */}
                <div className="absolute top-1/2 -left-4 sm:-left-8 z-30 animate-float-fast hidden sm:flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-xl border border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-black text-xs">
                    💬
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Auto-Chaser Sent</p>
                    <p className="text-[10px] font-bold text-amber-600">WhatsApp & Email reminder</p>
                  </div>
                </div>

                {/* Floating Notification Pill 3: Bottom Right */}
                <div className="absolute -bottom-6 right-4 sm:right-8 z-30 animate-float-reverse hidden sm:flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-xl border border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                    🌍
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">$850 USD Wire</p>
                    <p className="text-[10px] font-bold text-blue-600">LUT Export · 0% GST</p>
                  </div>
                </div>

                {/* Floating Notification Pill 4: Bottom Left */}
                <div className="absolute -bottom-6 left-2 sm:left-6 z-30 animate-float-slow hidden sm:flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-xl border border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-xs">
                    ⚖️
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Legal Recovery Protected</p>
                    <p className="text-[10px] font-bold text-rose-600">Contract Act & MSME Samadhaan</p>
                  </div>
                </div>

                {/* Interactive Card Container with 3D Tilt */}
                <div
                  style={{
                    transform: `perspective(1000px) rotateY(${mouseTilt.x}deg) rotateX(${mouseTilt.y}deg)`,
                    transition: 'transform 0.15s ease-out'
                  }}
                  className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xl shadow-indigo-600/10 relative overflow-hidden"
                >
                  {/* Top Bar with Live Currency Toggle */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Interactive Live Preview</span>
                      <p className="text-sm font-black text-slate-900">Smart Invoice Portal</p>
                    </div>

                    {/* Interactive Currency Switcher */}
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setActiveCurrency('INR')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                          activeCurrency === 'INR'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        🇮🇳 INR (UPI)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCurrency('USD')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                          activeCurrency === 'USD'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        🇺🇸 USD (Wise)
                      </button>
                    </div>
                  </div>

                  {/* Invoice Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-base font-black text-slate-900">YOUR STUDIO</p>
                      <p className="text-[11px] font-medium text-slate-400">
                        {activeCurrency === 'INR' ? 'GSTIN: 33ABCDE1234F1Z5' : 'Export of Service under LUT'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                        Pending Settlement
                      </span>
                      <p className="text-xs font-bold text-slate-400 mt-1">INV-2026-042</p>
                    </div>
                  </div>

                  {/* Bill To & Due Date */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 mb-6">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client</span>
                      <p className="font-bold text-slate-800">Acme Global Media</p>
                      <p className="text-slate-400 text-[11px]">billing@acme.com</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Due Date</span>
                      <p className="font-bold text-slate-800">Within 7 Days</p>
                      <p className="text-indigo-600 text-[11px] font-bold">Auto-reminder armed</p>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800">UI/UX Design & Brand Sprint</p>
                        <p className="text-[10px] text-slate-400">Phase 1 deliverable</p>
                      </div>
                      <span className="font-black text-slate-900">
                        {activeCurrency === 'INR' ? '₹25,000' : '$850.00'}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-800">
                        {activeCurrency === 'INR' ? '₹25,000' : '$850.00'}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{activeCurrency === 'INR' ? 'GST (18%)' : 'Export LUT (0% Tax)'}</span>
                      <span className="font-bold text-slate-800">
                        {activeCurrency === 'INR' ? '+₹4,500' : '$0.00'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="text-xs font-black uppercase text-slate-400">Total Receivable</span>
                      <span className="text-2xl font-black text-slate-900">
                        {activeCurrency === 'INR' ? '₹29,500' : '$850.00'}
                      </span>
                    </div>
                  </div>

                  {/* Live Payment Box */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    {activeCurrency === 'INR' ? (
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-white p-1 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                          {/* Stylized QR representation */}
                          <div className="grid grid-cols-4 gap-1 w-full h-full p-1 bg-slate-900 rounded">
                            <div className="bg-white rounded-sm" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-slate-900" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-white rounded-sm" />
                            <div className="bg-slate-900" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900">Scan with any UPI app</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Instant settlement to your bank account via GPay, PhonePe, Paytm</p>
                          <span className="mt-2 inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ Direct to your UPI ID
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">International Wire & Card</span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            US/UK Ready
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">SWIFT Code</span>
                            <span className="font-mono font-bold text-slate-900">HDFCINBBXXX</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Wise / PayPal</span>
                            <span className="font-bold text-indigo-600">1-Click Pay Link</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════
            INFINITE MARQUEE BRAND TRUST STRIP
        ═════════════════════════════════════════════ */}
        <section className="border-y border-slate-200 bg-white py-6">
          <div className="marquee-container">
            <div className="marquee-content">
              {marqueeItems.concat(marqueeItems).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-black uppercase tracking-wider text-slate-700">
                    {item}
                  </span>
                  <span className="text-slate-300">✦</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════
            WHY CLIENTFLOW OVER BASIC FREE APPS (COMPARISON)
        ═════════════════════════════════════════════ */}
        <section className="py-20 sm:py-28 bg-[#f8fafc]">
          <div className="container-custom">
            <div className="max-w-3xl">
              <span className="premium-eyebrow mb-3">The Truth About "Free" Invoicing</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Why serious freelancers choose ClientFlow over free Zoho.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Free tools generate static PDFs. But when clients ignore emails, delay payment by 45 days, or pay via PayPal with a 7% currency loss, you lose thousands. Here is what makes ClientFlow different:
              </p>
            </div>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">
                    <th className="p-4 sm:p-5">The Real Problem</th>
                    <th className="p-4 sm:p-5 text-slate-400">Free Tools (Zoho / Static PDFs)</th>
                    <th className="p-4 sm:p-5 text-indigo-700 bg-indigo-50/70">ClientFlow AI (Built for Freelancers)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 sm:p-5 font-bold text-slate-900">{row.problem}</td>
                      <td className="p-4 sm:p-5 text-slate-500">{row.free}</td>
                      <td className="p-4 sm:p-5 font-bold text-emerald-800 bg-indigo-50/30">
                        ✓ {row.cf}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Money Safety Guarantee Cards */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-700">
                  <span className="text-xl">🛡️</span>
                  <h4 className="text-sm font-black text-slate-900">100% Direct Payouts</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  ClientFlow AI never touches, holds, or deducts fees from your client money. UPI and Wise transfers deposit directly into your personal bank account. We make money only from software Pro plans.
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-rose-700">
                  <span className="text-xl">⚖️</span>
                  <h4 className="text-sm font-black text-slate-900">Legal Demand Notice</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Client delaying or ghosting? Generate an official pre-action Legal Demand Notice in 1 click citing Section 73 Indian Contract Act, 1872 & MSME Samadhaan with a strict 7-day cure period.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="text-xl">📄</span>
                  <h4 className="text-sm font-black text-slate-900">Dynamic QR in PDF</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Every downloaded or printed invoice PDF includes your live dynamic UPI QR code. Clients can scan and pay right off their screen or paper with zero account number typing.
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-700">
                  <span className="text-xl">🇮🇳</span>
                  <h4 className="text-sm font-black text-slate-900">Founder Support</h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Built by Ashieq for Indian freelancers tired of payment delays and hidden FX fees. Direct 24/7 founder support via{' '}
                  <a
                    href="https://wa.me/919080963704"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-700 font-bold underline hover:text-indigo-900"
                  >
                    WhatsApp (+91 90809 63704)
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════
            FEATURE GRID: 6 HIGH-IMPACT CAPABILITIES
        ═════════════════════════════════════════════ */}
        <section className="py-20 sm:py-28 bg-white border-y border-slate-200">
          <div className="container-custom">
            <div className="max-w-3xl">
              <span className="premium-eyebrow mb-3">All Features Unlocked</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Everything you need to turn work into cash.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Every feature is unlocked free for 30 full days. No credit card required.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {freeIncludes.map((item, i) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/90 bg-[#fafafa] p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 transition-all duration-300"
                >
                  <span className="text-3xl block mb-4">{item.icon}</span>
                  <h3 className="text-base font-black text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={() => startWorkspace('feature_grid_bright')}
                className="btn btn-primary py-4 px-8 rounded-xl text-sm font-black uppercase tracking-wider"
              >
                Start Free 30-Day Trial →
              </button>
              <Link to="/payments" className="btn btn-secondary py-4 px-6 rounded-xl text-sm font-bold">
                See Paid Plans After Trial
              </Link>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════
            5-STEP WORKFLOW TIMELINE
        ═════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-20 sm:py-28 bg-[#f8fafc]">
          <div className="container-custom">
            <div className="max-w-3xl">
              <span className="premium-eyebrow mb-3">How It Works</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                One connected path from lead to payout.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                No more jumping between WhatsApp, Word, Excel, and PayPal. Manage the entire client lifecycle in one workspace.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              {workflowSteps.map(([step, title, text]) => (
                <div
                  key={step}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition relative"
                >
                  <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                    Step {step}
                  </span>
                  <h3 className="mt-4 text-base font-black text-slate-900">{title}</h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════
            TRANSPARENT PRICING & DIWALI 50% DISCOUNT
        ═════════════════════════════════════════════ */}
        <section id="pricing" className="py-20 sm:py-28 bg-white border-t border-slate-200">
          <div className="container-custom">
            <div className="max-w-3xl">
              <span className="premium-eyebrow mb-3">Simple, Fair Pricing</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Try everything free. Pay only when it makes you money.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Zero commission on your client invoices. No card required for the 30-day free trial.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2 max-w-4xl">
              {/* Free Trial Card */}
              <div className="rounded-3xl border border-slate-200 bg-[#fbfbfe] p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                    Free Trial
                  </span>
                  <h3 className="mt-4 text-4xl font-black text-slate-900">₹0</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">Full 30-Day Unlocked Access · No Card Needed</p>

                  <ul className="mt-6 space-y-3 text-xs font-bold text-slate-700">
                    <li className="flex items-center gap-2">✓ Plain English AI invoice creator (1 sec)</li>
                    <li className="flex items-center gap-2">✓ Direct UPI QR (on web & PDF) — 0% cut</li>
                    <li className="flex items-center gap-2">✓ International Wise / SWIFT wire rails</li>
                    <li className="flex items-center gap-2">✓ Automatic WhatsApp & Email reminders</li>
                    <li className="flex items-center gap-2">✓ 1-Click Legal Demand Notice generator</li>
                    <li className="flex items-center gap-2">✓ 1-Click Excel / CA tax report export</li>
                  </ul>
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => startWorkspace('pricing_free_trial')}
                    className="w-full btn btn-secondary py-4 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Start 30 Days Free →
                  </button>
                </div>
              </div>

              {/* Pro Plan Card with Diwali 50% Offer */}
              <div className="rounded-3xl border-2 border-indigo-600 bg-white p-8 shadow-2xl shadow-indigo-600/10 flex flex-col justify-between relative overflow-hidden">
                <span className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm">
                  🪔 Diwali 50% OFF
                </span>

                <div>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                    Pro Plan
                  </span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-slate-900">₹249</h3>
                    <span className="text-sm font-bold text-slate-400 line-through">₹499</span>
                    <span className="text-xs font-bold text-slate-500">/ month</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-600 mt-1">Special Diwali Price (Lock in 50% Discount)</p>

                  <ul className="mt-6 space-y-3 text-xs font-bold text-slate-700">
                    <li className="flex items-center gap-2">✓ Unlimited AI invoices & proposal contracts</li>
                    <li className="flex items-center gap-2">✓ Direct UPI QR & Wise foreign payout rails</li>
                    <li className="flex items-center gap-2">✓ Automated WhatsApp overdue chasers</li>
                    <li className="flex items-center gap-2">✓ 1-Click Legal Demand Notice generator</li>
                    <li className="flex items-center gap-2">✓ 1-Click payment tracking & status ledger</li>
                    <li className="flex items-center gap-2">✓ Priority 24/7 founder WhatsApp support</li>
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    to="/payments"
                    className="block w-full btn btn-primary py-4 rounded-xl text-xs font-black uppercase tracking-wider text-center"
                  >
                    Claim Diwali Offer (₹249) →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════
            FAQ SECTION
        ═════════════════════════════════════════════ */}
        <section className="py-20 sm:py-28 bg-[#f8fafc] border-t border-slate-200">
          <div className="container-custom grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <span className="premium-eyebrow mb-3">Frequently Asked Questions</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Clear answers for busy freelancers.
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Need more help? Chat directly with the founder on WhatsApp at{' '}
                <a href="https://wa.me/919080963704" className="font-bold text-indigo-600 underline">
                  +91 90809 63704
                </a>.
              </p>
            </div>

            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map(([q, a]) => (
                <details key={q} className="group py-5">
                  <summary className="cursor-pointer list-none text-base font-black text-slate-900 transition hover:text-indigo-600 flex items-center justify-between">
                    <span>{q}</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════
            FINAL CALL TO ACTION BANNER
        ═════════════════════════════════════════════ */}
        <section className="py-20 bg-white border-t border-slate-200">
          <div className="container-custom">
            <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 p-8 sm:p-14 shadow-lg text-center max-w-4xl mx-auto">
              <span className="premium-eyebrow mb-4">Start Today Without Risk</span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Ready to stop chasing payments?
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl mx-auto">
                Create your first professional invoice in 30 seconds. All features free for 30 full days.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startWorkspace('final_cta_bright')}
                  className="w-full sm:w-auto btn btn-primary py-4 px-9 rounded-xl text-sm font-black uppercase tracking-wider"
                >
                  {loggedIn ? 'Open Workspace' : 'Start 30 Days Free →'}
                </button>
                <Link
                  to="/how-to-use"
                  className="w-full sm:w-auto btn btn-secondary py-4 px-7 rounded-xl text-sm font-bold"
                >
                  See How It Works
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <StickyTrialBar />
    </div>
  );
}
