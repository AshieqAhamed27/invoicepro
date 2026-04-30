import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { getSafeRemoteImageUrl } from '../utils/safeUrl';

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
        alert('Logo URL must be a public https URL (not localhost/private IP).');
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
            Manage the business details that appear on your invoices and payment pages.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10"
        >
          <div className="reveal reveal-delay-1 space-y-8">
            <section className="premium-panel p-5 sm:p-8 relative overflow-hidden group">
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

            <section className="premium-panel p-5 sm:p-8">
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

            <section className="premium-panel p-5 sm:p-8">
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
                    placeholder="https://cloud.com/your-logo.png"
                    className="input py-4 bg-black/20 border-white/5 focus:bg-black/60"
                  />
                  {logoInvalid && (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-[10px] font-bold text-red-300 max-w-md">
                      Logo URL looks unsafe for production. Use a public `https://` URL (not `localhost` or private IP).
                    </div>
                  )}
                  <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 max-w-md">
                     <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <p className="text-[10px] font-medium text-zinc-400">Pro Tip: Use a high-res PNG with a transparent background for best results.</p>
                  </div>
              </div>
            </section>
          </div>

          <aside className="reveal reveal-delay-2 space-y-6 xl:sticky xl:top-28 h-fit">
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
          </aside>
        </form>
      </main>
    </div>
  );
}
