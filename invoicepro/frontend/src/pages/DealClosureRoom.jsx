import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import useDocumentMeta from '../utils/useDocumentMeta';
import { trackEvent } from '../utils/analytics';

const currencies = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD'];

const defaultForm = {
  clientName: '',
  clientType: 'Small business owner',
  service: '',
  outcome: '',
  price: '',
  currency: 'INR',
  timeline: '',
  objection: '',
  proof: '',
  guarantee: '',
  nextStep: 'Start with proposal'
};

const buyerTypes = [
  'Small business owner',
  'Founder',
  'Marketing manager',
  'Agency owner',
  'Consultant',
  'Enterprise buyer'
];

const nextStepOptions = ['Start with proposal', 'Send invoice', 'Book discovery call', 'Ask for advance payment'];

const requiredFields = [
  { key: 'clientName', label: 'client name' },
  { key: 'service', label: 'service' },
  { key: 'outcome', label: 'client outcome' }
];

const formatMoney = (amount, currency = 'INR') => {
  if (!amount) return 'Price not set';
  const prefix = currency === 'INR' ? 'Rs ' : `${currency} `;
  return `${prefix}${Number(amount || 0).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')}`;
};

const getDateAfterDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const buildDealRoom = (form) => {
  const clientName = form.clientName || 'the client';
  const service = form.service || 'the service';
  const outcome = form.outcome || 'the desired result';
  const price = formatMoney(form.price, form.currency);
  const timeline = form.timeline || 'a clear delivery timeline';
  const proof = form.proof || 'relevant work samples, process clarity, and transparent communication';
  const guarantee = form.guarantee || 'clear scope, milestone updates, and agreed revision limits';
  const objection = form.objection || 'I need to think about it';
  const priceScore = Number(form.price || 0) > 0 ? 18 : 5;
  const proofScore = String(form.proof || '').trim().length > 12 ? 20 : 8;
  const guaranteeScore = String(form.guarantee || '').trim().length > 8 ? 14 : 7;
  const objectionScore = String(form.objection || '').trim().length > 8 ? 16 : 8;
  const timelineScore = String(form.timeline || '').trim().length > 2 ? 12 : 5;
  const closeScore = Math.min(96, 28 + priceScore + proofScore + guaranteeScore + objectionScore + timelineScore);

  const decisionSummary = [
    `${clientName} wants ${outcome}.`,
    `The recommended offer is ${service} for ${price}.`,
    `Delivery can be positioned around ${timeline}.`,
    `Trust proof: ${proof}.`
  ].join(' ');

  const objectionReplies = [
    {
      objection,
      reply: `That makes sense. To make the decision easier, I can keep the first step small and clear: ${service}, focused on ${outcome}, with ${guarantee}. If it looks good, we can move forward with the full scope.`
    },
    {
      objection: 'Price is high',
      reply: `I understand. The price is based on the outcome: ${outcome}. We can either keep the full scope at ${price}, or reduce the first milestone so you can validate the value before expanding.`
    },
    {
      objection: 'Need to compare with others',
      reply: `Of course. When comparing, please check scope clarity, timeline, communication, and payment terms. I can also send a simple checklist so the comparison is fair and easy.`
    },
    {
      objection: 'Not urgent now',
      reply: `No problem. If ${outcome} is still important, we can set a smaller first milestone this week so progress starts without a large commitment.`
    }
  ];

  const buyerFaq = [
    {
      question: 'What exactly will I receive?',
      answer: `You will receive ${service}, delivered around the agreed scope, timeline, and success goal: ${outcome}.`
    },
    {
      question: 'How do we start?',
      answer: form.nextStep === 'Send invoice'
        ? 'I will send a payable invoice link with the agreed scope and payment terms.'
        : form.nextStep === 'Ask for advance payment'
          ? 'We can start after the advance payment is completed and the first milestone is confirmed.'
          : form.nextStep === 'Book discovery call'
            ? 'We can book a short discovery call, confirm scope, then move into proposal or invoice.'
            : 'I will send a clear proposal with scope, timeline, price, and next step.'
    },
    {
      question: 'What reduces my risk?',
      answer: guarantee
    },
    {
      question: 'Why now?',
      answer: `Because delaying ${outcome} can slow enquiries, trust, payment collection, or business momentum.`
    }
  ];

  const trustPack = [
    'Clear scope and deliverables',
    'Timeline and milestone visibility',
    'Payment terms before work starts',
    'Proof or examples before decision',
    'Revision limits and communication rhythm',
    'Public invoice or proposal link for transparency'
  ];

  const closeMessage = `Hi ${clientName}, I made the next step simple.\n\nGoal: ${outcome}\nOffer: ${service}\nPrice: ${price}\nTimeline: ${timeline}\n\nTo reduce risk, I will keep the scope clear and use this trust plan: ${guarantee}.\n\nIf this works, I can ${form.nextStep === 'Send invoice' ? 'send the invoice/payment link' : form.nextStep === 'Ask for advance payment' ? 'send the advance payment link' : form.nextStep === 'Book discovery call' ? 'book a short discovery call' : 'send the proposal'} today.`;

  return {
    createdAt: new Date().toISOString(),
    closeScore,
    decisionSummary,
    objectionReplies,
    buyerFaq,
    trustPack,
    closeMessage,
    riskReducers: [
      `Start with a smaller milestone if ${clientName} is unsure.`,
      `Connect price directly to ${outcome}.`,
      `Show proof before asking for payment.`,
      'Keep the next action small, clear, and time-bound.'
    ],
    nextActions: [
      form.nextStep,
      'Copy close message',
      'Create proposal or invoice',
      'Follow up in 48 hours if no reply'
    ]
  };
};

