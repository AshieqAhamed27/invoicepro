import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';

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
        address: user.address || '',
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

      const res = await api.put('/auth/profile', form);

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
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10">
        <div className="reveal mb-8">
          <p className="mb-2 text-sm font-semibold text-yellow-300">Business profile</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Company Settings
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Save the business details that should appear on your invoices.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1fr_280px]"
        >
          <div className="reveal reveal-delay-1 surface overflow-hidden">
            <section className="border-b border-white/10 p-5">
              <h2 className="mb-4 text-lg">Identity</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="Company name"
                  className="input"
                />

                <input
                  name="gstNumber"
                  value={form.gstNumber}
                  onChange={handleChange}
                  placeholder="GST number"
                  className="input"
                />
              </div>
            </section>

            <section className="border-b border-white/10 p-5">
              <h2 className="mb-4 text-lg">Payment</h2>

              <input
                name="upiId"
                value={form.upiId}
                onChange={handleChange}
                placeholder="UPI ID"
                className="input"
              />
            </section>

            <section className="border-b border-white/10 p-5">
              <h2 className="mb-4 text-lg">Address</h2>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Company address"
                rows="4"
                className="input resize-y"
              />
            </section>

            <section className="p-5">
              <h2 className="mb-4 text-lg">Logo</h2>

              <input
                name="logo"
                value={form.logo}
                onChange={handleChange}
                placeholder="Logo URL"
                className="input"
              />
            </section>
          </div>

          <aside className="reveal reveal-delay-2 h-fit rounded-lg border border-white/10 bg-zinc-950/85 p-5 shadow-xl shadow-black/20 lg:sticky lg:top-24">
            <p className="mb-4 text-sm font-semibold text-zinc-400">Preview</p>

            <div className="mb-5 flex h-28 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
              {form.logo ? (
                <img
                  src={form.logo}
                  alt="Logo preview"
                  className="h-20 w-20 rounded-lg object-contain"
                />
              ) : (
                <span className="text-sm text-zinc-500">No logo URL</span>
              )}
            </div>

            <div className="mb-6 space-y-2 text-sm">
              <p className="font-semibold text-white">
                {form.companyName || 'Company name'}
              </p>
              <p>{form.gstNumber || 'GST number'}</p>
              <p>{form.upiId || 'UPI ID'}</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}
