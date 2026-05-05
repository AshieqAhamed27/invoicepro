import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackEvent } from '../utils/analytics';
import { getWhatsAppShareUrl } from '../utils/whatsapp';

const formatMoney = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;

const defaultForm = {
  service: '',
  skills: '',
  targetMarket: '',
  location: '',
  goal: '',
  projectPrice: '',
  experienceLevel: 'intermediate'
};

const requiredProfileFields = [
  { key: 'service', label: 'service' },
  { key: 'targetMarket', label: 'target client' },
  { key: 'location', label: 'location' }
];

const defaultLeadForm = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  linkedinUrl: '',
  instagramUrl: '',
  niche: '',
  pain: '',
  budget: '',
  urgency: 'normal'
};

const inputClass = 'input bg-black/25';
const actionLinkClass = 'flex min-h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:border-yellow-400/25 hover:bg-white/[0.08] hover:text-white';

const normalizeExternalUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

const getCleanPhone = (value = '') => String(value || '').replace(/\D/g, '');

const getLinkedInUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) return `https://www.linkedin.com/in/${trimmed.slice(1)}`;
  return normalizeExternalUrl(trimmed);
};

const getInstagramUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) return `https://www.instagram.com/${trimmed.slice(1)}`;
  return normalizeExternalUrl(trimmed);
};

const getBroadLeadQuery = (value = '') =>
  String(value || '')
    .replace(/\b(owner|founder|co-founder|ceo|director|manager|contact|email|phone|near|business)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getLeadSearchUrl = (platform = '', query = '') => {
  const name = String(platform || '').toLowerCase();

  if (name.includes('linkedin')) {
    const cleanQuery = getBroadLeadQuery(query) || String(query || '').trim();
    const linkedInGoogleQuery = `${cleanQuery} LinkedIn profiles companies`;
    return `https://www.google.com/search?q=${encodeURIComponent(linkedInGoogleQuery)}`;
  }

  const encoded = encodeURIComponent(query || '');

  if (name.includes('instagram')) {
    return `https://www.instagram.com/explore/search/keyword/?q=${encoded}`;
  }

  if (name.includes('map')) {
    return `https://www.google.com/maps/search/${encoded}`;
  }

  return `https://www.google.com/search?q=${encoded}`;
};

const getClientContext = (value = {}) => {
  return {
    service: String(value.service || '').trim(),
    skills: String(value.skills || '').trim(),
    targetMarket: String(value.targetMarket || '').trim(),
    location: String(value.location || '').trim(),
    goal: String(value.goal || '').trim(),
    projectPrice: String(value.projectPrice || '').trim(),
    experienceLevel: String(value.experienceLevel || 'intermediate').trim() || 'intermediate'
  };
};

const getMissingProfileFields = (context = {}) =>
  requiredProfileFields
    .filter((field) => !String(context[field.key] || '').trim())
    .map((field) => field.label);

const getRealLeadSources = (context = {}, plan = null) => {
  const niche = plan?.bestNiche || context.targetMarket;
  const location = context.location;
  const service = context.service;

  if (!niche || !location || !service) return [];

  return [
    {
      platform: 'Google Maps',
      query: `${niche} near ${location}`,
      note: 'Find active local businesses, call numbers, websites, and directions.'
    },
    {
      platform: 'LinkedIn',
      query: `${niche} ${location}`,
      note: 'Opens broader Google results for LinkedIn profiles and company pages so smaller local markets do not show empty results.'
    },
    {
      platform: 'Instagram',
      query: `${niche} ${location}`,
      note: 'Find businesses already posting but needing better enquiry flow.'
    },
    {
      platform: 'Google',
      query: `${niche} ${location} ${service} contact`,
      note: 'Find websites with contact pages and visible business problems.'
    }
  ];
};

const loadSavedLeads = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('invoicepro_growth_leads') || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
};

