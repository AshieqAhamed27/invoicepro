import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import {
  COMPANY_LEGAL_DESCRIPTION,
  COMPANY_NAME,
  COMPANY_TAGLINE,
  SUPPORT_EMAIL,
  UDYAM_REGISTRATION_NUMBER
} from '../utils/company';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#07090d]/90 pt-14 pb-24 sm:py-16">
      <div className="container-custom">
        <div className="grid gap-10 rounded-lg border border-white/10 bg-white/[0.035] p-6 text-sm shadow-2xl shadow-black/20 sm:p-8 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:p-10">
          <div>
            <div className="mb-5">
              <BrandLogo showText={true} />
            </div>
            <p className="max-w-md font-medium leading-relaxed text-zinc-400">
              {COMPANY_TAGLINE} Find clients, create invoices, share payment links, and track pending payments from one workspace.
            </p>
            <p className="mt-4 max-w-md text-xs font-medium leading-relaxed text-zinc-500">
              {COMPANY_LEGAL_DESCRIPTION}
            </p>
            <p className="mt-3 break-all text-xs font-bold text-zinc-500">
              Udyam No: {UDYAM_REGISTRATION_NUMBER}
            </p>
          </div>

          <div>
            <h3 className="mb-5 text-[10px] font-black uppercase tracking-widest text-white">Product</h3>
            <div className="grid gap-4 font-medium text-zinc-400">
              <Link className="transition-colors hover:text-yellow-300" to="/signup">Create Free Account</Link>
              <a className="transition-colors hover:text-yellow-300" href="/#pricing">Pricing</a>
              <Link className="transition-colors hover:text-yellow-300" to="/invoice-generator">Invoice Generator</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/contact">Contact Support</Link>
            </div>
          </div>

          <div>
            <h3 className="mb-5 text-[10px] font-black uppercase tracking-widest text-white">Legal</h3>
            <div className="grid gap-4 font-medium text-zinc-400">
              <Link className="transition-colors hover:text-yellow-300" to="/privacy">Privacy Policy</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/terms">Terms of Use</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/refund-policy">Refund Policy</Link>
              <Link className="transition-colors hover:text-yellow-300" to="/shipping-policy">Digital Delivery</Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all font-bold text-white transition-colors hover:text-yellow-300">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 md:flex-row">
          <p className="text-center md:text-left">Copyright {new Date().getFullYear()} {COMPANY_NAME}</p>
          <p className="text-center md:text-right">Built for freelancers and small service businesses in India</p>
        </div>
      </div>
    </footer>
  );
}
