import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import LoadingScreen from '../components/LoadingScreen';
import { getSafeRemoteImageUrl } from '../utils/safeUrl';
import { COMPANY_SHORT_NAME } from '../utils/company';
import { getUser, hasProAccess } from '../utils/auth';
import { DEVICE_REMINDERS_KEY, PLAN_DEVICE_REMINDERS_KEY } from '../components/DeviceReminderAgent';

const settingsNav = [
  { label: 'Business Profile', href: '#business-profile' },
  { label: 'Payment Setup', href: '#payment-setup' },
  { label: 'Branding', href: '#branding' },
  { label: 'Product Settings', href: '#product-settings' },
  { label: 'Automation', href: '#automation-settings' },
  { label: 'Security', href: '#security-settings' }
];

const productSettings = [
  {
    label: 'Payments',
    title: 'Razorpay + UPI Collection',
    detail: 'Create payment links, show Pay Now buttons, and keep invoices protected from manual fake paid status.',
    status: 'Free',
    to: '/payment'
  },
  {
    label: 'AI Coach',
    title: 'AI Client Coach',
    detail: 'Guides freelancers on finding clients, talking to them, closing the deal, and collecting payment.',
    status: 'Pro',
    to: '/ai-coach',
    requiresPro: true
  },
  {
    label: 'Growth Plan',
    title: 'Freelancer Stability System',
    detail: 'Turns a monthly income goal into daily leads, proposals, price upgrades, recurring client offers, and retention messages.',
    status: 'Pro',
    to: '/growth-plan',
    requiresPro: true
  },
  {
    label: 'Client Growth',
    title: 'Client Finder + Lead Pipeline',
    detail: 'Find real prospects, save leads, prepare follow-ups, and convert accepted work into invoices.',
    status: 'Pro',
    to: '/client-finder',
    requiresPro: true
  },
  {
    label: 'Sales Agent',
    title: 'AI SDR & Sales Automation Agent',
    detail: 'Ranks today’s leads, proposal follow-ups, and payment collection actions with copy-ready sales messages.',
    status: 'Pro',
    to: '/sales-agent',
    requiresPro: true
  },
  {
    label: 'Outbound',
    title: 'AI Outbound Agency Autopilot',
    detail: 'Turn a service offer into search links, daily outreach tasks, scripts, follow-ups, and proposal actions.',
    status: 'Pro',
    to: '/outbound-autopilot',
    requiresPro: true
  },
  {
    label: 'Proposals',
    title: 'AI Proposal & RFP Writer',
    detail: 'Write executive summaries, scope, timelines, pricing, risks, questions, and client-ready proposal drafts.',
    status: 'Pro',
    to: '/proposal-writer',
    requiresPro: true
  },
  {
    label: 'Close',
    title: 'AI Deal Closure Room',
    detail: 'Create a trust pack, buyer FAQ, objection replies, close score, and next-step message before invoicing.',
    status: 'Pro',
    to: '/deal-room',
    requiresPro: true
  },
  {
    label: 'Workroom',
    title: 'Client Workroom',
    detail: 'Manage scope, milestones, files, delivery proof, collaborators, invoices, and payment follow-up in one client workspace.',
    status: 'Pro',
    to: '/client-workroom',
    requiresPro: true
  },
  {
    label: 'Recurring Revenue',
    title: 'Monthly Client System',
    detail: 'Manage repeat billing ideas and recurring client opportunities from one place.',
    status: 'Pro',
    to: '/recurring',
    requiresPro: true
  },
  {
    label: 'Trust Center',
    title: 'Company Setup Checklist',
    detail: 'Review launch readiness, policies, business registration notes, payments, and product operations.',
    status: 'Free',
    to: '/launch'
  }
];

