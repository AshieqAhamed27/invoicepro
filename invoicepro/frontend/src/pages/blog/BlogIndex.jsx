import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import useDocumentMeta from '../../utils/useDocumentMeta';

const articles = [
  {
    slug: 'gst-invoice-format-india',
    title: 'GST Invoice Format for Indian Freelancers: Complete Checklist',
    description: 'Learn mandatory GST fields, HSN/SAC codes, state codes, CGST/SGST/IGST breakdown, and downloadable templates.',
    tag: 'GST Compliance',
    date: 'Updated Sep 2025',
    readTime: '5 min read',
    link: '/blog/gst-invoice-format-india'
  },
  {
    slug: 'how-to-create-invoice-india',
    title: 'How to Create Invoices as an Indian Freelancer & Get Paid Faster',
    description: 'Step-by-step guide on setting up payment terms, generating professional invoices, and tracking client payments.',
    tag: 'Invoicing & Payments',
    date: 'Updated Sep 2025',
    readTime: '6 min read',
    link: '/blog/how-to-create-invoice-india'
  },
  {
    slug: 'tds-194j-freelancer-guide',
    title: 'Understanding TDS Section 194J for Tech & Design Consultants in India',
    description: 'When clients deduct 10% or 2% TDS on your invoices, how to claim Form 26AS credit, and CA-ready billing records.',
    tag: 'Tax & TDS',
    date: 'Updated Sep 2025',
    readTime: '4 min read',
    link: '/gst-compliance'
  },
  {
    slug: 'razorpay-vs-manual-upi',
    title: 'Razorpay vs Manual UPI: Which is Best for Collecting Client Payments?',
    description: 'Compare automated reconciliation, instant payment links, gateway fees, and payment tracking for freelancers.',
    tag: 'Payment Systems',
    date: 'Updated Sep 2025',
    readTime: '5 min read',
    link: '/payments'
  }
];

export default function BlogIndex() {
  useDocumentMeta({
    title: 'Freelance Guides & Tax Knowledge Base | ClientFlow AI',
    description: 'Free guides on GST invoicing, TDS Section 194J, Razorpay payments, and client management for Indian creators and devs.',
    path: '/blog'
  });

  return (
    <div className="premium-page min-h-screen text-white">
      <Navbar />

      <main className="container-custom py-12 sm:py-16">
        <header className="max-w-3xl mb-12">
          <span className="violet-pill mb-4 inline-flex">Freelance Knowledge Base</span>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl text-white">
            Guides & Insights for Indian Creators.
          </h1>
          <p className="mt-4 text-base font-semibold leading-relaxed text-zinc-400 sm:text-lg">
            Practical articles on GST invoicing, tax compliance, pricing strategies, and automated client billing systems.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {articles.map((item) => (
            <article key={item.slug} className="glow-card p-7 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                    {item.tag}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">{item.readTime}</span>
                </div>
                <h2 className="text-xl font-black text-white group-hover:text-violet-300 transition-colors">
                  <Link to={item.link}>{item.title}</Link>
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-400">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-600">{item.date}</span>
                <Link to={item.link} className="text-xs font-black uppercase text-violet-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Read Article →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
