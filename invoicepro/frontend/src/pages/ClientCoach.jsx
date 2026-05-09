import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackEvent } from '../utils/analytics';

const defaultForm = {
  service: '',
  targetClient: '',
  result: '',
  price: '',
  currency: 'INR',
  channel: 'LinkedIn',
  stage: 'first_message',
  notes: ''
};

const currencySymbols = {
  INR: 'Rs',
  USD: '$',
  EUR: 'EUR',
  GBP: 'GBP',
  AED: 'AED',
  SGD: 'SGD',
  AUD: 'AUD',
  CAD: 'CAD'
};

const channelIdeas = {
  LinkedIn: ['Search job title + industry', 'Comment on useful posts before sending DM', 'Send a feedback request first'],
  Instagram: ['Find creators or local brands posting daily', 'Reply to stories with one useful observation', 'Move serious leads to WhatsApp'],
  WhatsApp: ['Ask existing contacts for 2 referrals', 'Send one clear result-focused message', 'Follow up after 2 days with a useful idea'],
  'Google Maps': ['Search local businesses with weak websites or no booking flow', 'Call or WhatsApp owners during working hours', 'Offer a small audit first'],
  Referrals: ['Ask past clients for one introduction', 'Give a short forwarding message', 'Reward referrals with a small bonus or free support']
};

const stageLabels = {
  first_message: 'First message',
  discovery: 'Discovery call',
  proposal: 'Proposal sent',
  negotiation: 'Negotiation',
  payment: 'Payment collection'
};

const formatPrice = (amount, currency) => {
  const value = Number(amount || 0);
  if (!value) return 'a clear starter price';
  return `${currencySymbols[currency] || currency} ${value.toLocaleString('en-IN')}`;
};

const buildCoachPlan = (form) => {
  const service = form.service.trim();
  const targetClient = form.targetClient.trim();
  const result = form.result.trim();
  const price = formatPrice(form.price, form.currency);
  const channel = form.channel;
  const stage = stageLabels[form.stage] || 'Current deal';
  const ideas = channelIdeas[channel] || channelIdeas.LinkedIn;
  const pain = result || 'get more enquiries, save time, or collect payments faster';

  return {
    score: Math.min(96, 45 + (service ? 15 : 0) + (targetClient ? 12 : 0) + (result ? 12 : 0) + (Number(form.price || 0) ? 10 : 0)),
    oneAction: `Today: find 10 ${targetClient} leads on ${channel}, send 3 useful messages, and move 1 interested lead to a proposal or invoice.`,
    phases: [
      {
        title: 'Find clients',
        subtitle: `Where to find ${targetClient}`,
        steps: ideas,
        action: `Search for ${targetClient} who need ${service}. Save names, links, and one problem you can mention.`
      },
      {
        title: 'Talk to client',
        subtitle: 'Start with value, not selling',
        steps: [
          'Open with one useful observation.',
          'Ask one question about their current problem.',
          'Do not send price in the first message unless they ask.'
        ],
        action: `Message 3 leads with the opener below and ask if they want a short idea for ${pain}.`
      },
      {
        title: 'Finish the deal',
        subtitle: 'Turn interest into a decision',
        steps: [
          'Confirm the exact business result.',
          `Offer one starter package around ${price}.`,
          'Give a clear next step: proposal, call, or advance payment.'
        ],
        action: `If the client replies positively, send a simple proposal with scope, timeline, price, and validity.`
      },
      {
        title: 'Get money',
        subtitle: 'Do not leave payment vague',
        steps: [
          'Convert accepted work into an invoice quickly.',
          'Share the payment link with a short confirmation message.',
          'Follow up politely before the due date.'
        ],
        action: 'After agreement, create the invoice and share the Pay Now or UPI link from ClientFlow AI.'
      }
    ],
    scripts: [
      {
        label: 'First DM',
        text: `Hi, I noticed your business and had one quick idea related to ${service}.\n\nI help ${targetClient} ${pain}. If useful, I can share 2 simple improvements you can use this week.`
      },
      {
        label: 'Discovery question',
        text: `Before I suggest a solution, can I ask what is the main goal right now: more enquiries, better trust, faster delivery, or payment collection?`
      },
      {
        label: 'Proposal close',
        text: `Based on what you shared, I can do ${service} with a clear scope, timeline, and ${price} starter option.\n\nIf this works, I will send the proposal today and keep the next step simple.`
      },
      {
        label: 'Payment message',
        text: `Great, I will start with the agreed scope. I am sharing the invoice/payment link now so we can confirm the project and begin delivery.`
      }
    ],
    objections: [
      {
        objection: 'Your price is high',
        response: `I understand. The price is based on the outcome: ${pain}. We can also start with a smaller first milestone and expand after you see value.`
      },
      {
        objection: 'I will think about it',
        response: 'Sure. To make the decision easier, I can send a short proposal with scope, timeline, price, and what happens next.'
      },
      {
        objection: 'Send details',
        response: `Absolutely. I will send a simple plan for ${service}, the expected result, timeline, and payment step.`
      }
    ],
    checklist: [
      'Lead has a real business problem',
      'Client understood the outcome',
      'Scope is written clearly',
      'Price and payment step are confirmed',
      'Invoice or proposal is sent from ClientFlow AI'
    ],
    stage
  };
};

