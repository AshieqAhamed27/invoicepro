import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { getSafeRemoteImageUrl } from '../utils/safeUrl';
import { COMPANY_SHORT_NAME } from '../utils/company';

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
    status: 'Live',
    to: '/payment'
  },
  {
    label: 'Client Growth',
    title: 'Client Finder + Lead Pipeline',
    detail: 'Find real prospects, save leads, prepare follow-ups, and convert accepted work into invoices.',
    status: 'Live',
    to: '/client-finder'
  },
  {
    label: 'Recurring Revenue',
    title: 'Monthly Client System',
    detail: 'Manage repeat billing ideas and recurring client opportunities from one place.',
    status: 'Ready',
    to: '/recurring'
  },
  {
    label: 'Trust Center',
    title: 'Company Setup Checklist',
    detail: 'Review launch readiness, policies, business registration notes, payments, and product operations.',
    status: 'Ready',
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
    title: 'Email Reminders',
    detail: 'Paused until a verified sending domain is connected. WhatsApp sharing remains available.',
    state: 'Paused'
  }
];

export default function Settings() {
  const [form, setForm] = useState({
    companyName: '',
    gstNumber: '',
    upiId: '',
    address: '',
    logo: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

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
        address: user.address || 'Tamil Nadu, India',
        logo: user.logo || ''
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
      <div className="flex min-h-screen items-center justify-center bg-[#07090d] text-white">
        <div className="flex flex-col items-center gap-4">
           <div className="h-10 w-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Decrypting Profile</p>
        </div>
      </div>
    );
  }

  const safeLogoPreviewUrl = getSafeRemoteImageUrl(form.logo);
  const logoInvalid = Boolean(String(form.logo || '').trim()) && !safeLogoPreviewUrl;

  return (
    <div className="premium-page min-h-screen text-white">
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
          className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10"
        >
          <div className="reveal reveal-delay-1 space-y-8">
            <section id="business-profile" className="premium-panel p-5 sm:p-8 relative overflow-hidden group scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Business Details</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Your public invoicing identity</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Company Registered Name</p>
                    <input
                      name="companyName"
                      value={form.companyName}
                      onChange={handleChange}
                      placeholder="e.g. Apex Design Studio"
                      className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">GST Identification Number</p>
                    <input
                      name="gstNumber"
                      value={form.gstNumber}
                      onChange={handleChange}
                      placeholder="Optional GSTIN"
                      className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                    />
                </div>
              </div>
            </section>

            <section id="payment-setup" className="premium-panel p-5 sm:p-8 scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Payment Details</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Where clients should send payment</p>
              </div>

              <div className="space-y-1.5 max-w-md">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Default UPI ID</p>
                  <input
                    name="upiId"
                    value={form.upiId}
                    onChange={handleChange}
                    placeholder="e.g. success@upi"
                    className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                  />
                  <p className="text-[10px] text-zinc-500 mt-2 font-medium italic">This will be the primary destination for all client settlements.</p>
              </div>
            </section>

            <section className="premium-panel p-5 sm:p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Business Address</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Displayed on your invoices</p>
              </div>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Tamil Nadu, India"
                rows="4"
                className="input resize-none py-4 bg-black/20 border-white/5 focus:bg-black/60 min-h-[120px]"
              />
            </section>

            <section id="branding" className="premium-panel p-5 sm:p-8 scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Logo</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Branding shown on invoices and PDFs</p>
              </div>

              <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Logo Dynamic URL</p>
                  <input
                    name="logo"
                    value={form.logo}
                    onChange={handleChange}
                    placeholder="/logo.svg or https://cloud.com/your-logo.png"
                    className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                  />
                  {logoInvalid && (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-[10px] font-bold text-red-300 max-w-md">
                      Logo URL looks unsafe for production. Use `/logo.svg` or a public `https://` image URL.
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 max-w-md">
                     <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <p className="text-[10px] font-medium text-zinc-400">Use /logo.svg for the bundled {COMPANY_SHORT_NAME} logo, or a high-res public PNG/SVG for custom branding.</p>
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
                      <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                        {setting.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-zinc-500">{setting.detail}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section id="automation-settings" className="premium-panel p-5 sm:p-8 scroll-mt-28">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white leading-none mb-1">Automation Settings</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">What ClientFlow AI handles for the user</p>
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

          <aside className="reveal reveal-delay-2 space-y-6 xl:sticky xl:top-28 h-fit">
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
