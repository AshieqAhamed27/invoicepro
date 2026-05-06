import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { trackEvent } from '../utils/analytics';

const currencyOptions = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'];

const defaultForm = {
  proposalType: 'Service Proposal',
  clientName: '',
  clientEmail: '',
  clientIndustry: '',
  projectTitle: '',
  services: '',
  goals: '',
  timeline: '',
  budget: '',
  currency: 'INR',
  tone: 'professional',
  projectBrief: '',
  rfpText: ''
};

const requiredFields = [
  { key: 'clientName', label: 'client name' },
  { key: 'projectTitle', label: 'project title' },
  { key: 'services', label: 'services' },
  { key: 'goals', label: 'client goal' }
];

const formatMoney = (amount, currency = 'INR') => {
  const code = currencyOptions.includes(currency) ? currency : 'INR';
  const prefix = code === 'INR' ? 'Rs ' : `${code} `;
  return `${prefix}${Number(amount || 0).toLocaleString(code === 'INR' ? 'en-IN' : 'en-US')}`;
};

const sectionText = (proposal) => {
  if (!proposal) return '';

  const lines = [
    proposal.title,
    '',
    'Executive Summary',
    proposal.executiveSummary,
    '',
    'Problem Statement',
    proposal.problemStatement,
    '',
    'Proposed Solution',
    proposal.proposedSolution,
    '',
    'Scope',
    ...(proposal.scopeItems || []).map((item, index) => `${index + 1}. ${item.title}: ${item.detail}`),
    '',
    'Timeline',
    ...(proposal.timeline || []).map((item) => `${item.phase} (${item.duration}): ${item.work}`),
    '',
    'Pricing',
    `Total: ${formatMoney(proposal.pricing?.total, proposal.pricing?.currency)}`,
    ...(proposal.pricing?.breakdown || []).map((item) => `${item.label}: ${formatMoney(item.amount, proposal.pricing?.currency)}`),
    `Payment terms: ${proposal.pricing?.paymentTerms || ''}`,
    '',
    'Why Us',
    ...(proposal.whyUs || []).map((item) => `- ${item}`),
    '',
    'Assumptions',
    ...(proposal.assumptions || []).map((item) => `- ${item}`),
    '',
    'Risks and Mitigation',
    ...(proposal.risks || []).map((item) => `- ${item.risk}: ${item.mitigation}`),
    '',
    'Closing',
    proposal.closingMessage
  ];

  return lines.filter((line) => line !== undefined && line !== null).join('\n');
};

