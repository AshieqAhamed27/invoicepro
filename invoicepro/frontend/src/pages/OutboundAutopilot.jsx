import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { trackEvent } from '../utils/analytics';

const defaultForm = {
  service: '',
  targetClient: '',
  location: '',
  outcome: '',
  offerPrice: '',
  market: 'India',
  dailyCapacity: 10,
  tone: 'friendly'
};

const requiredFields = [
  { key: 'service', label: 'service' },
  { key: 'targetClient', label: 'target client' },
  { key: 'location', label: 'location' },
  { key: 'outcome', label: 'client result' }
];

const marketOptions = ['India', 'Global', 'USA', 'UK', 'UAE', 'Singapore', 'Australia', 'Canada'];

const marketCurrencyPrefix = {
  India: 'Rs ',
  Global: 'USD ',
  USA: 'USD ',
  UK: 'GBP ',
  UAE: 'AED ',
  Singapore: 'SGD ',
  Australia: 'AUD ',
  Canada: 'CAD '
};

const toneOptions = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'direct', label: 'Direct' },
  { value: 'premium', label: 'Premium' }
];

const normalizePhoneSearch = (value = '') =>
  String(value || '').replace(/\s+/g, ' ').trim();

const formatOfferPrice = (amount, market = 'India') => {
  if (!amount) return '';
  const prefix = marketCurrencyPrefix[market] || 'Rs ';
  return `${prefix}${Number(amount || 0).toLocaleString(market === 'India' ? 'en-IN' : 'en-US')}`;
};

const getSearchLinks = (form) => {
  const target = normalizePhoneSearch(form.targetClient);
  const location = normalizePhoneSearch(form.location);
  const service = normalizePhoneSearch(form.service);
  const global = form.market !== 'India';

  const sources = global
    ? [
        {
          platform: 'LinkedIn',
          query: `${target} ${location} founder owner company`,
          note: 'Find founders, owners, and company pages. Save only verified public contacts.'
        },
        {
          platform: 'Google',
          query: `${target} ${location} ${service} contact email`,
          note: 'Find websites with public contact pages and visible business gaps.'
        },
        {
          platform: 'Clutch',
          query: `site:clutch.co ${target} ${location}`,
          note: 'Find publicly listed service companies and agencies.'
        },
        {
          platform: 'Yelp',
          query: `site:yelp.com ${target} ${location}`,
          note: 'Find local businesses with reviews, websites, and contact paths.'
        }
      ]
    : [
        {
          platform: 'Google Maps',
          query: `${target} near ${location}`,
          note: 'Find local businesses, websites, phone numbers, and active listings.'
        },
        {
          platform: 'LinkedIn',
          query: `${target} ${location} owner founder`,
          note: 'Find business owners and company profiles through Google search.'
        },
        {
          platform: 'Instagram',
          query: `${target} ${location}`,
          note: 'Find businesses already posting but needing better enquiries or trust.'
        },
        {
          platform: 'Google',
          query: `${target} ${location} ${service} contact`,
          note: 'Find websites with contact pages and outdated conversion flow.'
        }
      ];

  return sources.map((source) => ({
    ...source,
    url: getSearchUrl(source.platform, source.query)
  }));
};

const getSearchUrl = (platform, query) => {
  const encoded = encodeURIComponent(query);
  const name = String(platform || '').toLowerCase();

  if (name.includes('maps')) return `https://www.google.com/maps/search/${encoded}`;
  if (name.includes('instagram')) return `https://www.instagram.com/explore/search/keyword/?q=${encoded}`;
  return `https://www.google.com/search?q=${encoded}`;
};

const buildMessages = (form) => {
  const priceText = form.offerPrice ? `I usually start around ${formatOfferPrice(form.offerPrice, form.market)}, but I can suggest the right scope after seeing your current setup.` : 'I can suggest a simple fixed-scope offer after seeing your current setup.';
  const outcome = form.outcome || 'get more enquiries and payments';
  const service = form.service || 'business improvement';
  const target = form.targetClient || 'your business';

  const opener = form.tone === 'premium'
    ? `Hi, I found ${target} while researching businesses that can improve ${outcome}.\n\nI help with ${service}. I noticed there may be room to improve the customer journey and payment flow.\n\nWould you be open to 2 short improvement ideas?`
    : form.tone === 'direct'
      ? `Hi, I help ${target} improve ${outcome} using ${service}.\n\nIf useful, I can send 2 quick ideas you can check today. No long call needed.`
      : `Hi, I came across ${target} while researching businesses in your area.\n\nI help with ${service}, especially to improve ${outcome}.\n\nWould you like me to share 2 quick ideas that may help?`;

  return [
    {
      label: 'First Message',
      text: opener
    },
    {
      label: '1 Day Follow-up',
      text: `Hi, just following up on my message about improving ${outcome}.\n\nI can keep it simple: I will share 2 practical ideas first, and you can decide if it is useful.`
    },
    {
      label: '3 Day Follow-up',
      text: `Hi, quick final follow-up.\n\nIf improving ${outcome} is useful this month, I can send a small fixed-scope proposal for ${service}. ${priceText}`
    },
    {
      label: 'Proposal Nudge',
      text: `Hi, I prepared a clear proposal so you can review the scope, price, and next step.\n\nIf everything looks good, I can convert it into an invoice and payment link.`
    }
  ];
};

