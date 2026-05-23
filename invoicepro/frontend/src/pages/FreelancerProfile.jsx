import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import BrandLogo from '../components/BrandLogo';
import { COMPANY_SHORT_NAME } from '../utils/company';
import { getSafeRemoteImageUrl } from '../utils/safeUrl';
import useDocumentMeta from '../utils/useDocumentMeta';

const formatDate = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric'
  });
};

export default function FreelancerProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inquiryForm, setInquiryForm] = useState({
    contactName: '',
    email: '',
    phone: '',
    businessName: '',
    service: '',
    budget: '',
    timeline: '',
    projectNeed: ''
  });
  const [inquiryStatus, setInquiryStatus] = useState({
    loading: false,
    message: '',
    error: ''
  });

  useDocumentMeta(
    'Freelancer Profile | ClientFlow AI',
    'Public freelancer service profile powered by ClientFlow AI.',
    { path: `/f/${id}` }
  );

  useEffect(() => {
    let active = true;

    api.get(`/auth/public-profile/${id}`)
      .then((res) => {
        if (active) {
          setProfile(res.data?.profile || null);
        }
      })
      .catch(() => {
        if (active) {
          setError('This freelancer profile is not available.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const logoUrl = getSafeRemoteImageUrl(profile?.logo);
  const mailtoUrl = useMemo(() => {
    const subject = encodeURIComponent(`Project enquiry for ${profile?.displayName || 'your services'}`);
    const body = encodeURIComponent(
      `Hi ${profile?.name || 'there'},\n\nI saw your ClientFlow AI profile and want to discuss a project.\n\nProject need:\nBudget:\nTimeline:\n\nThanks.`
    );

    return profile?.email ? `mailto:${profile.email}?subject=${subject}&body=${body}` : '';
  }, [profile]);

  const updateInquiryField = (field, value) => {
    setInquiryForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const submitInquiry = async (event) => {
    event.preventDefault();

    try {
      setInquiryStatus({ loading: true, message: '', error: '' });

      const res = await api.post(`/leads/public-profile/${id}/enquiry`, {
        ...inquiryForm,
        budget: inquiryForm.budget ? Number(inquiryForm.budget) : 0
      });

      setInquiryStatus({
        loading: false,
        message: res.data?.message || 'Project enquiry sent.',
        error: ''
      });
      setInquiryForm({
        contactName: '',
        email: '',
        phone: '',
        businessName: '',
        service: '',
        budget: '',
        timeline: '',
        projectNeed: ''
      });
    } catch (err) {
      setInquiryStatus({
        loading: false,
        message: '',
        error: err?.response?.data?.message || 'Unable to send enquiry right now.'
      });
    }
  };

  if (loading) {
    return (
      <div className="premium-page min-h-screen text-white">
        <Navbar />
        <main className="container-custom flex min-h-[60vh] items-center justify-center py-16">
          <p className="text-sm font-black uppercase tracking-widest text-zinc-500">Loading profile...</p>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="premium-page min-h-screen text-white">
        <Navbar />
        <main className="container-custom py-16">
          <div className="premium-panel mx-auto max-w-xl p-8 text-center">
            <h1 className="text-3xl font-black text-white">Profile unavailable</h1>
            <p className="mt-3 text-sm font-semibold text-zinc-500">{error || 'This profile could not be loaded.'}</p>
            <Link to="/" className="btn btn-primary mt-6">Open ClientFlow AI</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-12 md:py-16">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)] lg:items-start">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                Direct client profile
              </span>
            </div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {logoUrl ? (
                <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white p-2">
                  <img src={logoUrl} alt={`${profile.displayName} logo`} className="h-full w-full object-contain" />
                </div>
              ) : (
                <BrandLogo showText={false} markClassName="h-20 w-20" />
              )}
              <div>
                <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                  {profile.displayName}
                </h1>
                <p className="mt-2 text-base font-semibold text-zinc-400">
                  Project workflow, proposal, invoice, and payment collection handled with {COMPANY_SHORT_NAME}.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['Scope clarity', 'Work starts with clear included and excluded items.'],
                ['Approval path', 'Proposals and changes are tracked before delivery.'],
                ['Payment ready', 'Invoices, payment links, and follow-ups are organized.']
              ].map(([title, detail]) => (
                <div key={title} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <h2 className="text-lg font-black text-white">{title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-500">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/8 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Contact</p>
            <h2 className="mt-2 text-2xl font-black text-white">Start a project enquiry</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-500">
              Share your project need, budget, and timeline. The enquiry becomes a saved lead in the freelancer workflow.
            </p>

            <form onSubmit={submitInquiry} className="mt-5 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <input
                  value={inquiryForm.contactName}
                  onChange={(event) => updateInquiryField('contactName', event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/50"
                  placeholder="Your name"
                />
                <input
                  type="email"
                  value={inquiryForm.email}
                  onChange={(event) => updateInquiryField('email', event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/50"
                  placeholder="Email"
                />
                <input
                  value={inquiryForm.phone}
                  onChange={(event) => updateInquiryField('phone', event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/50"
                  placeholder="Phone or WhatsApp"
                />
                <input
                  value={inquiryForm.businessName}
                  onChange={(event) => updateInquiryField('businessName', event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/50"
                  placeholder="Business name"
                />
                <input
                  value={inquiryForm.service}
                  onChange={(event) => updateInquiryField('service', event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/50"
                  placeholder="Service needed"
                />
                <input
                  type="number"
                  min="0"
                  value={inquiryForm.budget}
                  onChange={(event) => updateInquiryField('budget', event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/50"
                  placeholder="Budget"
                />
              </div>
              <input
                value={inquiryForm.timeline}
                onChange={(event) => updateInquiryField('timeline', event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/50"
                placeholder="Timeline"
              />
              <textarea
                value={inquiryForm.projectNeed}
                onChange={(event) => updateInquiryField('projectNeed', event.target.value)}
                rows={4}
                className="min-h-[112px] resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-yellow-300/50"
                placeholder="What do you need help with?"
              />

              {inquiryStatus.error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-bold leading-relaxed text-red-200">
                  {inquiryStatus.error}
                </div>
              )}

              {inquiryStatus.message && (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-xs font-bold leading-relaxed text-emerald-100">
                  {inquiryStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={inquiryStatus.loading}
                className="rounded-2xl bg-yellow-300 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-950 transition hover:bg-yellow-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inquiryStatus.loading ? 'Sending Enquiry...' : 'Send Project Enquiry'}
              </button>
            </form>

            {mailtoUrl && (
              <a href={mailtoUrl} className="mt-3 block rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-xs font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/[0.07] hover:text-white">
                Email Instead
              </a>
            )}
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Member since</p>
                <p className="mt-1 text-sm font-black text-white">{formatDate(profile.memberSince)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Billing readiness</p>
                <p className="mt-1 text-sm font-black text-white">{profile.gstReady ? 'GST-ready' : 'Invoice-ready'}</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Services</p>
              <h2 className="mt-2 text-2xl font-black text-white">A cleaner alternative to scattered freelance work</h2>
            </div>
            <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200">
              No marketplace dependency
            </span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(profile.services || []).map((service) => (
              <article key={service} className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
                <h3 className="text-base font-black text-white">{service}</h3>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-500">
                  Managed with a direct-client workflow: proposal, scope, approval, invoice, and payment status.
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
