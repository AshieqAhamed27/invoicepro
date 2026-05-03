import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../utils/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { COMPANY_NAME, SUPPORT_EMAIL, UDYAM_REGISTRATION_NUMBER } from '../utils/company';
import useDocumentMeta from '../utils/useDocumentMeta';
import { Link } from 'react-router-dom';
import { trackCtaClick } from '../utils/analytics';

const trustSignals = [
  {
    title: 'AI lead fit radar',
    description: 'Score freelance prospects by pain, budget, urgency, niche fit, and next action before you spend time pitching.'
  },
  {
    title: 'Client finder workspace',
    description: 'Turn skills into target niches, search queries, outreach messages, discovery questions, and saved growth leads.'
  },
  {
    title: 'Proposal to invoice',
    description: 'Move an interested lead into a proposal, then convert accepted work into a payable invoice from the same product.'
  },
  {
    title: 'Razorpay and UPI collection',
    description: 'Use a recognizable checkout flow with Razorpay and provide UPI-ready payment details.'
  },
  {
    title: 'WhatsApp-first reminders',
    description: 'Send payment follow-ups through WhatsApp links so you can start collecting without a paid email domain.'
  },
  {
    title: 'Recurring billing built in',
    description: 'Set up monthly client work once and keep repeat invoices organized from the same dashboard.'
  }
];

const workflow = [
  {
    step: '01',
    title: 'Find a better-fit client',
    description: 'Use AI to choose a niche, build lead searches, score real prospects, and prepare a useful first message.'
  },
  {
    step: '02',
    title: 'Pitch with a clear package',
    description: 'Create discovery questions, objection replies, service packages, and a proposal draft from the same client plan.'
  },
  {
    step: '03',
    title: 'Invoice and collect payment',
    description: 'Convert accepted work into invoices, share public payment links, and follow up on pending revenue.'
  }
];

const proofBlocks = [
  {
    title: 'Not just invoicing',
    description: 'InvoicePro helps freelancers work from prospect to payment instead of only creating a bill at the end.',
    bullets: ['AI lead scoring before outreach', 'Saved growth leads and personalized pitch copy', 'Proposal drafts connected to invoice creation']
  },
  {
    title: 'Clear before clients pay',
    description: 'The billing page can show the invoice number, due date, itemized amount, tax split, and who the invoice is from.',
    bullets: ['Business identity and client details on the same screen', 'Line-item totals with CGST and SGST when used', 'A payment page that feels like part of a real billing workflow']
  },
  {
    title: 'Checkout they recognize',
    description: 'When the invoice is ready to collect, clients can use a familiar Razorpay flow or pay from a UPI app.',
    bullets: ['Razorpay checkout for online collection', 'UPI QR and deep-link options on public invoices', 'Paid status reflected back into the product after collection']
  }
];

const faqs = [
  {
    question: 'Can InvoicePro help me find freelance clients?',
    answer: 'Yes. The AI client finder helps you choose target niches, score prospects, write outreach, prepare discovery questions, and move interested leads into proposals.'
  },
  {
    question: 'Do my clients need an InvoicePro account to pay?',
    answer: 'No. Invoice and proposal links open in a browser, so clients can review the document and pay without signing up.'
  },
  {
    question: 'Can I collect through UPI or Razorpay?',
    answer: 'Yes. The product supports Razorpay checkout and also exposes UPI-friendly payment details on public invoices.'
  },
  {
    question: 'Is this only for one-off invoices?',
    answer: 'No. InvoicePro also supports recurring invoice schedules for retainers and repeat monthly billing.'
  },
  {
    question: 'Can I include GST information and business details?',
    answer: 'Yes. The invoice flow includes GST-related fields, company details, due dates, and client information.'
  },
  {
    question: 'Can I send reminders without buying a domain?',
    answer: 'Yes. InvoicePro supports WhatsApp reminder links, so you can follow up with clients now and add email reminders later when you have a verified business domain.'
  }
];