const buildPlan = (form) => {
  const capacity = Math.max(3, Math.min(50, Number(form.dailyCapacity || 10)));
  const dailyMessages = Math.max(2, Math.floor(capacity * 0.6));
  const dailyResearch = Math.max(3, capacity - dailyMessages);
  const weeklyLeads = capacity * 5;
  const proposalTarget = Math.max(1, Math.ceil(weeklyLeads * 0.12));
  const invoiceTarget = Math.max(1, Math.ceil(proposalTarget * 0.35));

  return {
    createdAt: new Date().toISOString(),
    searchLinks: getSearchLinks(form),
    messages: buildMessages(form),
    scoreCards: [
      { label: 'Daily Research', value: dailyResearch, note: 'New verified prospects to check' },
      { label: 'Daily Messages', value: dailyMessages, note: 'Manual approved outreach only' },
      { label: 'Weekly Proposals', value: proposalTarget, note: 'Warm replies to convert' },
      { label: 'Weekly Invoices', value: invoiceTarget, note: 'Accepted work to collect' }
    ],
    tasks: [
      {
        day: 'Today',
        title: 'Build verified lead list',
        detail: `Open the search links, save ${dailyResearch} real ${form.targetClient} leads, and reject weak matches.`
      },
      {
        day: 'Today',
        title: 'Send approved first messages',
        detail: `Send ${dailyMessages} manual messages. Do not bulk spam or use fake personalization.`
      },
      {
        day: 'Tomorrow',
        title: 'Follow up warm prospects',
        detail: 'Use the 1 day follow-up only for people who did not reply and still look relevant.'
      },
      {
        day: 'Day 3',
        title: 'Convert interested replies',
        detail: 'Move interested prospects to Lead Pipeline and create a proposal for clear opportunities.'
      },
      {
        day: 'Day 7',
        title: 'Close or clean',
        detail: 'Follow up open proposals, archive cold leads, and invoice accepted work.'
      }
    ],
    rules: [
      'Use only public business contact paths.',
      'Do not auto-message people without review.',
      'Stop messaging when a person says no.',
      'Save real leads before creating proposals.',
      'Convert accepted work into invoice and payment link quickly.'
    ]
  };
};

const loadSavedPlan = () => {
  try {
    return JSON.parse(localStorage.getItem('clientflow_outbound_autopilot') || 'null');
  } catch {
    return null;
  }
};

