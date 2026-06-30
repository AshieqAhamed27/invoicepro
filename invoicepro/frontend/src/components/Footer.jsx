import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import {
  COMPANY_LEGAL_DESCRIPTION,
  COMPANY_NAME,
  COMPANY_TAGLINE,
  LINKEDIN_PROFILE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#07090d] pb-24 pt-14 sm:py-16">
      <div className="container-custom">
        {/* Trust badges */}
        <div className="mb-10 grid grid-cols-2 gap-4 border-b border-white/10 pb-8 sm:grid-cols-4">
          {[
            { label: 'Razorpay Payments', sub: 'UPI · Cards · Netbanking' },
            { label: 'Udyam Registered', sub: UDYAM_REGISTRATION_NUMBER },
            { label: 'SSL Encrypted', sub: '256-bit HTTPS' },
            { label: 'Made in India 🇮🇳', sub: 'Built for ₹ and GST' }
          ].map((badge) => (
            <div key={badge.label} className="flex flex-col items-center gap-1 text-center">
              <p className="text-xs font-black uppercase text-zinc-300">{badge.label}</p>
              <p className="text-[11px] font-medium text-zinc-600">{badge.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-10 text-sm sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-5">
              <BrandLogo showText={true} />
            </div>
            <p className="max-w-sm font-medium leading-6 text-zinc-400">
              {COMPANY_TAGLINE}
            </p>
            <p className="mt-4 max-w-sm text-xs font-semibold leading-5 text-zinc-600">
              {COMPANY_LEGAL_DESCRIPTION}
            </p>
          </div>

          <div>
            <h3 className="mb-5 font-black uppercase text-white">Product</h3>
            <div className="grid gap-3 font-medium text-zinc-400">
              <a className="transition-colors hover:text-yellow-300" href="/#how-it-works">How it works</a>
              <Link className="transition-colors hover:text-yellow-300" to="/client-flow">Client Flow</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/client-workroom">Client Workroom</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/create-invoice">Invoices</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/payments">Plans and payments</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-5 font-black uppercase text-white">Setup services</h3>
            <div className="grid gap-3 font-medium text-zinc-400">
              <Link className="transition-colors hover:text-yellow-300" to="/payments#setup-service-payments">Agency Setup</Link>
              <Link className="transition-colors hover:text-cyan-300" to="/payments#setup-service-payments">Automation Setup</Link>
              <Link className="transition-colors hover:text-emerald-300" to="/payments#setup-service-payments">Enterprise Setup</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/devops-delivery">Technical delivery</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-5 font-black uppercase text-white">Company and support</h3>
            <div className="grid gap-3 font-medium text-zinc-400">
              <Link className="transition-colors hover:text-yellow-300" to="/contact">Contact</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/security">Security</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/privacy">Privacy</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/terms">Terms</Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all font-bold text-white transition-colors hover:text-yellow-300 sm:break-normal">
                {SUPPORT_EMAIL}
              </a>
              <a href={`tel:${SUPPORT_PHONE_TEL}`} className="font-bold text-white transition-colors hover:text-yellow-300">
                {SUPPORT_PHONE_DISPLAY}
              </a>
              <a
                href={LINKEDIN_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white transition-colors hover:text-yellow-300"
              >
                LinkedIn
              </a>
              <p className="text-xs font-semibold text-zinc-600">Udyam: {UDYAM_REGISTRATION_NUMBER}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-7 text-xs font-bold uppercase text-zinc-600 md:flex-row">
          <p className="text-center md:text-left">Copyright {new Date().getFullYear()} {COMPANY_NAME} · Made in India 🇮🇳</p>
          <div className="flex flex-wrap items-center justify-center gap-5 md:justify-end">
            <Link className="transition-colors hover:text-zinc-300" to="/refund-policy">Refund policy</Link>
            <Link className="transition-colors hover:text-zinc-300" to="/shipping-policy">Digital delivery</Link>
            <Link className="transition-colors hover:text-zinc-300" to="/portfolio">Builder</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