const getLeadFit = (lead, plan, form) => {
  const text = `${lead.businessName} ${lead.niche} ${lead.pain} ${lead.website} ${lead.linkedinUrl} ${lead.instagramUrl}`.toLowerCase();
  const targetText = `${plan?.bestNiche || ''} ${form.targetMarket || ''} ${form.service || ''}`.toLowerCase();
  const starterPrice = Number(plan?.starterOffer?.price || form.projectPrice || 0);
  const budget = Number(lead.budget || 0);
  const reasons = [];
  let score = 26;

  if (lead.businessName.trim()) {
    score += 10;
    reasons.push('Named business lead');
  }

  if (lead.email.trim()) {
    score += 10;
    reasons.push('Direct contact available');
  }

  if (getCleanPhone(lead.phone).length >= 10) {
    score += 12;
    reasons.push('Call or WhatsApp contact available');
  }

  if (lead.website.trim()) {
    score += 8;
    reasons.push('Online presence can be reviewed');
  }

  if (lead.linkedinUrl.trim() || lead.instagramUrl.trim()) {
    score += 10;
    reasons.push('Social profile available for direct message');
  }

  if (lead.pain.trim().length > 12) {
    score += 22;
    reasons.push('Clear business problem');
  }

  if (targetText && text && targetText.split(/\s+/).some((word) => word.length > 4 && text.includes(word))) {
    score += 12;
    reasons.push('Matches your chosen niche');
  }

  if (budget && starterPrice && budget >= starterPrice * 0.65) {
    score += 18;
    reasons.push('Budget can support a starter offer');
  } else if (budget) {
    score += 7;
    reasons.push('Budget known, but may need a smaller package');
  }

  if (lead.urgency === 'high') {
    score += 14;
    reasons.push('Urgent business need');
  } else if (lead.urgency === 'low') {
    score -= 6;
  }

  const finalScore = Math.max(5, Math.min(100, score));
  const label = finalScore >= 78 ? 'Hot lead' : finalScore >= 55 ? 'Good fit' : finalScore >= 35 ? 'Needs nurture' : 'Low fit';
  const toneClass = finalScore >= 78
    ? 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10'
    : finalScore >= 55
      ? 'text-yellow-300 border-yellow-400/20 bg-yellow-400/10'
      : 'text-zinc-300 border-white/10 bg-white/5';

  return {
    score: finalScore,
    label,
    toneClass,
    reasons: reasons.length ? reasons : ['Add pain, budget, website, and contact details to improve scoring'],
    nextStep: finalScore >= 70
      ? 'Send personalized outreach and offer a short discovery call.'
      : finalScore >= 45
        ? 'Ask one qualifying question before sending a proposal.'
        : 'Research more before spending time on this lead.'
  };
};

const buildLeadOutreach = (lead, plan, form) => {
  const name = lead.contactName || 'there';
  const business = lead.businessName || 'your business';
  const service = form.service || 'freelance services';
  const pain = lead.pain || plan?.positioning || 'improving enquiries and trust';
  const offer = plan?.starterOffer?.title || 'a focused starter package';

  return `Hi ${name}, I noticed ${business} could benefit from ${service}. ${pain}\n\nI can share 2 practical improvement ideas and, if useful, send a fixed-scope proposal for ${offer}.\n\nWould you like me to send the quick ideas?`;
};

const buildLeadProposalDraft = (lead, plan) => ({
  ...(plan?.proposalDraft || {}),
  documentType: 'proposal',
  sourceLeadId: lead?._id || '',
  clientName: lead?.businessName || lead?.contactName || plan?.proposalDraft?.clientName || '',
  clientEmail: lead?.email || plan?.proposalDraft?.clientEmail || '',
  serviceDescription: [
    plan?.starterOffer?.title || plan?.proposalDraft?.serviceDescription || 'Freelance service package',
    lead?.pain ? `Client problem: ${lead.pain}` : '',
    lead?.website ? `Reference: ${lead.website}` : ''
  ].filter(Boolean).join('. '),
  items: [{
    name: plan?.starterOffer?.title || 'Starter service package',
    price: Number(plan?.starterOffer?.price || plan?.proposalDraft?.items?.[0]?.price || 0)
  }],
  validUntil: plan?.proposalDraft?.validUntil,
  notes: lead?.budget
    ? `Lead budget signal: ${formatMoney(lead.budget)}. ${plan?.proposalDraft?.notes || ''}`.trim()
    : plan?.proposalDraft?.notes
});

