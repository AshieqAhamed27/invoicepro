import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackEvent } from '../utils/analytics';
import { getWhatsAppShareUrl } from '../utils/whatsapp';

const statusConfig = [
  { id: 'new', label: 'New', tone: 'border-sky-400/20 bg-sky-400/[0.05] text-sky-300' },
  { id: 'contacted', label: 'Contacted', tone: 'border-yellow-400/20 bg-yellow-400/[0.05] text-yellow-300' },
  { id: 'interested', label: 'Interested', tone: 'border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-300' },
  { id: 'proposal_sent', label: 'Proposal Sent', tone: 'border-purple-400/20 bg-purple-400/[0.05] text-purple-300' },
  { id: 'won', label: 'Won', tone: 'border-green-400/20 bg-green-400/[0.05] text-green-300' },
  { id: 'lost', label: 'Lost', tone: 'border-red-400/20 bg-red-400/[0.05] text-red-300' }
];

const defaultForm = {
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
  urgency: 'normal',
  nextFollowUpAt: ''
};

const inputClass = 'input bg-black/25';
const smallActionClass = 'rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:border-emerald-400/25 hover:bg-white/[0.08] hover:text-white';

const getCleanPhone = (value = '') => String(value || '').replace(/\D/g, '');

const normalizeExternalUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

const formatMoney = (amount) =>
  Number(amount || 0) > 0 ? `Rs ${Number(amount || 0).toLocaleString('en-IN')}` : 'Budget unknown';

const formatDate = (value) => {
  if (!value) return 'No follow-up';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No follow-up';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const toDateInput = (daysFromNow = 2) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

const isDue = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return date <= todayEnd;
};

const getLeadName = (lead = {}) =>
  lead.businessName || lead.contactName || lead.email || lead.phone || 'Unnamed lead';

const buildPitch = (lead = {}) => {
  const name = lead.contactName || 'there';
  const business = lead.businessName || 'your business';
  const niche = lead.niche || 'your service business';
  const pain = lead.pain
    ? `I noticed one possible opportunity: ${lead.pain}`
    : 'I noticed there may be a chance to improve enquiries, trust, or follow-up.';

  return `Hi ${name}, I found ${business} while researching ${niche}. ${pain}\n\nI can share 2 quick improvement ideas. If useful, I can send a simple fixed-price proposal after that.\n\nWould you like me to send the ideas?`;
};

const buildProposalDraft = (lead = {}) => {
  const validUntil = toDateInput(7);
  const price = Number(lead.budget || 0) || 4999;

  return {
    documentType: 'proposal',
    sourceLeadId: lead._id || '',
    clientName: lead.businessName || lead.contactName || '',
    clientEmail: lead.email || '',
    serviceDescription: [
      lead.niche ? `Proposal for ${lead.niche}` : 'Proposal for professional services',
      lead.pain ? `Client opportunity: ${lead.pain}` : ''
    ].filter(Boolean).join('. '),
    items: [
      {
        name: lead.niche ? `${lead.niche} starter package` : 'Starter service package',
        price
      }
    ],
    validUntil,
    notes: 'Created from InvoicePro lead pipeline.'
  };
};

const getContactActions = (lead = {}) => {
  const pitch = buildPitch(lead);
  const phone = getCleanPhone(lead.phone);
  const email = String(lead.email || '').trim();
  const actions = [];

  if (phone) {
    actions.push({ label: 'Call', href: `tel:${phone}` });
    actions.push({ label: 'WhatsApp', href: getWhatsAppShareUrl(pitch, phone), external: true });
  }

  if (email) {
    actions.push({
      label: 'Email',
      href: `mailto:${email}?subject=${encodeURIComponent('Quick idea for your business')}&body=${encodeURIComponent(pitch)}`
    });
  }

  if (lead.linkedinUrl) actions.push({ label: 'LinkedIn', href: normalizeExternalUrl(lead.linkedinUrl), external: true });
  if (lead.instagramUrl) actions.push({ label: 'Instagram', href: normalizeExternalUrl(lead.instagramUrl), external: true });
  if (lead.website) actions.push({ label: 'Website', href: normalizeExternalUrl(lead.website), external: true });

  return actions;
};

