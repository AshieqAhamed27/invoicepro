import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useDocumentMeta from '../utils/useDocumentMeta';
import { COMPANY_NAME, UDYAM_REGISTRATION_NUMBER } from '../utils/company';
import { trackCtaClick } from '../utils/analytics';

const pages = {
  'gst-invoice-generator': {
    path: '/gst-invoice-generator',
    title: 'GST Invoice Generator India | Create GST Bills Online | ClientFlow AI',
    description: 'Create GST invoices online with client details, tax fields, PDF download, UPI details, and payment tracking for Indian freelancers and businesses.',
    eyebrow: 'GST invoice generator India',
    headline: 'Create GST invoices online without fighting spreadsheets.',
    subhead: 'ClientFlow AI helps Indian freelancers, consultants, and small businesses prepare GST-ready invoices, share client payment links, and keep payment status organized.',
    primaryCta: 'Create Free GST Invoice',
    secondaryCta: 'View GST Format Guide',
    secondaryPath: '/blog/gst-invoice-format-india',
    keywords: ['GST invoice generator', 'GST billing software', 'GST invoice format', 'India invoice maker'],
    features: [
      'Add client details, invoice number, due date, GST fields, and line items in one flow.',
      'Generate branded PDF invoices with company name, logo, notes, and payment details.',
      'Track pending, paid, and overdue invoices from the dashboard.'
    ],
    workflow: ['Create invoice', 'Add GST and items', 'Share link or PDF', 'Track payment status'],
    faqs: [
      ['Can I create GST invoices online?', 'Yes. ClientFlow AI lets you create GST-ready invoices with item totals, tax fields, due dates, and business details.'],
      ['Can I download the invoice as PDF?', 'Yes. You can download a branded PDF invoice and share it with clients.'],
      ['Is this useful for freelancers?', 'Yes. It is built for freelancers, consultants, agencies, and small service businesses in India.']
    ]
  },
  'online-invoice-maker-india': {
    path: '/online-invoice-maker-india',
    title: 'Online Invoice Maker India | Free Invoice Tool | ClientFlow AI',
    description: 'Use ClientFlow AI as an online invoice maker for India. Create invoices, download PDFs, share payment links, and manage clients from one dashboard.',
    eyebrow: 'Online invoice maker India',
    headline: 'Make professional invoices your clients can open, understand, and pay.',
    subhead: 'Build invoices with line items, due dates, client details, UPI payment details, and public payment links designed for Indian businesses.',
    primaryCta: 'Create Free Invoice',
    secondaryCta: 'Try Invoice Generator',
    secondaryPath: '/invoice-generator',
    keywords: ['online invoice maker', 'invoice maker India', 'free invoice tool', 'invoice PDF'],
    features: [
      'Create clean invoices without designing a format manually.',
      'Save client details and reuse them for future billing.',
      'Share invoices through WhatsApp, public link, or PDF download.'
    ],
    workflow: ['Enter client', 'Add service items', 'Preview total', 'Share invoice'],
    faqs: [
      ['Is ClientFlow AI free to start?', 'Yes. You can start with the free workspace and upgrade when you need Pro features.'],
      ['Can clients open invoices without login?', 'Yes. Public invoice links open in a normal browser.'],
      ['Can I use it on mobile?', 'Yes. The website is responsive for desktop and mobile screens.']
    ]
  },
  'freelance-invoice-software': {
    path: '/freelance-invoice-software',
    title: 'Freelance Invoice Software India | ClientFlow AI',
    description: 'Freelance invoice software for Indian freelancers, consultants, and agencies. Create invoices, track unpaid work, and share payment links fast.',
    eyebrow: 'Freelance invoice software',
    headline: 'Freelancers need billing that looks serious from the first invoice.',
    subhead: 'ClientFlow AI turns client work into professional invoices, proposals, PDF downloads, and payment tracking without heavy accounting software.',
    primaryCta: 'Start Freelance Billing',
    secondaryCta: 'Read Invoice Guide',
    secondaryPath: '/blog/how-to-create-invoice-india',
    keywords: ['freelance invoice software', 'freelancer billing India', 'consultant invoice tool', 'agency invoicing'],
    features: [
      'Create invoices and proposals for client projects, retainers, and one-time services.',
      'Use AI billing support to draft invoice details and follow-up reminders.',
      'See unpaid invoices quickly so revenue does not get lost in chats.'
    ],
    workflow: ['Add client', 'Create proposal', 'Convert to invoice', 'Follow up on payment'],
    faqs: [
      ['Can freelancers use ClientFlow AI without GST?', 'Yes. GST fields can be used when needed, but the invoice flow also works for non-GST freelancers.'],
      ['Can I send reminders?', 'Yes. You can share invoice reminders through WhatsApp using the public invoice link.'],
      ['Can I bill monthly clients?', 'Yes. Pro includes recurring billing support for repeat work.']
    ]
  },
  'payment-reminder-software': {
    path: '/payment-reminder-software',
    title: 'Payment Reminder Software India | ClientFlow AI',
    description: 'Track pending invoices and send payment reminders through WhatsApp links. ClientFlow AI helps Indian businesses follow up professionally.',
    eyebrow: 'Payment reminder software',
    headline: 'Follow up on unpaid invoices without sounding unprofessional.',
    subhead: 'ClientFlow AI shows pending and overdue invoices, prepares WhatsApp-ready reminder text, and keeps the public payment link attached.',
    primaryCta: 'Track Pending Payments',
    secondaryCta: 'See Pricing',
    secondaryPath: '/#pricing',
    keywords: ['payment reminder software', 'invoice reminder India', 'overdue invoice tracking', 'WhatsApp payment reminder'],
    features: [
      'See pending, paid, and overdue status clearly in the dashboard.',
      'Send WhatsApp reminders with invoice amount, due date, and public payment link.',
      'Use AI revenue insights to decide which invoice needs attention first.'
    ],
    workflow: ['Create invoice', 'Wait for due date', 'Send reminder', 'Track paid status'],
    faqs: [
      ['Does ClientFlow AI mark overdue invoices automatically?', 'It displays overdue status when a pending invoice passes its due date.'],
      ['Can I send reminders by WhatsApp?', 'Yes. ClientFlow AI can open WhatsApp with a prepared reminder message and public invoice link.'],
      ['Can I use email reminders now?', 'WhatsApp reminders are active now. Email reminders can be enabled later after domain email setup.']
    ]
  },
  'razorpay-invoice-payment-tracking': {
    path: '/razorpay-invoice-payment-tracking',
    title: 'Razorpay Invoice Payment Tracking | ClientFlow AI',
    description: 'Use ClientFlow AI with Razorpay checkout for subscriptions and invoice payment tracking. Built for Indian SaaS billing and client collection workflows.',
    eyebrow: 'Razorpay invoice payment tracking',
    headline: 'Connect invoices with payment status your business can trust.',
    subhead: 'ClientFlow AI supports Razorpay checkout flows, UPI-friendly invoice pages, and verified payment status so paid invoices are not guessed manually.',
    primaryCta: 'Start With ClientFlow AI',
    secondaryCta: 'Contact Support',
    secondaryPath: '/contact',
    keywords: ['Razorpay invoice tracking', 'invoice payment tracking', 'UPI invoice payment', 'Razorpay billing software'],
    features: [
      'Use public invoice pages that show totals, due date, and payment options.',
      'Keep manual paid marking blocked so payment status stays connected to verification.',
      'Upgrade through Razorpay subscriptions for Pro billing features.'
    ],
    workflow: ['Share invoice link', 'Client pays securely', 'Payment verifies', 'Dashboard updates'],
    faqs: [
      ['Can I use Razorpay for ClientFlow AI subscriptions?', 'Yes. Pro subscriptions use Razorpay checkout when configured in the backend.'],
      ['Can clients pay invoices from public links?', 'Yes. Public invoice pages can show Razorpay and UPI payment options.'],
      ['Can users mark invoices paid without payment?', 'No. ClientFlow AI is designed so normal users cannot manually mark unpaid invoices as paid.']
    ]
  }
};