const testimonials = [
  {
    name: 'Aftab',
    source: 'LinkedIn feedback',
    quote: 'The interface is clean, and the overall workflow feels simple and user-friendly, which is great for an invoicing tool.'
  }
];

const plans = [
  {
    name: 'Free',
    price: 'Rs 0',
    suffix: '/ forever',
    description: 'For testing the client-to-invoice workflow with your first prospects.',
    features: ['2 invoices included', 'Public invoice page', 'Saved client basics'],
    cta: 'Start Free',
    featured: false,
    action: 'start'
  },
  {
    name: 'Pro Monthly',
    price: 'Rs 499',
    suffix: '/ month',
    description: 'For freelancers who want one place to find, pitch, invoice, and follow up.',
    features: ['Unlimited invoices', 'Razorpay and UPI collection flow', 'AI client finder and reminders'],
    cta: 'Upgrade Monthly',
    featured: false,
    action: 'monthly'
  },
  {
    name: 'Pro Annual',
    price: 'Rs 4,999',
    suffix: '/ year',
    description: 'For freelancers and agencies building a repeatable client pipeline.',
    features: ['Everything in Monthly', 'Recurring invoices', 'AI growth coach and priority support'],
    cta: 'Save With Annual',
    featured: true,
    action: 'yearly'
  },
  {
    name: 'Founder 90 Days',
    price: 'Rs 999',
    suffix: '/ 3 months',
    description: 'Early-user offer for your first customers who want to try Pro seriously.',
    features: ['90 days Pro access', 'One-time Razorpay payment', 'WhatsApp reminders and AI collection agent'],
    cta: 'Claim Founder Offer',
    featured: false,
    action: 'founder90'
  }
];