export default function DealClosureRoom() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    try {
      return {
        ...defaultForm,
        ...JSON.parse(localStorage.getItem('clientflow_deal_room_form') || '{}')
      };
    } catch {
      return defaultForm;
    }
  });
  const [dealRoom, setDealRoom] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clientflow_deal_room_result') || 'null');
    } catch {
      return null;
    }
  });
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useDocumentMeta(
    'AI Deal Closure Room | ClientFlow AI',
    'Create a client trust pack, objection replies, buyer FAQ, close score, and next-step message before sending a proposal or invoice.'
  );

  const missingFields = useMemo(() => (
    requiredFields
      .filter((field) => !String(form[field.key] || '').trim())
      .map((field) => field.label)
  ), [form]);

  const updateField = (field, value) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);
    try {
      localStorage.setItem('clientflow_deal_room_form', JSON.stringify(nextForm));
    } catch { }
  };

  const generateDealRoom = () => {
    if (missingFields.length) {
      setError(`Fill ${missingFields.join(', ')} before generating the deal room.`);
      setDealRoom(null);
      return;
    }

    const result = buildDealRoom(form);
    setDealRoom(result);
    setError('');
    try {
      localStorage.setItem('clientflow_deal_room_result', JSON.stringify(result));
    } catch { }
    trackEvent('generate_deal_closure_room', {
      currency: form.currency,
      next_step: form.nextStep
    });
  };

  const copyText = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1600);
      trackEvent('copy_deal_room_text', { label });
    } catch {
      window.prompt('Copy this text:', text);
    }
  };

  const createDraft = (type = 'proposal') => {
    const draft = {
      documentType: type,
      clientName: form.clientName,
      clientEmail: '',
      serviceDescription: `${form.service}. Outcome: ${form.outcome}. Trust plan: ${form.guarantee || 'Clear scope and milestone communication.'}`,
      items: [
        {
          name: form.service || 'Professional services',
          price: Number(form.price || 0)
        }
      ],
      currency: form.currency,
      cgst: 0,
      sgst: 0,
      validUntil: type === 'proposal' ? getDateAfterDays(7) : '',
      dueDate: type === 'invoice' ? getDateAfterDays(7) : '',
      notes: dealRoom?.decisionSummary || 'Created from AI Deal Closure Room.'
    };

    try {
      localStorage.setItem('invoicepro_ai_invoice_draft', JSON.stringify(draft));
    } catch { }

    navigate(type === 'proposal' ? '/create-invoice?type=proposal' : '/create-invoice');
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-8 sm:py-10 md:py-16">
        <section className="reveal mb-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-300/15 bg-yellow-300/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-yellow-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200">AI Deal Closure Room</span>
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              Close the client before you send the invoice.
            </h1>
            <p className="mt-5 max-w-3xl text-base font-medium leading-relaxed text-zinc-500 sm:text-lg">
              Generate a trust pack, buyer FAQ, objection replies, close score, and next-step message so the client feels safe to say yes.
            </p>
          </div>

          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Why this is different</p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              Most billing tools start after the sale. This helps the user win the sale, reduce buyer doubt, then create a proposal or invoice.
            </p>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[430px_minmax(0,1fr)]">
          <div className="reveal reveal-delay-1 premium-panel p-5 sm:p-8 xl:sticky xl:top-28 xl:h-fit">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white">Deal Inputs</h2>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-600">Use real client details</p>
            </div>

            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Client Name</span>
                <input
                  value={form.clientName}
                  onChange={(event) => updateField('clientName', event.target.value)}
                  placeholder="Acme Clinic"
                  className="input bg-black/25 py-4"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Buyer Type</span>
                  <select
                    value={form.clientType}
                    onChange={(event) => updateField('clientType', event.target.value)}
                    className="input bg-black/25 py-4"
                  >
                    {buyerTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Next Step</span>
                  <select
                    value={form.nextStep}
                    onChange={(event) => updateField('nextStep', event.target.value)}
                    className="input bg-black/25 py-4"
                  >
                    {nextStepOptions.map((step) => <option key={step}>{step}</option>)}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Service / Offer</span>
                <input
                  value={form.service}
                  onChange={(event) => updateField('service', event.target.value)}
                  placeholder="Website redesign, monthly marketing, automation setup..."
                  className="input bg-black/25 py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Client Outcome</span>
                <input
                  value={form.outcome}
                  onChange={(event) => updateField('outcome', event.target.value)}
                  placeholder="More enquiries, faster payment, better trust..."
                  className="input bg-black/25 py-4"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Price</span>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) => updateField('price', event.target.value)}
                    placeholder="14999"
                    className="input bg-black/25 py-4"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Currency</span>
                  <select
                    value={form.currency}
                    onChange={(event) => updateField('currency', event.target.value)}
                    className="input bg-black/25 py-4"
                  >
                    {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Timeline</span>
                  <input
                    value={form.timeline}
                    onChange={(event) => updateField('timeline', event.target.value)}
                    placeholder="7 days"
                    className="input bg-black/25 py-4"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Main Objection</span>
                <input
                  value={form.objection}
                  onChange={(event) => updateField('objection', event.target.value)}
                  placeholder="Price is high, need time, need to compare..."
                  className="input bg-black/25 py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Proof</span>
                <textarea
                  value={form.proof}
                  onChange={(event) => updateField('proof', event.target.value)}
                  rows="3"
                  placeholder="Portfolio, previous work, process, testimonials, certificates..."
                  className="input min-h-[100px] resize-none bg-black/25 py-4"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Risk Reducer</span>
                <textarea
                  value={form.guarantee}
                  onChange={(event) => updateField('guarantee', event.target.value)}
                  rows="3"
                  placeholder="Milestone delivery, clear revisions, weekly updates, small first step..."
                  className="input min-h-[100px] resize-none bg-black/25 py-4"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-400/15 bg-red-400/10 p-4 text-sm font-bold text-red-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={generateDealRoom}
                className="rounded-2xl bg-yellow-300 px-6 py-4 text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-yellow-300/10 transition-all hover:-translate-y-0.5 hover:bg-yellow-200 active:scale-[0.98]"
              >
                Generate Deal Room
              </button>
            </div>
          </div>

          <div className="reveal reveal-delay-2 space-y-8">
            {!dealRoom ? (
              <div className="premium-panel p-8 text-center sm:p-12">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">No Deal Room Yet</p>
                <h2 className="mt-3 text-3xl font-black text-white">Fill the inputs and generate a close plan.</h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-zinc-500">
                  This feature helps users handle buyer doubt before the proposal or invoice stage.
                </p>
              </div>
            ) : (
              <>
                <section className="premium-panel p-5 sm:p-8">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Close Readiness</p>
                      <h2 className="mt-2 text-3xl font-black text-white">Deal close score: {dealRoom.closeScore}%</h2>
                      <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-500">{dealRoom.decisionSummary}</p>
                    </div>
                    <div className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/10 p-5 text-center">
                      <p className="text-5xl font-black text-white">{dealRoom.closeScore}</p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-yellow-200">Ready to close</p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                  <article className="premium-panel p-5 sm:p-8">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h3 className="text-xl font-black text-white">Close Message</h3>
                      <button
                        type="button"
                        onClick={() => copyText('close-message', dealRoom.closeMessage)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10"
                      >
                        {copied === 'close-message' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-words rounded-xl bg-white/[0.03] p-4 text-sm font-medium leading-relaxed text-zinc-400">{dealRoom.closeMessage}</pre>
                  </article>

                  <article className="premium-panel p-5 sm:p-8">
                    <h3 className="text-xl font-black text-white">Trust Pack</h3>
                    <div className="mt-5 grid gap-3">
                      {dealRoom.trustPack.map((item) => (
                        <div key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                          <p className="text-sm font-medium leading-relaxed text-zinc-400">{item}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>

                <section className="premium-panel p-5 sm:p-8">
                  <h3 className="text-xl font-black text-white">Objection Replies</h3>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {dealRoom.objectionReplies.map((item) => (
                      <article key={item.objection} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">{item.objection}</p>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.reply}</p>
                        <button
                          type="button"
                          onClick={() => copyText(item.objection, item.reply)}
                          className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white/10"
                        >
                          {copied === item.objection ? 'Copied' : 'Copy Reply'}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="premium-panel p-5 sm:p-8">
                    <h3 className="text-xl font-black text-white">Buyer FAQ</h3>
                    <div className="mt-5 grid gap-4">
                      {dealRoom.buyerFaq.map((item) => (
                        <div key={item.question} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                          <p className="text-sm font-black text-white">{item.question}</p>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="premium-panel p-5 sm:p-8">
                    <h3 className="text-xl font-black text-white">Next Actions</h3>
                    <div className="mt-5 grid gap-3">
                      {dealRoom.nextActions.map((item, index) => (
                        <div key={item} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Step {index + 1}</p>
                          <p className="mt-2 text-sm font-black text-white">{item}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3">
                      <button
                        type="button"
                        onClick={() => createDraft('proposal')}
                        className="rounded-2xl bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-black hover:bg-yellow-200"
                      >
                        Create Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => createDraft('invoice')}
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