const automationSettings = [
  {
    title: 'Today Business Action',
    detail: 'Dashboard prepares who to message, what to invoice, and which payment to collect next.',
    state: 'Enabled'
  },
  {
    title: 'Freelancer Growth Plan',
    detail: 'Calculates stability score, monthly income path, daily lead target, price upgrade, recurring client chances, and retention prompts.',
    state: 'Enabled'
  },
  {
    title: 'Smart Payment Follow-up',
    detail: 'Unpaid invoices are ranked by urgency and WhatsApp messages are prepared for manual sending.',
    state: 'Enabled'
  },
  {
    title: 'Lead Follow-up Reminders',
    detail: 'Lead pipeline keeps 1 day, 3 day, and 7 day follow-up tasks visible to the user.',
    state: 'Enabled'
  },
  {
    title: 'AI Sales Agent',
    detail: 'Daily SDR plan chooses who to message, what proposal to push, and which invoice to collect.',
    state: 'Enabled'
  },
  {
    title: 'AI Client Coach',
    detail: 'Creates client-finding steps, talk scripts, objection replies, closing actions, and payment messages.',
    state: 'Enabled'
  },
  {
    title: 'Deal Closure Room',
    detail: 'Turns a warm client into a trust pack, objection replies, buyer FAQ, and close-ready next action.',
    state: 'Enabled'
  },
  {
    title: 'Client Workroom',
    detail: 'Keeps client scope, milestones, proof links, delivery notes, collaborator roles, invoice, and payment follow-up visible.',
    state: 'Enabled'
  },
  {
    title: 'Automated User & Client Email Reminders',
    detail: 'Backend automation can send users a daily action digest and send clients invoice reminders before/during/after due dates when the cron endpoint runs.',
    state: 'Cron Ready'
  }
];