export default function ProposalWriter() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    try {
      return {
        ...defaultForm,
        ...JSON.parse(localStorage.getItem('clientflow_proposal_writer_form') || '{}')
      };
    } catch {
      return defaultForm;
    }
  });
  const [proposal, setProposal] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clientflow_proposal_writer_result') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const missingFields = useMemo(() => (
    requiredFields
      .filter((field) => !String(form[field.key] || '').trim())
      .map((field) => field.label)
  ), [form]);

  const handleChange = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    try {
      localStorage.setItem('clientflow_proposal_writer_form', JSON.stringify(nextForm));
    } catch { }
  };

  const generateProposal = async () => {
    if (missingFields.length) {
      setError(`Fill ${missingFields.join(', ')} before generating.`);
      setProposal(null);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.post('/ai/proposal-writer', { context: form });
      const nextProposal = res.data?.proposal || null;
      setProposal(nextProposal);
      try {
        localStorage.setItem('clientflow_proposal_writer_result', JSON.stringify(nextProposal));
      } catch { }
      trackEvent('generate_proposal_writer', {
        source: res.data?.source || 'unknown',
        proposal_type: form.proposalType,
        currency: form.currency
      });
    } catch (err) {
      setError(err?.friendlyMessage || err?.response?.data?.message || 'Proposal writer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1800);
      trackEvent('copy_proposal_writer_text', { label });
    } catch {
      window.prompt('Copy this text:', text);
    }
  };

  const createProposalDraft = () => {
    if (!proposal?.proposalDraft) return;

    try {
      localStorage.setItem('invoicepro_ai_invoice_draft', JSON.stringify(proposal.proposalDraft));
    } catch { }

    trackEvent('proposal_writer_create_proposal');
    navigate('/create-invoice?type=proposal');
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-sky-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">AI Proposal & RFP Writing Agent</span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              Write stronger proposals and RFP responses in minutes.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-medium leading-relaxed text-zinc-500 sm:text-lg">
              Turn client requirements into executive summary, scope, timeline, pricing, risks, questions, and a ready proposal draft for ClientFlow AI.
            </p>
          </div>

          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Best For</p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              Freelancers, agencies, consultants, developers, designers, marketers, and service businesses responding to client briefs or formal RFPs.
            </p>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[430px_minmax(0,1fr)]">
          <div className="reveal reveal-delay-1 premium-panel p-5 sm:p-8 xl:sticky xl:top-28 xl:h-fit">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white">Proposal Inputs</h2>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-600">Use real client details for better output</p>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Type</span>
                  <select
                    value={form.proposalType}
                    onChange={(event) => handleChange('proposalType', event.target.value)}
                    className="input bg-black/25 py-4"
                  >
                    <option>Service Proposal</option>
                    <option>RFP Response</option>
                    <option>Project Proposal</option>
                    <option>Retainer Proposal</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Tone</span>
                  <select
                    value={form.tone}
                    onChange={(event) => handleChange('tone', event.target.value)}
                    className="input bg-black/25 py-4"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="premium">Premium</option>
                    <option value="direct">Direct</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Client Name</span>
                <input
                  value={form.clientName}
                  onChange={(event) => handleChange('clientName', event.target.value)}
                  placeholder="Acme Technologies"
                  className="input bg-black/25 py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Client Email</span>
                <input
                  value={form.clientEmail}
                  onChange={(event) => handleChange('clientEmail', event.target.value)}
                  placeholder="client@example.com"
                  className="input bg-black/25 py-4"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Industry</span>
                  <input
                    value={form.clientIndustry}
                    onChange={(event) => handleChange('clientIndustry', event.target.value)}
                    placeholder="Healthcare, coaching, SaaS..."
                    className="input bg-black/25 py-4"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Project Title</span>
                  <input
                    value={form.projectTitle}
                    onChange={(event) => handleChange('projectTitle', event.target.value)}
                    placeholder="Website redesign project"
                    className="input bg-black/25 py-4"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Services</span>
                <input
                  value={form.services}
                  onChange={(event) => handleChange('services', event.target.value)}
                  placeholder="Discovery, design, development, payment setup..."
                  className="input bg-black/25 py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Client Goal</span>
                <input
                  value={form.goals}
                  onChange={(event) => handleChange('goals', event.target.value)}
                  placeholder="More enquiries, better conversion, faster payment..."
                  className="input bg-black/25 py-4"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Timeline</span>
                  <input
                    value={form.timeline}
                    onChange={(event) => handleChange('timeline', event.target.value)}
                    placeholder="3 weeks"
                    className="input bg-black/25 py-4"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Budget</span>
                  <input
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={(event) => handleChange('budget', event.target.value)}
                    placeholder="25000"
                    className="input bg-black/25 py-4"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Currency</span>
                  <select
                    value={form.currency}
                    onChange={(event) => handleChange('currency', event.target.value)}
                    className="input bg-black/25 py-4"
                  >
                    {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Project Brief</span>
                <textarea
                  value={form.projectBrief}
                  onChange={(event) => handleChange('projectBrief', event.target.value)}
                  placeholder="Describe what the client asked for, pain points, preferred approach, deadlines..."
                  rows="4"
                  className="input min-h-[120px] resize-none bg-black/25 py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Paste RFP Text Optional</span>
                <textarea
                  value={form.rfpText}
                  onChange={(event) => handleChange('rfpText', event.target.value)}
                  placeholder="Paste RFP requirements, evaluation criteria, scope, or client email..."
                  rows="5"
                  className="input min-h-[140px] resize-none bg-black/25 py-4"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-400/15 bg-red-400/10 p-4 text-sm font-bold text-red-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={generateProposal}
                disabled={loading}
                className="rounded-2xl bg-yellow-300 px-6 py-4 text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-yellow-300/10 transition-all hover:-translate-y-0.5 hover:bg-yellow-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Writing Proposal...' : 'Generate Proposal'}
              </button>
            </div>
          </div>

          <div className="reveal reveal-delay-2 space-y-8">
            {!proposal ? (
              <div className="premium-panel p-8 text-center sm:p-12">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No Proposal Yet</p>
                <h2 className="mt-3 text-3xl font-black text-white">Fill the inputs and generate a client-ready proposal.</h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-500">
                  The output will include proposal sections, RFP response structure, pricing, questions, follow-up text, and a ready proposal draft.
                </p>
              </div>
            ) : (
              <>
                <section className="premium-panel p-5 sm:p-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">{proposal.proposalType}</p>
                      <h2 className="mt-2 text-3xl font-black text-white">{proposal.title}</h2>
                      <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500">{proposal.executiveSummary}</p>
                    </div>

                    <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-64 lg:grid-cols-1">
                      <button
                        type="button"
                        onClick={createProposalDraft}
                        className="rounded-2xl bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-200"
                      >
                        Create Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText('full-proposal', sectionText(proposal))}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10"
                      >
                        {copied === 'full-proposal' ? 'Copied' : 'Copy All'}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                  <article className="premium-panel p-5 sm:p-8">
                    <h3 className="text-xl font-black text-white">Problem</h3>
                    <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-500">{proposal.problemStatement}</p>
                  </article>
                  <article className="premium-panel p-5 sm:p-8">
                    <h3 className="text-xl font-black text-white">Solution</h3>
                    <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-500">{proposal.proposedSolution}</p>
                  </article>
                </section>

                <section className="premium-panel p-5 sm:p-8">
                  <h3 className="text-xl font-black text-white">Scope of Work</h3>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {(proposal.scopeItems || []).map((item) => (
                      <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                        <p className="text-sm font-black text-white">{item.title}</p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="premium-panel p-5 sm:p-8">
                    <h3 className="text-xl font-black text-white">Timeline</h3>
                    <div className="mt-5 divide-y divide-white/5 rounded-2xl border border-white/8 bg-black/20">
                      {(proposal.timeline || []).map((item) => (
                        <div key={`${item.phase}-${item.duration}`} className="grid gap-2 p-5 sm:grid-cols-[7rem_minmax(0,1fr)]">
                          <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">{item.phase}</p>
                          <div>
                            <p className="text-sm font-black text-white">{item.duration}</p>
                            <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500">{item.work}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="premium-panel p-5 sm:p-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Pricing</p>
                    <p className="mt-3 text-4xl font-black text-white">
                      {formatMoney(proposal.pricing?.total, proposal.pricing?.currency)}
                    </p>
                    <div className="mt-5 grid gap-3">
                      {(proposal.pricing?.breakdown || []).map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                          <span className="text-xs font-bold text-zinc-400">{item.label}</span>
                          <span className="text-sm font-black text-white">{formatMoney(item.amount, proposal.pricing?.currency)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 text-xs font-medium leading-relaxed text-zinc-500">{proposal.pricing?.paymentTerms}</p>
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-3">
                  {[
                    { title: 'Why Us', items: proposal.whyUs || [] },
                    { title: 'Assumptions', items: proposal.assumptions || [] },
                    { title: 'Discovery Questions', items: proposal.discoveryQuestions || [] }
                  ].map((group) => (
                    <article key={group.title} className="premium-panel p-5 sm:p-8">
                      <h3 className="text-lg font-black text-white">{group.title}</h3>
                      <div className="mt-5 grid gap-3">
                        {group.items.map((item) => (
                          <div key={item} className="rounded-xl border border-white/8 bg-black/20 p-4 text-sm font-medium leading-relaxed text-zinc-500">
                            {item}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </section>

                <section className="premium-panel p-5 sm:p-8">
                  <h3 className="text-xl font-black text-white">Risks and Mitigation</h3>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {(proposal.risks || []).map((item) => (
                      <div key={item.risk} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                        <p className="text-sm font-black text-yellow-200">{item.risk}</p>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">{item.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                  <article className="premium-panel p-5 sm:p-8">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h3 className="text-xl font-black text-white">Closing Message</h3>
                      <button
                        type="button"
                        onClick={() => copyText('closing', proposal.closingMessage)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10"
                      >
                        {copied === 'closing' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-zinc-500">{proposal.closingMessage}</p>
                  </article>

                  <article className="premium-panel p-5 sm:p-8">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h3 className="text-xl font-black text-white">Follow-up Message</h3>
                      <button
                        type="button"
                        onClick={() => copyText('follow-up', proposal.followUpMessage)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10"
                      >
                        {copied === 'follow-up' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-zinc-500">{proposal.followUpMessage}</p>
                  </article>
                </section>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