const policyLinks = [
  {
    title: 'Privacy Policy',
    description: 'Explains how account, client, invoice, and payment-related data is handled.',
    to: '/privacy'
  },
  {
    title: 'Terms of Use',
    description: 'Sets expectations for using InvoicePro responsibly as billing software.',
    to: '/terms'
  },
  {
    title: 'Refund Policy',
    description: 'Covers cancellation, duplicate payments, failed activation, and support requests.',
    to: '/refund-policy'
  },
  {
    title: 'Digital Delivery',
    description: 'Clarifies that InvoicePro is cloud software delivered online after signup or payment.',
    to: '/shipping-policy'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  useDocumentMeta(
    'AI Client Finder + Invoice Software for Freelancers | InvoicePro',
    'Find better freelance clients with AI, send proposals, create GST invoices, accept UPI and Razorpay payments, and track reminders in InvoicePro.'
  );

  const handleSubscribe = (plan) => {
    localStorage.setItem('plan', plan);
    trackCtaClick(`select_${plan}_plan`, 'home_pricing', loggedIn ? '/payment' : '/signup');
    navigate(loggedIn ? '/payment' : '/signup');
  };

  const jumpToSection = (id) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePlanAction = (action) => {
    if (action === 'start') {
      trackCtaClick('start_free_plan', 'home_pricing', loggedIn ? '/dashboard' : '/signup');
      navigate(loggedIn ? '/dashboard' : '/signup');
      return;
    }

    handleSubscribe(action);
  };

  return (
    <div className="premium-page min-h-screen text-white selection:bg-emerald-300 selection:text-black">
      <Navbar />

      <main>
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28">
          <div className="container-custom relative z-10 grid gap-12 lg:grid-cols-2 lg:items-start">
            <div className="max-w-lg">
              <div className="reveal premium-eyebrow w-full max-w-full flex-wrap sm:w-auto">
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400 text-emerald-400" />
                <p className="max-w-[16rem] break-words text-[10px] font-black uppercase leading-relaxed tracking-[0.14em] text-emerald-300 sm:max-w-none sm:text-[11px] sm:tracking-[0.22em]">
                  AI client finder + invoicing for freelancers
                </p>
              </div>

              <h1 className="reveal reveal-delay-1 mt-6 max-w-4xl break-words text-4xl font-bold tracking-tight leading-tight text-white sm:mt-8 sm:text-5xl md:text-6xl">
                Find better clients, close projects, then <span className="animated-gradient-text">invoice and get paid</span>.
              </h1>

              <p className="reveal reveal-delay-3 mt-5 max-w-2xl text-base font-medium leading-relaxed text-zinc-300 sm:mt-6 sm:text-lg md:text-xl">
                InvoicePro helps freelancers turn skills into target niches, score real prospects,
                write better outreach, send proposals, create invoices, collect payments, and follow up on unpaid revenue.
              </p>
              <p className="hidden">
                InvoicePro is an invoice generator for freelancers and businesses in India.
                Create GST invoices, send payment links, accept UPI and Razorpay payments,
                and manage recurring invoices easily.
              </p>

              <div className="reveal reveal-delay-3 mt-8 grid gap-3 sm:grid-cols-3">
                <div className="premium-panel px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Find</p>
                  <p className="mt-2 text-sm font-semibold text-white">AI lead fit scoring and niche targeting</p>
                </div>
                <div className="premium-panel px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Close</p>
                  <p className="mt-2 text-sm font-semibold text-white">Packages, proposals, and objection replies</p>
                </div>
                <div className="premium-panel px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Collect</p>
                  <p className="mt-2 text-sm font-semibold text-white">Invoices, payment links, and reminders</p>
                </div>
              </div>

              <div className="reveal reveal-delay-3 mt-8 space-y-4 sm:mt-10">
                <p className="text-sm leading-relaxed text-zinc-400">
                  Learn more in our guide:{' '}
                  <Link
                    to="/blog/how-to-create-invoice-india"
                    className="text-yellow-400 hover:underline"
                  >
                    How to create invoice in India
                  </Link>
                  {' '}and{' '}
                  <Link
                    to="/blog/gst-invoice-format-india"
                    className="text-yellow-400 hover:underline"
                  >
                    GST invoice format guide
                  </Link>
                </p>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button
                    onClick={() => {
                      trackCtaClick(loggedIn ? 'open_dashboard' : 'start_free', 'home_hero', loggedIn ? '/dashboard' : '/signup');
                      navigate(loggedIn ? '/dashboard' : '/signup');
                    }}
                    className="btn btn-primary w-full px-10 py-5 text-lg font-black shadow-2xl shadow-black/20 transition-all hover:-translate-y-0.5 active:scale-95 sm:w-auto"
                  >
                    {loggedIn ? 'Open Dashboard' : 'Start Free'}
                  </button>
                  <button
                    onClick={() => {
                      trackCtaClick('open_client_finder', 'home_hero', loggedIn ? '/client-finder' : '/signup');
                      navigate(loggedIn ? '/client-finder' : '/signup');
                    }}
                    className="btn btn-secondary w-full px-10 py-5 text-lg font-black transition-all hover:-translate-y-0.5 sm:w-auto"
                  >
                    Find Clients
                  </button>
                  <button
                    onClick={() => {
                      trackCtaClick(loggedIn ? 'create_invoice' : 'see_pricing', 'home_hero', loggedIn ? '/create-invoice' : '#pricing');
                      loggedIn ? navigate('/create-invoice') : jumpToSection('pricing');
                    }}
                    className="btn btn-dark w-full px-10 py-5 text-lg font-black transition-all hover:-translate-y-0.5 sm:w-auto"
                  >
                    {loggedIn ? 'Create Invoice' : 'See Pricing'}
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-zinc-400">
                  Looking for a simple tool? Try our{' '}
                  <a href="/invoice-generator" className="text-yellow-400 hover:underline">
                    invoice generator
                  </a>{' '}
                  to create invoices online in India.
                </p>
              </div>

              <div className="reveal reveal-delay-3 mt-8 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 sm:text-xs sm:tracking-[0.2em]">
                <span className="rounded-full border border-white/10 px-3 py-2">No client login required</span>
                <span className="rounded-full border border-white/10 px-3 py-2">AI lead scoring</span>
                <span className="rounded-full border border-white/10 px-3 py-2">GST-ready invoice fields</span>
              </div>
            </div>

            <div className="reveal reveal-delay-3">
              <div className="premium-panel p-5 sm:p-8">
                <div className="flex flex-col items-start justify-between gap-4 border-b border-white/5 pb-6 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Growth Snapshot</p>
                    <h2 className="mt-2 max-w-[14ch] break-words text-2xl font-black text-white sm:max-w-none sm:text-3xl">What turns a lead into cash</h2>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-left sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">AI Workflow</p>
                    <p className="mt-1 text-lg font-black text-white">Lead-ready</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Before outreach</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <p className="text-sm font-medium leading-relaxed text-zinc-300">
                          AI scores each prospect by pain, budget, urgency, niche fit, and contact quality.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <p className="text-sm font-medium leading-relaxed text-zinc-300">
                          Outreach, discovery questions, and objection replies are generated from your service offer.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">After interest</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Proposal path</p>
                        <p className="mt-2 text-sm font-semibold text-white">Turn a qualified lead into a public proposal</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Invoice path</p>
                        <p className="mt-2 text-sm font-semibold text-white">Convert accepted work into a payable invoice</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/15 bg-emerald-400/8 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">After invoice</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-black">1</span>
                        <p className="text-sm font-semibold text-white">Collect with Razorpay, UPI, or a public invoice link</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-black">2</span>
                        <p className="text-sm font-semibold text-white">Use AI reminders to follow up on pending revenue</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="scroll-reveal py-16">
          <div className="container-custom">
            <h2 className="text-3xl font-black text-white">
              AI Client Finder for Indian Freelancers
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl">
              InvoicePro helps freelancers identify better-fit prospects, write useful outreach,
              save leads, and move interested clients into proposals and invoices.
            </p>

            <h2 className="mt-10 text-3xl font-black text-white">
              Create GST Invoices Online After You Close Work
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl">
              Generate GST invoices with tax fields, client details, due dates, and payment instructions.
              Perfect for Indian businesses and consultants.
            </p>

            <h2 className="mt-10 text-3xl font-black text-white">
              Accept UPI and Razorpay Payments
            </h2>
            <p className="mt-4 text-zinc-400 max-w-2xl">
              Share invoice links and collect payments using Razorpay checkout or UPI apps like Google Pay and Paytm.
            </p>
          </div>
        </section>

        <section className="scroll-reveal border-y border-white/5 bg-zinc-950/60 py-16">
          <div className="container-custom">
            <div className="mb-10 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Why it feels different</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">A freelancer growth system, not only an invoice maker</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {trustSignals.map((signal) => (
                <div key={signal.title} className="rounded-3xl border border-white/8 bg-white/[0.02] p-6">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-yellow-300">{signal.title}</p>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">{signal.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-reveal border-b border-white/5 bg-zinc-950/35 py-16">
          <div className="container-custom">
            <div className="mb-10 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Customer feedback</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Early users are already noticing the clean billing experience.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {testimonials.map((testimonial) => (
                <figure key={testimonial.name} className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-sm font-black text-black">
                      {testimonial.name.slice(0, 1)}
                    </div>
                    <div>
                      <figcaption className="text-sm font-black text-white">{testimonial.name}</figcaption>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{testimonial.source}</p>
                    </div>
                  </div>
                  <blockquote className="text-base font-semibold leading-relaxed text-zinc-300">
                    "{testimonial.quote}"
                  </blockquote>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-reveal border-b border-white/5 bg-black/20 py-16">
          <div className="container-custom">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Business trust</p>
                <h2 className="mt-3 max-w-xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Public policies and business details in one place.
                </h2>
                <p className="mt-4 max-w-lg text-sm font-medium leading-relaxed text-zinc-400 sm:text-base">
                  {COMPANY_NAME} now includes public trust pages, visible support, Udyam registration, and a WhatsApp-first follow-up flow.
                </p>

                <div className="mt-6 rounded-[2rem] border border-emerald-400/15 bg-emerald-400/8 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Registered MSME</p>
                  <p className="mt-2 break-all text-sm font-black text-white">Udyam No: {UDYAM_REGISTRATION_NUMBER}</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">
                    Public policy pages, support details, and registration information help clients verify the product before they pay.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {policyLinks.map((item) => (
                  <Link
                    key={item.title}
                    to={item.to}
                    className="group rounded-[2rem] border border-white/8 bg-white/[0.03] p-6 transition-all hover:-translate-y-1 hover:border-yellow-400/25 hover:bg-white/[0.05]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Policy</p>
                    <h3 className="mt-3 text-xl font-black text-white">{item.title}</h3>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.description}</p>
                    <p className="mt-5 text-sm font-black text-white group-hover:text-yellow-300">Open page</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="scroll-reveal py-20 sm:py-24">
          <div className="container-custom">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Workflow</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                From finding a lead to collecting payment
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed text-zinc-400">
                InvoicePro keeps freelancer growth connected: prospect research, pitch copy, proposal creation, invoice generation, payment links, and reminders.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {workflow.map((item) => (
                <div key={item.title} className="group rounded-[2rem] border border-white/8 bg-zinc-950/70 p-8 transition-all duration-300 hover:border-yellow-400/20 hover:bg-zinc-950">
                  <span className="text-3xl font-black text-white/15 transition-colors group-hover:text-yellow-400/40">{item.step}</span>
                  <h3 className="mt-6 text-2xl font-black text-white">{item.title}</h3>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="scroll-reveal border-t border-white/5 bg-zinc-950/40 py-24">
          <div className="container-custom">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="rounded-[2.5rem] border border-white/8 bg-zinc-950 p-8 sm:p-10">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Client-facing view</p>
                <h2 className="mt-4 max-w-xl text-4xl font-black tracking-tight text-white">
                  Every serious lead should become a clear proposal or invoice.
                </h2>

                <div className="mt-8 rounded-[2rem] border border-white/8 bg-black/30 p-5 sm:p-6">
                  <div className="flex flex-col gap-6 border-b border-white/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Invoice Summary</p>
                      <p className="mt-2 text-2xl font-black text-white">INV-2026-104</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Status</p>
                      <p className="mt-1 text-sm font-black text-white">Pending payment</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Prepared for</p>
                      <p className="mt-2 text-sm font-semibold text-white">Client identity, due date, and line items</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Prepared by</p>
                      <p className="mt-2 text-sm font-semibold text-white">Business profile, GST details, and payment instructions</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Payment options</p>
                      <p className="mt-2 text-sm font-semibold text-white">Razorpay checkout and UPI-friendly payment route</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">After collection</p>
                      <p className="mt-2 text-sm font-semibold text-white">Paid state reflected back into the invoice view</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5">
                {proofBlocks.map((block) => (
                  <div key={block.title} className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-8">
                    <h3 className="text-2xl font-black text-white">{block.title}</h3>
                    <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-400">{block.description}</p>
                    <div className="mt-6 space-y-3">
                      {block.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-start gap-3">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                          <p className="text-sm font-medium leading-relaxed text-zinc-300">{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-reveal py-24">
          <div className="container-custom">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Pricing</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
                Plans for freelancers who want clients and cashflow
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-zinc-400">
                Start with the free workspace, then upgrade when you want unlimited invoices, AI client finder, payment collection, and reminders.
              </p>
            </div>

            <div className="mx-auto mb-8 max-w-3xl rounded-[2rem] border border-yellow-400/15 bg-yellow-400/8 px-6 py-5 text-center">
              <p className="text-sm font-semibold leading-relaxed text-yellow-100">
                Paid subscriptions use secure Razorpay checkout. The plan amount is shown before payment starts, and support is reachable at{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-black text-white hover:text-yellow-200">
                  {SUPPORT_EMAIL}
                </a>.
              </p>
            </div>

            <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={plan.featured
                    ? 'relative flex flex-col justify-between h-full rounded-[2.25rem] border-2 border-yellow-400/40 bg-yellow-400/6 p-6 shadow-2xl shadow-yellow-400/10 sm:rounded-[2.75rem] sm:p-10'
                    : 'flex flex-col justify-between h-full rounded-[2.25rem] border border-white/8 bg-zinc-950 p-6 sm:rounded-[2.75rem] sm:p-10'
                  }
                >
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-black">
                      Best Value
                    </div>
                  )}

                  <div>
                    <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{plan.description}</p>
                    <p className="mt-8 text-4xl font-black tracking-tight text-white sm:text-5xl">
                      {plan.price}
                      <span className="ml-2 text-sm font-black uppercase tracking-[0.18em] text-zinc-500">{plan.suffix}</span>
                    </p>

                    <div className="mt-8 space-y-4">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-3">
                          <svg className={`h-5 w-5 ${plan.featured ? 'text-yellow-400' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-sm font-medium text-zinc-300">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlanAction(plan.action)}
                    className={plan.featured
                      ? 'mt-auto w-full rounded-2xl bg-yellow-400 py-5 text-base font-black text-black shadow-xl shadow-yellow-400/20 transition-all hover:bg-yellow-300 active:scale-95'
                      : 'mt-auto w-full rounded-2xl border border-white/10 bg-zinc-900 py-5 text-base font-black text-white transition-all hover:bg-zinc-800 active:scale-95'
                    }
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-reveal border-t border-white/5 bg-zinc-950/50 py-24">
          <div className="container-custom">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">FAQ</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Questions freelancers ask before using it</h2>
                <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-zinc-400">
                  InvoicePro is built to support real client work, from first outreach to final payment.
                </p>

                <div className="mt-8 rounded-[2rem] border border-white/8 bg-white/[0.02] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Need a human answer?</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">
                    Reach out directly before you subscribe or if you want help setting up your billing workflow.
                  </p>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="mt-5 inline-flex rounded-2xl border border-white/10 bg-zinc-900 px-5 py-3 text-sm font-black text-white transition-all hover:bg-zinc-800"
                  >
                    Email {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>

              <div className="grid gap-4">
                {faqs.map((item) => (
                  <div key={item.question} className="rounded-[2rem] border border-white/8 bg-white/[0.02] p-6 sm:p-7">
                    <h3 className="text-xl font-black text-white">{item.question}</h3>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="scroll-reveal border-t border-white/5 py-24">
          <div className="container-custom">
            <div className="premium-panel px-6 py-12 text-center sm:px-12 sm:py-20">
              <div className="mx-auto max-w-3xl">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Ready to build a client-to-cash workflow?</p>
                <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-6xl">
                  Find better prospects, send stronger proposals, and collect payment from one workspace.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-zinc-400">
                  Start free, test the AI client finder, and turn the right lead into a proposal or invoice when they are ready.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <button
                    onClick={() => {
                      trackCtaClick(loggedIn ? 'open_dashboard' : 'claim_free_workspace', 'home_bottom', loggedIn ? '/dashboard' : '/signup');
                      navigate(loggedIn ? '/dashboard' : '/signup');
                    }}
                    className="btn btn-primary px-10 py-5 text-lg font-black shadow-2xl shadow-black/20 transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    {loggedIn ? 'Open Dashboard' : 'Start Your Free Workspace'}
                  </button>
                  <button
                    onClick={() => {
                      trackCtaClick('bottom_client_finder', 'home_bottom', loggedIn ? '/client-finder' : '/signup');
                      navigate(loggedIn ? '/client-finder' : '/signup');
                    }}
                    className="btn btn-secondary px-10 py-5 text-lg font-black transition-all hover:-translate-y-0.5"
                  >
                    Find Clients
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