const getLeadContactActions = (lead, message) => {
  const cleanPhone = getCleanPhone(lead?.phone);
  const linkedinUrl = getLinkedInUrl(lead?.linkedinUrl);
  const instagramUrl = getInstagramUrl(lead?.instagramUrl);
  const websiteUrl = normalizeExternalUrl(lead?.website);
  const email = String(lead?.email || '').trim();
  const actions = [];

  if (cleanPhone) {
    actions.push({ label: 'Call', href: `tel:${cleanPhone}` });
    actions.push({ label: 'WhatsApp', href: getWhatsAppShareUrl(message, cleanPhone), external: true });
  }

  if (email) {
    actions.push({
      label: 'Email',
      href: `mailto:${email}?subject=${encodeURIComponent('Quick idea for your business')}&body=${encodeURIComponent(message)}`
    });
  }

  if (linkedinUrl) actions.push({ label: 'LinkedIn', href: linkedinUrl, external: true });
  if (instagramUrl) actions.push({ label: 'Instagram', href: instagramUrl, external: true });
  if (websiteUrl) actions.push({ label: 'Website', href: websiteUrl, external: true });

  return actions;
};

export default function ClientFinder() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [leadForm, setLeadForm] = useState(defaultLeadForm);
  const [savedLeads, setSavedLeads] = useState(loadSavedLeads);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useDocumentMeta(
    'AI Client Finder for Freelancers | ClientFlow AI',
    'Find freelance client niches, outreach messages, service packages, and proposal drafts with ClientFlow AI.',
    { path: '/client-finder' }
  );

  useEffect(() => {
    const loadPipelineLeads = async () => {
      try {
        const res = await api.get('/leads');
        const pipelineLeads = Array.isArray(res.data?.leads) ? res.data.leads.slice(0, 12) : [];

        if (pipelineLeads.length) {
          setSavedLeads(pipelineLeads);
        }
      } catch { }
    };

    loadPipelineLeads();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateLeadField = (field, value) => {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const persistLeads = (nextLeads) => {
    setSavedLeads(nextLeads);
    try {
      localStorage.setItem('invoicepro_growth_leads', JSON.stringify(nextLeads));
    } catch { }
  };

  const generatePlan = async (event) => {
    event.preventDefault();
    const context = getClientContext(form);
    const missingFields = getMissingProfileFields(context);

    if (missingFields.length) {
      setFormError(`Fill ${missingFields.join(', ')} before generating the client plan.`);
      setPlan(null);
      return;
    }

    try {
      setLoading(true);
      setFormError('');
      const res = await api.post('/ai/client-finder', {
        context
      });

      setPlan(res.data?.plan || null);
      trackEvent('generate_client_finder_plan', {
        source: res.data?.source || 'unknown',
        service: context.service || 'not_set'
      });
    } catch (err) {
      alert(err.response?.data?.message || 'AI client finder failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text, label = 'Text') => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      trackEvent('copy_client_finder_text', { label });
      alert(`${label} copied.`);
    } catch {
      window.prompt(`Copy ${label}:`, text);
    }
  };

  const leadFit = plan ? getLeadFit(leadForm, plan, form) : null;
  const effectiveContext = getClientContext(form);
  const realLeadSources = getRealLeadSources(effectiveContext, plan);

  const saveLead = async () => {
    if (!leadForm.businessName.trim() && !leadForm.email.trim() && !leadForm.phone.trim() && !leadForm.website.trim()) {
      alert('Add business name, email, phone, or website.');
      return;
    }

    const nextLead = {
      ...leadForm,
      id: `${Date.now()}`,
      fitScore: leadFit?.score || 0,
      fitLabel: leadFit?.label || 'New lead',
      savedAt: new Date().toISOString()
    };

    try {
      const res = await api.post('/leads', {
        ...nextLead,
        source: 'client-finder'
      });
      const savedLead = res.data?.lead || nextLead;
      const nextLeads = [savedLead, ...savedLeads.filter((lead) => lead.email !== savedLead.email || !savedLead.email)].slice(0, 12);
      persistLeads(nextLeads);
      trackEvent('save_growth_lead', { fit_score: savedLead.fitScore || nextLead.fitScore });
      alert('Lead saved in your CRM pipeline.');
    } catch (err) {
      const nextLeads = [nextLead, ...savedLeads.filter((lead) => lead.email !== nextLead.email || !nextLead.email)].slice(0, 12);
      persistLeads(nextLeads);
      alert(err.response?.data?.message || 'Lead saved locally. Open Pipeline after backend deploy.');
    }
  };

  const saveLeadAsClient = async (lead = leadForm) => {
    if (!lead.businessName.trim() || !lead.email.trim()) {
      alert('Client name and email are required.');
      return;
    }

    try {
      if (lead._id) {
        await api.post(`/leads/${lead._id}/convert-client`);
      } else {
        await api.post('/clients', {
          name: lead.contactName || lead.businessName,
          email: lead.email,
          companyName: lead.businessName,
          address: '',
          gst: ''
        });
      }
      trackEvent('save_lead_as_client', { location: 'client_finder' });
      alert('Lead saved as client.');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save client.');
    }
  };

  const copyLeadOutreach = async (lead = leadForm) => {
    await copyText(buildLeadOutreach(lead, plan, form), 'Lead outreach');
  };

  const currentLeadActions = getLeadContactActions(leadForm, buildLeadOutreach(leadForm, plan, form));

  const startProposal = (lead = null) => {
    if (!plan?.proposalDraft) return;
    const selectedLead = lead && !lead.preventDefault ? lead : null;

    try {
      localStorage.setItem('invoicepro_ai_invoice_draft', JSON.stringify(buildLeadProposalDraft(selectedLead, plan)));
    } catch { }

    trackEvent('client_finder_start_proposal');
    navigate('/create-invoice?type=proposal');
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-10 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                AI Client Finder
              </p>
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find clients, pitch better, then turn work into invoices.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              ClientFlow AI now helps freelancers choose a profitable niche, generate outreach, package an offer, send a proposal, and collect payment from the same workflow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Find', value: 'Target clients' },
              { label: 'Pitch', value: 'AI messages' },
              { label: 'Close', value: 'Proposal + invoice' }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.label}</p>
                <p className="mt-2 text-lg font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className={plan ? 'grid gap-8' : 'grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]'}>
          <form
            onSubmit={generatePlan}
            className={`reveal reveal-delay-1 h-fit rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-7 ${plan ? '' : 'xl:sticky xl:top-28'}`}
          >
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Freelancer Profile</p>
              <h2 className="mt-2 text-2xl font-black text-white">Tell AI what you sell</h2>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">
                Fill service, target client, and location so the AI suggests correct client types and searches.
              </p>
            </div>

            <div className={plan ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-4'}>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Service</span>
                <input
                  value={form.service}
                  onChange={(event) => updateField('service', event.target.value)}
                  placeholder="Example: websites, logo design, video editing"
                  className={inputClass}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Skills / Outcome</span>
                <textarea
                  value={form.skills}
                  onChange={(event) => updateField('skills', event.target.value)}
                  rows={3}
                  placeholder="Example: React, landing pages, payment setup, SEO basics"
                  className={`${inputClass} min-h-[96px] resize-none`}
                />
              </label>

              <div className={plan ? 'grid gap-4 sm:grid-cols-2 xl:col-span-2' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-1'}>
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Market</span>
                  <input
                    value={form.targetMarket}
                    onChange={(event) => updateField('targetMarket', event.target.value)}
                    placeholder="Example: small businesses"
                    className={inputClass}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Location</span>
                  <input
                    value={form.location}
                    onChange={(event) => updateField('location', event.target.value)}
                    placeholder="Example: Tamil Nadu, India"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className={plan ? 'grid gap-4 sm:grid-cols-2 xl:col-span-2' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-1'}>
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Project Price</span>
                  <input
                    type="number"
                    min="0"
                    value={form.projectPrice}
                    onChange={(event) => updateField('projectPrice', event.target.value)}
                    placeholder="Example: 15000"
                    className={inputClass}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Experience</span>
                  <select
                    value={form.experienceLevel}
                    onChange={(event) => updateField('experienceLevel', event.target.value)}
                    className={inputClass}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="senior">Senior</option>
                    <option value="expert">Expert</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Goal</span>
                <input
                  value={form.goal}
                  onChange={(event) => updateField('goal', event.target.value)}
                  placeholder="Example: get 3 clients this month"
                  className={inputClass}
                />
              </label>
            </div>

            {formError && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                <p className="text-xs font-bold leading-relaxed text-red-200">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary mt-6 w-full px-6 py-4"
            >
              {loading ? 'Finding Clients...' : 'Generate Client Plan'}
            </button>

            <p className="mt-4 text-xs font-semibold leading-relaxed text-zinc-500">
              No fake clients are generated. The agent gives a plan and opens real public searches where you save actual prospects.
            </p>
          </form>

          <section className="reveal reveal-delay-1 min-w-0">
            {!plan ? (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center sm:p-12">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10">
                    <svg className="h-8 w-8 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-white">Fill the required profile first.</h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-relaxed text-zinc-500">
                    Add your service, target client, and location. Then AI can generate the right client plan instead of guessing wrong prospects.
                  </p>
                  <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                    {requiredProfileFields.map((field) => (
                      <div key={field.key} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Required</p>
                        <p className="mt-2 text-sm font-black capitalize text-white">{field.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {realLeadSources.length > 0 && (
                  <div className="rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[0.035] p-6 sm:p-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Real Client Searches</p>
                    <h3 className="mt-2 text-2xl font-black text-white">Open real public places to find prospects.</h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-400">
                      These links open real search results. Save only businesses you personally verify.
                    </p>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {realLeadSources.map((source) => (
                        <div key={`${source.platform}-${source.query}`} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{source.platform}</p>
                          <p className="mt-2 break-words text-sm font-black text-white">{source.query}</p>
                          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{source.note}</p>
                          <a
                            href={getLeadSearchUrl(source.platform, source.query)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${actionLinkClass} mt-4`}
                            onClick={() => trackEvent('open_default_real_lead_search', { platform: source.platform })}
                          >
                            Open Real Search
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[0.04] p-6 sm:p-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Best Positioning</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{plan.bestNiche}</h2>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">{plan.positioning}</p>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Starter Offer</p>
                      <p className="mt-2 text-lg font-black text-white">{plan.starterOffer?.title}</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-400">{plan.starterOffer?.promise}</p>
                      <p className="mt-4 text-3xl font-black text-emerald-300">{formatMoney(plan.starterOffer?.price)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startProposal()}
                      className="btn btn-primary px-6 py-4"
                    >
                      Start Proposal
                    </button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">
                        Client Operating System
                      </p>
                      <h3 className="mt-2 text-2xl font-black text-white">
                        {plan.growthSystem?.headline || 'Find, qualify, propose, invoice'}
                      </h3>
                    </div>
                    <p className="max-w-md text-xs font-semibold leading-relaxed text-zinc-500">
                      This keeps your growth workflow connected to proposals and invoices instead of becoming another generic lead list.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {(plan.growthSystem?.pipeline || []).map((stage, index) => (
                      <div key={`${stage.stage}-${index}`} className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/20 p-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400 text-xs font-black text-black">
                          {index + 1}
                        </span>
                        <p className="mt-4 text-sm font-black text-white">{stage.stage}</p>
                        <p className="mt-2 text-xs font-bold leading-relaxed text-zinc-500">{stage.goal}</p>
                        <p className="mt-3 text-xs font-semibold leading-relaxed text-yellow-100/70">{stage.action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[0.035] p-6 sm:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Real Client Searches</p>
                        <h3 className="mt-2 text-2xl font-black text-white">Find actual businesses, then save verified leads.</h3>
                      </div>
                      <p className="max-w-md text-xs font-semibold leading-relaxed text-zinc-500">
                        ClientFlow AI opens public search pages. It does not invent names, scrape private data, or auto-message people.
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {realLeadSources.map((source) => (
                        <div key={`${source.platform}-${source.query}`} className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{source.platform}</p>
                          <p className="mt-2 break-words text-sm font-black text-white">{source.query}</p>
                          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{source.note}</p>
                          <a
                            href={getLeadSearchUrl(source.platform, source.query)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${actionLinkClass} mt-auto`}
                            onClick={() => trackEvent('open_real_lead_search', { platform: source.platform })}
                          >
                            Open Real Search
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[0.035] p-6 sm:p-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">AI Lead Fit Radar</p>
                    <h3 className="mt-2 text-2xl font-black text-white">Score a real prospect before pitching.</h3>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Business Name</span>
                        <input
                          value={leadForm.businessName}
                          onChange={(event) => updateLeadField('businessName', event.target.value)}
                          placeholder="Example: ABC Dental Clinic"
                          className={inputClass}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contact Name</span>
                        <input
                          value={leadForm.contactName}
                          onChange={(event) => updateLeadField('contactName', event.target.value)}
                          placeholder="Owner / manager name"
                          className={inputClass}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Email</span>
                        <input
                          type="email"
                          value={leadForm.email}
                          onChange={(event) => updateLeadField('email', event.target.value)}
                          placeholder="client@example.com"
                          className={inputClass}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Phone</span>
                        <input
                          value={leadForm.phone}
                          onChange={(event) => updateLeadField('phone', event.target.value)}
                          placeholder="Example: 9876543210"
                          className={inputClass}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Website</span>
                        <input
                          value={leadForm.website}
                          onChange={(event) => updateLeadField('website', event.target.value)}
                          placeholder="https://business.com"
                          className={inputClass}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">LinkedIn</span>
                        <input
                          value={leadForm.linkedinUrl}
                          onChange={(event) => updateLeadField('linkedinUrl', event.target.value)}
                          placeholder="linkedin.com/company/name"
                          className={inputClass}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Instagram</span>
                        <input
                          value={leadForm.instagramUrl}
                          onChange={(event) => updateLeadField('instagramUrl', event.target.value)}
                          placeholder="@businessname"
                          className={inputClass}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Niche</span>
                        <input
                          value={leadForm.niche}
                          onChange={(event) => updateLeadField('niche', event.target.value)}
                          placeholder={plan.bestNiche || 'Target niche'}
                          className={inputClass}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Budget Signal</span>
                        <input
                          type="number"
                          min="0"
                          value={leadForm.budget}
                          onChange={(event) => updateLeadField('budget', event.target.value)}
                          placeholder={String(plan.starterOffer?.price || '')}
                          className={inputClass}
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pain / Opportunity</span>
                        <textarea
                          value={leadForm.pain}
                          onChange={(event) => updateLeadField('pain', event.target.value)}
                          rows={3}
                          placeholder="Example: Their website has no booking form and slow mobile loading."
                          className={`${inputClass} min-h-[96px] resize-none`}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Urgency</span>
                        <select
                          value={leadForm.urgency}
                          onChange={(event) => updateLeadField('urgency', event.target.value)}
                          className={inputClass}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lead Score</p>
                        <p className="mt-2 text-5xl font-black text-white">{leadFit?.score || 0}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${leadFit?.toneClass || 'border-white/10 text-zinc-400'}`}>
                        {leadFit?.label || 'Not scored'}
                      </span>
                    </div>

                    <p className="mt-4 text-sm font-semibold leading-relaxed text-zinc-400">
                      {leadFit?.nextStep}
                    </p>

                    <div className="mt-5 space-y-2">
                      {(leadFit?.reasons || []).map((reason) => (
                        <p key={reason} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-xs font-semibold text-zinc-400">
                          {reason}
                        </p>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => copyLeadOutreach()}
                        className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-sky-300 transition hover:bg-sky-400/15"
                      >
                        Copy Pitch
                      </button>
                      <button
                        type="button"
                        onClick={saveLead}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15"
                      >
                        Save Lead
                      </button>
                      <button
                        type="button"
                        onClick={() => saveLeadAsClient()}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10"
                      >
                        Save Client
                      </button>
                      <button
                        type="button"
                        onClick={() => startProposal(leadForm)}
                        className="btn btn-primary px-4 py-3 text-[10px]"
                      >
                        Create Proposal
                      </button>
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Direct Client Links</p>
                      {currentLeadActions.length ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {currentLeadActions.map((action) => (
                            <a
                              key={`${action.label}-${action.href}`}
                              href={action.href}
                              target={action.external ? '_blank' : undefined}
                              rel={action.external ? 'noopener noreferrer' : undefined}
                              className={actionLinkClass}
                              onClick={() => trackEvent('open_growth_lead_contact', { channel: action.label.toLowerCase() })}
                            >
                              {action.label}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-500">
                          Add phone, email, LinkedIn, Instagram, or website to message or call this prospect directly.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <h3 className="text-xl font-black text-white">Target Clients</h3>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(plan.targetClients || []).map((client, index) => (
                        <div key={`${client.segment}-${index}`} className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="text-sm font-black text-white">{client.segment}</p>
                          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{client.problem}</p>
                          <p className="mt-auto pt-3 text-xs font-bold text-emerald-300">{client.whereToFind}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <h3 className="text-xl font-black text-white">Lead Searches</h3>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(plan.leadSearches || []).map((lead, index) => (
                        <div
                          key={`${lead.platform}-${index}`}
                          className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/20 p-4"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{lead.platform}</p>
                          <p className="mt-2 break-words text-sm font-bold text-white">{lead.query}</p>
                          <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
                            <a
                              href={getLeadSearchUrl(lead.platform, lead.query)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={actionLinkClass}
                              onClick={() => trackEvent('open_lead_search', { platform: lead.platform })}
                            >
                              Open Search
                            </a>
                            <button
                              type="button"
                              onClick={() => copyText(lead.query, `${lead.platform} search`)}
                              className={actionLinkClass}
                            >
                              Copy Query
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
                  <h3 className="text-xl font-black text-white">Outreach Messages</h3>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {(plan.outreachMessages || []).map((message, index) => (
                      <div key={`${message.channel}-${index}`} className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/20 p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">{message.channel}</p>
                        <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-zinc-300">{message.text}</p>
                        <button
                          type="button"
                          onClick={() => copyText(message.text, `${message.channel} message`)}
                          className="mt-auto rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-sky-300 transition hover:bg-sky-400/15"
                        >
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <h3 className="text-xl font-black text-white">Packages</h3>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {(plan.packages || []).map((item) => (
                        <div key={item.name} className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/20 p-4">
                          <div className="flex h-full flex-col gap-4">
                            <div>
                              <p className="font-black text-white">{item.name}</p>
                              <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">{item.scope}</p>
                            </div>
                            <p className="mt-auto shrink-0 text-sm font-black text-emerald-300">{formatMoney(item.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <h3 className="text-xl font-black text-white">7-Day Action Plan</h3>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {(plan.weeklyPlan || []).map((step, index) => (
                        <div key={step} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-xs font-black text-black">
                            {index + 1}
                          </span>
                          <p className="text-sm font-semibold leading-relaxed text-zinc-300">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <h3 className="text-xl font-black text-white">Discovery Questions</h3>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {(plan.discoveryQuestions || []).map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => copyText(question, 'Discovery question')}
                          className="w-full rounded-2xl border border-white/8 bg-black/20 p-4 text-left text-sm font-semibold leading-relaxed text-zinc-300 transition hover:bg-white/[0.06]"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <h3 className="text-xl font-black text-white">Objection Replies</h3>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {(plan.objectionHandlers || []).map((item) => (
                        <div key={item.objection} className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="text-sm font-black text-white">{item.objection}</p>
                          <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">{item.response}</p>
                          <button
                            type="button"
                            onClick={() => copyText(item.response, 'Objection reply')}
                            className="mt-auto rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/15"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <h3 className="text-xl font-black text-white">Qualification Scorecard</h3>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {(plan.qualificationScorecard || []).map((item) => (
                        <div key={item.criterion} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="text-sm font-black text-white">{item.criterion}</p>
                          <p className="mt-2 text-xs font-semibold leading-relaxed text-emerald-200/80">Strong: {item.strongSignal}</p>
                          <p className="mt-1 text-xs font-semibold leading-relaxed text-red-200/70">Weak: {item.weakSignal}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-xl font-black text-white">Saved Growth Leads</h3>
                      <button
                        type="button"
                        onClick={() => navigate('/leads')}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15"
                      >
                        Open Pipeline
                      </button>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {savedLeads.length ? (
                        savedLeads.map((lead) => {
                          const contactActions = getLeadContactActions(lead, buildLeadOutreach(lead, plan, form));
                          const leadId = lead._id || lead.id || `${lead.email}-${lead.businessName}`;

                          return (
                            <div key={leadId} className="flex h-full flex-col rounded-2xl border border-white/8 bg-black/20 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-white">{lead.businessName || lead.contactName || lead.email}</p>
                                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                    {lead.fitLabel} / Score {lead.fitScore}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startProposal(lead)}
                                  className="shrink-0 rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/15"
                                >
                                  Proposal
                                </button>
                              </div>
                              {lead.pain && (
                                <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-500">{lead.pain}</p>
                              )}
                              <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => copyLeadOutreach(lead)}
                                  className={actionLinkClass}
                                >
                                  Copy Pitch
                                </button>
                                {lead.email && (
                                  <button
                                    type="button"
                                    onClick={() => saveLeadAsClient(lead)}
                                    className={actionLinkClass}
                                  >
                                    Save Client
                                  </button>
                                )}
                              </div>

                              {contactActions.length > 0 && (
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {contactActions.map((action) => (
                                    <a
                                      key={`${leadId}-${action.label}-${action.href}`}
                                      href={action.href}
                                      target={action.external ? '_blank' : undefined}
                                      rel={action.external ? 'noopener noreferrer' : undefined}
                                      className={actionLinkClass}
                                      onClick={() => trackEvent('open_saved_growth_lead_contact', { channel: action.label.toLowerCase() })}
                                    >
                                      {action.label}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-white/8 bg-black/20 p-6 text-center md:col-span-2">
                          <p className="text-sm font-bold text-zinc-400">No growth leads saved yet.</p>
                          <p className="mt-2 text-xs font-semibold text-zinc-600">Score a prospect above and save it to keep your pipeline moving.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-yellow-400/15 bg-yellow-400/[0.04] p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Safe Growth Rules</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {(plan.guardrails || []).map((rule) => (
                      <p key={rule} className="rounded-2xl border border-white/8 bg-black/20 p-4 text-xs font-semibold leading-relaxed text-zinc-400">
                        {rule}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
