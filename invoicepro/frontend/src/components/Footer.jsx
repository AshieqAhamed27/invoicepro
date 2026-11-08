import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import {
  COMPANY_LEGAL_DESCRIPTION,
  COMPANY_NAME,
  COMPANY_TAGLINE,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER,
  GOOGLE_REVIEW_URL
} from '../utils/company';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white pb-24 pt-14 sm:py-16">
      <div className="container-custom">
        {/* Trust badges */}
        <div className="mb-10 grid grid-cols-2 gap-4 border-b border-slate-100 pb-8 sm:grid-cols-4">
          {[
            { label: 'Razorpay Payments', sub: 'UPI · Cards · Netbanking' },
            { label: 'Udyam Registered', sub: UDYAM_REGISTRATION_NUMBER },
            { label: 'SSL Encrypted', sub: '256-bit HTTPS' },
            { label: 'Made in India 🇮🇳', sub: 'Built for ₹ and GST' }
          ].map((badge) => (
            <div key={badge.label} className="flex flex-col items-center gap-1 text-center">
              <p className="text-xs font-black uppercase text-slate-800">{badge.label}</p>
              <p className="text-[11px] font-medium text-slate-400">{badge.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-10 text-sm sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-5">
              <BrandLogo showText={true} textColor="slate" />
            </div>
            <p className="max-w-sm font-medium leading-6 text-slate-600">
              {COMPANY_TAGLINE}
            </p>
            <p className="mt-4 max-w-sm text-xs font-semibold leading-5 text-slate-400">
              {COMPANY_LEGAL_DESCRIPTION}
            </p>
          </div>

          <div>
            <h3 className="mb-5 font-black uppercase text-slate-900">Product</h3>
            <div className="grid gap-3 font-medium text-slate-600">
              <a className="transition-colors hover:text-indigo-600" href="/#how-it-works">How it works</a>
              <Link className="transition-colors hover:text-indigo-600" to="/how-to-use">Product guide</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/client-flow">Client Flow</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/client-workroom">Client Workroom</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/create-invoice">Invoices</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/payments">Plans and payments</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/gst-compliance">GST compliance</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/blog">Freelance Guides & Blog</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/changelog">Product changelog</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-5 font-black uppercase text-slate-900">Setup services</h3>
            <div className="grid gap-3 font-medium text-slate-600">
              <Link className="transition-colors hover:text-indigo-600" to="/payments/agency-setup">1-on-1 Managed Setup</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-5 font-black uppercase text-slate-900">Contact Us</h3>
            <div className="grid gap-3 font-medium text-slate-600">
              <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-amber-600 transition-colors hover:text-amber-700">⭐ Review us on Google</a>
              <Link className="transition-colors hover:text-indigo-600" to="/contact">Contact</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/security">Security</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/privacy">Privacy</Link>
              <Link className="transition-colors hover:text-indigo-600" to="/terms">Terms</Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all font-bold text-slate-900 transition-colors hover:text-indigo-600 sm:break-normal">
                {SUPPORT_EMAIL}
              </a>
              <p className="text-xs font-semibold text-slate-400">Udyam: {UDYAM_REGISTRATION_NUMBER}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-7 text-xs font-bold uppercase text-slate-400 md:flex-row">
          <p className="text-center md:text-left">Copyright {new Date().getFullYear()} {COMPANY_NAME} · Made in India 🇮🇳</p>
          <div className="flex flex-wrap items-center justify-center gap-5 md:justify-end">
            <Link className="transition-colors hover:text-slate-700" to="/refund-policy">Refund policy</Link>
            <Link className="transition-colors hover:text-slate-700" to="/shipping-policy">Digital delivery</Link>
            <Link className="transition-colors hover:text-slate-700" to="/changelog">Changelog</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