export default function LeadPipeline() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useDocumentMeta(
    'Lead CRM Pipeline | InvoicePro',
    'Track freelance leads from first search to proposal, client conversion, and invoice workflow in InvoicePro.',
    { path: '/leads' }
  );

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leads');
      setLeads(Array.isArray(res.data?.leads) ? res.data.leads : []);
      setStats(res.data?.stats || {});
    } catch (err) {
      alert(err.response?.data?.message || 'Could not load leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const groupedLeads = useMemo(() => {
    const next = statusConfig.reduce((acc, status) => {
      acc[status.id] = [];
      return acc;
    }, {});

    leads.forEach((lead) => {
      const status = next[lead.status] ? lead.status : 'new';
      next[status].push(lead);
    });

    return next;
  }, [leads]);

  const dueLeads = useMemo(
    () => leads.filter((lead) => !['won', 'lost'].includes(lead.status) && isDue(lead.nextFollowUpAt)).slice(0, 5),
    [leads]
  );

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateLeadLocally = (updatedLead) => {
    setLeads((prev) => prev.map((lead) => (lead._id === updatedLead._id ? updatedLead : lead)));
  };

  const createLead = async (event) => {
    event.preventDefault();

    if (!form.businessName.trim() && !form.email.trim() && !form.phone.trim() && !form.website.trim()) {
      alert('Add business name, email, phone, or website.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/leads', {
        ...form,
        source: 'pipeline',
        budget: Number(form.budget || 0)
      });

      setLeads((prev) => [res.data.lead, ...prev]);
      setForm(defaultForm);
      trackEvent('create_pipeline_lead');
      await loadLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save lead.');
    } finally {
      setSaving(false);
    }
  };

  const patchLead = async (lead, updates) => {
    try {
      const res = await api.patch(`/leads/${lead._id}`, updates);
      updateLeadLocally(res.data.lead);
      trackEvent('update_pipeline_lead', { status: updates.status || lead.status });
      return res.data.lead;
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update lead.');
      return null;
    }
  };

  const moveLead = async (lead, direction = 1) => {
    const index = statusConfig.findIndex((status) => status.id === lead.status);
    const nextStatus = statusConfig[Math.max(0, Math.min(statusConfig.length - 1, index + direction))]?.id || 'new';
    await patchLead(lead, { status: nextStatus });
    await loadLeads();
  };

  const markContacted = async (lead) => {
    await patchLead(lead, {
      status: lead.status === 'new' ? 'contacted' : lead.status,
      lastContactedAt: new Date().toISOString(),
      nextFollowUpAt: toDateInput(2)
    });
    await loadLeads();
  };

  const copyPitch = async (lead) => {
    const pitch = buildPitch(lead);

    try {
      await navigator.clipboard.writeText(pitch);
      trackEvent('copy_pipeline_pitch');
      alert('Pitch copied.');
    } catch {
      window.prompt('Copy pitch:', pitch);
    }
  };

  const createProposal = async (lead) => {
    try {
      localStorage.setItem('invoicepro_ai_invoice_draft', JSON.stringify(buildProposalDraft(lead)));
      await patchLead(lead, { status: 'proposal_sent' });
    } catch { }

    navigate('/create-invoice?type=proposal');
  };

  const convertToClient = async (lead) => {
    if (!lead.email || !(lead.businessName || lead.contactName)) {
      alert('Add lead name and email before converting to client.');
      return;
    }

    try {
      const res = await api.post(`/leads/${lead._id}/convert-client`);
      updateLeadLocally(res.data.lead);
      trackEvent('convert_pipeline_lead_client');
      alert('Lead converted to client.');
      await loadLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not convert lead.');
    }
  };

  const deleteLead = async (lead) => {
    if (!window.confirm(`Delete ${getLeadName(lead)} from pipeline?`)) return;

    try {
      await api.delete(`/leads/${lead._id}`);
      setLeads((prev) => prev.filter((item) => item._id !== lead._id));
      await loadLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete lead.');
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Lead CRM Pipeline</p>
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn searched prospects into paying clients.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              Save verified leads, follow up from one place, create proposals, and convert won deals into clients.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/client-finder" className="btn btn-secondary px-6 py-3">
              Find More Leads
            </Link>
            <Link to="/create-invoice?type=proposal" className="btn btn-primary px-6 py-3">
              New Proposal
            </Link>
          </div>
        </section>

        <section className="reveal reveal-delay-1 mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Leads', value: stats.total || leads.length },
            { label: 'Follow-ups Due', value: stats.followUpsDue || 0 },
            { label: 'Interested', value: stats.interested || 0 },
            { label: 'Won Clients', value: stats.won || 0 }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.label}</p>
              <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="reveal reveal-delay-2 mb-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <form onSubmit={createLead} className="premium-panel p-5 sm:p-8">
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Add Verified Lead</p>
              <h2 className="mt-2 text-2xl font-black text-white">Save a real prospect</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Business Name</span>
                <input value={form.businessName} onChange={(event) => updateField('businessName', event.target.value)} className={inputClass} placeholder="ABC Dental Clinic" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contact Name</span>
                <input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} className={inputClass} placeholder="Owner name" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Email</span>
                <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className={inputClass} placeholder="client@example.com" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Phone / WhatsApp</span>
                <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className={inputClass} placeholder="9876543210" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Website</span>
                <input value={form.website} onChange={(event) => updateField('website', event.target.value)} className={inputClass} placeholder="business.com" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">LinkedIn</span>
                <input value={form.linkedinUrl} onChange={(event) => updateField('linkedinUrl', event.target.value)} className={inputClass} placeholder="linkedin.com/company/name" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Instagram</span>
                <input value={form.instagramUrl} onChange={(event) => updateField('instagramUrl', event.target.value)} className={inputClass} placeholder="@businessname" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Niche</span>
                <input value={form.niche} onChange={(event) => updateField('niche', event.target.value)} className={inputClass} placeholder="Dental clinics in Tenkasi" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Budget Signal</span>
                <input type="number" min="0" value={form.budget} onChange={(event) => updateField('budget', event.target.value)} className={inputClass} placeholder="4999" />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Follow-up Date</span>
                <input type="date" value={form.nextFollowUpAt} onChange={(event) => updateField('nextFollowUpAt', event.target.value)} className={inputClass} />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pain / Opportunity</span>
                <textarea value={form.pain} onChange={(event) => updateField('pain', event.target.value)} rows={3} className={`${inputClass} min-h-[96px] resize-none`} placeholder="No WhatsApp button, weak offer, slow mobile page..." />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Urgency</span>
                <select value={form.urgency} onChange={(event) => updateField('urgency', event.target.value)} className={inputClass}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <button type="submit" disabled={saving} className="btn btn-primary mt-6 w-full px-6 py-4 sm:w-auto">
              {saving ? 'Saving...' : 'Save Lead'}
            </button>
          </form>

          <aside className="premium-panel p-5 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Today Queue</p>
            <h2 className="mt-2 text-2xl font-black text-white">Follow-ups due</h2>
            <div className="mt-5 space-y-3">
              {dueLeads.length ? dueLeads.map((lead) => (
                <div key={lead._id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="truncate text-sm font-black text-white">{getLeadName(lead)}</p>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">{formatDate(lead.nextFollowUpAt)}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <button type="button" onClick={() => copyPitch(lead)} className={smallActionClass}>Copy Pitch</button>
                    <button type="button" onClick={() => markContacted(lead)} className={smallActionClass}>Done</button>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/8 bg-black/20 p-5 text-center">
                  <p className="text-sm font-bold text-zinc-400">No follow-ups due today.</p>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="reveal reveal-delay-3">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-52 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-6">
              {statusConfig.map((status) => (
                <div key={status.id} className={`min-h-[220px] rounded-2xl border p-3 ${status.tone}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-widest">{status.label}</p>
                    <span className="rounded-full bg-black/25 px-2 py-1 text-[10px] font-black">
                      {groupedLeads[status.id]?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(groupedLeads[status.id] || []).map((lead) => {
                      const actions = getContactActions(lead);

                      return (
                        <article key={lead._id} className="flex min-h-[240px] flex-col rounded-2xl border border-white/10 bg-[#080b10]/90 p-4 text-white shadow-xl shadow-black/20">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black text-white">{getLeadName(lead)}</h3>
                              <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-zinc-600">{lead.niche || 'No niche'}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${lead.urgency === 'high' ? 'border-red-400/30 text-red-300' : 'border-white/10 text-zinc-500'}`}>
                              {lead.urgency || 'normal'}
                            </span>
                          </div>

                          <p className="mt-3 line-clamp-3 text-xs font-semibold leading-relaxed text-zinc-400">
                            {lead.pain || 'Add pain or opportunity so the pitch becomes sharper.'}
                          </p>

                          <div className="mt-4 grid gap-2">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Budget</span>
                              <span className="text-xs font-black text-emerald-300">{formatMoney(lead.budget)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Follow-up</span>
                              <span className={`text-xs font-black ${isDue(lead.nextFollowUpAt) ? 'text-yellow-300' : 'text-zinc-400'}`}>{formatDate(lead.nextFollowUpAt)}</span>
                            </div>
                          </div>

                          {actions.length > 0 && (
                            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                              {actions.slice(0, 4).map((action) => (
                                <a
                                  key={`${lead._id}-${action.label}`}
                                  href={action.href}
                                  target={action.external ? '_blank' : undefined}
                                  rel={action.external ? 'noopener noreferrer' : undefined}
                                  className={smallActionClass}
                                  onClick={() => trackEvent('open_pipeline_contact', { channel: action.label.toLowerCase() })}
                                >
                                  {action.label}
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="mt-auto grid gap-2 pt-4">
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => copyPitch(lead)} className={smallActionClass}>Copy Pitch</button>
                              <button type="button" onClick={() => markContacted(lead)} className={smallActionClass}>Followed</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => moveLead(lead, -1)} className={smallActionClass}>Back</button>
                              <button type="button" onClick={() => moveLead(lead, 1)} className={smallActionClass}>Next</button>
                            </div>
                            <button type="button" onClick={() => createProposal(lead)} className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-300 transition hover:bg-yellow-400/15">
                              Create Proposal
                            </button>
                            <button type="button" onClick={() => convertToClient(lead)} className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-400/15">
                              Convert Client
                            </button>
                            <button type="button" onClick={() => deleteLead(lead)} className="rounded-lg border border-red-400/15 bg-red-400/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-400/10">
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}

                    {!groupedLeads[status.id]?.length && (
                      <div className="rounded-2xl border border-white/8 bg-black/20 p-5 text-center">
                        <p className="text-xs font-bold text-zinc-400">No leads here.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