export default function Settings() {
  const [form, setForm] = useState({
    companyName: '',
    gstNumber: '',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    swiftCode: '',
    internationalPaymentLink: '',
    address: '',
    logo: '',
    persona: '',
    freelanceExperience: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [deviceRemindersEnabled, setDeviceRemindersEnabled] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem(DEVICE_REMINDERS_KEY) === '1'
  ));
  const [notificationState, setNotificationState] = useState(() => (
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  ));
  const currentUser = getUser() || {};
  const isPro = hasProAccess(currentUser);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const res = await api.get('/auth/me');
      const user = res.data.user;

      setForm({
        companyName: user.companyName || '',
        gstNumber: user.gstNumber || '',
        upiId: user.upiId || '',
        bankName: user.bankName || '',
        accountNumber: user.accountNumber || '',
        ifscCode: user.ifscCode || '',
        swiftCode: user.swiftCode || '',
        internationalPaymentLink: user.internationalPaymentLink || '',
        address: user.address || 'Tamil Nadu, India',
        logo: user.logo || '',
        persona: user.persona || '',
        freelanceExperience: user.freelanceExperience || ''
      });
    } catch {
      alert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const safeLogo = getSafeRemoteImageUrl(form.logo);
      if (String(form.logo || '').trim() && !safeLogo) {
        alert('Logo must be /logo.svg or a public https image URL.');
        setSaving(false);
        return;
      }

      const res = await api.put('/auth/profile', { ...form, logo: safeLogo });
      localStorage.setItem('user', JSON.stringify(res.data.user));
      alert('Profile updated successfully!');
    } catch {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const enableDeviceReminders = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationState('unsupported');
      alert('This browser does not support device notifications.');
      return;
    }

    const permission = await window.Notification.requestPermission();
    setNotificationState(permission);

    if (permission !== 'granted') {
      alert('Device notification permission was not allowed. You can enable it later from browser settings.');
      return;
    }

    localStorage.setItem(DEVICE_REMINDERS_KEY, '1');
    localStorage.setItem(PLAN_DEVICE_REMINDERS_KEY, '1');
    setDeviceRemindersEnabled(true);

    try {
      new window.Notification('ClientFlow AI reminders enabled', {
        body: 'You will get device alerts for payments, leads, proposals, project tasks, and plan expiry when ClientFlow AI is open.',
        icon: '/logo.svg',
        tag: 'clientflow-device-reminders-enabled'
      });
    } catch {}
  };

  const disableDeviceReminders = () => {
    localStorage.setItem(DEVICE_REMINDERS_KEY, '0');
    localStorage.setItem(PLAN_DEVICE_REMINDERS_KEY, '0');
    setDeviceRemindersEnabled(false);
  };

  const sendTestEmail = async () => {
    try {
      setTestingEmail(true);
      const res = await api.post('/auth/email-test');
      alert(res.data?.message || 'Test email sent.');
    } catch (err) {
      alert(err?.response?.data?.message || 'Email test failed.');
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        fullScreen={true}
        message="Loading Account Settings"
        subtext="Retrieving profile preferences, business logo & security..."
      />
    );
  }

  const safeLogoPreviewUrl = getSafeRemoteImageUrl(form.logo);
  const logoInvalid = Boolean(String(form.logo || '').trim()) && !safeLogoPreviewUrl;

  return (
    <div className="premium-page min-h-screen">
      <Navbar />
      <main className="container-custom py-8 sm:py-10 md:py-16">
        <div className="reveal mb-12">
          <div className="flex items-center gap-2 mb-4">
             <span className="h-px w-8 bg-yellow-400" />
             <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Business Profile</p>
          </div>
          <h1 className="text-4xl font-black sm:text-5xl tracking-tight text-white mb-4">
            Settings
          </h1>
          <p className="max-w-2xl text-base sm:text-lg text-zinc-500 font-medium leading-relaxed">
            Manage your company identity, payment collection, branding, automation rules, and product readiness from one place.
          </p>
        </div>

        <section className="reveal reveal-delay-1 mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Profile', value: form.companyName ? 'Configured' : 'Needs Name', tone: 'yellow' },
            { label: 'Payments', value: form.upiId ? 'UPI Ready' : 'Add UPI', tone: 'emerald' },
            { label: 'Branding', value: safeLogoPreviewUrl ? 'Logo Ready' : 'Use Logo', tone: 'sky' },
            { label: 'Automation', value: 'AI Enabled', tone: 'purple' }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <p className={`text-[10px] font-black uppercase tracking-widest ${
                item.tone === 'emerald' ? 'text-emerald-300' :
                  item.tone === 'sky' ? 'text-sky-300' :
                    item.tone === 'purple' ? 'text-purple-300' : 'text-yellow-300'
              }`}>
                {item.label}
              </p>
              <p className="mt-2 text-xl font-black text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <form
          onSubmit={handleSubmit}
          className="grid gap-8"
        >
          <div className="reveal reveal-delay-1 space-y-8">
            <section id="business-profile" className="premium-panel p-5 sm:p-8 relative overflow-hidden group scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Business Details</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Your public invoicing identity</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                    Company Registered Name
                  </label>
                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Apex Design Studio"
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                    GST Identification Number (Optional)
                  </label>
                  <input
                    name="gstNumber"
                    value={form.gstNumber}
                    onChange={handleChange}
                    placeholder="Optional GSTIN"
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition"
                  />
                </div>
              </div>
            </section>

            <section id="role-profile" className="premium-panel p-5 sm:p-8 relative overflow-hidden group scroll-mt-28">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">Professional Role & Experience</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tailors templates, analytics, and workflow tips</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                    Your Primary Role
                  </label>
                  <select
                    name="persona"
                    value={form.persona}
                    onChange={handleChange}
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition cursor-pointer"
                  >
                    <option value="" className="bg-white text-slate-500">Select your role...</option>
                    <option value="freelancer" className="bg-white text-slate-900">💼 Freelancer / Independent Pro</option>
                    <option value="agency" className="bg-white text-slate-900">🏢 Agency / Studio / Team</option>
                    <option value="small_business" className="bg-white text-slate-900">🏪 Small Business Owner</option>
                    <option value="student" className="bg-white text-slate-900">🎓 Student / Exploring</option>
                    <option value="other" className="bg-white text-slate-900">✨ Other Field</option>
                  </select>
                </div>

                {form.persona === 'freelancer' && (
                  <div className="animate-fadeIn">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                      Freelance Experience Level
                    </label>
                    <select
                      name="freelanceExperience"
                      value={form.freelanceExperience}
                      onChange={handleChange}
                      className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition cursor-pointer"
                    >
                      <option value="beginner" className="bg-white text-slate-900">🌱 Beginner (&lt; 1 Year)</option>
                      <option value="1_to_3_years" className="bg-white text-slate-900">🚀 1 – 3 Years Experience</option>
                      <option value="3_to_5_years" className="bg-white text-slate-900">⭐ 3 – 5 Years Experience</option>
                      <option value="5_plus_years" className="bg-white text-slate-900">👑 5+ Years Veteran</option>
                    </select>
                  </div>
                )}
              </div>
            </section>

            <section id="payment-setup" className="premium-panel p-5 sm:p-8 scroll-mt-28 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-white leading-none mb-1">Payment & Payout Details</h2>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Where domestic and international clients send money</p>
                </div>
                <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  Direct Payouts (Zero Escrow)
                </span>
              </div>

              {/* Zero Escrow Guarantee Banner */}
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-base">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-300 mb-1">
                    100% Direct to Your Bank — We Never Touch Your Client Money
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    ClientFlow AI does not hold, escrow, or deduct commission from your client invoices. When your clients pay via UPI QR, Wise, or Bank Transfer, <strong className="text-white">100% of the funds deposit directly into your personal bank account</strong> with 0% platform fee. ClientFlow AI only makes money when you subscribe to a software Pro plan.
                  </p>
                </div>
              </div>

              {/* SECTION 1: DOMESTIC UPI */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">1. Instant UPI Payments (India)</h3>
                </div>
                <div className="max-w-md">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                    Default UPI ID / VPA
                  </label>
                  <input
                    name="upiId"
                    value={form.upiId}
                    onChange={handleChange}
                    placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 font-mono transition"
                  />
                  <p className="text-xs text-slate-600 mt-2 font-medium">Generates dynamic QR codes on INR invoices for instant GPay, PhonePe, Paytm settlements directly to your bank account.</p>
                </div>
              </div>

              {/* SECTION 2: BANK ACCOUNT (NEFT / IMPS / RTGS) */}
              <div className="pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">2. Bank Transfer Details (NEFT / IMPS / RTGS)</h3>
                </div>
                <p className="text-xs text-slate-600 mb-4">Shown on invoices for B2B clients who prefer direct bank deposits.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                      Bank Name
                    </label>
                    <input
                      name="bankName"
                      value={form.bankName}
                      onChange={handleChange}
                      placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                      className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                      Account Number
                    </label>
                    <input
                      name="accountNumber"
                      value={form.accountNumber}
                      onChange={handleChange}
                      placeholder="e.g. 50100456789012"
                      className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                      IFSC Code
                    </label>
                    <input
                      name="ifscCode"
                      value={form.ifscCode}
                      onChange={handleChange}
                      placeholder="e.g. HDFC0001234"
                      className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 font-mono uppercase transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: INTERNATIONAL CLIENT TRANSFERS (US / UK / EU / GLOBAL) */}
              <div className="pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">3. Cross-Border & International Payouts (US, UK, Global)</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    RBI & LUT Compliant
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  For US/UK/foreign clients who wire USD/EUR/GBP, or prefer paying via modern fintech rails (Wise, PayPal, Stripe, Skydo).
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                      SWIFT / BIC Code <span className="text-slate-500 font-normal">(For Bank Wires)</span>
                    </label>
                    <input
                      name="swiftCode"
                      value={form.swiftCode}
                      onChange={handleChange}
                      placeholder="e.g. HDFCINBBXXX or ICICINBBXXX"
                      className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 font-mono uppercase transition"
                    />
                    <p className="text-xs text-slate-500 mt-1">Ask your bank branch or check online for your bank&apos;s 8-11 character SWIFT code.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                      International Pay Link <span className="text-slate-500 font-normal">(Wise / PayPal / Stripe)</span>
                    </label>
                    <input
                      name="internationalPaymentLink"
                      value={form.internationalPaymentLink}
                      onChange={handleChange}
                      placeholder="https://wise.com/pay/... or https://paypal.me/..."
                      className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 font-mono transition"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Allows international clients to pay with 1 click using their card, Apple Pay, or bank. <strong className="text-emerald-700">Wise (wise.com/pay/me/...) is recommended</strong> for lowest ~0.5% forex fees.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900">Export of Service Notice:</strong> Under Section 16 of the IGST Act, cross-border freelance service earnings are zero-rated under LUT (Letter of Undertaking), with 0% GST liability. Money lands straight in your account.
                  </p>
                </div>
              </div>
            </section>

            <section className="premium-panel p-5 sm:p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">Business Address</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Displayed on your invoices</p>
              </div>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Tamil Nadu, India"
                rows="4"
                className="w-full rounded-xl bg-white border border-slate-300 p-4 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 min-h-[120px] resize-none transition"
              />
            </section>

            <section id="branding" className="premium-panel p-5 sm:p-8 scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">Logo</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Branding shown on invoices and PDFs</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                  Logo Dynamic URL
                </label>
                <input
                  name="logo"
                  value={form.logo}
                  onChange={handleChange}
                  placeholder="/logo.svg or https://cloud.com/your-logo.png"
                  className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition"
                />
                {logoInvalid && (
                  <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-bold text-red-600 max-w-md">
                    Logo URL looks unsafe for production. Use `/logo.svg` or a public `https://` image URL.
                  </div>
                )}
                <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md">
                   <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <p className="text-xs font-medium text-slate-600">Use /logo.svg for the bundled {COMPANY_SHORT_NAME} logo, or a high-res public PNG/SVG for custom branding.</p>
                </div>
              </div>
            </section>

            <section id="product-settings" className="premium-panel p-5 sm:p-8 scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Product Settings</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Control the main business modules</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {productSettings.map((setting) => (
                  <Link
                    key={setting.title}
                    to={setting.to}
                    className="group rounded-2xl border border-white/8 bg-black/20 p-5 transition-all hover:-translate-y-1 hover:border-yellow-300/30 hover:bg-white/[0.04]"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{setting.label}</p>
                        <h3 className="mt-2 text-lg font-black text-white">{setting.title}</h3>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                        setting.requiresPro && !isPro
                          ? 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300'
                          : 'border-emerald-400/15 bg-emerald-400/10 text-emerald-300'
                      }`}>
                        {setting.requiresPro && !isPro ? 'Locked' : setting.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-zinc-500">{setting.detail}</p>
                    {setting.requiresPro && !isPro && (
                      <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-yellow-300">
                        Unlock after Pro payment
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>

            <section id="automation-settings" className="premium-panel p-5 sm:p-8 scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Automation Settings</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">What ClientFlow AI handles for the user</p>
              </div>

              <div className="mb-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Device Reminder Automation</p>
                    <h3 className="mt-2 text-xl font-black text-white">Notify users when action is needed.</h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-50/70">
                      Sends browser/device alerts for unpaid invoices, lead follow-ups, proposal follow-ups, accepted proposals, project tasks, and plan expiry. It checks quietly while the app is open and avoids repeat spam.
                    </p>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-100/50">
                      Status: {deviceRemindersEnabled ? 'Enabled on this device' : notificationState === 'denied' ? 'Blocked by browser' : 'Not enabled'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                    <button
                      type="button"
                      onClick={enableDeviceReminders}
                      disabled={deviceRemindersEnabled || notificationState === 'denied'}
                      className="rounded-2xl bg-emerald-300 px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deviceRemindersEnabled ? 'Enabled' : 'Enable Alerts'}
                    </button>
                    <button
                      type="button"
                      onClick={disableDeviceReminders}
                      disabled={!deviceRemindersEnabled}
                      className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/5 rounded-2xl border border-white/8 bg-black/20">
                {automationSettings.map((setting) => (
                  <div key={setting.title} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white">{setting.title}</h3>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500">{setting.detail}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      setting.state === 'Paused'
                        ? 'border-yellow-400/20 bg-yellow-400/10 text-yellow-300'
                        : 'border-emerald-400/15 bg-emerald-400/10 text-emerald-300'
                    }`}>
                      {setting.state}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section id="security-settings" className="premium-panel p-5 sm:p-8 scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Security & Account</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Production safety settings</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { title: 'Private Dashboard', detail: 'Protected pages require login before business data loads.' },
                  { title: 'Safe Logo URLs', detail: 'Only local logo files or public https images are accepted.' },
                  { title: 'Payment Verification', detail: 'Paid status should come from verified payment flow, not manual guessing.' }
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                    <p className="text-sm font-black text-white">{item.title}</p>
                    <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="reveal reveal-delay-2 h-fit space-y-6">
            <div className="premium-panel p-5">
              <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Settings Menu</p>
              <div className="grid gap-2">
                {settingsNav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-400 transition-all hover:border-yellow-300/25 hover:bg-yellow-300/10 hover:text-yellow-200"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="premium-panel p-5 sm:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none group-hover:opacity-10 transition-opacity">
                 <svg className="h-20 w-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
              </div>
              
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-8 border-b border-white/5 pb-4">Live Preview Card</p>

              <div className="mb-8 flex h-40 items-center justify-center rounded-[2rem] border border-white/5 bg-black/40 overflow-hidden shadow-inner group/logo">
                {safeLogoPreviewUrl ? (
                  <img
                    src={safeLogoPreviewUrl}
                    alt="Logo preview"
                    className="h-24 w-24 object-contain transition-transform group-hover/logo:scale-110 duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                     <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                        <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Awaiting Asset</span>
                  </div>
                )}
              </div>

              <div className="mb-10 space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Company</p>
                  <p className="text-lg font-black text-white truncate">
                    {form.companyName || 'Apex Design Studio'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Tax ID</p>
                     <p className="text-xs font-bold text-white truncate">{form.gstNumber || '---'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">UPI Route</p>
                     <p className="text-xs font-bold text-yellow-300 truncate">{form.upiId || '---'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Bank A/C</p>
                     <p className="text-xs font-bold text-white truncate">{form.accountNumber ? `•••• ${form.accountNumber.slice(-4)}` : '---'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Intl Wire</p>
                     <p className="text-xs font-bold text-emerald-400 truncate">{form.swiftCode || (form.internationalPaymentLink ? 'Link Ready' : '---')}</p>
                   </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-5 rounded-2xl bg-yellow-400 text-black font-black text-lg shadow-xl shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
               <p className="text-xs font-medium text-zinc-500 leading-relaxed italic">
                 Changes made here will apply to future invoices. Existing invoices keep the business details they were created with.
               </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01]">
               <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">Email Diagnostics</p>
               <button
                 type="button"
                 onClick={sendTestEmail}
                 disabled={testingEmail}
                 className="btn btn-secondary w-full py-4 disabled:cursor-not-allowed disabled:opacity-60"
               >
                 {testingEmail ? 'Testing Email...' : 'Send Test Email'}
               </button>
               <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">
                 Sends a test email to your login email using the same backend settings as invoice reminders.
               </p>
            </div>
          </aside>
        </form>
      </main>
    </div>
  );
}