export default function ClientCoach() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);

  useDocumentMeta({
    title: 'AI Client Coach - ClientFlow AI',
    description: 'AI coach for freelancers to find clients, talk to clients, close deals, and collect payment.'
  });

  const previewPlan = useMemo(() => plan || buildCoachPlan({
    service: 'website improvement',
    targetClient: 'small business owners',
    result: 'get more enquiries',
    price: '15000',
    currency: 'INR',
    channel: 'LinkedIn',
    stage: 'first_message',
    notes: ''
  }), [plan]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const generatePlan = (event) => {
    event.preventDefault();

    if (!form.service.trim() || !form.targetClient.trim() || !form.result.trim()) {
      setError('Add your service, target client, and result first. The coach needs this to avoid generic advice.');
      return;
    }

    const nextPlan = buildCoachPlan(form);
    setPlan(nextPlan);
    setError('');
    trackEvent('generate_client_coach_plan', {
      channel: form.channel,
      stage: form.stage,
      currency: form.currency
    });
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      trackEvent('copy_client_coach_script', { label });
      alert('Copied.');
    } catch {
      window.prompt('Copy this:', text);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal responsive-heading-grid mb-10">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-yellow-300/20 bg-yellow-300/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-300" />
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">AI Client Coach</p>
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              Find clients, talk better, close the deal, and collect money.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400 sm:text-base">
              This coach turns a freelancer’s service into a daily sales plan with copy-ready messages, objection replies, closing steps, and payment follow-up.
            </p>
          </div>

          <div className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[0.06] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200">Today’s coaching score</p>
            <p className="mt-3 text-5xl font-black text-white">{previewPlan.score}</p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">
              {previewPlan.oneAction}
            </p>
          </div>
        </section>

        <section className="grid gap-8 2xl:grid-cols-[420px_minmax(0,1fr)]">
          <form onSubmit={generatePlan} className="reveal reveal-delay-1 premium-panel h-fit p-5 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Coach setup</p>
            <h2 className="mt-2 text-2xl font-black text-white">Tell the coach what you sell</h2>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">
              Fill these fields so the agent gives specific client advice instead of generic motivation.
            </p>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Your service</span>
                <input
                  value={form.service}
                  onChange={(event) => updateField('service', event.target.value)}
                  placeholder="Example: landing page, logo design, video editing"
                  className="input py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target client</span>
                <input
                  value={form.targetClient}
                  onChange={(event) => updateField('targetClient', event.target.value)}
                  placeholder="Example: clinics, coaches, restaurants"
                  className="input py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Result you promise</span>
                <input
                  value={form.result}
                  onChange={(event) => updateField('result', event.target.value)}
                  placeholder="Example: get more enquiries"
                  className="input py-4"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Starter price</span>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) => updateField('price', event.target.value)}
                    placeholder="15000"
                    className="input py-4"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Currency</span>
                  <select
                    value={form.currency}
                    onChange={(event) => updateField('currency', event.target.value)}
                    className="input py-4"
                  >
                    {Object.keys(currencySymbols).map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Channel</span>
                  <select
                    value={form.channel}
                    onChange={(event) => updateField('channel', event.target.value)}
                    className="input py-4"
                  >
                    {Object.keys(channelIdeas).map((channel) => (
                      <option key={channel} value={channel}>{channel}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Deal stage</span>
                  <select
                    value={form.stage}
                    onChange={(event) => updateField('stage', event.target.value)}
                    className="input py-4"
                  >
                    {Object.entries(stageLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Extra context</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  placeholder="Example: client is interested but asking for discount"
                  rows="4"
                  className="input min-h-[110px] resize-none py-4"
                />
              </label>
            </div>

            <button type="submit" className="btn btn-primary mt-6 w-full py-4 text-sm">
              Generate Coach Plan
            </button>
          </form>

          <div className="reveal reveal-delay-2 space-y-8">
            <section className="premium-panel p-5 sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{previewPlan.stage}</p>
                  <h2 className="mt-2 text-3xl font-black text-white">Your deal coaching plan</h2>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                    Follow these steps in order. The goal is not more busy work. The goal is one real client conversation and one payment step.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(previewPlan.oneAction, 'one_action')}
                  className="btn btn-secondary px-5 py-3 text-xs"
                >
                  Copy Today Action
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {previewPlan.phases.map((phase) => (
                  <div key={phase.title} className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-yellow-300/25">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">{phase.title}</p>
                    <h3 className="mt-2 text-xl font-black text-white">{phase.subtitle}</h3>
                    <div className="mt-4 space-y-2">
                      {phase.steps.map((step) => (
                        <p key={step} className="rounded-2xl border border-white/8 bg-black/20 p-3 text-xs font-semibold leading-relaxed text-zinc-300">
                          {step}
                        </p>
                      ))}
                    </div>
                    <p className="mt-4 rounded-2xl border border-yellow-300/15 bg-yellow-300/10 p-3 text-sm font-black leading-relaxed text-yellow-100">
                      {phase.action}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="premium-panel p-5 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Copy-ready scripts</p>
                <h2 className="mt-2 text-2xl font-black text-white">Say the right thing at each step</h2>
                <div className="mt-5 grid gap-4">
                  {previewPlan.scripts.map((script) => (
                    <div key={script.label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-white">{script.label}</p>
                        <button
                          type="button"
                          onClick={() => copyText(script.text, script.label)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm font-medium leading-relaxed text-zinc-300">{script.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Objection replies</p>
                  <div className="mt-4 space-y-3">
                    {previewPlan.objections.map((item) => (
                      <div key={item.objection} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                        <p className="text-sm font-black text-white">{item.objection}</p>
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400">{item.response}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Close checklist</p>
                  <div className="mt-4 space-y-2">
                    {previewPlan.checklist.map((item) => (
                      <p key={item} className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs font-semibold leading-relaxed text-zinc-300">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </aside>
            </section>

            <section className="premium-panel p-5 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Next action inside ClientFlow AI</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Find Clients', '/client-finder'],
                  ['Write Proposal', '/proposal-writer'],
                  ['Close Deal', '/deal-room'],
                  ['Create Invoice', '/create-invoice']
                ].map(([label, path]) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => navigate(path)}
                    className="rounded-2xl border border-white/8 bg-black/20 p-4 text-left text-sm font-black text-white transition hover:-translate-y-1 hover:border-yellow-300/25"
                  >
                    {label}
                    <span className="mt-2 block text-xs font-semibold text-zinc-500">Open tool</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