export const seoPagePaths = Object.values(pages).map((page) => page.path);

export default function SEOPage({ pageKey }) {
  const page = pages[pageKey];

  if (!page) return <Navigate to="/" replace />;

  useDocumentMeta(page.title, page.description, { path: page.path });

  const handlePrimaryCta = () => {
    trackCtaClick(page.primaryCta, page.path, '/signup');
  };

  const handleSecondaryCta = () => {
    trackCtaClick(page.secondaryCta, page.path, page.secondaryPath);
  };

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main>
        <section className="border-b border-white/5 py-14 sm:py-20 lg:py-24">
          <div className="container-custom grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/15 bg-yellow-400/8 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-yellow-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-200">
                  {page.eyebrow}
                </p>
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {page.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
                {page.subhead}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  onClick={handlePrimaryCta}
                  className="btn btn-primary px-8 py-4 text-center text-sm font-black uppercase tracking-widest"
                >
                  {page.primaryCta}
                </Link>
                <Link
                  to={page.secondaryPath}
                  onClick={handleSecondaryCta}
                  className="btn btn-secondary px-8 py-4 text-center text-sm font-black uppercase tracking-widest"
                >
                  {page.secondaryCta}
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {page.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="premium-panel p-5 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                Product snapshot
              </p>
              <div className="mt-5 rounded-lg border border-white/8 bg-black/25 p-5">
                <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-5">
                  <div>
                    <p className="text-sm font-black text-white">{COMPANY_NAME}</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">Udyam No: {UDYAM_REGISTRATION_NUMBER}</p>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                    India-ready
                  </span>
                </div>

                <div className="mt-6 grid gap-3">
                  {page.workflow.map((step, index) => (
                    <div key={step} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-xs font-black text-black">
                        {index + 1}
                      </span>
                      <p className="text-sm font-bold text-zinc-200">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container-custom">
            <div className="mb-10 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Why use ClientFlow AI</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                Built for billing work that needs to look real.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {page.features.map((feature, index) => (
                <div key={feature} className="rounded-lg border border-white/8 bg-white/[0.03] p-6">
                  <p className="text-3xl font-black text-white/15">0{index + 1}</p>
                  <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-300">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-zinc-950/55 py-16 sm:py-20">
          <div className="container-custom grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">FAQ</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                Questions buyers search before choosing a billing tool.
              </h2>
            </div>

            <div className="grid gap-4">
              {page.faqs.map(([question, answer]) => (
                <div key={question} className="rounded-lg border border-white/8 bg-white/[0.03] p-6">
                  <h3 className="text-lg font-black text-white">{question}</h3>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container-custom">
            <div className="premium-panel p-6 text-center sm:p-10">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Start free</p>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black text-white sm:text-4xl">
                Create your first invoice and see the full workflow.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-zinc-400">
                Use ClientFlow AI for invoices, proposals, PDFs, WhatsApp sharing, payment tracking, and AI billing support.
              </p>
              <Link
                to="/signup"
                onClick={() => trackCtaClick('bottom_create_free_invoice', page.path, '/signup')}
                className="btn btn-primary mt-8 inline-flex px-8 py-4 text-sm font-black uppercase tracking-widest"
              >
                Create Free Invoice
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