export default function OutboundAutopilot() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    try {
      return {
        ...defaultForm,
        ...JSON.parse(localStorage.getItem('clientflow_outbound_form') || '{}')
      };
    } catch {
      return defaultForm;
    }
  });
  const [plan, setPlan] = useState(loadSavedPlan);
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
      localStorage.setItem('clientflow_outbound_form', JSON.stringify(nextForm));
    } catch { }
  };

  const generatePlan = () => {
    if (missingFields.length) {
      setError(`Fill ${missingFields.join(', ')} before generating the outbound autopilot.`);
      setPlan(null);
      return;
    }

    const nextPlan = buildPlan(form);
    setPlan(nextPlan);
    setError('');

    try {
      localStorage.setItem('clientflow_outbound_autopilot', JSON.stringify(nextPlan));
    } catch { }

    trackEvent('generate_outbound_autopilot', {
      market: form.market,
      daily_capacity: Number(form.dailyCapacity || 0)
    });
  };

  const copyText = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1800);
      trackEvent('copy_outbound_message', { label });
    } catch {
      window.prompt('Copy this message:', text);
    }
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-300/15 bg-purple-300/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-purple-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-200">AI Outbound Agency Autopilot</span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn a service offer into a daily client-getting plan.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-medium leading-relaxed text-zinc-500 sm:text-lg">
              Create real public searches, outreach messages, follow-up tasks, proposal steps, and invoice actions. The user approves every message before sending.
            </p>
          </div>

          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Autopilot Principle</p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              This is not an auto-spam bot. It prepares the work, ranks the next action, and keeps follow-ups moving while the user stays in control.
            </p>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="reveal reveal-delay-1 premium-panel p-5 sm:p-8 xl:sticky xl:top-28 xl:h-fit">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white">Campaign Setup</h2>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-600">Required before generation</p>
            </div>

            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Your Service</span>
                <input
                  value={form.service}
                  onChange={(event) => handleChange('service', event.target.value)}
                  placeholder="Website design, automation, branding..."
                  className="input bg-black/25 py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Target Client</span>
                <input
                  value={form.targetClient}
                  onChange={(event) => handleChange('targetClient', event.target.value)}
                  placeholder="Clinics, restaurants, coaches, agencies..."
                  className="input bg-black/25 py-4"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Market</span>
                  <select
                    value={form.market}
                    onChange={(event) => handleChange('market', event.target.value)}
                    className="input bg-black/25 py-4"
                  >
                    {marketOptions.map((market) => <option key={market} value={market}>{market}</option>)}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Location</span>
                  <input
                    value={form.location}
                    onChange={(event) => handleChange('location', event.target.value)}
                    placeholder="Tenkasi, Dubai, London..."
                    className="input bg-black/25 py-4"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Client Result</span>
                <input
                  value={form.outcome}
                  onChange={(event) => handleChange('outcome', event.target.value)}
                  placeholder="More enquiries, faster payments, better trust..."
                  className="input bg-black/25 py-4"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-3">
                <label className="grid gap-2 sm:col-span-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Starting Price</span>
                  <input
                    type="number"
                    min="0"
                    value={form.offerPrice}
                    onChange={(event) => handleChange('offerPrice', event.target.value)}
                    placeholder="14999"
                    className="input bg-black/25 py-4"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Daily Limit</span>
                  <input
                    type="number"
                    min="3"
                    max="50"
                    value={form.dailyCapacity}
                    onChange={(event) => handleChange('dailyCapacity', event.target.value)}
                    className="input bg-black/25 py-4"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Tone</span>
                  <select
                    value={form.tone}
                    onChange={(event) => handleChange('tone', event.target.value)}
                    className="input bg-black/25 py-4"
                  >
                    {toneOptions.map((tone) => <option key={tone.value} value={tone.value}>{tone.label}</option>)}
                  </select>
                </label>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/15 bg-red-400/10 p-4 text-sm font-bold text-red-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={generatePlan}
                className="rounded-2xl bg-yellow-300 px-6 py-4 text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-yellow-300/10 transition-all hover:-translate-y-0.5 hover:bg-yellow-200 active:scale-[0.98]"
              >
                Generate Autopilot
              </button>
            </div>
          </div>

          <div className="reveal reveal-delay-2 space-y-8">
            {!plan ? (
              <div className="premium-panel p-8 text-center sm:p-12">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No Autopilot Yet</p>
                <h2 className="mt-3 text-3xl font-black text-white">Fill the setup and generate a campaign.</h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-500">
                  The app will not invent clients or send messages automatically. It will create a practical outbound operating plan for real manual outreach.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {plan.scoreCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{card.label}</p>
                      <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                      <p className="mt-2 text-xs font-medium text-zinc-500">{card.note}</p>
                    </div>
                  ))}
                </div>

                <section className="premium-panel p-5 sm:p-8">
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-white">Real Lead Search Links</h2>
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-600">Open, verify, then save real prospects</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/client-finder')}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                    >
                      Open Client Finder
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {plan.searchLinks.map((source) => (
                      <a
                        key={`${source.platform}-${source.query}`}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent('open_outbound_search', { platform: source.platform })}
                        className="rounded-2xl border border-white/8 bg-black/20 p-5 transition-all hover:-translate-y-1 hover:border-yellow-300/30 hover:bg-white/[0.04]"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{source.platform}</p>
                        <p className="mt-3 break-words text-sm font-black text-white">{source.query}</p>
                        <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">{source.note}</p>
                      </a>
                    ))}
                  </div>
                </section>

                <section className="premium-panel p-5 sm:p-8">
                  <h2 className="text-2xl font-black text-white">Daily Autopilot Tasks</h2>
                  <div className="mt-6 divide-y divide-white/5 rounded-2xl border border-white/8 bg-black/20">
                    {plan.tasks.map((task) => (
                      <div key={`${task.day}-${task.title}`} className="grid gap-3 p-5 sm:grid-cols-[7rem_minmax(0,1fr)]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">{task.day}</p>
                        <div>
                          <h3 className="text-base font-black text-white">{task.title}</h3>
                          <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-500">{task.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="premium-panel p-5 sm:p-8">
                  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-white">Message Scripts</h2>
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-600">Copy, edit, and send manually</p>
                    </div>
                    <Link
                      to="/leads"
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                    >
                      Open Pipeline
                    </Link>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {plan.messages.map((message) => (
                      <article key={message.label} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-white">{message.label}</p>
                          <button
                            type="button"
                            onClick={() => copyText(message.label, message.text)}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10 hover:text-white"
                          >
                            {copied === message.label ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap break-words rounded-xl bg-white/[0.03] p-4 text-sm font-medium leading-relaxed text-zinc-400">{message.text}</pre>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="premium-panel p-5 sm:p-8">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                    <div>
                      <h2 className="text-2xl font-black text-white">Quality Rules</h2>
                      <div className="mt-5 grid gap-3">
                        {plan.rules.map((rule) => (
                          <div key={rule} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                            <p className="text-sm font-medium leading-relaxed text-zinc-400">{rule}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <button
                        type="button"
                        onClick={() => navigate('/create-invoice?type=proposal')}
                        className="rounded-2xl bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-200"
                      >
                        Create Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/create-invoice')}
                        className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-5 py-4 text-xs font-black uppercase tracking-widest text-yellow-200 hover:bg-yellow-300/15"
                      >
                        Create Invoice
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
